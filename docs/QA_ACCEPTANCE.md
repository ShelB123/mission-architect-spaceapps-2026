# Mission acceptance record

Validation on 14 November 2026. The product revision is [main at 1476eb9](https://github.com/ShelB123/mission-architect-spaceapps-2026/commit/1476eb9236b8e6cfca9b8a04ce491ab69fa2f9d2), including PRs #2 (3D design documentation), #3 (gameplay), and #4 (resource diagnostics). The QA branch integrates that revision in [PR #5](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/5). The historical comparison uses [33bcf55](https://github.com/ShelB123/mission-architect-spaceapps-2026/commit/33bcf55d44d2eb5f76ec54459dcc73789649a1ca), the original MVP merge.

## Reproduce the checks

```sh
npm install --no-package-lock --no-audit --no-fund
npm run build
npm test
git diff --check origin/main...HEAD
npm run preview -- --host 127.0.0.1
```

Node 24.22.1, npm 11.9.0, Vitest 3.2.7, Vite 7.3.8. The reviewed tree has no lockfile. The build passed TypeScript checking and Vite bundling. All 85 tests passed across four files.

| Test file | Count | Verified |
| --- | ---: | --- |
| `tests/acceptance/mission.acceptance.test.ts` | 9 | Independent orbit/eclipses at 450 and 550 km, synthetic flags, isolated mass and budget rejection, data and energy bounds, deterministic replay, controlled solar upgrade |
| `tests/game.test.ts` | 51 | All four scenarios, seed validation and repeatability, event effects, time-boundary integration, score, and resource invariants across catalog combinations |
| `tests/resources.test.ts` | 21 | Engineering budgets, design validity, daylight and orbit-average generation, eclipse demand, and downlink diagnostics |
| `tests/orbit.test.ts` | 4 | Circular orbit, altitude restrictions, and eclipse/contact functions |

The existing nine acceptance cases passed immediately after the merge. The refreshed checks use full-precision backlog (absolute tolerance of 10⁻⁸ MB), compare the ordinary browser call with explicit `survey`, and check that the upgraded craft ends with a full battery. The implementation retains the same engineering totals. The default design is 20 kg, 595 credits, 28 W load, 60 W sunlit generation and 110 Wh capacity. The 3 W deficit over the high-load design's first sunlit minute draws 0.05 Wh. End-of-run data residuals in the measured cases were below 10⁻⁸ MB.

## Numerical comparison

All cases use six orbits and seed 2026. The integrated run uses `survey`, the browser's scenario, and a 250 MB target. In the MVP the seed argument is accepted and has no effect on the result. Values below match UI precision. All figures are outputs of the game model.

| Configuration | Produced MB, MVP → integrated | Returned MB, MVP → integrated | Underpowered steps, MVP → integrated | Score, MVP → integrated |
| --- | ---: | ---: | ---: | ---: |
| All standard components, Shared Launch, 450 km | 728.8 → 715.8 | 353.5 → 294.3 | 0 → 0 | 100 → 95 |
| HD imager, standard array, compact battery, basic radio, Dedicated Launch, 450 km | 1,156.8 → 1,108.8 | 119.0 → 117.7 | 320 → 320 | 46 → 43 |
| Same HD design with only the expanded array selected | 2,691.1 → 2,643.1 | 353.5 → 294.3 | 0 → 0 | 100 → 91 |
| All standard components, Shared Launch, 550 km | 744.9 → 731.9 | 364.0 → 300.8 | 0 → 0 | 100 → 95 |

The integrated default and expanded-array runs are powered throughout. At 450 km, their basic radio transmits at 3.5 MB/min for five modeled windows of 0.18 of an orbit each. Using a 93.4398 min circular period gives 294.335 MB. Calibration removes 10 minutes of payload acquisition. At 450 km and six orbits with seed 2026, calibration occurs at 194.43–204.43 min and the station is unavailable at 280.32–373.76 min. The high-load standard array uses the same schedule and has 319.64 modeled unavailable minutes, counted across 320 reporting steps.

## Browser run

Playwright 1.62.1 drove headless Chromium 153.0.8010.0 at 1440 × 1000 against the production bundle. There were zero console/page errors on these paths. Tests used the live UI.

| Case | Steps and observed result |
| --- | --- |
| Full mission and events | Briefing → Begin engineering → Review engineering → Launch simulation → Operations → Debrief. The 450 km review showed 93.4 min and 38.4% estimated eclipse. Debrief showed 294.3 MB returned, score 95, two plots, both training events and seed 2026. |
| Mass rejection | Choose all four upgraded components and Shared Launch. The buttons reflected the new selection and review blocked launch at 38 kg versus 28 kg, with 1,280 credits. |
| Budget rejection | Keep those components and switch to Dedicated Launch. Review blocked launch at 1,460 versus 1,400 credits with 38 kg within the 55 kg limit. |
| Solar comparison | Select HD and Dedicated Launch with other parts at default. Both designs passed review. Standard solar yielded 117.7 MB and 320 underpowered steps. From Debrief choose **Improve design**, select only Expanded Solar Array, and launch again. The second run yielded 294.3 MB and zero underpowered steps. The seed and event schedule were identical. |
| Reset and reference altitude | **Start new mission** restored the briefing and default design. Advance the altitude slider twice from 450 to 550 km and review. The model displayed 95.5 min and 37.2% eclipse. A fresh 550 km run returned 300.8 MB. |

## Defects and feature boundaries

| Priority and owner | Status and evidence |
| --- | --- |
| P0, integrator and UI | Reproduced. Complete a default mission, return to Design through the stepper, and change altitude, duration, or launcher. In each case the previous Debrief remains available with the prior results. Invalidate the result when any mission input changes. |
| P0, integrator and UI | Reproduced. Launch at 450 km and return to Design before the 450 ms timer finishes. Switch to 550 km. The timer opens Debrief showing a 550 km header and the old 294.3 MB result. A fresh 550 km launch gives 300.8 MB. Cancel or discard stale simulations. |
| P1, integrator and UI | The plot titled “Battery capacity” shows stored energy in Wh. The footer calls the game open source. The inspected tree lacks a project LICENSE. Align labels with the model and the team's chosen license. |
| P1, integrator and UI | Inspecting the error branch shows a caught simulation error leaves the app in Operations. The browser run used regular user inputs and did not inject a failure. Replay on the team's demo device also remains pending. |
| Optional, integrator and gameplay/UI | The engine accepts three additional scenarios and caller-supplied seeds. A browser selector would need the scenario's budget and deadline reflected in Review as well as Operations. |
| Optional, integrator and 3D/UI | PR #2 delivered the design. The renderer, App wiring and [3D checks](QA_3D.md) are pending. |

The former failure-with-100 case was rerun in both revisions. At 550 km, two orbits, and seed 2026, the HD imager, standard solar, compact battery, high-rate radio and Dedicated Launch returned 490.0 MB with two affected steps and scored 100 in the MVP despite failing. The integrated result fails the data target with 240.7 MB, zero affected steps and score 88. The engine now caps a failed score at 99. Time steps now split at modeled transitions, with sub-interval power, science and contact checks verified by the gameplay tests.
