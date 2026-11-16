import type { ComponentCategory, DesignSynergy, Launcher, MissionConfig, SpaceComponent } from "../types/contracts";

/**
 * All hardware parameters, prices, multipliers and launcher limits below are
 * FICTIONAL game balance values, NOT NASA performance or vendor specifications.
 * `context` sentences name real missions only as qualitative examples of the
 * technology class; no number in this file is taken from them.
 */
type Extra = Partial<Pick<SpaceComponent, "solarGenerationW" | "batteryCapacityWh" | "scienceMBperMinute" | "downlinkMBperMinute"
  | "scienceRateMultiplier" | "downlinkRateMultiplier" | "batteryCapacityMultiplier" | "calibrationFactor" | "stationOutageFactor">>;
const c = (category: ComponentCategory, id: string, name: string, description: string, massKg: number, costCredits: number,
  nominalPowerW: number, extra: Extra, tags: string[], context: string): SpaceComponent =>
  ({ id, name, category, description, massKg, costCredits, nominalPowerW, ...extra, tags, context, isSynthetic: true });

export const components: SpaceComponent[] = [
  // The first ten entries are the original MVP kit; their numbers are frozen by the regression tests.
  c("payload", "camera-basic", "Survey Camera", "Lower power, moderate science return.", 3, 120, 7, { scienceMBperMinute: 1.3 }, ["optical"],
    "Small framing cameras like those on Planet's Dove CubeSats photograph Earth every day."),
  c("payload", "camera-hd", "High-Resolution Imager", "More data, substantially higher power draw.", 12, 420, 42, { scienceMBperMinute: 4.8 }, ["optical", "precision"],
    "WorldView-class commercial telescopes resolve details smaller than half a metre from orbit."),
  c("solar", "solar-basic", "Standard Solar Array", "Lightweight solar generation.", 4, 80, 0, { solarGenerationW: 60 }, [],
    "Rigid wings that unfold after launch are the most common power source on small satellites."),
  c("solar", "solar-advanced", "Expanded Solar Array", "Higher generation at mass and budget cost.", 7, 220, 0, { solarGenerationW: 150 }, ["highpower"],
    "Multi-panel wings, like those on the Sentinel satellites, unfold in several hinged sections."),
  c("battery", "battery-basic", "Compact Battery", "A limited energy reserve.", 3, 75, 0, { batteryCapacityWh: 110 }, [],
    "Cylindrical lithium-ion cells, similar to laptop cells, power most CubeSats."),
  c("battery", "battery-advanced", "Extended Battery", "More reserve capacity for eclipse.", 7, 190, 0, { batteryCapacityWh: 380 }, [],
    "The International Space Station replaced its nickel-hydrogen batteries with lithium-ion packs."),
  c("solar", "solar-double", "Two Standard Arrays", "Two standard array units: double generation, mass and cost.", 8, 160, 0, { solarGenerationW: 120 }, [],
    "Adding identical panels is the simplest way to scale power: area, mass and cost grow together."),
  c("battery", "battery-double", "Two Compact Batteries", "Two compact battery units: double reserve, mass and cost.", 6, 150, 0, { batteryCapacityWh: 220 }, [],
    "Battery packs are built from strings of identical cells; more strings mean more stored energy."),
  c("communications", "radio-basic", "Basic Downlink", "Small science data transmission capacity.", 2, 80, 9, { downlinkMBperMinute: 3.5 }, [],
    "Deployable whip antennas give small satellites a simple link that works in almost any orientation."),
  c("communications", "radio-advanced", "High-Rate Downlink", "More data transmitted per communication window.", 4, 210, 18, { downlinkMBperMinute: 14 }, ["highgain"],
    "A dish concentrates the signal into a narrow beam: more data, but it must point at the station."),

  // Payload
  c("payload", "cam-multispectral", "Multispectral Imager", "Several colour bands; balanced data and power.", 5, 210, 14, { scienceMBperMinute: 2.2 }, ["optical"],
    "Landsat 8's OLI and Sentinel-2's MSI record several colour bands to map crops, water and fires."),
  c("payload", "cam-hyperspectral", "Hyperspectral Spectrometer", "Hundreds of narrow bands: large data volume.", 9, 380, 30, { scienceMBperMinute: 3.9 }, ["optical", "bigdata"],
    "NASA's EO-1 Hyperion and Italy's PRISMA split light into hundreds of bands to identify materials."),
  c("payload", "cam-thermal", "Thermal Infrared Camera", "Measures surface temperature; the detector likes to be cold.", 6, 260, 20, { scienceMBperMinute: 2.6 }, ["infrared"],
    "Landsat's TIRS and ECOSTRESS on the Space Station measure the temperature of land and water."),
  c("payload", "radar-sar", "Synthetic Aperture Radar", "Sees through clouds and at night; very power hungry.", 16, 520, 65, { scienceMBperMinute: 6.5 }, ["radar", "bigdata"],
    "Sentinel-1 and RADARSAT image floods through clouds and darkness by sending their own radar pulses."),
  c("payload", "lidar", "Laser Altimeter", "Laser pulses measure height with fine pointing.", 10, 340, 38, { scienceMBperMinute: 3.2 }, ["laser", "precision"],
    "ICESat-2 times laser pulses to measure ice height; GEDI on the Space Station maps forest structure."),
  c("payload", "gnss-ro", "GNSS Occultation Receiver", "Tiny instrument, small but valuable data.", 2, 90, 5, { scienceMBperMinute: 0.8 }, ["radio-science"],
    "COSMIC-2 and commercial CubeSats measure how navigation signals bend through the atmosphere to improve weather forecasts."),

  // Solar arrays
  c("solar", "solar-body", "Body-Mounted Cells", "No mechanisms and almost no mass, but little power.", 1, 40, 0, { solarGenerationW: 28 }, [],
    "Vanguard 1 and many CubeSats carry cells directly on their skin: nothing to deploy, nothing to jam."),
  c("solar", "solar-triple", "Triple-Junction Wings", "High-efficiency cells: more watts per kilogram.", 5, 260, 0, { solarGenerationW: 110 }, [],
    "Triple-junction gallium-arsenide cells, standard on modern spacecraft, convert about 30% of sunlight."),
  c("solar", "solar-tracking", "Sun-Tracking Array", "A drive motor keeps the wings facing the Sun.", 9, 300, 3, { solarGenerationW: 185 }, ["highpower"],
    "Solar array drive mechanisms rotate the wings toward the Sun, as on the International Space Station."),
  c("solar", "solar-rollout", "Roll-Out Solar Blanket", "Flexible blanket: top power, top price.", 6, 340, 0, { solarGenerationW: 200 }, ["highpower"],
    "Roll-out arrays (ROSA) were tested on the Space Station in 2017 and now boost its power system."),
  c("solar", "solar-quad", "Six-Panel Deployable Wings", "Large rigid area: strong generation, heavy.", 11, 280, 0, { solarGenerationW: 210 }, ["highpower"],
    "Large observatories unfold several rigid panels per wing; more area also means more mass to launch."),

  // Batteries
  c("battery", "battery-nicd", "Legacy NiCd Pack", "Cheap and rugged, but heavy for its energy.", 5, 50, 0, { batteryCapacityWh: 90 }, [],
    "Nickel-cadmium batteries flew on satellites from the 1960s onward: robust, but heavy."),
  c("battery", "battery-nih2", "Nickel-Hydrogen Vessel", "Endures many cycles; bulky pressure vessel.", 9, 170, 0, { batteryCapacityWh: 300 }, [],
    "The Hubble Space Telescope ran on nickel-hydrogen batteries for nearly two decades before replacement."),
  c("battery", "battery-lipo", "Li-Polymer Pouch Pack", "Very light reserve for mass-critical designs.", 2, 130, 0, { batteryCapacityWh: 150 }, [],
    "Flat lithium-polymer pouch cells save mass and fit thin spaces; they are popular in CubeSats."),
  c("battery", "battery-lifepo", "LiFePO4 Rugged Pack", "Stable chemistry, long life, medium density.", 6, 140, 0, { batteryCapacityWh: 260 }, [],
    "Lithium iron phosphate trades some energy density for thermal stability and long cycle life."),
  c("battery", "battery-bank", "High-Density Li-ion Bank", "The largest reserve available.", 8, 320, 0, { batteryCapacityWh: 520 }, [],
    "Modern space lithium-ion cells store several times more energy per kilogram than nickel batteries."),

  // Communications
  c("communications", "radio-uhf", "UHF Beacon Transceiver", "Minimal radio: tiny, cheap, very slow.", 1, 40, 4, { downlinkMBperMinute: 1.2 }, [],
    "Simple UHF beacons are how most university CubeSats send their first signal home."),
  c("communications", "radio-sband", "S-band Patch Transmitter", "Flat antenna, reliable medium rate.", 2, 130, 12, { downlinkMBperMinute: 7 }, [],
    "S-band is the workhorse for telemetry and commands across NASA's and ESA's ground networks."),
  c("communications", "radio-xband", "X-band High-Gain Dish", "Fast imagery downlink with a pointed dish.", 6, 330, 30, { downlinkMBperMinute: 24 }, ["highgain"],
    "Landsat and Sentinel satellites return their imagery to Earth in X-band."),
  c("communications", "radio-phased", "Phased-Array Antenna", "Steers its beam electronically, no moving parts.", 5, 390, 34, { downlinkMBperMinute: 30 }, ["highgain"],
    "Electronically steered arrays, as used by broadband constellations, aim beams without motors."),
  c("communications", "radio-kaband", "Ka-band Steerable Antenna", "Very wide bandwidth for big data volumes.", 7, 450, 40, { downlinkMBperMinute: 38 }, ["highgain"],
    "The NISAR radar mission uses Ka-band to return its very large data volume."),
  c("communications", "radio-laser", "Optical Laser Terminal", "Highest rate, but needs precise pointing.", 5, 520, 25, { downlinkMBperMinute: 55 }, ["lasercom"],
    "NASA's TBIRD CubeSat demonstrated laser downlinks of 200 gigabits per second."),

  // Attitude determination and control. The first unit is the bus baseline (free).
  c("attitude", "adcs-passive", "Passive Magnetic Stabilization", "Included in the bus: coarse pointing, no power.", 0, 0, 0, { scienceRateMultiplier: 1 }, [],
    "A permanent magnet aligns a small satellite with Earth's magnetic field: simple but imprecise."),
  c("attitude", "adcs-gravity", "Gravity-Gradient Boom", "A long boom keeps one face toward Earth.", 2, 50, 0, { scienceRateMultiplier: 1.03 }, [],
    "A long boom makes a satellite hang like a pendulum; the technique has flown since the 1960s."),
  c("attitude", "adcs-magnetorquer", "Magnetorquer Rods", "Electromagnets damp tumbling.", 1, 60, 2, { scienceRateMultiplier: 1.04 }, [],
    "Electromagnet rods push against Earth's magnetic field; almost every CubeSat carries them."),
  c("attitude", "adcs-gnss", "GNSS and Sun-Sensor Suite", "Knows position, time and the Sun direction.", 1, 90, 3, { scienceRateMultiplier: 1.06 }, ["gnss"],
    "Navigation receivers give position and time in low orbit; sun sensors give a coarse Sun direction."),
  c("attitude", "adcs-momentum", "Momentum Bias Wheel", "One spinning wheel adds gyroscopic stiffness.", 2, 110, 4, { scienceRateMultiplier: 1.08 }, ["wheels"],
    "A single fast wheel resists disturbances like a spinning top; classic on older satellites."),
  c("attitude", "adcs-wheels", "Three Reaction Wheels", "Rotates the satellite on all three axes.", 3, 190, 8, { scienceRateMultiplier: 1.14 }, ["wheels"],
    "The Kepler telescope had to change its mission when two of its four reaction wheels failed."),
  c("attitude", "adcs-startracker", "Star Tracker with Wheels", "Fine pointing from star patterns.", 4, 290, 11, { scienceRateMultiplier: 1.22 }, ["wheels", "fine-pointing"],
    "Star trackers match star patterns against a catalogue to find orientation within arcseconds."),
  c("attitude", "adcs-cmg", "Control Moment Gyros", "Fast, agile retargeting; heavy and power hungry.", 6, 360, 18, { scienceRateMultiplier: 1.25 }, ["wheels", "fine-pointing"],
    "Control moment gyroscopes steer the Space Station and agile imaging satellites such as Pléiades."),

  // Command and data handling
  c("computer", "obc-basic", "Basic Flight Computer", "Included in the bus: runs the mission, nothing more.", 0, 0, 0, { downlinkRateMultiplier: 1 }, [],
    "Many CubeSats fly microcontroller boards not unlike hobby electronics."),
  c("computer", "obc-watchdog", "Watchdog Microcontroller", "Recovers quickly from glitches: shorter calibrations.", 0.5, 50, 1, { calibrationFactor: 0.8 }, [],
    "A watchdog timer reboots a frozen computer, essential when radiation flips memory bits."),
  c("computer", "obc-recorder", "Solid-State Recorder", "Organised mass memory speeds data playback.", 1, 80, 2, { downlinkRateMultiplier: 1.06 }, [],
    "Solid-state recorders replaced tape recorders and hold observations between ground passes."),
  c("computer", "obc-compress", "Compression Processor", "Shrinks data before transmission.", 1, 140, 5, { downlinkRateMultiplier: 1.2 }, ["compression"],
    "Onboard compression following CCSDS standards shrinks imagery before it is sent to Earth."),
  c("computer", "obc-dual", "Dual-Redundant Computer", "A spare computer takes over: shorter calibrations.", 2, 180, 4, { calibrationFactor: 0.6 }, [],
    "Critical missions carry two computers; if one fails, the other takes control."),
  c("computer", "obc-fpga", "FPGA Payload Processor", "Processes instrument data in real time.", 1, 200, 9, { downlinkRateMultiplier: 1.3 }, ["compression"],
    "Reconfigurable FPGA chips process instrument data on the fly and can be reprogrammed in orbit."),
  c("computer", "obc-radhard", "Radiation-Hardened Computer", "Shrugs off radiation: calibrations take half as long.", 2, 260, 6, { calibrationFactor: 0.5 }, [],
    "The RAD750 radiation-hardened processor flies on the Curiosity and Perseverance rovers."),
  c("computer", "obc-ai", "Onboard AI Processor", "Keeps only useful data; quick self-checks.", 2, 340, 15, { downlinkRateMultiplier: 1.45, calibrationFactor: 0.7 }, ["compression", "ai"],
    "ESA's Φ-sat-1 used onboard artificial intelligence to discard cloudy images before downlink."),

  // Thermal control
  c("thermal", "thermal-passive", "Paint and Tape Finish", "Included in the bus: basic passive control.", 0, 0, 0, { batteryCapacityMultiplier: 1 }, [],
    "White paint, black paint and tapes set how much heat each surface absorbs and radiates."),
  c("thermal", "thermal-mli", "Multi-Layer Insulation", "Blankets slow heat loss in eclipse.", 0.5, 40, 0, { batteryCapacityMultiplier: 1.05 }, ["mli"],
    "The golden blankets seen on spacecraft are stacks of thin reflective films."),
  c("thermal", "thermal-heaters", "Battery Heaters", "Keep the cells warm; use a little power.", 0.5, 50, 3, { batteryCapacityMultiplier: 1.1 }, ["heaters"],
    "Thermostat-controlled heaters keep batteries inside their temperature range during eclipse."),
  c("thermal", "thermal-radiator", "Fixed Radiator Panel", "Rejects waste heat to cold space.", 1, 70, 0, { batteryCapacityMultiplier: 1.06 }, ["radiator"],
    "Radiators face deep space and shed waste heat as infrared light."),
  c("thermal", "thermal-heatpipes", "Heat Pipes", "Move heat silently with no moving parts.", 1, 120, 0, { batteryCapacityMultiplier: 1.1 }, ["radiator"],
    "Heat pipes carry heat with an evaporating fluid; they are standard on communication satellites."),
  c("thermal", "thermal-louvers", "Thermal Louvers", "Blinds that open when hot and close when cold.", 1.5, 160, 0, { batteryCapacityMultiplier: 1.12 }, ["radiator"],
    "Louvers work like window blinds over a radiator; they flew on ESA's Rosetta comet mission."),
  c("thermal", "thermal-deployable", "Deployable Radiator", "A large unfolding surface for high heat loads.", 3, 240, 1, { batteryCapacityMultiplier: 1.16 }, ["radiator"],
    "The Space Station carries large deployable radiator panels to reject its waste heat."),
  c("thermal", "thermal-pumped", "Pumped Fluid Loop", "Active cooling circuit: best control, most mass.", 4, 330, 8, { batteryCapacityMultiplier: 1.25 }, ["radiator"],
    "Pumped loops carry heat like a car's cooling circuit; the Space Station uses ammonia loops."),

  // Propulsion
  c("propulsion", "prop-none", "No Propulsion", "Included in the bus: the orbit cannot be adjusted.", 0, 0, 0, { stationOutageFactor: 1 }, [],
    "Most CubeSats have no engine and slowly descend as the thin upper atmosphere drags on them."),
  c("propulsion", "prop-coldgas", "Cold-Gas Thrusters", "Simple jets of pressurised gas.", 2, 90, 1, { stationOutageFactor: 0.85 }, ["thruster"],
    "Cold-gas jets just release pressurised gas; the GRACE-FO satellites use them for gentle control."),
  c("propulsion", "prop-resistojet", "Water Resistojet", "Electrically heated water vapour.", 2, 130, 6, { stationOutageFactor: 0.8 }, ["thruster"],
    "Resistojets heat a safe propellant such as water; they fly on small commercial satellites."),
  c("propulsion", "prop-ion", "Gridded Ion Engine", "Extreme efficiency, tiny thrust, high power.", 3, 440, 30, { stationOutageFactor: 0.7 }, ["thruster", "electric"],
    "Ion engines carried NASA's Dawn probe to Vesta and Ceres: very little thrust, sustained for years."),
  c("propulsion", "prop-hall", "Hall-Effect Thruster", "Efficient electric propulsion.", 3, 380, 25, { stationOutageFactor: 0.65 }, ["thruster", "electric"],
    "Hall thrusters accelerate ionised gas with electric and magnetic fields; broadband constellations use them."),
  c("propulsion", "prop-monoprop", "Monopropellant Thruster", "The classic: reliable and quick.", 4, 200, 2, { stationOutageFactor: 0.6 }, ["thruster"],
    "Hydrazine thrusters have been the standard for decades: reliable, but the propellant is toxic."),
  c("propulsion", "prop-green", "Green Monopropellant", "Less toxic propellant, slightly better performance.", 4, 260, 3, { stationOutageFactor: 0.55 }, ["thruster"],
    "NASA's Green Propellant Infusion Mission tested a less toxic alternative to hydrazine in orbit."),
  c("propulsion", "prop-biprop", "Bipropellant Engine", "Strongest thrust for fast manoeuvres; heavy.", 7, 330, 3, { stationOutageFactor: 0.4 }, ["thruster"],
    "Bipropellant engines burn fuel with an oxidiser and perform the largest orbit changes."),
];

