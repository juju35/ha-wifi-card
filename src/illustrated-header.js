// ── Illustrated header ("banner"): a router on a wall shelf sending its waves to a laptop on the parquet ─────────
// A 200 × 80 picture drawn at the right of a 90 px banner, above a 10 px parquet strip edge to edge; the title sits on
// the wall at its left. Status: ok (secured network: blue waves), warn (open or WEP network: amber waves), err (no
// value from the configured entity, or no QR code: no waves, a red LED). The mini card draws the router alone.
import { WIFI_BLUE } from "./card-picker.js";

export var WIFI_STATUS_CLASS = { ok: 'st-ok', warn: 'st-warn', err: 'st-err' };

export function wifiQrSceneSvg(status, mini) {
  var waves = status === 'err'
    ? ''
    : '<g class="wq-waves"><path class="w1" d="M-8 -24a12 12 0 0 1 16 0"/><path class="w2" d="M-14 -30a20 20 0 0 1 28 0"/><path class="w3" d="M-20 -36a28 28 0 0 1 40 0"/></g>';
  var router = `<g transform="translate(160 54)"><path class="wq-ant" d="M-10 -8V-18M10 -8V-18"/><rect class="wq-router" x="-14" y="-8" width="28" height="8" rx="2"/><circle class="wq-led" cx="-6" cy="-4" r="1"/><circle class="wq-led l2" cx="-2" cy="-4" r="1"/>${waves}</g>`;
  if (mini) {
    return `<svg class="scene mini" viewBox="136 12 48 68" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false"><rect class="wq-shelf" x="140" y="54" width="44" height="4"/>${router}</svg>`;
  }
  var laptop = '<g class="wq-laptop" transform="translate(70 79)"><rect class="wq-lid" x="-18" y="-22" width="36" height="22" rx="1.5"/><rect class="wq-screen" x="-16" y="-20" width="32" height="18" rx="1"/><rect class="wq-base" x="-22" y="-2" width="44" height="3" rx="1"/></g>';
  return `<svg class="scene" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false"><rect class="wq-shelf" x="110" y="54" width="86" height="4"/>${router}${laptop}</svg>`;
}

// Night picture: forced by illustration_theme, else Home Assistant's dark theme alone (a light theme keeps the day
// picture after sunset).
export function wifiQrIsNight(hass, config) {
  var theme = config?.illustration_theme;
  if (theme === 'night') return true;
  if (theme === 'day') return false;
  return !!hass?.themes?.darkMode;
}

