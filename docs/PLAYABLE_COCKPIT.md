# Playable cockpit increment

Baseline: viewer-wiring `9eb4181`; checkpoint commit `a9c5060`, tag
`backup/pre-gameplay-redesign-20261114`. User explicitly authorized interface and
gameplay integration in this branch; no shared contract or orbital equation changes.

## Plan before implementation
Replace the scrolling application presentation with a desktop cockpit and responsive
mobile panels. Preserve briefing, design, review, operations and debrief. Reuse the
existing spacecraft viewer with an accessible schematic fallback. Show short challenge
briefs, component deltas, live resource meters, gradual hints and attempt comparisons.

Instrument the existing gameplay integration with opt-in time-stamped frames and
validated commands. Legacy `runMission(config, seed, scenario)` remains unchanged.
Local gameplay types describe replay frames and commands; `contracts.ts` stays stable.
Operations show actual computed states, not fabricated interpolation of chart arrays.
Pausing the camera removes its nominal W and MB/min until resumed; bus and radio loads
remain active. Event calibration retains nominal loads as in the baseline. Recompute
from the same seed and chronological command log when a player commands a mode change;
only the future changes. This is accelerated educational simulation, not flight control.

Files: game.ts, useMissionSession.ts, App.tsx, styles.css, SpacecraftPreview.tsx;
new cockpit presentation components and replay tests. Reuse existing React, Three and
Vitest; no new dependencies. UI owner integration is within the user's explicit scope.

Acceptance: deterministic replay and commands; trace final totals equal result;
unchanged legacy numerical fixtures; command cannot alter earlier samples; savings
trade off acquisition; input immutability; cancellation/error/stale-result regressions;
all four scenario gates; comparison only for compatible scenario and seed; pause/speed
and finish; fallback without WebGL; desktop bounded shell and responsive mobile;
TypeScript build and full tests. UI changes require updating interaction tests, not
discarding their safety assertions.

Priority: cockpit and retry P0, trace and operational commands P1. Medium complexity.
Risks: replay timing, future-result leakage, command recomputation, small screens,
viewer load failures. Do not claim scientific quality from MB, real coverage, new
orbital mechanics, or user-study findings. Synthetic quantities remain labeled.

## Implementation brief
Implement the plan against the current React/Vite app, not a new project. Keep all
physics in the engine; the visualization only presents sampled state. Never publish a
command button without engine consequences. Preserve validated seed, scenario and
configuration in each attempt. Use small presentation components, no dependency
changes, and run full build/tests before committing. Keep changes on a feature branch.

## Implemented behavior and lessons
- One desktop cockpit, separate phases, always-visible resource HUD and actions.
  Secondary information scrolls within panels. Mobile deliberately stacks readable
  panels; it is not forced into a tiny desktop viewport.
- Existing read-only 3D bridge opens in Design; component selection still works
  without the renderer. Hover/focus previews differences; selecting retains the
  cost, mass, load and capability differences from the previous part.
- Optional repair starts use ordinary catalog configurations. No secret penalties.
- Playback uses integration timestamps, including event/contact/eclipse boundaries;
  pause and speed change presentation time only. Resource values hold the last
  computed frame, without inventing interpolation.
- Camera commands are applied at the displayed simulation timestamp. The same
  configuration + uint32 seed + ordered exact-time command log reproduces the result.
  Camera off subtracts its nominal W from load and stops MB/min production. Bus/radio
  stay active; available stored data can still downlink during contact.
- Results prioritize success/failure cause, returned data, optional progressive
  hints and a previous-attempt comparison. Comparisons require the same scenario
  and seed; duration/design/commands may differ and this is stated explicitly.

| Challenge | What the player learns | Verified repair |
| --- | --- | --- |
| First light | Camera load can exhaust reserves; operations can save a design | Better solar array OR camera-off commands during eclipses |
| Lean Survey | Extra downlink capacity can consume unnecessary budget | Smaller radio; an alternative higher-altitude, shorter plan also succeeds |
| Rapid Science Return | Acquired data are not useful until returned | Match camera, solar supply and downlink; multiple altitudes succeed |
| Sustained Operations | More battery delays a recurring deficit without fixing it | Increase generation, or use a low-load spacecraft for longer |

Energy integration retains the existing equation
`deltaWh = (generationW - loadW) * deltaSeconds / 3600`, with capacity bounds.
Acquisition/downlink retain `MB = rateMBperMinute * deltaSeconds / 60`.
No orbital equations, catalog prices, scenario targets, shared contracts, dependencies,
or renderer internals were changed. Preflight budget/deadline checks now share the
engine's assessment function to prevent inconsistent launch gates.

## Review and demonstration
1. Open First light, choose **Try a repair challenge**, review and launch.
2. Pause, compare Observe versus Save power; the load changes by 42 W for the HD camera.
   Keeping it off forever conserves energy but cannot complete the science objective.
3. Finish, improve the design, choose Expanded Solar Array and relaunch with seed 2026.
4. Compare outcomes, then try Lean Survey and Rapid Science Return.
5. Test desktop at 1366×768, narrow mobile, keyboard-only operation and disabled WebGL.
   These visual checks and observation of new players remain manual acceptance work.

## Limits and integration notes
- Attempt comparison and command logs live in the current tab session; reloading
  clears them. No save-file import/export or account persistence is implemented.
- Camera switching is an ideal synthetic control with no modeled warm-up, latency or
  switching energy. Radio operation is automatic; there is no separate priority-radio
  command. The orbital picture is a schematic, not a ground track or scale drawing.
- The original conservative all-or-none powered subinterval approximation remains;
  power-deficit counts are reporting intervals, not distinct failure events.
- The 700-credit catalog permits only the basic hardware combination. Altitude,
  duration and operational choices provide alternatives; more budget hardware
  variety requires a coordinated catalog/balance increment.
- The existing Three.js scene remains a large lazy-loaded chunk. Build emits its
  chunk-size advisory; no dependency or chunk policy was changed here.
- Browser automation was unavailable (connection timeouts). DOM flow tests cover
  controls, cancellation, keyboard help, scenario gates and optional-renderer
  failures; they do not establish rendered visual quality or player enjoyment.
- This is an integration PR across gameplay and the app shell, explicitly requested
  by the user. It builds on viewer-wiring commit 9eb4181 and needs integrator review.

## Validation (2026-11-14)
- npm test -- --reporter=dot: **202 passed**, 11 test files.
- npm run build: **passed** (TypeScript and production Vite bundle).
- git diff --check: passed.
- Local Vite HTTP endpoint: 200 at http://127.0.0.1:5173.
- No automated browser screenshot or real-player usability session completed.
