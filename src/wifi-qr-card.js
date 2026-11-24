// ── wifi-qr-card ──────────────────────────────────────────────────────────────
// The status pill's place, decided by measurement after each render and each new width (the same rule on every
// card): on the title row, right after the title, only when the whole title and the pill's whole label fit there;
// otherwise on its own line under the subtitle (one line), the title whole on its row (cut only when it does not fit
// alone). When the label is still cut there, or the text block leaves the banner or runs over its ground strip, the
// pill keeps its dot alone, on the title row (its label stays in title and aria-label). A header of 200 px or less
// shows the dot alone anyway (CSS), beside the title.
import { WIFI_BLUE, WIFI_PWD_REVEAL_MS } from "./card-picker.js";
import { WIFI_LOGO } from "./wifi-icon.js";
import { WIFI_BANNER_STYLE, WIFI_BRAND_STYLE, WIFI_PILL_STYLE, WIFI_STATUS_CLASS, wifiQrIsNight, wifiQrSceneSvg } from "./illustrated-header.js";
import { QRCodeModel, QRErrorCorrectLevel } from "./qr-code-engine.js";
import { SECURITY_KEYS, wifiQrEntityValue, wifiQrEsc, wifiQrLang, wifiQrMinVersion, wifiQrSecurity, wifiQrString, wifiQrT } from "./i18n-helpers.js";

export function wifiPlacePill(head, row, ground) {
  if (!head) return;
  head.removeAttribute('data-wrap');
  head.removeAttribute('data-dot');
  var pill = row.querySelector(':scope > .chip');
  var text = pill?.querySelector('.ptxt');
  if (!text?.getBoundingClientRect || text.getBoundingClientRect().width <= 1) return;
  var name = row.querySelector(':scope > .name');
  var gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  var title = name && name.textContent ? (name.scrollWidth > name.clientWidth ? name.scrollWidth : name.getBoundingClientRect().width) + gap : 0;
  if (title + pill.getBoundingClientRect().width <= row.getBoundingClientRect().width + 0.5) return;
  head.setAttribute('data-wrap', '');
  var box = row.parentElement.getBoundingClientRect();
  var frame = head.getBoundingClientRect();
  var out = ground && (box.bottom > ground.getBoundingClientRect().top + 0.5 || box.top < frame.top - 0.5);
  if (text.scrollWidth > text.clientWidth + 0.5 || out) {
    head.removeAttribute('data-wrap');
    head.setAttribute('data-dot', '');
  }
}

// Shadow DOM patching: a redraw updates the nodes already on the page (text, attributes, classes) instead of replacing
// them, so that a state update never re-creates the pictures (SVG scenes, logos) nor restarts their animations, and the
// card keeps its height (a re-created card is laid out again, which can move the dashboard under the reader's eyes).
// An open <dialog> keeps its `open` state: it is driven by showModal() / close().
export function wifiQrMorphAttrs(cur, next) {
  for (var a of Array.from(cur.attributes)) {
    if (!next.hasAttribute(a.name) && !(a.name === 'open' && cur.localName === 'dialog')) cur.removeAttribute(a.name);
  }
  for (var b of Array.from(next.attributes)) {
    if (cur.getAttribute(b.name) === b.value) continue;
    if (b.namespaceURI) cur.setAttributeNS(b.namespaceURI, b.name, b.value);
    else cur.setAttribute(b.name, b.value);
  }
}

// A Home Assistant element given no content (<ha-icon>…) draws itself: what it adds to its own node is not ours to
// remove. It is kept as long as the attributes the HTML gives it do not change, and replaced when they do.
export function wifiQrMorphOwnDrawn(o, n) {
  if (!n.localName.includes('-') || n.firstChild) return false;
  var key = Array.from(n.attributes, (a) => `${a.name}=${a.value}`).join('\n');
  if (o.__morphKey === undefined && Array.from(n.attributes).every((a) => o.getAttribute(a.name) === a.value)) o.__morphKey = key;
  if (o.__morphKey !== key) {
    n.__morphKey = key;
    o.parentNode.replaceChild(n, o);
  }
  return true;
}

export function wifiQrMorphChildren(cur, next) {
  var old = Array.from(cur.childNodes);
  var fresh = Array.from(next.childNodes);
  fresh.forEach((n, i) => {
    var o = old[i];
    var ref = cur.childNodes[i] || null;
    if (!o || o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) {
      cur.insertBefore(n, ref);
      return;
    }
    if (o !== ref) cur.insertBefore(o, ref);
    if (n.nodeType !== 1) {
      if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
    } else if (!wifiQrMorphOwnDrawn(o, n)) {
      wifiQrMorphAttrs(o, n);
      wifiQrMorphChildren(o, n);
    }
  });
  while (cur.childNodes.length > fresh.length) cur.removeChild(cur.lastChild);
}

