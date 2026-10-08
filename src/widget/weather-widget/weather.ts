/**
 * Live weather data for the weather widget.
 *
 * Unlike its former mock self, this module fetches REAL conditions for a given
 * city from Open-Meteo's free, keyless API — no API key required:
 *
 *   1. Geocode the city name -> latitude/longitude + a friendly display name
 *      https://geocoding-api.open-meteo.com/v1/search?name=Seattle&count=1
 *   2. Fetch current conditions + a short hourly outlook for those coordinates
 *      https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=..&hourly=..
 *
 * The fetch happens on the BOT (server side), not inside the widget iframe, so
 * we never fight the widget's CSP / sandbox. The widget just re-calls the
 * `getWeather` tool with its city (see weatherWidgetHtml.ts) and the bot answers
 * with a fresh snapshot (see ../callback-handlers/calltool.ts).
 */

export interface WeatherHour {
  label: string;
  tempF: number;
  emoji: string;
}

export type WeatherSeason = "spring" | "summer" | "autumn" | "winter";

export interface MoonPhase {
  name:
    | "New moon"
    | "Waxing crescent"
    | "First quarter"
    | "Waxing gibbous"
    | "Full moon"
    | "Waning gibbous"
    | "Last quarter"
    | "Waning crescent";
  emoji: string;
  illumination: number;
}

export interface WeatherSnapshot {
  /** Full display location, e.g. "Seattle, Washington, United States". */
  location: string;
  /** Primary city name shown in the widget title, e.g. "Seattle". */
  city: string;
  /**
   * Canonical lookup string the widget echoes back on refresh so the bot
   * re-resolves THIS exact place, e.g. "Seattle, Washington, United States".
   * Disambiguates same-named cities (e.g. "Paris, France" vs "Paris, Texas").
   */
  query: string;
  /** When this snapshot was produced (ISO). */
  asOfISO: string;
  tempF: number;
  condition: string;
  emoji: string;
  /** Local wall-clock time returned for the resolved location. */
  localTime: string;
  /** Meteorological season adjusted for the location's hemisphere. */
  season: WeatherSeason;
  isDay: boolean;
  /** Local sunrise and sunset times in Open-Meteo's ISO-like format. */
  sunrise: string;
  sunset: string;
  moonPhase: MoonPhase;
  cloudCover: number;
  windSpeedMph: number;
  /** Peak gust speed; never below the sustained wind speed. */
  windGustMph: number;
  windDirectionDeg: number;
  hourly: WeatherHour[];
  /** true when the numbers came from the live network fetch, false on fallback. */
  live: boolean;
}

const DEFAULT_CITY = "Seattle";
const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);
const MOON_PHASES: ReadonlyArray<Pick<MoonPhase, "name" | "emoji">> = [
  { name: "New moon", emoji: "🌑" },
  { name: "Waxing crescent", emoji: "🌒" },
  { name: "First quarter", emoji: "🌓" },
  { name: "Waxing gibbous", emoji: "🌔" },
  { name: "Full moon", emoji: "🌕" },
  { name: "Waning gibbous", emoji: "🌖" },
  { name: "Last quarter", emoji: "🌗" },
  { name: "Waning crescent", emoji: "🌘" },
];

/** Calculate the nearest of eight lunar phases for a location's wall-clock time. */
export function moonPhaseFor(localTime: string): MoonPhase {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(localTime);
  const instant = match
    ? Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]) || 12,
        Number(match[5]) || 0,
      )
    : Date.now();
  const elapsedDays = (instant - KNOWN_NEW_MOON_UTC) / 86_400_000;
  const ageDays =
    ((elapsedDays % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) %
    SYNODIC_MONTH_DAYS;
  const phase = MOON_PHASES[Math.round((ageDays / SYNODIC_MONTH_DAYS) * 8) % 8];
  const illumination = Math.round(
    (1 - Math.cos((2 * Math.PI * ageDays) / SYNODIC_MONTH_DAYS)) * 50,
  );
  return { ...phase, illumination };
}

function seasonFor(localTime: string, latitude: number): WeatherSeason {
  const match = /^\d{4}-(\d{2})-/.exec(localTime);
  const localMonth = Math.min(
    12,
    Math.max(1, Number(match?.[1]) || new Date().getUTCMonth() + 1),
  );
  const seasonalMonth = latitude < 0 ? ((localMonth + 5) % 12) + 1 : localMonth;

  if (seasonalMonth >= 3 && seasonalMonth <= 5) return "spring";
  if (seasonalMonth >= 6 && seasonalMonth <= 8) return "summer";
  if (seasonalMonth >= 9 && seasonalMonth <= 11) return "autumn";
  return "winter";
}

