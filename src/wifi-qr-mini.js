// ── wifi-qr-mini-card ─────────────────────────────────────────────────────────
// Styles of the mini card in both its views (compact and full card). Only the compact view's ha-card is a size
// container: a size container takes no width from its content, so in a parent sized by its content (inline-block,
// an `auto` grid column) it would shrink to its padding. The empty, zero-height grid before it gives the host up to
// 240 px there, and no minimum.
import { WIFI_BLUE } from "./card-picker.js";
import { WIFI_BANNER_STYLE, WIFI_BRAND_STYLE, WIFI_PILL_STYLE, WIFI_STATUS_CLASS, wifiQrSceneSvg } from "./illustrated-header.js";
import { wifiQrEsc, wifiQrString } from "./i18n-helpers.js";
import { WifiQrCard, wifiQrMorph } from "./wifi-qr-card.js";

export var WIFI_MINI_STYLE = `
        :host([mini]) { display: block; min-width: 0; }
        :host([mini])::before { content: ""; display: grid; grid-template-columns: minmax(0, 240px); height: 0; }
        .zoom { all: unset; flex: none; cursor: pointer; width: 24px; height: 24px; margin: -4px -4px -4px 0; border-radius: 50%; align-self: flex-start;
                display: grid; place-items: center; color: var(--secondary-text-color); }
        .zoom ha-icon { color: inherit; --mdc-icon-size: 16px; }
        .zoom:hover { background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); color: var(--primary-text-color); }
        .zoom:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 1px; }
        /* On the banner: in the top right corner, a frosted 24 px disc readable over the wall and the waves. */
        .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; margin: 0; color: #33506b; background: rgba(255,255,255,.55);
                        box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
        .banner .zoom:hover { background: rgba(255,255,255,.75); }
        .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
        .banner.night .zoom:hover { background: rgba(255,255,255,.22); }
        /* Expanded view: the picture steps aside from the button's corner (the compact view sets its own text edge). */
        .banner .scene:not(.mini) { right: 26px; }
        .banner .htext { right: calc(min(200px, 62%) * .75 + 30px); }
        /* Narrow card, no picture: the text runs up to the button's corner. */
        @container (max-width: 300px) { .banner .htext { right: 36px; } }`;

// A click in a dialog opened from the page (a more-info, say) is not a click outside the card.
export function wifiQrInDialog(ev) {
  return ev.composedPath().some((n) => ['ha-more-info-dialog', 'ha-dialog', 'dialog'].includes(n.localName));
}

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app) a
// tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to the
// page. It counts when the press and the release are both outside the card (a drag out of the card does not count),
// and a scroll does not count (the browser cancels the pointer). Keyboard clicks still go through the click event.
// `tap(ev)` (a press and a release at the same spot) is for the tests.
export function wifiQrWatchOutside(isOut, handler) {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = isOut(ev);
  };
  const onUp = (ev) => {
    if (downOutside && isOut(ev)) handler(ev);
    downOutside = false;
  };
  const onCancel = () => {
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0 && isOut(ev)) handler(ev);
  };
  return {
    on() {
      document.addEventListener('pointerdown', onDown, true);
      document.addEventListener('pointerup', onUp, true);
      document.addEventListener('pointercancel', onCancel, true);
      document.addEventListener('click', onClick, true);
    },
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
    off() {
      downOutside = false;
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', onCancel, true);
      document.removeEventListener('click', onClick, true);
    },
  };
}

// The mini card extends the full card: one row with the header badge, the title and the network name, and a QR code
// thumbnail; the password is never shown. Its detail button (top right, `zoom: false` removes it) and the thumbnail
// switch it to the full card, same configuration; the button or a click anywhere outside the card brings it back.
export class WifiQrMiniCard extends WifiQrCard {
  static getConfigElement() {
    return document.createElement('wifi-qr-mini-card-editor');
  }

  constructor() {
    super();
    this._zoomed = false;
    this._onOutside = wifiQrWatchOutside(
      (ev) => !ev.composedPath().includes(this) && !wifiQrInDialog(ev),
      () => {
        if (this._zoomed) this._setZoom(false);
      },
    );
  }

  connectedCallback() {
    super.connectedCallback();
    this._onOutside.on();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._onOutside.off();
    // Left (another view, a conditional card hidden): back to the compact view, password masked, when it returns.
    if (this._zoomed) {
      this._zoomed = false;
      this._maskPassword();
    }
  }

