# Road Guard

Lightweight driving assistant for speed-limit and traffic-camera alerts. Designed to run on a second phone while Google Maps handles navigation on the primary phone.

## MVP

- Foreground high-accuracy GPS tracking
- Current-speed display in km/h
- Heading and GPS accuracy display
- Nearest speed-limit lookup
- Over-speed visual + Vietnamese voice warning
- Camera-ahead detection using distance and driving direction
- 1 km and 400 m camera voice warnings
- Offline-capable PWA shell
- Demo mode for testing without driving

## Run locally

Serve the repository over HTTPS (or localhost), then open `index.html`. Geolocation normally requires a secure context.

For GitHub Pages, publish the feature branch temporarily for testing or merge it to `main` and publish from `main`.

## Data

`data.js` (used by **Demo mode** only) ships a curated set of real, named roads with
posted speed limits for Ho Chi Minh City, Binh Duong, and Vung Tau, sourced from
OpenStreetMap (© OpenStreetMap contributors, ODbL). Road speed limits can change —
always defer to actual signage.

`cameras` in `data.js` ships **empty on purpose**: no traffic-enforcement camera
locations are currently mapped in OpenStreetMap for these areas, and inventing
coordinates would be unsafe. See `docs/next-steps.md` for how to add a verified
camera source.

Live driving (the "Bắt đầu cảnh báo" button, not Demo mode) does not use `data.js`
at all — it queries the OpenStreetMap Overpass API in real time for roads and
cameras near the GPS position (`osm.js`).

To refresh `data.js` from a fresh OSM snapshot:

```sh
node scripts/import-osm-data.mjs --dry-run   # preview counts, no write
node scripts/import-osm-data.mjs             # writes data.js
```

Areas/radii/highway filters live in `scripts/osm-areas.json`. Review the diff
before committing — the script's road selection can differ from a
hand-curated list, and OSM data can be wrong or vandalized. Public Overpass
mirrors get rate-limited; set `OVERPASS_ENDPOINT` to try a specific mirror
first.

## Cache-busting

Static assets are referenced with a `?v=%%VERSION%%` placeholder in `index.html`,
`app.js`, and `sw.js`. The GitHub Pages deploy workflow stamps that placeholder
with `<VERSION file>+<short commit sha>` before publishing, so every deploy gets
a unique version and browsers/service worker always pick up the latest files. Bump
`VERSION` for a human-readable release marker; the commit sha guarantees
uniqueness even without a bump.

## Branch workflow

Development happens on feature branches and is merged into `main` through pull requests.
