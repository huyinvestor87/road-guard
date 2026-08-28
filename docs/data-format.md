# Data format

## Road segment

```js
{ id, name, lat, lng, radiusMeters, speedLimit }
```

## Camera

```js
{ id, type, lat, lng, direction, speedLimit, verified }
```

`direction` is the expected travel heading in degrees. The MVP uses point/radius matching as a temporary simplification; production data should move to real road geometry and segment-aware matching.
