# Mission acceptance record

Validation on 14 November 2026. The product revision is [main at 1476eb9](https://github.com/ShelB123/mission-architect-spaceapps-2026/commit/1476eb9236b8e6cfca9b8a04ce491ab69fa2f9d2), including PRs #2 (3D design documentation), #3 (gameplay), and #4 (resource diagnostics). The QA branch integrates that revision in [PR #5](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/5). The historical comparison uses [33bcf55](https://github.com/ShelB123/mission-architect-spaceapps-2026/commit/33bcf55d44d2eb5f76ec54459dcc73789649a1ca), the original MVP merge.

## Release regression at `8db3341`

CI setup uses Node from `.nvmrc` and npm 12.2.2. Local validation used Node 24.22.1 with the same npm installer and lockfile.

```sh
npm ci
npm run build
npm test
git diff --check
npm run preview -- --host 127.0.0.1
```

The clean installation, production build and all 174 tests passed. The suite covers nine independent acceptance tests, 51 gameplay, 21 resources, 32 orbit, 26 launch/session and scenario UI tests, eight preview-host tests and 27 renderer tests.

Chromium 153 exercised the four scenarios on the production bundle at `8db3341`. The previously stale debrief became inaccessible after changing altitude, duration, launcher, component or scenario. Returning to Design during the 450 ms delay and choosing **Cancel launch** both cancelled the pending run. A fresh 550 km launch returned 300.8 MB. The corrected chart labels identify stored energy and sample order. The injected-error UI test covers returning to Review after an exception.

All fixtures below use 450 km and the browser's fixed seed 2026. Unspecified components and Shared Launch use the defaults.

| Scenario | Winning configuration | Returned / target (MB) |
| --- | --- | ---: |
| Eyes on Earth | Defaults, six orbits | 294.3 / 250 |
| Lean Survey | Defaults, six orbits | 294.3 / 250 |
| Rapid Science Return | HD imager, expanded solar, compact battery, high-rate downlink, Dedicated Launch, six orbits | 1,177.3 / 1,000 |
| Sustained Operations | Defaults, 12 orbits | 647.5 / 600 |

Review blocked Lean Survey with the high-rate downlink at 725/700 credits. It blocked Rapid Science Return at seven orbits against a six-orbit deadline. Both were verified using browser controls.

### Open findings

| Owner | Evidence and impact |
| --- | --- |
| Integrator and viewer | The production entry point leaves the preview loader unset. The component list works. The locally connected viewer falls back after a failed scene download, but neither retry control starts a fresh download. [3D checks](QA_3D.md) |
| Orbit | At 550 km, pass `0.5 - eclipseFraction / 2` from the returned orbit profile to `isInEclipse`. It reports sunlight at the exact ingress due to phase normalization rounding. The documented interval includes ingress. Gameplay samples interval midpoints, and this check established no impact on the measured demo. |
| Integrator and team owner | The footer says open source and the reviewed tree has no project LICENSE file. Confirm the intended license and align the label. Rehearse on the actual demo device. |

## Historical baseline and numerical comparison

The following fixtures compare the original MVP and the product revision accepted in PR #5.

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

The former failure-with-100 case was rerun in both revisions. At 550 km, two orbits, and seed 2026, the HD imager, standard solar, compact battery, high-rate radio and Dedicated Launch returned 490.0 MB with two affected steps and scored 100 in the MVP despite failing. The integrated result fails the data target with 240.7 MB, zero affected steps and score 88. The engine now caps a failed score at 99. Time steps now split at modeled transitions, with sub-interval power, science and contact checks verified by the gameplay tests.
