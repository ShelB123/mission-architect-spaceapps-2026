/**
 * SYNTHETIC visual descriptors for the extended eight-subsystem catalog.
 * Same rules as catalog.ts: illustrative shapes only, never CAD or vendor
 * data, never an input to the engines. Frame: metres, +Y up, +X solar side,
 * +Z model front. Slots: payload on +Z, radio on +Y, propulsion under -Y,
 * thermal and sensors on -Z, avionics/battery/wheels inside the bus.
 */
import type { ComponentCategory } from "../types/contracts";
import type { ComponentVisualDefinition, Vec3, VisualFinish, VisualKind, VisualPart } from "./types";

const Z: Vec3 = [Math.PI / 2, 0, 0]; // local +Y → +Z
const BACK: Vec3 = [-Math.PI / 2, 0, 0]; // local +Y → -Z
const X: Vec3 = [0, 0, -Math.PI / 2]; // local +Y → +X
const FLIP: Vec3 = [Math.PI, 0, 0];
type Opt = { r?: Vec3; f?: VisualFinish; i?: boolean };
const p = (kind: VisualKind, partId: string, positionM: Vec3, dimensionsM: Vec3, colorHex: string, o: Opt = {}): VisualPart => ({
  partId, kind, positionM, rotationRad: o.r ?? [0, 0, 0], dimensionsM, colorHex,
  ...(o.f ? { finish: o.f } : {}), ...(o.i ? { internal: true } : {}),
});
const box = (id: string, pos: Vec3, dim: Vec3, color: string, o: Opt = {}) => p("box", id, pos, dim, color, o);
const pan = (id: string, pos: Vec3, dim: Vec3, color: string, o: Opt = {}) => p("panel", id, pos, dim, color, { f: "solar-cell", ...o });
const cyl = (id: string, pos: Vec3, d: number, len: number, color: string, o: Opt = {}) => p("cylinder", id, pos, [d, len, d], color, o);
const cone = (id: string, pos: Vec3, d: number, len: number, color: string, o: Opt = {}) => p("cone", id, pos, [d, len, d], color, o);
const def = (category: ComponentCategory, componentId: string, label: string, parts: VisualPart[]): ComponentVisualDefinition =>
  ({ componentId, category, label, geometryProvenance: "synthetic", parts });

const METAL = "#9aa4af", DARK = "#1c2128", WHITE = "#eef1f4", GOLD = "#c8a04a", PCB = "#1f6f4a", COPPER = "#b87333";

