# Research, scientific QA, and delivery

Inspected on 14 November 2026. GitHub's default branch, `main`, initially pointed to the README-only commit `23fbb8f`. The runnable MVP was at `1092772980cb2ff526432e97037da5e23ba42bbc`, the head of [PR #1](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/1). Read `AGENTS.md`, `docs/PROJECT_SPEC.md`, `src/types/contracts.ts`, the catalog, three engines, App, tests, and workflow at that base. PR #1 merged while QA was in progress. The final QA branch targets `main` at `33bcf55d44d2eb5f76ec54459dcc73789649a1ca`, verified to contain the same tree as the tested MVP.

## Inspection

The browser game has five phases, eight selectable components in four categories, two launch options, a circular-orbit profile, engineering review, deterministic power/data accounting, and an output score with charts. The UI offers a single Earth-observation objective. Its operations phase plays a short transition before computing the simulation, with design decisions made before launch.

The base lacks a field-level source inventory, a documented scientific reference case, and independent acceptance checks. Static review identified an old-result path after changing altitude, duration, or launcher, plus an uncancelled launch timer when navigating back to Design. The battery chart reports stored energy but calls it capacity. The time-step model samples illumination and contact at the start of each step, which can assign a whole interval to the wrong phase near a boundary. The integer score can round to 100 on a failed mission. Record observed cases and leave owner fixes for separate PRs.

[PR #2](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/2) describes a future 3D viewer and owns the architecture and integration documents. [PR #3](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/3) includes seeded events and scenario logic at `106df79`. The resources branch at `41a1249` builds on gameplay and adds orbit-average energy, eclipse reserve, and downlink warnings. The demo and numerical observations in this QA branch refer to the MVP base. Re-run the smoke route and recapture numbers after a gameplay merge.

## Objective and design

Make the mission demonstrable and its scientific claims auditable. Keep the reference evidence and acceptance checks alongside the existing app. Use static source records keyed to catalog IDs or model quantities, with publication date or version, locator, original units, applicable conditions, and rights for the material actually used. Use NASA's science-mission design guide to map objectives, configuration, verification, and operations to the player flow. Compare the circular model to a documented TROPICS target altitude as a reference case. Use the 2026 Small Spacecraft Technology survey to contextualize power, communications, and launch assumptions.

| Files | Work |
| --- | --- |
| `README.md`, `docs/SOURCES.md`, `docs/PHYSICS_ASSUMPTIONS.md` | Entry points, claim-to-source ledger, exact inventory, formula domains, and model limitations |
| `docs/QA_DESIGN.md`, `docs/QA_IMPLEMENTATION_PROMPT.md` | Inspection, design, owner boundaries, and implementation brief |
| `tests/acceptance/mission.acceptance.test.ts`, `docs/QA_ACCEPTANCE.md` | Black-box tests, browser procedure, evidence, and owner handoffs |
| `docs/DEMO_AND_SUBMISSION.md` | English demo script, submission text, team roles and AI use disclosure |

The test inputs are existing `MissionConfig` values, public catalog entries, and seed 2026. Observe `OrbitProfile` (km, s, km/s, fractions), `DesignAssessment` (kg, W, Wh, credits), and `MissionResult` (MB, Wh, status, score). Use the public `computeOrbitProfile`, `evaluateDesign`, and `runMission` interfaces. Outputs are Vitest results, an English browser test record, and demo materials. A Chromium smoke run can use a local browser and external test tooling. Vitest and the existing Node/Vite toolchain cover repository automation.

## Calculations and acceptance

- Obtain independent circle checks from balance of radial acceleration and gravity, with `r = R + h`, `v = √(μ/r)`, and `T = 2πr/v`. For a spherical Earth with a parallel Sun beam in the orbit plane, test the shadow angle using the right triangle from Earth center to the tangent point. Use numeric fixtures with explicit tolerances and verify scale with altitude.
- Add the bus once. Independently total the default design, and test separate mass-only and budget-only violations. Invalid designs must produce zero science and empty histories.
- Check that the battery stays between zero and usable capacity. Use the net-power × elapsed-hours conversion to check one short illuminated interval. Check final backlog against produced minus transmitted data within the display rounding tolerance. Verify deterministic replay and input integrity.
- Keep seed, payload, battery, radio, duration, altitude, and launch fixed while upgrading only the solar array. The deficient design must be valid to launch, deplete power, and fail. The corrected design must complete the mission with greater downlinked data, zero outage steps, and a passing result.
- Exercise every phase, mass and budget rejection, each category control, distinct mission outcomes, and reset in a browser. Probe whether stale results survive edits or the operations timer. Record passing, failing, and pending observations. Apply the same evidence to the final integrated rendering, including the proposed 3D viewer if it becomes available.
- Run `npm test`, `npm run build`, and `git diff --check`. A demo claim requires a browser observation or an explicitly described model result. A source claim needs its original context and attribution.

## Priority and integration

| Priority | Estimated effort | Result |
| --- | --- | --- |
| P0 | Medium, about 2 hours | Sources and precise limitations, reference and resource regression tests, browser demo and review rejection |
| P0 | Low, about 1 hour | English submission text, demo notes and slides, AI disclosure draft, contributor-role mapping |
| P1 | Low, about 30 minutes per integration revision | Repeat UI acceptance, update evidence after PR #3 or a corrected timer |
| Follow-up | Medium to high, owner-led | End-to-end provenance labels or a separately configured documented spacecraft preset |

The integrator owns catalog changes and reviews the shared type boundary. `SpaceComponent` has a single optional `sourceUrl` and one `isSynthetic` flag. That cannot represent a mixed entry with a verified hardware rating and fictional credits without extra field provenance. A future proposal should preserve the legacy field interpretation and explain migration to the integrator before any shared type change. The orbit and resources owners confirm constants and budget semantics. Gameplay owns time integration, scoring and scenario behavior. UI owns state, result freshness and chart wording with the integrator. New references, test additions and demo notes have no runtime dependency on these changes.

For the hackathon, keep the balanced catalog and place verified real-world examples in the science notes and presentation. The TROPICS example needs a single altitude input from the existing slider and a clearly labeled comparison. A hardware-backed preset would also need charge limits, solar derating, duty cycles, link assumptions, compatibility, and rebalanced demo fixtures.
