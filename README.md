# ha-wifi-card

[![HACS](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![HACS Validation](https://github.com/juju35/ha-wifi-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-wifi-card/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-wifi-card/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-wifi-card/actions/workflows/validate.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-wifi-card)](https://github.com/juju35/ha-wifi-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Custom Lovelace card for Home Assistant that displays a WiFi QR code for easy guest network access.

**Zero external dependencies** — the QR code is generated in pure JavaScript with an embedded Reed-Solomon encoder. No CDN, no network requests.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=juju35&repository=ha-wifi-card&category=plugin)

![wifi-qr-card](https://raw.githubusercontent.com/juju35/ha-wifi-card/main/screenshots/card.png)

## Features

- QR code generated in pure JS (embedded Reed-Solomon algorithm)
- Password hidden by default, revealable with a toggle button
- Visual editor in the dashboard UI (no YAML needed)
- Light and dark mode, English and French
- HACS-ready
- Single file, lightweight (~24 KB)

## Prerequisites

None: the card needs no integration, only the name and password of your network.

## Installation

### Via HACS (recommended)

Click the button below to add the repository directly:

[![Add to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=juju35&repository=ha-wifi-card&category=plugin)

Or manually:

1. Open HACS → **Frontend** → **⋮** → **Custom repositories**
2. Add `https://github.com/juju35/ha-wifi-card` — Category: **Lovelace**
3. Search for **Wifi QR Card** and install it
4. Clear your browser cache and refresh

### Manual

1. Download `dist/wifi-card.js` from the [latest release](https://github.com/juju35/ha-wifi-card/releases/latest)
2. Copy it to `/config/www/wifi-card.js`
3. Go to **Settings → Dashboards → Resources** → Add resource:
   - URL: `/local/wifi-card.js`
   - Type: **JavaScript Module**
4. Clear your browser cache and refresh

## Configuration

### Visual editor

Add the card from the dashboard (**Add card → Wifi QR Card**) and fill in the fields: title, logo, SSID, password, security, QR code size and language. The preview updates live, and empty optional fields are left out of the generated YAML.

### Minimal

```yaml
type: custom:wifi-qr-card
ssid: MyNetwork-Guest
password: MySecretPassword
```

### Full options

```yaml
type: custom:wifi-qr-card
title: Wifi invité
logo: true
ssid: MyNetwork-Guest
password: MySecretPassword
security: WPA
qr_size: 200
```

### Options reference

| Option | Required | Default | Description |
|---|---|---|---|
| `ssid` | ✅ | — | WiFi network name (SSID) |
| `password` | ✅* | — | WiFi password (*not needed when `security: nopass`) |
| `security` | ❌ | `WPA` | Security type: `WPA` (WPA/WPA2), `SAE` (WPA3), `WEP`, or `nopass` (open network) |
| `title` | ❌ | Auto (i18n) | Card title |
| `logo` | ❌ | `true` | Show the WiFi logo in the header (`false` shows a plain `mdi:wifi` icon) |
| `qr_size` | ❌ | `200` | QR code size in pixels (quiet zone included) |
| `language` | ❌ | Auto | Force language: `fr` or `en` (auto-detects from HA settings) |

## Screenshots

| Light | Dark (French) |
|---|---|
| ![card](screenshots/card.png) | ![card dark](screenshots/card-dark.png) |

## How it works

The card generates a [WiFi QR code](https://en.wikipedia.org/wiki/QR_code#Joining_a_Wi-Fi_network) using the standard `WIFI:T:<security>;S:<ssid>;P:<password>;;` format. When scanned with a phone camera, the device automatically prompts to join the network — no need to type the password manually.

The QR code engine is a self-contained JavaScript implementation of the QR code specification (ISO/IEC 18004), including Reed-Solomon error correction, embedded directly in the card source. No external libraries or CDN requests are needed.

## Development

```bash
npm install
npm run build        # stamps the version of package.json into dist/wifi-card.js
npm run check        # verifies dist/ is up to date (run in CI)
npm run screenshots  # renders the card into screenshots/
```

### Releasing

1. Bump `version` in `package.json` and run `npm run build`
2. Add a `## <version>` section at the top of [CHANGELOG.md](CHANGELOG.md)
3. Push to `main`: the **Release** workflow creates the tag and the GitHub release with the changelog section as notes, and attaches `wifi-card.js`

## Translations

The card auto-detects the language from your Home Assistant settings. Currently supported:

| Language | Code |
|---|---|
| English | `en` |
| Français | `fr` |

To force a specific language:

```yaml
type: custom:wifi-qr-card
ssid: MyNetwork-Guest
password: MySecretPassword
language: en
```

Contributions for additional languages are welcome!

## License

[MIT](LICENSE)