// ---- Payload (front face) ----
const scope = (d: number, len: number, glass: string): VisualPart[] => [
  box("electronics", [0, -0.07, 0.068], [0.078, 0.1, 0.036], "#2f3a48", { f: "dark" }),
  cyl("tube", [0, -0.065, 0.086 + len / 2], d, len, WHITE, { r: Z, f: "painted" }),
  cyl("baffle", [0, -0.065, 0.086 + len + 0.008], d + 0.012, 0.016, DARK, { r: Z, f: "dark" }),
  cyl("aperture", [0, -0.065, 0.086 + len + 0.017], d, 0.002, glass, { r: Z, f: "glass" }),
];
const payload = [
  def("payload", "cam-multispectral", "Multispectral Imager", [
    box("housing", [0, -0.075, 0.07], [0.08, 0.07, 0.04], "#34404f", { f: "dark" }),
    ...[-0.022, 0, 0.022].flatMap((x, i) => [
      cyl(`barrel-${i + 1}`, [x, -0.075, 0.1], 0.02, 0.022, DARK, { r: Z, f: "dark" }),
      cyl(`filter-${i + 1}`, [x, -0.075, 0.112], 0.016, 0.002, ["#4aa8d8", "#58d68d", "#e74c3c"][i], { r: Z, f: "glass" }),
    ]),
    box("sunshade", [0, -0.036, 0.1], [0.08, 0.004, 0.03], METAL, { f: "metal" }),
  ]),
  def("payload", "cam-hyperspectral", "Hyperspectral Spectrometer", [
    ...scope(0.05, 0.09, "#9b7dff"),
    box("spectrometer", [0.03, -0.105, 0.115], [0.03, 0.03, 0.06], "#5b6777", { f: "metal" }),
    pan("radiator", [-0.03, -0.11, 0.12], [0.03, 0.004, 0.06], "#f2f4f7", { f: "painted" }),
  ]),
  def("payload", "cam-thermal", "Thermal Infrared Camera", [
    box("housing", [0, -0.075, 0.072], [0.07, 0.07, 0.044], "#3a4656", { f: "dark" }),
    cyl("lens-barrel", [0, -0.07, 0.108], 0.04, 0.03, DARK, { r: Z, f: "dark" }),
    cyl("germanium-lens", [0, -0.07, 0.124], 0.034, 0.002, "#c2571a", { r: Z, f: "glass" }),
    cyl("cryocooler", [0.03, -0.11, 0.08], 0.018, 0.05, METAL, { r: X, f: "metal" }),
    pan("cold-radiator", [0, -0.118, 0.1], [0.07, 0.004, 0.06], "#f2f4f7", { f: "painted" }),
  ]),
  def("payload", "radar-sar", "Synthetic Aperture Radar", [
    box("radar-electronics", [0, -0.07, 0.068], [0.08, 0.1, 0.036], "#2f3a48", { f: "dark" }),
    box("strut-left", [-0.04, -0.07, 0.092], [0.006, 0.006, 0.02], METAL, { f: "metal" }),
    box("strut-right", [0.04, -0.07, 0.092], [0.006, 0.006, 0.02], METAL, { f: "metal" }),
    ...[-0.17, 0, 0.17].map((x, i) => box(`antenna-panel-${i + 1}`, [x, -0.07, 0.106], [0.165, 0.11, 0.008], "#d9c9a3", { f: "painted" })),
    ...[-0.085, 0.085].map((x, i) => cyl(`panel-hinge-${i + 1}`, [x, -0.07, 0.104], 0.006, 0.1, METAL, { f: "metal" })),
  ]),
  def("payload", "lidar", "Laser Altimeter", [
    box("laser-bench", [0, -0.07, 0.07], [0.08, 0.1, 0.04], "#2f3a48", { f: "dark" }),
    cyl("receiver-telescope", [0.012, -0.055, 0.125], 0.05, 0.07, WHITE, { r: Z, f: "painted" }),
    cyl("receiver-mirror", [0.012, -0.055, 0.161], 0.044, 0.002, "#7fd1c7", { r: Z, f: "glass" }),
    cyl("laser-emitter", [-0.026, -0.1, 0.105], 0.014, 0.03, DARK, { r: Z, f: "dark" }),
    cyl("laser-window", [-0.026, -0.1, 0.121], 0.01, 0.002, "#39ff88", { r: Z, f: "glass" }),
  ]),
  def("payload", "gnss-ro", "GNSS Occultation Receiver", [
    box("receiver-board", [0, -0.125, 0.02], [0.06, 0.004, 0.04], PCB, { f: "pcb", i: true }),
    box("antenna-fore", [0, -0.07, 0.054], [0.07, 0.07, 0.006], GOLD, { f: "foil" }),
    box("antenna-fore-patch", [0, -0.07, 0.058], [0.04, 0.04, 0.003], "#e8e2d0", { f: "painted" }),
    box("antenna-aft", [0, -0.11, -0.054], [0.06, 0.05, 0.006], GOLD, { f: "foil" }),
  ]),
];

