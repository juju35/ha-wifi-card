// ── wifi-qr-card-editor (visual editor, built on HA's ha-form) ───────────────
import { WIFI_QR_CARD_VERSION, pickerDefine } from "./card-picker.js";
import { wifiQrEditorSecurity, wifiQrLang, wifiQrT } from "./i18n-helpers.js";
import { WifiQrCard } from "./wifi-qr-card.js";
import { WifiQrMiniCard } from "./wifi-qr-mini.js";

export var WIFI_QR_EDITOR_DEFAULTS = { show_title: true, show_subtitle: true, show_credentials: true, show_hint: true, security: 'WPA', qr_size: 176, logo: true, hidden: false, illustration: true, illustration_theme: 'auto' };
// Entities whose state can give the SSID or the password: helpers and router integrations.
export var WIFI_QR_ENTITY_SELECTOR = { entity: { filter: [{ domain: ['input_text', 'text', 'sensor'] }] } };

export class WifiQrCardEditor extends HTMLElement {
  // The mini card's editor adds its `zoom` toggle.
  static get mini() {
    return false;
  }

  _defaults() {
    return Object.assign({}, WIFI_QR_EDITOR_DEFAULTS, this.constructor.mini ? { zoom: true } : {});
  }

  setConfig(config) {
    this._config = Object.assign({}, config);
    this._render();
  }

  set hass(hass) {
    var prevLang = this._hass?.language;
    this._hass = hass;
    if (this._form && prevLang === (hass?.language)) {
      this._form.hass = hass;
    } else {
      this._render();
    }
  }

  // The editor follows the Home Assistant UI language, like the built-in card editors; the card's
  // `language` option only sets the language of the card itself (shown in the preview).
  _lang() {
    return wifiQrLang(this._hass?.language);
  }

