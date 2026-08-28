export const roadSegments = [
  // Demo seed only. Replace with verified road geometry / speed-limit data.
  { id: 'demo-road-1', name: 'Demo Road', lat: 10.7769, lng: 106.7009, radiusMeters: 1500, speedLimit: 50 },
  { id: 'demo-road-2', name: 'Demo Highway', lat: 10.78, lng: 106.71, radiusMeters: 1500, speedLimit: 60 }
];

export const cameras = [
  // Demo seed only. Direction is travel heading in degrees.
  { id: 'demo-cam-1', type: 'speed_camera', lat: 10.7787, lng: 106.7035, direction: 55, speedLimit: 50, verified: false },
  { id: 'demo-cam-2', type: 'red_light', lat: 10.782, lng: 106.708, direction: 55, speedLimit: 60, verified: false }
];

export const dataVersion = 'demo-2026.08.28';
