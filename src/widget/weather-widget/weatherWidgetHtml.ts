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
export const WEATHER_WIDGET_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
  .card { position: relative; isolation: isolate; overflow: hidden;
          padding: 16px; border-radius: 12px; color: #15202a;
          background: linear-gradient(145deg, #58a8d1 0%, #bfe2e7 62%, #f0ca7f 100%); }
  .card.weather-partly { background: linear-gradient(145deg, #54a2cc 0%, #c5dfe0 58%, #efc56d 100%); }
  .card.weather-cloudy { background: linear-gradient(145deg, #718997 0%, #b7c3c4 58%, #ded3c2 100%); }
  .card.weather-drizzle { background: linear-gradient(145deg, #628c9e 0%, #a9c1c3 58%, #d4d0bd 100%); }
  .card.weather-rain { background: linear-gradient(145deg, #456674 0%, #82999c 62%, #b6b7ad 100%); }
  .card.weather-heavy-rain { color: #fff; background: linear-gradient(145deg, #263f50 0%, #526f79 58%, #858b88 100%); }
  .card.weather-showers { background: linear-gradient(145deg, #397b99 0%, #83adb5 56%, #d0be91 100%); }
  .card.weather-sleet { background: linear-gradient(145deg, #506f84 0%, #9bb1bb 58%, #d8dcda 100%); }
  .card.weather-snow { background: linear-gradient(145deg, #7795aa 0%, #c6d9df 58%, #edf0ec 100%); }
  .card.weather-heavy-snow { background: linear-gradient(145deg, #607d94 0%, #b2cbd5 55%, #f1f4f3 100%); }
  .card.weather-fog { background: linear-gradient(145deg, #768e8b 0%, #b6c1bb 54%, #d7cfc3 100%); }
  .card.weather-storm { color: #fff; background: linear-gradient(145deg, #292d41 0%, #5d6172 58%, #948d89 100%); }
  .card.weather-hail { color: #fff; background: linear-gradient(145deg, #263041 0%, #596979 55%, #99a4a6 100%); }
  .card.night { color: #f7f3e8; background: linear-gradient(145deg, #101629 0%, #293d52 62%, #67566f 100%); }
  .card.night.weather-partly { background: linear-gradient(145deg, #121a2d 0%, #34485b 58%, #655d69 100%); }
  .card.night.weather-cloudy { background: linear-gradient(145deg, #171e2b 0%, #3e4a55 60%, #625e66 100%); }
  .card.night.weather-drizzle, .card.night.weather-showers { background: linear-gradient(145deg, #101a28 0%, #304652 58%, #585c61 100%); }
  .card.night.weather-rain { background: linear-gradient(145deg, #111b27 0%, #2a3e49 60%, #4d5457 100%); }
  .card.night.weather-heavy-rain, .card.night.weather-sleet { background: linear-gradient(145deg, #0d1521 0%, #253744 58%, #48515a 100%); }
  .card.night.weather-snow { background: linear-gradient(145deg, #182033 0%, #465970 58%, #819099 100%); }
  .card.night.weather-heavy-snow { background: linear-gradient(145deg, #151d2e 0%, #3d5267 56%, #748895 100%); }
  .card.night.weather-fog { background: linear-gradient(145deg, #192229 0%, #465655 56%, #76776f 100%); }
  .card.night.weather-storm { background: linear-gradient(145deg, #11111f 0%, #292b40 58%, #514b58 100%); }
  .card.night.weather-hail { background: linear-gradient(145deg, #101521 0%, #2a3647 58%, #505c68 100%); }
  .card::after { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
                 background: linear-gradient(90deg, rgba(255,255,255,.49), rgba(255,255,255,.16) 68%, rgba(255,255,255,.04)); }
  .card.night::after, .card.weather-storm::after, .card.weather-heavy-rain::after, .card.weather-hail::after {
    background: linear-gradient(90deg, rgba(8,12,20,.4), rgba(8,12,20,.1) 70%, rgba(8,12,20,.02));
  }
  .weather-content { position: relative; z-index: 2; }
  /* --rain-dx / --rain-tilt / --drift-dx / --season-dx are set inline from the live wind */
  .weather-scene { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none;
                   --rain-dx: -24px; --rain-tilt: 4deg; --drift-dx: 24px; --season-dx: 12px; }
  .layer { position: absolute; inset: 0; }
  /* clear-night starfield + soft moon glow */
  .star { position: absolute; border-radius: 50%; background: #fdf6da;
          box-shadow: 0 0 4px rgba(253,246,218,.85); animation: twinkle ease-in-out infinite; }
  @keyframes twinkle { 0%,100% { opacity: .18; transform: scale(.55); } 50% { opacity: 1; transform: scale(1); } }
  .moon-glow { background: radial-gradient(circle at 84% 20%, rgba(255,248,214,.4), rgba(255,248,214,0) 30%); }
  /* clear-day sun with rotating rays */
  .sun { position: absolute; top: -10px; right: 7%; width: 52px; height: 52px; }
  .sun-core { position: absolute; inset: 0; border-radius: 50%;
              background: radial-gradient(circle, #fff4bc 0%, #ffd35a 58%, rgba(255,211,90,0) 74%);
              box-shadow: 0 0 28px rgba(255,206,92,.7); animation: sun-pulse 5s ease-in-out infinite; }
  .sun-rays { position: absolute; inset: -30px; border-radius: 50%;
              background: repeating-conic-gradient(from 0deg, rgba(255,225,128,.5) 0 4deg, transparent 4deg 24deg);
              -webkit-mask: radial-gradient(circle, transparent 27px, #000 30px, #000 47px, transparent 59px);
              mask: radial-gradient(circle, transparent 27px, #000 30px, #000 47px, transparent 59px);
              animation: spin 48s linear infinite; }
  @keyframes sun-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  /* layered drifting clouds */
  .clouds span { position: absolute; border-radius: 100px; filter: blur(3px);
                 background: linear-gradient(180deg, rgba(255,255,255,.82), rgba(255,255,255,.5));
                 box-shadow: 0 8px 16px rgba(40,55,66,.14); animation: cloud-drift-x linear infinite alternate; }
  .night .clouds span, .weather-storm .clouds span, .weather-heavy-rain .clouds span, .weather-hail .clouds span {
    background: linear-gradient(180deg, rgba(198,208,216,.6), rgba(158,170,180,.42)); box-shadow: none; }
  @keyframes cloud-drift-x { from { transform: translateX(-12px); } to { transform: translateX(18px); } }
  /* from "breezy" up, clouds sail across the whole card with the wind */
  .cloud-track { position: absolute; inset: 0; animation: cloud-sail linear infinite; }
  .cloud-track span { animation: none; }
  .wind-to-left .cloud-track { animation-direction: reverse; }
  @keyframes cloud-sail { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
  /* falling rain — parallel streaks, no crosshatch */
  .drop { position: absolute; top: -18px; width: 2px; border-radius: 2px;
          background: linear-gradient(to bottom, rgba(206,232,244,0), rgba(210,235,246,.9));
          animation: drop-fall linear infinite; }
    .weather-drizzle .drop { width: 1px; background: linear-gradient(to bottom, transparent, rgba(225,240,245,.72)); }
    .weather-heavy-rain .drop { width: 3px; background: linear-gradient(to bottom, transparent, rgba(220,239,247,.96)); }
    .showers-rain { animation: shower-wave 5s ease-in-out infinite; animation-delay: -2s; }
  @keyframes drop-fall { 0% { transform: translate(0,-18px) rotate(var(--rain-tilt)); opacity: 0; } 12% { opacity: .9; }
                         100% { transform: translate(var(--rain-dx),340px) rotate(var(--rain-tilt)); opacity: .12; } }
    @keyframes shower-wave { 0%,100% { opacity: .35; } 28%,64% { opacity: 1; } 82% { opacity: .55; } }
  /* drifting snow */
  .flake { position: absolute; top: -12px; border-radius: 50%;
           background: radial-gradient(circle, #fff, #e6f1f7); box-shadow: 0 0 4px rgba(255,255,255,.6);
           animation: flake-fall ease-in-out infinite; }
  @keyframes flake-fall { 0% { transform: translate(0,-12px); opacity: 0; } 12% { opacity: .95; }
                          50% { transform: translate(calc(var(--drift-dx) * .3 + 15px),150px); }
                          100% { transform: translate(calc(var(--drift-dx) * .6 - 9px),330px); opacity: .3; } }
  /* hard precipitation for sleet and hail */
  .ice-pellet { position: absolute; top: -12px; border-radius: 50%;
                background: radial-gradient(circle at 35% 30%, #fff, #b9d9e8 70%);
                box-shadow: 0 0 5px rgba(225,245,255,.65); animation: ice-fall linear infinite; }
  .weather-hail .ice-pellet { box-shadow: 0 0 7px rgba(235,249,255,.82); }
  @keyframes ice-fall { 0% { transform: translate(0,-12px); opacity: 0; } 10% { opacity: .95; }
                        50% { transform: translate(calc(var(--rain-dx) * .5 + 8px),155px); }
                        100% { transform: translate(calc(var(--rain-dx) - 12px),340px); opacity: .38; } }
  /* rolling fog banks */
  .fog span { position: absolute; left: -25%; width: 150%; height: 30px; border-radius: 40px;
              background: rgba(233,237,233,.42); filter: blur(7px); animation: fog-move ease-in-out infinite alternate; }
  .fog span:nth-child(1) { top: 22%; animation-duration: 11s; }
  .fog span:nth-child(2) { top: 43%; animation-duration: 15s; animation-direction: alternate-reverse; }
  .fog span:nth-child(3) { top: 64%; animation-duration: 13s; }
  .night .fog span { background: rgba(150,162,168,.34); }
  @keyframes fog-move { from { transform: translateX(-9%); } to { transform: translateX(9%); } }
  /* wind streaks: count + speed follow the live wind; mirrored when it blows toward the west */
  .gust { position: absolute; left: 0; width: 100%; height: 1px;
          background: linear-gradient(90deg, transparent 58%, rgba(255,255,255,.72) 82%, transparent 97%);
          animation: gust-sweep linear infinite; }
  .wind-to-left .wind { transform: scaleX(-1); }
  @keyframes gust-sweep { 0% { transform: translate(-96%,0); opacity: 0; } 15%,85% { opacity: .8; }
                          50% { transform: translate(-28%,-3px); } 100% { transform: translate(40%,2px); opacity: 0; } }
  /* seasonal accents (clear skies only) lean gently with the wind and get nudged by gusts */
  .night .season-tint { opacity: .55; }
  .season-gust { animation: season-gust ease-in-out infinite; }
  @keyframes season-gust { 0%,100% { transform: translateX(0); } 40% { transform: translateX(var(--season-gust)); }
                           55% { transform: translateX(calc(var(--season-gust) * .7)); } }
  .season-spring .season-tint { background: radial-gradient(70% 55% at 100% 100%, rgba(255,184,214,.4), transparent 70%),
                                            radial-gradient(60% 45% at 0% 100%, rgba(166,224,150,.32), transparent 70%); }
  .season-summer .season-tint { background: radial-gradient(75% 65% at 100% 0%, rgba(255,214,120,.42), transparent 68%); }
  .season-autumn .season-tint { background: radial-gradient(90% 55% at 70% 100%, rgba(228,124,50,.38), transparent 72%); }
  .season-winter .season-tint { background: radial-gradient(85% 55% at 50% 0%, rgba(214,236,255,.42), transparent 72%); }
  .petal, .leaf { position: absolute; top: -14px; animation: bit-fall ease-in-out infinite; }
  .petal.flip, .leaf.flip { animation-name: bit-fall-b; }
  .petal { border-radius: 80% 0 80% 60%; box-shadow: inset -1px -1px 2px rgba(200,70,120,.35); }
  .leaf { border-radius: 0 85% 0 85%;
          background-image: linear-gradient(135deg, transparent 45%, rgba(84,38,12,.4) 48% 52%, transparent 55%); }
  @keyframes bit-fall {
    0% { transform: translate(0,-14px) rotate(0deg) scaleX(1); opacity: 0; } 8% { opacity: .95; }
    30% { transform: translate(calc(var(--season-dx) * .3 + 14px),95px) rotate(110deg) scaleX(-.4); }
    62% { transform: translate(calc(var(--season-dx) * .62 - 10px),200px) rotate(230deg) scaleX(1); }
    100% { transform: translate(var(--season-dx),330px) rotate(360deg) scaleX(-.6); opacity: .3; } }
  @keyframes bit-fall-b {
    0% { transform: translate(0,-14px) rotate(0deg) scaleX(-1); opacity: 0; } 8% { opacity: .95; }
    36% { transform: translate(calc(var(--season-dx) * .36 - 12px),115px) rotate(-125deg) scaleX(.5); }
    70% { transform: translate(calc(var(--season-dx) * .7 + 12px),230px) rotate(-240deg) scaleX(-1); }
    100% { transform: translate(var(--season-dx),330px) rotate(-340deg) scaleX(.4); opacity: .3; } }
  .mote { position: absolute; border-radius: 50%; background: radial-gradient(circle, #fffdf2 0 30%, #ffe08a 70%);
          box-shadow: 0 0 7px 2px rgba(255,205,90,.75); animation: mote-float ease-in-out infinite; }
  @keyframes mote-float { 0% { transform: translate(0,0); opacity: 0; } 20%,75% { opacity: .9; }
                          50% { transform: translate(calc(var(--season-dx) * .5 + 10px),-16px); }
                          100% { transform: translate(var(--season-dx),-6px); opacity: 0; } }
  .firefly { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #f6ffb0;
             box-shadow: 0 0 5px 2px rgba(222,255,120,.7), 0 0 12px 5px rgba(190,240,90,.28);
             animation: firefly-wander ease-in-out infinite alternate, firefly-glow ease-in-out infinite; }
  @keyframes firefly-wander { 0% { transform: translate(0,0); } 35% { transform: translate(12px,-10px); }
                              70% { transform: translate(-6px,-18px); }
                              100% { transform: translate(calc(var(--drift-dx) * .2 + 8px),4px); } }
  @keyframes firefly-glow { 0%,100% { opacity: .08; } 45%,60% { opacity: 1; } }
  .sparkle { position: absolute; width: 9px; height: 9px; animation: sparkle ease-in-out infinite; }
  .sparkle::before, .sparkle::after { content: ''; position: absolute; inset: 4px 0; background: #fff;
                                      box-shadow: 0 0 4px rgba(255,255,255,.9); }
  .sparkle::after { inset: 0 4px; }
  @keyframes sparkle { 0% { opacity: 0; transform: translateX(0) scale(.3) rotate(0deg); }
                       50% { opacity: 1; transform: translateX(calc(var(--season-dx) * .15)) scale(1) rotate(45deg); }
                       100% { opacity: 0; transform: translateX(calc(var(--season-dx) * .3)) scale(.3) rotate(90deg); } }
  .frost { border-radius: 12px; box-shadow: inset 0 0 22px 2px rgba(228,243,255,.62), inset 0 0 2px 1px rgba(255,255,255,.55); }
  .night .frost { opacity: .6; }
  /* storm lightning: full-card flash + bolt */
  .lightning { animation: flash 6s steps(1,end) infinite; }
  @keyframes flash { 0%,87%,100% { background: rgba(255,250,224,0); }
                     88% { background: rgba(255,250,224,.5); } 89% { background: rgba(255,250,224,0); }
                     91% { background: rgba(255,250,224,.42); } 92% { background: rgba(255,250,224,0); } }
  .bolt { position: absolute; top: 14px; right: 16%; font-size: 46px; color: #ffe89a;
          filter: drop-shadow(0 0 12px rgba(255,232,120,.85)); opacity: 0; animation: bolt-show 6s steps(1,end) infinite; }
  @keyframes bolt-show { 0%,87%,93%,100% { opacity: 0; } 88%,92% { opacity: 1; } }
  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .head > :first-child { min-width: 0; }
  .loc { font-weight: 600; font-size: 15px; }
  .cond { font-size: 13px; opacity: 0.7; }
  .badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600;
           padding: 2px 8px; border-radius: 999px; margin-top: 6px; letter-spacing: 0.4px; }
  .wind-chip { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; padding: 2px 8px; border-radius: 999px;
               font-size: 11px; font-weight: 600; white-space: nowrap; background: rgba(255,255,255,.34); cursor: help; }
  .night .wind-chip, .weather-storm .wind-chip, .weather-heavy-rain .wind-chip, .weather-hail .wind-chip { background: rgba(9,15,24,.26); }
  .wind-gust { font-weight: 500; opacity: .8; }
  .wind-arrow { width: 11px; height: 11px; flex: none; fill: currentColor; transform: rotate(var(--wind-to)); }
  /* the vane trembles harder as the wind picks up */
  .wind-light .wind-arrow { --sway: 4deg; animation: vane 2.6s ease-in-out infinite alternate; }
  .wind-breezy .wind-arrow { --sway: 7deg; animation: vane 1.4s ease-in-out infinite alternate; }
  .wind-windy .wind-arrow { --sway: 10deg; animation: vane .8s ease-in-out infinite alternate; }
  .wind-gale .wind-arrow { --sway: 14deg; animation: vane .4s ease-in-out infinite alternate; }
  @keyframes vane { from { transform: rotate(calc(var(--wind-to) - var(--sway))); } to { transform: rotate(calc(var(--wind-to) + var(--sway))); } }
  .badge.live { background: rgba(26,127,55,0.14); color: #1a7f37; }
  .badge.est { background: rgba(207,34,46,0.14); color: #cf222e; }
  .night .badge.live { background: rgba(21,104,49,.46); color: #c7f5d2; }
  .night .badge.est { background: rgba(132,31,42,.46); color: #ffd1d5; }
  .badge .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .badge.live .dot { animation: pulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.8); } }
  .current { flex: 0 0 auto; margin-left: 12px; text-align: right; }
  .temp { font-size: 22px; font-weight: 600; white-space: nowrap; }
  .current-icon[title], .moon-phase { cursor: help; }
  .moon-phase { margin-left: 3px; font-size: 14px; vertical-align: 2px; }
  .sun-times { margin-top: 3px; font-size: 10px; font-weight: 500; white-space: nowrap; opacity: .68; }
  .sun-times .sep { padding: 0 3px; opacity: .7; }
    .forecast { margin: 14px 0; }
    .forecast-title { margin-bottom: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; opacity: .68; }
    .hours { display: grid; grid-template-columns: repeat(6, minmax(42px, 1fr)); gap: 5px; overflow-x: auto;
             padding-bottom: 2px; scrollbar-width: none; }
    .hours::-webkit-scrollbar { display: none; }
    .hour { box-sizing: border-box; min-width: 42px; padding: 6px 2px; border-radius: 6px; background: rgba(255,255,255,.2);
      display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; opacity: .9; }
    .night .hour, .weather-storm .hour, .weather-heavy-rain .hour, .weather-hail .hour { background: rgba(9,15,24,.18); }
  .hour .emoji { font-size: 18px; }
  button { border: 0; border-radius: 8px; padding: 8px 14px; font: inherit; font-weight: 600;
           background: #5b5fc7; color: #fff; cursor: pointer; }
  .night button { background: #f0c96d; color: #1b1a19; }
  button:disabled { opacity: 0.6; cursor: default; }
  .footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .unit-toggle { display: inline-flex; gap: 2px; padding: 2px; border-radius: 999px; background: rgba(255,255,255,.3); }
  .night .unit-toggle, .weather-storm .unit-toggle, .weather-heavy-rain .unit-toggle, .weather-hail .unit-toggle { background: rgba(9,15,24,.26); }
  .unit-toggle button { padding: 4px 10px; border-radius: 999px; background: transparent; color: inherit; font-size: 12px; opacity: .7; }
  .unit-toggle button[aria-pressed="true"] { background: #5b5fc7; color: #fff; opacity: 1; }
  .night .unit-toggle button[aria-pressed="true"] { background: #f0c96d; color: #1b1a19; }
  .status { margin-top: 8px; font-size: 12px; min-height: 16px; opacity: 0.7; }
  @media (max-width: 440px) {
    .sun-times { white-space: normal; }
  }
  @media (max-width: 320px) {
    .head { flex-direction: column; gap: 8px; }
    .loc, .cond { overflow-wrap: anywhere; }
    .current { margin-left: 0; text-align: left; }
    .footer { flex-wrap: wrap; }
  }
  @media (prefers-reduced-motion: reduce) {
    .badge.live .dot, .star, .sun-core, .sun-rays, .clouds span, .drop, .showers-rain, .flake,
    .ice-pellet, .fog span, .gust, .lightning, .bolt, .cloud-track, .petal, .leaf, .mote, .firefly,
    .sparkle, .season-gust, .wind-chip .wind-arrow { animation: none; }
    .bolt { opacity: 1; }
  }
</style>
</head>
<body>
<div id="root">Loading weather…</div>
<script>
(function () {
  var PROTOCOL_VERSION = '2026-01-26';
  var AUTO_REFRESH_MS = 60 * 1000;
  var pending = {};
  var nextId = 1;
  var autoRefreshTimer = null;

  // Negotiated during the ui/initialize handshake, mirroring the ext-apps client.
  var hostInfo = null;
  var hostCapabilities = null;
  var hostContext = null;

  // What the widget echoes back on Refresh so the bot re-fetches the SAME place.
  // \`currentQuery\` is the canonical lookup (may include a country/region, e.g.
  // "Paris, France") that disambiguates same-named cities; \`currentLabel\` is the
  // short city name shown in the status line.
  var currentQuery = 'Seattle';
  var currentLabel = 'Seattle';
  // Temperature unit toggle ('F' or 'C'); persists across refresh re-renders.
  var unit = 'F';

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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function formatClock(localIso) {
    var match = /T(\\d{2}):(\\d{2})/.exec(String(localIso || ''));
    if (!match) return 'Unavailable';
    var hour = Number(match[1]);
    var suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return hour + ':' + match[2] + ' ' + suffix;
  }

  function convertTemp(tempF) {
    var n = Number(tempF);
    if (!isFinite(n)) return tempF;
    return unit === 'C' ? Math.round((n - 32) * 5 / 9) : Math.round(n);
  }

  // Re-label temps in place on toggle so the animated scene isn't rebuilt.
  function applyUnit() {
    var main = document.querySelector('.temp-val');
    if (main) main.textContent = convertTemp(main.getAttribute('data-f')) + '\\u00B0' + unit;
    var cells = document.querySelectorAll('.h-temp');
    for (var i = 0; i < cells.length; i++) {
      cells[i].textContent = convertTemp(cells[i].getAttribute('data-f')) + '\\u00B0';
    }
    var uc = document.getElementById('unitC');
    var uf = document.getElementById('unitF');
    if (uc) uc.setAttribute('aria-pressed', unit === 'C' ? 'true' : 'false');
    if (uf) uf.setAttribute('aria-pressed', unit === 'F' ? 'true' : 'false');
    var chip = document.querySelector('.wind-chip');
    if (chip) chip.outerHTML = windChip(chip.getAttribute('data-mph'), chip.getAttribute('data-gust'), chip.getAttribute('data-deg'));
  }

  var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

  // Wind speed follows the unit toggle: mph with °F, km/h with °C.
  function windSpeedText(mph, bare) {
    var value = unit === 'C' ? Math.round(mph * 1.609344) : Math.round(mph);
    return bare ? String(value) : value + (unit === 'C' ? ' km/h' : ' mph');
  }

  function windChip(mph, gustMph, fromDeg) {
    var speed = Math.max(0, Math.round(Number(mph) || 0));
    var gust = Math.max(0, Math.round(Number(gustMph) || 0));
    var deg = ((Math.round(Number(fromDeg) || 0) % 360) + 360) % 360;
    var wind = windProfile(speed, deg);
    var from = COMPASS[Math.round(deg / 22.5) % 16];
    var gusty = gust >= speed + 8;
    var summary = speed < 1 ? 'Wind calm'
      : wind.label + ' \u00B7 ' + windSpeedText(speed) + ' from ' + from + (gusty ? ', gusts ' + windSpeedText(gust) : '');
    // The arrow points downwind (where the air is heading), i.e. opposite the "from" bearing.
    var body = speed < 1 ? 'Wind calm'
      : '<svg class="wind-arrow" viewBox="0 0 12 12" style="--wind-to:' + ((deg + 180) % 360) + 'deg"><path d="M6 .8 10.4 10.8 6 8.3 1.6 10.8Z"/></svg>' +
        '<span>' + windSpeedText(speed) + ' ' + from + '</span>' +
        (gusty ? '<span class="wind-gust">\u00B7 gusts ' + windSpeedText(gust, true) + '</span>' : '');
    return '<span class="wind-chip wind-' + wind.level + '" role="img" title="' + summary + '" aria-label="' + summary + '"' +
      ' data-mph="' + speed + '" data-gust="' + gust + '" data-deg="' + deg + '">' + body + '</span>';
  }

  function visualState(condition) {
    var value = String(condition || '').toLowerCase();
    if (value.indexOf('hail') >= 0) return 'hail';
    if (value.indexOf('thunder') >= 0 || value.indexOf('violent') >= 0) return 'storm';
    if (value.indexOf('freezing') >= 0) return 'sleet';
    if (value.indexOf('heavy snow') >= 0) return 'heavy-snow';
    if (value.indexOf('snow') >= 0) return 'snow';
    if (value.indexOf('drizzle') >= 0) return 'drizzle';
    if (value.indexOf('shower') >= 0) return 'showers';
    if (value.indexOf('heavy rain') >= 0) return 'heavy-rain';
    if (value.indexOf('rain') >= 0) return 'rain';
    if (value.indexOf('fog') >= 0) return 'fog';
    if (value.indexOf('partly') >= 0) return 'partly';
    if (value.indexOf('cloud') >= 0 || value.indexOf('overcast') >= 0) return 'cloudy';
    return 'clear';
  }

  function reportSize() {
    var height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    notify('ui/notifications/size-changed', { height: height });
  }
  if (window.ResizeObserver) new ResizeObserver(reportSize).observe(document.body);

  function rnd(min, max) { return min + Math.random() * (max - min); }

  // Wind blows FROM fromDeg; with east on the card's right, westerlies push particles right.
  function windProfile(mph, fromDeg) {
    var speed = Math.max(0, Number(mph) || 0);
    var level = speed < 5 ? 'calm' : speed < 15 ? 'light' : speed < 25 ? 'breezy' : speed < 40 ? 'windy' : 'gale';
    var dir = Math.sin((Number(fromDeg) || 0) * Math.PI / 180) > 0.05 ? -1 : 1;
    var rainDx = dir * Math.round(Math.min(150, 4 + speed * 3));
    return {
      speed: speed,
      level: level,
      label: { calm: 'Calm', light: 'Light breeze', breezy: 'Breezy', windy: 'Windy', gale: 'Gale' }[level],
      dir: dir,
      rainDx: rainDx,
      rainTilt: Math.round(-Math.atan2(rainDx, 340) * 180 / Math.PI),
      driftDx: dir * Math.round(Math.min(460, 24 + speed * 9)),
      // Seasonal bits (petals, leaves, motes, glints) lean only gently with the wind.
      seasonDx: dir * Math.round(Math.min(150, 12 + speed * 3.5)),
      gusts: { calm: 0, light: 3, breezy: 6, windy: 10, gale: 15 }[level]
    };
  }

  // Start particles upwind so a sideways drift still covers the whole card.
  function upwind(dx) {
    var extra = Math.min(80, Math.abs(dx) / 3.2);
    return dx < 0 ? [0, 100 + extra] : [-extra, 100];
  }

  // Light air: puffs bob in place (placed right so text stays clear). Breezy+: they sail across with the wind.
  function cloudPuffs(wind, isDense) {
    var out = '';
    if (wind.speed < 15) {
      var speeds = wind.level === 'calm' ? [26, 32, 38, 29] : [16, 20, 24, 18];
      var presets = [
        'top:4%;left:44%;width:120px;height:34px;animation-duration:' + speeds[0] + 's',
        'top:24%;left:62%;width:92px;height:26px;animation-duration:' + speeds[1] + 's;animation-direction:alternate-reverse',
        'top:0%;left:73%;width:74px;height:22px;animation-duration:' + speeds[2] + 's'
      ];
      if (isDense) presets.push('top:14%;left:31%;width:105px;height:29px;animation-duration:' + speeds[3] + 's');
      for (var i = 0; i < presets.length; i++) { out += '<span style="' + presets[i] + '"></span>'; }
      return out;
    }
    var crossing = Math.max(8, 700 / wind.speed);
    var sails = isDense ? 7 : 4;
    for (var c = 0; c < sails; c++) {
      out += '<div class="cloud-track" style="animation-duration:' + crossing.toFixed(1) + 's;animation-delay:-' +
        (crossing * (c + rnd(0, .6)) / sails).toFixed(2) + 's"><span style="top:' + rnd(0, 26).toFixed(0) + '%;left:' +
        rnd(10, 60).toFixed(0) + '%;width:' + rnd(74, 124).toFixed(0) + 'px;height:' + rnd(22, 34).toFixed(0) + 'px"></span></div>';
    }
    return out;
  }

  function fallingBits(kind, count, wind, minSize, maxSize, colors) {
    var span = upwind(wind.seasonDx);
    var pace = Math.max(5.5, 9 - wind.speed * .08);
    var out = '';
    for (var i = 0; i < count; i++) {
      var size = rnd(minSize, maxSize);
      var dur = rnd(pace * .8, pace * 1.3);
      out += '<i class="' + kind + (i % 2 ? ' flip' : '') + '" style="left:' + rnd(span[0], span[1]).toFixed(1) + '%;width:' +
        size.toFixed(1) + 'px;height:' + (size * .8).toFixed(1) + 'px;background-color:' + colors[i % colors.length] +
        ';animation-duration:' + dur.toFixed(2) + 's;animation-delay:-' + rnd(0, dur).toFixed(2) + 's"></i>';
    }
    return out;
  }

  // Spring petals, summer motes (day) or fireflies (night), autumn leaves, winter frost glints (day).
  function seasonParticles(season, isNight, wind, isFreezing) {
    var kind = '';
    var out = '';
    var i;
    if (season === 'spring') {
      kind = 'petals';
      out = fallingBits('petal', isNight ? 7 : 12, wind, 7, 11, ['#ffb3cc', '#ff9dbd', '#ffc8da', '#f58cb0']);
    } else if (season === 'autumn') {
      kind = 'leaves';
      out = fallingBits('leaf', 11 + (wind.speed >= 25 ? 6 : 0), wind, 8, 13, ['#d9531e', '#e89530', '#b83e1c', '#f2b642', '#9a5a2c']);
    } else if (season === 'summer' && isNight) {
      kind = 'fireflies';
      for (i = 0; i < 10; i++) {
        out += '<i class="firefly" style="left:' + rnd(6, 94).toFixed(1) + '%;top:' + rnd(40, 92).toFixed(1) +
          '%;animation-duration:' + rnd(6, 10).toFixed(2) + 's,' + rnd(1.8, 3.4).toFixed(2) + 's;animation-delay:-' +
          rnd(0, 10).toFixed(2) + 's,-' + rnd(0, 3.4).toFixed(2) + 's"></i>';
      }
    } else if (season === 'summer') {
      kind = 'motes';
      var span = upwind(wind.seasonDx);
      var pace = Math.max(5, 8 - wind.speed * .08);
      for (i = 0; i < 12; i++) {
        var ms = rnd(3, 5).toFixed(1);
        var md = rnd(pace * .8, pace * 1.3);
        out += '<i class="mote" style="left:' + rnd(span[0], span[1]).toFixed(1) + '%;top:' + rnd(28, 94).toFixed(1) +
          '%;width:' + ms + 'px;height:' + ms + 'px;animation-duration:' + md.toFixed(2) + 's;animation-delay:-' +
          rnd(0, md).toFixed(2) + 's"></i>';
      }
    } else if (season === 'winter' && isFreezing && !isNight) {
      kind = 'sparkles';
      for (i = 0; i < 8; i++) {
        out += '<i class="sparkle" style="left:' + rnd(4, 96).toFixed(1) + '%;top:' + rnd(6, 90).toFixed(1) +
          '%;animation-duration:' + rnd(2.4, 4.2).toFixed(2) + 's;animation-delay:-' + rnd(0, 4.2).toFixed(2) + 's"></i>';
      }
    }
    if (!kind) return '';
    if (wind.speed < 5) return '<div class="layer ' + kind + '">' + out + '</div>';
    // Gusts periodically push the whole field a little further downwind.
    return '<div class="layer ' + kind + ' season-gust" style="--season-gust:' + wind.dir * Math.round(Math.min(24, wind.speed * .6)) +
      'px;animation-duration:' + Math.max(2.5, 7 - wind.speed * .1).toFixed(1) + 's">' + out + '</div>';
  }

  // Build only the particle layers the current weather, wind, and season need, with
  // randomized positions/timing so no two renders look identical.
  function buildScene(state, isNight, wind, season, tempF) {
    var layers = [];
    // Seasonal accents only decorate clear skies (day or night).
    if (state !== 'clear' || ['spring', 'summer', 'autumn', 'winter'].indexOf(season) < 0) season = '';
    var isFreezing = season === 'winter' && tempF <= 40;
    if (season) layers.push('<div class="layer season-tint"></div>');
    if (isNight && (state === 'clear' || state === 'partly' || state === 'cloudy')) {
      var starCount = state === 'clear' ? 34 : state === 'partly' ? 22 : 15;
      var stars = '';
      for (var s = 0; s < starCount; s++) {
        var sz = rnd(1.5, 3).toFixed(1);
        stars += '<i class="star" style="left:' + rnd(3, 97).toFixed(1) + '%;top:' + rnd(4, 66).toFixed(1) +
          '%;width:' + sz + 'px;height:' + sz + 'px;animation-duration:' + rnd(2.2, 5).toFixed(2) +
          's;animation-delay:-' + rnd(0, 5).toFixed(2) + 's"></i>';
      }
      layers.push('<div class="layer moon-glow"></div>');
      layers.push('<div class="layer stars">' + stars + '</div>');
    }
    if (!isNight && (state === 'clear' || state === 'partly')) {
      layers.push('<div class="sun"><span class="sun-rays"></span><span class="sun-core"></span></div>');
    }
    if (state !== 'clear' && state !== 'fog') {
      var denseClouds = ['cloudy', 'heavy-rain', 'heavy-snow', 'storm', 'hail'].indexOf(state) >= 0;
      layers.push('<div class="layer clouds">' + cloudPuffs(wind, denseClouds) + '</div>');
    }
    var wetStates = ['drizzle', 'rain', 'heavy-rain', 'showers', 'sleet', 'storm', 'hail'];
    if (wetStates.indexOf(state) >= 0) {
      var dropCounts = { drizzle: 18, rain: 38, 'heavy-rain': 64, showers: 34, sleet: 24, storm: 48, hail: 36 };
      var dropCount = dropCounts[state];
      var dropMin = state === 'drizzle' ? 1.1 : state === 'heavy-rain' ? .34 : .5;
      var dropMax = state === 'drizzle' ? 1.75 : state === 'heavy-rain' ? .56 : .85;
      var dropHeightMin = state === 'drizzle' ? 7 : 12;
      var dropHeightMax = state === 'drizzle' ? 12 : 20;
      var rainSpan = upwind(wind.rainDx);
      var drops = '';
      for (var d = 0; d < dropCount; d++) {
        drops += '<i class="drop" style="left:' + rnd(rainSpan[0], rainSpan[1]).toFixed(1) + '%;height:' + rnd(dropHeightMin, dropHeightMax).toFixed(0) +
          'px;animation-duration:' + rnd(dropMin, dropMax).toFixed(2) + 's;animation-delay:-' + rnd(0, dropMax).toFixed(2) + 's"></i>';
      }
      layers.push('<div class="layer rain' + (state === 'showers' ? ' showers-rain' : '') + '">' + drops + '</div>');
    }
    if (state === 'snow' || state === 'heavy-snow') {
      var flakeCount = state === 'heavy-snow' ? 52 : 30;
      var snowSpan = upwind(wind.driftDx * .6);
      var flakes = '';
      for (var f = 0; f < flakeCount; f++) {
        var fs = rnd(state === 'heavy-snow' ? 4 : 3, state === 'heavy-snow' ? 8 : 6).toFixed(1);
        flakes += '<i class="flake" style="left:' + rnd(snowSpan[0], snowSpan[1]).toFixed(1) + '%;width:' + fs + 'px;height:' + fs +
          'px;animation-duration:' + rnd(3.5, 6.5).toFixed(2) + 's;animation-delay:-' + rnd(0, 6).toFixed(2) + 's"></i>';
      }
      layers.push('<div class="layer snow">' + flakes + '</div>');
    }
    if (state === 'sleet' || state === 'hail') {
      var pelletCount = state === 'hail' ? 30 : 18;
      var iceSpan = upwind(wind.rainDx);
      var pellets = '';
      for (var p = 0; p < pelletCount; p++) {
        var ps = rnd(state === 'hail' ? 4 : 2, state === 'hail' ? 7 : 4).toFixed(1);
        pellets += '<i class="ice-pellet" style="left:' + rnd(iceSpan[0], iceSpan[1]).toFixed(1) + '%;width:' + ps + 'px;height:' + ps +
          'px;animation-duration:' + rnd(.7, 1.25).toFixed(2) + 's;animation-delay:-' + rnd(0, 1.25).toFixed(2) + 's"></i>';
      }
      layers.push('<div class="layer ice">' + pellets + '</div>');
    }
    if (state === 'fog') {
      var fogPace = Math.max(.35, 1 - wind.speed / 40);
      var banks = '';
      [11, 15, 13].forEach(function (secs) { banks += '<span style="animation-duration:' + (secs * fogPace).toFixed(1) + 's"></span>'; });
      layers.push('<div class="layer fog">' + banks + '</div>');
    }
    layers.push(seasonParticles(season, isNight, wind, isFreezing));
    if (wind.gusts) {
      var gustPace = Math.max(.8, 5.4 - wind.speed * .11);
      var gusts = '';
      for (var g = 0; g < wind.gusts; g++) {
        var gd = rnd(gustPace * .8, gustPace * 1.25);
        gusts += '<i class="gust" style="top:' + rnd(6, 90).toFixed(1) + '%;height:' + (wind.speed >= 25 && g % 3 === 0 ? 2 : 1) +
          'px;animation-duration:' + gd.toFixed(2) + 's;animation-delay:-' + rnd(0, gd).toFixed(2) + 's"></i>';
      }
      layers.push('<div class="layer wind">' + gusts + '</div>');
    }
    if (state === 'storm' || state === 'hail') {
      layers.push('<div class="layer lightning"></div><div class="layer"><span class="bolt">&#x26A1;</span></div>');
    }
    if (isFreezing) layers.push('<div class="layer frost"></div>');
    var windVars = '--rain-dx:' + wind.rainDx + 'px;--rain-tilt:' + wind.rainTilt + 'deg;--drift-dx:' + wind.driftDx + 'px' +
      (season ? ';--season-dx:' + wind.seasonDx + 'px' : '');
    return '<div class="weather-scene' + (season ? ' season-' + season : '') + (wind.dir < 0 ? ' wind-to-left' : '') +
      '" style="' + windVars + '" aria-hidden="true">' + layers.join('') + '</div>';
  }

  function render(snapshot) {
    var root = document.getElementById('root');
    if (!snapshot || !snapshot.location) { root.textContent = 'No weather data.'; reportSize(); return; }
    if (snapshot.query) { currentQuery = snapshot.query; }
    if (snapshot.city) { currentLabel = snapshot.city; }
    var forecastHours = snapshot.hourly || [];
    var hourly = forecastHours.map(function (h) {
      return '<div class="hour"><span>' + escapeHtml(h.label) + '</span>' +
             '<span class="emoji">' + escapeHtml(h.emoji) + '</span>' +
             '<span class="h-temp" data-f="' + escapeHtml(h.tempF) + '">' + escapeHtml(convertTemp(h.tempF)) + '\\u00B0</span></div>';
    }).join('');
    var forecast = forecastHours.length
      ? '<section class="forecast" aria-label="Hourly forecast"><div class="forecast-title">Next ' +
        escapeHtml(forecastHours.length) + ' hours</div><div class="hours">' + hourly + '</div></section>'
      : '';
    var badge = snapshot.live
      ? '<span class="badge live"><span class="dot"></span>LIVE</span>'
      : '<span class="badge est"><span class="dot"></span>SAMPLE DATA</span>';
    var moon = snapshot.moonPhase || {};
    var isNight = snapshot.isDay === false;
    var state = visualState(snapshot.condition);
    var wind = windProfile(snapshot.windSpeedMph, snapshot.windDirectionDeg);
    var moonTooltip = moon.name || 'Moon phase';
    if (typeof moon.illumination === 'number') moonTooltip += ', ' + moon.illumination + '% illuminated';
    var iconTitle = isNight && snapshot.emoji === moon.emoji ? ' title="' + escapeHtml(moonTooltip) + '"' : '';
    var extraMoon = isNight && moon.emoji && snapshot.emoji !== moon.emoji
      ? '<span class="moon-phase" title="' + escapeHtml(moonTooltip) + '">' + escapeHtml(moon.emoji) + '</span>'
      : '';
    var sunrise = formatClock(snapshot.sunrise);
    var sunset = formatClock(snapshot.sunset);
    var scene = buildScene(state, isNight, wind, snapshot.season, Number(snapshot.tempF));
    root.innerHTML =
      '<div class="card ' + (isNight ? 'night' : 'day') + ' weather-' + state + '">' + scene +
        '<div class="weather-content">' +
          '<div class="head">' +
            '<div><div class="loc">' + escapeHtml(snapshot.location) + '</div>' +
            '<div class="cond">' + escapeHtml(snapshot.condition) + '</div>' + badge + '</div>' +
            '<div class="current"><div class="temp"><span class="current-icon"' + iconTitle + '>' + escapeHtml(snapshot.emoji) +
              '</span> <span class="temp-val" data-f="' + escapeHtml(snapshot.tempF) + '">' + escapeHtml(convertTemp(snapshot.tempF)) + '\\u00B0' + unit + '</span>' + extraMoon + '</div>' +
              '<div class="sun-times" aria-label="Sunrise ' + escapeHtml(sunrise) + ', sunset ' + escapeHtml(sunset) + '">' +
                '<span>Sunrise ' + escapeHtml(sunrise) + '</span><span class="sep">&middot;</span><span>Sunset ' + escapeHtml(sunset) + '</span>' +
              '</div>' +
              windChip(snapshot.windSpeedMph, snapshot.windGustMph, snapshot.windDirectionDeg) +
            '</div>' +
          '</div>' +
          forecast +
          '<div class="footer">' +
            '<button id="refresh">&#x21BB; Refresh</button>' +
            '<div class="unit-toggle" role="group" aria-label="Units (temperature and wind speed)">' +
              '<button id="unitC" type="button" aria-pressed="' + (unit === 'C' ? 'true' : 'false') + '">\\u00B0C</button>' +
              '<button id="unitF" type="button" aria-pressed="' + (unit === 'F' ? 'true' : 'false') + '">\\u00B0F</button>' +
            '</div>' +
          '</div>' +
          '<div id="status" class="status"></div>' +
        '</div>' +
      '</div>';
    document.getElementById('refresh').addEventListener('click', onRefresh);
    var unitC = document.getElementById('unitC');
    var unitF = document.getElementById('unitF');
    if (unitC) unitC.addEventListener('click', function () { if (unit !== 'C') { unit = 'C'; applyUnit(); } });
    if (unitF) unitF.addEventListener('click', function () { if (unit !== 'F') { unit = 'F'; applyUnit(); } });
    reportSize();
    startAutoRefresh();
  }

  function startAutoRefresh() {
    if (autoRefreshTimer !== null) return;
    onRefresh();
    autoRefreshTimer = setInterval(onRefresh, AUTO_REFRESH_MS);
  }

  function onRefresh() {
    var btn = document.getElementById('refresh');
    var status = document.getElementById('status');
    btn.disabled = true;
    status.textContent = 'Fetching live weather for ' + currentLabel + '…';
    reportSize();
    callTool('getWeather', { city: currentQuery }).then(function (result) {
      // result is an MCP CallToolResult { content, structuredContent }.
      var snap = result && (result.structuredContent || result);
      if (snap && snap.location) {
        render(snap);
        document.getElementById('status').textContent =
          snap.live ? 'Updated with live data \\u2713' : 'Live service unavailable \\u2014 showing sample data';
        reportSize();
      } else { status.textContent = 'Tool returned no snapshot.'; btn.disabled = false; reportSize(); }
    }).catch(function (e) {
      status.textContent = 'calltool failed: ' + (e && e.message ? e.message : e);
      btn.disabled = false;
      reportSize();
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
    // tool-input / host-context-changed are ignored in this minimal demo.
  });

  window.addEventListener('resize', reportSize);

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