/**
 * Map a WMO weather-interpretation code (what Open-Meteo returns) to a short
 * human condition + an emoji. `isDay` swaps the clear-sky glyphs for their night
 * variants. Unknown codes fall back to a neutral cloud.
 */
function describeWeatherCode(
  code: number,
  isDay: boolean,
  moonEmoji = "🌙",
): { condition: string; emoji: string } {
  switch (code) {
    case 0:
      return { condition: "Clear sky", emoji: isDay ? "☀️" : moonEmoji };
    case 1:
      return { condition: "Mainly clear", emoji: isDay ? "🌤️" : moonEmoji };
    case 2:
      return { condition: "Partly cloudy", emoji: isDay ? "⛅" : "☁️" };
    case 3:
      return { condition: "Overcast", emoji: "☁️" };
    case 45:
    case 48:
      return { condition: "Fog", emoji: "🌫️" };
    case 51:
      return { condition: "Light drizzle", emoji: isDay ? "🌦️" : "🌧️" };
    case 53:
      return { condition: "Drizzle", emoji: isDay ? "🌦️" : "🌧️" };
    case 55:
      return { condition: "Heavy drizzle", emoji: isDay ? "🌦️" : "🌧️" };
    case 56:
    case 57:
      return { condition: "Freezing drizzle", emoji: "🌧️" };
    case 61:
      return { condition: "Light rain", emoji: isDay ? "🌦️" : "🌧️" };
    case 63:
      return { condition: "Rain", emoji: "🌧️" };
    case 65:
      return { condition: "Heavy rain", emoji: "🌧️" };
    case 66:
    case 67:
      return { condition: "Freezing rain", emoji: "🌧️" };
    case 71:
      return { condition: "Light snow", emoji: "🌨️" };
    case 73:
      return { condition: "Snow", emoji: "🌨️" };
    case 75:
      return { condition: "Heavy snow", emoji: "❄️" };
    case 77:
      return { condition: "Snow grains", emoji: "🌨️" };
    case 80:
      return { condition: "Light showers", emoji: isDay ? "🌦️" : "🌧️" };
    case 81:
      return { condition: "Showers", emoji: "🌦️" };
    case 82:
      return { condition: "Violent showers", emoji: "⛈️" };
    case 85:
      return { condition: "Snow showers", emoji: "🌨️" };
    case 86:
      return { condition: "Heavy snow showers", emoji: "🌨️" };
    case 95:
      return { condition: "Thunderstorm", emoji: "⛈️" };
    case 96:
    case 99:
      return { condition: "Thunderstorm with hail", emoji: "⛈️" };
    default:
      return { condition: "Unknown", emoji: "☁️" };
  }
}

export interface GeoResult {
  latitude: number;
  longitude: number;
  /** IANA timezone for formatting local times at the resolved location. */
  timeZone: string;
  /** Friendly display string, e.g. "Seattle, Washington, United States". */
  displayName: string;
  /** Primary city name, e.g. "Seattle". */
  city: string;
  /** Canonical lookup string that reproduces THIS place on refresh. */
  query: string;
}

/** Common informal country spellings mapped to how Open-Meteo names them. */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "united states",
  us: "united states",
  america: "united states",
  uk: "united kingdom",
  britain: "united kingdom",
  "great britain": "united kingdom",
  england: "united kingdom",
  uae: "united arab emirates",
};

/**
 * US state + Canadian province abbreviations mapped to the full region name
 * Open-Meteo returns in `admin1`, so "Austin, TX, US" and "London, ON, Canada"
 * resolve the same as their spelled-out forms.
 */