  setConfig(config) {
    // The host attribute behind the mini card's styles; never set in the constructor (not allowed there).
    this.setAttribute?.('mini', '');
    super.setConfig(config);
  }

  getCardSize() {
    return this._zoomed ? super.getCardSize() : 2;
  }

  getGridOptions() {
    return this._zoomed ? super.getGridOptions() : { columns: 6, min_columns: 6 };
  }

  _miniStyle() {
    return WIFI_MINI_STYLE;
  }

  _zoomButton() {
    if (this._configRaw?.zoom === false) return '';
    const label = wifiQrEsc(this._t(this._zoomed ? 'zoom_out' : 'zoom_in'));
    return `<button class="zoom" id="zbtn" title="${label}" aria-label="${label}"><ha-icon icon="mdi:${this._zoomed ? 'arrow-collapse' : 'arrow-expand'}"></ha-icon></button>`;
  }

  // keyboard: activated with Enter / Space, the focus goes to the button of the new view, without scrolling.
  _setZoom(zoomed, keyboard) {
    this._zoomed = zoomed;
    // Folded back: the password, revealed in the full view, is masked again.
    if (!zoomed) this._maskPassword();
    this._render();
    if (keyboard) {
      const target = this.shadowRoot.getElementById(this._configRaw?.zoom === false ? 'qr' : 'zbtn');
      target?.focus?.({ preventScroll: true });
    }
  }

  _bindZoom() {
    const btn = this.shadowRoot.getElementById('zbtn');
    if (!btn) return;
    btn.onclick = (ev) => {
      ev?.stopPropagation?.();
      // A keyboard activation of a button is a click without a click count.
      this._setZoom(!this._zoomed, ev?.detail === 0);
    };
  }

