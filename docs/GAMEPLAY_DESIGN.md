# Gameplay 2.0 — inspection and technical design

## Baseline inspected
Repository ShelB123/mission-architect-spaceapps-2026; main contains only README.
MVP base: feature/initial-game-scaffold, commit 1092772980cb2ff526432e97037da5e23ba42bbc (draft PR #1).
Read AGENTS.md, PROJECT_SPEC.md, contracts.ts, game.ts, orbit.ts, resources.ts, catalog.ts, App.tsx and existing tests.

Implemented: deterministic 60-second integration, energy reserve, constant synthetic science/downlink rates, engineering review, history and results.
Defects/gaps: unused seed; no mission scenarios; rounded score can reach 100 on failure; coarse steps cross orbital boundaries; explanations confuse production and downlink bottlenecks; events are not displayed by App.tsx.
Ownership: modify only src/engine/game.ts and tests/game.test.ts; add this subsystem document. No shared contract, UI, orbit, resources, catalog, config or dependency edits.

## Objective and architecture
Keep runMission(config, seed) compatible. Add optional third scenario ID and exported read-only scenario definitions in game.ts. Return the unchanged MissionResult. Pure helpers handle seed validation, deterministic event scheduling and scoring.
Four synthetic gameplay scenarios:
- survey (default): 250 MB, catalog budget, up to 30 orbits; balanced introduction.
- budget-survey: 250 MB, 700 credits, up to 6 orbits; avoid buying every upgrade.
- rapid-science: 1000 MB, catalog budget, up to 6 orbits; match payload throughput to radio capacity.
- endurance: 600 MB, catalog budget, up to 12 orbits; distinguish stored energy from sustained generation.
All require valid engineering review, no unpowered steps and target downlinked MB. Mission duration is a player choice below the scenario maximum, not an automatic success.

## Seeded events and algorithms
Use a local 32-bit integer PRNG, not Math.random or wall clock. Accept seeds 0..4294967295 only.
Schedule one synthetic calibration pause (10 minutes, payload acquisition disabled) and one synthetic ground-station unavailability (one orbit, downlink disabled). Timing comes from the seed and mission duration, independent of selected hardware, allowing fair design comparisons.
These are training operations, not predictions of failures, radiation, weather or NASA data. Keep nominal loads powered during both events; do not claim power savings.
Use the existing orbit functions unchanged. Split each 60-second reporting interval at eclipse/contact/event boundaries to avoid awarding operations outside their intervals; conserve energy and data within each segment.
Energy: clamp(E + (generationW - nominalLoadW) * seconds / 3600, 0, capacityWh).
Data: rateMBperMinute * poweredSeconds / 60; never send more than the stored amount. A segment with insufficient energy produces/sends no data (conservative full-segment availability).
Count at most one outage per reporting step. Reliability uses unavailable segment seconds / mission seconds.
Score: 70 points target completion + 20 reliability + 10 unused budget fraction. Floor to integer; cap failures at 99. Success is decided by explicit criteria, never score.
Explain used/allowed budget, downlinked/target MB, remaining backlog, unavailable time and seeded event effects. Mirror event summary into explanations because the current UI renders explanations only.

## Interfaces and dependencies
Input: unchanged MissionConfig, uint32 seed, optional MissionScenarioId.
Output: unchanged MissionResult, with scenario-specific targetMB and design budget/violations.
Reuse evaluateDesign/getSelectedComponents and computeOrbitProfile/isInEclipse/hasGroundContact.
No additional packages; existing TypeScript/Vitest suffice.
Integrator/UI can later select a scenario and seed through the optional argument; no UI selector is claimed here.

## Risks and simpler option
This PR is stacked on the unmerged MVP: target feature/initial-game-scaffold and coordinate retargeting after PR #1 merges.
Resources owner must retain nominal-power semantics (all loads continuously on); orbital contact boundaries are currently 0.78/0.96 and must be coordinated if orbit.ts changes.
Synthetic MB measure quantity, not scientific quality or real ground coverage. No storage-capacity model or operational player commands.
Simpler hackathon solution selected: fixed scenario catalog and two scheduled outages using existing component decisions, without campaign state, new contracts or interactive fault-response UI.
Boundary splitting adds moderate complexity but prevents deterministic events from violating the existing geometry.

## Acceptance and priority
P0: build; all existing orbit/resources tests; deterministic replay; legacy call shape; immutable input; invalid design never runs.
P0: success and diagnostic failure for every scenario, exact/over budget and duration limits, transmitted <= produced, nonnegative storage, battery within capacity, finite score in 0..100 and failure <100.
P1: distinct seeds change actual outcomes; seed extremes/invalid values; radio upgrade improves returned data under equal seed; payload-only upgrade cannot solve constrained downlink; sustained-generation and reserve comparisons.
Complexity: medium (one engine module plus focused tests); default UI remains usable, scenario picker deferred to its owner.

## Implementation prompt (Phase C)
Work from commit 1092772980cb2ff526432e97037da5e23ba42bbc on a named feature branch. Read AGENTS.md and the shared contracts first. Implement the design above in src/engine/game.ts and tests/game.test.ts only; this new design document is the sole documentation addition. Preserve runMission(config, seed=1) and MissionResult. Add typed optional scenario selection without changing contracts.ts or App.tsx. Use pure deterministic seed-based event scheduling, scenario objectives and hard budget/duration constraints, causal explanations visible through existing explanations, bounded transparent scoring and conservative resource accounting with correct seconds/Wh/MB conversion. Keep orbital equations, component catalog and resource assessment untouched. Label all event timings/targets/costs as synthetic gameplay settings. Do not create placeholders or claim UI selectors exist. Add meaningful success/failure tests for each scenario and tests for seed replay, changed outcomes, valid energy/data bounds, integration compatibility and engineering decisions. Run npm test and npm run build; report exact results and blockers honestly. Deliver a draft PR against the MVP branch, explain its dependency on PR #1, and never merge or change main.

## Run and integrate
```sh
git fetch origin
git switch --track origin/feature/gameplay-seeded-scenarios
npm install
npm test
npm run build
npm run dev
```
If the branch already exists locally, use `git switch feature/gameplay-seeded-scenarios`.
Focused acceptance: `npm test -- tests/game.test.ts`.
Existing UI call remains `runMission(mission, 2026)`.
UI-owner integration example: `runMission(mission, 2026, "rapid-science")`; use `missionScenarios` for displayed objectives. The UI review currently calls the generic resource assessment; scenario-specific constraints are enforced in runMission and must also be shown in review when a picker is added.

### Reproducible demonstration fixtures
At 450 km and seed 2026, all numbers below are outputs of this simplified model, not measured mission performance.

| Scenario | Passing design (payload / solar / battery / radio; launcher) | Duration | Returned MB | Failure comparison and learning |
| --- | --- | --- | --- | --- |
| survey | basic / basic / basic / basic; rideshare | 6 | 294.335 | HD payload with basic solar/battery/radio and dedicated launch loses power: match energy supply to demand. |
| budget-survey | basic / basic / basic / basic; rideshare | 6 | 294.335 | Upgrading only the radio costs 725 > 700 credits: increased capacity has a budget consequence. |
| rapid-science | HD / advanced / basic / advanced; dedicated | 6 | 1177.341 | HD/basic/advanced/basic produces 2643.066 MB but returns 294.335 MB: acquisition is not delivery. |
| endurance | basic / basic / basic / basic; rideshare | 12 | 647.538 | HD/basic/advanced/basic survives 6 orbits but loses power at 12: a larger battery does not guarantee sustainable operation. |

IDs use camera-basic/camera-hd, solar-basic/solar-advanced, battery-basic/battery-advanced and radio-basic/radio-advanced. No configuration file or catalog changes are required.
