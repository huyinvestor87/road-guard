#!/usr/bin/env node
// Regenerates data.js from live OpenStreetMap data via the Overpass API.
//
// Usage:
//   node scripts/import-osm-data.mjs [--config scripts/osm-areas.json] [--out data.js] [--dry-run]
//
// Queries each area in the config for named roads (with a posted maxspeed)
// matching a highway-type filter, plus any speed-camera / enforcement nodes
// OSM actually has mapped there. Nothing is guessed: an area with no mapped
// cameras stays empty in the output, same as today. Re-run periodically to
// pick up changed speed limits or newly-mapped cameras — review the diff
// before committing, since OSM data can be wrong or vandalized.
//
// Multiple Overpass endpoints are tried in order because individual mirrors
// are sometimes unreachable or rate-limited; see docs/next-steps.md.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DEFAULT_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

// Public mirrors get overloaded/rate-limited unpredictably. Set
// OVERPASS_ENDPOINT to try a specific mirror (or local Overpass instance)
// first without editing the script.
const ENDPOINTS = process.env.OVERPASS_ENDPOINT
  ? [process.env.OVERPASS_ENDPOINT, ...DEFAULT_ENDPOINTS]
  : DEFAULT_ENDPOINTS;

const REQUEST_TIMEOUT_MS = 40_000;

function parseArgs(argv) {
  const opts = { config: 'scripts/osm-areas.json', out: 'data.js', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') opts.config = argv[++i];
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--dry-run') opts.dryRun = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return opts;
}

function parseSpeed(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d+(?:\.\d+)?)\s*(mph)?/i);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] ? Math.round(n * 1.60934) : Math.round(n);
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

function wayCenter(geometry) {
  let lat = 0, lng = 0;
  for (const p of geometry) { lat += p.lat; lng += p.lon; }
  return { lat: lat / geometry.length, lng: lng / geometry.length };
}

function buildQuery(area) {
  const { lat, lng } = area.center;
  const r = area.radiusMeters;
  return `[out:json][timeout:30];(` +
    `way(around:${r},${lat},${lng})[highway~'${area.highwayFilter}'][maxspeed][name];` +
    `node(around:${r},${lat},${lng})[highway=speed_camera];` +
    `relation(around:${r},${lat},${lng})[type=enforcement];` +
    `);out tags geom;`;
}

async function fetchOverpass(query) {
  let lastErr;
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      });
      if (!r.ok) throw new Error(`${endpoint} responded ${r.status}`);
      return await r.json();
    } catch (err) {
      lastErr = err;
      console.warn(`  ⚠ ${endpoint} failed: ${err.message}. Trying next endpoint…`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`All Overpass endpoints failed. Last error: ${lastErr?.message}`);
}

async function importArea(area) {
  console.log(`Querying ${area.area} (radius ${area.radiusMeters}m)…`);
  const json = await fetchOverpass(buildQuery(area));
  const roadsByName = new Map();
  const cameras = [];

  for (const e of json.elements ?? []) {
    if (e.type === 'way' && e.tags?.highway) {
      const limit = parseSpeed(e.tags.maxspeed);
      const geometry = (e.geometry ?? []).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));
      if (!limit || geometry.length < 2) continue;
      const name = e.tags.name || e.tags.ref;
      if (!name) continue;
      // Keep the longest-geometry way per name (dedupes split segments of the
      // same street into one representative entry).
      const existing = roadsByName.get(name);
      if (existing && existing.geometry.length >= geometry.length) continue;
      const c = wayCenter(geometry);
      roadsByName.set(name, {
        id: `${area.idPrefix}-${e.id}`,
        name,
        area: area.area,
        lat: round6(c.lat),
        lng: round6(c.lng),
        radiusMeters: 120,
        speedLimit: limit,
        source: 'OpenStreetMap',
        geometry: geometry.map(p => ({ lat: round6(p.lat), lng: round6(p.lon) })),
      });
    }
    if (e.type === 'node' && e.tags?.highway === 'speed_camera') {
      cameras.push({
        id: `${area.idPrefix}-cam-${e.id}`,
        type: 'speed_camera',
        area: area.area,
        lat: round6(e.lat),
        lng: round6(e.lon),
        direction: Number.isFinite(Number(e.tags.direction)) ? Number(e.tags.direction) : null,
        speedLimit: parseSpeed(e.tags.maxspeed),
        source: 'OpenStreetMap',
        verified: true,
      });
    }
  }

  const roads = [...roadsByName.values()]
    .sort((a, b) => b.geometry.length - a.geometry.length || a.name.localeCompare(b.name))
    .slice(0, area.maxRoads);

  console.log(`  → ${roads.length} road(s), ${cameras.length} camera(s)`);
  return { roads, cameras };
}

