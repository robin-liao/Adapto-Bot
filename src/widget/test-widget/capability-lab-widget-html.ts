import {
  MCP_APPS_STABLE_SPEC_URL,
  MCP_APPS_STABLE_VERSION,
  MCP_APPS_STANDARD_AUDIT,
} from "../test-widget/mcp-apps-standard";

const STANDARD_AUDIT_JSON = JSON.stringify({
  version: MCP_APPS_STABLE_VERSION,
  specUrl: MCP_APPS_STABLE_SPEC_URL,
  ...MCP_APPS_STANDARD_AUDIT,
});

export const MCP_APPS_CAPABILITY_LAB_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<title>MCP Apps Capability Lab</title>
<style>
  :root {
    color-scheme: light;
    --canvas: var(--color-background-primary, #f6f7f9);
    --grid: rgba(36, 36, 36, .035);
    --surface: var(--color-background-secondary, #fff);
    --surface-subtle: var(--color-background-tertiary, #f3f4f7);
    --text: var(--color-text-primary, #242424);
    --muted: var(--color-text-secondary, #616161);
    --border: var(--color-border-primary, #d7d8dc);
    --border-strong: var(--color-border-secondary, #b9bbc2);
    --accent: #5b5fc7;
    --accent-strong: #444791;
    --accent-soft: #eeeeff;
    --info: var(--color-text-info, #0f6cbd);
    --success: var(--color-text-success, #107c41);
    --success-soft: var(--color-background-success, #e8f5ed);
    --danger: var(--color-text-danger, #c4314b);
    --danger-soft: var(--color-background-danger, #fcecef);
    --warning: var(--color-text-warning, #8a4f00);
    --shadow: var(--shadow-md, 0 8px 24px rgba(25, 24, 32, .08));
    --sans: var(--font-sans, 'Aptos', 'Segoe UI Variable', sans-serif);
    --mono: var(--font-mono, 'Cascadia Mono', Consolas, monospace);
    --height-test-space: 0px;
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --canvas: var(--color-background-primary, #1b1a1f);
    --grid: rgba(255, 255, 255, .035);
    --surface: var(--color-background-secondary, #252429);
    --surface-subtle: var(--color-background-tertiary, #302f35);
    --text: var(--color-text-primary, #f5f5f5);
    --muted: var(--color-text-secondary, #c8c6cc);
    --border: var(--color-border-primary, #47464d);
    --border-strong: var(--color-border-secondary, #65636d);
    --accent: #a6a9ff;
    --accent-strong: #c5c7ff;
    --accent-soft: #373750;
    --info: var(--color-text-info, #75b7eb);
    --success: var(--color-text-success, #7ed9a4);
    --success-soft: var(--color-background-success, #243e31);
    --danger: var(--color-text-danger, #ff99aa);
    --danger-soft: var(--color-background-danger, #482b32);
    --warning: var(--color-text-warning, #f7c56b);
    --shadow: var(--shadow-md, 0 10px 28px rgba(0, 0, 0, .28));
  }
  * { box-sizing: border-box; letter-spacing: 0; }
  html, body { margin: 0; width: 100%; height: 100%; min-width: 0; }
  body {
    display: flex;
    padding: 0;
    overflow-x: hidden;
    background-color: var(--canvas);
    background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 24px 24px;
    color: var(--text);
    font: 14px/1.45 var(--sans);
  }
  button, a { font: inherit; }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .app {
    width: 100%;
    min-width: 0;
    min-height: 100%;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    padding-bottom: var(--height-test-space);
  }
  .masthead {
    position: relative;
    overflow: hidden;
    padding: 20px;
    border: 1px solid var(--border);
    border-radius: var(--border-radius-md, 8px) var(--border-radius-md, 8px) 0 0;
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .masthead::before, .section::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 3px;
    background: linear-gradient(90deg, var(--accent) 0 48%, var(--info) 48% 76%, var(--success) 76%);
  }
  .eyebrow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 7px; }
  .badge { border: 1px solid var(--accent); border-radius: 999px; padding: 3px 8px; background: var(--accent-soft); color: var(--accent-strong); font: 700 11px/1.2 var(--mono); }
  .connection { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; font-weight: 700; }
  .connection::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--warning); }
  .connection[data-state="ready"]::before { background: var(--success); }
  .connection[data-state="error"]::before { background: var(--danger); }
  h1, h2, h3, p { margin-top: 0; }
  h1 { margin-bottom: 6px; font-family: var(--sans); font-size: 22px; line-height: 1.2; }
  .subtitle { max-width: 680px; margin-bottom: 0; color: var(--muted); }
  .section {
    position: relative;
    padding: 18px 20px;
    border: 1px solid var(--border);
    border-top: 0;
    background: var(--surface);
  }
  .section:last-child {
    flex: 1 1 auto;
    border-radius: 0 0 var(--border-radius-md, 8px) var(--border-radius-md, 8px);
  }
  .section-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .section h2 { margin-bottom: 0; font-size: 17px; line-height: 1.25; }
  .section-copy { margin: 4px 0 14px; color: var(--muted); font-size: 13px; }
  .spec-link { color: var(--accent-strong); font-size: 12px; font-weight: 700; }
  .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(245px, 100%), 1fr)); gap: 8px; }
  .test-button, .permission-button, .secondary-button {
    display: flex;
    min-width: 0;
    min-height: 48px;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 3px;
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    padding: 8px 12px;
    overflow-wrap: anywhere;
    background: var(--surface-subtle);
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }
  .test-button:hover, .permission-button:hover, .secondary-button:hover { border-color: var(--accent); background: var(--accent-soft); }
  .test-button:disabled, .permission-button:disabled, .secondary-button:disabled { opacity: .55; cursor: default; }
  .button-label { font-weight: 700; }
  .button-method { color: var(--muted); font: 10px/1.25 var(--mono); }
  .result {
    min-height: 62px;
    margin-top: 12px;
    border: 1px solid var(--border);
    border-left: 3px solid var(--info);
    border-radius: 6px;
    padding: 11px 13px;
    overflow-wrap: anywhere;
    background: var(--surface-subtle);
    color: var(--text);
    font: 12px/1.55 var(--mono);
    white-space: pre-wrap;
  }
  .result[data-state="success"] { border-left-color: var(--success); background: var(--success-soft); }
  .result[data-state="error"] { border-left-color: var(--danger); background: var(--danger-soft); }
  .audit-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)); gap: 8px; }
  .audit-group { padding: 11px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-subtle); }
  .audit-group h3 { margin-bottom: 7px; color: var(--muted); font-size: 11px; text-transform: uppercase; }
  .audit-group ul { margin: 0; padding-left: 17px; }
  .audit-group li { margin: 3px 0; overflow-wrap: anywhere; }
  code { font: 11px/1.4 var(--mono); }
  .note { margin: 11px 0 0; color: var(--muted); font-size: 12px; }
  .permission-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr)); gap: 8px; }
  .permission-button { min-height: 40px; align-items: center; border-color: var(--accent); text-align: center; }
  .secondary-button { min-height: 36px; align-items: center; background: transparent; text-align: center; }
  .status { min-height: 20px; margin-top: 10px; color: var(--muted); font-weight: 700; overflow-wrap: anywhere; }
  .status[data-state="success"] { color: var(--success); }
  .status[data-state="error"] { color: var(--danger); }
  #cameraPreview { display: block; width: min(100%, 480px); margin-top: 10px; border-radius: 6px; background: #111; }
  [hidden] { display: none !important; }
  .event-log { max-height: 180px; margin: 0; overflow: auto; border: 1px solid var(--border); border-radius: 6px; padding: 10px; background: var(--surface-subtle); color: var(--muted); font: 11px/1.5 var(--mono); white-space: pre-wrap; }
  body[data-mode="fullscreen"] { padding: 0; background-image: none; }
  body[data-mode="fullscreen"] .masthead { border-radius: 0; }
  @media (max-width: 420px) {
    .masthead, .section { padding: 15px; }
    .test-grid, .audit-grid, .permission-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body data-mode="inline">
<main class="app">
  <header class="masthead">
    <div class="eyebrow">
      <span class="badge">SEP-1865 / ${MCP_APPS_STABLE_VERSION}</span>
      <span class="connection" id="connection" data-state="connecting">Connecting to host</span>
    </div>
    <h1>MCP Apps Capability Lab</h1>
    <p class="subtitle">A compact, standards-audited test surface for the Teams HTML Widgets adapter.</p>
  </header>

  <section class="section" aria-labelledby="host-tests-title">
    <div class="section-head"><h2 id="host-tests-title">Host protocol tests</h2></div>
    <div class="test-grid">
      <button class="test-button" data-test="ping"><span class="button-label">Ping host</span><span class="button-method">ping</span></button>
      <button class="test-button" data-test="call-tool"><span class="button-label">Call server tool</span><span class="button-method">tools/call</span></button>
      <button class="test-button" data-test="open-link"><span class="button-label">Open specification</span><span class="button-method">ui/open-link</span></button>
      <button class="test-button" data-test="send-message"><span class="button-label">Send user message</span><span class="button-method">ui/message</span></button>
      <button class="test-button" data-test="display-mode"><span class="button-label">Change display mode</span><span class="button-method">ui/request-display-mode</span></button>
      <button class="test-button" data-test="send-log"><span class="button-label">Send host log</span><span class="button-method">notifications/message</span></button>
      <button class="test-button" data-test="send-size"><span class="button-label">Report size now</span><span class="button-method">ui/notifications/size-changed</span></button>
      <button class="test-button" data-test="change-height"><span class="button-label">Change widget height</span><span class="button-method">ui/notifications/size-changed</span></button>
      <button class="test-button" data-test="auto-size"><span class="button-label">Auto-size: on</span><span class="button-method">ResizeObserver</span></button>
      <button class="test-button" data-test="model-context"><span class="button-label">Update model context</span><span class="button-method">ui/update-model-context</span></button>
      <button class="test-button" data-test="external-fetch"><span class="button-label">Test external fetch</span><span class="button-method">connectDomains</span></button>
      <button class="test-button" data-test="host-capabilities"><span class="button-label">Inspect capabilities</span><span class="button-method">initialize result</span></button>
      <button class="test-button" data-test="host-context"><span class="button-label">Inspect host context</span><span class="button-method">initialize result</span></button>
      <button class="test-button" data-test="host-version"><span class="button-label">Inspect host version</span><span class="button-method">initialize result</span></button>
    </div>
    <div class="result" id="result" role="status" aria-live="polite">Ready after the host completes ui/initialize.</div>
  </section>

  <section class="section" aria-labelledby="coverage-title">
    <div class="section-head">
      <h2 id="coverage-title">Stable MCP Apps coverage</h2>
      <a class="spec-link" id="specLink" href="${MCP_APPS_STABLE_SPEC_URL}">Open SEP-1865</a>
    </div>
    <p class="section-copy">Cross-checked against the stable specification, not the development draft.</p>
    <div class="audit-grid" id="auditGrid"></div>
    <p class="note">Host-reserved sandbox messages and <code>resources/read</code> require host/server fixtures and are reported rather than invoked by this Teams adapter.</p>
  </section>

  <section class="section" aria-labelledby="permissions-title">
    <div class="section-head"><h2 id="permissions-title">Sandbox permissions</h2></div>
    <p class="section-copy">Each control exercises a browser capability declared in the resource policy and handles denial.</p>
    <div class="permission-grid">
      <button class="permission-button" data-permission="camera">Test camera</button>
      <button class="permission-button" data-permission="microphone">Test microphone</button>
      <button class="permission-button" data-permission="geolocation">Test location</button>
      <button class="permission-button" data-permission="clipboard">Test clipboard</button>
      <button class="secondary-button" id="stopMedia" hidden>Stop media</button>
    </div>
    <video id="cameraPreview" autoplay muted playsinline hidden></video>
    <div class="status" id="permissionStatus" role="status" aria-live="polite">Ready to test permissions.</div>
  </section>

  <section class="section" aria-labelledby="events-title">
    <div class="section-head">
      <h2 id="events-title">Lifecycle events</h2>
      <button class="secondary-button" id="clearEvents">Clear</button>
    </div>
    <pre class="event-log" id="eventLog">Waiting for host events...</pre>
  </section>
</main>

<script>
(function () {
  'use strict';
  var PROTOCOL_VERSION = '${MCP_APPS_STABLE_VERSION}';
  var audit = ${STANDARD_AUDIT_JSON};
  var pending = {};
  var nextId = 1;
  var initialized = false;
  var hostCapabilities = {};
  var hostContext = {};
  var hostInfo = {};
  var currentMode = 'inline';
  var actionSequence = 0;
  var activeStream = null;
  var autoSizeEnabled = true;
  var resizeObserver = null;
  var lastReportedHeight = 0;
  var heightStep = 0;

  var connection = document.getElementById('connection');
  var result = document.getElementById('result');
  var permissionStatus = document.getElementById('permissionStatus');
  var eventLog = document.getElementById('eventLog');
  var cameraPreview = document.getElementById('cameraPreview');
  var stopMediaButton = document.getElementById('stopMedia');

  function post(message) { parent.postMessage(message, '*'); }

  function request(method, params) {
    var id = 'lab-' + nextId++;
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        delete pending[id];
        reject(new Error(method + ' timed out'));
      }, 10000);
      pending[id] = {
        resolve: function (value) { clearTimeout(timer); resolve(value); },
        reject: function (error) { clearTimeout(timer); reject(error); }
      };
      logEvent('view -> host', method);
      post({ jsonrpc: '2.0', id: id, method: method, params: params || {} });
    });
  }

  function notify(method, params) {
    logEvent('view -> host', method);
    post({ jsonrpc: '2.0', method: method, params: params || {} });
  }

  function respond(id, value) { post({ jsonrpc: '2.0', id: id, result: value || {} }); }

  function escapeHtml(value) {
    return String(value).replace(/[&<>\"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[character];
    });
  }

  function stringify(value) {
    try { return JSON.stringify(value, null, 2); } catch (error) { return String(value); }
  }

  function setResult(message, state) {
    result.textContent = message;
    result.setAttribute('data-state', state || 'neutral');
    reportSizeSoon();
  }

  function setPermissionStatus(message, failed) {
    permissionStatus.textContent = (failed ? 'Failed: ' : 'Passed: ') + message;
    permissionStatus.setAttribute('data-state', failed ? 'error' : 'success');
    reportSizeSoon();
  }

  function logEvent(direction, method, detail) {
    var line = new Date().toLocaleTimeString() + '  ' + direction + '  ' + method;
    if (detail) line += '  ' + detail;
    eventLog.textContent = eventLog.textContent === 'Waiting for host events...' ? line : line + '\\n' + eventLog.textContent;
  }

  function requireReady() {
    if (!initialized) throw new Error('ui/initialize has not completed');
  }

  function requireCapability(name) {
    requireReady();
    if (!hostCapabilities[name]) throw new Error('Host did not advertise ' + name);
  }

  function applyHostContext(context) {
    if (!context) return;
    hostContext = Object.assign({}, hostContext, context);
    if (context.theme) document.documentElement.setAttribute('data-theme', context.theme === 'dark' ? 'dark' : 'light');
    if (context.displayMode) {
      currentMode = context.displayMode;
      document.body.setAttribute('data-mode', currentMode);
    }
    var variables = context.styles && context.styles.variables;
    if (variables) {
      Object.keys(variables).forEach(function (key) {
        if (variables[key] !== undefined) document.documentElement.style.setProperty(key, variables[key]);
      });
    }
    var fonts = context.styles && context.styles.css && context.styles.css.fonts;
    if (fonts) {
      var style = document.getElementById('hostFonts') || document.createElement('style');
      style.id = 'hostFonts';
      style.textContent = fonts;
      document.head.appendChild(style);
    }
    reportSizeSoon();
  }

  function reportSize(force) {
    if (!autoSizeEnabled && !force) return;
    var height = Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
    if (height === lastReportedHeight) return;
    lastReportedHeight = height;
    notify('ui/notifications/size-changed', { height: height });
  }

  function reportSizeSoon() { setTimeout(reportSize, 0); }

  function renderAudit() {
    var groups = [
      ['Active wire tests', audit.activeWireMethods],
      ['Automatic / passive', audit.automaticAndPassiveMethods],
      ['SDK accessors', audit.sdkAccessors],
      ['Resource policy', audit.resourcePolicyTests],
      ['Host-reserved', audit.hostReservedMethods],
      ['Adapter limitations', audit.adapterLimitations],
      ['Draft excluded', audit.excludedDraftMethods]
    ];
    document.getElementById('auditGrid').innerHTML = groups.map(function (group) {
      return '<section class="audit-group"><h3>' + escapeHtml(group[0]) + '</h3><ul>' +
        group[1].map(function (item) { return '<li><code>' + escapeHtml(item) + '</code></li>'; }).join('') +
        '</ul></section>';
    }).join('');
  }

  function stopMedia() {
    if (activeStream) {
      activeStream.getTracks().forEach(function (track) { track.stop(); });
      activeStream = null;
    }
    cameraPreview.pause();
    cameraPreview.srcObject = null;
    cameraPreview.hidden = true;
    stopMediaButton.hidden = true;
    reportSizeSoon();
  }

  async function testMedia(constraints, label, preview) {
    stopMedia();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus(label + ' is unavailable in this sandbox.', true);
      return;
    }
    try {
      activeStream = await navigator.mediaDevices.getUserMedia(constraints);
      var tracks = activeStream.getTracks();
      if (preview) {
        cameraPreview.srcObject = activeStream;
        cameraPreview.hidden = false;
        stopMediaButton.hidden = false;
        await cameraPreview.play();
      } else {
        tracks.forEach(function (track) { track.stop(); });
        activeStream = null;
      }
      setPermissionStatus(label + ' granted (' + tracks.length + ' track' + (tracks.length === 1 ? '' : 's') + ').', false);
    } catch (error) {
      setPermissionStatus(label + ': ' + (error && error.message ? error.message : String(error)), true);
    }
  }

  var actions = {
    ping: async function () {
      await request('ping', {});
      return 'ping returned an empty result.';
    },
    'call-tool': async function () {
      requireCapability('serverTools');
      var response = await request('tools/call', { name: 'get-time', arguments: {} });
      return stringify(response);
    },
    'open-link': async function () {
      requireCapability('openLinks');
      var response = await request('ui/open-link', { url: audit.specUrl });
      if (response && response.isError) throw new Error('Host rejected ui/open-link');
      return 'Host accepted the link request.';
    },
    'send-message': async function () {
      requireReady();
      actionSequence += 1;
      var text = 'MCP Apps capability test #' + actionSequence;
      var response = await request('ui/message', { role: 'user', content: [{ type: 'text', text: text }] });
      if (response && response.isError) throw new Error('Host rejected ui/message');
      return 'Sent: ' + text;
    },
    'display-mode': async function () {
      requireReady();
      var modes = hostContext.availableDisplayModes || [];
      if (!modes.length) throw new Error('Host did not advertise availableDisplayModes');
      var index = modes.indexOf(currentMode);
      var requested = modes[(index + 1) % modes.length];
      var response = await request('ui/request-display-mode', { mode: requested });
      currentMode = response && response.mode ? response.mode : currentMode;
      document.body.setAttribute('data-mode', currentMode);
      return 'Host selected ' + currentMode + '.';
    },
    'send-log': async function () {
      requireCapability('logging');
      actionSequence += 1;
      notify('notifications/message', { level: 'info', data: { message: 'Capability Lab log #' + actionSequence } });
      return 'Log notification sent.';
    },
    'send-size': async function () {
      requireReady();
      lastReportedHeight = 0;
      reportSize(true);
      return 'Current content height reported.';
    },
    'change-height': async function () {
      requireReady();
      var heightSteps = [0, 160, 320];
      heightStep = (heightStep + 1) % heightSteps.length;
      var extraHeight = heightSteps[heightStep];
      document.documentElement.style.setProperty('--height-test-space', extraHeight + 'px');
      lastReportedHeight = 0;
      await new Promise(function (resolve) { window.requestAnimationFrame(resolve); });
      reportSize(true);
      return 'Widget height changed by ' + extraHeight + ' pixels.';
    },
    'auto-size': async function (button) {
      autoSizeEnabled = !autoSizeEnabled;
      button.querySelector('.button-label').textContent = 'Auto-size: ' + (autoSizeEnabled ? 'on' : 'off');
      if (autoSizeEnabled) { lastReportedHeight = 0; reportSize(); }
      return 'Automatic size notifications ' + (autoSizeEnabled ? 'enabled.' : 'paused.');
    },
    'model-context': async function () {
      requireReady();
      actionSequence += 1;
      await request('ui/update-model-context', {
        content: [{ type: 'text', text: 'Capability Lab context #' + actionSequence }],
        structuredContent: { source: 'capability-lab', sequence: actionSequence }
      });
      return 'Model context updated for a future turn.';
    },
    'external-fetch': async function () {
      var response = await fetch('https://official-joke-api.appspot.com/random_joke');
      if (!response.ok) throw new Error('External API returned ' + response.status);
      var data = await response.json();
      return data.setup + ' ' + data.punchline;
    },
    'host-capabilities': async function () { requireReady(); return stringify(hostCapabilities); },
    'host-context': async function () { requireReady(); return stringify(hostContext); },
    'host-version': async function () { requireReady(); return stringify(hostInfo); }
  };

  document.querySelectorAll('[data-test]').forEach(function (button) {
    button.addEventListener('click', async function () {
      var name = button.getAttribute('data-test');
      button.disabled = true;
      setResult('Running ' + name + '...', 'neutral');
      try {
        var output = await actions[name](button);
        setResult('Passed: ' + output, 'success');
      } catch (error) {
        setResult('Failed: ' + (error && error.message ? error.message : String(error)), 'error');
      } finally {
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-permission]').forEach(function (button) {
    button.addEventListener('click', function () {
      var permission = button.getAttribute('data-permission');
      if (permission === 'camera') return testMedia({ video: true }, 'Camera', true);
      if (permission === 'microphone') return testMedia({ audio: true }, 'Microphone', false);
      if (permission === 'geolocation') {
        if (!navigator.geolocation) return setPermissionStatus('Geolocation is unavailable in this sandbox.', true);
        navigator.geolocation.getCurrentPosition(function (position) {
          setPermissionStatus('Location granted (' + position.coords.latitude.toFixed(4) + ', ' + position.coords.longitude.toFixed(4) + ').', false);
        }, function (error) {
          setPermissionStatus('Location: ' + error.message, true);
        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 });
        return;
      }
      if (!navigator.clipboard || !navigator.clipboard.writeText) return setPermissionStatus('Clipboard write is unavailable in this sandbox.', true);
      navigator.clipboard.writeText('MCP Apps clipboard test ' + new Date().toISOString()).then(function () {
        setPermissionStatus('Clipboard write completed.', false);
      }).catch(function (error) {
        setPermissionStatus('Clipboard: ' + error.message, true);
      });
    });
  });

  stopMediaButton.addEventListener('click', function () { stopMedia(); setPermissionStatus('Media tracks stopped.', false); });
  document.getElementById('clearEvents').addEventListener('click', function () { eventLog.textContent = 'Event log cleared.'; });
  document.getElementById('specLink').addEventListener('click', function (event) {
    event.preventDefault();
    document.querySelector('[data-test="open-link"]').click();
  });

  window.addEventListener('message', function (event) {
    if (event.source !== parent) return;
    var message = event.data;
    if (typeof message === 'string') {
      try { message = JSON.parse(message); } catch (error) { return; }
    }
    if (!message || message.jsonrpc !== '2.0') return;

    if (message.id !== undefined && !message.method && (message.result !== undefined || message.error)) {
      var waiting = pending[String(message.id)];
      if (!waiting) return;
      delete pending[String(message.id)];
      if (message.error) waiting.reject(new Error(message.error.message || 'Host request failed'));
      else waiting.resolve(message.result);
      return;
    }

    if (!message.method) return;
    logEvent('host -> view', message.method);

    if (message.method === 'ui/notifications/host-context-changed') {
      applyHostContext(message.params || {});
    } else if (message.method === 'ui/notifications/tool-input-partial') {
      setResult('Partial tool input: ' + stringify(message.params), 'neutral');
    } else if (message.method === 'ui/notifications/tool-input') {
      setResult('Tool input: ' + stringify(message.params), 'neutral');
    } else if (message.method === 'ui/notifications/tool-result') {
      setResult('Tool result: ' + stringify(message.params), 'success');
    } else if (message.method === 'ui/notifications/tool-cancelled') {
      setResult('Tool cancelled: ' + stringify(message.params), 'error');
    } else if (message.method === 'ui/resource-teardown' && message.id !== undefined) {
      stopMedia();
      respond(message.id, {});
    }
  });

  window.addEventListener('pagehide', stopMedia);
  renderAudit();
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(reportSizeSoon);
    resizeObserver.observe(document.body);
  }

  request('ui/initialize', {
    protocolVersion: PROTOCOL_VERSION,
    appInfo: { name: 'MCP Apps Capability Lab', version: '1.0.0' },
    appCapabilities: { availableDisplayModes: ['inline', 'fullscreen', 'pip'] }
  }).then(function (response) {
    hostCapabilities = response.hostCapabilities || {};
    hostContext = response.hostContext || {};
    hostInfo = response.hostInfo || {};
    applyHostContext(hostContext);
    initialized = true;
    connection.textContent = 'Connected to ' + (hostInfo.name || 'host');
    connection.setAttribute('data-state', 'ready');
    notify('ui/notifications/initialized', {});
    setResult('Connected. Choose a standard capability to test.', 'success');
    reportSizeSoon();
  }).catch(function (error) {
    connection.textContent = 'Initialization failed';
    connection.setAttribute('data-state', 'error');
    setResult('Failed: ' + error.message, 'error');
  });
})();
</script>
</body>
</html>`;
