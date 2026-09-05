# Butterfly Wing Lab

Slice 4 of the web AR conversion. It contains a local wing animation playground and an M1
MindAR target with 47 wing-only actors positioned from the source M1 prefab.

## Run

```powershell
npm install
npm run dev
```

Open the local Vite URL shown in the terminal. For a production build:

```powershell
npm run build
npm run preview
```

The GitHub Pages deployment serves the committed `main/docs` build at
`https://2023k-work.github.io/mythic-ountain/`; the AR entry is
`https://2023k-work.github.io/mythic-ountain/ar.html`. To refresh the published files after a
source change, build with `VITE_BASE_PATH=/mythic-ountain/` and copy the resulting `dist/` content
into `docs/` before committing and pushing.

For phone camera testing, open the HTTPS LAN URL printed by Vite, for example
`https://192.168.1.197:5173/ar.html`. The first visit may show a self-signed certificate warning;
the browser must be allowed to continue. Plain `http://192.168.1.197:5173` is not a valid camera
origin for this test.

To regenerate the single-image tracking file after changing `public/targets/M1.jpg`, keep the dev
server running and execute:

```powershell
npm run compile:target
```

## Current scope

- Wing-only rendering; no FBX, body mesh, Unity Animator, or GLB is used.
- `/ar.html` is an immersive full-viewport entry: it starts the camera automatically and exposes
  only a small tracking status overlay; page scrolling and setup buttons are hidden.
- The page adds one `M1_scaled` image target with camera permission, scanning, found, grace, lost,
  and error states.
- The M1 group creates 47 wing-only actors from the source `M1.prefab` positions, normalized by
  the M1 target width so they follow the source mountain composition.
- Each actor randomly selects one of the 57 wing appearance variants and a size between 0.075 m
  and 0.14 m. Variant files are loaded in the background with a four-request limit.
- After M1 is found, click/tap the camera view once to launch all butterflies with individual
  curved motion toward the camera's rear. Flight uses a 0.5x speed scale and samples a
  cone-shaped outward direction per butterfly; there is no fixed final position. Wingbeat speed
  is captured at launch and held for the duration of the flight. The group remains departed until
  M1 is fully lost and scanned again.
- Runtime alpha-bound detection crops each side of the source wing texture.
- Wing roots are used as pivots so the two transparent sprites can flap independently.
- The controls demonstrate count, speed, amplitude, four representative appearance variants,
  pause/play, and a short group-flight burst.

The source textures remain under `../Assets/`; all 57 raw variants are copied into
`public/assets/`. The complete atlas/compression step is still pending. The M1 positions are
source-aligned, but final visual calibration on a physical phone is still pending.
