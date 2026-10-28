# Changelog

## 1.10.0 - 2026-10-28

### Changes
- German and Spanish translations: the card and its visual editor are now available in English, French, German and Spanish, and the editor language selector offers `Deutsch` and `Español`. The language follows Home Assistant (regional locales such as `de-AT` or `es-MX` included) or can be forced with `language: de` / `language: es`.

### Maintenance
- I18N parity test: `fr`, `de` and `es` must have exactly the keys of `en`.

## 1.9.1 - 2026-10-28

### Fixes
- Editor: switching `security` to `nopass` keeps the password in memory and restores it when switching back to WPA, SAE or WEP, instead of forcing you to retype it (the saved configuration still stores no password for open networks).
- Performance: the QR code starts at the smallest version that fits the payload instead of building and discarding up to ~34 undersized models on each render.

### Maintenance
- README: screenshot caption, English full-options example (`title: Guest WiFi`) and updated card size (~30 KB).
- CI: the release workflow runs the tests before publishing; unused ruff tooling and the redundant `screenshots/.gitkeep` removed. Nothing changes for users.

## 1.9.0 - 2026-10-26

### Fixes
- i18n: `set hass` now normalises the Home Assistant locale with `split("-")[0]`, so a regional locale (`en-GB`, `fr-BE`, `fr-CH`) resolves to its base code (`en`, `fr`) instead of silently falling back to English. The card now follows the Home Assistant language consistently across all three paths (`set hass`, editor, `document.documentElement.lang`).

## 1.8.0
### Changes
- Header: the WiFi icon sits in a 40 px round badge tinted with the card blue (24 px icon), like the header icons of the other ha-* cards, instead of a blue rounded square; `logo: false` shows the `mdi:wifi` icon in the same badge.
- Header: 8 px between the header and the QR code.

## 1.7.2

### Fixes
- A negative or zero `qr_size` (YAML only) keeps the default 176 px instead of hiding the QR code and filling the console with errors.
- Very long payloads that fit QR version 35 are encoded in version 35 instead of skipping to version 36; any encoder error other than "too long" is now shown in the card instead of being silently skipped.

### Maintenance
- The duplication check runs on Node 22 like the other CI jobs; regression tests for both fixes (18 in all). Nothing changes for users.

## 1.7.1

### Fixes
- An invalid `security` is refused right away with a configuration error, shown in the editor, even when a password is set; the card keeps its last valid configuration and no longer breaks on a later language change.
- A password written as a YAML number (`password: 12345678`) still works but logs one warning in the browser console asking to quote it, since YAML drops leading zeros.

### Maintenance
- New tests for `security` and numeric passwords (14 in all); CI installs the dependencies before building, the screenshot script renders each capture in its own page, and the duplicate-code check ignores test folders.

## 1.7.0

### Changes
- `security` is now checked: a value other than WPA, SAE, WEP or nopass shows a configuration error. Usual spellings keep working (`wpa`, `WPA2`, `wpa3`, `none`, `open`).
- `qr_size` takes effect again: without it nothing changes (176 px, now also the default shown in the editor and the README).
- All-digit passwords are accepted (`password: 0` was refused); the README advises quoting them, since YAML drops leading zeros.
- Accessibility: the show/hide password button has a label and reports its state, and screen readers no longer read the QR code twice.
- README: explains the escaping of special characters, that the password is stored in clear text in the dashboard configuration, and uses "Type: Dashboard" for HACS.

### Fixes
- A password or network name containing `;`, `:`, `,`, `"` or `\` now gives a QR code that phones read correctly (`pa;ss` used to join with `pa`).
- Emoji in the network name or password, and long network name + password pairs (about 110 characters or more), no longer produce an unreadable QR code.
- A rendering error after a language change shows inside the card instead of breaking it.

### Maintenance
- CI: actions pinned by commit SHA, read-only token permissions, Dependabot for GitHub Actions, duplicate-code annotations, and QR round-trip tests run on every push.

## 1.6.1

### Maintenance
- Tooling only, no functional change: Biome linting, pre-commit and a Lint CI (duplication checks). Card source modernized (optional chaining, template literals), identical behavior.

## 1.6.0

### Changes
- More compact layout with the same information, like the other ha-* cards: 12 px card padding, 36 px header icon, 16 px name and 12 px subtitle, 11 px pills, tighter tiles and sections.
- QR code shown at 176 px, tighter network and password blocks.

## 1.5.3

### Changes
- HACS now asks for Home Assistant 2024.8 or later, the version that brought the sections view the card supports; the README says so under **Prerequisites**.

## 1.5.2

### Maintenance
- Merged branches are deleted automatically (new `cleanup-branches` workflow). Nothing changes for users.

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
