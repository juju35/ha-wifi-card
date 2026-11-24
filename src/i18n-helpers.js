// ── i18n ──────────────────────────────────────────────────────────────────────
import { QRErrorCorrectLevel, QRRSBlock, QRUtil } from "./qr-code-engine.js";
import { WifiQrI18n } from "./i18n/wifiqri18n.js";

export function wifiQrEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Resolves a language tag to a WifiQrI18n key: the full tag when it is translated (sr-Latn),
// else the part before the dash (fr-FR → fr), else en. Case-insensitive (FR, sr-latn).
export function wifiQrLang(tag) {
  if (tag == null || tag === '') return 'en';
  var codes = Object.keys(WifiQrI18n);
  var find = (t) => codes.find((code) => code.toLowerCase() === t.toLowerCase());
  var raw = String(tag);
  return find(raw) || find(raw.split('-')[0]) || 'en';
}

export function wifiQrT(lang, key) {
  var strings = WifiQrI18n[lang] || WifiQrI18n.en;
  return strings[key] || WifiQrI18n.en[key] || key;
}

export var SECURITY_KEYS = { WPA: 'sec_wpa', SAE: 'sec_sae', WEP: 'sec_wep', nopass: 'sec_nopass' };
// Spellings people write in YAML, mapped to the T: values phones understand.
export var SECURITY_ALIASES = { wpa: 'WPA', wpa2: 'WPA', 'wpa/wpa2': 'WPA', sae: 'SAE', wpa3: 'SAE', wep: 'WEP', nopass: 'nopass', none: 'nopass', open: 'nopass' };

export function wifiQrSecurity(value) {
  if (value == null || value === '') return 'WPA';
  var sec = SECURITY_ALIASES[String(value).toLowerCase()];
  if (!sec) throw new Error('security must be WPA, SAE, WEP or nopass');
  return sec;
}

// For the editor: the select option matching what the card does, or the value as written
// when the card would reject it (so the error stays visible instead of being masked).
export function wifiQrEditorSecurity(value) {
  try {
    return wifiQrSecurity(value);
  } catch (_err) {
    return value;
  }
}

// Escapes the characters reserved by the WIFI: format (backslash, ; , : and ").
export function wifiQrField(s) {
  return String(s).replace(/([\\;,:"])/g, '\\$1');
}

export function wifiQrString(c) {
  var isOpen = c.security === 'nopass';
  // H:true tells the phone the network does not broadcast its SSID, so it joins it anyway.
  return `WIFI:T:${c.security};S:${wifiQrField(c.ssid)};P:${isOpen ? '' : wifiQrField(c.password)};${c.hidden ? 'H:true;' : ''};`;
}

// The state of an entity giving the SSID or the password, or null while it has none (unknown, unavailable, empty).
export function wifiQrEntityValue(hass, id) {
  var state = hass?.states?.[id]?.state;
  return state == null || state === '' || state === 'unknown' || state === 'unavailable' ? null : String(state);
}

// Smallest QR version (level M, single 8-bit segment) whose data area fits `bytes`
// bytes, computed from the library's own RS block table. Lets _buildQrSvg start at
// the right version instead of building and discarding up to 39 undersized models.
export function wifiQrMinVersion(bytes) {
  for (var t = 1; t <= 40; t++) {
    var blocks = QRRSBlock.getRSBlocks(t, QRErrorCorrectLevel.M);
    var capacity = 0;
    for (var i = 0; i < blocks.length; i++) capacity += blocks[i].dataCount;
    // 4 mode bits + the version-dependent length field, then the payload itself.
    if (4 + QRUtil.getLengthInBits(4, t) + bytes * 8 <= capacity * 8) return t;
  }
  return 40;
}
