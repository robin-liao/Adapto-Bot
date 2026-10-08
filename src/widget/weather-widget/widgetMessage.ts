import { WEATHER_WIDGET_HTML } from "./weatherWidgetHtml";
import {
  fetchWeatherSnapshot,
  toCallToolResult,
  WeatherSnapshot,
} from "./weather";

/**
 * The `widget/mcp-ui` payload that goes inside the html-widget fenced block.
 * Mirrors the stock/flight widget payloads — same shape, same securityPolicy.
 * The widget never touches the weather API itself: the bot fetches it (see
 * weather.ts), so the CSP only needs the Teams host domains.
 */
export function buildWeatherWidgetPayload(snapshot: WeatherSnapshot) {
  return {
    type: "widget/mcp-ui",
    name: snapshot.city ? `${snapshot.city} Weather` : "Weather",
    description: `Current conditions for ${snapshot.location}`,
    html: WEATHER_WIDGET_HTML,
    domain: "https://teams.cloud.microsoft.com",
    securityPolicy: {
      connectDomains: [
        "https://teams.microsoft.com",
        "https://teams.cloud.microsoft.com",
      ],
      resourceDomains: ["'self'", "data:"],
      frameDomains: [],
      baseUriDomains: [],
    },
    toolInput: { city: snapshot.query },
    toolOutput: toCallToolResult(snapshot), // baked initial data
    permissions: {},
  };
}

/**
 * A standard markdown message body with the html-widget fenced block.
 * Async because it fetches live conditions to bake into `toolOutput`, so the
 * widget shows real data on first render before its Refresh pulls fresh data.
 * Pass a `city` to look up a specific place, or omit it to default to Seattle.
 */
export async function buildWeatherWidgetMarkdown(
  city?: string,
): Promise<string> {
  const snapshot = await fetchWeatherSnapshot(city);
  const payload = buildWeatherWidgetPayload(snapshot);
  const json = JSON.stringify(payload, null, 2);
  const lead = snapshot.live
    ? `Here's the current weather in ${snapshot.location} (tap Refresh for live updates):`
    : `Couldn't reach the live weather service for "${snapshot.location}" — showing sample data:`;
  return [lead, "", "```html-widget", json, "```"].join("\n");
}
