import {
  makeWeatherSnapshot,
  toCallToolResult,
  WeatherSnapshot,
} from "../weather-widget/weather";
import { CALLBACKS_WIDGET_HTML } from "./callbacks-widget-html";

export const generateCallbacksWidgetPayload = (snapshot: WeatherSnapshot) => {
  const payload = {
    type: "widget/mcp-ui",
    name: "Callbacks Widget",
    description: `Current conditions for ${snapshot.location} (with callbacks)`,
    html: CALLBACKS_WIDGET_HTML,
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
    toolInput: { location: snapshot.location },
    toolOutput: toCallToolResult(snapshot),
    permissions: { clipboardWrite: {} },
  };
  return payload;
};

/**
 * A standard markdown message body with the html-widget fenced block.
 * Sent via MessageFactory.text + TextFormat=markdown — the PR 1564831 bridge
 * catches the RichText/Html form SMBA produces. Do NOT override
 * channelData.messageType.
 */
export function generateCallbacksWidgetMarkdown(): string {
  const snapshot = makeWeatherSnapshot();
  const payload = generateCallbacksWidgetPayload(snapshot);
  const json = JSON.stringify(payload, null, 2);
  return [
    "Here's the weather today (this widget contains all callbacks):",
    "",
    "```html-widget",
    json,
    "```",
  ].join("\n");
}