const REGION_ALIASES: Record<string, string> = {
  // US states + DC
  al: "alabama",
  ak: "alaska",
  az: "arizona",
  ar: "arkansas",
  ca: "california",
  co: "colorado",
  ct: "connecticut",
  de: "delaware",
  fl: "florida",
  ga: "georgia",
  hi: "hawaii",
  id: "idaho",
  il: "illinois",
  in: "indiana",
  ia: "iowa",
  ks: "kansas",
  ky: "kentucky",
  la: "louisiana",
  me: "maine",
  md: "maryland",
  ma: "massachusetts",
  mi: "michigan",
  mn: "minnesota",
  ms: "mississippi",
  mo: "missouri",
  mt: "montana",
  ne: "nebraska",
  nv: "nevada",
  nh: "new hampshire",
  nj: "new jersey",
  nm: "new mexico",
  ny: "new york",
  nc: "north carolina",
  nd: "north dakota",
  oh: "ohio",
  ok: "oklahoma",
  or: "oregon",
  pa: "pennsylvania",
  ri: "rhode island",
  sc: "south carolina",
  sd: "south dakota",
  tn: "tennessee",
  tx: "texas",
  ut: "utah",
  vt: "vermont",
  va: "virginia",
  wa: "washington",
  wv: "west virginia",
  wi: "wisconsin",
  wy: "wyoming",
  dc: "district of columbia",
  // Canadian provinces + territories
  ab: "alberta",
  bc: "british columbia",
  mb: "manitoba",
  nb: "new brunswick",
  nl: "newfoundland and labrador",
  ns: "nova scotia",
  nt: "northwest territories",
  nu: "nunavut",
  on: "ontario",
  pe: "prince edward island",
  qc: "quebec",
  sk: "saskatchewan",
  yt: "yukon",
};

function normalizeLoc(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\./g, "")
    .trim();
}

/**
 * True when a user qualifier (a token after the city in "Paris, Texas, US")
 * names the hit's country or region. Handles, in order:
 *   - the full country name ("France") or ISO2 code ("FR");
 *   - a full region/state name ("Texas", "Ontario");
 *   - informal country aliases ("USA", "UK") and US-state / CA-province
 *     abbreviations ("TX", "ON");
 *   - a long (>=4 char) prefix typed in full ("united" -> "united states").
 */
function qualifierMatches(hit: any, wanted: string): boolean {
  const w = normalizeLoc(wanted);
  if (!w) return true;

  const country = normalizeLoc(hit.country);
  const code = normalizeLoc(hit.country_code);
  const regions = [hit.admin1, hit.admin2, hit.admin3, hit.admin4]
    .map(normalizeLoc)
    .filter(Boolean);

  // Expand a known abbreviation/alias to its canonical full name.
  const canon = COUNTRY_ALIASES[w] ?? REGION_ALIASES[w];

  // Country by exact name, ISO2 code, or alias.
  if (country && (country === w || country === canon)) return true;
  if (code && code === w) return true;

  // Region (state/province) by exact name or expanded abbreviation.
  for (const r of regions) {
    if (r === w || r === canon) return true;
  }

  // Forgiving prefix for longer names typed in full (avoids short-code noise),
  // e.g. "united" -> "United States", "californ" -> "California".
  if (w.length >= 4) {
    if (country.startsWith(w)) return true;
    if (regions.some((r) => r.startsWith(w))) return true;
  }
  return false;
}

/**
 * Resolve a free-text location to coordinates. Accepts a bare city ("Seattle")
 * or a comma-qualified one to disambiguate cities that share a name, in any of
 * the forms "city, country" ("Paris, France"), "city, state" ("Paris, Texas"),
 * or "city, state, country" ("Paris, TX, US"). State/province names may be
 * spelled out or abbreviated. Open-Meteo's geocoder only searches by city name,
 * so we search the city and filter the candidates by the trailing region/country
 * qualifiers ourselves. Returns null when nothing matches.
 */
export async function geocodeCity(rawQuery: string): Promise<GeoResult | null> {
  const tokens = rawQuery
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const cityName = tokens[0] ?? rawQuery.trim();
  const qualifiers = tokens.slice(1);

  // With qualifiers we pull a wide candidate list (Open-Meteo's max) so even a
  // small same-named town — e.g. Paris, Ontario — is in reach of the filter.
  const url =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(cityName)}&count=${qualifiers.length ? 100 : 1}&language=en&format=json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`geocoding HTTP ${res.status}`);
  const data = (await res.json()) as any;
  const results: any[] = Array.isArray(data?.results) ? data.results : [];

  // With qualifiers, take the highest-ranked candidate that satisfies them all;
  // without, take the top (most populous) hit as before.
  const hit = qualifiers.length
    ? results.find((r) => qualifiers.every((q) => qualifierMatches(r, q)))
    : results[0];
  if (
    !hit ||
    typeof hit.latitude !== "number" ||
    typeof hit.longitude !== "number"
  )
    return null;

  const parts = [hit.name, hit.admin1, hit.country].filter(
    (p: unknown) => typeof p === "string" && p,
  );
  return {
    latitude: hit.latitude,
    longitude: hit.longitude,
    timeZone:
      typeof hit.timezone === "string" && hit.timezone ? hit.timezone : "UTC",
    displayName: parts.join(", "),
    city: hit.name,
    query: parts.join(", "),
  };
}

