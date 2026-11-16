import { components, synergies } from "../data/catalog";

/** Spanish copy for the eight-subsystem catalog: [name, description, real-world context] by component ID. */
const byId: Readonly<Record<string, readonly [string, string, string]>> = {
  "camera-basic": ["", "", "Cámaras pequeñas como las de los CubeSat Dove de Planet fotografían la Tierra todos los días."],
  "camera-hd": ["", "", "Los telescopios comerciales tipo WorldView distinguen desde la órbita detalles de menos de medio metro."],
  "solar-basic": ["", "", "Las alas rígidas que se despliegan tras el lanzamiento son la fuente de energía más común en satélites pequeños."],
  "solar-advanced": ["", "", "Las alas de varios paneles, como las de los satélites Sentinel, se despliegan en secciones con bisagras."],
  "battery-basic": ["", "", "Celdas cilíndricas de iones de litio, parecidas a las de una laptop, alimentan a la mayoría de los CubeSat."],
  "battery-advanced": ["", "", "La Estación Espacial Internacional reemplazó sus baterías de níquel-hidrógeno por paquetes de iones de litio."],
  "solar-double": ["", "", "Añadir paneles idénticos es la forma más simple de escalar la potencia: área, masa y costo crecen juntos."],
  "battery-double": ["", "", "Las baterías se arman con cadenas de celdas idénticas; más cadenas significan más energía almacenada."],
  "radio-basic": ["", "", "Las antenas de varilla desplegables dan a los satélites pequeños un enlace simple que funciona en casi cualquier orientación."],
  "radio-advanced": ["", "", "Un plato concentra la señal en un haz estrecho: más datos, pero debe apuntar a la estación."],

  "cam-multispectral": ["Cámara multiespectral", "Varias bandas de color; datos y consumo equilibrados.", "OLI de Landsat 8 y MSI de Sentinel-2 registran varias bandas de color para mapear cultivos, agua e incendios."],
  "cam-hyperspectral": ["Espectrómetro hiperespectral", "Cientos de bandas estrechas: gran volumen de datos.", "Hyperion (EO-1, NASA) y el italiano PRISMA dividen la luz en cientos de bandas para identificar materiales."],
  "cam-thermal": ["Cámara infrarroja térmica", "Mide la temperatura de la superficie; el detector prefiere estar frío.", "TIRS de Landsat y ECOSTRESS en la Estación Espacial miden la temperatura de suelos y aguas."],
  "radar-sar": ["Radar de apertura sintética", "Ve a través de nubes y de noche; consume muchísima energía.", "Sentinel-1 y RADARSAT observan inundaciones entre nubes y oscuridad enviando sus propios pulsos de radar."],
  "lidar": ["Altímetro láser", "Pulsos láser miden alturas con apuntamiento fino.", "ICESat-2 cronometra pulsos láser para medir la altura del hielo; GEDI, en la Estación Espacial, mapea los bosques."],
  "gnss-ro": ["Receptor de ocultación GNSS", "Instrumento diminuto; pocos datos, pero valiosos.", "COSMIC-2 y CubeSat comerciales miden cómo se curvan las señales de navegación en la atmósfera para mejorar el pronóstico del tiempo."],

  "solar-body": ["Celdas montadas en el cuerpo", "Sin mecanismos y casi sin masa, pero poca potencia.", "Vanguard 1 y muchos CubeSat llevan las celdas sobre su propia piel: nada que desplegar, nada que se atasque."],
  "solar-triple": ["Alas de triple unión", "Celdas de alta eficiencia: más vatios por kilogramo.", "Las celdas de triple unión de arseniuro de galio, estándar hoy, convierten cerca del 30 % de la luz solar."],
  "solar-tracking": ["Panel con seguimiento solar", "Un motor mantiene las alas de cara al Sol.", "Los mecanismos de orientación giran las alas hacia el Sol, como en la Estación Espacial Internacional."],
  "solar-rollout": ["Manta solar enrollable", "Manta flexible: máxima potencia, máximo precio.", "Los paneles enrollables (ROSA) se probaron en la Estación Espacial en 2017 y hoy refuerzan su sistema eléctrico."],
  "solar-quad": ["Alas desplegables de seis paneles", "Gran área rígida: mucha generación, mucha masa.", "Los grandes observatorios despliegan varios paneles rígidos por ala; más área también es más masa que lanzar."],

  "battery-nicd": ["Paquete NiCd clásico", "Barato y robusto, pero pesado para su energía.", "Las baterías de níquel-cadmio volaron en satélites desde la década de 1960: resistentes, pero pesadas."],
  "battery-nih2": ["Recipiente de níquel-hidrógeno", "Soporta muchísimos ciclos; recipiente a presión voluminoso.", "El telescopio Hubble funcionó casi dos décadas con baterías de níquel-hidrógeno antes de cambiarlas."],
  "battery-lipo": ["Paquete de polímero de litio", "Reserva muy ligera para diseños con masa crítica.", "Las celdas planas de polímero de litio ahorran masa y caben en espacios delgados; son populares en CubeSat."],
  "battery-lifepo": ["Paquete robusto LiFePO4", "Química estable, larga vida, densidad media.", "El litio-ferrofosfato sacrifica algo de densidad de energía a cambio de estabilidad térmica y larga vida."],
  "battery-bank": ["Banco Li-ion de alta densidad", "La mayor reserva disponible.", "Las celdas espaciales modernas de iones de litio guardan varias veces más energía por kilogramo que las de níquel."],

  "radio-uhf": ["Transceptor baliza UHF", "Radio mínima: diminuta, barata y muy lenta.", "Con balizas UHF sencillas, la mayoría de los CubeSat universitarios envían su primera señal a casa."],
  "radio-sband": ["Transmisor de parche banda S", "Antena plana, tasa media y confiable.", "La banda S es el caballo de batalla para telemetría y órdenes en las redes terrestres de NASA y ESA."],
  "radio-xband": ["Plato de alta ganancia banda X", "Descarga rápida de imágenes con un plato orientado.", "Los satélites Landsat y Sentinel envían sus imágenes a Tierra en banda X."],
  "radio-phased": ["Antena de arreglo en fase", "Dirige su haz electrónicamente, sin partes móviles.", "Los arreglos de orientación electrónica, usados por constelaciones de internet, apuntan haces sin motores."],
  "radio-kaband": ["Antena orientable banda Ka", "Ancho de banda enorme para grandes volúmenes.", "La misión de radar NISAR usa banda Ka para devolver su enorme volumen de datos."],
  "radio-laser": ["Terminal óptico láser", "La tasa más alta, pero exige apuntamiento preciso.", "El CubeSat TBIRD de la NASA demostró descargas láser de 200 gigabits por segundo."],

  "adcs-passive": ["Estabilización magnética pasiva", "Incluida en la plataforma: apuntamiento tosco, sin consumo.", "Un imán permanente alinea un satélite pequeño con el campo magnético terrestre: simple, pero impreciso."],
  "adcs-gravity": ["Mástil de gradiente gravitatorio", "Un mástil largo mantiene una cara hacia la Tierra.", "Un mástil largo hace que el satélite cuelgue como un péndulo; la técnica vuela desde los años 60."],
  "adcs-magnetorquer": ["Barras magnetopar", "Electroimanes que frenan el giro descontrolado.", "Barras electroimán empujan contra el campo magnético terrestre; casi todos los CubeSat las llevan."],
  "adcs-gnss": ["Conjunto GNSS y sensores solares", "Conoce la posición, la hora y la dirección del Sol.", "Los receptores de navegación dan posición y hora en órbita baja; los sensores solares, la dirección aproximada del Sol."],
  "adcs-momentum": ["Rueda de momento", "Una rueda girando aporta rigidez giroscópica.", "Una sola rueda rápida resiste perturbaciones como un trompo; clásica en satélites antiguos."],
  "adcs-wheels": ["Tres ruedas de reacción", "Giran el satélite en sus tres ejes.", "El telescopio Kepler tuvo que cambiar su misión cuando fallaron dos de sus cuatro ruedas de reacción."],
  "adcs-startracker": ["Rastreador estelar con ruedas", "Apuntamiento fino a partir de las estrellas.", "Los rastreadores comparan patrones de estrellas con un catálogo y hallan la orientación con precisión de segundos de arco."],
  "adcs-cmg": ["Giróscopos de control de momento", "Reorientación rápida y ágil; pesados y de alto consumo.", "Los giróscopos de control de momento orientan la Estación Espacial y satélites ágiles como Pléiades."],

  "obc-basic": ["Computadora de vuelo básica", "Incluida en la plataforma: ejecuta la misión y nada más.", "Muchos CubeSat vuelan con placas de microcontrolador no muy distintas de la electrónica de aficionado."],
  "obc-watchdog": ["Microcontrolador con vigilancia", "Se recupera rápido de fallos: calibraciones más cortas.", "Un temporizador de vigilancia reinicia la computadora si se cuelga, vital cuando la radiación altera la memoria."],
  "obc-recorder": ["Grabador de estado sólido", "Memoria masiva ordenada que agiliza la descarga.", "Los grabadores de estado sólido reemplazaron a las cintas y guardan las observaciones entre pases."],
  "obc-compress": ["Procesador de compresión", "Reduce los datos antes de transmitirlos.", "La compresión a bordo según estándares CCSDS reduce las imágenes antes de enviarlas a Tierra."],
  "obc-dual": ["Computadora doble redundante", "Una computadora de reserva toma el control: calibraciones más cortas.", "Las misiones críticas llevan dos computadoras; si una falla, la otra asume el mando."],
  "obc-fpga": ["Procesador FPGA de carga útil", "Procesa los datos del instrumento en tiempo real.", "Los chips FPGA reconfigurables procesan datos al vuelo y pueden reprogramarse en órbita."],
  "obc-radhard": ["Computadora endurecida a radiación", "Resiste la radiación: las calibraciones duran la mitad.", "El procesador endurecido RAD750 vuela en los rovers Curiosity y Perseverance."],
  "obc-ai": ["Procesador de IA a bordo", "Conserva solo los datos útiles; autochequeos rápidos.", "Φ-sat-1 de la ESA usó inteligencia artificial a bordo para descartar imágenes nubladas antes de enviarlas."],

  "thermal-passive": ["Acabado de pintura y cintas", "Incluido en la plataforma: control pasivo básico.", "Pintura blanca, pintura negra y cintas definen cuánto calor absorbe y emite cada superficie."],
  "thermal-mli": ["Aislamiento multicapa", "Mantas que frenan la pérdida de calor en eclipse.", "Las mantas doradas que se ven en las naves son pilas de finas láminas reflectantes."],
  "thermal-heaters": ["Calentadores de batería", "Mantienen tibias las celdas; gastan un poco de energía.", "Calentadores con termostato mantienen las baterías dentro de su rango de temperatura durante el eclipse."],
  "thermal-radiator": ["Panel radiador fijo", "Expulsa el calor sobrante al espacio frío.", "Los radiadores miran al espacio profundo y eliminan el calor sobrante como luz infrarroja."],
  "thermal-heatpipes": ["Tubos de calor", "Mueven calor en silencio y sin partes móviles.", "Los tubos de calor transportan calor con un fluido que se evapora; son estándar en satélites de comunicaciones."],
  "thermal-louvers": ["Persianas térmicas", "Persianas que se abren con calor y se cierran con frío.", "Funcionan como persianas sobre un radiador; volaron en la misión cometaria Rosetta de la ESA."],
  "thermal-deployable": ["Radiador desplegable", "Gran superficie desplegable para mucho calor.", "La Estación Espacial lleva grandes paneles radiadores desplegables para eliminar su calor."],
  "thermal-pumped": ["Circuito de fluido bombeado", "Enfriamiento activo: el mejor control, la mayor masa.", "Los circuitos bombeados llevan calor como el sistema de un auto; la Estación Espacial usa circuitos de amoníaco."],

  "prop-none": ["Sin propulsión", "Incluido en la plataforma: la órbita no se puede ajustar.", "La mayoría de los CubeSat no tienen motor y descienden poco a poco por el roce con la alta atmósfera."],
  "prop-coldgas": ["Propulsores de gas frío", "Chorros simples de gas a presión.", "Los chorros de gas frío solo liberan gas a presión; los satélites GRACE-FO los usan para un control suave."],
  "prop-resistojet": ["Resistojet de agua", "Vapor de agua calentado eléctricamente.", "Los resistojet calientan un propelente seguro como el agua; vuelan en pequeños satélites comerciales."],
  "prop-ion": ["Motor iónico de rejillas", "Eficiencia extrema, empuje mínimo, alto consumo.", "Los motores iónicos llevaron la sonda Dawn de la NASA a Vesta y Ceres: muy poco empuje, sostenido durante años."],
  "prop-hall": ["Propulsor de efecto Hall", "Propulsión eléctrica eficiente.", "Los propulsores Hall aceleran gas ionizado con campos eléctricos y magnéticos; los usan constelaciones de internet."],
  "prop-monoprop": ["Propulsor monopropelente", "El clásico: confiable y rápido.", "Los propulsores de hidracina son el estándar desde hace décadas: confiables, pero su propelente es tóxico."],
  "prop-green": ["Monopropelente verde", "Propelente menos tóxico y algo más eficaz.", "La misión GPIM de la NASA probó en órbita una alternativa menos tóxica a la hidracina."],
  "prop-biprop": ["Motor bipropelente", "El mayor empuje para maniobras rápidas; pesado.", "Los motores bipropelentes queman combustible con un oxidante y realizan los mayores cambios de órbita."],
};

