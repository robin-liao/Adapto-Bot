export const MCP_APPS_STABLE_VERSION = "2026-01-26";
export const MCP_APPS_STABLE_SPEC_URL =
  "https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx";

/**
 * Cross-check of the Capability Lab against stable SEP-1865. The outer
 * `widget/mcp-ui` payload is a Teams adapter; these entries describe the
 * standardized protocol spoken by the HTML view inside that adapter.
 */
export const MCP_APPS_STANDARD_AUDIT = {
  activeWireMethods: [
    "ping",
    "tools/call",
    "notifications/message",
    "ui/open-link",
    "ui/message",
    "ui/request-display-mode",
    "ui/update-model-context",
    "ui/notifications/size-changed",
  ],
  automaticAndPassiveMethods: [
    "ui/initialize",
    "ui/notifications/initialized",
    "ui/notifications/tool-input-partial",
    "ui/notifications/tool-input",
    "ui/notifications/tool-result",
    "ui/notifications/tool-cancelled",
    "ui/notifications/host-context-changed",
    "ui/resource-teardown",
  ],
  sdkAccessors: ["getHostCapabilities", "getHostContext", "getHostVersion"],
  resourcePolicyTests: [
    "connectDomains",
    "permissions.camera",
    "permissions.microphone",
    "permissions.geolocation",
    "permissions.clipboardWrite",
  ],
  hostReservedMethods: [
    "ui/notifications/sandbox-proxy-ready",
    "ui/notifications/sandbox-resource-ready",
  ],
  adapterLimitations: [
    "resources/read (no ui:// resource is registered by widget/mcp-ui)",
    "sandbox proxy messages (owned by the web host)",
  ],
  excludedGeneratedTests: [
    "sendOpenLink",
    "assertCapabilityForMethod",
    "assertNotificationCapability",
    "assertRequestHandlerCapability",
    "testClipboardWritePermission",
  ],
  excludedDraftMethods: [
    "ui/download-file",
    "ui/notifications/request-teardown",
    "sampling/createMessage",
    "tools/list (App to Host)",
    "resources/list (App to Host)",
    "notifications/tools/list_changed (App to Host)",
  ],
} as const;
