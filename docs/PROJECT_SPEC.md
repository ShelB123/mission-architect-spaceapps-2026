# Project specification — Mission Architect 2.0

> Estado actual de entrega: ver [README](../README.md), [comparación de ramas](VERSION_COMPARISON.md) y [QA Windows](WINDOWS_QA.md). Las secciones de planificación siguientes describen la base histórica; la candidata actual ya integra el visor, operaciones 3D y distribución de escritorio.

## Challenge
NASA Space Apps Challenge 2026 — Space Mission Design Game.

## Product
Browser-based educational strategy game. Player configures a simulated Earth-observation smallsat in low Earth orbit; chooses payload, solar, battery, radio, launch option and altitude; runs a deterministic mission and receives causal explanations and scoring.

## Acceptance criteria
1. A player can change all four component categories and launcher without editing code.
2. Mass, cost, and power budgets change when the configuration changes.
3. Invalid mass and budget designs are rejected in engineering review.
4. The engine simulates alternating sunlight/eclipse, energy use, science acquisition and downlink.
5. Changing a component produces a reproducible change in outcome.
6. The result provides a score, energy and data charts, and understandable explanations.
7. All non-NASA component specifications are marked **synthetic**.
8. Build and unit tests complete successfully in CI.

## Out of scope for first version
3D flight dynamics (distinct from the spacecraft inspection viewer below), transfer orbits, orbital maneuvers, actual launch vehicle procurement, accurate ground-station geometry, mission-critical operations, live AI API, accounts, multiplayer, telemetry backend.

## Team roles
1. Architecture/integration; 2. orbit; 3. resources; 4. UX; 5. gameplay; 6. QA, data provenance and submission.

## Source discipline
Use NASA sources for concepts and background; every numerical hardware specification in the initial catalog is synthetic for gameplay. Do not label it as an official product rating.

## Increment 2.0: spacecraft inspection viewer (planned, not implemented)

Objective: help the player understand which hardware is selected while preserving the existing engineering results and five-phase flow.

- Add an optional, lazily loaded 3D spacecraft inspection panel in Design; the existing cards and budgets remain fully usable.
- Use a synthetic schematic bus and procedural payload, solar, battery and radio representations. No CAD accuracy, collision detection, structural qualification or NASA hardware claims.
- The catalog and MissionConfig remain the only source of component IDs and engineering values.
- Camera rotation, zoom, inspection highlight and schematic exploded view are presentation state only. They never change the selected components, solar generation, mass, cost, eclipse or score.
- A battery may be internal; the accessible component list and optional schematic exploded view must identify it without pretending it is externally mounted flight hardware.
- Every existing component ID has a visual mapping. Unknown IDs or unavailable mappings produce an explicit diagnostic and an accessible textual fallback; the viewer must not silently substitute a different physical component.
- The current viewer does not depict orbital motion, attitude, Sun illumination or mission replay. MissionResult has no time-tagged state trajectory.
- No new backend, state-management library, physics engine or external model download is required.

### Acceptance criteria for the future viewer PR

1. All eight current catalog component IDs are represented and labeled as synthetic schematic geometry.
2. Each category switch updates the viewer and existing cards consistently; one selected component may create multiple visual parts (e.g. two solar panels).
3. Default and alternate mission results are deeply identical with the viewer mounted, unmounted, rotated, zoomed and highlighted; no input mutation.
4. The existing mission can be completed with the viewer disabled, when WebGL is unavailable, or when the viewer's lazy import/context fails.
5. Fallback and selection information are keyboard-accessible; no information is only available inside the canvas.
6. The first increment loads no model/texture from a CDN and adds no orbital or energy calculation to the view.
7. Build and all tests pass for the exact proposed integration commit. Manual playthrough, context-loss handling, repeated mount/unmount and resize are recorded on the demonstration browser/device.
8. Browser interactions with the view never rerun runMission; simulation remains an explicit player action.

Detailed interfaces: [ARCHITECTURE.md](ARCHITECTURE.md).
Ownership and integration gates: [TEAM_INTEGRATION.md](TEAM_INTEGRATION.md).
Audit and known defects: [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md).
Module-1 implementation prompt: [MODULE_1_PROMPT.md](MODULE_1_PROMPT.md).

### Scope of the module-1 PR

Documentation only: update this specification and AGENTS.md, add architecture, audit, team instructions and the integrator prompt. No renderer, adapter, shared-contract changes, new dependencies, engine changes or feature-completion claims.
