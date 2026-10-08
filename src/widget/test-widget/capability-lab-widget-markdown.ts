import { MCP_APPS_STABLE_VERSION } from "./mcp-apps-standard";
import { MCP_APPS_CAPABILITY_LAB_HTML } from "./capability-lab-widget-html";

export const TEST_MCP_WIDGET_MAX_BYTES = 95_000;

export function getMcpTestAppHtml(): string {
  return MCP_APPS_CAPABILITY_LAB_HTML;
}

export function generateTestMcpWidgetPayload() {
  return {
    type: "widget/mcp-ui",
    name: "MCP Apps Capability Lab",
    description: `Teams HTML Widgets adapter tests cross-checked against stable MCP Apps SEP-1865 (${MCP_APPS_STABLE_VERSION}).`,
    domain: "https://teams.cloud.microsoft.com",
    html: MCP_APPS_CAPABILITY_LAB_HTML,
    securityPolicy: {
      connectDomains: [
        "https://teams.microsoft.com",
        "https://teams.cloud.microsoft.com",
        "https://official-joke-api.appspot.com",
      ],
      resourceDomains: ["'self'", "data:"],
      frameDomains: [],
      baseUriDomains: [],
    },
    toolInput: {},
    toolOutput: {
      content: [{ type: "text", text: "MCP Apps capability lab ready." }],
      structuredContent: {
        protocolVersion: MCP_APPS_STABLE_VERSION,
        adapter: "widget/mcp-ui",
        ready: true,
      },
      isError: false,
    },
    permissions: {
      camera: {},
      microphone: {},
      geolocation: {},
      clipboardWrite: {},
    },
  };
}

export function generateTestMcpWidgetMarkdown(): string {
  const payload = generateTestMcpWidgetPayload();
  const markdown = [
    `**MCP Apps capability lab (stable SEP-1865, ${MCP_APPS_STABLE_VERSION}):**`,
    "",
    "```html-widget",
    JSON.stringify(payload),
    "```",
  ].join("\n");

  const byteLength = Buffer.byteLength(markdown, "utf8");
  if (byteLength > TEST_MCP_WIDGET_MAX_BYTES) {
    throw new Error(
      `Test widget is ${byteLength} bytes; limit is ${TEST_MCP_WIDGET_MAX_BYTES} bytes.`,
    );
  }
  return markdown;
}

export const TEST_MCP_WIDGET_MARKDOWN = generateTestMcpWidgetMarkdown();
