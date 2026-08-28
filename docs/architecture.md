# Architecture

Road Guard intentionally separates runtime warning logic from road/camera data.

```text
Phone GPS
  -> position / speed / heading
  -> nearest road lookup
  -> speed-limit check
  -> camera-ahead lookup
  -> visual + Vietnamese voice alert
```

The MVP uses static local data. A later data pipeline can generate `data.js` or a compact offline dataset from verified public/community sources without changing the driving UI.
