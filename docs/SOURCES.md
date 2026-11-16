# Sources and provenance

Updated 15 November 2026. The [game catalog](../src/data/catalog.ts) supplies the simulated hardware inputs. See the [submission links](DEMO_AND_SUBMISSION.md#nasa-data) for the public form entries.

## Challenge and use of NASA resources

The matrix below records acceptance work at product revision [8db3341](https://github.com/ShelB123/mission-architect-spaceapps-2026/commit/8db3341484c656265ec909a1c3aadfbabbfd42ed). See the [current web candidate](WEB_CANDIDATE.md) and [acceptance record](QA_ACCEPTANCE.md) for later changes and verification.

| Challenge objective or consideration | Status on the integrated build | Evidence and missing work |
| --- | --- | --- |
| Design and simulate an interactive mission | Implemented in the browser | Briefing, spacecraft and launch configuration, engineering review, simulated operations and outcome. Operations run automatically after launch. |
| Set a scientific goal and make consequential engineering decisions | Implemented for four browser scenarios | The player selects a predefined objective and can change hardware, launch option, altitude and duration. Review applies the chosen scenario’s budget and deadline. |
| Manage mass, budget, energy, time and communications | Implemented at educational fidelity | Hard mass/budget limits and design warnings, battery bounds, and data return in scheduled contact. The simulated orbit is circular, and ground contacts are fictional. |
| See how choices change results and repeat a design | Implemented and retested | Debrief displays score, resource plots and causal guidance. Mission edits invalidate the previous result. Leaving Operations or cancelling the launch clears the pending run. |
| Manage mission operations | Partially represented | The engine simulates acquisition, loss of power and contact. The player makes design decisions and observes the run. Live subsystem commands are outside this version. |
| Optional scenarios, unexpected constraints and mission scoring | Implemented in the browser | All four scenarios are selectable. Runs use a fixed seed of 2026 and show the resulting synthetic events and score in Debrief. |
| Optional interactive spacecraft visualization | Renderer implemented, production wiring pending | The renderer and host are merged. The production entry point renders the accessible component list. See the [3D acceptance record](QA_3D.md) for locally connected tests and limitations. |
| Optional multiplayer, save/share and leaderboards | Outside the current scope | One local player with repeatable runs. The brief presents these features as optional. |

The Global Organizing Team requires at least one NASA source from the selected challenge's Resources tab for Global Awards eligibility. The official challenge page timed out in this review. The local NASA Space Apps event in Athlone lists both NASA design guides below and links to the official challenge. [Organizer guidance](https://github.com/nasa/spaceapps/discussions/1849) · [Athlone challenge resource list](https://hackathlone.com/challenges/space-mission-design-game#resources) · [Official challenge](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/?tab=resources)

| ID | Publisher and locator | Actual use |
| --- | --- | --- |
| NASA-DESIGN | NASA Small Spacecraft Systems Virtual Institute, [Design and Develop Science Missions](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf), slide 8 | **Review → NASA mission segments** presents the selected launcher mass limit, battery capacity, simulated downlink rate and science-data target through NASA's launch, space, ground and user segments. |
| NASA-TROPICS | NASA, [Mission Facts About NASA’s TROPICS](https://www.nasa.gov/blogs/smallsatellites/2023/05/25/mission-facts-about-nasas-tropics/), 25 May 2023 | **Design → Flight plan → Orbit** applies the published approximate target altitude of 550 km to the active configuration. The period and eclipse come from the game's circular-orbit model. |
| NASA-EARTH | NASA Goddard, [The Blue Marble (2002)](https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/) | Historical satellite composite rendered in the briefing and on Earth in the 3D flight views. |
| NASA-MOON | NASA Scientific Visualization Studio, [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) | LRO-derived 2025 color map rendered on the Moon in the 3D flight views. [Asset credits](../public/textures/CREDITS.md) |
| NASA-LANDSAT | NASA and USGS, [Landsat Disaster Management](https://science.nasa.gov/mission/landsat/benefits/disaster-management/) | Real-world Earth observation example in the Riverwatch briefing. The game's archive measures simulated data delivery. |
| NASA-CSLI | NASA CubeSat Launch Initiative, [CubeSat 101](https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_CubeSat_101_508.pdf), October 2017 revision, produced under contract by Cal Poly SLO | Educational context for concept of operations, mission organization, and launch integration. The game models a generic SmallSat with no declared CubeSat form factor. |
| EVENT-2026 | [NASA Space Apps 2026](https://www.spaceappschallenge.org/2026/) and [2026 Global Organizing Team Q&A](https://github.com/nasa/spaceapps/discussions/1827) | Submission dates and resource-use guidance. Confirm the final resource listing and field labels on the official project page. |

## Synthetic values in the integrated game

Every row is a synthetic game parameter from the baseline catalog. The values below come from repository code and represent no vendor model.

| Component ID | Mass (kg) | Cost (credits) | Continuous load (W) | Additional model input |
| --- | ---: | ---: | ---: | --- |
| `camera-basic` | 3 | 120 | 7 | 1.3 MB/min generated |
| `camera-hd` | 12 | 420 | 42 | 4.8 MB/min generated |
| `solar-basic` | 4 | 80 | 0 | 60 W generated in sunlight |
| `solar-advanced` | 7 | 220 | 0 | 150 W generated in sunlight |
| `solar-double` | 8 | 160 | 0 | 120 W generated in sunlight |
| `battery-basic` | 3 | 75 | 0 | 110 Wh usable in the model |
| `battery-advanced` | 7 | 190 | 0 | 380 Wh usable in the model |
| `battery-double` | 6 | 150 | 0 | 220 Wh usable in the model |
| `radio-basic` | 2 | 80 | 9 | Up to 3.5 MB/min delivered during contact |
| `radio-advanced` | 4 | 210 | 18 | Up to 14 MB/min delivered during contact |

| Quantity | Synthetic input |
| --- | --- |
| Fixed bus | 8 kg, 12 W, 120 credits |
| `rideshare` | 28 kg spacecraft limit, 120 credits |
| `dedicated` | 55 kg spacecraft limit, 300 credits |
| Mission budget and objective | 1,400 credits and 250 MB downlinked |
| Default mission | 450 km, six revolutions, player-selectable |
| Ground contact | Phase 0.78 through just before 0.96 on every orbit, from [orbit.ts](../src/engine/orbit.ts) |
| Training scenarios and events | Synthetic objectives, budgets and deadlines. The merged gameplay engine schedules a ten-minute calibration and a one-orbit ground interruption for each valid run. The browser defaults to the survey scenario and runs each selected scenario with seed 2026. |

Credits are dimensionless. The continuous power values describe the game's load assumption. The corresponding decimal data rates are about 0.173 and 0.640 Mbit/s for payload generation and 0.467 and 1.867 Mbit/s for delivery. Conversion uses `MB/min × 8 / 60`.

## Documented reference values and adoption decisions

NASA's [2026 State-of-the-Art Small Spacecraft Technology](https://www.nasa.gov/smallsat-institute/sst-soa/) is a technology survey, current to 1 April 2026 by its [introduction](https://www.nasa.gov/smallsat-institute/sst-soa/introduction/). It compiles public information from multiple sources, including manufacturers. It excludes science payloads from its scope. Check the originating provider before treating a listed rating as a specific product configuration.

| Candidate | Documented evidence | Conditions for use |
| --- | --- | --- |
| Earth mean radius and gravity parameter | NASA/NSSDC [Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) gives the volumetric mean radius of 6,371 km. NGA [WGS 84 Defining Parameters](https://earth-info.nga.mil/?action=wgs84&dir=wgs84) gives GM of 3.986004418 × 10¹⁴ m³/s². NASA/JPL [DE440](https://ssd.jpl.nasa.gov/astro_par.html), Planetary Masses, gives 398,600.435507 km³/s². | The first two match the existing model values after unit conversion. DE440 is used for an independent period and speed calculation. The code audit establishes numerical agreement with NGA's GM, with no historical attribution of the literal. |
| Orbit altitude | NASA [TROPICS mission facts](https://www.nasa.gov/blogs/smallsatellites/2023/05/25/mission-facts-about-nasas-tropics/), 25 May 2023, gives an approximately 550 km target for its constellation of four 3U CubeSats. The MIT Lincoln Laboratory [TROPICS Data Products User Guide](https://ntrs.nasa.gov/api/citations/20210018318/downloads/TROPICS_UserGuide_base_Sept2023.pdf), September 2023, Table 1, gives 540–553 km and 32.74° near launch for the two successful constellation launches. | The 550 km button applies the rounded target to one simulated spacecraft with circular geometry and fixed fictional contact timing. Orbital period and eclipse duration are model outputs. |
| Solar hardware | [S3VI §3](https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/), Table 3-2, lists 19.2 W as peak beginning-of-life array power for the EnduroSat 6U entry. The [EnduroSat 6U deployable array page](https://www.endurosat.com/products/6u-deployable-solar-array/) labels 19.2 W per side and gives configurations with 29.3 or 38.4 W maximum and a 655–1,065 g mass range. | A future documented configuration needs its own part revision, number of wings and illuminated faces, attitude, electrical losses, and BOL/EOL assumptions. The 19.2 W figure cannot be assigned to the whole spacecraft. The survey's 150 W entry for a different product also does not establish provenance for `solar-advanced`. |
| Battery hardware | S3VI §3, Table 3-5, lists pack-level figures for AAC Clyde Space Optimus. The [vendor's OPTIMUS range page](https://www.aac-clyde.space/what-we-do/space-products-components/cubesat-batteries) lists nominal 30, 40, and 80 Wh options. The [company datasheet](https://www.aac-clyde.space/wp-content/uploads/2021/10/AAC_DataSheet_Optimus.pdf), dated 28 July 2020, lists the same capacities with different typical masses. | Select one revision and retain the pack's voltage, usable depth of discharge, current and operating limits. Treat nominal Wh separately from usable game energy. Ah alone cannot establish Wh without a voltage convention. |
| Communications | [S3VI §9](https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/) explains how the antenna, coding, link margin, and ground geometry affect available throughput. Its [§11](https://www.nasa.gov/smallsat-institute/sst-soa/ground-data-systems-and-mission-operations/) describes the ground segment. The [EnduroSat S-band transceiver page](https://www.endurosat.com/products/s-band-transceiver/) gives 5–125 kbit/s configurable rate, 1.2 W in receive-only idle and 11 W maximum electrical draw under the stated conditions. | A 125 kbit/s raw rate is 0.9375 MB/min before overhead. A flight-based example needs net goodput, transmit duty cycle, coding, antenna/ground configuration and a contact model. Preserve the synthetic rates and window in the current game. |
| Payload and fixed bus | TROPICS mission facts identify a spinning microwave radiometer and about 12 lb (about 5.4 kg) for each complete spacecraft. [NASA/JPL RainCube](https://www.jpl.nasa.gov/missions/radar-in-a-cubesat-raincube/) describes a 6U platform with a 35.75 GHz radar payload. | Use these as mission examples. A full spacecraft mass or a radar frequency provides no optical camera mass, optical data rate, or generic bus load. A future payload estimate needs a published instrument, an operating mode, and sensor format, cadence, compression, and observation duty cycle. |
| Launcher and deployer | [S3VI §10](https://www.nasa.gov/smallsat-institute/sst-soa/integration-launch-and-deployment/) explains launch and deployment interfaces. Cal Poly's [CubeSat Design Specification Rev. 14.1](https://www.nasa.gov/wp-content/uploads/2018/01/cubesatdesignspecificationrev14_12022-02-09.pdf), §2.2.10 and Table 1, gives typical masses of 6 kg for 3U and 12 kg for 6U and directs teams to confirm with the provider. | The PDF is authored by Cal Poly and hosted by NASA. These are configuration-dependent spacecraft/deployer criteria. A real preset needs a named service, orbit, dispenser, interfaces, and a versioned capacity source. Keep prices in game credits. |

Use the published altitude as the only mission-specific numerical input in the comparison. A future hardware-backed preset should document the original unit, mode and version for every sourced field; apply any conversion explicitly, test the resulting trade-offs, and ask the integrator to review how mixed provenance is represented. The current entry-level flag and optional URL cannot express multiple origins within one part.

## Rights and redistribution

| Material | Rights and use |
| --- | --- |
| NASA reports and mission pages | Cite the author or originating organization and link to the original. This contribution uses paraphrases and isolated factual values. Report imagery, logos, and third-party tables stay with their original publishers. [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) explains when NASA media can be used and how to handle third-party material and NASA identifiers. |
| Vendor and Cal Poly material | Link and attribute public ratings/specifications individually. The 2020 AAC datasheet carries an all-rights-reserved notice. No manufacturer images, data sheets, copy, or CAD files are bundled. |
| Presentation photo | NASA/JSC, Reid Wiseman, [Moon setting, ISS040-E-092688](https://images.nasa.gov/details/iss040e092688), 13 August 2014. Educational slide-cover illustration, credited on the slide, cropped to fit, and distinct from TROPICS imagery. |
| Typefaces | [Inter](https://github.com/rsms/inter) and [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) are bundled with their SIL Open Font License 1.1 files for the briefing. [Inter license](../public/fonts/inter-OFL.txt) · [Bricolage Grotesque license](../public/fonts/bricolage-grotesque-OFL.txt) |
| Game media | The Earth and Moon use locally bundled NASA imagery with [separate asset credits](../public/textures/CREDITS.md). The briefing's star field is a procedural illustration. Spacecraft geometry, diagrams and archive tiles are produced by the game's code. |
| Software | A project-level LICENSE was absent in the inspected tree. The repository is publicly viewable. Confirm the project license with the team before calling it open source. The installed direct tools and libraries declare MIT or Apache-2.0; their notices apply to those packages. [GitHub repository licensing guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository). |
