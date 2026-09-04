const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const CACHE_MS = 15 * 60 * 1000;
let cache = { lat: null, lng: null, loadedAt: 0, roads: [], cameras: [] };

const rad = v => v * Math.PI / 180;
function distance(a,b){const R=6371000,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),p1=rad(a.lat),p2=rad(b.lat);const h=Math.sin(dLat/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function parseSpeed(value){if(!value)return null;const m=String(value).match(/^(\d+(?:\.\d+)?)\s*(mph)?/i);if(!m)return null;const n=Number(m[1]);return m[2]?Math.round(n*1.60934):Math.round(n);}
function center(geometry=[]){if(!geometry.length)return null;let lat=0,lng=0;for(const p of geometry){lat+=p.lat;lng+=p.lon;}return {lat:lat/geometry.length,lng:lng/geometry.length};}
// Match tolerance scaled to road class. A flat radius for every road let a
// narrow hẻm (alley — often highway=residential/service, and in Vietnamese
// addressing sometimes literally named after the highway it branches off,
// e.g. "Hẻm 123 Quốc lộ 13") out-compete the actual highway it sits next to
// whenever it happened to be geometrically closer to a GPS fix. Wide,
// sparsely-sampled roads need a generous radius; narrow ones need a tight one
// so they only match when the position is genuinely on them.
const CLASS_RADIUS={motorway:400,motorway_link:250,trunk:350,trunk_link:220,primary:300,primary_link:180,secondary:220,secondary_link:150,tertiary:150,tertiary_link:100,unclassified:60,residential:60,living_street:40,service:25,track:25,path:20,footway:20,cycleway:20,pedestrian:20};
function classRadius(highway){return CLASS_RADIUS[highway]||100;}

export async function loadNearbyOsm(lat,lng,force=false){
  const now=Date.now();
  if(!force && cache.lat!=null && now-cache.loadedAt<CACHE_MS && distance({lat,lng},{lat:cache.lat,lng:cache.lng})<1200) return cache;
  const q=`[out:json][timeout:20];(way(around:2500,${lat},${lng})[highway][maxspeed];node(around:5000,${lat},${lng})[highway=speed_camera];relation(around:5000,${lat},${lng})[type=enforcement];);out tags geom;`;
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q),signal:controller.signal});
    if(!r.ok) throw new Error(`OSM ${r.status}`); const json=await r.json();
    const roads=[],cameras=[];
    for(const e of json.elements||[]){
      if(e.type==='way'&&e.tags?.highway){const c=center(e.geometry),limit=parseSpeed(e.tags.maxspeed);if(c&&limit)roads.push({id:`osm-way-${e.id}`,name:e.tags.name||e.tags.ref||'Đường OSM',lat:c.lat,lng:c.lng,radiusMeters:classRadius(e.tags.highway),speedLimit:limit,geometry:e.geometry?.map(p=>({lat:p.lat,lng:p.lon}))||[],source:'OpenStreetMap'});}
      if(e.type==='node'&&e.tags?.highway==='speed_camera'){cameras.push({id:`osm-cam-${e.id}`,type:'speed_camera',lat:e.lat,lng:e.lon,direction:Number.isFinite(Number(e.tags.direction))?Number(e.tags.direction):null,speedLimit:parseSpeed(e.tags.maxspeed),source:'OpenStreetMap'});}
    }
    cache={lat,lng,loadedAt:now,roads,cameras}; return cache;
  } finally { clearTimeout(timer); }
}

export function osmCache(){return cache;}
