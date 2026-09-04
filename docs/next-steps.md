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
4. ~~Add import tooling for public datasets.~~ Done —
   `scripts/import-osm-data.mjs` (config in `scripts/osm-areas.json`) queries
   Overpass for named roads with a posted `maxspeed` plus any mapped
   speed-camera/enforcement nodes, and regenerates a `data.js`-shaped file.
   It automatically picks roads by geometry size per area, which is a
   different (also real, not guessed) selection than the hand-curated list
   currently in `data.js` — review the diff before adopting a regenerated
   file rather than committing it blindly. Public Overpass mirrors are
   sometimes rate-limited; the script retries across several and
   `OVERPASS_ENDPOINT` can point it at a specific/local one.
5. Validate alert thresholds during passenger-assisted road tests.
6. ~~Publish a test build with GitHub Pages.~~ Done — deploys automatically from
   `main` via `.github/workflows/deploy.yml`.
