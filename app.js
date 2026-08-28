import { roadSegments, cameras, dataVersion } from './data.js?v=1';

const $ = (id) => document.getElementById(id);
const ui = {
  speed: $('speedValue'), limit: $('limitBadge'), speedCard: document.querySelector('.speed-card'),
  cameraCard: $('cameraCard'), cameraTitle: $('cameraTitle'), cameraDistance: $('cameraDistance'),
  gpsState: $('gpsState'), heading: $('headingValue'), accuracy: $('accuracyValue'), dataState: $('dataState'),
  start: $('startButton'), demo: $('demoButton'), sound: $('soundButton'), status: $('statusText')
};

let watchId = null;
let soundEnabled = true;
let lastSpoken = new Map();
let demoTimer = null;
let previousPosition = null;

ui.dataState.textContent = dataVersion;

function toRad(v) { return v * Math.PI / 180; }
function toDeg(v) { return v * 180 / Math.PI; }
function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function bearing(a, b) {
  const p1 = toRad(a.lat), p2 = toRad(b.lat), d = toRad(b.lng - a.lng);
  const y = Math.sin(d) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(d);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
function angleDiff(a, b) { return Math.abs(((a - b + 540) % 360) - 180); }

function currentRoad(pos) {
  return roadSegments
    .map(r => ({...r, distance: distanceMeters(pos, r)}))
    .filter(r => r.distance <= r.radiusMeters)
    .sort((a,b) => a.distance - b.distance)[0] || null;
}

function cameraAhead(pos, heading) {
  return cameras.map(cam => {
      const distance = distanceMeters(pos, cam);
      const camBearing = bearing(pos, cam);
      const directionMatch = heading == null ? true : angleDiff(camBearing, heading) <= 55;
      const cameraFacingMatch = cam.direction == null || heading == null ? true : angleDiff(cam.direction, heading) <= 70;
      return {...cam, distance, directionMatch, cameraFacingMatch};
    })
    .filter(c => c.distance <= 1500 && c.directionMatch && c.cameraFacingMatch)
    .sort((a,b) => a.distance - b.distance)[0] || null;
}

function speak(key, text, cooldownMs = 20000) {
  if (!soundEnabled || !('speechSynthesis' in window)) return;
  const now = Date.now();
  if (now - (lastSpoken.get(key) || 0) < cooldownMs) return;
  lastSpoken.set(key, now);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'vi-VN';
  u.rate = 1.05;
  speechSynthesis.speak(u);
}

function render({lat, lng, speedKmh, heading, accuracy}) {
  const pos = {lat, lng};
  const road = currentRoad(pos);
  const camera = cameraAhead(pos, heading);
  const limit = road?.speedLimit ?? camera?.speedLimit ?? null;

  ui.speed.textContent = Number.isFinite(speedKmh) ? Math.max(0, Math.round(speedKmh)) : '--';
  ui.limit.textContent = limit ?? '--';
  ui.heading.textContent = Number.isFinite(heading) ? `${Math.round(heading)}°` : '--°';
  ui.accuracy.textContent = Number.isFinite(accuracy) ? `${Math.round(accuracy)} m` : '-- m';

  const overLimit = limit && Number.isFinite(speedKmh) && speedKmh >= limit + 3;
  ui.speedCard.classList.toggle('over-limit', Boolean(overLimit));
  if (overLimit) speak('speed', `Bạn đang vượt tốc độ. Giới hạn ${limit} ki lô mét một giờ.`, 12000);

  if (camera) {
    const meters = Math.round(camera.distance / 10) * 10;
    const label = camera.type === 'red_light' ? 'Camera đèn đỏ phía trước' : 'Camera tốc độ phía trước';
    ui.cameraTitle.textContent = label;
    ui.cameraDistance.textContent = `${meters} m`;
    ui.cameraCard.classList.add('near');
    if (meters <= 1000) speak(`cam-${camera.id}-1000`, `${label}, khoảng ${meters} mét.`, 60000);
    if (meters <= 400) speak(`cam-${camera.id}-400`, `${label}, còn khoảng ${meters} mét.`, 60000);
  } else {
    ui.cameraTitle.textContent = 'Không có camera gần';
    ui.cameraDistance.textContent = '--';
    ui.cameraCard.classList.remove('near');
  }

  ui.status.textContent = road ? road.name : 'Đang theo dõi GPS';
}

function handlePosition(position) {
  const c = position.coords;
  const speedFromGps = Number.isFinite(c.speed) && c.speed >= 0 ? c.speed * 3.6 : null;
  let heading = Number.isFinite(c.heading) ? c.heading : null;
  let speedKmh = speedFromGps;

  if (previousPosition) {
    const dt = (position.timestamp - previousPosition.timestamp) / 1000;
    const prev = previousPosition.coords;
    const dist = distanceMeters({lat:prev.latitude,lng:prev.longitude},{lat:c.latitude,lng:c.longitude});
    if (heading == null && dist >= 4) heading = bearing({lat:prev.latitude,lng:prev.longitude},{lat:c.latitude,lng:c.longitude});
    if (speedKmh == null && dt > 0 && dt <= 15) speedKmh = dist / dt * 3.6;
  }
  previousPosition = position;
  ui.gpsState.textContent = 'Hoạt động';
  render({lat:c.latitude,lng:c.longitude,speedKmh,heading,accuracy:c.accuracy});
}

function startGps() {
  stopDemo();
  if (!navigator.geolocation) {
    ui.gpsState.textContent = 'Không hỗ trợ';
    ui.status.textContent = 'Trình duyệt không hỗ trợ GPS';
    return;
  }
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; ui.start.textContent = 'Bắt đầu cảnh báo'; ui.gpsState.textContent = 'Đã dừng'; return; }
  ui.status.textContent = 'Đang xin quyền GPS…';
  watchId = navigator.geolocation.watchPosition(handlePosition, err => {
    ui.gpsState.textContent = 'Lỗi';
    ui.status.textContent = err.code === 1 ? 'Bạn chưa cho phép truy cập vị trí' : 'Không lấy được GPS';
  }, {enableHighAccuracy:true, maximumAge:1000, timeout:12000});
  ui.start.textContent = 'Dừng cảnh báo';
}

function stopDemo() {
  if (demoTimer) clearInterval(demoTimer);
  demoTimer = null;
  ui.demo.textContent = 'Chạy chế độ demo';
}

function startDemo() {
  if (demoTimer) { stopDemo(); return; }
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; ui.start.textContent = 'Bắt đầu cảnh báo'; }
  let i = 0;
  ui.gpsState.textContent = 'Demo';
  ui.demo.textContent = 'Dừng demo';
  const tick = () => {
    const t = i++ / 18;
    render({
      lat: 10.7750 + t * 0.005,
      lng: 106.6990 + t * 0.010,
      speedKmh: 42 + Math.sin(t * Math.PI) * 24,
      heading: 55,
      accuracy: 8
    });
    if (t >= 1) i = 0;
  };
  tick();
  demoTimer = setInterval(tick, 1000);
}

ui.start.addEventListener('click', startGps);
ui.demo.addEventListener('click', startDemo);
ui.sound.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  ui.sound.textContent = soundEnabled ? '🔊' : '🔇';
  if (!soundEnabled && 'speechSynthesis' in window) speechSynthesis.cancel();
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