// ---- Solar arrays (±X) ----
const wings = (id: string, label: string, perSide: number, w: number, h: number, color: string, extra: VisualPart[] = []) =>
  def("solar", id, label, [
    ...[-1, 1].flatMap((s) => {
      const side = s < 0 ? "left" : "right";
      return [
        box(`yoke-${side}`, [s * 0.066, 0, 0], [0.03, 0.012, 0.006], METAL, { f: "metal" }),
        ...Array.from({ length: perSide }, (_, k) => pan(`wing-${side}-${k + 1}`, [s * (0.081 + w / 2 + k * (w + 0.008)), 0, 0], [w, h, 0.006], color)),
        ...Array.from({ length: perSide - 1 }, (_, k) => cyl(`hinge-${side}-${k + 1}`, [s * (0.081 + (k + 1) * (w + 0.008) - 0.004), 0, 0], 0.007, h * 0.9, METAL, { f: "metal" })),
      ];
    }),
    ...extra,
  ]);
const solar = [
  def("solar", "solar-body", "Body-Mounted Cells", [
    pan("cells-left", [-0.0505, -0.02, 0], [0.003, 0.2, 0.086], "#17357a"),
    pan("cells-right", [0.0505, -0.02, 0], [0.003, 0.2, 0.086], "#17357a"),
    pan("cells-back", [0, 0.11, -0.0505], [0.086, 0.06, 0.003], "#17357a"),
  ]),
  wings("solar-triple", "Triple-Junction Wings", 1, 0.24, 0.28, "#231a6b"),
  wings("solar-tracking", "Sun-Tracking Array", 2, 0.2, 0.26, "#10266b", [
    cyl("drive-left", [-0.06, 0, 0], 0.03, 0.02, "#5b6777", { r: X, f: "metal" }),
    cyl("drive-right", [0.06, 0, 0], 0.03, 0.02, "#5b6777", { r: X, f: "metal" }),
  ]),
  def("solar", "solar-rollout", "Roll-Out Solar Blanket", [-1, 1].flatMap((s) => {
    const side = s < 0 ? "left" : "right";
    return [
      cyl(`boom-${side}`, [s * 0.3, 0.105, 0], 0.008, 0.5, METAL, { r: X, f: "metal" }),
      cyl(`boom-low-${side}`, [s * 0.3, -0.105, 0], 0.008, 0.5, METAL, { r: X, f: "metal" }),
      pan(`blanket-${side}`, [s * 0.305, 0, 0], [0.47, 0.2, 0.003], "#2a3f8f"),
      cyl(`roller-${side}`, [s * 0.552, 0, 0], 0.024, 0.22, WHITE, { f: "painted" }),
    ];
  })),
  wings("solar-quad", "Six-Panel Deployable Wings", 3, 0.2, 0.3, "#0f2260"),
];

// ---- Batteries (inside the bus) ----
const battery = [
  def("battery", "battery-nicd", "Legacy NiCd Pack", [
    box("tray", [0, -0.014, 0], [0.084, 0.006, 0.06], "#20262e", { f: "dark", i: true }),
    ...[-0.03, -0.01, 0.01, 0.03].map((x, i) => box(`cell-${i + 1}`, [x, 0.02, 0], [0.017, 0.06, 0.05], "#6f8fa8", { f: "cell", i: true })),
    box("strap", [0, 0.052, 0], [0.084, 0.004, 0.012], METAL, { f: "metal", i: true }),
  ]),
  def("battery", "battery-nih2", "Nickel-Hydrogen Vessel", [
    cyl("pressure-vessel", [0, 0.02, 0], 0.07, 0.07, "#b0b7bf", { f: "metal", i: true }),
    cyl("dome-top", [0, 0.059, 0], 0.05, 0.008, "#b0b7bf", { f: "metal", i: true }),
    cyl("mount-ring", [0, 0.02, 0], 0.08, 0.01, "#20262e", { f: "dark", i: true }),
    cyl("terminal", [0, 0.066, 0], 0.01, 0.006, COPPER, { f: "metal", i: true }),
  ]),
  def("battery", "battery-lipo", "Li-Polymer Pouch Pack", [
    ...[-0.012, 0, 0.012].map((z, i) => box(`pouch-${i + 1}`, [0, 0.02, z], [0.07, 0.06, 0.009], "#c7ccd1", { f: "cell", i: true })),
    box("restraint-plate", [0, 0.02, 0.02], [0.076, 0.066, 0.003], METAL, { f: "metal", i: true }),
    box("protection-board", [0, 0.056, 0], [0.06, 0.004, 0.03], PCB, { f: "pcb", i: true }),
  ]),
  def("battery", "battery-lifepo", "LiFePO4 Rugged Pack", [
    box("frame", [0, -0.014, 0], [0.084, 0.006, 0.07], "#20262e", { f: "dark", i: true }),
    ...[-0.021, 0.021].flatMap((x, a) => [-0.017, 0.017].map((z, b) => box(`cell-${a + 1}-${b + 1}`, [x, 0.022, z], [0.038, 0.064, 0.03], "#2e86de", { f: "cell", i: true }))),
  ]),
  def("battery", "battery-bank", "High-Density Li-ion Bank", [
    box("holder-lower", [0, -0.013, 0], [0.086, 0.006, 0.086], "#20262e", { f: "dark", i: true }),
    box("holder-upper", [0, 0.063, 0], [0.086, 0.006, 0.086], "#20262e", { f: "dark", i: true }),
    ...[-0.027, 0, 0.027].flatMap((x, a) => [-0.027, 0, 0.027].map((z, b) => cyl(`cell-${a + 1}-${b + 1}`, [x, 0.025, z], 0.018, 0.07, "#ff5e57", { f: "cell", i: true }))),
  ]),
];

