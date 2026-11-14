# Research, scientific QA, and delivery

Integrated on 14 November 2026. The first version of [PR #5](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/5) was based on the original MVP merge `33bcf55`. The current QA branch merges `main` at `1476eb9236b8e6cfca9b8a04ce491ab69fa2f9d2`. Reviewed the eight earlier QA files and the current `AGENTS.md`, project specification, architecture, team integration, shared types, catalog, engines, App, tests, and workflow.

## Inspection

The browser game has five phases, eight selectable components in four categories, two launch options, a circular-orbit profile, engineering review, deterministic power/data accounting, and an output score with charts. The UI offers a single Earth-observation objective. Its operations phase plays a short transition before computing the simulation, with design decisions made before launch.

Two stale-result paths survived integration. Changes to altitude, duration or launcher can leave the previous debrief accessible, and the uncancelled launch timer can navigate back into a result for an earlier configuration. Chromium reproduced both. The battery plot still uses the capacity label for stored energy. Track the fixes with the integrator and UI.

[PR #2](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/2) merged 3D design documents. [PR #3](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/3) added four scenarios, deterministic events, integration across modeled transitions, and the revised score. [PR #4](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/4) added orbit-average energy, eclipse reserve, and downlink warnings. The default browser call uses seed 2026 and displays the training events in its explanations. Scenario selection and the 3D renderer are pending. The [acceptance record](QA_ACCEPTANCE.md) compares the two game revisions.

## Objective and design

Make the mission demonstrable and its scientific claims auditable. Keep the reference evidence and acceptance checks alongside the existing app. Use static source records keyed to catalog IDs or model quantities, with publication date or version, locator, original units, applicable conditions, and rights for the material actually used. Use NASA's science-mission design guide to map objectives, configuration, verification, and operations to the player flow. Compare the circular model to a documented TROPICS target altitude as a reference case. Use the 2026 Small Spacecraft Technology survey to contextualize power, communications, and launch assumptions.

| Files | Work |
| --- | --- |
| `README.md`, `docs/SOURCES.md`, `docs/PHYSICS_ASSUMPTIONS.md` | Entry points, claim-to-source ledger, exact inventory, formula domains, and model limitations |
| `docs/QA_DESIGN.md`, `docs/QA_IMPLEMENTATION_PROMPT.md` | Inspection, design, owner boundaries, and implementation brief |
| `tests/acceptance/mission.acceptance.test.ts`, `docs/QA_ACCEPTANCE.md`, `docs/QA_3D.md` | Black-box tests, browser procedure, results, future viewer checks, and owner handoffs |
| `docs/DEMO_AND_SUBMISSION.md` | English demo script, submission text, team roles and AI use disclosure |

The test inputs are existing `MissionConfig` values, public catalog entries, and seed 2026. Observe `OrbitProfile` (km, s, km/s, fractions), `DesignAssessment` (kg, W, Wh, credits), and `MissionResult` (MB, Wh, status, score). Use the public `computeOrbitProfile`, `evaluateDesign`, and `runMission` interfaces. Outputs are Vitest results, an English browser test record, and demo materials. A Chromium smoke run can use a local browser and external test tooling. Vitest and the existing Node/Vite toolchain cover repository automation.

## Calculations and acceptance

- Obtain independent circle checks from balance of radial acceleration and gravity, with `r = R + h`, `v = √(μ/r)`, and `T = 2πr/v`. For a spherical Earth with a parallel Sun beam in the orbit plane, test the shadow angle using the right triangle from Earth center to the tangent point. Use numeric fixtures with explicit tolerances and verify scale with altitude.
- Add the bus once. Independently total the default design, and test separate mass-only and budget-only violations. Invalid designs must produce zero science and empty histories.
- Check that the battery stays between zero and usable capacity. Use net power × elapsed hours to check one illuminated interval. Check final backlog against produced minus transmitted data within floating-point tolerance. Verify that the implicit browser scenario and the explicit survey replay match without mutating the input.
- Keep seed, payload, battery, radio, duration, altitude, and launch fixed while upgrading only the solar array. The deficient design must be valid to launch, deplete power, and fail. The corrected design must complete the mission with greater downlinked data, zero outage steps, and a passing result.
- Exercise every phase, mass and budget rejection, each category control, distinct mission outcomes, and reset in a browser. Probe whether stale results survive edits or the operations timer. Record passing, failing, and pending observations. Apply the same evidence to the final integrated rendering, including the proposed 3D viewer if it becomes available.
- Run `npm test`, `npm run build`, and `git diff --check`. A demo claim requires a browser observation or an explicitly described model result. A source claim needs its original context and attribution.

## Priority and integration

| Priority | Estimated effort | Result |
| --- | --- | --- |
| P0 | Medium, about 2 hours | Sources and precise limitations, reference and resource regression tests, browser demo and review rejection |
| P0 | Low, about 1 hour | English submission text, demo notes and slides, AI disclosure draft, contributor-role mapping |
| P1 | Low, about 30 minutes per integration revision | Recheck stale Debrief paths and the viewer when those changes land |
| Follow-up | Medium to high, owner-led | End-to-end provenance labels or a separately configured documented spacecraft preset |

The integrator owns catalog changes and reviews the shared type boundary. `SpaceComponent` has a single optional `sourceUrl` and one `isSynthetic` flag. That cannot represent a mixed entry with a verified hardware rating and fictional credits without extra field provenance. A future proposal should preserve the legacy field interpretation and explain migration to the integrator before any shared type change. The orbit and resources owners confirm constants and budget semantics. Gameplay owns time integration, scoring and scenario behavior. UI owns state, result freshness and chart wording with the integrator. New references, test additions and demo notes have no runtime dependency on these changes.

For the hackathon, keep the balanced catalog and place verified real-world examples in the science notes and presentation. The TROPICS example needs a single altitude input from the existing slider and a clearly labeled comparison. A hardware-backed preset would also need charge limits, solar derating, duty cycles, link assumptions, compatibility, and rebalanced demo fixtures.
