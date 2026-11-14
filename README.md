# Mission Architect — NASA Space Apps Challenge 2026

AI-assisted educational strategy game for the **Space Mission Design Game** challenge.

Design an Earth-observation satellite, trade off mass, power, budget and communications, simulate an idealized LEO mission, and receive explanations of the result.

## Quick start

Requires Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Use the URL printed by Vite (normally http://localhost:5173).

```bash
npm run build
npm test
```

## Core features

- Mission briefing → builder → engineering review → operations → debrief.
- Select payload, solar array, battery, communications, launcher, altitude and duration.
- Circular-orbit period and idealized eclipse estimates.
- Stepwise sunlight/eclipse energy accounting and fictional downlink windows.
- Science scoring, engineering explanations and data/energy graphs.
- Reproducible outcomes and unit tests.

## Important limitations

**This is an educational prototype, NOT a flight simulator.** Hardware masses, prices (fictional game credits), power, data rates, launcher limits, ground-contact timing, and science target are synthetic. No NASA component performance data is claimed. The model excludes drag, J2, pointing, thermal, true ground-station geometry and other flight dynamics.

Read [physics limitations](docs/PHYSICS_ASSUMPTIONS.md), [source provenance](docs/SOURCES.md), [project scope](docs/PROJECT_SPEC.md), and [AI collaboration instructions](AGENTS.md).

## Six-person team roles

1. Architecture/integration; 2. orbital physics; 3. spacecraft resources;
4. interface/UX; 5. game logic; 6. QA/research and delivery.

Develop on feature branches and review changes via pull requests. Coordinate any shared contract changes.

## AI disclosure

Initial code and documentation were drafted with ChatGPT assistance. Human contributors must validate the implementation, sources and physics. This project is not endorsed by NASA.