  _render(strict) {
    if (this._zoomed) {
      super._render(strict);
      this._bindZoom();
      return;
    }
    this._pwdSync = null;
    const c = this._config;
    let svg;
    try {
      svg = this._qrSvg(wifiQrString(c), 64);
    } catch (err) {
      if (strict) throw err;
      this._errorView(err.message);
      return;
    }
    const title = wifiQrEsc(c.title);
    const ssid = wifiQrEsc(c.ssid);
    const zoom = wifiQrEsc(this._t('zoom'));
    const ill = this._configRaw?.illustration !== false;
    const texts = this._titlesHtml(this._status(), title, ssid);
    // The banner's copy button (not for an open network, nor with show_credentials: false), under the
    // detail button, like the Wero card's.
    const copy = ill && c.security !== 'nopass' && c.password && this._configRaw?.show_credentials !== false
      ? `<button id="cbtn" title="${this._t('copy_password')}" aria-label="${this._t('copy_password')}"><ha-icon icon="mdi:content-copy" id="cico"></ha-icon></button>`
      : '';
    const thumb = `<div class="thumb" id="qr" role="button" tabindex="0" title="${zoom}" aria-label="${zoom}">${svg.replace('<svg ', '<svg aria-hidden="true" ')}</div>`;
    const wasOpen = !!this.shadowRoot.getElementById?.('zoom')?.open;
    wifiQrMorph(this.shadowRoot, `
      <style>
        :host { height: 100%; }
        ${WIFI_MINI_STYLE}
        ha-card.mini { height: 100%; box-sizing: border-box; padding: 12px; display: flex; flex-direction: column; justify-content: center;
                       container-type: inline-size; }
        .row { display: flex; align-items: center; gap: 10px; min-width: 0; }
        /* The full card's 40 px header badge, not reduced in the compact view. */
        .badge { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none;
                 --c: ${WIFI_BLUE}; background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
        .st-warn .badge { --c: var(--warning-color, #ffa600); }
        .st-err .badge { --c: var(--error-color, #db4437); }
        .badge ha-icon { color: inherit; --mdc-icon-size: 24px; }
        .titles { flex: 1 1 0; min-width: 4ch; }
        :host([hide-title]) .titles .name, :host([hide-subtitle]) .titles > .sub { display: none; }
        .name { font-size: 16px; font-weight: 500; line-height: 1.25; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* The big QR code's colours and rounded tile, at thumbnail size. */
        .thumb { flex: none; width: 64px; height: 64px; background: ${WIFI_BLUE}; border-radius: 8px; overflow: hidden; line-height: 0; cursor: zoom-in; }
        .thumb svg { width: 100%; height: 100%; display: block; }
        .thumb:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
        /* The full screen QR, as on the full card. */
        dialog { border: none; padding: 0; margin: auto; background: ${WIFI_BLUE}; border-radius: 12px; line-height: 0; overflow: hidden; cursor: zoom-out; }
        /* showModal() focuses the dialog itself: no focus ring around the full screen QR (Escape still closes it) */
        dialog:focus, dialog:focus-visible { outline: none; }
        dialog::backdrop { background: rgba(0,0,0,0.85); }
        dialog svg { width: min(90vw, 90vh); height: auto; display: block; }
        /* A very narrow card (6 columns of a phone): a smaller thumbnail, tighter gaps, 4 px taken from the card padding
           and a 14 px title keep a few characters of the title. */
        @container (max-width: 200px) {
          .row { gap: 4px; margin: 0 -4px; }
          .name { font-size: 14px; }
          .thumb { width: 48px; height: 48px; border-radius: 6px; }
        }
        ${WIFI_BRAND_STYLE + WIFI_PILL_STYLE + (ill ? `${WIFI_BANNER_STYLE}
        /* The banner fills the compact card, laid out like the Wero card's: the title on the wall, the router's shelf,
           the QR code framed at its right, then the buttons' column in the top right corner (the detail button at the
           corner, the copy button under it). */
        ha-card.mini { padding: 0; overflow: hidden; justify-content: flex-start; }
        .banner .htext { right: 136px; }
        .banner .scene.mini { right: 96px; }
        .banner .hact { position: absolute; z-index: 2; top: 5px; right: 5px; display: flex; flex-direction: column; gap: 4px; }
        .banner .hact .zoom { position: relative; top: auto; right: auto; }
        .sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
        .banner #cbtn { all: unset; position: relative; flex: none; cursor: pointer; width: 24px; height: 24px; border-radius: 50%;
                        display: grid; place-items: center; color: #33506b; background: rgba(255,255,255,.55);
                        box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
        .banner #cbtn ha-icon { color: inherit; --mdc-icon-size: 16px; }
        .banner #cbtn:hover { background: rgba(255,255,255,.75); }
        .banner.night #cbtn { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
        .banner.night #cbtn:hover { background: rgba(255,255,255,.22); }
        .banner #cbtn:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
        .banner .thumb { position: absolute; z-index: 1; right: 36px; top: 12px; width: 56px; height: 56px;
                         box-shadow: 0 0 0 2px #fff, 0 1px 4px 2px rgba(0,0,0,.18); }
        .banner.night .thumb { box-shadow: 0 0 0 2px #cfd6e0, 0 1px 4px 2px rgba(0,0,0,.4); }
        /* Narrower: the router's shelf gives way, the buttons back on one line and the QR code under them at the right
           edge, so that the title stays whole and the status pill keeps its label. */
        @container (max-width: 300px) {
          .banner .scene.mini { display: none; }
          .banner .hact { flex-direction: row-reverse; }
          .banner .thumb { right: 10px; top: 32px; width: 44px; height: 44px; }
          .banner .htext { right: 60px; }
        }
        @container (max-width: 200px) {
          .banner .scene.mini { display: none; }
          .banner #cbtn { display: none; }
          .banner .thumb { right: 10px; top: 32px; width: 44px; height: 44px; }
          .banner .htext { left: 8px; right: 60px; gap: 6px; }
          .banner .htext .name { font-size: 14px; }
        }` : '')}
      </style>
      <ha-card class="mini">
        ${ill ? `<div class="banner ${WIFI_STATUS_CLASS[this._status()]}${this._isNight() ? ' night' : ''}">${wifiQrSceneSvg(this._status(), true)}<div class="ground"></div>
          <div class="htext"><div class="badge">${this._iconHtml()}</div>${texts}</div>${thumb}<div class="hact">${this._zoomButton()}${copy}</div>
        </div>` : `<div class="row ${WIFI_STATUS_CLASS[this._status()]}">
          <div class="badge">${this._iconHtml()}</div>
          ${texts}
          ${thumb}
          ${this._zoomButton()}
        </div>`}
        <dialog id="zoom" aria-label="${zoom}">${svg}</dialog>
        ${copy ? '<span class="sr" id="live" aria-live="polite"></span>' : ''}
      </ha-card>`);
    this._fitPill();
    const cbtn = copy && this.shadowRoot.getElementById?.('cbtn');
    if (cbtn) cbtn.onclick = (ev) => {
      ev?.stopPropagation?.();
      this._copyPassword();
    };
    // The thumbnail opens the QR code full screen directly, like the big one of the full card.
    this._bindQr(wasOpen);
    this._bindZoom();
  }
}
