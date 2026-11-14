# Mission Architect — AI agent collaboration rules

## Goal
Produce a working, scientifically defensible educational LEO mission-design game for NASA Space Apps Challenge 2026.

## Architecture
- React 19 + TypeScript + Vite; single-browser app, no backend or secrets.
- Shared types are in `src/types/contracts.ts`.
- Pure calculations are in `src/engine`; UI must not independently recompute mission results.
- Catalog values in `src/data/catalog.ts` are **synthetic game parameters**, not NASA hardware specifications.
- Preserve the fixed mission phases: briefing → design → review → operations → debrief.

## Ownership
1. Integrator: configs, shared types, App.tsx, CI.
2. Orbit engineer: src/engine/orbit.ts and tests/orbit.test.ts.
3. Resources engineer: src/engine/resources.ts and tests/resources.test.ts.
4. UI engineer: src/visualization/** and component-scoped styles; App.tsx and global styles require an integrator-owned integration PR.
5. Gameplay engineer: src/engine/game.ts and tests/game.test.ts.
6. QA/research: docs/SOURCES.md, docs/PHYSICS_ASSUMPTIONS.md, README, independent acceptance tests and demo notes.

## Mission Architect 2.0 coordination
- Integrator owns docs/PROJECT_SPEC.md, docs/ARCHITECTURE.md, docs/TEAM_INTEGRATION.md, docs/MODULE_1_PROMPT.md and docs/ARCHITECTURE_REVIEW.md for this architecture change.
- Read docs/ARCHITECTURE.md and docs/TEAM_INTEGRATION.md before starting 3D work; the file ownership table is authoritative for this iteration.
- The 3D viewer is a read-only presentation layer. It must not import engines, mutate MissionConfig or derive engineering values from geometry.
- Keep src/types/contracts.ts unchanged for the first 3D increment. Proposed presentation interfaces belong in src/visualization/types.ts in a later implementation PR.
- Only the integrator changes package.json, the lockfile, App.tsx, global styles or CI. Other contributors propose exact patches in their PR descriptions.
- No renderer, adapter or new runtime dependency is implemented by the module-1 documentation PR.
- Feature branches must start from a commit containing the MVP. At inspection, main has only README.md and the MVP is in draft PR #1; do not assume main already contains the game.

## Rules
- Work on a named feature branch and open a PR; do not commit directly to main.
- No changes to shared contracts or other owners' files without coordinated review.
- Never fabricate NASA citations, experimental results, sensor values, or mission-performance claims.
- Document units and approximation limits of every physical formula.
- Run `npm run build` and `npm test` before merging.
- No unnecessary dependencies or speculative features before MVP works.
