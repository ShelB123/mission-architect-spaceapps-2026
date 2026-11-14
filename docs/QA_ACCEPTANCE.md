# Mission acceptance record

Tested 14 November 2026 on the MVP at `1092772980cb2ff526432e97037da5e23ba42bbc`. Its tree matches `main` at `33bcf55d44d2eb5f76ec54459dcc73789649a1ca` after PR #1 merged. The QA branch adds documentation and independent Vitest cases. Run these commands from a checkout with the MVP.

```sh
npm install
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

## Automated result

Node 24.22.1, npm 11.9.0, Vitest 3.2.7, and Vite 7.3.8. The original 12 tests and all nine independent acceptance cases passed. The production build passed TypeScript checking and Vite bundling. The repo uses version ranges and had no lockfile at this baseline. Record the resolved versions again when retesting.

The same acceptance file was also exercised in detached checkouts of the gameplay branch at `106df790d962cf40dc81c0a7f9c2126bd4a039b2` and the resources branch at `41a1249e499df2c369b82a808587f2b9df0e1254`. They passed 68 and 85 tests respectively and both built with the same dependencies. The browser figures below are from the MVP base. Re-record the demonstration if seeded gameplay is integrated.

| Independent acceptance | Evidence |
| --- | --- |
| Scientific reference | Circular period, speed and beta-zero eclipse at 450 and 550 km match independent NASA/JPL-based fixtures within the tolerances in [Physics assumptions](PHYSICS_ASSUMPTIONS.md). |
| Source flags and review | All catalog and launcher entries identify as synthetic. The default totals are 20 kg, 595 credits, 28 W load, 60 W sunlit generation and 110 Wh. The mass-only and budget-only fixtures fail review and produce no mission telemetry. |
| Resource accounting | Repeat runs agree, battery samples stay in their bounds, final backlog equals production minus transmission within rounding precision, and a net 3 W discharge over 60 seconds draws 0.05 Wh. |
| Causal result | The HD payload with basic solar is valid to launch but fails in operations. Substituting only expanded solar removes the power deficit and increases returned data. |

## Browser runs

Used Playwright with headless Chromium 153.0.8010.0 against the production build at 1440 × 1000. The run drove the actual buttons and sliders, recorded visible results and checked for page or console errors. No such errors appeared on the exercised route. Graphs were present as two SVG images in every completed debrief.

| Case | How to reproduce | Observed |
| --- | --- | --- |
| Flow and default mission | Start in Briefing. Choose **Begin engineering**, **Review engineering**, and **Launch simulation**. Observe Operations and Debrief. | Passed. The review showed 93.4 min and 38.4% estimated eclipse. Debrief showed 353.5 MB returned, 728.8 MB produced, zero outage steps, and score 100. |
| Selection and mass rejection | In a new mission select **High-Resolution Imager**, **Expanded Solar Array**, **Extended Battery**, and **High-Rate Downlink**. Keep **Shared Launch**. | Passed. Each selected button reported pressed. The 38 kg craft exceeds the 28 kg limit by 10 kg at 1,280 credits. Launch was disabled. |
| Budget rejection | Keep those components and switch to **Dedicated Launch**. | Passed. The 38 kg craft fits the 55 kg limit. Its 1,460 credits exceed the budget by 60. Launch was disabled. |
| Power deficit | Start fresh. Select **High-Resolution Imager** and **Dedicated Launch**. Leave the standard solar array, compact battery, and basic radio. Keep 450 km and six revolutions. | Passed. The design passed review at 29 kg and 1,075 credits. The 60 W array served a 63 W nominal load. Debrief reported 119.0 MB returned, 320 underpowered steps, and score 46. |
| Recovery | Choose **Improve design**, choose only **Expanded Solar Array**, review, and launch. | Passed. At 32 kg and 1,215 credits, nominal load stayed at 63 W and sunlit generation rose to 150 W. Debrief reported 353.5 MB returned, zero outage steps, and score 100. |
| Reset | Choose **Start new mission** after Debrief. Begin engineering again. | Passed. The app returned to Briefing and restored 20 kg, 595 credits, 450 km and six revolutions. |
| Documented altitude comparison | In a fresh design press the altitude slider's right arrow twice to reach 550 km, review and launch. | Passed. Review displayed 95.5 min and 37.2% estimated eclipse. A fresh debrief gave 364.0 MB returned with zero outage steps. Only the altitude input comes from the TROPICS target; the output is the educational model. |

## Failures and owner handoffs

| Priority and owner | Status and reproduction | Expected |
| --- | --- | --- |
| P0, integrator and UI | Reproduced. Finish a default run. Navigate to Design using the stepper, then change one of altitude, duration, or launcher. The Debrief step remains available and gives the prior results in each case. | Tie the result to its input configuration. Edits should invalidate the prior debrief. |
| P0, integrator and UI | Reproduced. Launch the default run, return to Design before the timer completes, and change 450 to 550 km. The app pushes into Debrief with a 550 km header and the previous 353.5 MB value. A fresh 550 km launch returns 364.0 MB. | Reject or cancel the old run when its configuration or phase changes. |
| P1, gameplay | Reproduced with the base engine. At 550 km over two orbits select HD, basic solar, compact battery, high-rate radio and Dedicated Launch. The result is a failure with two underpowered steps and an integer score of 100. | Present a score consistent with the binary outcome, or make the scoring difference unmistakable in UI. PR #3 proposes a cap for failures. |
| P1, orbit and gameplay | Confirmed by inspecting the base step loop. Eclipse and contact transitions can fall inside a 60 s interval whose state is taken at the start. | Review interval splitting in PR #3 and retest with that engine. |
| P1, integrator and UI | The browser's battery plot is titled capacity. The MVP footer calls the project open source, although the inspected tree lacks an explicit project license. | Label the plot stored battery energy in Wh. The integrator should confirm the intended project license with the team and align the footer text. |
| P1, integrator and UI | Simulation throw recovery, mobile browser behavior, and demo-device rehearsal remain pending. | Exercise the error path and record browser/device behavior after integration. |

The tested demo uses **Improve design** and **Start new mission**, both verified. A future 3D acceptance run should repeat the same mission input and assert unchanged engineering results with the viewer mounted, hidden, rotated, and inspected. Check fallback, WebGL context loss, keyboard access, resize and repeated mounting. The architecture-only PR supplies no working viewer for these checks.
