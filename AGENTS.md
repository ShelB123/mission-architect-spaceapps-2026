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
4. UI engineer: src/App.tsx and src/styles.css (coordinate with integrator).
5. Gameplay engineer: src/engine/game.ts and tests/game.test.ts.
6. QA/research: docs, README, independent acceptance tests and demo notes.

## Rules
- Work on a named feature branch and open a PR; do not commit directly to main.
- No changes to shared contracts or other owners' files without coordinated review.
- Never fabricate NASA citations, experimental results, sensor values, or mission-performance claims.
- Document units and approximation limits of every physical formula.
- Run `npm run build` and `npm test` before merging.
- No unnecessary dependencies or speculative features before MVP works.
