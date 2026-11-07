// Round-trip tests for the WIFI: string and the embedded QR encoder: build the QR with the card's
// own code, decode it with jsQR and compare the payload. Run with: npm test
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import jsQR from "jsqr";

const BS = "\\"; // one backslash, spelled once to keep the expectations readable

// Evaluates src/wifi-card.js with just enough browser stubs to reach its functions and classes.
function loadCard() {
  const defined = {};
  const ctx = {
    HTMLElement: class {},
    CustomEvent: class {},
    customElements: {
      get: (n) => defined[n],
      define: (n, c) => {
        defined[n] = c;
      },
    },
    document: { documentElement: { lang: "en" }, createElement: () => ({}) },
    console: { info() {} },
    escape,
    unescape,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL("../src/wifi-card.js", import.meta.url), "utf8"), ctx);
  return {
    ctx,
    WifiQrCard: defined["wifi-qr-card"],
    WifiQrCardEditor: defined["wifi-qr-card-editor"],
    WifiQrMiniCard: defined["wifi-qr-mini-card"],
    WifiQrMiniCardEditor: defined["wifi-qr-mini-card-editor"],
  };
}

const { ctx, WifiQrCard, WifiQrCardEditor, WifiQrMiniCard, WifiQrMiniCardEditor } = loadCard();

// Renders the card's SVG to an RGBA bitmap (dark modules black, the rest white) and decodes it.
function decodeSvg(svg, scale = 8) {
  const dim = Number(/viewBox="0 0 (\d+) /.exec(svg)[1]);
  const size = dim * scale;
  const px = new Uint8ClampedArray(size * size * 4).fill(255);
  for (const [, x, y] of svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const i = ((Number(y) * scale + dy) * size + Number(x) * scale + dx) * 4;
        px[i] = 0;
        px[i + 1] = 0;
        px[i + 2] = 0;
      }
    }
  }
  const res = jsQR(px, size, size, { inversionAttempts: "dontInvert" });
  assert.ok(res, "QR code could not be decoded");
  return new TextDecoder().decode(Uint8Array.from(res.binaryData));
}

const roundTrip = (text) => decodeSvg(WifiQrCard.prototype._buildQrSvg(text, 176));

test("getLength counts UTF-8 bytes, surrogate pairs included", () => {
  for (const s of ["abc", "Café", "📶", "Café📶", "é📶", "日本"]) {
    assert.equal(new ctx.QR8bitByte(s).getLength(), Buffer.byteLength(s, "utf8"), s);
  }
});

test("wifiQrField escapes backslash, semicolon, comma, colon and double quote", () => {
  assert.equal(ctx.wifiQrField("pa;ss"), `pa${BS};ss`);
  assert.equal(ctx.wifiQrField(`a${BS}b`), `a${BS}${BS}b`);
  assert.equal(ctx.wifiQrField('"x"'), `${BS}"x${BS}"`);
  assert.equal(ctx.wifiQrField(":"), `${BS}:`);
  assert.equal(ctx.wifiQrField("a,b"), `a${BS},b`);
  assert.equal(ctx.wifiQrField("Café 📶"), "Café 📶");
});

test("wifiQrString leaves the password out of open networks", () => {
  assert.equal(ctx.wifiQrString({ security: "nopass", ssid: "a;b", password: "x" }), `WIFI:T:nopass;S:a${BS};b;P:;;`);
});

const cases = [
  ["pa;ss", `pa${BS};ss`],
  [`a${BS}b`, `a${BS}${BS}b`],
  ['"x"', `${BS}"x${BS}"`],
  [":", `${BS}:`],
  ["é📶", "é📶"],
];
for (const [password, escaped] of cases) {
  test(`QR round trip keeps the password ${JSON.stringify(password)}`, () => {
    const expected = `WIFI:T:WPA;S:Box;P:${escaped};;`;
    const str = ctx.wifiQrString({ security: "WPA", ssid: "Box", password });
    assert.equal(str, expected);
    assert.equal(roundTrip(str), expected);
  });
}

test("QR round trip keeps an SSID with an emoji and reserved characters", () => {
  const str = ctx.wifiQrString({ security: "SAE", ssid: "Café 📶;:", password: "pa;ss" });
  assert.equal(str, `WIFI:T:SAE;S:Café 📶${BS};${BS}:;P:pa${BS};ss;;`);
  assert.equal(roundTrip(str), str);
});

test("QR round trip across versions with multi-byte text", () => {
  for (const n of [1, 10, 40, 120]) {
    const s = `WIFI:T:WPA;S:${"📶é".repeat(n)};P:x;;`;
    assert.equal(roundTrip(s), s);
  }
});

test("security values are normalised and invalid ones rejected", () => {
  assert.equal(ctx.wifiQrSecurity(undefined), "WPA");
  assert.equal(ctx.wifiQrSecurity("wpa2"), "WPA");
  assert.equal(ctx.wifiQrSecurity("WPA3"), "SAE");
  assert.equal(ctx.wifiQrSecurity("nopass"), "nopass");
  assert.throws(() => ctx.wifiQrSecurity("WPA4"), /security must be/);
});

