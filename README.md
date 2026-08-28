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

`data.js` currently contains **demo data only**. Do not use the demo camera or speed-limit entries for real driving decisions.

The next milestone is to replace the demo seed with verified data for:

- Ho Chi Minh City
- Binh Duong
- Vung Tau

The application code deliberately keeps road/camera data separate so the dataset can later be generated from public sources or synced from a backend without rewriting the GPS warning engine.

## Branch workflow

Development happens on feature branches and is merged into `main` through pull requests.