// ---- Communications (top deck) ----
const trx = (color: string) => box("transceiver", [0, 0.115, 0], [0.084, 0.034, 0.084], color, { f: "pcb", i: true });
const comms = [
  def("communications", "radio-uhf", "UHF Beacon Transceiver", [
    trx("#4f6b9e"),
    cyl("antenna-base", [0, 0.157, 0], 0.02, 0.008, METAL, { f: "metal" }),
    cyl("monopole", [0, 0.26, 0], 0.003, 0.2, "#d9dee4", { f: "metal" }),
  ]),
  def("communications", "radio-sband", "S-band Patch Transmitter", [
    trx("#6b4f9e"),
    box("ground-plane", [0, 0.156, 0], [0.08, 0.004, 0.08], METAL, { f: "metal" }),
    box("patch", [0, 0.16, 0], [0.05, 0.004, 0.05], GOLD, { f: "foil" }),
  ]),
  def("communications", "radio-xband", "X-band High-Gain Dish", [
    trx("#8e44ad"),
    cyl("gimbal", [0, 0.162, 0], 0.03, 0.018, "#5b6777", { f: "metal" }),
    cyl("boom", [0, 0.2, 0], 0.01, 0.06, METAL, { f: "metal" }),
    cone("dish", [0, 0.258, 0], 0.22, 0.06, WHITE, { r: FLIP, f: "painted" }),
    cyl("feed-mast", [0, 0.278, 0], 0.005, 0.1, METAL, { f: "metal" }),
    cyl("subreflector", [0, 0.33, 0], 0.03, 0.006, GOLD, { f: "metal" }),
  ]),
  def("communications", "radio-phased", "Phased-Array Antenna", [
    trx("#2d6a8f"),
    box("array-mount", [0, 0.162, 0], [0.04, 0.016, 0.04], METAL, { f: "metal" }),
    box("array-plate", [0, 0.176, 0], [0.16, 0.008, 0.16], "#2b3440", { f: "dark" }),
    ...[-0.05, 0, 0.05].flatMap((x, a) => [-0.05, 0, 0.05].map((z, b) => box(`element-${a + 1}-${b + 1}`, [x, 0.182, z], [0.036, 0.004, 0.036], GOLD, { f: "foil" }))),
  ]),
  def("communications", "radio-kaband", "Ka-band Steerable Antenna", [
    trx("#a04a8e"),
    cyl("azimuth-drive", [0, 0.164, 0], 0.036, 0.022, "#5b6777", { f: "metal" }),
    cyl("arm", [0.02, 0.2, 0], 0.01, 0.07, METAL, { r: [0, 0, -0.5], f: "metal" }),
    cone("dish", [0.05, 0.25, 0], 0.15, 0.045, WHITE, { r: [Math.PI, 0, -0.5], f: "painted" }),
    cyl("feed", [0.064, 0.275, 0], 0.012, 0.03, GOLD, { r: [0, 0, -0.5], f: "metal" }),
  ]),
  def("communications", "radio-laser", "Optical Laser Terminal", [
    trx("#3b7d6e"),
    cyl("turret-base", [0, 0.162, 0], 0.05, 0.018, "#5b6777", { f: "metal" }),
    box("turret-yoke", [0, 0.19, 0], [0.05, 0.04, 0.02], METAL, { f: "metal" }),
    cyl("beam-telescope", [0, 0.2, 0.02], 0.036, 0.07, WHITE, { r: Z, f: "painted" }),
    cyl("beam-window", [0, 0.2, 0.056], 0.03, 0.002, "#ff4d6d", { r: Z, f: "glass" }),
  ]),
];