test("eye button has a translated accessible name and aria-pressed; the card QR is hidden from screen readers", () => {
  const els = {};
  const el = () => {
    const attrs = {};
    return { attrs, setAttribute: (k, v) => (attrs[k] = v), textContent: "" };
  };
  const card = new WifiQrCard();
  card.shadowRoot = {
    innerHTML: "",
    getElementById: (id) => (els[id] ||= el()),
  };
  card._configRaw = { ssid: "Box", password: "pa;ss", language: "en" };
  card._applyConfig(true);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<button id="btn" aria-label="Show password" aria-pressed="false">/);
  const qrs = html.match(/<svg [^>]*>/g).filter((t) => t.includes('aria-label="QR code"'));
  assert.equal(qrs.length, 2);
  assert.match(qrs[0], /aria-hidden="true"/);
  assert.doesNotMatch(qrs[1], /aria-hidden/);
  els.btn.onclick();
  assert.equal(els.btn.attrs["aria-pressed"], "true");
  assert.equal(els.btn.attrs["aria-label"], "Hide password");
  assert.equal(els.pwd.textContent, "pa;ss");
  els.btn.onclick();
  assert.equal(els.btn.attrs["aria-pressed"], "false");
  assert.equal(els.btn.attrs["aria-label"], "Show password");
});

test("an invalid security is refused by setConfig and never thrown from set hass", () => {
  const card = new WifiQrCard();
  card.attachShadow = () => {
    card.shadowRoot = { innerHTML: "", getElementById: () => ({ setAttribute() {} }) };
    return card.shadowRoot;
  };
  card.setConfig({ ssid: "Box", password: "secret" });
  card.hass = { language: "en" };
  assert.throws(() => card.setConfig({ ssid: "Box", password: "secret", security: "WPA4" }), /security must be/);
  // The card keeps the last valid configuration; a language change must not throw.
  assert.doesNotThrow(() => {
    card.hass = { language: "fr" };
  });
  assert.match(card.shadowRoot.innerHTML, /<svg /);
});

test("a password given as a YAML number is flagged once", () => {
  const warnings = [];
  const orig = ctx.console.warn;
  ctx.console.warn = (m) => warnings.push(m);
  try {
    const card = new WifiQrCard();
    card.attachShadow = () => {
      card.shadowRoot = { innerHTML: "", getElementById: () => ({ setAttribute() {} }) };
      return card.shadowRoot;
    };
    card.setConfig({ ssid: "Box", password: 1234567 });
    card.setConfig({ ssid: "Box", password: 1234567, title: "x" });
    card.setConfig({ ssid: "Box", password: "01234567" });
  } finally {
    ctx.console.warn = orig;
  }
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /quote/);
});

function renderWith(config) {
  const card = new WifiQrCard();
  card.attachShadow = () => {
    card.shadowRoot = { innerHTML: "", getElementById: () => ({ setAttribute() {} }) };
    return card.shadowRoot;
  };
  card.setConfig({ ssid: "Box", password: "secret", ...config });
  return card.shadowRoot.innerHTML;
}

