/**
 * The MCP-App widget bundle, delivered to Teams as the `widgetHtml` field.
 *
 * It is a single self-contained HTML document with an inline ext-apps client
 * that speaks the same JSON-RPC-over-postMessage wire format as
 * `@teams-mcp-apps/mcp-client` (see libs/mcp-client/src/protocol/upstream.ts):
 *
 *   - widget -> host : `ui/initialize` request, then `ui/notifications/initialized`
 *   - host -> widget : `ui/notifications/tool-result` (the bot's baked toolOutput)
 *   - widget -> host : `tools/call` request  ->  routed by Teams as an
 *                      `htmlwidget/calltool` invoke to the bot, whose
 *                      `McpUiCallToolResult` comes back as the response.
 *
 * Kept dependency-free on purpose so it embeds directly as a string — no build.
 */
export const CALLBACKS_WIDGET_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    color-scheme: light dark;
    /* Light theme (default). Overridden by [data-theme="dark"] below, which the
       script toggles from the host's hostContext.theme. */
    --bg-card: #f5f5f5;
    --fg: #1b1a19;
    --fg-muted: rgba(27, 26, 25, 0.7);
    --input-bg: #ffffff;
    --input-border: #c8c6c4;
    --accent: #5b5fc7;
    --accent-strong: #6e72d6;
    --accent-outline: #c5c6ef;
    --accent-soft: rgba(91, 95, 199, 0.12);
    --accent-soft-hover: rgba(91, 95, 199, 0.08);
  }
  [data-theme="dark"] {
    --bg-card: #2b2b30;
    --fg: #f3f2f1;
    --fg-muted: rgba(243, 242, 241, 0.7);
    --input-bg: #1f1f23;
    --input-border: #4a4a52;
    --accent: #9aa0ff;
    --accent-strong: #7c80e8;
    --accent-outline: #494a78;
    --accent-soft: rgba(154, 160, 255, 0.16);
    --accent-soft-hover: rgba(154, 160, 255, 0.12);
  }
  body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
  .card { padding: 16px; border-radius: 12px; background: var(--bg-card); color: var(--fg); }
  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .loc { font-weight: 600; font-size: 15px; }
  .cond { font-size: 13px; opacity: 0.7; }
  .temp { font-size: 22px; font-weight: 600; white-space: nowrap; }
  .hours { display: flex; gap: 12px; margin: 14px 0; }
  .hour { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 12px; opacity: 0.85; }
  .hour .emoji { font-size: 18px; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  button { display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 10px;
           padding: 9px 16px; font: inherit; font-size: 13px; font-weight: 600; line-height: 1;
           background: linear-gradient(180deg, var(--accent-strong) 0%, var(--accent) 100%); color: #fff; cursor: pointer;
           box-shadow: 0 1px 2px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.15);
           transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease; }
  button:hover { filter: brightness(1.06); box-shadow: 0 3px 8px rgba(91,95,199,0.35), inset 0 1px 0 rgba(255,255,255,0.18); transform: translateY(-1px); }
  button:active { transform: translateY(0); filter: brightness(0.96); box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
  button:focus-visible { outline: 2px solid #9aa0ff; outline-offset: 2px; }
  button:disabled { opacity: 0.55; cursor: default; filter: none; transform: none; box-shadow: none; }
  button.secondary { background: transparent; color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent-outline); }
  button.secondary:hover { background: var(--accent-soft-hover); box-shadow: inset 0 0 0 1px var(--accent); }
  .status { margin-top: 10px; font-size: 12px; min-height: 16px; opacity: 0.7; }
  .msg { display: flex; gap: 8px; margin-top: 12px; }
  .msg input { flex: 1; min-width: 0; border: 1px solid var(--input-border); border-radius: 10px;
               padding: 9px 12px; font: inherit; background: var(--input-bg); color: var(--fg);
               transition: border-color 0.12s ease, box-shadow 0.12s ease; }
  .msg input:focus { outline: 0; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(91,95,199,0.18); }
  .msg button { flex: 0 0 auto; }
  #modeBadge { position: fixed; bottom: 8px; right: 8px; z-index: 9999; padding: 3px 10px;
               border-radius: 999px; font-size: 12px; font-weight: 600; line-height: 1.4;
               background: var(--accent-soft); color: var(--accent); pointer-events: none; }