/**
 * Format an Open-Meteo local time ("YYYY-MM-DDTHH:mm") into a short hour label.
 * The first slot is always "Now"; the rest become "3 PM", "11 AM", etc.
 */
function hourLabel(iso: string, isFirst: boolean): string {
  if (isFirst) return "Now";
  const m = /T(\d{2}):/.exec(iso);
  if (!m) return "";
  let h = Number(m[1]);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h} ${ampm}`;
}

/** Locate the hourly index matching the current hour so the outlook starts "Now". */
function currentHourIndex(times: string[], currentTime: string): number {
  if (!currentTime) return 0;
  const prefix = currentTime.slice(0, 13); // "YYYY-MM-DDTHH"
  const idx = times.findIndex(
    (t) => typeof t === "string" && t.slice(0, 13) === prefix,
  );
  return idx >= 0 ? idx : 0;
}

function dailyValueForCurrentDate(
  currentTime: string,
  dates: string[],
  values: Array<string | null>,
): string {
  const date = currentTime.slice(0, 10);
  const index = dates.indexOf(date);
  const value = values[index >= 0 ? index : 0];
  return typeof value === "string" ? value : "";
}

/**
 * Fetch a fresh live snapshot for `city` (defaults to Seattle). Never throws —
 * on a lookup miss or any network/parse error it returns a `live: false`
 * fallback so the widget still renders and simply retries on the next refresh.
 */
export async function fetchWeatherSnapshot(
  city = DEFAULT_CITY,
): Promise<WeatherSnapshot> {
  const query = (city || DEFAULT_CITY).trim() || DEFAULT_CITY;
  let resolvedLatitude = 47.61;

  try {
    const geo = await geocodeCity(query);
    if (!geo) return fallbackSnapshot(query, "Location not found");
    resolvedLatitude = geo.latitude;

    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${geo.latitude}&longitude=${geo.longitude}` +
      "&current=temperature_2m,weather_code,is_day,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m" +
      "&hourly=temperature_2m,weather_code,is_day" +
      "&daily=sunrise,sunset" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=2";

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`forecast HTTP ${res.status}`);

    const data = (await res.json()) as any;
    const current = data?.current ?? {};
    const isDay = Number(current.is_day) === 1;
    const localTime = String(current.time ?? "");
    const moonPhase = moonPhaseFor(localTime);
    const now = describeWeatherCode(
      Number(current.weather_code),
      isDay,
      moonPhase.emoji,
    );

    const times: string[] = Array.isArray(data?.hourly?.time)
      ? data.hourly.time
      : [];
    const temps: Array<number | null> = Array.isArray(
      data?.hourly?.temperature_2m,
    )
      ? data.hourly.temperature_2m
      : [];
    const codes: Array<number | null> = Array.isArray(
      data?.hourly?.weather_code,
    )
      ? data.hourly.weather_code
      : [];
    const hourlyDaylight: Array<number | null> = Array.isArray(
      data?.hourly?.is_day,
    )
      ? data.hourly.is_day
      : [];
    const dailyDates: string[] = Array.isArray(data?.daily?.time)
      ? data.daily.time
      : [];
    const sunrises: Array<string | null> = Array.isArray(data?.daily?.sunrise)
      ? data.daily.sunrise
      : [];
    const sunsets: Array<string | null> = Array.isArray(data?.daily?.sunset)
      ? data.daily.sunset
      : [];

    const start = currentHourIndex(times, current.time) + 1;
    const hourly: WeatherHour[] = [];
    for (let i = start; i < Math.min(start + 6, times.length); i++) {
      const slotIsDay =
        hourlyDaylight[i] == null ? isDay : Number(hourlyDaylight[i]) === 1;
      const d = describeWeatherCode(
        Number(codes[i]),
        slotIsDay,
        moonPhaseFor(times[i]).emoji,
      );
      hourly.push({
        label: hourLabel(times[i], false),
        tempF: Math.round(Number(temps[i])),
        emoji: d.emoji,
      });
    }
    const windSpeedMph = Math.round(Number(current.wind_speed_10m) || 0);

    return {
      location: geo.displayName,
      city: geo.city,
      query: geo.query,
      asOfISO: new Date().toISOString(),
      tempF: Math.round(Number(current.temperature_2m)),
      condition: now.condition,
      emoji: now.emoji,
      localTime,
      season: seasonFor(localTime, geo.latitude),
      isDay,
      sunrise: dailyValueForCurrentDate(localTime, dailyDates, sunrises),
      sunset: dailyValueForCurrentDate(localTime, dailyDates, sunsets),
      moonPhase,
      cloudCover: Math.round(Number(current.cloud_cover) || 0),
      windSpeedMph,
      windGustMph: Math.max(
        windSpeedMph,
        Math.round(Number(current.wind_gusts_10m) || 0),
      ),
      windDirectionDeg: Math.round(Number(current.wind_direction_10m) || 0),
      hourly,
      live: true,
    };
  } catch (err) {
    console.error(
      "[weather] live fetch failed, using fallback:",
      err instanceof Error ? err.message : err,
    );
    return fallbackSnapshot(query, undefined, resolvedLatitude);
  }
}

