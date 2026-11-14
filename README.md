# Mission Architect

An educational browser strategy game for the 2026 NASA Space Apps Challenge, Space Mission Design Game. Configure an Earth-observation satellite, pass engineering review, and compare how your design choices affect power and science return. The duration is adjustable, with six orbits selected by default.

## Run the MVP

The playable MVP entered `main` in [PR #1](https://github.com/ShelB123/mission-architect-spaceapps-2026/pull/1). From a checkout with `package.json`, use Node.js 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite. To run the automated checks and compile the production bundle:

```bash
npm test
npm run build
```

## Mission and model

The five phases are Briefing, Design, Review, Operations, and Debrief. Choose a payload, solar array, battery, radio, launch strategy, altitude, and mission duration. Review checks mass and budget and diagnoses energy and downlink constraints. Operations include a scheduled calibration and ground interruption. The Debrief shows the resulting energy use, returned data, and score.

The browser starts **Eyes on Earth** with seed 2026. The [gameplay engine](docs/GAMEPLAY_DESIGN.md) supports three additional scenarios through its TypeScript API. The [3D viewer](docs/ARCHITECTURE.md) is a design for a later integration.

Hardware values, game credits, contact windows, and science targets are synthetic. NASA's mission design guide and SmallSat survey provide engineering context. The published TROPICS target altitude of 550 km provides a worked comparison with the game's 450 km default. [Source ledger](docs/SOURCES.md) · [Physics assumptions and limitations](docs/PHYSICS_ASSUMPTIONS.md)

## QA and presentation

- [Independent acceptance tests, numerical comparison, and browser evidence](docs/QA_ACCEPTANCE.md)
- [Challenge traceability matrix](docs/SOURCES.md#challenge-and-use-of-nasa-resources) and [3D acceptance plan](docs/QA_3D.md)
- [Project-page copy, demo route and team roles](docs/DEMO_AND_SUBMISSION.md)
- [QA design](docs/QA_DESIGN.md) and [implementation prompt](docs/QA_IMPLEMENTATION_PROMPT.md)

The project uses six roles for integration, orbit, resources, interface, gameplay, and QA. Pull requests follow the ownership in [AGENTS.md](AGENTS.md).

Team development used ChatGPT and Claude for AI-assisted coding. Codex assisted this QA contribution with source research, tests, and English documentation. The [submission notes](docs/DEMO_AND_SUBMISSION.md) track author and tool details that the team needs to confirm.