// ---- Attitude control (lower bay and back face) ----
const wheel = (id: string, pos: Vec3, r?: Vec3) => cyl(id, pos, 0.036, 0.012, "#c9ced6", { f: "metal", i: true, ...(r ? { r } : {}) });
const tracker = (y: number): VisualPart[] => [
  box("tracker-body", [0.02, y, -0.062], [0.03, 0.03, 0.024], "#3a4656", { f: "dark" }),
  cyl("tracker-baffle", [0.02, y, -0.094], 0.03, 0.04, DARK, { r: BACK, f: "dark" }),
  cyl("tracker-lens", [0.02, y, -0.1145], 0.022, 0.002, "#4aa8d8", { r: BACK, f: "glass" }),
];
const threeWheels = [wheel("wheel-x", [-0.022, -0.125, 0], X), wheel("wheel-y", [0.018, -0.132, 0.016]), wheel("wheel-z", [0.018, -0.12, -0.02], Z)];
const attitude = [
  def("attitude", "adcs-passive", "Passive Magnetic Stabilization", [
    box("bar-magnet-north", [0, -0.11, 0.014], [0.008, 0.03, 0.008], "#b23b3b", { f: "painted", i: true }),
    box("bar-magnet-south", [0, -0.14, 0.014], [0.008, 0.03, 0.008], "#3b5bb2", { f: "painted", i: true }),
  ]),
  def("attitude", "adcs-gravity", "Gravity-Gradient Boom", [
    cyl("boom-canister", [0, 0.12, -0.058], 0.024, 0.014, METAL, { r: BACK, f: "metal" }),
    cyl("boom", [0, 0.12, -0.265], 0.005, 0.4, "#d9dee4", { r: BACK, f: "metal" }),
    box("tip-mass", [0, 0.12, -0.475], [0.03, 0.03, 0.02], "#5b6777", { f: "metal" }),
  ]),
  def("attitude", "adcs-magnetorquer", "Magnetorquer Rods", [
    cyl("rod-x", [0, -0.135, -0.03], 0.008, 0.07, COPPER, { r: X, f: "metal", i: true }),
    cyl("rod-y", [-0.034, -0.12, 0], 0.008, 0.05, COPPER, { f: "metal", i: true }),
    cyl("rod-z", [0.03, -0.135, 0], 0.008, 0.07, COPPER, { r: Z, f: "metal", i: true }),
  ]),
  def("attitude", "adcs-gnss", "GNSS and Sun-Sensor Suite", [
    box("gnss-patch", [-0.02, 0.1, -0.053], [0.036, 0.036, 0.005], GOLD, { f: "foil" }),
    box("sun-sensor-left", [-0.052, 0.13, 0.02], [0.006, 0.016, 0.016], DARK, { f: "glass" }),
    box("sun-sensor-right", [0.052, 0.13, -0.02], [0.006, 0.016, 0.016], DARK, { f: "glass" }),
    box("nav-receiver", [0, -0.125, 0], [0.06, 0.004, 0.05], PCB, { f: "pcb", i: true }),
  ]),
  def("attitude", "adcs-momentum", "Momentum Bias Wheel", [
    cyl("wheel-housing", [0, -0.125, 0], 0.07, 0.02, "#5b6777", { r: X, f: "metal", i: true }),
    cyl("flywheel", [0, -0.125, 0], 0.056, 0.024, "#c9ced6", { r: X, f: "metal", i: true }),
  ]),
  def("attitude", "adcs-wheels", "Three Reaction Wheels", threeWheels),
  def("attitude", "adcs-startracker", "Star Tracker with Wheels", [...threeWheels, ...tracker(0.1)]),
  def("attitude", "adcs-cmg", "Control Moment Gyros", [
    ...[[-0.022, -0.022], [0.022, -0.022], [-0.022, 0.022], [0.022, 0.022]].flatMap(([x, z], i) => [
      cyl(`gimbal-ring-${i + 1}`, [x, -0.125, z], 0.04, 0.006, "#5b6777", { f: "metal", i: true }),
      cyl(`rotor-${i + 1}`, [x, -0.125, z], 0.026, 0.03, GOLD, { r: i % 2 ? X : Z, f: "metal", i: true }),
    ]),
    ...tracker(0.1),
  ]),
];