const synergyById: Readonly<Record<string, readonly [string, string]>> = {
  "sharp-focus": ["Enfoque nítido", "El apuntamiento fino deja que un instrumento de precisión use toda su resolución."],
  "cold-detector": ["Detector frío", "Un radiador enfría el detector infrarrojo y reduce su ruido."],
  "occultation": ["Ocultaciones precisas", "Conocer bien la órbita afina los perfiles de radio-ocultación."],
  "data-pipeline": ["Cadena de datos", "La compresión a bordo doma un instrumento de gran volumen."],
  "laser-lock": ["Enganche láser", "Un enlace láser solo sostiene su haz estrecho con apuntamiento fino."],
  "steady-beam": ["Haz estable", "Las ruedas mantienen la antena de alta ganancia sobre la estación."],
  "smart-downlink": ["Descarga inteligente", "La IA elige los mejores datos para un enlace direccional rápido."],
  "warm-cells": ["Celdas tibias", "El aislamiento conserva el calor que aportan los calentadores."],
  "electric-drive": ["Impulso eléctrico", "Un panel solar potente alimenta la propulsión eléctrica."],
  "auto-orbit": ["Órbita autónoma", "Con navegación a bordo, las maniobras se planifican sin esperar a Tierra."],
};

const ui: Readonly<Record<string, string>> = {
  "Attitude": "Actitud", "Computer": "Computadora", "Thermal": "Térmico", "Propulsion": "Propulsión",
  "Scientific payload": "Carga útil científica", "Solar power": "Energía solar", "Energy storage": "Almacenamiento de energía", "Communications": "Comunicaciones",
  "Attitude control": "Control de actitud", "Onboard computer": "Computadora de a bordo", "Thermal control": "Control térmico",
  "attitude": "control de actitud", "computer": "computadora", "thermal": "control térmico", "propulsion": "propulsión",
  "The instrument produces observations in MB/min. A faster instrument needs more power. Acquisition stops when you turn it off.": "El instrumento produce observaciones en MB/min. Uno más rápido necesita más energía. Deja de observar cuando lo apagas.",
  "Panels generate electricity only in sunlight. More area gives more watts, but also more mass and cost.": "Los paneles generan electricidad solo a la luz del Sol. Más área da más vatios, pero también más masa y costo.",
  "Batteries store energy in Wh for the eclipse. A larger reserve cannot fix a permanent generation deficit.": "Las baterías guardan energía en Wh para el eclipse. Una reserva mayor no arregla un déficit permanente de generación.",
  "Attitude control points the satellite. Steadier pointing makes more of each observation usable (a synthetic science bonus). One optional unit; the bus includes a basic one.": "El control de actitud apunta el satélite. Un apuntamiento más estable aprovecha mejor cada observación (bono ficticio de ciencia). Una unidad opcional; la plataforma incluye una básica.",
  "The onboard computer stores and prepares data. Compression raises the effective downlink; robust computers shorten calibration pauses. One optional unit.": "La computadora guarda y prepara los datos. La compresión eleva la descarga efectiva; las computadoras robustas acortan las pausas de calibración. Una unidad opcional.",
  "Thermal control keeps every part within its temperature range. Batteries kept warm hold more usable energy (a synthetic capacity bonus). One optional unit.": "El control térmico mantiene cada parte en su rango de temperatura. Las baterías tibias entregan más energía útil (bono ficticio de capacidad). Una unidad opcional.",
  "Propulsion adjusts the orbit. In this game it shortens the ground-station outage by re-phasing toward a backup station (a synthetic rule). One optional unit.": "La propulsión ajusta la órbita. En este juego acorta la caída de la estación terrestre al reubicarse hacia una estación de respaldo (regla ficticia). Una unidad opcional.",
  "INCLUDED": "INCLUIDO", "IN REAL SATELLITES": "EN SATÉLITES REALES", "COMBINATIONS": "COMBINACIONES", "ACTIVE": "ACTIVA",
  "Needs": "Requiere", "or": "o", "No special combinations for this part.": "Esta pieza no tiene combinaciones especiales.",
  "Synthetic schematic drawing": "Dibujo esquemático ficticio", "science": "ciencia", "downlink": "descarga", "battery": "batería",
  "calibration pause": "pausa de calibración", "station outage": "caída de estación", "bus baseline": "base de la plataforma",
  "Active combinations": "Combinaciones activas", "Equip this part to activate": "Instala esta pieza para activarla", "none yet": "ninguna todavía",
  "An eight-subsystem smallsat": "Un satélite pequeño de ocho subsistemas",
  "Four mandatory subsystems and four optional upgrades. Real missions are named only as examples; every number is fictional.": "Cuatro subsistemas obligatorios y cuatro mejoras opcionales. Las misiones reales se citan solo como ejemplo; todos los números son ficticios.",
};

/** English source text → Spanish, merged into the main dictionary by es.ts. */
export const esCatalog: Readonly<Record<string, string>> = (() => {
  const out: Record<string, string> = { ...ui };
  for (const component of components) {
    const copy = byId[component.id];
    if (!copy) continue;
    if (copy[0]) out[component.name] = copy[0];
    if (copy[1]) out[component.description] = copy[1];
    if (copy[2] && component.context) out[component.context] = copy[2];
  }
  for (const synergy of synergies) {
    const copy = synergyById[synergy.id];
    if (copy) { out[synergy.name] = copy[0]; out[synergy.description] = copy[1]; }
  }
  return out;
})();