</style>
</head>
<body>
<div id="modeBadge">Text inline</div>
<div id="root">Loading weather…</div>
<script>
(function () {
  var PROTOCOL_VERSION = '2026-01-26';
  var pending = {};
  var nextId = 1;

  // Negotiated during the ui/initialize handshake, mirroring the ext-apps client.
  var hostInfo = null;
  var hostCapabilities = null;
  var hostContext = null;

  // Latest rendered snapshot — the widget state we publish to the model.
  var currentSnapshot = null;

  // Current display mode; flipped via ui/request-display-mode ('inline' | 'fullscreen' | 'pip').
  var displayMode = 'inline';

  function post(msg) { parent.postMessage(msg, '*'); }
  function request(method, params) {
    var id = String(nextId++);
    return new Promise(function (resolve, reject) {
      pending[id] = { resolve: resolve, reject: reject };
      post({ jsonrpc: '2.0', id: id, method: method, params: params });
    });
  }
  function notify(method, params) { post({ jsonrpc: '2.0', method: method, params: params }); }
  function callTool(name, args) { return request('tools/call', { name: name, arguments: args || {} }); }
  // ui/message is a REQUEST from the view to the host (the host replies with an
  // McpUiMessageResult), NOT a notification — the host's AppBridge registers it
  // via replaceRequestHandler, so a notification (no id) is silently dropped.
  // Payload: { role: 'user', content: [ <content blocks> ] }. Single text block.
  function sendMessage(text) {
    return request('ui/message', { role: 'user', content: [{ type: 'text', text: text }] });
  }
  // ui/update-model-context is also a REQUEST (host replies with an empty
  // result) that publishes the widget's state to the model:
  // { content?: [text/image blocks], structuredContent? }.
  function updateModelContext(structuredContent, summary) {
    return request('ui/update-model-context', {
      content: [{ type: 'text', text: summary }],
      structuredContent: structuredContent
    });
  }
  // ui/request-display-mode is a request: the host replies with the mode it
  // actually set ({ mode }), which may differ from the one requested.
  function requestDisplayMode(mode) { return request('ui/request-display-mode', { mode: mode }); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function reportSize() { notify('ui/notifications/size-changed', { height: document.body.scrollHeight }); }
  if (window.ResizeObserver) new ResizeObserver(reportSize).observe(document.body);

  // Reflect the host's color theme by toggling a data-theme attribute on the
  // root element, which swaps the CSS custom properties defined in <style>.
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }

  function updateModeBadge() {
    var badge = document.getElementById('modeBadge');
    if (badge) {
      badge.textContent = displayMode === 'fullscreen' ? 'Fullscreen mode'
        : displayMode === 'pip' ? 'PiP mode' : 'Inline mode';
    }
  }

  // Apply a display mode to the widget's local state and reflect it in the UI.
  // Shared by onToggleDisplayMode (view-initiated) and ui/notifications/host-
  // context-changed (host-initiated) so both paths keep the toggle button label
  // and the mode badge in sync.
  function setDisplayMode(mode) {
    displayMode = mode;
    var btn = document.getElementById('toggleMode');
    if (btn) {
      btn.textContent = displayMode === 'fullscreen'
        ? '\\u2197 Exit fullscreen (inline)'
        : '\\u2922 Go fullscreen';
    }
    updateModeBadge();
    reportSize();
  }

  function render(snapshot) {
    var root = document.getElementById('root');
    if (!snapshot || !snapshot.location) { root.textContent = 'No weather data.'; reportSize(); return; }
    currentSnapshot = snapshot;
    var hourly = (snapshot.hourly || []).map(function (h) {
      return '<div class="hour"><span>' + escapeHtml(h.label) + '</span>' +
             '<span class="emoji">' + escapeHtml(h.emoji) + '</span>' +
             '<span>' + escapeHtml(h.tempF) + '\\u00B0</span></div>';
    }).join('');
    root.innerHTML =
      '<div class="card">' +
        '<div class="head">' +
          '<div><div class="loc">' + escapeHtml(snapshot.location) + '</div>' +
          '<div class="cond">' + escapeHtml(snapshot.condition) + '</div></div>' +
          '<div class="temp">' + escapeHtml(snapshot.emoji) + ' ' + escapeHtml(snapshot.tempF) + '\\u00B0F</div>' +
        '</div>' +
        '<div class="hours">' + hourly + '</div>' +
        '<div class="actions">' +
          '<button id="refresh">&#x21BB; Refresh (calltool)</button>' +
          '<button id="storeState" class="secondary">&#x1F4BE; Store state (update-model-context)</button>' +
          '<button id="toggleMode" class="secondary">' + (displayMode === 'fullscreen' ? '&#x2197; Exit fullscreen (inline)' : '&#x2922; Go fullscreen') + '</button>' +
        '</div>' +
        '<div class="msg">' +
          '<input id="msgInput" type="text" placeholder="Message the host\\u2026" />' +
          '<button id="sendMsg">Send (ui/message)</button>' +
        '</div>' +
        '<div id="status" class="status"></div>' +
      '</div>';
    document.getElementById('refresh').addEventListener('click', onRefresh);
    document.getElementById('storeState').addEventListener('click', onStoreState);
    document.getElementById('toggleMode').addEventListener('click', onToggleDisplayMode);
    document.getElementById('sendMsg').addEventListener('click', onSendMessage);
    document.getElementById('msgInput').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') onSendMessage();
    });
    reportSize();
  }

  function onStoreState() {
    var status = document.getElementById('status');
    if (!currentSnapshot) { status.textContent = 'No state to store yet.'; return; }
    var summary = currentSnapshot.location + ': ' + currentSnapshot.tempF + '\\u00B0F, ' + currentSnapshot.condition;
    status.textContent = 'Storing state via update-model-context\\u2026';
    updateModelContext(currentSnapshot, summary).then(function () {
      status.textContent = 'State stored via update-model-context \\u2713';
    }).catch(function (e) {
      status.textContent = 'update-model-context failed: ' + (e && e.message ? e.message : e);
    });
  }

  function onToggleDisplayMode() {
    var btn = document.getElementById('toggleMode');
    var status = document.getElementById('status');
    var target = displayMode === 'fullscreen' ? 'inline' : 'fullscreen';
    btn.disabled = true;
    status.textContent = 'Requesting ' + target + ' mode\\u2026';
    requestDisplayMode(target).then(function (result) {
      // Host echoes the mode it actually set, which may differ from the request.
      setDisplayMode((result && result.mode) || target);
      status.textContent = 'Display mode: ' + displayMode + ' \\u2713';
      btn.disabled = false;
    }).catch(function (e) {
      status.textContent = 'request-display-mode failed: ' + (e && e.message ? e.message : e);
      btn.disabled = false;
    });
  }

  function onSendMessage() {
    var input = document.getElementById('msgInput');
    var status = document.getElementById('status');
    var text = (input.value || '').trim();
    if (!text) { status.textContent = 'Enter a message first.'; return; }
    input.value = '';
    status.textContent = 'Sending via ui/message\\u2026';
    sendMessage(text).then(function () {
      status.textContent = 'Sent via ui/message \\u2713';
    }).catch(function (e) {
      status.textContent = 'ui/message failed: ' + (e && e.message ? e.message : e);
    });
  }

  function onRefresh() {
    var btn = document.getElementById('refresh');
    var status = document.getElementById('status');
    btn.disabled = true;
    status.textContent = 'Calling getWeather tool…';
    callTool('getWeather', {}).then(function (result) {
      // result is an MCP CallToolResult { content, structuredContent }.
      var snap = result && (result.structuredContent || result);
      if (snap && snap.location) { render(snap); document.getElementById('status').textContent = 'Updated via calltool \\u2713'; }
      else { status.textContent = 'Tool returned no snapshot.'; btn.disabled = false; }
    }).catch(function (e) {
      status.textContent = 'calltool failed: ' + (e && e.message ? e.message : e);
      btn.disabled = false;
    });
  }

  window.addEventListener('message', function (ev) {
    var msg = ev.data;
    if (typeof msg === 'string') { try { msg = JSON.parse(msg); } catch (e) { return; } }
    if (!msg || msg.jsonrpc !== '2.0') return;

    // Response to one of our requests (id-correlated, no method).
    if (msg.id !== undefined && !msg.method && (('result' in msg) || ('error' in msg))) {
      var p = pending[String(msg.id)];
      if (!p) return;
      delete pending[String(msg.id)];
      if (msg.error) p.reject(new Error((msg.error && msg.error.message) || 'tool error'));
      else p.resolve(msg.result);
      return;
    }

    // Notifications from the host.
    if (msg.method === 'ui/notifications/tool-result') {
      var r = msg.params || {};
      render(r.structuredContent || r);
    }
    // The host can change context fields (theme, displayMode, container size,
    // etc.) at runtime. params is a partial HostContext carrying only the
    // changed fields, so we merge it and react when displayMode flips.
    else if (msg.method === 'ui/notifications/host-context-changed') {
      var ctx = msg.params || {};
      hostContext = Object.assign({}, hostContext, ctx);
      if (ctx.theme) { applyTheme(ctx.theme); }
      if (ctx.displayMode && ctx.displayMode !== displayMode) {
        setDisplayMode(ctx.displayMode);
        var s = document.getElementById('status');
        if (s) { s.textContent = 'Display mode changed by host: ' + displayMode + ' \\u2713'; }
      }
    }
    // tool-input is ignored in this minimal demo.
  });

  // Handshake. Tool calls only become routable after ui/initialize resolves.
  // Matches the ext-apps client: validate the result, capture the negotiated
  // host capabilities/info/context, then announce ui/notifications/initialized.
  request('ui/initialize', {
    protocolVersion: PROTOCOL_VERSION,
    appInfo: { name: 'weather-bot-widget', version: '0.1.0' },
    appCapabilities: {}
  }).then(function (result) {
    if (!result) { throw new Error('Host sent invalid initialize result: ' + result); }
    hostInfo = result.hostInfo || null;
    hostCapabilities = result.hostCapabilities || null;
    hostContext = result.hostContext || null;
    // Adopt the host's initial theme and display mode if it provided them.
    if (hostContext && hostContext.theme) { applyTheme(hostContext.theme); }
    if (hostContext && hostContext.displayMode) { setDisplayMode(hostContext.displayMode); }
    notify('ui/notifications/initialized');
    if (result.toolResult) { render(result.toolResult.structuredContent || result.toolResult); }
    reportSize();
  }).catch(function (e) {
    var root = document.getElementById('root');
    if (root) { root.textContent = 'Initialize failed: ' + (e && e.message ? e.message : e); }
    reportSize();
  });

  reportSize();
})();
</script>
</body>
</html>`;