/**
 * Synthetic "works well together" rules. A synergy is active when every listed
 * tag is present among the selected components. Multipliers are game balance.
 */
export const synergies: DesignSynergy[] = [
  { id: "sharp-focus", name: "Sharp focus", description: "Fine pointing lets a precision instrument use its full resolution.", requiresTags: ["fine-pointing", "precision"], scienceRateMultiplier: 1.1 },
  { id: "cold-detector", name: "Cold detector", description: "A radiator cools the infrared detector and reduces its noise.", requiresTags: ["infrared", "radiator"], scienceRateMultiplier: 1.12 },
  { id: "occultation", name: "Precise occultations", description: "Accurate orbit knowledge sharpens radio-occultation profiles.", requiresTags: ["radio-science", "gnss"], scienceRateMultiplier: 1.25 },
  { id: "data-pipeline", name: "Data pipeline", description: "Onboard compression tames a high-volume instrument.", requiresTags: ["bigdata", "compression"], downlinkRateMultiplier: 1.15 },
  { id: "laser-lock", name: "Laser lock", description: "A laser link holds its narrow beam only with fine pointing.", requiresTags: ["lasercom", "fine-pointing"], downlinkRateMultiplier: 1.2 },
  { id: "steady-beam", name: "Steady beam", description: "Wheels keep a high-gain antenna on the ground station.", requiresTags: ["wheels", "highgain"], downlinkRateMultiplier: 1.06 },
  { id: "smart-downlink", name: "Smart downlink", description: "AI selects the best data for a fast directional link.", requiresTags: ["ai", "highgain"], downlinkRateMultiplier: 1.1 },
  { id: "warm-cells", name: "Warm cells", description: "Insulation keeps in the warmth that the heaters provide.", requiresTags: ["heaters", "mli"], batteryCapacityMultiplier: 1.08 },
  { id: "electric-drive", name: "Electric drive", description: "A powerful solar array feeds electric propulsion.", requiresTags: ["electric", "highpower"], stationOutageFactor: 0.85 },
  { id: "auto-orbit", name: "Autonomous orbit", description: "With navigation on board, manoeuvres are planned without waiting for the ground.", requiresTags: ["gnss", "thruster"], stationOutageFactor: 0.9 },
];

export const launchers: Launcher[] = [
  { id: "rideshare", name: "Shared Launch", massLimitKg: 28, costCredits: 120, isSynthetic: true },
  { id: "dedicated", name: "Dedicated Launch", massLimitKg: 55, costCredits: 300, isSynthetic: true },
];

/** Exactly one unit of each is mandatory. */
export const requiredCategories = ["payload", "solar", "battery", "communications"] as const;
/** At most one unit each; with none selected the free bus baseline applies. */
export const optionalCategories = ["attitude", "computer", "thermal", "propulsion"] as const;
export const categoryOrder = [...requiredCategories, ...optionalCategories] as const;
export const fixedBusMassKg = 8;
export const fixedBusPowerW = 12;
export const fixedBusCostCredits = 120;
export const budgetLimitCredits = 1400;
export const scienceTargetMB = 250;

export const defaultMission: MissionConfig = {
  altitudeKm: 450,
  durationOrbits: 6,
  selectedComponentIds: ["camera-basic", "solar-basic", "battery-basic", "radio-basic"],
  launcherId: "rideshare",
};