// ---- Command and data handling (upper avionics stack) ----
const stack = (colors: string[], extra: VisualPart[] = []): VisualPart[] => [
  ...colors.map((color, i) => box(`board-${i + 1}`, [0, 0.07 + i * 0.01, 0], [0.086, 0.004, 0.086], color, { f: "pcb", i: true })),
  ...[[-0.038, -0.038], [0.038, -0.038], [-0.038, 0.038], [0.038, 0.038]].map(([x, z], i) => cyl(`standoff-${i + 1}`, [x, 0.07 + (colors.length - 1) * 0.005, z], 0.004, 0.006 + (colors.length - 1) * 0.01, METAL, { f: "metal", i: true })),
  ...extra,
];
const chip = (id: string, y: number, size: number, color: string, f: VisualFinish = "dark") => box(id, [0, y, 0], [size, 0.004, size], color, { f, i: true });
const computer = [
  def("computer", "obc-basic", "Basic Flight Computer", stack([PCB], [chip("microcontroller", 0.074, 0.02, DARK)])),
  def("computer", "obc-watchdog", "Watchdog Microcontroller", stack([PCB, PCB], [chip("microcontroller", 0.084, 0.02, DARK), box("watchdog-chip", [0.025, 0.084, 0.025], [0.012, 0.004, 0.012], "#e74c3c", { f: "painted", i: true })])),
  def("computer", "obc-recorder", "Solid-State Recorder", stack([PCB], [...[-0.02, 0.02].flatMap((x, a) => [-0.02, 0.02].map((z, b) => box(`memory-${a + 1}-${b + 1}`, [x, 0.075, z], [0.026, 0.006, 0.026], "#2b3440", { f: "dark", i: true })))])),
  def("computer", "obc-compress", "Compression Processor", stack([PCB, "#1a5a7a"], [chip("codec-chip", 0.084, 0.03, GOLD, "foil")])),
  def("computer", "obc-dual", "Dual-Redundant Computer", stack(["#1a4f8a", "#1a4f8a"], [chip("cpu-a", 0.074, 0.022, DARK), chip("cpu-b", 0.084, 0.022, DARK)])),
  def("computer", "obc-fpga", "FPGA Payload Processor", stack([PCB, "#5a2a82"], [chip("fpga", 0.084, 0.036, "#3d4652"), box("fpga-lid", [0, 0.087, 0], [0.024, 0.002, 0.024], METAL, { f: "metal", i: true })])),
  def("computer", "obc-radhard", "Radiation-Hardened Computer", stack([PCB], [box("shield-box", [0, 0.082, 0], [0.07, 0.018, 0.07], "#8a94a0", { f: "metal", i: true })])),
  def("computer", "obc-ai", "Onboard AI Processor", stack([PCB, "#1a5a7a", "#0f3d2e"], [chip("accelerator", 0.094, 0.034, DARK), ...[-0.012, -0.004, 0.004, 0.012].map((x, i) => box(`heat-fin-${i + 1}`, [x, 0.0965, 0], [0.003, 0.004, 0.032], METAL, { f: "metal", i: true }))])),
];

