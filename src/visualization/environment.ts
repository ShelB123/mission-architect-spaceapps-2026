/** Educational reference data, never orbital ephemerides or engineering inputs. */
export type EnvironmentId = "earth" | "iss" | "moon" | "satellite" | "debris";
export interface EnvironmentEntry {
  id: EnvironmentId;
  name: { en: string; es: string };
  fact: { en: string; es: string };
  lesson: { en: string; es: string };
  source: string;
  credit: string;
}
export const environmentEntries: readonly EnvironmentEntry[] = [
  { id: "earth", name: {en:"Earth",es:"Tierra"},
    fact: {en:"Blue Marble combines satellite observations of continents, oceans, ice and clouds. It is a historical mosaic, not live weather.",es:"Blue Marble combina observaciones satelitales de continentes, océanos, hielo y nubes. Es un mosaico histórico, no el clima en vivo."},
    lesson: {en:"Your camera collects data; the radio must send it home. Looking at a continent here does not calculate imaging coverage.",es:"Tu cámara recoge datos; la radio debe enviarlos a casa. Mirar un continente aquí no calcula cobertura de imágenes."},
    source:"https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/",credit:"NASA/GSFC · Reto Stöckli / Robert Simmon" },
  { id:"iss",name:{en:"International Space Station",es:"Estación Espacial Internacional"},
    fact:{en:"A laboratory in low Earth orbit: about 400 km altitude, roughly 90 minutes per orbit, with an inclination of 51.6°. Its altitude varies.",es:"Un laboratorio en órbita terrestre baja: unos 400 km de altitud, cerca de 90 minutos por vuelta e inclinación de 51,6°. Su altitud varía."},
    lesson:{en:"Solar arrays supply power in sunlight; batteries support operations in eclipse. This simplified model is not the station’s live position.",es:"Los paneles suministran energía al Sol; las baterías sostienen las operaciones en eclipse. Este modelo simplificado no indica su posición real."},
    source:"https://www.nasa.gov/reference/international-space-station/",credit:"NASA · ISS reference / Spot the Station" },
  {id:"moon",name:{en:"Moon",es:"Luna"},
    fact:{en:"Earth’s natural satellite is about 384,400 km away on average. It lies far beyond your low Earth orbit.",es:"El satélite natural de la Tierra está a unos 384 400 km de distancia media. Se encuentra muy lejos de tu órbita terrestre baja."},
    lesson:{en:"Reaching the Moon needs a different mission and trajectory. Here it is a visual reference; distance and size are compressed for visibility.",es:"Llegar a la Luna requiere otra misión y trayectoria. Aquí es una referencia visual; distancia y tamaño están adaptados para verla."},
    source:"https://science.nasa.gov/moon/facts/",credit:"NASA SVS · Ernie Wright · LRO/LROC" },
  {id:"satellite",name:{en:"Observation satellite",es:"Satélite de observación"},
    fact:{en:"A synthetic example with an instrument, solar arrays and an antenna. It does not represent a tracked spacecraft.",es:"Un ejemplo sintético con instrumento, paneles solares y antena. No representa una nave rastreada."},
    lesson:{en:"More science data also needs energy, storage and a radio link. Other satellites are not automatically close enough to collide.",es:"Más datos científicos también necesitan energía, almacenamiento y enlace de radio. Otros satélites no están automáticamente en riesgo de chocar."},
    source:"https://www.nasa.gov/smallsat-institute/what-are-smallsats-and-cubesats/",credit:"Mission Architect · synthetic geometry" },
  {id:"debris",name:{en:"Orbital debris",es:"Basura espacial"},
    fact:{en:"Discarded rocket parts and fragments can remain in Earth orbit. Even small debris can damage a spacecraft at orbital speeds.",es:"Restos de cohetes y fragmentos pueden permanecer en órbita terrestre. Incluso piezas pequeñas pueden dañar una nave a velocidades orbitales."},
    lesson:{en:"Real avoidance needs tracking, uncertainty estimates and propulsion. These example pieces can be inspected; avoiding collisions is not playable yet.",es:"Evitar un choque requiere seguimiento, estimar incertidumbres y propulsión. Puedes inspeccionar estas piezas de ejemplo; esquivar colisiones todavía no es jugable."},
    source:"https://orbitaldebris.jsc.nasa.gov/faq/",credit:"Mission Architect · synthetic geometry" }
];