test("a negative, zero or non-numeric qr_size keeps the default 176 px", () => {
  for (const qr_size of [-50, 0, "abc", "-10"]) {
    const html = renderWith({ qr_size });
    assert.match(html, /\.qr-wrap svg \{[^}]*width: 176px;/, String(qr_size));
    assert.doesNotMatch(html, /width="-|width:\s*-/, String(qr_size));
    assert.match(html, /<svg [^>]*width="176"/, String(qr_size));
  }
});

test("a positive qr_size sets the displayed size", () => {
  const html = renderWith({ qr_size: 220 });
  assert.match(html, /\.qr-wrap svg \{[^}]*width: 220px;/);
  assert.match(html, /<svg [^>]*width="220"/);
});

test("QR version 35 is built with the right alignment patterns", () => {
  // 1800 bytes: too long for version 34, fits version 35 (level M)
  const text = `WIFI:S:${"x".repeat(1800 - 7)}`;
  const svg = WifiQrCard.prototype._buildQrSvg(text, 176);
  // 17 + 4 * 35 modules plus a quiet zone of 4 on each side
  assert.equal(/viewBox="0 0 (\d+) /.exec(svg)[1], "165");
  assert.equal(decodeSvg(svg, 4), text);
  assert.deepEqual([...ctx.QRUtil.getPatternPosition(35)], [6, 30, 54, 78, 102, 126, 150]);
});

test("only a too-long payload moves to the next QR version; other errors are raised", () => {
  const Model = ctx.QRCodeModel;
  ctx.QRCodeModel = function () {
    this.addData = () => {};
    this.make = () => {
      throw new TypeError("boom");
    };
  };
  try {
    assert.throws(() => WifiQrCard.prototype._buildQrSvg("WIFI:S:Box;;", 176), /boom/);
  } finally {
    ctx.QRCodeModel = Model;
  }
  assert.throws(() => WifiQrCard.prototype._buildQrSvg("x".repeat(3000), 176), /too long/);
});

const LANGS = [
  "fr",
  "de",
  "es",
  "sr",
  "sr-Latn",
  "it",
  "nl",
  "pt",
  "pl",
  "ro",
  "da",
  "sv",
  "bg",
  "ru",
  "uk",
  "hu",
  "sk",
  "cs",
  "sl",
  "lv",
  "el",
];

test("I18N parity: every language has exactly the keys of en, arrays of the same length, placeholders included", () => {
  const i18n = ctx.WifiQrI18n;
  const shape = (o) =>
    Object.keys(o)
      .sort()
      .map((k) => (Array.isArray(o[k]) ? `${k}[${o[k].length}]` : k));
  const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort();
  assert.deepEqual(Object.keys(i18n).sort(), ["en", ...LANGS].sort());
  for (const lang of LANGS) {
    assert.ok(i18n[lang], `missing language ${lang}`);
    assert.deepEqual(shape(i18n[lang]), shape(i18n.en), lang);
    for (const [k, v] of Object.entries(i18n[lang])) {
      assert.ok(typeof v === "string" && v.trim(), `${lang}.${k} is empty`);
      assert.equal(v, v.trim(), `${lang}.${k} has surrounding spaces`);
      assert.deepEqual(ph(v), ph(i18n.en[k]), `${lang}.${k} placeholders`);
    }
  }
  assert.equal(ctx.wifiQrT("de", "password"), "Passwort");
  assert.equal(ctx.wifiQrT("es", "password"), "Contraseña");
  assert.equal(ctx.wifiQrT("it", "ed_language"), "Lingua");
  assert.equal(ctx.wifiQrT("nl", "password"), "Wachtwoord");
  assert.equal(ctx.wifiQrT("pt", "password"), "Palavra-passe");
  assert.equal(ctx.wifiQrT("pl", "password"), "Hasło");
  assert.equal(ctx.wifiQrT("ro", "password"), "Parolă");
  assert.equal(ctx.wifiQrT("da", "password"), "Adgangskode");
  assert.equal(ctx.wifiQrT("sv", "password"), "Lösenord");
  assert.equal(ctx.wifiQrT("bg", "password"), "Парола");
  assert.equal(ctx.wifiQrT("ru", "password"), "Пароль");
  assert.equal(ctx.wifiQrT("uk", "network"), "Мережа");
  assert.equal(ctx.wifiQrT("hu", "password"), "Jelszó");
  assert.equal(ctx.wifiQrT("sk", "network"), "Sieť");
  assert.equal(ctx.wifiQrT("cs", "network"), "Síť");
  assert.equal(ctx.wifiQrT("sl", "password"), "Geslo");
  assert.equal(ctx.wifiQrT("lv", "password"), "Parole");
  assert.equal(ctx.wifiQrT("el", "network"), "Δίκτυο");
});

test("editor: the language selector offers every translated language once", () => {
  const ed = new WifiQrCardEditor();
  ed._hass = { language: "en" };
  const field = ed._schema().find((f) => f.name === "language");
  const options = field.selector.select.options;
  assert.deepEqual([...options.map((o) => o.value)].sort(), [...Object.keys(ctx.WifiQrI18n)].sort());
  const labels = Object.fromEntries(options.map((o) => [o.value, o.label]));
  assert.equal(labels.it, "Italiano");
  assert.equal(labels.nl, "Nederlands");
  assert.equal(labels.pt, "Português (Portugal)");
  assert.equal(labels.pl, "Polski");
  assert.equal(labels.ro, "Română");
  assert.equal(labels.da, "Dansk");
  assert.equal(labels.sv, "Svenska");
  assert.equal(labels.bg, "Български");
  assert.equal(labels.ru, "Русский");
  assert.equal(labels.uk, "Українська");
  assert.equal(labels.hu, "Magyar");
  assert.equal(labels.sk, "Slovenčina");
  assert.equal(labels.cs, "Čeština");
  assert.equal(labels.sl, "Slovenščina");
  assert.equal(labels.lv, "Latviešu");
  assert.equal(labels.el, "Ελληνικά");
});

test("I18N script: no Latin letter in sr, no Cyrillic letter in sr-Latn (proper nouns and units aside)", () => {
  const strip = (s) => s.replace(/Home Assistant|WiFi|QR|SSID|WPA\d?|SAE|WEP|px/g, "");
  for (const [k, v] of Object.entries(ctx.WifiQrI18n.sr)) assert.doesNotMatch(strip(v), /\p{Script=Latin}/u, `sr.${k}`);
  for (const [k, v] of Object.entries(ctx.WifiQrI18n["sr-Latn"])) assert.doesNotMatch(v, /\p{Script=Cyrillic}/u, `sr-Latn.${k}`);
});

test("language resolution: full tag if translated, else the part before the dash, else en", () => {
  const cases = [
    ["fr-FR", "fr"],
    ["de-CH", "de"],
    ["sr-Latn", "sr-Latn"],
    ["sr", "sr"],
    ["it-IT", "it"],
    ["nl-BE", "nl"],
    ["pt", "pt"],
    // pt-BR falls back to European Portuguese (no pt-BR dictionary): assumed.
    ["pt-BR", "pt"],
    ["pl-PL", "pl"],
    ["ro-RO", "ro"],
    ["da-DK", "da"],
    ["sv-SE", "sv"],
    ["bg-BG", "bg"],
    ["ru-RU", "ru"],
    ["uk-UA", "uk"],
    ["hu-HU", "hu"],
    ["sk-SK", "sk"],
    ["cs-CZ", "cs"],
    ["sl-SI", "sl"],
    ["lv-LV", "lv"],
    ["el-GR", "el"],
    ["ja", "en"],
  ];
  for (const [language, expected] of cases) {
    assert.equal(ctx.wifiQrLang(language), expected, `wifiQrLang ${language}`);
    // HA locale, for the card and the editor
    const card = new WifiQrCard();
    card.hass = { language };
    card._configRaw = { ssid: "Box" };
    assert.equal(card._getLang(), expected, `card hass ${language}`);
    const ed = new WifiQrCardEditor();
    ed._hass = { language };
    assert.equal(ed._lang(), expected, `editor ${language}`);
    // Forced language
    card._configRaw = { ssid: "Box", language };
    assert.equal(card._getLang(), expected, `card language ${language}`);
  }
  // Priority kept: the card's language option wins over the HA language.
  const card = new WifiQrCard();
  card.hass = { language: "fr-FR" };
  card._configRaw = { ssid: "Box", language: "sr-Latn" };
  assert.equal(card._getLang(), "sr-Latn");
  assert.equal(ctx.wifiQrT(card._getLang(), "password"), "Lozinka");
});

// Feeds successive form values to the editor and returns the config it emits each time.
function editorSteps(start, steps) {
  const ed = new WifiQrCardEditor();
  ed._config = start;
  ed.dispatchEvent = () => {};
  return steps.map((value) => {
    ed._valueChanged({ stopPropagation() {}, detail: { value: { ...ed._config, ...value } } });
    return ed._config;
  });
}

test("editor: the stashed password is restored once on nopass -> WPA, then the field can be cleared", () => {
  const start = { type: "custom:wifi-qr-card", ssid: "Box", password: "secret", security: "WPA" };
  const [open, back, cleared, retyped] = editorSteps(start, [
    { security: "nopass" },
    { security: "WPA", password: "" },
    { password: "" },
    { password: "n" },
  ]);
  assert.equal(open.password, undefined);
  assert.equal(back.password, "secret");
  assert.equal(cleared.password, undefined);
  assert.equal(retyped.password, "n");
});

test("editor: clearing the password without a nopass round trip keeps it empty", () => {
  const start = { type: "custom:wifi-qr-card", ssid: "Box", password: "secret" };
  const [cleared] = editorSteps(start, [{ password: "" }]);
  assert.equal(cleared.password, undefined);
});

test("a forced language is normalised like the HA locale", () => {
  const card = new WifiQrCard();
  for (const [language, expected] of [["de-AT", "de"], ["es-MX", "es"], ["FR", "fr"], ["en", "en"]]) {
    card._configRaw = { ssid: "Box", language };
    assert.equal(card._getLang(), expected, language);
  }
});

// Card with a stub shadow root whose elements survive re-renders, like ids looked up again.
function stubCard() {
  const els = {};
  const card = new WifiQrCard();
  card.attachShadow = () => {
    card.shadowRoot = {
      innerHTML: "",
      getElementById: (id) =>
        (els[id] ||= {
          attrs: {},
          style: {},
          open: false,
          offsetHeight: 300,
          setAttribute(k, v) {
            this.attrs[k] = v;
          },
          showModal() {
            this.open = true;
          },
          close() {
            this.open = false;
          },
        }),
    };
    return card.shadowRoot;
  };
  card.getBoundingClientRect = () => ({ top: 120 });
  return { card, els };
}

test("a HA language change keeps the zoom open and the password revealed", () => {
  const { card, els } = stubCard();
  card.setConfig({ ssid: "Box", password: "secret" });
  card.hass = { language: "en" };
  els.btn.onclick();
  els.qr.onclick();
  card.hass = { language: "fr" };
  assert.match(card.shadowRoot.innerHTML, /Mot de passe/);
  assert.equal(els.zoom.open, true);
  assert.equal(els.pwd.textContent, "secret");
  assert.equal(els.btn.attrs["aria-pressed"], "true");
  assert.equal(els.btn.attrs["aria-label"], "Masquer le mot de passe");
});

test("a forced language is not re-rendered on a HA language change", () => {
  const { card } = stubCard();
  card.setConfig({ ssid: "Box", password: "secret", language: "de" });
  card.hass = { language: "en" };
  card.shadowRoot.innerHTML = "untouched";
  card.hass = { language: "fr" };
  assert.equal(card.shadowRoot.innerHTML, "untouched");
});

test("the zoom dialog opens at the top of the card, kept on screen", () => {
  const { card, els } = stubCard();
  card.setConfig({ ssid: "Box", password: "secret" });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /dialog \{[^}]*margin: auto;/);
  ctx.window.innerHeight = 800;
  els.qr.onclick();
  assert.equal(els.zoom.style.marginTop, "120px");
  els.zoom.close();
  card.getBoundingClientRect = () => ({ top: 700 });
  els.qr.onclick();
  assert.equal(els.zoom.style.marginTop, "492px");
  els.zoom.close();
  card.getBoundingClientRect = () => ({ top: -400 });
  els.qr.onclick();
  assert.equal(els.zoom.style.marginTop, "8px");
});

// Renders the editor with a stub ha-form and returns the data it shows.
function editorData(config) {
  const ed = new WifiQrCardEditor();
  ed._form = {};
  ed._hass = { language: "en" };
  ed._config = { ...config };
  ed._render();
  return { ed, data: ed._form.data };
}

test("editor: a YAML security alias is shown as the matching select option", () => {
  for (const [alias, expected] of [
    ["wpa2", "WPA"],
    ["wpa", "WPA"],
    ["WPA/WPA2", "WPA"],
    ["wpa3", "SAE"],
    ["sae", "SAE"],
    ["wep", "WEP"],
    ["none", "nopass"],
    ["open", "nopass"],
    ["NOPASS", "nopass"],
  ]) {
    const { ed, data } = editorData({ type: "custom:wifi-qr-card", ssid: "Box", security: alias });
    assert.equal(data.security, expected, alias);
    // Only shown normalised: the config is left as written until the user changes something.
    assert.equal(ed._config.security, alias, alias);
  }
});

test("editor: no security shows WPA, an unknown value is shown as written", () => {
  assert.equal(editorData({ ssid: "Box" }).data.security, "WPA");
  assert.equal(editorData({ ssid: "Box", security: "" }).data.security, "WPA");
  assert.equal(editorData({ ssid: "Box", security: "foo" }).data.security, "foo");
});

test("editor: editing another field after a YAML alias saves a valid security", () => {
  const { ed } = editorData({ type: "custom:wifi-qr-card", ssid: "Box", password: "secret", security: "wpa3" });
  ed.dispatchEvent = () => {};
  ed._valueChanged({ stopPropagation() {}, detail: { value: { ...ed._form.data, title: "Guests" } } });
  assert.equal(ed._config.security, "SAE");
  assert.equal(ed._config.password, "secret");
  assert.equal(ed._config.title, "Guests");
});

// Body of the first CSS rule whose selector is exactly `sel` in the rendered <style>.
function cssRule(html, sel) {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:^|[\\s}])${esc}\\s*\\{([^}]*)\\}`).exec(html);
  assert.ok(m, `no CSS rule for ${sel}`);
  return m[1];
}
const px = (body, prop) => {
  const m = new RegExp(`(?:^|[;\\s])${prop}:\\s*([^;]+);`).exec(body);
  return m ? m[1].trim().split(/\s+/).map((v) => Number.parseFloat(v)) : null;
};

test("open network: the message wraps between words, the SSID and password still break anywhere", () => {
  const html = renderWith({ security: "nopass", language: "pl" });
  assert.match(html, /<div class="msg">Sieć otwarta \(bez hasła\)<\/div>/);
  assert.doesNotMatch(html, /<div class="val">Sieć otwarta/);
  const msg = cssRule(html, ".msg");
  assert.match(msg, /word-break: normal;/);
  assert.match(msg, /overflow-wrap: anywhere;/);
  assert.match(msg, /font-family: inherit;/);
  assert.match(cssRule(html, ".val"), /word-break: break-all;/);
});

test("eye button: target of at least 24x24 px without making the Password row taller", () => {
  const body = cssRule(renderWith({}), "button");
  const [pad] = px(body, "padding");
  const [mv, mh = mv] = px(body, "margin");
  const icon = 22;
  assert.ok(icon + 2 * pad >= 24, `target ${icon + 2 * pad} px`);
  // The vertical negative margin absorbs the padding: the button takes no more height than the icon.
  assert.ok(icon + 2 * pad + 2 * mv <= icon, "row height grows");
  assert.ok(mh <= 0 && -mh <= pad, "horizontal margin must not push the icon outside the row padding");
  assert.match(body, /flex: none;/);
});

test("masked password stays on one line; the revealed password wraps again", () => {
  const { card, els } = stubCard();
  card.setConfig({ ssid: "Box", password: "secret" });
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<div class="val masked" id="pwd">/);
  const masked = cssRule(html, ".val.masked");
  assert.match(masked, /white-space: nowrap;/);
  assert.match(masked, /overflow: hidden;/);
  assert.match(cssRule(html, ".pwd-row .val"), /min-width: 0;/);
  els.btn.onclick();
  assert.equal(els.pwd.className, "val");
  assert.equal(els.pwd.textContent, "secret");
  els.btn.onclick();
  assert.equal(els.pwd.className, "val masked");
  // A re-render with the password revealed keeps it unmasked.
  els.btn.onclick();
  card.hass = { language: "fr" };
  assert.equal(els.pwd.className, "val");
});

test("header: the title keeps a few characters and its full text is readable in a tooltip", () => {
  const html = renderWith({ title: `Wi-Fi <"guests"> & 'co'`, language: "pl" });
  assert.match(html, /<div class="name" title="Wi-Fi &lt;&quot;guests&quot;&gt; &amp; &#39;co&#39;">Wi-Fi &lt;/);
  const titles = cssRule(html, ".titles");
  // Basis 0: the title block takes only the room left by the badge, never more.
  assert.match(titles, /flex: 1 1 0;/);
  assert.match(titles, /min-width: 4ch;/);
  assert.match(cssRule(html, ".badge"), /flex: none;/);
  // Default title, translated, gets the tooltip too.
  assert.match(renderWith({ language: "sr-Latn" }), /<div class="name" title="WiFi za goste">/);
  // The security subtitle, also truncated on narrow cards (« Brak (sieć otwa… »).
  assert.match(renderWith({ security: "nopass", language: "pl" }), /<div class="sub" title="Brak \(sieć otwarta\)">/);
});

test("header at phone width (4 columns, ~104 px card): a smaller badge leaves 4 title characters, nothing overflows", () => {
  const html = renderWith({ language: "pl" });
  // The container is the header (as wide as the card), never the host nor ha-card: an inline-size
  // container has no intrinsic width and would collapse the card in an auto-width parent.
  assert.match(cssRule(html, ".header"), /container-type: inline-size;/);
  assert.match(cssRule(html, ".header"), /width: 100%;/);
  assert.doesNotMatch(cssRule(html, ":host"), /container/);
  assert.doesNotMatch(cssRule(html, "ha-card"), /container/);
  const m = /@container \(max-width: (\d+)px\) \{([\s\S]*?)\n\s*\}/.exec(html);
  assert.ok(m, "no @container rule for narrow headers");
  const header = 104 - 2 * 12 - 2; // card width minus ha-card padding and border
  assert.ok(Number(m[1]) >= header, `@container ${m[1]}px does not reach the ${header} px header`);
  const [badge] = px(cssRule(m[2], ".badge"), "width");
  const hrow = cssRule(m[2], ".hrow");
  const [gap] = px(hrow, "gap");
  const [ml = 0] = px(hrow, "margin-left") || [];
  assert.ok(ml <= 0 && -ml < 12, "the row may only borrow part of the 12 px card padding");
  const [font] = px(cssRule(m[2], ".name"), "font-size");
  const fourChars = font * 3; // "Gues…" measures 42 px in a 14 px Roboto/Arial title, 48 px at 16 px
  const room = header - ml - badge - gap;
  assert.ok(fourChars < room, `badge ${badge} + gap ${gap} leaves ${room} px for "Gues…"`);
  // Declared after the rules it overrides, otherwise the base rules win on source order.
  for (const sel of [".hrow {", ".badge {", ".name {"]) assert.ok(html.indexOf(sel) < m.index, `${sel} is declared after @container`);
  // At normal widths the badge keeps the 40 px of the other ha-* cards.
  assert.deepEqual(px(cssRule(html, ".badge"), "width"), [40]);
});

test("focus is never moved with scrolling: every focus() call passes preventScroll", () => {
  const src = readFileSync(new URL("../src/wifi-card.js", import.meta.url), "utf8");
  const calls = src.match(/\.focus\([^)]*\)/g) || [];
  for (const c of calls) assert.match(c, /preventScroll: true/, c);
});

// ── Mini card ─────────────────────────────────────────────────────────────────

// Mini card with a stub shadow root whose elements survive re-renders (looked up again by id).
function stubMini(config) {
  const els = {};
  const attrs = {};
  const card = new WifiQrMiniCard();
  card.setAttribute = (k, v) => (attrs[k] = v);
  card.attachShadow = () => {
    card.shadowRoot = {
      innerHTML: "",
      getElementById: (id) =>
        (els[id] ||= {
          attrs: {},
          style: {},
          open: false,
          offsetHeight: 300,
          setAttribute(k, v) {
            this.attrs[k] = v;
          },
          showModal() {
            this.open = true;
          },
          close() {
            this.open = false;
          },
          focus(opts) {
            this.focused = opts;
          },
        }),
    };
    return card.shadowRoot;
  };
  card.getBoundingClientRect = () => ({ top: 0 });
  card.setConfig({ ssid: "Home-Guests", password: "secret-pass", language: "en", ...config });
  return { card, els, attrs };
}
const click = (el, detail = 1) => el.onclick({ detail, stopPropagation() {} });

test("mini card: one compact row, QR thumbnail and detail button, never the password", () => {
  const { card, attrs } = stubMini({ title: "Guests" });
  const html = card.shadowRoot.innerHTML;
  assert.equal(attrs.mini, "");
  assert.match(html, /<ha-card class="mini">/);
  assert.match(html, /<div class="name" title="Guests">Guests<\/div>/);
  assert.match(html, /<div class="sub" title="Home-Guests">Home-Guests<\/div>/);
  assert.doesNotMatch(html.replace(/<dialog[\s\S]*<\/dialog>/, ""), /secret-pass|id="pwd"|Password/);
  // The thumbnail: the big QR code's colours, a rounded 64 px tile, a button to the full screen QR (its dialog).
  assert.match(html, /<div class="thumb" id="qr" role="button" tabindex="0" title="Enlarge QR code" aria-label="Enlarge QR code"><svg aria-hidden="true" [^>]*width="64"/);
  assert.match(html, /<dialog id="zoom" aria-label="Enlarge QR code"><svg /);
  assert.match(cssRule(html, ".thumb"), /width: 64px; height: 64px; background: #64B5F6; border-radius: 8px;/);
  assert.match(html, /<button class="zoom" id="zbtn" title="Show the full card" aria-label="Show the full card"><ha-icon icon="mdi:arrow-expand">/);
  assert.match(cssRule(html, ".zoom"), /all: unset;[^}]*width: 24px; height: 24px;[^}]*border-radius: 50%;[^}]*color: var\(--secondary-text-color\);/);
  assert.doesNotMatch(cssRule(html, ".zoom"), /background/);
  // The full card's 40 px badge and 24 px glyph, not reduced in the compact view.
  assert.deepEqual(px(cssRule(html, ".badge"), "width"), [40]);
  assert.deepEqual(px(cssRule(html, ".badge .logo"), "width"), [24]);
  // The QR thumbnail still encodes the network.
  const svg = /<div class="thumb"[^>]*>(<svg[\s\S]*?<\/svg>)/.exec(html)[1];
  assert.equal(decodeSvg(svg), "WIFI:T:WPA;S:Home-Guests;P:secret-pass;;");
});

test("mini card: only its compact ha-card is a size container, the host keeps a width in shrink-to-fit parents", () => {
  const { card, els } = stubMini();
  let html = card.shadowRoot.innerHTML;
  assert.match(cssRule(html, "ha-card.mini"), /container-type: inline-size;/);
  assert.match(cssRule(html, ":host([mini])"), /display: block; min-width: 0;/);
  assert.match(cssRule(html, ":host([mini])::before"), /grid-template-columns: minmax\(0, 240px\); height: 0;/);
  const m = /@container \(max-width: 200px\) \{([\s\S]*?)\n\s*\}/.exec(html);
  assert.ok(m, "no narrow rule");
  assert.deepEqual(px(cssRule(m[1], ".thumb"), "width"), [48]);
  assert.match(cssRule(html, ".name"), /text-overflow: ellipsis;/);
  // Zoomed: the full card, whose ha-card is never a size container.
  click(els.zbtn);
  html = card.shadowRoot.innerHTML;
  assert.doesNotMatch(cssRule(html, "ha-card"), /container/);
  assert.doesNotMatch(html, /class="mini"/);
  // The full card alone has neither the mini styles nor a detail button.
  const full = renderWith({});
  assert.doesNotMatch(full, /:host\(\[mini\]\)|class="zoom"/);
});

test("mini card: the detail button switches to the full card and back; the thumbnail opens the full screen QR", () => {
  const { card, els } = stubMini();
  assert.deepEqual({ ...card.getGridOptions() }, { columns: 6, min_columns: 6 });
  assert.equal(card.getCardSize(), 2);
  click(els.zbtn);
  let html = card.shadowRoot.innerHTML;
  assert.match(html, /id="pwd"/);
  assert.match(html, /<button class="zoom" id="zbtn" title="Back to the compact view" aria-label="Back to the compact view"><ha-icon icon="mdi:arrow-collapse">/);
  assert.deepEqual({ ...card.getGridOptions() }, { ...WifiQrCard.prototype.getGridOptions() });
  assert.equal(card.getCardSize(), WifiQrCard.prototype.getCardSize());
  click(els.zbtn);
  html = card.shadowRoot.innerHTML;
  assert.match(html, /class="mini"/);
  assert.equal(card.getCardSize(), 2);
  // A tap on the thumbnail opens the QR code full screen directly; the card stays compact.
  els.qr.onclick();
  assert.equal(els.zoom.open, true);
  assert.match(card.shadowRoot.innerHTML, /class="mini"/);
  els.zoom.close();
  let prevented = false;
  els.qr.onkeydown({ key: "Enter", preventDefault: () => (prevented = true) });
  assert.equal(els.zoom.open, true);
  assert.ok(prevented);
});

test("mini card: the detail button keeps the keyboard focus, a mouse click does not move it", () => {
  const { els } = stubMini();
  click(els.zbtn, 1);
  assert.equal(els.zbtn.focused, undefined);
  click(els.zbtn, 0);
  assert.deepEqual({ ...els.zbtn.focused }, { preventScroll: true });
});

test("mini card: zoom: false removes the detail button", () => {
  const { card, els } = stubMini({ zoom: false });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="zoom"/);
  // The thumbnail still opens the full screen QR.
  els.qr.onclick();
  assert.equal(els.zoom.open, true);
});

test("mini card: a click outside the card brings the compact view back, not one inside it or in a dialog", () => {
  const listeners = [];
  const doc = ctx.document;
  doc.addEventListener = (type, fn, capture) => listeners.push({ type, fn, capture });
  doc.removeEventListener = (type, fn, capture) => {
    const i = listeners.findIndex((l) => l.type === type && l.fn === fn && l.capture === capture);
    if (i >= 0) listeners.splice(i, 1);
  };
  try {
    const { card, els } = stubMini();
    card.connectedCallback();
    assert.equal(listeners.length, 1);
    assert.equal(listeners[0].type, "click");
    assert.equal(listeners[0].capture, true);
    const fire = (...path) => listeners[0].fn({ composedPath: () => path });
    click(els.zbtn);
    fire({ localName: "button" }, card, { localName: "body" });
    assert.equal(card._zoomed, true, "a click inside the card");
    fire({ localName: "div" }, { localName: "ha-more-info-dialog" }, { localName: "body" });
    assert.equal(card._zoomed, true, "a click in a dialog");
    fire({ localName: "div" }, { localName: "body" });
    assert.equal(card._zoomed, false);
    assert.match(card.shadowRoot.innerHTML, /class="mini"/);
    card.disconnectedCallback();
    assert.equal(listeners.length, 0);
  } finally {
    delete doc.addEventListener;
    delete doc.removeEventListener;
  }
});

test("mini card: the mini attribute is set by setConfig, never by the constructor", () => {
  const src = readFileSync(new URL("../src/wifi-card.js", import.meta.url), "utf8");
  const cls = src.slice(src.indexOf("class WifiQrMiniCard extends"), src.indexOf("// ── wifi-qr-card-editor"));
  const ctor = /constructor\(\) \{([\s\S]*?)\n {2}\}/.exec(cls)[1];
  assert.doesNotMatch(ctor, /setAttribute/);
  assert.match(/setConfig\(config\) \{([\s\S]*?)\n {2}\}/.exec(cls)[1], /setAttribute\?\.\('mini', ''\)/);
});

test("mini card: registered in the card picker with a translated name", () => {
  const entry = ctx.customCards.find((c) => c.type === "wifi-qr-mini-card");
  assert.ok(entry, "not registered");
  assert.equal(entry.name, "Wifi QR Mini Card");
  assert.equal(entry.description, ctx.WifiQrI18n.en.mini_desc);
  assert.equal(entry.preview, true);
  assert.equal(WifiQrMiniCard.getConfigElement.toString().includes("wifi-qr-mini-card-editor"), true);
  for (const lang of Object.keys(ctx.WifiQrI18n)) {
    if (lang === "en") continue;
    for (const k of ["zoom_in", "zoom_out", "ed_zoom", "mini_name", "mini_desc"])
      assert.notEqual(ctx.WifiQrI18n[lang][k], ctx.WifiQrI18n.en[k], `${lang}.${k} is not translated`);
  }
});

test("editor: the zoom toggle is only in the mini card editor, its default left out of the YAML", () => {
  const names = (ed) => {
    ed._hass = { language: "en" };
    return ed._schema().map((f) => f.name);
  };
  assert.ok(!names(new WifiQrCardEditor()).includes("zoom"));
  assert.ok(names(new WifiQrMiniCardEditor()).includes("zoom"));
  const ed = new WifiQrMiniCardEditor();
  ed._form = {};
  ed._hass = { language: "en" };
  ed._config = { type: "custom:wifi-qr-mini-card", ssid: "Box", password: "secret" };
  ed._render();
  assert.equal(ed._form.data.zoom, true);
  assert.equal(ed._form.computeLabel({ name: "zoom" }), "Detail button");
  ed.dispatchEvent = () => {};
  ed._valueChanged({ stopPropagation() {}, detail: { value: { ...ed._form.data } } });
  assert.equal("zoom" in ed._config, false);
  ed._valueChanged({ stopPropagation() {}, detail: { value: { ...ed._form.data, zoom: false } } });
  assert.equal(ed._config.zoom, false);
  // The full card's editor neither shows nor writes it.
  const full = new WifiQrCardEditor();
  full._form = {};
  full._hass = { language: "en" };
  full._config = { ssid: "Box", password: "secret" };
  full._render();
  assert.equal("zoom" in full._form.data, false);
});