// The banner's styles, day and night, shared by both cards. The icon's colour is the status colour.
export var WIFI_BANNER_STYLE = `
        .banner { position: relative; overflow: hidden; height: 90px; flex: none; container-type: inline-size; box-sizing: border-box;
                  background: #f2eee8; color: #0d2a45; --st: #2f80ed; }
        .banner.night { background: #2a2f3d; color: #fff; --st: #8fbaff; }
        .banner.st-warn { --st: #d48806; } .banner.night.st-warn { --st: #ffc046; }
        .banner.st-err { --st: #d93025; } .banner.night.st-err { --st: #ff8a80; }
        .banner .scene { position: absolute; right: 0; bottom: 10px; height: 80px; width: min(200px, 62%); }
        .banner .scene.mini { width: 36px; height: 50px; right: 6px; }
        .banner .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px;
                          background: repeating-linear-gradient(90deg, #c99a6b 0 38px, #b98a5c 38px 40px); box-shadow: inset 0 2px 0 #a97c50; }
        .banner.night .ground { background: repeating-linear-gradient(90deg, #4a3a2c 0 38px, #3e3024 38px 40px); box-shadow: inset 0 2px 0 #5c4836; }
        /* The text runs over the plain wall of the picture, up to the laptop (a quarter of the picture in). */
        .htext { position: absolute; z-index: 1; left: 12px; top: 0; bottom: 10px; right: calc(min(200px, 62%) * .75 + 4px);
                 display: flex; align-items: center; gap: 10px; min-width: 0; }
        .htext .titles { flex: 1 1 0; min-width: 4ch; }
        .banner .badge { position: relative; color: var(--st); background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px rgba(47,128,237,.18); }
        .banner.night .badge { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
        .banner .name { color: inherit; }
        .banner .sub { font-size: 13px; color: #3b5b78; }
        .banner.night .sub { color: rgba(255,255,255,.78); }
        .wq-shelf { fill: #c9b79c; } .night .wq-shelf { fill: #3c4558; }
        .wq-router { fill: #2a3038; } .night .wq-router { fill: #3a4352; }
        .wq-ant { stroke: #2a3038; stroke-width: 1.6; stroke-linecap: round; fill: none; } .night .wq-ant { stroke: #5a6577; }
        .wq-led { fill: #43c463; animation: wq-blink 1.2s steps(2) infinite; } .wq-led.l2 { animation-delay: .3s; }
        .st-err .wq-led { fill: #e53935; animation: none; }
        .wq-waves { fill: none; stroke: var(--st); stroke-width: 1.8; stroke-linecap: round; }
        .wq-waves path { animation: wq-wave 1.5s infinite; } .wq-waves .w2 { animation-delay: .25s; } .wq-waves .w3 { animation-delay: .5s; }
        .wq-lid { fill: #3a4250; } .wq-screen { fill: #86b9de; } .night .wq-screen { fill: #3d5a8a; }
        .st-err .wq-screen { fill: #aab4bf; } .night.st-err .wq-screen { fill: #4a5363; }
        .wq-base { fill: #7d8793; }
        @keyframes wq-blink { 50% { opacity: .2; } }
        @keyframes wq-wave { 50% { opacity: .2; } }
        @media (prefers-reduced-motion: reduce) { .wq-led, .wq-waves path { animation: none !important; } }
        /* Narrow card: no room for the picture beside the text, the wall alone stays. */
        @container (max-width: 300px) { .banner .scene:not(.mini) { display: none; } .htext { right: 12px; } }
        /* Phone width at 4 columns (~104 px card): a 32 px badge and a 14 px title keep a few characters. */
        @container (max-width: 128px) { .htext { left: 6px; right: 6px; gap: 4px; } .htext .name { font-size: 14px; } .banner .badge { width: 32px; height: 32px; } .banner .badge ha-icon { --mdc-icon-size: 20px; } }`;

// The status pill on the title row (full and mini card, banner or classic header): a dot and a short label in the
// status colour of the header icon, right after the title only when the whole title and the whole label fit there
// (measured by the card, see wifiPlacePill); otherwise on its own line under the subtitle; when even that cuts the
// label or leaves the banner, and at 200 px or less, only its dot shows (the label stays in its tooltip and for
// screen readers).
export var WIFI_PILL_STYLE = `
        .titles { display: flex; flex-direction: column; min-width: 4ch; }
        .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .trow .name { flex: 0 1 auto; min-width: 0; }
        .chip { --c: ${WIFI_BLUE}; display: inline-flex; align-items: center; gap: 4px; flex: none; max-width: 100%; box-sizing: border-box;
                padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; overflow: hidden;
                background: color-mix(in srgb, var(--c) 15%, transparent); color: color-mix(in srgb, var(--c) 40%, var(--primary-text-color, #212121)); }
        .st-warn .chip { --c: var(--warning-color, #ffa600); }
        .st-err .chip { --c: var(--error-color, #db4437); }
        .chip .ptxt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--c); }
        .banner .chip { --c: var(--st); background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
        .banner.night .chip { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
        [data-wrap] .trow { display: contents; }
        [data-wrap] .titles > .sub { order: 2; }
        [data-wrap] .titles .chip { order: 3; align-self: flex-start; margin-top: 2px; }
        [data-dot] .titles .chip { padding: 3px; }
        [data-dot] .titles .chip .ptxt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        @container (max-width: 200px) { .titles .chip { padding: 3px; } .titles .chip .ptxt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; } }`;

// The WiFi logo in a small white tile on the header icon (bottom right), like the brand badge of the other cards.
export var WIFI_BRAND_STYLE = `
        .badge { position: relative; }
        .brand { position: absolute; right: -4px; bottom: -4px; width: 18px; height: 18px; border-radius: 5px; padding: 2px; box-sizing: border-box;
                 display: grid; place-items: center; background: #fff; color: #1e88e5;
                 box-shadow: 0 0 0 1px var(--divider-color, rgba(0,0,0,.12)), 0 0 0 2px var(--card-background-color, #fff); }
        .brand .logo { width: 100%; height: 100%; display: block; }`;
