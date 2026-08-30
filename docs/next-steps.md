# Next steps

1. ~~Replace synthetic demo road points with verified speed-limit data.~~ Done —
   `data.js` now ships real, named OpenStreetMap roads for Ho Chi Minh City,
   Binh Duong, and Vung Tau (Demo mode only; live GPS mode already queries OSM
   directly). Re-run against a fresh Overpass export periodically to catch
   changed speed limits.
2. Add verified camera data. OpenStreetMap has no mapped enforcement cameras in
   these areas today, so `cameras` in `data.js` is intentionally empty — do not
   fill it with guessed coordinates. Needs an actual verified source (an
   official traffic-camera registry, or reviewed community submissions) before
   populating.
3. ~~Upgrade road matching from nearest point/radius to polyline/segment
   matching.~~ Done for roads with a `geometry` array (see
   `docs/data-format.md`); cameras still use point/radius.
4. Add import tooling for public datasets (script the Overpass query used to
   regenerate `data.js`, rather than the one-off process used so far).
5. Validate alert thresholds during passenger-assisted road tests.
6. ~~Publish a test build with GitHub Pages.~~ Done — deploys automatically from
   `main` via `.github/workflows/deploy.yml`.
