# Changelog

## 1.5.1

### Development
- The built card is no longer committed in `dist/`: CI builds it on every push, and the release workflow builds it and attaches it to the release, which is where HACS downloads it from. Nothing changes for users.

## 1.5.0

### Changes
- Header aligned with the other ha-* cards: 40px logo, title 18px with the network security as subtitle.
- Rounded corners, spacing and label sizes aligned with the other cards; the network name and password use the theme's code font.
- Card size in the Sections view (`getGridOptions`).
- The title and network name are escaped before being displayed.

### Development
- The card source moves to `src/wifi-card.js`; `npm run build` stamps the version from `package.json` into `dist/wifi-card.js`, and CI checks that `dist/` is up to date.
- `npm run screenshots` renders the README screenshots (light and dark).
- Releases are published when `version` in `package.json` has no tag yet.

## 1.4.3

### Changes
- When the card is stretched to match a taller neighbour, its content now sits at the top instead of being centered vertically.

## 1.4.2

### Fixes
- The card now fills the full height of its slot, so it lines up with its neighbours in a horizontal stack or grid; content stays centered vertically.

## 1.4.1

### Changes
- Lighter blue for the WiFi logo and the QR code background; the QR code also scans more reliably at small sizes.

## 1.4.0

### Changes
- The QR code background now uses the same blue as the WiFi logo, like the Wero card does with its yellow.

## 1.3.1

### Changes
- New WiFi logo in the card header: white waves on a blue rounded square.

## 1.3.0

### What's new
- WiFi logo in the card header, like the Wero card. Turn it off with `logo: false` or from the visual editor to get the plain `mdi:wifi` icon back.

## 1.2.0

### What's new
- Visual editor for the card: title, SSID, password, security, QR code size and language, no YAML needed. Labels in English and French.
- WPA3 (`SAE`) security available in the editor.
- Open networks (`security: nopass`): the password is no longer required and the card shows "Open network" instead.
- Card preview in the card picker.

### Maintenance
- Releases are now published automatically from this changelog when the version is bumped.

## 1.1.0

### What's new
- Click or tap the QR code to show it full screen (click again, click outside or press Escape to close), keyboard accessible with Enter or Space.
- Default `qr_size` is now 200 px, quiet zone included, like the Wero card.

## 1.0.0

First public release.

### What's new
- WiFi QR code generated in pure JavaScript, no dependencies, no CDN.
- Password hidden by default, revealable with one click.
- Language detected from Home Assistant (English / French).
- Light and dark theme compatible, installable via HACS.