// ---- Thermal control (back face) ----
const radiator = box("radiator", [0, -0.07, -0.0525], [0.088, 0.12, 0.004], "#f4f6f8", { f: "painted" });
const thermal = [
  def("thermal", "thermal-passive", "Paint and Tape Finish", [
    box("white-stripe", [0, -0.05, -0.0495], [0.088, 0.04, 0.002], "#f4f6f8", { f: "painted" }),
    box("black-stripe", [0, -0.1, -0.0495], [0.088, 0.04, 0.002], "#15181d", { f: "dark" }),
  ]),
  def("thermal", "thermal-mli", "Multi-Layer Insulation", [
    box("blanket-upper", [0, -0.01, 0], [0.099, 0.06, 0.099], "#d4a82a", { f: "foil" }),
    box("blanket-lower", [0, -0.125, 0], [0.099, 0.04, 0.099], "#d4a82a", { f: "foil" }),
  ]),
  def("thermal", "thermal-heaters", "Battery Heaters", [
    box("heater-front", [0, 0.02, 0.044], [0.07, 0.04, 0.002], "#e07b1a", { f: "foil", i: true }),
    box("heater-back", [0, 0.02, -0.044], [0.07, 0.04, 0.002], "#e07b1a", { f: "foil", i: true }),
    box("thermostat", [0.036, 0.05, 0.036], [0.01, 0.01, 0.01], DARK, { f: "dark", i: true }),
  ]),
  def("thermal", "thermal-radiator", "Fixed Radiator Panel", [radiator]),
  def("thermal", "thermal-heatpipes", "Heat Pipes", [radiator, ...[-0.028, 0, 0.028].map((x, i) => cyl(`pipe-${i + 1}`, [x, -0.07, -0.057], 0.006, 0.11, COPPER, { f: "metal" }))]),
  def("thermal", "thermal-louvers", "Thermal Louvers", [
    radiator,
    box("louver-frame", [0, -0.07, -0.056], [0.092, 0.124, 0.003], METAL, { f: "metal" }),
    ...[-0.044, -0.022, 0, 0.022, 0.044].map((dy, i) => box(`blade-${i + 1}`, [0, -0.07 + dy, -0.062], [0.08, 0.016, 0.002], "#dfe4ea", { r: [0.7, 0, 0], f: "metal" })),
  ]),
  def("thermal", "thermal-deployable", "Deployable Radiator", [
    radiator,
    cyl("hinge", [0, -0.132, -0.056], 0.008, 0.08, METAL, { r: X, f: "metal" }),
    box("wing-radiator", [0, -0.132, -0.15], [0.09, 0.004, 0.18], "#f4f6f8", { f: "painted" }),
  ]),
  def("thermal", "thermal-pumped", "Pumped Fluid Loop", [
    radiator,
    cyl("hinge", [0, -0.132, -0.056], 0.008, 0.08, METAL, { r: X, f: "metal" }),
    box("wing-radiator", [0, -0.132, -0.13], [0.09, 0.004, 0.14], "#f4f6f8", { f: "painted" }),
    cyl("pump", [-0.03, -0.02, -0.062], 0.02, 0.03, "#5b6777", { f: "metal" }),
    cyl("loop-supply", [0.03, -0.07, -0.058], 0.006, 0.12, "#3b8fd9", { f: "metal" }),
    cyl("loop-return", [0.012, -0.07, -0.058], 0.006, 0.12, "#d9573b", { f: "metal" }),
  ]),
];

