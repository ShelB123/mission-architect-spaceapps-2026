# Spacecraft viewer acceptance

At `8db3341`, PR #8 (renderer) and PR #10 (preview host) are merged. The production entry point renders `<App />` without a viewer loader. Players see an accessible component list and can complete a mission. Production viewer activation remains an integrator change. [Wiring design](HANDOFF_3D.md)

The QA browser configuration uses Chromium 153, software WebGL 2 (SwiftShader) and a local-only copy wired according to the handoff. Production hardware compatibility and performance still need a run on the demo device.

| Check | Status and evidence |
| --- | --- |
| Render, controls and provenance | The locally wired preview loads on request. The Chromium run exercised keyboard rotation, zoom, schematic view, inspection, all eight part IDs and resizing. The panel identifies the geometry as synthetic. |
| Isolation | The earlier candidate at `6c48b2a` plus renderer `ca15779` produced identical complete `MissionResult` values for two designs with and without viewer interactions. The browser wrapper recorded zero calls before launch and one per explicit launch. |
| Unavailable or WebGL 1 only | On the locally wired `8db3341`, blocking WebGL 2 produced the schematic without a scene initialization error. Both fixtures completed a mission. |
| Context loss | On the locally wired `8db3341`, a forced loss displayed the schematic. The old canvas was detached, and restoring its context left the fallback onscreen. **Try 3D again** mounted a new canvas and the mission completed. |
| Failed scene download | On the locally wired `8db3341`, abort the first request for `SpacecraftScene-*.js` and permit subsequent requests. The fallback appears. **Try 3D again** and **Hide 3D preview** followed by reopening both stay on the fallback and the request count remains one. The mission still completed at 294.3 MB. Viewer owner to fix or clarify the recovery control. |
| Visual acceptance | Repeat the current regression on the actual demo device after production wiring. Include a clean load, camera interaction, zoom, keyboard access, WebGL failure and three reopen cycles. The local scene chunk measured about 257 kB gzip. |

See the [QA record](QA_ACCEPTANCE.md) for the tested mission configurations and [source ledger](SOURCES.md) for provenance.
