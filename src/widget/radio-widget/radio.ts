/**
 * Live internet-radio discovery backed by the community Radio Browser API.
 * Streams are filtered to HTTPS so they can play inside Teams' secure iframe.
 */

export interface RadioStation {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  language: string;
  tags: string[];
  favicon: string;
  streamUrl: string;
  homepage: string;
  codec: string;
  bitrate: number;
  votes: number;
}

export interface RadioSearch {
  query?: string;
  country?: string;
  tag?: string;
}

export interface NormalizedRadioSearch {
  query: string;
  country: string;
  tag: string;
}

export interface RadioSnapshot extends NormalizedRadioSearch {
  asOfISO: string;
  stations: RadioStation[];
  live: boolean;
}

const API = "https://all.api.radio-browser.info/json/stations/search";
const USER_AGENT = "WidgetSmith/1.0 (Teams radio widget)";
const CACHE_MS = 60_000;
const MAX_RESULTS = 30;

const cache = new Map<string, { at: number; snapshot: RadioSnapshot }>();
const inflight = new Map<string, Promise<RadioSnapshot>>();

function clean(value: unknown, maxLength = 80): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeRadioSearch(
  search: RadioSearch = {},
): NormalizedRadioSearch {
  const country = clean(search.country);
  return {
    query: clean(search.query),
    country: /^[a-z]{2}$/i.test(country) ? country.toUpperCase() : country,
    tag: clean(search.tag, 40).toLowerCase(),
  };
}

function safeWebUrl(value: unknown, httpsOnly = false): string {
  const candidate = clean(value, 2_048);
  try {
    const url = new URL(candidate);
    if (httpsOnly && url.protocol !== "https:") return "";
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function stationFromApi(raw: any): RadioStation | null {
  const streamUrl = safeWebUrl(raw?.url_resolved || raw?.url, true);
  const name = clean(raw?.name, 120);
  if (
    !streamUrl ||
    !name ||
    Number(raw?.lastcheckok) === 0 ||
    Number(raw?.hls) === 1
  )
    return null;

  const tags = clean(raw?.tags, 300)
    .split(",")
    .map((tag) => clean(tag, 28).toLowerCase())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, 5);

  return {
    id: clean(raw?.stationuuid, 80) || streamUrl,
    name,
    country: clean(raw?.country, 80) || "Around the world",
    countryCode: clean(raw?.countrycode, 2).toUpperCase(),
    language: clean(raw?.language, 80) || "Various",
    tags,
    favicon: safeWebUrl(raw?.favicon, true),
    streamUrl,
    homepage: safeWebUrl(raw?.homepage),
    codec: clean(raw?.codec, 16).toUpperCase() || "AUDIO",
    bitrate: Math.max(0, Math.round(Number(raw?.bitrate) || 0)),
    votes: Math.max(0, Math.round(Number(raw?.votes) || 0)),
  };
}

async function fetchStations(
  params: URLSearchParams,
): Promise<{ ok: boolean; stations: RadioStation[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(API + "?" + params.toString(), {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, stations: [] };
    const body = await response.json();
    if (!Array.isArray(body)) return { ok: false, stations: [] };
    return {
      ok: true,
      stations: body
        .map(stationFromApi)
        .filter((station): station is RadioStation => station !== null),
    };
  } catch {
    return { ok: false, stations: [] };
  } finally {
    clearTimeout(timer);
  }
}

function baseParams(search: NormalizedRadioSearch): URLSearchParams {
  const params = new URLSearchParams({
    hidebroken: "true",
    order: search.query ? "clickcount" : "votes",
    reverse: "true",
    limit: search.query ? "24" : "80",
  });
  // Radio Browser name matching is partial ("Ireland" also matches the UK), so the
  // widget sends ISO codes; full names remain supported for older widget instances.
  if (search.country)
    params.set(
      /^[A-Z]{2}$/.test(search.country) ? "countrycode" : "country",
      search.country,
    );
  if (search.tag) params.set("tag", search.tag);
  return params;
}

function diverseTop(stations: RadioStation[]): RadioStation[] {
  const sorted = stations
    .slice()
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
  const selected: RadioStation[] = [];
  const countryCounts = new Map<string, number>();

  for (const station of sorted) {
    const country = station.countryCode || station.country;
    const count = countryCounts.get(country) ?? 0;
    if (count >= 3) continue;
    selected.push(station);
    countryCounts.set(country, count + 1);
    if (selected.length >= MAX_RESULTS) return selected;
  }

  for (const station of sorted) {
    if (!selected.includes(station)) selected.push(station);
    if (selected.length >= MAX_RESULTS) break;
  }
  return selected;
}

async function searchLive(
  search: NormalizedRadioSearch,
): Promise<RadioSnapshot> {
  const requests: Promise<{ ok: boolean; stations: RadioStation[] }>[] = [];
  if (search.query) {
    const fields: Array<"name" | "country" | "tag"> = ["name"];
    if (!search.country) fields.push("country");
    if (!search.tag) fields.push("tag");
    for (const field of fields) {
      const params = baseParams(search);
      params.set(field, search.query);
      requests.push(fetchStations(params));
    }
  } else {
    requests.push(fetchStations(baseParams(search)));
  }

  const responses = await Promise.all(requests);
  const byId = new Map<string, RadioStation>();
  for (const response of responses) {
    for (const station of response.stations) {
      if (!byId.has(station.id)) byId.set(station.id, station);
    }
  }

  return {
    ...search,
    asOfISO: new Date().toISOString(),
    stations: diverseTop([...byId.values()]),
    live: responses.some((response) => response.ok),
  };
}

function keyFor(search: NormalizedRadioSearch): string {
  return [search.query, search.country, search.tag]
    .map((part) => part.toLowerCase())
    .join("|");
}

/** Search stations by name, country, or genre. Never throws on directory failure. */
export async function getRadioSnapshot(
  input: RadioSearch = {},
): Promise<RadioSnapshot> {
  const search = normalizeRadioSearch(input);
  const key = keyFor(search);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.snapshot;

  let job = inflight.get(key);
  if (!job) {
    job = searchLive(search).finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  const snapshot = await job;
  if (snapshot.live) {
    cache.set(key, { at: Date.now(), snapshot });
    return snapshot;
  }
  return cached
    ? { ...cached.snapshot, asOfISO: new Date().toISOString(), live: false }
    : snapshot;
}

export function toRadioCallToolResult(snapshot: RadioSnapshot) {
  const count = snapshot.stations.length;
  const subject =
    snapshot.query || snapshot.tag || snapshot.country || "around the world";
  return {
    content: [
      {
        type: "text",
        text:
          count +
          " live radio station" +
          (count === 1 ? "" : "s") +
          " for " +
          subject,
      },
    ],
    structuredContent: snapshot,
    isError: false,
  };
}