// Gives `root` (a shadow root or an element) the content of `html`, patching what is already there (a plain
// innerHTML where there is no DOM to patch, as in the unit tests' stubs).
export function wifiQrMorph(root, html) {
  var tpl = root.childNodes && typeof document !== 'undefined' && document.createElement?.('template');
  if (!tpl?.content) {
    root.innerHTML = html;
    return;
  }
  tpl.innerHTML = html;
  wifiQrMorphChildren(root, tpl.content);
}

export class WifiQrCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('wifi-qr-card-editor');
  }

  static getStubConfig() {
    return { ssid: 'MyNetwork-Guest', password: 'MySecretPassword' };
  }

  setConfig(config) {
    if ((config.ssid == null || config.ssid === '') && !config.ssid_entity) throw new Error('ssid or ssid_entity is required');
    // Validated before the config is kept: an invalid value must not reach set hass later.
    var security = wifiQrSecurity(config.security);
    if (config.illustration_theme != null && !['auto', 'day', 'night'].includes(config.illustration_theme)) {
      throw new Error('illustration_theme must be auto, day or night');
    }
    if ((config.password == null || config.password === '') && security !== 'nopass' && !config.password_entity) {
      throw new Error('password or password_entity is required');
    }
    // YAML reads an unquoted 01234567 as the number 1234567: the leading zero is lost before
    // the card sees it, so the most we can do is point at the quotes.
    if (typeof config.password === 'number' && !this._warnedNumber) {
      this._warnedNumber = true;
      console.warn('wifi-qr-card: password is a number; quote it in YAML if it starts with 0 (password: "01234567")');
    }
    this._configRaw = config;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._applyConfig(true);
  }

  set hass(hass) {
    var prevLang = this._configRaw ? this._getLang() : null;
    var prevStates = this._entityStates();
    var prevNight = this._isNight();
    this._hass = hass;
    // Resolved by wifiQrLang: sr-Latn is kept, a regional locale (fr-BE, en-GB…) falls back to its base.
    this._hassLang = hass?.language ? wifiQrLang(hass.language) : null;
    // Re-render only when the language actually shown changes (not with a forced `language`), or the
    // state of the `ssid_entity` / `password_entity`.
    if (this._configRaw && (prevLang !== this._getLang() || prevStates !== this._entityStates() || prevNight !== this._isNight())) this._applyConfig();
  }

  // The banner's night picture (only tracked while the illustration is shown).
  _isNight() {
    var raw = this._configRaw;
    return !!raw && raw.illustration !== false && wifiQrIsNight(this._hass, raw);
  }

  // The header's status: err (no value from the entity, or no QR code), warn (open or WEP network), else ok.
  _status() {
    var sec = this._config?.security;
    return sec === 'nopass' || sec === 'WEP' ? 'warn' : 'ok';
  }

  // The pill's label: Unavailable (error), Open (no password), Weak (WEP), else Secured.
  _pillKey(status) {
    if (status === 'err') return 'st_err';
    if (status === 'warn') return this._config?.security === 'nopass' ? 'st_open' : 'st_weak';
    return 'st_ok';
  }

  // The header's title and status pill on one row, the subtitle under them.
  _titlesHtml(status, title, sub) {
    var label = wifiQrEsc(this._t(this._pillKey(status)));
    return `<div class="titles">
            <div class="trow"><div class="name" title="${title}">${title}</div><span class="chip" title="${label}" aria-label="${label}"><span class="dot"></span><span class="ptxt">${label}</span></span></div>
            <div class="sub" title="${sub}">${sub}</div>
          </div>`;
  }

  // The round header icon: the MDI QR code, in the status colour, with the WiFi logo as a badge (`logo: false` removes it).
  _iconHtml() {
    return `<ha-icon icon="mdi:qrcode"></ha-icon>${this._config?.logo ? `<span class="brand">${WIFI_LOGO}</span>` : ''}`;
  }

  // The full card's header: the illustrated banner, or the classic header with `illustration: false`.
  _headerHtml(status, title, sub) {
    var st = WIFI_STATUS_CLASS[status];
    var texts = this._titlesHtml(status, title, sub);
    if (this._configRaw?.illustration === false) {
      return `<div class="header ${st}"><div class="hrow">
          <div class="badge">${this._iconHtml()}</div>
          ${texts}
          ${this._zoomButton()}
        </div></div>`;
    }
    return `<div class="banner ${st}${this._isNight() ? ' night' : ''}">${wifiQrSceneSvg(status)}<div class="ground"></div>
        <div class="htext"><div class="badge">${this._iconHtml()}</div>
          ${texts}
        </div>${this._zoomButton()}</div>`;
  }

  // A card that cannot show its QR code: the header in its error status, then the message.
  _errorView(message) {
    var c = this._config || {};
    var title = wifiQrEsc(c.title || this._t('default_title'));
    var color = this._configRaw?.illustration === false ? 'var(--secondary-text-color)' : 'var(--error-color, #db4437)';
    wifiQrMorph(this.shadowRoot, `<style>
        ha-card { overflow: hidden; }
        .header { padding: 12px 12px 0; }
        .hrow { display: flex; align-items: center; gap: 10px; }
        .badge { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none;
                 --c: var(--error-color, #db4437); background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
        .titles { flex: 1 1 0; min-width: 4ch; }
        .name { font-size: 16px; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sub { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        ${WIFI_BANNER_STYLE + WIFI_BRAND_STYLE + WIFI_PILL_STYLE}
        .msg-err { padding: 16px; color: ${color}; overflow-wrap: anywhere; }
      </style><ha-card>${this._headerHtml('err', title, wifiQrEsc(c.ssid || ''))}<div class="msg-err">${wifiQrEsc(message)}</div></ha-card>`);
    this._fitPill();
  }

  // The states of the configured entities, as one comparable string.
  _entityStates() {
    var raw = this._configRaw;
    if (!raw || !(raw.ssid_entity || raw.password_entity)) return '';
    return JSON.stringify([raw.ssid_entity, raw.password_entity].map((id) => (id ? wifiQrEntityValue(this._hass, id) : null)));
  }

  _getLang() {
    // Priority: the card's language option, then the HA language, then the page language. Each is
    // resolved the same way (de-AT, es-MX, FR, sr-Latn → de, es, fr, sr-Latn).
    if (this._configRaw?.language) return wifiQrLang(this._configRaw.language);
    if (this._hassLang) return this._hassLang;
    return wifiQrLang(document.documentElement.lang);
  }

  _t(key) {
    return wifiQrT(this._getLang(), key);
  }

  // strict: let errors reach setConfig (the editor shows them); otherwise show them in the card.
  _applyConfig(strict) {
    var config = this._configRaw;
    // An entity with a value overrides the static ssid / password; without one, the static value is used.
    var value = (id, fallback) => (id && wifiQrEntityValue(this._hass, id)) || (fallback == null ? '' : String(fallback));
    this._config = {
      ssid: value(config.ssid_entity, config.ssid),
      password: value(config.password_entity, config.password),
      security: wifiQrSecurity(config.security),
      hidden: config.hidden === true,
      title: config.title || this._t('default_title'),
      qr_size: Number(config.qr_size) > 0 ? Number(config.qr_size) : null,
      logo: config.logo !== false,
    };
    // show_title / show_subtitle: the header's title / subtitle, hidden by the stylesheet
    this.toggleAttribute?.("hide-title", config.show_title === false);
    this.toggleAttribute?.("hide-subtitle", config.show_subtitle === false);
    // Neither the entity nor a static value: no QR code (it would not connect), the entity is named instead.
    this._pwdSync = null;
    var c = this._config;
    var missing = !c.ssid ? config.ssid_entity : !c.password && c.security !== 'nopass' ? config.password_entity : null;
    if (missing) {
      this._errorView(this._t('entity_unavailable').replace('{entity}', missing));
      return;
    }
    this._render(strict);
  }

  _buildQrSvg(text, size) {
    // UTF-8 byte length, exactly as QR8bitByte counts it.
    const bytes = unescape(encodeURIComponent(text)).length;
    let qr = null;
    for (let t = wifiQrMinVersion(bytes); t <= 40 && !qr; t++) {
      try {
        const q = new QRCodeModel(t, QRErrorCorrectLevel.M);
        q.addData(text);
        q.make();
        qr = q;
      } catch (e) {
        // Too small for the payload: try the next version; anything else is a bug
        if (!/code length overflow/.test(e?.message)) throw e;
      }
    }
    if (!qr) throw new Error('WiFi data is too long for a QR code');
    const n = qr.getModuleCount();
    const quiet = 4; // quiet zone required by the QR spec, in modules
    const dim = n + quiet * 2;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img"><rect width="${dim}" height="${dim}" fill="${WIFI_BLUE}"/><path fill="#000" d="${d}"/></svg>`;
  }

  // The QR code (8 mask trials) is only rebuilt when its payload or size changes, not on a re-render (language,
  // revealed password, mini card toggle): one SVG kept per size, the full card's and the mini thumbnail's.
  // Its accessible name is added afterwards, in the card's language.
  _qrSvg(text, size) {
    const key = `${size}|${text}`;
    this._qrCache ||= new Map();
    let svg = this._qrCache.get(key);
    if (svg === undefined) {
      svg = this._buildQrSvg(text, size);
      if (this._qrCache.size >= 4) this._qrCache.delete(this._qrCache.keys().next().value);
      this._qrCache.set(key, svg);
    }
    return svg.replace('role="img"', `role="img" aria-label="${wifiQrEsc(this._t('qr_code'))}"`);
  }

  // The revealed password is masked again after this delay, when the card leaves the page and when the mini card
  // folds back to its compact view.
  _maskPassword() {
    clearTimeout(this._pwdTimer);
    this._pwdTimer = null;
    if (!this._pwdShown) return;
    this._pwdShown = false;
    this._pwdSync?.();
  }

  // Copies the password (the clipboard API, else the legacy execCommand in an insecure context), like the Wero
  // card's copy button: the icon shows the result briefly and the live region announces it.
  _copyPassword() {
    var pwd = this._config.password;
    // Looked up when used: the card may re-render (language change) while the clipboard call runs.
    var setIcon = (icon) => this.shadowRoot.getElementById('cico')?.setAttribute('icon', icon);
    var announce = (text) => {
      var live = this.shadowRoot.getElementById('live');
      if (live) live.textContent = text;
    };
    var flash = (icon, key) => {
      setIcon(icon);
      announce(this._t(key));
      clearTimeout(this._copyTimer);
      this._copyTimer = setTimeout(() => this._copyReset(), 1500);
    };
    var done = () => flash('mdi:check', 'copied');
    var failed = () => flash('mdi:alert', 'copy_failed');
    var legacy = () => {
      var ta = document.createElement('textarea');
      ta.value = pwd;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (_e) { /* clipboard unavailable */ }
      ta.remove();
      if (ok) done();
      else failed();
    };
    if (globalThis.navigator?.clipboard && window.isSecureContext) navigator.clipboard.writeText(pwd).then(done, legacy);
    else legacy();
  }

  _copyReset() {
    clearTimeout(this._copyTimer);
    this._copyTimer = null;
    this.shadowRoot.getElementById('cico')?.setAttribute('icon', 'mdi:content-copy');
    var live = this.shadowRoot.getElementById('live');
    if (live) live.textContent = '';
  }

  disconnectedCallback() {
    this._resize?.disconnect();
    this._fitWidth = null;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._fitFrame);
    // The full screen QR closes with the card: a <dialog> removed from the page keeps its `open` attribute and
    // would come back inline (not modal) when Home Assistant attaches the card again.
    this.shadowRoot?.getElementById?.('zoom')?.close?.();
    this._maskPassword();
    this._copyReset();
  }

  // A new width (or the web font loaded): the status pill is fitted again, in the next frame.
  connectedCallback() {
    if (typeof ResizeObserver === 'function') {
      this._resize ??= new ResizeObserver((entries) => {
        var w = Math.round(entries[entries.length - 1].contentRect.width);
        if (w === this._fitWidth) return;
        this._fitWidth = w;
        cancelAnimationFrame(this._fitFrame);
        this._fitFrame = requestAnimationFrame(() => this._fitPill());
      });
      this._resize.observe(this);
    }
    document.fonts?.ready?.then(() => this._fitPill());
  }

  // The status pill's place, on the banner and on the classic header (see wifiPlacePill).
  _fitPill() {
    // Home Assistant's <ha-card> (a Lit element) shows its content only from its first update, a microtask after it
    // is connected: measured before, everything is 0 px wide and the pill lands on the wrong line. Fitted then.
    var haCard = this.shadowRoot?.querySelector?.('ha-card');
    if (haCard && haCard.hasUpdated === false) {
      this._pillWait ??= (haCard.updateComplete?.then ? haCard.updateComplete : new Promise((r) => requestAnimationFrame(r))).then(() => {
        this._pillWait = null;
        this._fitPill();
      });
      return;
    }
    var row = this.shadowRoot?.querySelector?.('.titles > .trow');
    if (!row) return;
    var banner = row.closest('.banner');
    wifiPlacePill(banner || row.closest('.header') || row.closest('.row'), row, banner?.querySelector('.ground'));
  }

  _render(strict) {
    // Set again below once the password row is rendered.
    this._pwdSync = null;
    const c = this._config;
    const isOpen = c.security === 'nopass';
    // A re-render (language or config change) keeps the zoom open and the password revealed.
    const wasZoomed = !!this.shadowRoot.getElementById?.('zoom')?.open;
    let svg;
    try {
      svg = this._qrSvg(wifiQrString(c), c.qr_size || 176);
    } catch (err) {
      if (strict) throw err;
      this._errorView(err.message);
      return;
    }

    // Escaped once, shown as text and as a tooltip: both are truncated on narrow cards.
    const title = wifiQrEsc(c.title);
    // The security type; an open network is already named by the pill: its subtitle is the network name.
    const sub = wifiQrEsc(c.security === 'nopass' ? c.ssid : this._t(SECURITY_KEYS[c.security] || 'sec_wpa'));
    const ill = this._configRaw?.illustration !== false;
    wifiQrMorph(this.shadowRoot, `
      <style>
        :host { display: block; height: 100%; }
        ha-card { height: 100%; box-sizing: border-box; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 10px; }
        /* Container on the header (an inner element as wide as the card), not on the host: an inline-size
           container has no intrinsic width and would collapse the card in an auto-width parent. */
        .header { align-self: flex-start; width: 100%; margin-bottom: -2px; container-type: inline-size; }
        .hrow { display: flex; align-items: center; gap: 10px; }
        .badge { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none;
                 --c: ${WIFI_BLUE}; background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
        .st-warn .badge { --c: var(--warning-color, #ffa600); }
        .st-err .badge { --c: var(--error-color, #db4437); }
        .badge ha-icon { color: inherit; --mdc-icon-size: 24px; }
        /* Shrinks with the card but always keeps a few characters of the title visible. */
        .titles { flex: 1 1 0; min-width: 4ch; }
        :host([hide-title]) .titles .name, :host([hide-subtitle]) .titles > .sub { display: none; }
        .name { font-size: 16px; font-weight: 500; line-height: 1.25; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* Phone width at 4 columns (~104 px card): a 32 px badge, as on the mini cards, a 14 px title and 4 px
           taken from the card padding keep 4 characters of the title visible. */
        @container (max-width: 100px) {
          .hrow { gap: 4px; margin-left: -4px; }
          .name { font-size: 14px; }
          .badge { width: 32px; height: 32px; }
          .badge ha-icon { --mdc-icon-size: 20px; }
        }
        ha-icon { color: var(--secondary-text-color); --mdc-icon-size: 22px; }
        ${WIFI_BRAND_STYLE + WIFI_PILL_STYLE + (ill ? `${WIFI_BANNER_STYLE}
        /* The banner spans the card edge to edge, over the card padding. */
        ha-card { overflow: hidden; }
        .banner { align-self: stretch; margin: -12px -12px 0; }` : '')}
        .qr-wrap { background: ${WIFI_BLUE}; border-radius: 10px; overflow: hidden; line-height: 0; max-width: 100%; cursor: zoom-in; }
        .qr-wrap svg { max-width: 100%; height: auto; width: ${c.qr_size ? `${c.qr_size}px` : '176px'}; }
        dialog { border: none; padding: 0; margin: auto; background: ${WIFI_BLUE}; border-radius: 12px; line-height: 0; overflow: hidden; cursor: zoom-out; }
        /* showModal() focuses the dialog itself: no focus ring around the full screen QR (Escape still closes it) */
        dialog:focus, dialog:focus-visible { outline: none; }
        dialog::backdrop { background: rgba(0,0,0,0.85); }
        dialog svg { width: min(90vw, 90vh); height: auto; display: block; }
        .info-block { width: 100%; display: flex; flex-direction: column; gap: 6px; }
        .info-row { background: var(--secondary-background-color, rgba(127,127,127,.08)); border-radius: 10px; padding: 6px 10px; }
        .lbl { font-size: 11px; color: var(--secondary-text-color); margin-bottom: 0; }
        .val { font-size: 13px; font-weight: 500; font-family: var(--code-font-family, monospace); word-break: break-all; color: var(--primary-text-color); }
        /* Open network message: a sentence, wrapped between words (break-all is only for the SSID and password). */
        .msg { font-size: 13px; font-weight: 500; font-family: inherit; word-break: normal; overflow-wrap: anywhere; color: var(--primary-text-color); }
        .pwd-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .pwd-row .val { flex: 1 1 auto; min-width: 0; }
        /* The mask stays on one line so the Password row keeps the Network row height on narrow cards. */
        .val.masked { white-space: nowrap; overflow: hidden; }
        /* 30 px target (WCAG 2.5.8); the negative margin absorbs the padding so the Password row is not taller than the Network row. */
        button { background: none; border: none; cursor: pointer; padding: 4px; margin: -8px -4px; display: flex; align-items: center; flex: none; }
        .hint { font-size: 11px; color: var(--secondary-text-color); text-align: center; }
        .sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
        ${this._miniStyle()}
      </style>
      <ha-card>
        ${this._headerHtml(this._status(), title, sub)}
        <div class="qr-wrap" id="qr" role="button" tabindex="0" title="${this._t('zoom')}" aria-label="${this._t('zoom')}">${svg.replace('<svg ', '<svg aria-hidden="true" ')}</div>
        <dialog id="zoom" aria-label="${this._t('zoom')}">${svg}</dialog>
        <div class="info-block">
          <div class="info-row">
            <div class="lbl">${this._t('network')}</div>
            <div class="val">${wifiQrEsc(c.ssid)}</div>
          </div>
          <div class="info-row">
            <div class="lbl">${this._t('password')}</div>
            ${isOpen
              ? `<div class="msg">${this._t('open_network')}</div>`
              : `<div class="pwd-row">
              <div class="val masked" id="pwd">••••••••••••••••</div>
              <button id="btn" aria-label="${this._t('show_password')}" aria-pressed="false"><ha-icon icon="mdi:eye" id="ico"></ha-icon></button>
              <button id="cbtn" title="${this._t('copy_password')}" aria-label="${this._t('copy_password')}"><ha-icon icon="mdi:content-copy" id="cico"></ha-icon></button>
            </div>`}
          </div>
        </div>
        <div class="hint">${this._t('hint')}</div>
        <span class="sr" id="live" aria-live="polite"></span>
      </ha-card>`);
    this._fitPill();

    if (!isOpen) {
      const btn = this.shadowRoot.getElementById('btn');
      // The password only ever reaches the DOM through textContent, never the innerHTML above.
      const show = () => {
        const shown = !!this._pwdShown;
        btn.setAttribute('aria-pressed', String(shown));
        btn.setAttribute('aria-label', this._t(shown ? 'hide_password' : 'show_password'));
        const pwd = this.shadowRoot.getElementById('pwd');
        pwd.textContent = shown ? c.password : '••••••••••••••••';
        pwd.className = shown ? 'val' : 'val masked';
        this.shadowRoot.getElementById('ico').setAttribute('icon', shown ? 'mdi:eye-off' : 'mdi:eye');
      };
      btn.onclick = () => {
        if (this._pwdShown) {
          this._maskPassword();
          return;
        }
        this._pwdShown = true;
        show();
        clearTimeout(this._pwdTimer);
        this._pwdTimer = setTimeout(() => this._maskPassword(), WIFI_PWD_REVEAL_MS);
      };
      this.shadowRoot.getElementById('cbtn').onclick = () => this._copyPassword();
      this._pwdSync = show;
      if (this._pwdShown) show();
    }

    this._bindQr(wasZoomed);
  }

  // The QR code (the big one, or the mini card's thumbnail) opens it full screen in its dialog.
  _bindQr(reopen) {
    const qr = this.shadowRoot.getElementById('qr');
    const dlg = this.shadowRoot.getElementById('zoom');
    const open = () => {
      // Centred on the screen, like the Wero card's full screen QR code.
      if (!dlg.open) dlg.showModal();
    };
    qr.onclick = open;
    qr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    // Escape is handled natively by <dialog>; a click anywhere (QR or backdrop) closes it
    dlg.onclick = () => dlg.close();
    if (reopen) open();
  }

  getCardSize() { return 4; }

  getGridOptions() {
    return { columns: 6, min_columns: 4 };
  }

  // Hooks for the mini card: its styles and its detail button at the right of the header.
  _miniStyle() { return ''; }

  _zoomButton() { return ''; }
}
