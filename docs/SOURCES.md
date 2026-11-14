# Sources and provenance

Reviewed 14 November 2026. The [MVP catalog](../src/data/catalog.ts) supplies the game inputs. The sources below support the mission design, scientific checks, and real-world comparisons.

## Challenge and use of NASA resources

The [official challenge page](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/) returned 502/503 during this review. The [HackAthlone local-event mirror](https://hackathlone.com/challenges/space-mission-design-game) reproduced the challenge details and linked to the official page. The [Ulaanbaatar listing](https://www.spaceappsulaanbaatar.com/challenges) confirmed challenge number 13. The brief calls for an interactive mission design and simulation with constrained resources and feedback on outcomes. Multi-player missions and additional scenarios are optional suggestions in the mirror.

| Challenge area | Evidence in this version |
| --- | --- |
| Mission objective and configuration | The player designs one small Earth-observation spacecraft around a synthetic downlink target. Hardware, launch strategy, altitude, and duration are selectable. |
| Resource trade-offs and repeatable decisions | The same mission can be launched with different engineering choices. Mass and budget govern launch eligibility. Power and downlink affect how much data reaches the ground. |
| Operations and feedback | The model steps through sunlight, eclipse, science acquisition, and a fictional contact window. The debrief shows data returned and stored, battery energy, outage steps, and a game score. |
| Scope | Single-player LEO mission with design choices before launch. A separate gameplay PR covers training scenarios and events. The 3D architecture PR describes future work. |

The organizing team asks global-award entrants to use and cite at least one NASA resource from the challenge's Resources tab. The mirror lists two guides used here. The game flow already treats objective, spacecraft, launch, and ground return as connected. The mission design guide provides the framework used in this comparison and in the demo.

| ID | Publisher and locator | Actual use |
| --- | --- | --- |
| NASA-DESIGN | NASA Small Spacecraft Systems Virtual Institute, [Design and Develop Science Missions](https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf), slides 8, 13, and 18 | Slide 8 identifies launch, space, ground, and user segments. The demo maps launcher to launch, components to space, contact and downlink to ground, and the science-return objective/debrief to user. Slides 13 and 18 guide the explanation of operations and a measurable requirement. |
| NASA-CSLI | NASA CubeSat Launch Initiative, [CubeSat 101](https://www.nasa.gov/wp-content/uploads/2017/03/nasa_csli_CubeSat_101_508.pdf), October 2017 revision | Educational context for concept of operations, mission organization, and launch integration. The game models a generic SmallSat with no declared CubeSat form factor. |
| EVENT-2026 | [NASA Space Apps 2026](https://www.spaceappschallenge.org/2026/) and [2026 Global Organizing Team Q&A](https://github.com/nasa/spaceapps/discussions/1827) | Submission dates and resource-use guidance. Confirm the final resource listing and field labels on the official project page. |

## Synthetic values in the MVP

Every row is a game parameter. All eight components and both launchers declare `isSynthetic: true`. No component supplies a `sourceUrl`. The values below come from repository code and represent no vendor model.

| Component ID | Mass (kg) | Cost (credits) | Continuous load (W) | Additional model input |
| --- | ---: | ---: | ---: | --- |
| `camera-basic` | 3 | 120 | 7 | 1.3 MB/min generated |
| `camera-hd` | 12 | 420 | 42 | 4.8 MB/min generated |
| `solar-basic` | 4 | 80 | 0 | 60 W generated in sunlight |
| `solar-advanced` | 7 | 220 | 0 | 150 W generated in sunlight |
| `battery-basic` | 3 | 75 | 0 | 110 Wh usable in the model |
| `battery-advanced` | 7 | 190 | 0 | 380 Wh usable in the model |
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
| Training scenarios and events in PR #3 | Synthetic objectives, budgets, durations, calibration pauses, and station interruptions. These are branch-specific. |

Credits are dimensionless. The continuous power values describe the game's load assumption. The corresponding decimal data rates are about 0.173 and 0.640 Mbit/s for payload generation and 0.467 and 1.867 Mbit/s for delivery. Conversion uses `MB/min × 8 / 60`.

## Documented reference values and adoption decisions

NASA's [2026 State-of-the-Art Small Spacecraft Technology](https://www.nasa.gov/smallsat-institute/sst-soa/) is a technology survey, current to 1 April 2026 by its [introduction](https://www.nasa.gov/smallsat-institute/sst-soa/introduction/). It compiles public information from multiple sources, including manufacturers. It excludes science payloads from its scope. Check the originating provider before treating a listed rating as a specific product configuration.

| Candidate | Documented evidence | Conditions for use |
| --- | --- | --- |
| Earth mean radius and gravity parameter | NASA/NSSDC [Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) gives the volumetric mean radius of 6,371 km. NGA [WGS 84 Defining Parameters](https://earth-info.nga.mil/?action=wgs84&dir=wgs84) gives GM of 3.986004418 × 10¹⁴ m³/s². NASA/JPL [DE440](https://ssd.jpl.nasa.gov/astro_par.html), Planetary Masses, gives 398,600.435507 km³/s². | The first two match the existing model values after unit conversion. DE440 is used for an independent period and speed calculation. The code audit establishes numerical agreement with NGA's GM, with no historical attribution of the literal. |
| Orbit altitude | NASA [TROPICS mission facts](https://www.nasa.gov/blogs/smallsatellites/2023/05/25/mission-facts-about-nasas-tropics/), 25 May 2023, gives an approximately 550 km target for its constellation of four 3U CubeSats. The MIT Lincoln Laboratory [TROPICS Data Products User Guide](https://ntrs.nasa.gov/api/citations/20210018318/downloads/TROPICS_UserGuide_base_Sept2023.pdf), September 2023, Table 1, gives 540–553 km and 32.74° near launch for the two successful constellation launches. | Use 550 km immediately as a comparison on the existing altitude slider. It is a rounded target. The model has no inclination, phasing, pointing, pass prediction, or constellation inputs. The period and eclipse values are model outputs. |
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
| Presentation typeface | [Inter](https://github.com/rsms/inter), SIL Open Font License 1.1. The slide file refers to the family by name. |
| Prototype media | The inspected built-in drawing and charts use CSS/SVG and local code. The draft demo uses a NASA photograph with a source credit. Update this inventory if the team adds images, fonts, meshes or generated media. |
| Software | A project-level LICENSE was absent in the inspected tree. The repository is publicly viewable. Confirm the project license with the team before calling it open source. The installed direct tools and libraries declare MIT or Apache-2.0; their notices apply to those packages. [GitHub repository licensing guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository). |