// ---- Propulsion (under the bottom deck) ----
const nozzle = (id: string, pos: Vec3, d: number, len: number) => cone(id, pos, d, len, "#6b7480", { f: "metal" });
const tank = (id: string, x: number, d: number, color: string) => cyl(id, [x, -0.18, 0], d, 0.05, color, { f: "painted" });
const propulsion = [
  def("propulsion", "prop-none", "No Propulsion", [cyl("separation-ring", [0, -0.157, 0], 0.08, 0.008, METAL, { f: "metal" })]),
  def("propulsion", "prop-coldgas", "Cold-Gas Thrusters", [
    tank("gas-bottle", 0, 0.06, "#dfe4ea"),
    ...[[-0.04, -0.04], [0.04, -0.04], [-0.04, 0.04], [0.04, 0.04]].map(([x, z], i) => nozzle(`jet-${i + 1}`, [x, -0.163, z], 0.012, 0.016)),
  ]),
  def("propulsion", "prop-resistojet", "Water Resistojet", [
    tank("water-tank", 0, 0.07, "#3b8fd9"),
    cyl("heater-chamber", [0, -0.212, 0], 0.02, 0.014, COPPER, { f: "metal" }),
    nozzle("nozzle", [0, -0.232, 0], 0.026, 0.026),
  ]),
  def("propulsion", "prop-ion", "Gridded Ion Engine", [
    box("power-processor", [0, -0.168, 0], [0.09, 0.026, 0.09], "#3a4656", { f: "dark" }),
    cyl("discharge-chamber", [0, -0.2, 0], 0.07, 0.04, "#8a94a0", { f: "metal" }),
    cyl("ion-grid", [0, -0.2215, 0], 0.06, 0.003, "#58c7ff", { f: "glass" }),
    cyl("neutraliser", [0.042, -0.2, 0], 0.008, 0.04, METAL, { f: "metal" }),
  ]),
  def("propulsion", "prop-hall", "Hall-Effect Thruster", [
    box("power-processor", [0, -0.166, 0], [0.09, 0.022, 0.09], "#3a4656", { f: "dark" }),
    cyl("magnet-body", [0, -0.194, 0], 0.076, 0.034, "#5b6777", { f: "metal" }),
    cyl("plasma-channel", [0, -0.2125, 0], 0.062, 0.003, "#7fb8ff", { f: "glass" }),
    cyl("centre-pole", [0, -0.214, 0], 0.026, 0.006, "#c9ced6", { f: "metal" }),
    cyl("cathode", [0.046, -0.2, 0], 0.01, 0.03, METAL, { f: "metal" }),
  ]),
  def("propulsion", "prop-monoprop", "Monopropellant Thruster", [tank("propellant-tank", 0, 0.08, "#dfe4ea"), cyl("catalyst-bed", [0, -0.211, 0], 0.018, 0.012, "#5b6777", { f: "metal" }), nozzle("nozzle", [0, -0.236, 0], 0.036, 0.038)]),
  def("propulsion", "prop-green", "Green Monopropellant", [tank("propellant-tank", 0, 0.08, "#58d68d"), cyl("catalyst-bed", [0, -0.211, 0], 0.02, 0.012, "#5b6777", { f: "metal" }), nozzle("nozzle", [0, -0.238, 0], 0.04, 0.042)]),
  def("propulsion", "prop-biprop", "Bipropellant Engine", [
    tank("fuel-tank", -0.026, 0.048, "#e0a23b"), tank("oxidiser-tank", 0.026, 0.048, "#5b9bd9"),
    cyl("combustion-chamber", [0, -0.216, 0], 0.024, 0.022, "#5b6777", { f: "metal" }),
    nozzle("nozzle", [0, -0.262, 0], 0.07, 0.07),
  ]),
];

export const extraVisualDefinitions: readonly ComponentVisualDefinition[] = [
  ...payload, ...solar, ...battery, ...comms, ...attitude, ...computer, ...thermal, ...propulsion,
];
