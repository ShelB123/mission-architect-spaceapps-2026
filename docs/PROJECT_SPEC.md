# Project specification — Mission Architect MVP

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
3D flight, transfer orbits, orbital maneuvers, actual launch vehicle procurement, accurate ground-station geometry, mission-critical operations, live AI API, accounts, multiplayer, telemetry backend.

## Team roles
1. Architecture/integration; 2. orbit; 3. resources; 4. UX; 5. gameplay; 6. QA, data provenance and submission.

## Source discipline
Use NASA sources for concepts and background; every numerical hardware specification in the initial catalog is synthetic for gameplay. Do not label it as an official product rating.
