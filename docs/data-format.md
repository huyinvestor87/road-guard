# Data format

## Road segment

```js
{ id, name, area, lat, lng, radiusMeters, speedLimit, source, geometry }
```

`geometry` (optional) is an ordered array of `{lat, lng}` points; when present, the
app matches against the nearest point on the polyline instead of the single
`lat`/`lng` center, so `radiusMeters` can stay tight (actual road width + GPS
error) instead of covering a whole area. `area` and `source` are informational
(e.g. `"TP.HCM"`, `"OpenStreetMap"`) and shown in the status line.

## Camera

```js
{ id, type, lat, lng, direction, speedLimit, verified }
```

`direction` is the expected travel heading in degrees. The MVP uses point/radius matching as a temporary simplification; production data should move to real road geometry and segment-aware matching.