  _schema() {
    var t = (k) => wifiQrT(this._lang(), k);
    return [
      { name: 'title', selector: { text: {} } },
      { name: 'show_title', selector: { boolean: {} } },
      { name: 'show_subtitle', selector: { boolean: {} } },
      // Both cards: the full card (and the mini card's expanded view) under the QR code.
      { name: 'show_credentials', selector: { boolean: {} } },
      { name: 'show_hint', selector: { boolean: {} } },
      { name: 'logo', selector: { boolean: {} } },
      // Both cards: the illustrated banner and its day / night picture.
      { name: 'illustration', selector: { boolean: {} } },
      {
        name: 'illustration_theme',
        selector: { select: { mode: 'dropdown', options: ['auto', 'day', 'night'].map((v) => ({ value: v, label: t(`theme_${v}`) })) } },
      },
      ...(this.constructor.mini ? [{ name: 'zoom', selector: { boolean: {} } }] : []),
      // The SSID is only required without an entity giving it.
      { name: 'ssid', required: !this._config?.ssid_entity, selector: { text: {} } },
      { name: 'ssid_entity', selector: WIFI_QR_ENTITY_SELECTOR },
      { name: 'password', selector: { text: { type: 'password' } } },
      { name: 'password_entity', selector: WIFI_QR_ENTITY_SELECTOR },
      { name: 'hidden', selector: { boolean: {} } },
      {
        type: 'grid',
        name: '',
        schema: [
          {
            name: 'security',
            selector: {
              select: {
                mode: 'dropdown',
                options: [
                  { value: 'WPA', label: t('sec_wpa') },
                  { value: 'SAE', label: t('sec_sae') },
                  { value: 'WEP', label: t('sec_wep') },
                  { value: 'nopass', label: t('sec_nopass') },
                ],
              },
            },
          },
          {
            name: 'qr_size',
            selector: { number: { min: 100, max: 600, step: 10, mode: 'box', unit_of_measurement: 'px' } },
          },
        ],
      },
      {
        name: 'language',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
              { value: 'de', label: 'Deutsch' },
              { value: 'es', label: 'Español' },
              { value: 'sr', label: 'Српски' },
              { value: 'sr-Latn', label: 'Srpski (latinica)' },
              { value: 'it', label: 'Italiano' },
              { value: 'nl', label: 'Nederlands' },
              { value: 'pt', label: 'Português (Portugal)' },
              { value: 'pl', label: 'Polski' },
              { value: 'ro', label: 'Română' },
              { value: 'da', label: 'Dansk' },
              { value: 'sv', label: 'Svenska' },
              { value: 'bg', label: 'Български' },
              { value: 'ru', label: 'Русский' },
              { value: 'uk', label: 'Українська' },
              { value: 'hu', label: 'Magyar' },
              { value: 'sk', label: 'Slovenčina' },
              { value: 'cs', label: 'Čeština' },
              { value: 'sl', label: 'Slovenščina' },
              { value: 'lv', label: 'Latviešu' },
              { value: 'el', label: 'Ελληνικά' },
            ],
          },
        },
      },
    ];
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
      this.appendChild(this._form);
    }
    var lang = this._lang();
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.computeLabel = (s) => wifiQrT(lang, `ed_${s.name}`);
    this._form.computeHelper = (s) => {
      // Both entity fields share one helper.
      var key = /_entity$/.test(s.name) ? 'ed_entity_helper' : `ed_${s.name}_helper`;
      var txt = wifiQrT(lang, key);
      return txt === key ? undefined : txt;
    };
    // Show the defaults as set, so the fields match what the card does.
    // YAML aliases (wpa2, wpa3, none, open…) are shown as the matching option; the config itself
    // is only rewritten once the user changes something.
    var data = Object.assign(this._defaults(), this._config);
    data.security = wifiQrEditorSecurity(data.security);
    this._form.data = data;
  }

  _valueChanged(ev) {
    ev.stopPropagation();
    var value = Object.assign({}, ev.detail.value);
    // Keep the YAML short: drop options left empty or at their default.
    Object.keys(value).forEach((key) => {
      if (value[key] === '' || value[key] === null || value[key] === undefined) delete value[key];
    });
    var defaults = this._defaults();
    Object.keys(defaults).forEach((key) => {
      if (value[key] === defaults[key]) delete value[key];
    });
    // Switching to an open network drops the password from the config, but keep it
    // in memory so switching back to WPA/SAE/WEP does not force retyping it.
    // Restore it once, only on the nopass → WPA/SAE/WEP transition, then forget it, so the
    // password field can still be cleared afterwards.
    if (value.security === 'nopass') {
      if (value.password) this._stashedPassword = value.password;
      delete value.password;
    } else {
      if (this._config?.security === 'nopass' && !value.password && this._stashedPassword) {
        value.password = this._stashedPassword;
      }
      this._stashedPassword = null;
    }
    if (this._config.type) value = Object.assign({ type: this._config.type }, value);
    this._config = value;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: value }, bubbles: true, composed: true }));
  }
}

export class WifiQrMiniCardEditor extends WifiQrCardEditor {
  static get mini() {
    return true;
  }
}

if (!customElements.get('wifi-qr-card-editor')) {
  pickerDefine('wifi-qr-card-editor', WifiQrCardEditor);
}
if (!customElements.get('wifi-qr-mini-card-editor')) {
  pickerDefine('wifi-qr-mini-card-editor', WifiQrMiniCardEditor);
}

// The card picker lists both cards in the page language (the HA frontend sets it), like the cards' own texts.
export var wifiQrPickerLang = wifiQrLang(document.documentElement.lang || globalThis.navigator?.language);
if (!customElements.get('wifi-qr-card')) {
  pickerDefine('wifi-qr-card', WifiQrCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'wifi-qr-card',
    name: wifiQrT(wifiQrPickerLang, 'card_name'),
    description: wifiQrT(wifiQrPickerLang, 'card_desc'),
    preview: true,
    documentationURL: 'https://github.com/juju35/ha-wifi-card',
  });
  console.info(`%c WIFI-QR-CARD %c v${WIFI_QR_CARD_VERSION} `, 'color:#fff;background:#1976D2;font-weight:700', 'color:#1976D2;background:#fff');
}
if (!customElements.get('wifi-qr-mini-card')) {
  pickerDefine('wifi-qr-mini-card', WifiQrMiniCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'wifi-qr-mini-card',
    name: wifiQrT(wifiQrPickerLang, 'mini_name'),
    description: wifiQrT(wifiQrPickerLang, 'mini_desc'),
    preview: true,
    documentationURL: 'https://github.com/juju35/ha-wifi-card',
  });
}
