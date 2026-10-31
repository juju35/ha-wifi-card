// Renders the card with mock data and saves the README screenshots.
// Usage: npm run build && npm run screenshots
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cardJs = readFileSync(`${root}dist/wifi-card.js`, "utf8");

const THEMES = {
  light: {
    "--primary-background-color": "#e8eaed",
    "--secondary-background-color": "#ececec",
    "--card-background-color": "#ffffff",
    "--primary-text-color": "#212121",
    "--secondary-text-color": "#727272",
    "--divider-color": "rgba(0,0,0,.12)",
  },
  dark: {
    "--primary-background-color": "#111111",
    "--secondary-background-color": "#282828",
    "--card-background-color": "#1c1c1c",
    "--primary-text-color": "#e1e1e1",
    "--secondary-text-color": "#9b9b9b",
    "--divider-color": "rgba(225,225,225,.12)",
  },
};
const COMMON = {
  "--primary-color": "#03a9f4",
  "--info-color": "#039be5",
  "--success-color": "#43a047",
  "--warning-color": "#ffa600",
  "--error-color": "#db4437",
  "--text-primary-color": "#ffffff",
};

// Minimal stand-ins for Home Assistant's <ha-card> and <ha-icon> (Material Design Icons paths below).
const haElements = (icons) => `
const ICONS = ${JSON.stringify(icons)};
customElements.define("ha-card", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      "<style>:host{display:block;background:var(--card-background-color);border-radius:12px;" +
      "border:1px solid var(--divider-color);color:var(--primary-text-color);overflow:hidden}</style><slot></slot>";
  }
});
customElements.define("ha-icon", class extends HTMLElement {
  static get observedAttributes() { return ["icon"]; }
  connectedCallback() { this._draw(); }
  attributeChangedCallback() { this._draw(); }
  _draw() {
    const path = ICONS[(this.getAttribute("icon") || "").replace("mdi:", "")] || "";
    this.style.display = "inline-flex";
    this.innerHTML = '<svg viewBox="0 0 24 24" style="width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);fill:currentColor"><path d="' + path + '"/></svg>';
  }
});`;

const pageHtml = (theme, width) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { ${Object.entries({ ...THEMES[theme], ...COMMON }).map(([k, v]) => `${k}:${v};`).join("")} }
  body { margin: 0; padding: 16px; background: var(--primary-background-color); color: var(--primary-text-color);
         font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; width: ${width}px; }
</style></head><body><div id="root"></div></body></html>`;

// Renders each shot { file, type, theme, width, config, hass?, after? } into screenshots/<file>.png.
export async function render(shots, { icons = {}, hass = {} } = {}) {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of shots) {
    // A new page each time: the card script declares top-level classes that can't be injected twice in one realm.
    const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1000, height: 2000 } });
    page.on("pageerror", (err) => console.error(`${s.file}: ${err.message}`));
    await page.setContent(pageHtml(s.theme, s.width));
    await page.addScriptTag({ content: haElements(icons) });
    await page.addScriptTag({ content: cardJs });
    await page.evaluate(
      ({ type, config, hass, dark }) => {
        const el = document.createElement(type);
        el.setConfig({ type: `custom:${type}`, ...config });
        el.hass = { states: {}, entities: {}, devices: {}, language: "en", locale: { language: "en" },
                    themes: { darkMode: dark }, callService: async () => {}, callWS: async () => ({}), ...hass };
        document.getElementById("root").appendChild(el);
      },
      { type: s.type, config: s.config || {}, hass: { ...hass, ...(s.hass || {}) }, dark: s.theme === "dark" }
    );
    if (s.after) await s.after(page);
    await page.waitForTimeout(400);
    // The card with the 16 px page padding around it, on the theme background.
    const box = await page.locator("#root").boundingBox();
    await page.screenshot({
      path: `${root}screenshots/${s.file}.png`,
      clip: { x: 0, y: 0, width: s.width + 32, height: Math.ceil(box.height) + 32 },
      animations: "disabled",
    });
    console.log(`screenshots/${s.file}.png`);
    await page.close();
  }
  await browser.close();
}

const icons = {
  wifi: "M12,21L15.6,16.2C14.6,15.45 13.35,15 12,15C10.65,15 9.4,15.45 8.4,16.2L12,21M12,3C7.95,3 4.21,4.34 1.2,6.6L3,9C5.5,7.12 8.62,6 12,6C15.38,6 18.5,7.12 21,9L22.8,6.6C19.79,4.34 16.05,3 12,3M12,9C9.3,9 6.81,9.89 4.8,11.4L6.6,13.8C8.1,12.67 9.97,12 12,12C14.03,12 15.9,12.67 17.4,13.8L19.2,11.4C17.19,9.89 14.7,9 12,9Z",
  eye: "M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z",
};
const config = { ssid: "Home-Guests", password: "correct-horse-battery" };

await render(
  [
    { file: "card", type: "wifi-qr-card", theme: "light", width: 460, config },
    { file: "card-dark", type: "wifi-qr-card", theme: "dark", width: 460, config },
  ],
  { icons }
);
