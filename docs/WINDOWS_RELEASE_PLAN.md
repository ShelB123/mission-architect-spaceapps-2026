# Windows release candidate plan

## Inspection and choice
Inspected all 3 local branches and 15 remote branch heads after git fetch --all --tags (no pruning/deletion). Current branch was feature/playable-mission-cockpit at 627e4ca. origin/main at 9232027 has an identical file tree and merged PR 13, so use that already consolidated main commit as base. No GitHub releases existed at inspection. All feature heads are ancestors of main except the orbital branch's optional extensions at 1dde820.

Create integration/windows-rc-20261115, backed by backup/pre-windows-rc-20261115 at 627e4ca. Merge the orbital branch with history: optional beta, velocity, countdown and validity helpers, four files only, no conflicts. Default beta=0 and fictional contacts remain; existing deterministic mission acceptance tests must still pass. The additions are engine APIs, not new UI controls.

## Architecture and simplest delivery
Existing React 19 + TypeScript + Vite, Three.js/R3F, pure numerical engine and procedural models. Keep frontend unchanged. Add Electron 45.3.2 and @electron/packager 20.3.0 (exact registry latest stable versions checked), plus fflate to create/check ZIPs in Node. Use a small CommonJS desktop host and a standard secure custom app protocol serving only bundled dist files. Node integration disabled, renderer sandbox and isolation enabled, permissions denied, external HTTPS links outside game. No backend, development server, GPU flags or WebView2 installation needed. Full Chromium runtime bundled.

Files: desktop/main.cjs, desktop/assets.cjs, scripts/package-windows.mjs, scripts/verify-package.mjs; package/lock/scripts, README, docs/release comparison and QA, issue templates, desktop CI. Input is the existing production dist; output is a Windows x64 portable directory and versioned ZIP with SHA256 + build provenance. Web build remains npm run build. No shared-contract changes.

## Risks and acceptance
Potential packaged absolute-URL/texture/dynamic-import failures: use secure standard app://mission origin so absolute /assets and /textures resolve. Verify every bundled dist asset hash, run packaged app without Vite and exercise inspection/follow/onboard/explorer/mission result on Windows. Check relocated extracted folder with spaces. Unsigned executable may be flagged by SmartScreen; no signing certificate available and no automatic bypass. ZIP must be fully extracted, not exe alone. Performance requirements are measured on the available PC only, no invented minimum RAM/FPS.

Priority P0, moderate packaging complexity; avoid gameplay/styling refactors. Full tests/build, desktop helper tests, package inventory and real native-window walkthrough before a prerelease. Publish RC tag/release assets on feature integration branch; main and original branches preserved.

## Implementation prompt
Package the actual repository, never a replacement demo. Follow this plan, use exact locked versions, isolate platform host code, include textures and license notices, generate reproducible commands and asset hashes, protect app protocol against path traversal and remote navigation, test packaged assets and real Windows gameplay. Document every tested/untested limitation and preserve all branch histories.