function jsLiteral(v) {
  return JSON.stringify(v);
}

function formatRoad(r) {
  const geom = r.geometry.map(p => `{lat:${p.lat},lng:${p.lng}}`).join(',');
  return `  { id: ${jsLiteral(r.id)}, name: ${jsLiteral(r.name)}, area: ${jsLiteral(r.area)}, lat: ${r.lat}, lng: ${r.lng}, radiusMeters: ${r.radiusMeters}, speedLimit: ${r.speedLimit}, source: 'OpenStreetMap', geometry: [${geom}] },`;
}

function formatCamera(c) {
  return `  { id: ${jsLiteral(c.id)}, type: ${jsLiteral(c.type)}, area: ${jsLiteral(c.area)}, lat: ${c.lat}, lng: ${c.lng}, direction: ${c.direction ?? 'null'}, speedLimit: ${c.speedLimit ?? 'null'}, source: 'OpenStreetMap', verified: true },`;
}

function todayVersion() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `osm-${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
}

function buildOutput(allRoads, allCameras) {
  const cameraComment = allCameras.length
    ? `// Traffic-enforcement camera nodes mapped in OpenStreetMap for these areas.\n// Every entry below came from an actual OSM node — none of these coordinates\n// are guessed. Re-run scripts/import-osm-data.mjs to refresh.\n`
    : `// No traffic-enforcement camera nodes are currently mapped in OpenStreetMap for\n// these areas, so this list intentionally ships empty rather than guessing camera\n// locations — inventing coordinates would be unsafe. Populate this once a verified\n// source (official traffic-camera registry or reviewed community reports) exists;\n// see docs/next-steps.md.\n`;

  return `// Verified speed-limit road segments sourced from OpenStreetMap (ODbL) for\n` +
    `// Ho Chi Minh City, Binh Duong, and Vung Tau. Snapshot date noted in dataVersion\n` +
    `// below; road speed limits can change, always defer to posted signage.\n` +
    `// Generated by scripts/import-osm-data.mjs — do not hand-edit geometry, re-run instead.\n` +
    `export const roadSegments = [\n${allRoads.map(formatRoad).join('\n')}\n];\n\n` +
    cameraComment +
    `export const cameras = [${allCameras.length ? `\n${allCameras.map(formatCamera).join('\n')}\n` : ''}];\n\n` +
    `export const dataVersion = ${jsLiteral(todayVersion())};\n`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const areas = JSON.parse(await readFile(opts.config, 'utf8'));

  const allRoads = [];
  const allCameras = [];
  for (const area of areas) {
    const { roads, cameras } = await importArea(area);
    allRoads.push(...roads);
    allCameras.push(...cameras);
  }

  if (!allRoads.length) {
    throw new Error('No roads found — refusing to overwrite data.js with an empty result.');
  }

  const output = buildOutput(allRoads, allCameras);

  if (opts.dryRun) {
    console.log(`\n--dry-run: would write ${allRoads.length} road(s), ${allCameras.length} camera(s) to ${opts.out}`);
    return;
  }

  await writeFile(opts.out, output);
  console.log(`\nWrote ${allRoads.length} road(s), ${allCameras.length} camera(s) to ${opts.out}`);
  console.log('Review the diff before committing — OSM data can be incomplete or wrong.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