const FALLBACK_WEATHER_CODES = [0, 2, 3, 61];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * A neutral placeholder used when the live fetch fails or the city can't be
 * resolved, so the widget still renders. `note` (e.g. "Location not found")
 * surfaces as the condition text; otherwise a random sample condition is shown.
 */
function fallbackSnapshot(
  city = DEFAULT_CITY,
  note?: string,
  latitude = 47.61,
): WeatherSnapshot {
  const baseTemp = 52 + Math.floor(Math.random() * 18); // 52–69°F
  const localTime = new Date().toISOString().slice(0, 16);
  const localHour = Number(localTime.slice(11, 13));
  const isDay = localHour >= 6 && localHour < 19;
  const moonPhase = moonPhaseFor(localTime);
  const now = describeWeatherCode(
    pick(FALLBACK_WEATHER_CODES),
    isDay,
    moonPhase.emoji,
  );
  const hourly = ["+1h", "+2h", "+3h", "+4h", "+5h", "+6h"].map((label, i) => {
    const slotTime = new Date(
      Date.parse(`${localTime}:00Z`) + (i + 1) * 3_600_000,
    )
      .toISOString()
      .slice(0, 16);
    const slotHour = Number(slotTime.slice(11, 13));
    const slotIsDay = slotHour >= 6 && slotHour < 19;
    const c = describeWeatherCode(
      pick(FALLBACK_WEATHER_CODES),
      slotIsDay,
      moonPhaseFor(slotTime).emoji,
    );
    return { label, tempF: baseTemp + i - 1, emoji: c.emoji };
  });
  const localDate = localTime.slice(0, 10);
  const windSpeedMph = 4 + Math.floor(Math.random() * 12);
  return {
    location: city,
    city,
    query: city,
    asOfISO: new Date().toISOString(),
    tempF: baseTemp,
    condition: note ?? now.condition,
    emoji: now.emoji,
    localTime,
    season: seasonFor(localTime, latitude),
    isDay,
    sunrise: `${localDate}T06:00`,
    sunset: `${localDate}T19:00`,
    moonPhase,
    cloudCover: 20 + Math.floor(Math.random() * 55),
    windSpeedMph,
    windGustMph: windSpeedMph + Math.floor(Math.random() * 10),
    windDirectionDeg: Math.floor(Math.random() * 360),
    hourly,
    live: false,
  };
}

/**
 * Synchronous mock snapshot kept for callers that just need a plausible sample
 * (the callbacks widget, the adaptive-card demo, and the calltool default). For
 * real conditions use {@link fetchWeatherSnapshot}.
 */
export function makeWeatherSnapshot(city = DEFAULT_CITY): WeatherSnapshot {
  return fallbackSnapshot(city);
}

/**
 * MCP `CallToolResult` ( == `McpUiCallToolResult` ) carrying the snapshot.
 * The widget renders from `structuredContent`. Keep these as plain JS objects —
 * never JToken/dynamic — so serialization stays clean (see the doc's gotchas).
 */
export function toCallToolResult(snapshot: WeatherSnapshot) {
  return {
    content: [
      {
        type: "text",
        text: `${snapshot.location}: ${snapshot.tempF}°F, ${snapshot.condition}`,
      },
    ],
    structuredContent: snapshot,
    isError: false,
  };
}
