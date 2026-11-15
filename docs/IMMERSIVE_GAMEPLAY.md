# Immersive operations increment — implementation plan

Baseline: 65416de. Checkpoint: 7394b31. Published tag: backup/pre-immersive-gameplay-20261115. Additive commits only; no amend, reset, rebase or force push.

## Objective and simpler solution
Make design and operations understandable through a visible task, meaningful camera commands and short decision checkpoints. Reuse existing deterministic calibration, station-offline and eclipse states instead of inventing a radiation or orbital maneuver model. Orbit loss, propulsion and radiation damage remain unimplemented. The spacecraft is a synthetic smallsat, not a certified CubeSat.

## Architecture and files
- engine/missionDecisions.ts derives teaching checkpoints from computed frames. No new physics. useMissionSession owns pause/advance/decision handling; exact-time camera commands remain reproducible.
- visualization/FlightScene.tsx: optional Three/R3F scene, external and onboard camera perspectives. Pass computed states and existing visual model; render only. Reuse assembly geometry, no new dependencies or assets.
- ui/FlightView, ScienceArchive, InfoTip, paginated detail dialog: UI components. App and scoped cockpit styles connect them with tabbed panels, keeping desktop and mobile bounded to the viewport.
- Add composite solar/battery kits to data/catalog and visual catalog: two existing basic units, summed mass/cost/capacity, one category slot. No shared contract changes. Every new ID must have a visual mapping.
- Existing engine, UI and visualization regression suites plus new decision, quantity, UI interaction tests.

## Interfaces and invariants
Input: configuration + seed + ordered commands. Output remains MissionResult plus replay frames. Checkpoints store kind, stable ID, exact computed time. Camera choice affects load and acquisition through the existing integrator. Viewing angle, translation, help and archive animation cannot change results. Archive tiles show returned-data fractions, not real geographic coverage or scientific quality.

## Acceptance
History/tag preserved; deterministic checkpoint ordering; no missed events at high playback speed; paused decisions freeze time; actions survive reproducible replay; restart clears old decisions; optional WebGL failure retains playable 2D; both languages translated; kit values exactly double base units; no page/panel scrolling at desktop and mobile test sizes, with accessible tabs and paginated reports. Tests/build and browser smoke before delivery. Actual child/player enjoyment requires observed user sessions, not claimed from unit tests.

## Complexity / priority
P0: bounded layout, glossary and decisions. P1: 3D onboard view, visual science return and two-unit kits. Medium/high integration scope across UI/gameplay/catalog; existing draft PR requires integrator review. Do not merge automatically.

## Implementation prompt
Extend this repository, do not replace it. Implement the architecture above with real modular TypeScript and existing dependencies. Preserve numerical engine/orbital contracts and English/Spanish. Every operational button must act on the recorded simulation or clearly be a presentation control. Avoid fabricated NASA hardware, radiation probabilities, collision avoidance or geographic coverage. Preserve old-mode regression tests and add tests for the new guided mode. Record limitations, exact checks and restore tag.

## Research informing design
- Git snapshots: https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository
- Ryan, Rigby & Przybylski (2006): https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2006_RyanRigbyPrzybylski_MandE.pdf — autonomy, competence, presence; supports meaningful choices and clear feedback, not a guarantee of child enjoyment.
- https://threejs.org/docs/pages/OrbitControls.html and https://github.com/pmndrs/react-three-fiber — existing rendering stack supports camera perspectives; no engine migration required.
- https://www.nasa.gov/smallsat-institute/what-are-smallsats-and-cubesats/ — CubeSat is a standardized form factor, not any box-shaped satellite.
- https://www.spaceweather.gov/phenomena/solar-radiation-storm and https://swpc-drupal.woc.noaa.gov/impacts/satellite-drag — real radiation/drag require additional models; do not imply they are simulated.

Design inference: choices + visible progress + manageable challenges may improve engagement. Avoid mandatory quizzes, punitive timers, monetization or manipulative streaks. Test comprehension and willingness to retry with actual players.

## Delivered and verified (2026-11-15)
- Commander mode is on by default; continuous replay remains selectable in Review. The first occurrence of each of five computed transitions pauses for a camera decision. Later cycles remain visible in live state; this prevents repetitive popups. Next event advances exactly to a decision or completes after the last. Camera choices affect real acquisition/load through the unchanged engine.
- Follow satellite, onboard and 2D cameras; WebGL absence/loss and render/import errors retain 2D gameplay. Terrain/spacecraft scale are illustrative; no real ground coverage, attitude dynamics or radiation model.
- Live battery Wh, generated/consumed W, elapsed orbit, data acquired/stored/received; archive tiles represent twelfths of received-data goal, not real image products.
- Hover/focus/touch i explanations, tabbed systems, launch/orbit/seed panels, small-screen workspace tabs, paginated full reports/help. Two-unit solar/battery kits have exact additive physical game values and visual mappings.
- Tests: npm test -- --reporter=dot: 225 passed / 14 files. npm run build: passed (existing large Three chunk advisory). git diff --check: passed. DOM tests intentionally exercise no-WebGL fallback; jsdom reports unavailable canvas without affecting test success.
- Browser: Spanish 3D construction, camera perspectives, all five decisions, cancel/retry and completed guided mission; desktop 1280x720, mobile 390x844 and 375x667. At tested sizes document width/height matched viewport, examined active panels and decision buttons remained within bounds. No real child/player usability study completed.
- Catalog addition needs resources/visualization integrator review. Budget hardware variety is still constrained. Shared contracts, orbital equations, resource equations, dependencies and existing scenario targets remain unchanged.
- The earlier bilingual state remains reachable through tag backup/pre-immersive-gameplay-20261115 and commit 65416de. Restore safely with a new revert commit or a separate branch, not a history rewrite.
