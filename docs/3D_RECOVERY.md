# 3D loading recovery

## Diagnosis and plan (before code)
Brave reported failed dynamic imports for FableViewerBridge and FlightScene. The local Vite server was unreachable on inspection. Restarting it restores asset delivery, but FlightView permanently latched its lost flag; scene-level React.lazy instances also retained rejected promises across remounts. The outer spacecraft bridge already recreated its lazy wrapper on reopen.

Goal: restore inspection, chase and onboard views after transient loading or graphics failures without changing mission configuration, telemetry or commands.

Change FlightView, EnvironmentExplorer, SpacecraftViewer and SpacecraftPreview: explicit retry, fresh lazy component and keyed error boundary per attempt; recheck WebGL on retry. Keep the 2D fallback and clear status while unavailable. No automatic reload or retry loop. Add bilingual messages and regression tests. No new dependencies or shared contracts. Priority P0, small presentation-only fix.

Acceptance: rejected load can be retried; graphics loss can be retried; selected flight camera and mission frame survive; failed attempts retain functional fallback; unsupported WebGL remains honest. Manually inspect all views in Brave; run full tests/build. Browser settings are not changed.

Implementation prompt: implement the above using existing React lazy/Suspense and boundaries. Reset both lazy cache and boundary on explicit retry, never simulate a 3D success or alter engine outputs. Keep fallbacks accessible and add tests that fail before the fix.

## Delivery and validation
- Fixed a second, visible layout defect: the cockpit flex row inherited align-items:start from the standalone viewer grid. Its canvas stayed at about 150 px despite an available 415 px row. Component-scoped stretch makes the canvas about 391 px tall at the tested 1910×935 viewport.
- Added direct retry to the bridge and recovery of flight, inspection and explorer renderers. Each attempt replaces the React.lazy wrapper and resets its boundary; no reload, mission reset or engine invocation.
- Flight buttons identify the visible 2D fallback when 3D has failed; the requested camera is retained for recovery. The explorer is not disabled just because the flight renderer failed.
- 244 tests passed in 19 files; npm run build passed; git diff --check passed. Includes rejected bridge import, repeated renderer failures, WebGL support changes and context loss with retained frame/camera/object. Updated two pre-existing UI assertions for the explicit retry and honest fallback indication.
- Brave: spacecraft inspection, follow camera and onboard camera rendered using the real WebGL scenes; local scene-module requests returned HTTP 200 after restarting the server. This was a server outage plus missing recovery, not missing model geometry. Restarting Vite triggered its own development reload; the new in-game retry does not reload the page.
- The local server must remain running. This change does not make the browser app an offline installation, repair a permanently unavailable GPU, or recover deleted production assets. The 2D mission remains usable on graphics failure. No physics, contracts, catalog or mission outcomes changed.

## Challenge platform check
The official site's indexed About the Challenge summary asks for an interactive mission-design/management/simulation game, not a Windows executable: https://www.spaceappschallenge.org/2026/find-a-team/missionforge/ . The full text reproduced by HackAthlone also does not specify an installed desktop format: https://hackathlone.com/challenges/space-mission-design-game . Direct retrieval of the official challenge URL returned 502 on 2026-11-15, so this is a platform interpretation from accessible text, not certification of submission compliance. A browser game fits that brief; this repository already specifies a browser-based product.
