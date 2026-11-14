# Spacecraft viewer acceptance

The production build at `1476eb9` was exercised in Chromium without a renderer. PR #2 defines the architecture and interaction contract. See the [mission acceptance record](QA_ACCEPTANCE.md) for the tested 450 km, seed 2026 baseline and the exact browser environment.

| When the viewer lands | Procedure and expected result | Status at `1476eb9` |
| --- | --- | --- |
| Visual mapping and provenance | Select each of the eight IDs and check card/scene agreement and the visible synthetic geometry label. Repeat with an unknown or missing mapping in a test harness and check the textual fallback. | Pending renderer and test harness |
| Isolation from physics | Run the default and solar-upgrade cases with the same input and seed, first with the viewer hidden and then with it visible. Rotate, zoom and inspect parts before an explicit launch. Compare the complete `MissionResult`, including histories and events. Watch for an unwanted invocation or mutation during inspection. | Baseline recorded. Viewer comparison pending. |
| Failure and fallback | Try missing WebGL, lazy import rejection, and WebGL context loss. Check that the accessible component list appears and the five-phase route still works. | Pending viewer integration |
| Interaction and cleanup | Check keyboard focus, resizing, repeated mounts/unmounts and React StrictMode on the target browser. Record console and resource cleanup observations. | Pending viewer integration |
| Result freshness | Repeat the [stepper edit and timer cases](QA_ACCEPTANCE.md#defects-and-feature-boundaries) after the integrator's UI fixes and again with the viewer active. The result always reflects the launched configuration. | Both defects reproduced in the baseline app |

Review new assets against the [source and rights ledger](SOURCES.md) before adding them to a public demo.
