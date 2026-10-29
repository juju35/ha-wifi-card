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
  return { ctx, WifiQrCard: defined["wifi-qr-card"], WifiQrCardEditor: defined["wifi-qr-card-editor"] };
}

const { ctx, WifiQrCard, WifiQrCardEditor } = loadCard();

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

test("I18N parity: every language has exactly the keys of en, placeholders included", () => {
  const i18n = ctx.WifiQrI18n;
  const ref = Object.keys(i18n.en).sort();
  for (const lang of ["fr", "de", "es"]) {
    assert.ok(i18n[lang], `missing language ${lang}`);
    assert.deepEqual(Object.keys(i18n[lang]).sort(), ref, lang);
    for (const k of ref) {
      const ph = (s) => (s.match(/\{\w+\}/g) || []).sort();
      assert.deepEqual(ph(i18n[lang][k]), ph(i18n.en[k]), `${lang}.${k}`);
    }
  }
  assert.equal(ctx.wifiQrT("de", "password"), "Passwort");
  assert.equal(ctx.wifiQrT("es", "password"), "Contraseña");
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
