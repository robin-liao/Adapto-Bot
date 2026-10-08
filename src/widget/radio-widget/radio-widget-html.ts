export const RADIO_WIDGET_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    color-scheme: light;
    --paper: #ffffff;
    --paper-strong: #ffffff;
    --ink: #242424;
    --muted: #616161;
    --line: #e0e0e0;
    --violet: #5b5fc7;
    --cyan: #038387;
    --coral: #c4314b;
    --gold: #986f0b;
    --green: #107c10;
    --brand-soft: #e9eaf6;
    --canvas: #f5f5f5;
    --shadow: rgba(0, 0, 0, 0.12);
    --cover: #f5f5fa;
    --skeleton: #ebebf2;
  }
  [data-theme="dark"] {
    color-scheme: dark;
    --paper: #292929;
    --paper-strong: #333333;
    --ink: #ffffff;
    --muted: #d1d1d1;
    --line: #525252;
    --violet: #a6a7dc;
    --cyan: #58d3d8;
    --coral: #f08a9a;
    --gold: #f3d070;
    --green: #54b054;
    --brand-soft: #383966;
    --canvas: #1f1f1f;
    --shadow: rgba(0, 0, 0, 0.4);
    --cover: #eeeef5;
    --skeleton: #3b3b44;
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  html, body { margin: 0; min-width: 0; }
  body {
    overflow-x: hidden;
    color: var(--ink);
    background: transparent;
    font-family: 'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
  }
  button, input, select { margin: 0; color: inherit; font: inherit; }
  button, select { cursor: pointer; }
  button:focus-visible, select:focus-visible { outline: 2px solid var(--violet); outline-offset: 2px; }
  svg { display: block; flex: none; }
  .app {
    position: relative;
    width: 100%;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--canvas);
  }
  .app::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    z-index: 2;
    height: 3px;
    background: var(--flag, var(--violet));
  }
  .masthead { border-bottom: 1px solid var(--line); background: var(--paper); }
  .stage {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    padding: 18px 20px 30px;
    --c1: var(--violet);
    --c2: var(--cyan);
    --c3: #d83b8d;
  }
  .stage[data-scene="jazz"] { --c1: #c98a1b; --c2: #7a3e9d; --c3: #e0b04a; }
  .stage[data-scene="classical"] { --c1: #b08d3c; --c2: #8c2f39; --c3: #d4b56a; }
  .stage[data-scene="rock"] { --c1: #e0352b; --c2: #3d3d52; --c3: #ff8a3d; }
  .stage[data-scene="pop"] { --c1: #ff4f9a; --c2: #7c5cff; --c3: #22c1dc; }
  .stage[data-scene="electronic"] { --c1: #7c3aed; --c2: #06b6d4; --c3: #ec4899; }
  .stage[data-scene="hiphop"] { --c1: #f2a93b; --c2: #6d28d9; --c3: #ef5a3a; }
  .stage[data-scene="soul"] { --c1: #c2338a; --c2: #6b46c1; --c3: #f08bb3; }
  .stage[data-scene="latin"] { --c1: #ff6b35; --c2: #f7b928; --c3: #e0245e; }
  .stage[data-scene="reggae"] { --c1: #1f9d55; --c2: #f4c20d; --c3: #d62828; }
  .stage[data-scene="chill"] { --c1: #2bb3a3; --c2: #8b7cf6; --c3: #6ec6ff; }
  .stage[data-scene="folk"] { --c1: #5a9e4b; --c2: #d9a441; --c3: #8b5e3c; }
  .stage[data-scene="world"] { --c1: #0f9d9a; --c2: #5b5fc7; --c3: #f59e0b; }
  .stage[data-scene="broadcast"] { --c1: #2563eb; --c2: #5b5fc7; --c3: #0ea5e9; }
  .scene {
    position: absolute;
    inset: 0;
    z-index: -2;
    overflow: hidden;
    pointer-events: none;
    background:
      radial-gradient(120% 160% at 100% 0%, color-mix(in srgb, var(--c1) 24%, transparent), transparent 62%),
      linear-gradient(135deg, color-mix(in srgb, var(--c1) 12%, var(--paper)) 0%, var(--paper) 55%, color-mix(in srgb, var(--c2) 12%, var(--paper)) 100%);
  }
  .scene.scene-in { animation: scene-in 700ms ease; }
  .scene::after {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0;
    background-image:
      linear-gradient(color-mix(in srgb, var(--violet) 8%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in srgb, var(--violet) 8%, transparent) 1px, transparent 1px);
    background-size: 22px 22px;
    -webkit-mask-image: linear-gradient(to bottom, #000, transparent 85%);
    mask-image: linear-gradient(to bottom, #000, transparent 85%);
  }
  .stage[data-scene="waves"] .scene::after { opacity: 1; }
  .layers {
    position: absolute;
    inset: 0;
    -webkit-mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6) 42%, #000 74%);
    mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6) 42%, #000 74%);
  }
  .aura {
    position: absolute;
    top: -16px;
    right: 0;
    left: 0;
    height: 40px;
    background: var(--flag-glow, none);
    background-size: 200% 100%;
    filter: blur(14px);
    opacity: 0.4;
    animation: shimmer-text 18s linear infinite;
  }
  .app:not([data-flag]) .aura { display: none; }
  .orb { position: absolute; aspect-ratio: 1; border-radius: 50%; filter: blur(26px); opacity: 0.38; animation: orb-float 16s ease-in-out infinite alternate; }
  .o1 { top: -70%; right: -8%; width: 40%; background: var(--c1); }
  .o2 { bottom: -90%; left: 28%; width: 36%; background: var(--c2); opacity: 0.26; animation-delay: -6s; }
  .o3 { top: 20%; right: 30%; width: 16%; background: var(--c3); opacity: 0.22; animation-delay: -11s; }
  .stage[data-scene="pop"] .orb { opacity: 0.32; animation-name: bounce-orb; animation-duration: 4.5s; }
  .stage[data-scene="soul"] .o3 { width: 26%; opacity: 0.3; }
  .stage[data-scene="electronic"] .orb { animation: beat 0.5s ease-in-out infinite alternate; }
  .stage[data-scene="chill"] .orb { right: -10%; left: auto; width: 75%; height: 40px; aspect-ratio: auto; border-radius: 45%; filter: blur(16px); opacity: 0.42; animation: aurora 11s ease-in-out infinite alternate; }
  .stage[data-scene="chill"] .o1 { top: 16%; }
  .stage[data-scene="chill"] .o2 { top: 40%; bottom: auto; animation-delay: -4s; }
  .stage[data-scene="chill"] .o3 { top: 64%; animation-delay: -8s; }
  .beam {
    display: none;
    position: absolute;
    top: -12%;
    width: 24%;
    height: 150%;
    clip-path: polygon(45% 0, 55% 0, 100% 100%, 0 100%);
    background: linear-gradient(to bottom, color-mix(in srgb, var(--bc, var(--c1)) 42%, transparent), transparent 78%);
    transform-origin: 50% 0;
    animation: sweep 3.6s ease-in-out infinite alternate;
  }
  .b1 { right: 2%; }
  .b2 { right: 22%; --bc: var(--c3); animation-duration: 4.4s; animation-delay: -1.2s; animation-direction: alternate-reverse; }
  .b3 { right: 42%; animation-duration: 5.2s; animation-delay: -2.4s; }
  .stage[data-scene="rock"] .beam { display: block; }
  .stage[data-scene="jazz"] .b1 { display: block; right: 18%; width: 34%; --bc: var(--c3); transform: rotate(18deg); animation: glow-beam 6s ease-in-out infinite alternate; }
  .sun {
    display: none;
    position: absolute;
    top: 14px;
    right: 6%;
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--c2) 85%, #fff) 0 44%, color-mix(in srgb, var(--c2) 45%, transparent) 46%, transparent 70%);
  }
  .sun::before {
    content: '';
    position: absolute;
    inset: -75%;
    border-radius: 50%;
    background: repeating-conic-gradient(color-mix(in srgb, var(--c2) 42%, transparent) 0 7deg, transparent 7deg 20deg);
    -webkit-mask-image: radial-gradient(circle, transparent 24%, #000 28%, transparent 70%);
    mask-image: radial-gradient(circle, transparent 24%, #000 28%, transparent 70%);
    animation: spin 40s linear infinite;
  }
  .stage[data-scene="latin"] .sun, .stage[data-scene="reggae"] .sun { display: block; }
  .stage[data-scene="folk"] .sun { display: block; animation: sun-glow 5s ease-in-out infinite alternate; }
  .stage[data-scene="folk"] .sun::before, .stage[data-scene="electronic"] .sun::before { display: none; }
  .stage[data-scene="electronic"] .sun {
    display: block;
    top: 8px;
    right: 21%;
    width: 76px;
    height: 76px;
    background: linear-gradient(to bottom, #ffd166, var(--c3) 75%);
    -webkit-mask-image: linear-gradient(#000 50%, transparent 50%), repeating-linear-gradient(#000 0 5px, transparent 5px 9px);
    mask-image: linear-gradient(#000 50%, transparent 50%), repeating-linear-gradient(#000 0 5px, transparent 5px 9px);
  }
  .floor {
    display: none;
    position: absolute;
    right: -12%;
    bottom: -6%;
    width: 84%;
    height: 62%;
    background-image:
      linear-gradient(color-mix(in srgb, var(--c2) 65%, transparent) 1.5px, transparent 1.5px),
      linear-gradient(90deg, color-mix(in srgb, var(--c2) 65%, transparent) 1.5px, transparent 1.5px);
    background-size: 34px 20px;
    transform: perspective(110px) rotateX(56deg);
    transform-origin: 50% 100%;
    -webkit-mask-image: linear-gradient(to top, #000 25%, transparent 92%);
    mask-image: linear-gradient(to top, #000 25%, transparent 92%);
    animation: floor-run 1.1s linear infinite;
  }
  .stage[data-scene="electronic"] .floor { display: block; }
  .scene-art { position: absolute; inset: 0; width: 100%; height: 100%; }
  .scene-art > g { display: none; }
  .stage[data-scene="waves"] .g-waves,
  .stage[data-scene="jazz"] .g-smoke,
  .stage[data-scene="classical"] .g-staff,
  .stage[data-scene="rock"] .g-crowd,
  .stage[data-scene="hiphop"] .g-skyline,
  .stage[data-scene="hiphop"] .g-speaker,
  .stage[data-scene="soul"] .g-ribbons,
  .stage[data-scene="latin"] .g-pennants,
  .stage[data-scene="reggae"] .g-sea,
  .stage[data-scene="reggae"] .g-palm,
  .stage[data-scene="folk"] .g-hills,
  .stage[data-scene="world"] .g-globe,
  .stage[data-scene="broadcast"] .g-tower { display: inline; }
  .wv, .rb, .sl { fill: none; stroke-linecap: round; }
  .wv { stroke: var(--c1); stroke-width: 2.4; opacity: 0.55; animation: drift 11s linear infinite; }
  .wv2 { stroke: var(--c2); stroke-width: 2; opacity: 0.4; animation-duration: 15s; animation-direction: reverse; }
  .wv3 { stroke: var(--c3); stroke-width: 2.8; opacity: 0.32; animation-duration: 19s; }
  .rb { stroke: var(--c1); stroke-width: 14; opacity: 0.26; filter: blur(5px); animation: drift 18s linear infinite; }
  .rb2 { stroke: var(--c2); animation-duration: 25s; animation-direction: reverse; }
  .sm { fill: none; stroke: var(--c3); stroke-width: 9; stroke-linecap: round; opacity: 0; filter: blur(4px); transform-box: fill-box; transform-origin: 50% 100%; animation: smoke 8s ease-out infinite; }
  .sm:nth-child(2) { animation-delay: -2.7s; }
  .sm:nth-child(3) { animation-delay: -5.4s; }
  .staff { stroke: var(--c1); stroke-width: 1.3; animation: drift 28s linear infinite; }
  .sl { opacity: 0.5; }
  .nb { color: var(--c2); fill: var(--c2); stroke: none; opacity: 0.7; }
  .g-crowd { color: color-mix(in srgb, var(--c2) 70%, #000); fill: currentColor; opacity: 0.3; }
  .g-crowd circle, .arm { transform-box: fill-box; transform-origin: 50% 100%; animation: bob 0.9s ease-in-out infinite alternate; }
  .g-crowd circle:nth-of-type(3n+2) { animation-delay: -0.3s; }
  .g-crowd circle:nth-of-type(3n) { animation-delay: -0.6s; }
  .arm { fill: none; stroke: currentColor; stroke-width: 6; stroke-linecap: round; animation-name: arm; animation-duration: 1.2s; }
  .bld { fill: color-mix(in srgb, var(--c2) 55%, #000); opacity: 0.28; }
  .win { fill: var(--c1); animation: blink-win 3.2s ease-in-out infinite; }
  .win:nth-of-type(2n) { animation-delay: -1.1s; }
  .win:nth-of-type(3n) { animation-delay: -2.2s; }
  .g-speaker { fill: none; stroke: var(--c1); }
  .cone { stroke-width: 3; opacity: 0.6; transform-origin: 548px 46px; animation: thump 0.5s ease-in-out infinite alternate; }
  .pulse, .bring { fill: none; stroke-width: 2; opacity: 0; transform-origin: 548px 46px; animation: pulse-out 2.1s ease-out infinite; }
  .pulse:nth-of-type(2), .bring:nth-of-type(2) { animation-delay: -0.7s; }
  .pulse:nth-of-type(3), .bring:nth-of-type(3) { animation-delay: -1.4s; }
  .string { fill: none; stroke: color-mix(in srgb, var(--c3) 50%, var(--ink)); stroke-width: 1.2; opacity: 0.45; }
  .pn { fill: var(--c1); opacity: 0.72; transform-box: fill-box; transform-origin: 50% 0; animation: sway 2.6s ease-in-out infinite alternate; }
  .pn:nth-of-type(3n+2) { fill: var(--c2); animation-delay: -0.9s; }
  .pn:nth-of-type(3n) { fill: var(--c3); animation-delay: -1.7s; }
  .se { fill: var(--c1); opacity: 0.24; animation: drift 16s linear infinite; }
  .se2 { fill: var(--c2); opacity: 0.3; animation-duration: 12s; animation-direction: reverse; }
  .se3 { fill: var(--c3); opacity: 0.22; animation-duration: 9s; }
  .g-palm { color: color-mix(in srgb, var(--c1) 60%, #000); opacity: 0.42; }
  .trunk { fill: none; stroke: currentColor; stroke-width: 7; stroke-linecap: round; }
  .fronds { fill: currentColor; transform-origin: 570px 78px; animation: fronds 4s ease-in-out infinite alternate; }
  .hl { fill: var(--c1); opacity: 0.18; animation: drift 60s linear infinite; }
  .hl2 { opacity: 0.26; animation-duration: 42s; }
  .hl3 { fill: var(--c2); opacity: 0.32; animation-duration: 28s; }
  .g-globe { fill: none; stroke: var(--c1); stroke-width: 1.6; opacity: 0.6; }
  .globe { fill: color-mix(in srgb, var(--c1) 10%, transparent); }
  .mer { transform-box: fill-box; transform-origin: center; animation: meridian 9s ease-in-out infinite; }
  .mer:nth-of-type(2) { animation-delay: -3s; }
  .mer:nth-of-type(3) { animation-delay: -6s; }
  .orbit { stroke: var(--c3); stroke-dasharray: 3 7; animation: dash 5s linear infinite; }
  .g-tower { color: var(--c1); }
  .mast { fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; opacity: 0.5; }
  .beacon { fill: var(--c3); animation: blink 1.4s ease-in-out infinite; }
  .bring { stroke: currentColor; }
  [data-theme="dark"] .bld, [data-theme="dark"] .g-crowd, [data-theme="dark"] .g-palm { opacity: 0.7; }
  .fx { position: absolute; inset: 0; opacity: 0; transition: opacity 600ms ease; }
  .app[data-state="live"] .fx { opacity: 1; }
  .fx i {
    --pc: var(--c1);
    display: none;
    position: absolute;
    top: var(--y);
    left: var(--x);
    width: calc(var(--s) * 10px);
    height: calc(var(--s) * 10px);
    border-radius: 50%;
    background: var(--pc);
    opacity: 0.5;
    animation: var(--fx, none) var(--fx-dur, 7s) ease-in-out var(--d, 0s) infinite;
  }
  .fx i:nth-child(3n+2) { --pc: var(--c2); }
  .fx i:nth-child(3n) { --pc: var(--c3); }
  .fx i:nth-child(1) { --x: 58%; --y: 64%; --s: 1.2; --d: -2.6s; }
  .fx i:nth-child(2) { --x: 88%; --y: 28%; --s: 0.8; --d: -1.3s; }
  .fx i:nth-child(3) { --x: 70%; --y: 20%; --s: 1; --d: -4.1s; }
  .fx i:nth-child(4) { --x: 94%; --y: 66%; --s: 1.3; --d: -0.6s; }
  .fx i:nth-child(5) { --x: 64%; --y: 38%; --s: 0.7; --d: -3.4s; }
  .fx i:nth-child(6) { --x: 80%; --y: 52%; --s: 1.1; --d: -5.2s; }
  .fx i:nth-child(7) { --x: 52%; --y: 22%; --s: 0.6; --d: -1.9s; }
  .fx i:nth-child(8) { --x: 76%; --y: 78%; --s: 0.9; --d: -4.7s; }
  .fx i:nth-child(9) { --x: 90%; --y: 10%; --s: 0.7; --d: -2.2s; }
  .fx i:nth-child(10) { --x: 46%; --y: 48%; --s: 0.8; --d: -5.8s; }
  .fx i:nth-child(11) { --x: 84%; --y: 88%; --s: 1; --d: -3s; }
  .fx i:nth-child(12) { --x: 72%; --y: 58%; --s: 0.6; --d: -0.2s; }
  .stage[data-scene="jazz"] .fx i, .stage[data-scene="soul"] .fx i {
    --fx: rise-soft;
    --fx-dur: 9s;
    display: block;
    width: calc(var(--s) * 18px);
    height: calc(var(--s) * 18px);
    background: radial-gradient(circle, color-mix(in srgb, var(--pc) 70%, transparent), transparent 70%);
  }
  .stage[data-scene="classical"] .fx i { --fx: twinkle-rot; --fx-dur: 3.2s; display: block; width: calc(var(--s) * 7px); height: calc(var(--s) * 7px); border-radius: 1px; }
  .stage[data-scene="rock"] .fx i { --fx: spark; --fx-dur: 2.2s; display: block; width: 4px; height: 4px; background: var(--c3); box-shadow: 0 0 6px var(--c3); }
  .stage[data-scene="pop"] .fx i {
    --fx: bubble;
    --fx-dur: 6s;
    display: block;
    width: calc(var(--s) * 20px);
    height: calc(var(--s) * 20px);
    border: 1.5px solid var(--pc);
    background: radial-gradient(circle at 32% 30%, rgba(255, 255, 255, 0.85) 0 16%, color-mix(in srgb, var(--pc) 22%, transparent) 18%);
  }
  .stage[data-scene="latin"] .fx i { --fx: confetti; --fx-dur: 5s; display: block; width: calc(var(--s) * 6px); height: calc(var(--s) * 10px); border-radius: 1px; }
  .stage[data-scene="chill"] .fx i { --fx: firefly; --fx-dur: 9s; display: block; width: 5px; height: 5px; box-shadow: 0 0 8px 2px color-mix(in srgb, var(--pc) 55%, transparent); }
  .stage[data-scene="folk"] .fx i { --fx: leaf; --fx-dur: 10s; display: block; width: calc(var(--s) * 10px); height: calc(var(--s) * 6px); border-radius: 0 100% 0 100%; }
  .app:not([data-state="live"]) .fx i,
  .app:not([data-state="live"]) .beam,
  .app:not([data-state="live"]) .floor,
  .app:not([data-state="live"]) .g-crowd circle,
  .app:not([data-state="live"]) .arm,
  .app:not([data-state="live"]) .cone,
  .app:not([data-state="live"]) .stage[data-scene="electronic"] .orb { animation-play-state: paused; }
  .app:not([data-state="live"]) .pulse, .app:not([data-state="live"]) .bring { visibility: hidden; }
  .browse { padding: 12px 20px 12px; }
  @keyframes scene-in { from { opacity: 0; } }
  @keyframes orb-float { to { transform: translate(-8%, 10%) scale(1.12); } }
  @keyframes bounce-orb { to { transform: translateY(-14%) scale(1.06); } }
  @keyframes beat { to { transform: scale(1.15); opacity: 0.55; } }
  @keyframes aurora { from { transform: translateX(-6%) rotate(-8deg) skewX(-14deg); } to { transform: translateX(6%) rotate(-3deg) skewX(12deg); } }
  @keyframes sweep { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
  @keyframes glow-beam { from { opacity: 0.35; } to { opacity: 0.75; } }
  @keyframes sun-glow { to { transform: scale(1.08); } }
  @keyframes floor-run { to { background-position: 0 20px; } }
  @keyframes drift { to { transform: translateX(-300px); } }
  @keyframes smoke { 0% { opacity: 0; transform: translateY(24px) scaleX(0.8); } 35% { opacity: 0.5; } 100% { opacity: 0; transform: translateY(-36px) scaleX(1.3); } }
  @keyframes bob { to { transform: translateY(-5px); } }
  @keyframes arm { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
  @keyframes blink-win { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.9; } }
  @keyframes thump { to { transform: scale(1.1); } }
  @keyframes pulse-out { 0% { opacity: 0.7; transform: scale(1); } 100% { opacity: 0; transform: scale(3.4); } }
  @keyframes sway { from { transform: rotate(-9deg); } to { transform: rotate(9deg); } }
  @keyframes fronds { from { transform: rotate(-4deg); } to { transform: rotate(5deg); } }
  @keyframes meridian { from { transform: scaleX(1); } to { transform: scaleX(-1); } }
  @keyframes dash { to { stroke-dashoffset: -100; } }
  @keyframes rise-soft { 0% { opacity: 0; transform: translateY(20px) scale(0.8); } 30% { opacity: 0.7; } 100% { opacity: 0; transform: translateY(-50px) scale(1.1); } }
  @keyframes twinkle-rot { 0%, 100% { opacity: 0.15; transform: rotate(45deg) scale(0.5); } 50% { opacity: 0.9; transform: rotate(45deg) scale(1.15); } }
  @keyframes spark { 0% { opacity: 0; transform: translateY(0); } 20% { opacity: 1; } 100% { opacity: 0; transform: translateY(30px); } }
  @keyframes bubble { 0% { opacity: 0; transform: translate(0, 30px) scale(0.6); } 20% { opacity: 0.9; } 50% { transform: translate(6px, -10px) scale(1); } 100% { opacity: 0; transform: translate(-4px, -60px) scale(1.1); } }
  @keyframes confetti { 0% { opacity: 0; transform: translateY(-40px) rotate(0); } 15% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(70px) rotate(540deg); } }
  @keyframes firefly { 0%, 100% { opacity: 0.2; transform: translate(0, 0); } 25% { opacity: 0.9; } 50% { opacity: 0.4; transform: translate(12px, -10px); } 75% { opacity: 0.9; transform: translate(-8px, -18px); } }
  @keyframes leaf { 0% { opacity: 0; transform: translate(-30px, -10px) rotate(0); } 20% { opacity: 0.8; } 100% { opacity: 0; transform: translate(60px, 30px) rotate(300deg); } }
  .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
  .logo-mark {
    display: grid;
    width: 26px;
    height: 26px;
    place-items: center;
    border-radius: 8px;
    background: linear-gradient(145deg, #7b83eb, #5b5fc7);
    box-shadow: 0 4px 10px rgba(91, 95, 199, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.38);
  }
  .logo-mark svg { width: 18px; height: 18px; }
  .app[data-state="live"] .logo-mark svg { animation: wave 900ms ease-in-out infinite alternate; }
  .logo-word {
    color: var(--violet);
    background: linear-gradient(90deg, var(--violet), var(--coral), var(--cyan), var(--violet));
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
    animation: shimmer-text 8s linear infinite;
  }
  .notes {
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    transition: opacity 600ms ease;
  }
  .app[data-state="live"] .notes { opacity: 1; }
  .notes i {
    position: absolute;
    bottom: -24px;
    left: 8%;
    color: var(--violet);
    font-size: 16px;
    font-style: normal;
    line-height: 1;
    opacity: 0;
    animation: note-float 6.5s ease-in infinite paused;
  }
  .app[data-state="live"] .notes i { animation-play-state: running; }
  .notes i:nth-child(2) { left: 24%; color: var(--coral); font-size: 13px; animation-delay: -1.2s; }
  .notes i:nth-child(3) { left: 41%; color: var(--cyan); animation-delay: -2.7s; }
  .notes i:nth-child(4) { left: 58%; font-size: 20px; animation-delay: -0.6s; }
  .notes i:nth-child(5) { left: 76%; color: var(--coral); animation-delay: -3.6s; }
  .notes i:nth-child(6) { left: 91%; color: var(--cyan); font-size: 13px; animation-delay: -4.8s; }
  .now {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr) auto;
    align-items: center;
    gap: 18px;
  }
  .art-wrap { position: relative; width: 76px; height: 76px; }
  .art-wrap::before {
    content: '';
    position: absolute;
    inset: -8px;
    z-index: -1;
    border-radius: 30%;
    background: conic-gradient(from 0deg, var(--coral), var(--gold), var(--cyan), var(--violet), var(--coral));
    filter: blur(12px);
    opacity: 0.2;
    transition: opacity 300ms ease;
  }
  .app[data-state="live"] .art-wrap::before { opacity: 0.55; animation: spin 6s linear infinite; }
  .art, .cover {
    position: relative;
    display: grid;
    place-items: center;
    overflow: hidden;
    color: #fff;
    background: var(--cover);
  }
  .art {
    width: 100%;
    height: 100%;
    border-radius: 14px;
    box-shadow: 0 10px 24px rgba(91, 95, 199, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.04);
  }
  .art img, .cover img {
    width: 100%;
    height: 100%;
    padding: 12%;
    object-fit: contain;
    opacity: 0;
    transition: opacity 250ms ease, transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .art img.loaded, .cover img.loaded { opacity: 1; }
  .tile:hover .cover img { transform: scale(1.07); }
  .art.swap { animation: pop-in 520ms cubic-bezier(0.2, 0.9, 0.25, 1.2); }
  .now-copy.swap .station-name, .now-copy.swap .station-meta { animation: rise-in 380ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
  .now-copy.swap .station-meta { animation-delay: 70ms; }
  .art img.tiny, .cover img.tiny { width: 40px; height: 40px; padding: 0; }
  .is-fallback { background: linear-gradient(145deg, #7b83eb, #5b5fc7); }
  .is-fallback[data-tone="1"] { background: linear-gradient(145deg, #e8788a, #c4314b); }
  .is-fallback[data-tone="2"] { background: linear-gradient(145deg, #34b3b6, #038387); }
  .is-fallback[data-tone="3"] { background: linear-gradient(145deg, #d6a13b, #986f0b); }
  .is-fallback[data-tone="4"] { background: linear-gradient(145deg, #5b5fc7, #d83b8d); }
  .is-fallback[data-tone="5"] { background: linear-gradient(145deg, #4ca64c, #107c10); }
  .initials { font-size: 30px; font-weight: 700; line-height: 1; text-shadow: 0 3px 10px rgba(0, 0, 0, 0.22); }
  .now-copy { min-width: 0; }
  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    max-width: 100%;
    min-height: 22px;
    margin: 0 0 6px;
    padding: 2px 10px 2px 8px;
    border-radius: 999px;
    color: var(--violet);
    background: var(--brand-soft);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    transition: color 200ms ease, background-color 200ms ease;
  }
  .status span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .status-dot { width: 7px; height: 7px; flex: none; border-radius: 50%; background: currentColor; opacity: 0.55; }
  .app[data-state="live"] .status-dot {
    background: var(--green);
    opacity: 1;
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 55%, transparent);
    animation: ping 1.8s ease-out infinite;
  }
  .app[data-state="loading"] .status-dot { animation: blink 900ms ease-in-out infinite; }
  .app[data-state="error"] .status { color: var(--coral); background: color-mix(in srgb, var(--coral) 12%, var(--paper)); animation: shake 420ms ease; }
  .flip { animation: rise-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
  .app[data-state="error"] .status-dot { opacity: 1; }
  .station-name {
    margin: 0;
    overflow: hidden;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .station-meta {
    margin-top: 3px;
    overflow: hidden;
    color: var(--muted);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .controls { display: flex; align-items: center; gap: 10px; }
  .volume { display: flex; align-items: center; gap: 4px; }
  .icon-button {
    display: grid;
    width: 34px;
    height: 34px;
    padding: 0;
    place-items: center;
    border: 0;
    border-radius: 50%;
    color: var(--muted);
    background: transparent;
    transition: color 150ms ease, background-color 150ms ease;
  }
  .icon-button:hover { color: var(--violet); background: var(--brand-soft); }
  .icon-button svg { width: 18px; height: 18px; }
  input[type="range"] {
    width: 88px;
    height: 4px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--violet) var(--fill, 78%), var(--line) var(--fill, 78%));
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }
  input[type="range"]::-webkit-slider-thumb { width: 14px; height: 14px; border: 2px solid var(--paper-strong); border-radius: 50%; background: var(--violet); box-shadow: 0 1px 4px var(--shadow); transition: transform 150ms ease; -webkit-appearance: none; appearance: none; }
  input[type="range"]::-moz-range-thumb { width: 14px; height: 14px; border: 2px solid var(--paper-strong); border-radius: 50%; background: var(--violet); box-shadow: 0 1px 4px var(--shadow); transition: transform 150ms ease; }
  input[type="range"]:hover::-webkit-slider-thumb, input[type="range"]:active::-webkit-slider-thumb { transform: scale(1.2); }
  input[type="range"]:hover::-moz-range-thumb, input[type="range"]:active::-moz-range-thumb { transform: scale(1.2); }
  input[type="range"]:focus-visible { outline: 2px solid var(--violet); outline-offset: 6px; }
  .play-button {
    position: relative;
    display: grid;
    width: 52px;
    height: 52px;
    flex: none;
    padding: 0;
    place-items: center;
    border: 0;
    border-radius: 50%;
    color: #fff;
    background: linear-gradient(135deg, #5b5fc7, #d83b8d);
    box-shadow: 0 6px 16px rgba(91, 95, 199, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.25);
    transition: transform 150ms ease, box-shadow 150ms ease;
  }
  .play-button:hover { transform: translateY(-2px); box-shadow: 0 9px 20px rgba(91, 95, 199, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25); }
  .play-button:active { transform: scale(0.97); }
  .play-button:disabled { cursor: not-allowed; opacity: 0.5; transform: none; box-shadow: none; }
  .play-button svg { width: 22px; height: 22px; }
  .play-button::before, .play-button::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; }
  .play-button::before {
    inset: -5px;
    border: 2px solid transparent;
    border-top-color: var(--violet);
    border-right-color: #d83b8d;
    opacity: 0;
    transition: opacity 150ms ease;
  }
  .app[data-state="loading"] .play-button::before { opacity: 1; animation: spin 800ms linear infinite; }
  .play-button::after { inset: 0; }
  .app[data-state="live"] .play-button::after { animation: ripple 1.8s ease-out infinite; }
  .play-button svg, .icon-button svg { animation: icon-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1); }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 42px;
    padding: 0 5px 0 14px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--paper-strong);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .search:focus-within { border-color: var(--violet); box-shadow: 0 0 0 3px color-mix(in srgb, var(--violet) 18%, transparent); }
  .search-icon { width: 18px; height: 18px; color: var(--muted); }
  .search input {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
  }
  .search input::placeholder { color: var(--muted); opacity: 0.85; }
  .search input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }
  .search-go, .search-clear {
    display: grid;
    width: 30px;
    height: 30px;
    padding: 0;
    place-items: center;
    overflow: hidden;
    border: 0;
    border-radius: 50%;
    color: #fff;
    background: linear-gradient(135deg, #5b5fc7, #d83b8d);
    transition: width 200ms ease, margin 200ms ease, opacity 150ms ease, transform 200ms ease, visibility 200ms, color 150ms ease, background-color 150ms ease;
  }
  .search-go svg { width: 16px; height: 16px; }
  .search-go:hover svg { animation: nudge 520ms ease-in-out infinite alternate; }
  .search-clear { width: 26px; height: 26px; color: var(--muted); background: transparent; }
  .search-clear:hover { color: var(--violet); background: var(--brand-soft); }
  .search-clear svg { width: 14px; height: 14px; }
  .search input:placeholder-shown ~ .search-go,
  .search input:placeholder-shown ~ .search-clear { visibility: hidden; width: 0; margin-left: -8px; opacity: 0; transform: scale(0.5) rotate(-90deg); }
  .tags {
    display: flex;
    gap: 8px;
    margin: 8px -4px 0;
    padding: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
    mask-image: linear-gradient(90deg, #000 calc(100% - 40px), transparent);
  }
  .tags.at-end { -webkit-mask-image: none; mask-image: none; }
  .tags::-webkit-scrollbar { display: none; }
  .tag {
    flex: 0 0 auto;
    height: 30px;
    padding: 0 13px;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--ink);
    background: var(--paper-strong);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    transition: border-color 150ms ease, color 150ms ease, background-color 150ms ease, transform 150ms ease;
  }
  .tag:hover { border-color: color-mix(in srgb, var(--violet) 50%, var(--line)); color: var(--violet); }
  .tag:active { transform: scale(0.94); }
  .tag:focus-visible { outline-offset: 1px; }
  .tag[aria-pressed="true"] {
    border-color: var(--violet);
    color: var(--violet);
    background: color-mix(in srgb, var(--violet) 12%, var(--paper-strong));
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--violet) 16%, transparent);
    animation: pop 340ms cubic-bezier(0.2, 0.9, 0.25, 1.35);
  }
  .stations { padding: 16px 20px 4px; }
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    margin-bottom: 12px;
  }
  .section-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 700; }
  .count {
    padding: 2px 8px;
    border-radius: 999px;
    color: var(--violet);
    background: var(--brand-soft);
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .count.bump { animation: bump 460ms cubic-bezier(0.2, 0.9, 0.25, 1.35); }
  .country {
    position: relative;
    display: flex;
    min-width: 0;
    height: 32px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--paper-strong);
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  .country:hover { border-color: color-mix(in srgb, var(--violet) 50%, var(--line)); }
  .country:focus-within { border-color: var(--violet); box-shadow: 0 0 0 3px color-mix(in srgb, var(--violet) 18%, transparent); }
  .country svg { position: absolute; top: 50%; left: 11px; width: 15px; height: 15px; margin-top: -7.5px; color: var(--violet); pointer-events: none; }
  .country select {
    min-width: 0;
    max-width: 170px;
    height: 100%;
    padding: 0 30px 0 32px;
    border: 0;
    border-radius: 999px;
    outline: 0;
    color: var(--ink);
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    -webkit-appearance: none;
    appearance: none;
  }
  .country option { color: var(--ink); background: var(--paper-strong); }
  .country::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 13px;
    width: 6px;
    height: 6px;
    margin-top: -5px;
    border-right: 1.5px solid var(--muted);
    border-bottom: 1.5px solid var(--muted);
    transform: rotate(45deg);
    pointer-events: none;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 12px;
    max-height: 430px;
    margin: 0 -6px;
    padding: 6px 6px 16px;
    overflow-y: auto;
    scrollbar-color: color-mix(in srgb, var(--violet) 35%, transparent) transparent;
    scrollbar-width: thin;
  }
  .tile {
    position: relative;
    display: block;
    min-width: 0;
    padding: 7px 7px 10px;
    border: 1px solid var(--line);
    border-radius: 12px;
    color: var(--ink);
    background: var(--paper-strong);
    text-align: left;
    transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
  }
  .tile:hover { border-color: color-mix(in srgb, var(--violet) 40%, var(--line)); box-shadow: 0 6px 16px var(--shadow); transform: translateY(-2px); }
  .tile[aria-pressed="true"] { border-color: var(--violet); box-shadow: 0 0 0 2px color-mix(in srgb, var(--violet) 22%, transparent); }
  .tile[aria-pressed="true"]:hover { box-shadow: 0 0 0 2px color-mix(in srgb, var(--violet) 22%, transparent), 0 6px 16px var(--shadow); }
  .tile[data-index] { animation: tile-in 460ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards; animation-delay: calc(var(--i, 0) * 30ms); }
  .tile::before { content: ''; position: absolute; inset: -1px; border-radius: inherit; pointer-events: none; }
  .app[data-state="live"] .tile[aria-pressed="true"]::before { animation: ring-glow 2.2s ease-in-out infinite; }
  .cover { width: 100%; aspect-ratio: 1 / 1; border-radius: 8px; }
  .cover::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
    pointer-events: none;
  }
  .cover .initials { font-size: 36px; }
  .tile-action {
    position: absolute;
    right: 7px;
    bottom: 7px;
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: linear-gradient(135deg, #5b5fc7, #d83b8d);
    box-shadow: 0 6px 14px rgba(91, 95, 199, 0.35);
    opacity: 0;
    transform: translateY(6px) scale(0.9);
    transition: opacity 150ms ease, transform 150ms ease;
  }
  .tile:hover .tile-action, .tile:focus-visible .tile-action, .tile[aria-pressed="true"] .tile-action { opacity: 1; transform: none; }
  .tile-action svg { width: 14px; height: 14px; }
  .eq { display: flex; align-items: flex-end; gap: 2px; height: 13px; }
  .eq i { width: 3px; height: 100%; border-radius: 1px; background: #fff; transform-origin: bottom; animation: eq 760ms ease-in-out infinite alternate; }
  .eq i:nth-child(2) { animation-delay: -280ms; }
  .eq i:nth-child(3) { animation-delay: -520ms; }
  .tile-name {
    display: block;
    margin-top: 9px;
    padding: 0 2px;
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile-meta {
    display: block;
    margin-top: 1px;
    padding: 0 2px;
    overflow: hidden;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tile[aria-pressed="true"] .tile-name { color: var(--violet); }
  .skeleton { pointer-events: none; }
  .skeleton .cover, .bar {
    background: linear-gradient(90deg, var(--skeleton) 30%, color-mix(in srgb, var(--brand-soft) 80%, var(--paper)) 50%, var(--skeleton) 70%);
    background-size: 220% 100%;
    animation: shimmer 1.3s linear infinite;
  }
  .skeleton .cover::after { box-shadow: none; }
  .bar { display: block; height: 10px; margin: 11px 2px 0; border-radius: 5px; }
  .bar.short { width: 55%; margin-top: 6px; }
  .empty {
    grid-column: 1 / -1;
    margin: 0;
    padding: 36px 12px 28px;
    color: var(--muted);
    font-size: 13px;
    text-align: center;
    animation: rise-in 360ms ease backwards;
  }
  .footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 7px;
    padding: 8px 20px 12px;
    color: var(--muted);
    font-size: 11px;
  }
  .sync-dot { width: 6px; height: 6px; flex: none; border-radius: 50%; background: var(--green); }
  .footer[data-ok="false"] .sync-dot { background: var(--coral); }
  .footer-status { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .source-button {
    flex: 0 0 auto;
    margin-left: auto;
    padding: 0;
    border: 0;
    color: var(--violet);
    background: transparent;
    font-size: 11px;
    font-weight: 600;
  }
  .source-button:hover { text-decoration: underline; }
  .brand, .now, .browse { animation: rise-in 520ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
  .now { animation-delay: 70ms; }
  .browse { animation-delay: 140ms; }
  @keyframes ping { 70%, 100% { box-shadow: 0 0 0 7px transparent; } }
  @keyframes blink { 50% { opacity: 0.15; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes eq { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
  @keyframes shimmer { from { background-position: 100% 0; } to { background-position: -120% 0; } }
  @keyframes wave { from { transform: scaleY(0.45); } to { transform: scaleY(1.2); } }
  @keyframes shimmer-text { to { background-position: -200% 0; } }
  @keyframes note-float {
    0% { opacity: 0; transform: translate(0, 0) rotate(-12deg); }
    15% { opacity: 0.3; }
    100% { opacity: 0; transform: translate(16px, -170px) rotate(16deg); }
  }
  @keyframes rise-in { from { opacity: 0; transform: translateY(8px); } }
  @keyframes pop-in { 0% { opacity: 0; transform: scale(0.8) rotate(-8deg); } 60% { opacity: 1; transform: scale(1.05) rotate(2deg); } 100% { transform: none; } }
  @keyframes ripple { from { box-shadow: 0 0 0 0 rgba(216, 59, 141, 0.45); } to { box-shadow: 0 0 0 14px rgba(216, 59, 141, 0); } }
  @keyframes icon-in { from { opacity: 0; transform: scale(0.6) rotate(-30deg); } }
  @keyframes nudge { to { transform: translateX(2px); } }
  @keyframes pop { 0% { transform: scale(0.9); } 60% { transform: scale(1.06); } 100% { transform: none; } }
  @keyframes bump { 40% { transform: scale(1.18); } }
  @keyframes tile-in { from { opacity: 0; transform: translateY(12px) scale(0.97); } }
  @keyframes ring-glow {
    0%, 100% { box-shadow: 0 0 0 0 transparent; }
    50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--violet) 14%, transparent), 0 0 20px color-mix(in srgb, #d83b8d 30%, transparent); }
  }
  @keyframes shake { 20%, 60% { transform: translateX(-3px); } 40%, 80% { transform: translateX(3px); } }
  @media (max-width: 520px) {
    .stage { padding: 16px 14px 24px; }
    .browse { padding: 10px 14px 10px; }
    .brand { margin-bottom: 14px; }
    .now { grid-template-columns: 60px minmax(0, 1fr) auto; gap: 14px; }
    .art-wrap { width: 60px; height: 60px; }
    .art { border-radius: 12px; }
    .station-name { font-size: 18px; }
    .station-meta { font-size: 12px; }
    input[type="range"] { display: none; }
    .play-button { width: 46px; height: 46px; }
    .play-button svg { width: 20px; height: 20px; }
    .stations { padding: 14px 14px 2px; }
    .footer { padding: 6px 14px 10px; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 10px; max-height: 390px; }
    .tile { padding: 6px 6px 9px; border-radius: 10px; }
    .cover { border-radius: 7px; }
  }
  @media (max-width: 340px) {
    .now { grid-template-columns: 48px minmax(0, 1fr); }
    .art-wrap { width: 48px; height: 48px; }
    .art { border-radius: 10px; }
    .art .initials { font-size: 21px; }
    .controls { grid-column: 1 / -1; min-width: 0; }
    .play-button { order: -1; }
    .volume { flex: 1; min-width: 0; }
    input[type="range"] { display: block; flex: 1; width: auto; min-width: 0; }
    .section-head { flex-wrap: wrap; }
    .layers { opacity: 0.75; }
    .stage[data-scene="electronic"] .sun { right: 3%; width: 54px; height: 54px; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 1ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; }
    .notes, .fx { display: none; }
  }
</style>
</head>
<body>
<main id="app" class="app" data-state="idle">
  <header class="masthead">
    <div id="stage" class="stage" data-scene="waves">
      <div id="scene" class="scene" aria-hidden="true">
        <div class="layers">
          <span class="orb o1"></span><span class="orb o2"></span><span class="orb o3"></span>
          <span class="beam b1"></span><span class="beam b2"></span><span class="beam b3"></span>
          <span class="sun"></span><span class="floor"></span>
          <svg class="scene-art" viewBox="0 0 600 170" preserveAspectRatio="xMaxYMid slice">
            <defs>
              <path id="wv" d="M0 0c50-26 100-26 150 0s100 26 150 0 100-26 150 0 100 26 150 0 100-26 150 0 100 26 150 0 100-26 150 0 100 26 150 0"/>
              <path id="swell" d="M0 0c50-12 100-12 150 0s100 12 150 0 100-12 150 0 100 12 150 0 100-12 150 0 100 12 150 0 100-12 150 0 100 12 150 0v60H0z"/>
              <path id="stl" d="M0 0c50-8 100-8 150 0s100 8 150 0 100-8 150 0 100 8 150 0 100-8 150 0 100 8 150 0 100-8 150 0 100 8 150 0"/>
              <g id="nts"><ellipse cx="50" cy="56.8" rx="5.5" ry="4" transform="rotate(-20 50 56.8)"/><ellipse cx="110" cy="44" rx="5.5" ry="4" transform="rotate(-20 110 44)"/><ellipse cx="190" cy="75.5" rx="5.5" ry="4" transform="rotate(-20 190 75.5)"/><ellipse cx="250" cy="71.7" rx="5.5" ry="4" transform="rotate(-20 250 71.7)"/><path d="M55.2 55.5V32M115.2 42.7V19M195.2 74.2V50M255.2 70.4V47" fill="none" stroke="currentColor" stroke-width="1.6"/></g>
            </defs>
            <g class="g-waves"><use href="#wv" y="62" class="wv"/><use href="#wv" y="88" class="wv wv2"/><use href="#wv" y="114" class="wv wv3"/></g>
            <g class="g-ribbons"><use href="#wv" y="92" class="rb"/><use href="#wv" y="120" class="rb rb2"/></g>
            <g class="g-smoke"><path class="sm" d="M430 175c-20-26 20-46 0-72s20-46 0-72"/><path class="sm" d="M490 175c-16-24 16-42 0-66s16-42 0-66"/><path class="sm" d="M550 175c-18-26 18-44 0-70s18-44 0-70"/></g>
            <g class="g-staff"><g class="staff"><use href="#stl" y="44" class="sl"/><use href="#stl" y="53" class="sl"/><use href="#stl" y="62" class="sl"/><use href="#stl" y="71" class="sl"/><use href="#stl" y="80" class="sl"/><use href="#nts" class="nb"/><use href="#nts" x="300" class="nb"/><use href="#nts" x="600" class="nb"/><use href="#nts" x="900" class="nb"/></g></g>
            <g class="g-crowd"><circle cx="292" cy="164" r="12"/><circle cx="318" cy="160" r="11"/><circle cx="344" cy="166" r="13"/><circle cx="372" cy="161" r="11"/><circle cx="398" cy="165" r="12"/><circle cx="424" cy="159" r="11"/><circle cx="450" cy="164" r="13"/><circle cx="478" cy="160" r="11"/><circle cx="504" cy="166" r="12"/><circle cx="530" cy="161" r="11"/><circle cx="556" cy="165" r="12"/><circle cx="584" cy="160" r="11"/><path class="arm" d="M334 158l-5-34"/><path class="arm" d="M410 156l5-36"/><path class="arm" d="M490 158l-6-34"/><path class="arm" d="M570 157l6-35"/></g>
            <g class="g-skyline" transform="translate(0 51) scale(1 0.7)"><path class="bld" d="M262 170v-36h24v36zM290 170v-58h28v58zM322 170v-44h20v44zM346 170v-82h32v82zM382 170v-50h22v50zM408 170v-100h28v100zM440 170v-62h26v62zM470 170v-42h20v42zM494 170v-88h30v88zM528 170v-56h24v56zM556 170v-74h26v74zM586 170v-48h14v48z"/><rect class="win" x="354" y="98" width="5" height="5"/><rect class="win" x="366" y="114" width="5" height="5"/><rect class="win" x="414" y="80" width="5" height="5"/><rect class="win" x="425" y="96" width="5" height="5"/><rect class="win" x="414" y="124" width="5" height="5"/><rect class="win" x="502" y="94" width="5" height="5"/><rect class="win" x="513" y="110" width="5" height="5"/><rect class="win" x="563" y="108" width="5" height="5"/></g>
            <g class="g-speaker"><circle class="pulse" cx="548" cy="46" r="16"/><circle class="pulse" cx="548" cy="46" r="16"/><circle class="pulse" cx="548" cy="46" r="16"/><circle class="cone" cx="548" cy="46" r="16"/><circle class="cone" cx="548" cy="46" r="7"/></g>
            <g class="g-pennants"><path class="string" d="M250 24Q425 72 600 24"/><path class="pn" d="M262 29.4h18l-9 22z"/><path class="pn" d="M304 38.2h18l-9 22z"/><path class="pn" d="M346 44.2h18l-9 22z"/><path class="pn" d="M388 47.4h18l-9 22z"/><path class="pn" d="M430 47.8h18l-9 22z"/><path class="pn" d="M472 45.5h18l-9 22z"/><path class="pn" d="M514 40.5h18l-9 22z"/><path class="pn" d="M556 32.6h18l-9 22z"/></g>
            <g class="g-sea"><use href="#swell" y="132" class="se"/><use href="#swell" y="144" class="se se2"/><use href="#swell" y="156" class="se se3"/></g>
            <g class="g-palm"><path class="trunk" d="M552 176c-2-32 2-66 18-98"/><path class="fronds" d="M570 78c-24-10-48-6-64 10 20-4 40-6 64-10zM570 78c-16-20-38-26-60-20 20 6 40 12 60 20zM570 78c4-24-4-44-22-56 8 16 16 34 22 56zM570 78c18-16 40-20 58-10-20 0-40 4-58 10zM570 78c24 0 42 12 50 30-16-12-32-22-50-30z"/></g>
            <g class="g-hills"><g transform="translate(0 112) scale(1.6 2.6)"><use href="#swell" class="hl"/></g><g transform="translate(-40 128) scale(1.3 2.2)"><use href="#swell" class="hl hl2"/></g><g transform="translate(0 144) scale(1.1 1.8)"><use href="#swell" class="hl hl3"/></g></g>
            <g class="g-globe"><circle class="globe" cx="530" cy="84" r="50"/><ellipse class="mer" cx="530" cy="84" rx="50" ry="50"/><ellipse class="mer" cx="530" cy="84" rx="50" ry="50"/><ellipse class="mer" cx="530" cy="84" rx="50" ry="50"/><path d="M480 84h100M486 60h88M486 108h88"/><ellipse class="orbit" cx="530" cy="84" rx="78" ry="20" transform="rotate(-12 530 84)"/></g>
            <g class="g-tower"><circle class="bring" cx="548" cy="46" r="12"/><circle class="bring" cx="548" cy="46" r="12"/><circle class="bring" cx="548" cy="46" r="12"/><path class="mast" d="M530 172 548 52 566 172M535 136h26M539 110h18M543 84h10M535 136l22-26M561 136l-22-26M539 110l14-26M557 110l-14-26"/><circle class="beacon" cx="548" cy="46" r="5"/></g>
          </svg>
          <span class="fx"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
        </div>
        <span class="aura"></span>
      </div>
      <div class="notes" aria-hidden="true"><i>&#x266A;</i><i>&#x266B;</i><i>&#x266A;</i><i>&#x266C;</i><i>&#x266B;</i><i>&#x266A;</i></div>
      <div class="brand"><span class="logo-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12c1.6-3.2 3.2-3.2 4.7 0s3.1 3.2 4.6 0 3.1-3.2 4.7 0" fill="none" stroke="#fff" stroke-linecap="round" stroke-width="2.2"/></svg></span><span class="logo-word">worldwave</span></div>
      <section class="now" aria-label="Now playing">
        <div class="art-wrap"><div id="heroArt" class="art is-fallback" data-tone="0"><img id="heroImage" alt="" referrerpolicy="no-referrer" hidden /><span id="heroFallback" class="initials">FM</span></div></div>
        <div class="now-copy">
          <p class="status"><span class="status-dot" aria-hidden="true"></span><span id="playerStatus" role="status" aria-live="polite">Tuning in</span></p>
          <h1 id="stationName" class="station-name">Finding stations&hellip;</h1>
          <div id="stationMeta" class="station-meta">Live radio from around the world</div>
        </div>
        <div class="controls">
          <div class="volume">
            <button id="muteButton" class="icon-button" type="button" title="Mute" aria-label="Mute"></button>
            <input id="volumeSlider" type="range" min="0" max="100" value="78" aria-label="Volume" />
          </div>
          <button id="playButton" class="play-button" type="button" title="Play" aria-label="Play" disabled></button>
        </div>
      </section>
    </div>
    <section class="browse" aria-label="Find stations">
      <div class="search" role="search">
        <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 15l4.5 4.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>
        <input id="queryInput" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Search any station, city, or sound" maxlength="80" aria-label="Search stations" />
        <button id="searchClear" class="search-clear" type="button" title="Clear search" aria-label="Clear search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.2"/></svg></button>
        <button id="searchButton" class="search-go" type="button" title="Search" aria-label="Search stations"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg></button>
      </div>
      <div id="genreTags" class="tags" role="group" aria-label="Genres">
        <button class="tag" type="button" data-tag="" aria-pressed="true">All</button><button class="tag" type="button" data-tag="jazz" aria-pressed="false">Jazz</button><button class="tag" type="button" data-tag="chillout" aria-pressed="false">Chill</button><button class="tag" type="button" data-tag="rock" aria-pressed="false">Rock</button><button class="tag" type="button" data-tag="pop" aria-pressed="false">Pop</button><button class="tag" type="button" data-tag="electronic" aria-pressed="false">Electronic</button><button class="tag" type="button" data-tag="classical" aria-pressed="false">Classical</button><button class="tag" type="button" data-tag="hip hop" aria-pressed="false">Hip hop</button><button class="tag" type="button" data-tag="latin" aria-pressed="false">Latin</button><button class="tag" type="button" data-tag="reggae" aria-pressed="false">Reggae</button><button class="tag" type="button" data-tag="r&amp;b" aria-pressed="false">R&amp;B</button><button class="tag" type="button" data-tag="folk" aria-pressed="false">Folk</button><button class="tag" type="button" data-tag="world" aria-pressed="false">World</button><button class="tag" type="button" data-tag="news" aria-pressed="false">News</button><button class="tag" type="button" data-tag="talk" aria-pressed="false">Talk</button>
      </div>
    </section>
  </header>

  <section class="stations" aria-label="Stations">
    <div class="section-head">
      <h2 class="section-title">On air <span id="resultCount" class="count">Tuning in</span></h2>
      <label class="country"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5s1.2-6.2 3.6-8.5z"/></g></svg><select id="countrySelect" aria-label="Country">
        <option value="">Everywhere</option><option value="AR">Argentina</option><option value="AU">Australia</option><option value="BR">Brazil</option><option value="CA">Canada</option><option value="FR">France</option><option value="DE">Germany</option><option value="GH">Ghana</option><option value="IN">India</option><option value="IE">Ireland</option><option value="IT">Italy</option><option value="JP">Japan</option><option value="MX">Mexico</option><option value="NL">Netherlands</option><option value="NG">Nigeria</option><option value="ZA">South Africa</option><option value="KR">South Korea</option><option value="ES">Spain</option><option value="GB">United Kingdom</option><option value="US">United States</option>
      </select></label>
    </div>
    <div id="stationList" class="grid"></div>
  </section>
  <footer id="footer" class="footer" data-ok="true"><span class="sync-dot" aria-hidden="true"></span><span id="footerStatus" class="footer-status" role="status" aria-live="polite">Connecting to the live directory&hellip;</span><button id="sourceButton" class="source-button" type="button">Radio Browser &#x2197;</button></footer>
  <audio id="audio" preload="none"></audio>
</main>
<script>
(function () {
  var PROTOCOL_VERSION = '2026-01-26';
  var ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.2v13.6L19 12z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h3.6v14H7zm6.4 0H17v14h-3.6z"/></svg>',
    volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9.5h3.6L12 5.6v12.8l-4.4-3.9H4z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" d="M15.6 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 9.5h3.6L12 5.6v12.8l-4.4-3.9H4z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" d="M16 9.5l5 5m0-5l-5 5"/></svg>'
  };
  // Radio Browser reports formal ISO names; shorten the verbose ones for display.
  var COUNTRY_NAMES = {
    'the united kingdom of great britain and northern ireland': 'United Kingdom',
    'the united states of america': 'United States',
    'the russian federation': 'Russia',
    'the republic of korea': 'South Korea',
    'the democratic peoples republic of korea': 'North Korea',
    'the democratic republic of the congo': 'DR Congo'
  };
  // Ordered: the first rule matching a station tag (then its name) picks the banner scene.
  var SCENE_RULES = [
    ['broadcast', /\\b(news|talk|sports?|information|politics|podcast|comedy|culture)\\b/],
    ['classical', /classical|baroque|opera|orchestr|symphon|choral|chamber/],
    ['electronic', /electro|techno|house|trance|edm|dubstep|drum|dnb|synth|club|dance|disco|breakbeat|hardstyle/],
    ['hiphop', /hip ?hop|\\brap\\b|trap|grime|urban/],
    ['soul', /r&b|rnb|\\bsoul\\b|funk|motown/],
    ['reggae', /reggae|\\bdub\\b|\\bska\\b|dancehall/],
    ['latin', /latin|salsa|reggaeton|bachata|cumbia|merengue|tango|samba|mpb|flamenco|mariachi|ranchera|tropical|bossa/],
    ['jazz', /jazz|swing|bebop|blues|big band/],
    ['rock', /rock|metal|punk|grunge|indie|alternative/],
    ['chill', /chill|lounge|ambient|downtempo|relax|lo-?fi|easy listening|new age|meditation|sleep|smooth/],
    ['folk', /folk|country|acoustic|bluegrass|celtic|americana/],
    ['world', /world|ethnic|african|afro|arab|bollywood|indian|k-?pop|j-?pop|traditional|oriental|middle eastern|balkan/],
    ['pop', /pop|hits|top ?40|charts|oldies|[0-9]0s|adult contemporary/]
  ];
  // Main stripe colors per ISO country code, used for the banner's top rule and glow.
  var FLAGS = {};
  ('AE:00732f,fff,000|AR:74acdf,fff,74acdf|AT:ed2939,fff,ed2939|AU:012169,fff,e4002b|BE:000,fdda24,ef3340|BG:fff,00966e,d62612|' +
    'BR:009c3b,ffdf00,002776|CA:d80621,fff,d80621|CH:d52b1e,fff,d52b1e|CL:0039a6,fff,d52b1e|CN:de2910,ffde00,de2910|CO:fcd116,003893,ce1126|' +
    'CU:002a8f,fff,cf142b|CZ:11457e,fff,d7141a|DE:000,dd0000,ffce00|DK:c8102e,fff,c8102e|EG:ce1126,fff,000|ES:aa151b,f1bf00,aa151b|' +
    'FI:fff,002f6c,fff|FR:0055a4,fff,ef4135|GB:012169,fff,c8102e|GH:ce1126,fcd116,006b3f|GR:0d5eaf,fff,0d5eaf|HR:ff0000,fff,171796|' +
    'HU:ce2939,fff,477050|ID:ce1126,fff|IE:169b62,fff,ff883e|IL:0038b8,fff,0038b8|IN:ff9933,fff,138808|IR:239f40,fff,da0000|' +
    'IT:009246,fff,ce2b37|JM:009b3a,fed100,000|JP:fff,bc002d,fff|KE:000,bb0000,006600|KR:cd2e3a,fff,0047a0|MA:c1272d,006233,c1272d|' +
    'MX:006847,fff,ce1126|NG:008751,fff,008751|NL:ae1c28,fff,21468b|NO:ba0c2f,fff,00205b|NZ:012169,fff,c8102e|PE:d91023,fff,d91023|' +
    'PH:0038a8,fff,ce1126|PL:fff,dc143c|PT:046a38,da291c|RO:002b7f,fcd116,ce1126|RS:c6363c,0c4076,fff|RU:fff,0039a6,d52b1e|' +
    'SA:006c35,fff,006c35|SE:006aa7,fecc00,006aa7|SN:00853f,fdef42,e31b23|TH:a51931,fff,2d2a4a|TR:e30a17,fff,e30a17|TW:fe0000,000095|' +
    'UA:0057b7,ffd700|US:0a3161,fff,b31942|VE:ffcc00,00247d,cf142b|VN:da251d,ffff00|ZA:007a4d,ffb612,de3831,002395').split('|').forEach(function (entry) {
    var parts = entry.split(':');
    FLAGS[parts[0]] = parts[1].split(',').map(function (hex) { return '#' + hex; });
  });
  var pending = {};
  var nextId = 1;
  var hostContext = null;
  var stations = [];
  var selected = null;
  var currentTag = '';
  var shownQuery = '';
  var artworkFor = '';
  var searching = false;
  var searchQueued = false;
  var audio = document.getElementById('audio');
  var app = document.getElementById('app');
  var stage = document.getElementById('stage');
  var list = document.getElementById('stationList');
  var tags = document.getElementById('genreTags');

  function post(message) { parent.postMessage(message, '*'); }
  function request(method, params) {
    var id = String(nextId++);
    return new Promise(function (resolve, reject) {
      pending[id] = { resolve: resolve, reject: reject };
      post({ jsonrpc: '2.0', id: id, method: method, params: params });
    });
  }
  function notify(method, params) { post({ jsonrpc: '2.0', method: method, params: params }); }
  function callTool(name, args) { return request('tools/call', { name: name, arguments: args || {} }); }
  function reportSize() {
    notify('ui/notifications/size-changed', {
      height: Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight))
    });
  }
  if (window.ResizeObserver) new ResizeObserver(reportSize).observe(document.body);
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>\"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character];
    });
  }
  function escapeAttr(value) { return escapeHtml(value).replace(/'/g, '&#39;'); }
  function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light'); }
  function setFooter(text, ok) {
    document.getElementById('footer').setAttribute('data-ok', ok === false ? 'false' : 'true');
    document.getElementById('footerStatus').textContent = text || '';
  }
  // Restart a CSS animation by re-adding its class after a forced reflow.
  function replay(element, name) {
    element.classList.remove(name);
    void element.offsetWidth;
    element.classList.add(name);
  }
  function shortCountry(name) {
    var text = String(name || '').trim();
    return COUNTRY_NAMES[text.toLowerCase()] || text
      .replace(/^the /i, '')
      .replace(/ [(].*$/, '')
      .replace(/,.*$/, '')
      .replace(/^(.* )?republic of |^state of /i, '');
  }
  function monogram(name) {
    var letters = String(name || '').replace(/[^0-9A-Za-z\\u00C0-\\uFFFF]+/g, '');
    return letters ? Array.from(letters)[0].toUpperCase() : 'FM';
  }
  // Picks one of the six /celebrate palette gradients for logo-less stations.
  function toneFor(text) {
    var hash = 0;
    for (var i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 6;
    return hash;
  }
  function joinMeta(parts) { return parts.filter(Boolean).join(' \\u00B7 '); }
  function tileMeta(station) { return joinMeta([shortCountry(station.country), station.tags && station.tags[0]]); }
  function streamMeta(station) {
    return joinMeta([shortCountry(station.country), station.codec !== 'AUDIO' && station.codec, station.bitrate ? station.bitrate + ' kbps' : '']);
  }
  function setStatus(state, text) {
    var label = document.getElementById('playerStatus');
    if (app.getAttribute('data-state') !== state) replay(label, 'flip');
    app.setAttribute('data-state', state);
    label.textContent = text;
  }
  function setArtwork(station) {
    if (artworkFor === station.id) return;
    artworkFor = station.id;
    var art = document.getElementById('heroArt');
    var image = document.getElementById('heroImage');
    var fallback = document.getElementById('heroFallback');
    function showFallback() {
      image.hidden = true;
      fallback.hidden = false;
      art.classList.add('is-fallback');
    }
    art.setAttribute('data-tone', String(toneFor(station.name)));
    fallback.textContent = monogram(station.name);
    image.classList.remove('tiny', 'loaded');
    replay(art, 'swap');
    replay(document.querySelector('.now-copy'), 'swap');
    if (!station.favicon) {
      image.removeAttribute('src');
      showFallback();
      return;
    }
    art.classList.remove('is-fallback');
    fallback.hidden = true;
    image.hidden = false;
    image.onload = function () {
      image.classList.add('loaded');
      image.classList.toggle('tiny', image.naturalWidth < 48);
    };
    image.onerror = showFallback;
    image.src = station.favicon;
  }
  function renderPlayer() {
    document.getElementById('playButton').disabled = !selected;
    if (!selected) return;
    document.getElementById('stationName').textContent = selected.name;
    document.getElementById('stationMeta').textContent = streamMeta(selected);
    setArtwork(selected);
    applyScene(selected);
  }
  function sceneFor(station) {
    var pool = (station.tags || []).concat(String(station.name || '').toLowerCase());
    for (var i = 0; i < pool.length; i++) {
      for (var j = 0; j < SCENE_RULES.length; j++) {
        if (SCENE_RULES[j][1].test(pool[i])) return SCENE_RULES[j][0];
      }
    }
    return 'waves';
  }
  function applyScene(station) {
    var scene = sceneFor(station);
    if (stage.getAttribute('data-scene') !== scene) {
      stage.setAttribute('data-scene', scene);
      replay(document.getElementById('scene'), 'scene-in');
    }
    var colors = FLAGS[station.countryCode];
    if (!colors) {
      app.removeAttribute('data-flag');
      app.style.removeProperty('--flag');
      app.style.removeProperty('--flag-glow');
      return;
    }
    var step = 100 / colors.length;
    var stripes = colors.map(function (color, i) { return color + ' ' + (i * step) + '% ' + ((i + 1) * step) + '%'; });
    // Black stripes (e.g. Germany) would smudge the pastel sky, so the glow skips them.
    var glow = colors.filter(function (color) { return color !== '#000'; });
    app.setAttribute('data-flag', station.countryCode);
    app.style.setProperty('--flag', 'linear-gradient(90deg, ' + stripes.join(', ') + ')');
    app.style.setProperty('--flag-glow', 'linear-gradient(90deg, ' + glow.concat(glow[0]).join(', ') + ')');
  }

  function actionHtml(playing) {
    return playing ? '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>' : ICONS.play;
  }
  function tileHtml(station, index) {
    var active = !!selected && selected.id === station.id;
    var playing = active && !audio.paused;
    var image = station.favicon ? '<img src="' + escapeAttr(station.favicon) + '" alt="" referrerpolicy="no-referrer" />' : '';
    return '<button class="tile" type="button" data-index="' + index + '" style="--i: ' + Math.min(index, 16) + '" aria-pressed="' + active + '" title="' + (playing ? 'Pause ' : 'Play ') + escapeAttr(station.name) + '">' +
      '<span class="cover' + (image ? '' : ' is-fallback') + '" data-tone="' + toneFor(station.name) + '">' + image +
      '<span class="initials"' + (image ? ' hidden' : '') + '>' + escapeHtml(monogram(station.name)) + '</span>' +
      '<span class="tile-action">' + actionHtml(playing) + '</span></span>' +
      '<span class="tile-name">' + escapeHtml(station.name) + '</span>' +
      '<span class="tile-meta">' + escapeHtml(tileMeta(station)) + '</span></button>';
  }
  // Update play state in place so tile artwork is not re-fetched on every toggle.
  function refreshTiles() {
    var tiles = list.querySelectorAll('.tile[data-index]');
    for (var i = 0; i < tiles.length; i++) {
      var station = stations[Number(tiles[i].getAttribute('data-index'))];
      if (!station) continue;
      var active = !!selected && selected.id === station.id;
      var playing = active && !audio.paused;
      tiles[i].setAttribute('aria-pressed', active ? 'true' : 'false');
      tiles[i].title = (playing ? 'Pause ' : 'Play ') + station.name;
      tiles[i].querySelector('.tile-action').innerHTML = actionHtml(playing);
    }
  }
  function renderList() {
    list.removeAttribute('aria-busy');
    document.getElementById('resultCount').textContent = stations.length + (stations.length === 1 ? ' station' : ' stations');
    replay(document.getElementById('resultCount'), 'bump');
    if (!stations.length) {
      list.innerHTML = '<p class="empty">No live stations matched. Try another search, genre, or country.</p>';
    } else {
      var html = '';
      for (var i = 0; i < stations.length; i++) html += tileHtml(stations[i], i);
      list.innerHTML = html;
    }
    list.scrollTop = 0;
    reportSize();
  }
  function showLoading() {
    var html = '';
    for (var i = 0; i < 8; i++) html += '<div class="tile skeleton" aria-hidden="true"><span class="cover"></span><span class="bar"></span><span class="bar short"></span></div>';
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = html;
    document.getElementById('resultCount').textContent = 'Tuning in';
    reportSize();
  }
  function syncTags() {
    var buttons = tags.querySelectorAll('[data-tag]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', (buttons[i].getAttribute('data-tag') || '') === currentTag ? 'true' : 'false');
    }
  }
  function updateTagFade() {
    tags.classList.toggle('at-end', tags.scrollLeft + tags.clientWidth >= tags.scrollWidth - 2);
  }
  function syncFilters(snapshot) {
    var country = document.getElementById('countrySelect');
    document.getElementById('queryInput').value = snapshot.query || '';
    country.value = snapshot.country || '';
    if (country.selectedIndex < 0) country.value = '';
    currentTag = snapshot.tag || '';
    syncTags();
  }

  function render(snapshot, fromHost) {
    if (!snapshot || !Array.isArray(snapshot.stations)) return;
    stations = snapshot.stations;
    shownQuery = snapshot.query || '';
    if (fromHost) syncFilters(snapshot);
    if (!selected) {
      if (stations.length) {
        selected = stations[0];
        setStatus('idle', 'Ready to play');
      } else {
        document.getElementById('stationName').textContent = 'Pick a station';
        setStatus('idle', 'Search to tune in');
      }
    }
    renderPlayer();
    renderList();
    setFooter(snapshot.live === false ? 'Directory unavailable \\u2014 showing the last results' : 'Live directory', snapshot.live !== false);
  }

  function setPlaying(playing) {
    var button = document.getElementById('playButton');
    button.innerHTML = playing ? ICONS.pause : ICONS.play;
    button.title = playing ? 'Pause' : 'Play';
    button.setAttribute('aria-label', button.title);
    refreshTiles();
  }
  function setMuted(muted) {
    audio.muted = muted;
    var button = document.getElementById('muteButton');
    button.innerHTML = muted ? ICONS.muted : ICONS.volume;
    button.title = muted ? 'Unmute' : 'Mute';
    button.setAttribute('aria-label', button.title);
  }
  function setVolume(value) {
    document.getElementById('volumeSlider').style.setProperty('--fill', value + '%');
    audio.volume = value / 100;
    if (value > 0 && audio.muted) setMuted(false);
  }

  function playSelected() {
    if (!selected) return;
    if (audio.getAttribute('src') !== selected.streamUrl || audio.error) {
      audio.setAttribute('src', selected.streamUrl);
      audio.load();
    }
    setStatus('loading', 'Connecting\\u2026');
    var attempt = audio.play();
    if (attempt && attempt.catch) attempt.catch(function (error) {
      // Switching stations interrupts the previous play() request; that is not a failure.
      if (error && error.name === 'AbortError') return;
      setPlaying(false);
      setStatus('error', 'Off air \\u2014 try another station');
    });
  }

  function toggleStation(index) {
    var station = stations[index];
    if (!station) return;
    if (selected && selected.id === station.id && !audio.paused) {
      audio.pause();
      return;
    }
    selected = station;
    renderPlayer();
    refreshTiles();
    playSelected();
  }

  function search() {
    if (searching) {
      searchQueued = true;
      return;
    }
    searching = true;
    showLoading();
    setFooter('Searching the live directory\\u2026', true);
    callTool('getRadioStations', {
      query: document.getElementById('queryInput').value,
      country: document.getElementById('countrySelect').value,
      tag: currentTag
    }).then(function (result) {
      if (searchQueued) return;
      var snapshot = result && (result.structuredContent || result);
      if (snapshot && Array.isArray(snapshot.stations)) render(snapshot, false);
      else {
        renderList();
        setFooter('The station directory returned an invalid response.', false);
      }
    }).catch(function (error) {
      if (searchQueued) return;
      renderList();
      setFooter('Search failed: ' + (error && error.message ? error.message : String(error)), false);
    }).then(function () {
      searching = false;
      if (searchQueued) {
        searchQueued = false;
        search();
      }
    });
  }

  document.getElementById('playButton').addEventListener('click', function () {
    if (audio.paused) playSelected(); else audio.pause();
  });
  document.getElementById('muteButton').addEventListener('click', function () { setMuted(!audio.muted); });
  document.getElementById('volumeSlider').addEventListener('input', function () { setVolume(Number(this.value)); });
  function clearSearch() {
    var input = document.getElementById('queryInput');
    input.value = '';
    input.focus();
    if (shownQuery || searching) search();
  }
  document.getElementById('searchButton').addEventListener('click', search);
  document.getElementById('searchClear').addEventListener('click', clearSearch);
  // Widget iframes are sandboxed without allow-forms, which blocks form submission.
  document.getElementById('queryInput').addEventListener('keydown', function (event) {
    if (event.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      search();
    } else if (event.key === 'Escape' && this.value) {
      event.preventDefault();
      clearSearch();
    }
  });
  document.getElementById('countrySelect').addEventListener('change', search);
  tags.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('[data-tag]') : null;
    if (!button) return;
    var tag = button.getAttribute('data-tag') || '';
    currentTag = tag && tag === currentTag ? '' : tag;
    syncTags();
    search();
  });
  tags.addEventListener('wheel', function (event) {
    var max = tags.scrollWidth - tags.clientWidth;
    if (max <= 0 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    var next = Math.max(0, Math.min(max, tags.scrollLeft + event.deltaY));
    if (next === tags.scrollLeft) return;
    event.preventDefault();
    tags.scrollLeft = next;
  }, { passive: false });
  tags.addEventListener('scroll', updateTagFade);
  window.addEventListener('resize', updateTagFade);
  list.addEventListener('click', function (event) {
    var tile = event.target && event.target.closest ? event.target.closest('[data-index]') : null;
    if (tile) toggleStation(Number(tile.getAttribute('data-index')));
  });
  // Image load/error events do not bubble, so listen in the capture phase.
  list.addEventListener('load', function (event) {
    var image = event.target;
    if (image && image.tagName === 'IMG') {
      image.classList.add('loaded');
      if (image.naturalWidth < 48) image.classList.add('tiny');
    }
  }, true);
  list.addEventListener('error', function (event) {
    var image = event.target;
    if (!image || image.tagName !== 'IMG') return;
    image.hidden = true;
    image.parentNode.classList.add('is-fallback');
    image.parentNode.querySelector('.initials').hidden = false;
  }, true);
  document.getElementById('sourceButton').addEventListener('click', function () {
    request('ui/open-link', { url: 'https://www.radio-browser.info/' }).catch(function () {
      setFooter('Could not open the Radio Browser directory.', false);
    });
  });

  audio.volume = 0.78;
  audio.addEventListener('playing', function () {
    setPlaying(true);
    setStatus('live', 'Live now');
  });
  audio.addEventListener('pause', function () {
    // A later play() supersedes this pause; a pause fired after a media error must not hide the error.
    if (!audio.paused || audio.error) return;
    setPlaying(false);
    if (selected) setStatus('paused', 'Paused');
  });
  audio.addEventListener('waiting', function () { if (!audio.paused) setStatus('loading', 'Buffering\\u2026'); });
  audio.addEventListener('error', function () {
    if (!audio.getAttribute('src')) return;
    setPlaying(false);
    setStatus('error', 'Off air \\u2014 try another station');
  });

  window.addEventListener('message', function (event) {
    var message = event.data;
    if (typeof message === 'string') { try { message = JSON.parse(message); } catch (error) { return; } }
    if (!message || message.jsonrpc !== '2.0') return;
    if (message.id !== undefined && !message.method && (('result' in message) || ('error' in message))) {
      var callback = pending[String(message.id)];
      if (!callback) return;
      delete pending[String(message.id)];
      if (message.error) callback.reject(new Error((message.error && message.error.message) || 'Request failed'));
      else callback.resolve(message.result);
      return;
    }
    if (message.method === 'ui/notifications/tool-result') {
      var result = message.params || {};
      render(result.structuredContent || result, true);
    } else if (message.method === 'ui/notifications/host-context-changed') {
      var context = message.params || {};
      hostContext = Object.assign({}, hostContext || {}, context);
      if (context.theme) applyTheme(context.theme);
    } else if (message.method === 'ui/notifications/resource-teardown') {
      audio.pause();
      audio.removeAttribute('src');
    }
  });

  setPlaying(false);
  setMuted(false);
  updateTagFade();
  showLoading();

  request('ui/initialize', {
    protocolVersion: PROTOCOL_VERSION,
    appInfo: { name: 'worldwave-radio', version: '1.0.0' },
    appCapabilities: {}
  }).then(function (result) {
    if (!result) throw new Error('Host sent an invalid initialize result');
    hostContext = result.hostContext || null;
    if (hostContext && hostContext.theme) applyTheme(hostContext.theme);
    notify('ui/notifications/initialized');
    if (result.toolResult) render(result.toolResult.structuredContent || result.toolResult, true);
    reportSize();
  }).catch(function (error) {
    setFooter('Initialize failed: ' + (error && error.message ? error.message : String(error)), false);
    reportSize();
  });

  window.addEventListener('beforeunload', function () { audio.pause(); });
  reportSize();
})();
</script>
</body>
</html>`;
