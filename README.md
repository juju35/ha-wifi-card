# ha-wifi-card

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![HACS Validation](https://github.com/juju35/ha-wifi-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-wifi-card/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-wifi-card/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-wifi-card/actions/workflows/validate.yml)
[![Lint](https://github.com/juju35/ha-wifi-card/actions/workflows/lint.yml/badge.svg)](https://github.com/juju35/ha-wifi-card/actions/workflows/lint.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-wifi-card)](https://github.com/juju35/ha-wifi-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/juju35/ha-wifi-card/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

Custom Lovelace card for Home Assistant that displays a WiFi QR code for easy guest network access.

**Zero external dependencies** — the QR code is generated in pure JavaScript with an embedded Reed-Solomon encoder. No CDN, no network requests.

[![Open your Home Assistant instance and open a repository inside the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-wifi-card&category=plugin)

<img src="https://raw.githubusercontent.com/juju35/ha-wifi-card/main/screenshots/card.png" alt="wifi-qr-card" width="400">

## Features

- QR code generated in pure JS (embedded Reed-Solomon algorithm)
- Password hidden by default, revealable with a toggle button
- Visual editor in the dashboard UI (no YAML needed)
- Light and dark mode, English, French, German, Spanish, Serbian (Cyrillic and Latin), Italian, Dutch, European Portuguese, Polish, Romanian, Danish, Swedish, Bulgarian, Russian, Ukrainian, Hungarian, Slovak, Czech, Slovenian, Latvian and Greek
- Ready for the Marketplace
- Single file, lightweight (~54 KB)

## Prerequisites

Home Assistant 2024.8 or later. The card needs no integration, only the name and password of your network.

## Installation

### Via the Marketplace (recommended)

Click the button below to add the repository directly:

[![Add to the Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-wifi-card&category=plugin)

Or manually:

1. Open **Settings → Marketplace → Add from link** (top right; this needs a GitHub account connected)
2. Add `https://github.com/juju35/ha-wifi-card` — Type: **Dashboard**
3. Open **Wifi QR Card** and click **Install**
4. Clear your browser cache and refresh

### Manual

1. Download `wifi-card.js` from the [latest release](https://github.com/juju35/ha-wifi-card/releases/latest)
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
title: Guest WiFi
logo: true
ssid: MyNetwork-Guest
password: MySecretPassword
security: WPA
qr_size: 176
```

### Options reference

| Option | Required | Default | Description |
|---|---|---|---|
| `ssid` | ✅ | — | WiFi network name (SSID) |
| `password` | ✅* | — | WiFi password (*not needed when `security: nopass`). Quote it in YAML when it is made of digits (`password: "01234567"`), otherwise YAML reads it as a number and drops leading zeros |
| `security` | ❌ | `WPA` | Security type: `WPA` (WPA/WPA2), `SAE` (WPA3), `WEP`, or `nopass` (open network) |
| `title` | ❌ | Auto (i18n) | Card title |
| `logo` | ❌ | `true` | Show the WiFi logo in the header badge (`false` shows the `mdi:wifi` icon instead) |
| `qr_size` | ❌ | `176` | QR code size in pixels (quiet zone included) |
| `language` | ❌ | Auto | Force language: `en`, `fr`, `de`, `es`, `sr`, `sr-Latn`, `it`, `nl`, `pt`, `pl`, `ro`, `da`, `sv`, `bg`, `ru`, `uk`, `hu`, `sk`, `cs`, `sl`, `lv` or `el` (auto-detects from HA settings) |

## Screenshots

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-wifi-card/main/screenshots/card.png" alt="card" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-wifi-card/main/screenshots/card-dark.png" alt="card dark" width="400"> |

## How it works

The card generates a [WiFi QR code](https://en.wikipedia.org/wiki/QR_code#Joining_a_Wi-Fi_network) using the standard `WIFI:T:<security>;S:<ssid>;P:<password>;;` format. When scanned with a phone camera, the device automatically prompts to join the network — no need to type the password manually.

The characters reserved by this format (`\`, `;`, `,`, `:` and `"`) are escaped with a backslash in the SSID and the password of the QR code, so any network name or password can be used as is. The card itself shows them unescaped.

The password is stored in clear text in the dashboard configuration, which every Home Assistant user can read: use it for a guest network.

The QR code engine is a self-contained JavaScript implementation of the QR code specification (ISO/IEC 18004), including Reed-Solomon error correction, embedded directly in the card source. No external libraries or CDN requests are needed.

## Development

```bash
npm install
npm run build        # stamps the version of package.json into dist/wifi-card.js
npm run check        # builds and checks the card (run in CI)
npm run screenshots  # renders the card into screenshots/ (a PNG is rewritten only if its pixels change)
```

`dist/` is not committed: `npm run build` creates it locally, CI builds it on every push, and the release workflow attaches the built file to the release, which is where the Marketplace installs it from.

### Releasing

1. Bump `version` in `package.json`
2. Add a `## <version>` section at the top of [CHANGELOG.md](https://github.com/juju35/ha-wifi-card/blob/main/CHANGELOG.md)
3. Push to `main`: the **Release** workflow builds the card, creates the tag and the GitHub release with the changelog section as notes, and attaches `wifi-card.js`

## Translations

The card auto-detects the language from your Home Assistant settings: the full locale when it is translated (`sr-Latn`), otherwise its base language (`fr-FR` → `fr`, `pt-BR` → `pt`, European Portuguese), otherwise English. Currently supported:

| Language | Code |
|---|---|
| English | `en` |
| Français | `fr` |
| Deutsch | `de` |
| Español | `es` |
| Српски | `sr` |
| Srpski (latinica) | `sr-Latn` |
| Italiano | `it` |
| Nederlands | `nl` |
| Português (Portugal) | `pt` |
| Polski | `pl` |
| Română | `ro` |
| Dansk | `da` |
| Svenska | `sv` |
| Български | `bg` |
| Русский | `ru` |
| Українська | `uk` |
| Magyar | `hu` |
| Slovenčina | `sk` |
| Čeština | `cs` |
| Slovenščina | `sl` |
| Latviešu | `lv` |
| Ελληνικά | `el` |

To force a specific language:

```yaml
type: custom:wifi-qr-card
ssid: MyNetwork-Guest
password: MySecretPassword
language: en
```

Contributions for additional languages are welcome!

## License

[MIT](https://github.com/juju35/ha-wifi-card/blob/main/LICENSE)

## Support

If you find this project useful, you can support its development:

<a href="https://buymeacoffee.com/julienstep9"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="50"></a>
