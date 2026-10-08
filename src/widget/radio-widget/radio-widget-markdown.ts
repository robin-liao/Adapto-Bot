import {
  getRadioSnapshot,
  RadioSearch,
  RadioSnapshot,
  toRadioCallToolResult,
} from "./radio";
import { RADIO_WIDGET_HTML } from "./radio-widget-html";

export function generateRadioWidgetPayload(snapshot: RadioSnapshot) {
  return {
    type: "widget/mcp-ui",
    name: "Worldwave Radio",
    description:
      "A searchable live radio tuner with stations from countries around the world",
    html: RADIO_WIDGET_HTML,
    domain: "https://teams.cloud.microsoft.com",
    securityPolicy: {
      connectDomains: [
        "https://teams.microsoft.com",
        "https://teams.cloud.microsoft.com",
      ],
      // Radio Browser stations use many independently operated stream and artwork hosts.
      // The widget only assigns sanitized HTTPS URLs returned by the bot.
      resourceDomains: ["'self'", "data:", "*"],
      frameDomains: [],
      baseUriDomains: [],
    },
    toolInput: {
      query: snapshot.query,
      country: snapshot.country,
      tag: snapshot.tag,
    },
    toolOutput: toRadioCallToolResult(snapshot),
    permissions: {},
  };
}

export async function generateRadioWidgetMarkdown(
  search: RadioSearch = {},
): Promise<string> {
  const snapshot = await getRadioSnapshot(search);
  const payload = generateRadioWidgetPayload(snapshot);
  const subject = snapshot.query || snapshot.tag || snapshot.country;
  return [
    subject
      ? 'Tuning the world radio dial for "' +
        subject +
        '". Choose any live station to start listening:'
      : "Tune in to live radio from around the world. Search by station, city, country, or genre:",
    "",
    "```html-widget",
    JSON.stringify(payload, null, 2),
    "```",
  ].join("\n");
}
