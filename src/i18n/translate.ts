import { es } from "./es";
import type { Language } from "./Language";

type Rule = readonly [RegExp, (match: RegExpMatchArray, t: (text: string) => string) => string];
/** Translate legacy engine prose at the presentation boundary; never mutate engine output. */
const rules: readonly Rule[] = [
  [/^([\d.]+) W generation · ([\d.]+) W load$/, m => `${m[1]} W de generación · ${m[2]} W de consumo`],
  [/^([+\-\d.]+) W generation$/, m => `${m[1]} W de generación`],
  [/^([+\-\d.]+) Wh reserve$/, m => `${m[1]} Wh de reserva`],
  [/^([+\-\d.]+) MB\/min acquisition$/, m => `${m[1]} MB/min de observación`],
  [/^([+\-\d.]+) MB\/min downlink$/, m => `${m[1]} MB/min de transmisión`],
  [/^(\d+)× ACCELERATED$/, m => `TIEMPO ACELERADO ×${m[1]}`],
  [/^Scenario budget exceeded by (.+) credits\.$/, m => `Superas el presupuesto del escenario en ${m[1]} créditos.`],
  [/^Scenario deadline exceeded: at most (.+) orbits\.$/, m => `Superas el plazo del escenario: máximo ${m[1]} órbitas.`],
  [/^Launch mass exceeded by (.+) kg\.$/, m => `Superas la masa permitida en ${m[1]} kg.`],
  [/^Budget exceeded by (.+) credits\.$/, m => `Superas el presupuesto en ${m[1]} créditos.`],
  [/^Select exactly one (.+) component \(currently (.+)\)\.$/, (m,t) => `Selecciona exactamente un componente de ${t(m[1])} (ahora hay ${m[2]}).`],
  [/^Daylight solar generation \((.+) W\) is below continuous nominal load \((.+) W\)\.$/, m => `La generación solar al Sol (${m[1]} W) es menor que el consumo nominal continuo (${m[2]} W).`],
  [/^Orbit-average solar generation \((.+) W\) is below nominal load \((.+) W\); batteries cannot sustain that deficit indefinitely\.$/, m => `La generación solar media por órbita (${m[1]} W) es menor que el consumo nominal (${m[2]} W); la batería no puede sostener ese déficit indefinidamente.`],
  [/^Full-eclipse energy demand \((.+) Wh\) exceeds battery capacity \((.+) Wh\) at continuous nominal load\.$/, m => `La energía necesaria para todo el eclipse (${m[1]} Wh) supera la capacidad de la batería (${m[2]} Wh) con consumo nominal continuo.`],
  [/^Radio peak downlink \((.+) MB\/min\) does not exceed payload production \((.+) MB\/min\); intermittent contact further limits returned data\.$/, m => `La tasa máxima de transmisión (${m[1]} MB/min) no supera la producción de la cámara (${m[2]} MB/min); los contactos intermitentes limitan aún más los datos enviados.`],
  [/^Scenario: (.+)\. Return at least (.+) MB with no power outages in at most (.+) orbits\.$/, (m,t) => `Escenario: ${t(m[1])}. Envía al menos ${m[2]} MB sin interrupciones eléctricas en un máximo de ${m[3]} órbitas.`],
  [/^Budget: (.+) \/ (.+) synthetic credits\. (.+)$/, (m,t) => `Presupuesto: ${m[1]} / ${m[2]} créditos ficticios. ${t(m[3])}`],
  [/^Replay seed: (\d+)\. Events are synthetic training operations, not real failure predictions\.$/, m => `Semilla de simulación: ${m[1]}. Los eventos son situaciones ficticias de entrenamiento, no predicciones de fallos reales.`],
  [/^Synthetic training event \[(.+)\]: (.+) min; (.+)\.$/, (m,t) => `Evento ficticio [${t(m[1])}]: ${m[2]} min; ${t(m[3])}.`],
  [/^Operator command at (.+) min: camera (on|off)\.$/, (m,t) => `Orden a los ${m[1]} min: cámara ${t(m[2])}.`],
  [/^Completed (.+) modeled orbits at (.+) km\.$/, m => `Completadas ${m[1]} órbitas modeladas a ${m[2]} km.`],
  [/^Produced (.+) MB and downlinked (.+) MB\.$/, m => `Se obtuvieron ${m[1]} MB y se enviaron ${m[2]} MB a Tierra.`],
  [/^Returned (.+) \/ (.+) MB; (.+) MB remain on board\. Only returned data count toward the objective\.$/, m => `Enviados ${m[1]} / ${m[2]} MB; quedan ${m[3]} MB a bordo. Solo cuentan los datos recibidos en Tierra.`],
  [/^Score \(floored\): science (.+)\/70 \+ powered time (.+)\/20 \+ unused budget (.+)\/10; failures capped at 99\. The score is not a probability of success\.$/, m => `Puntuación (redondeada hacia abajo): ciencia ${m[1]}/70 + tiempo con energía ${m[2]}/20 + presupuesto restante ${m[3]}/10; máximo 99 si la misión falla. No representa una probabilidad de éxito.`],
  [/^Power deficit in (.+) reporting steps \((.+) modeled unavailable minutes\)\. A larger battery bridges deficits; more solar generation or a lower-power payload addresses recurring demand\.$/, m => `Déficit de energía en ${m[1]} intervalos (${m[2]} minutos modelados sin servicio). Una batería mayor cubre déficits; más generación solar o una cámara de menor consumo corrigen una demanda recurrente.`],
  [/^Unknown component: (.+)$/, m => `Componente desconocido: ${m[1]}`],
  [/^2D front-view schematic of the spacecraft bus with (.+)\.$/, (m,t) => m[1] === "no drawable components" ? "Esquema frontal 2D de la plataforma sin componentes que se puedan dibujar." : `Esquema frontal 2D de la plataforma con ${t(m[1])}.`],
  [/^(\d+) schematic parts?: (.+)$/, (m,t) => `${m[1]} ${m[1] === "1" ? "pieza esquemática" : "piezas esquemáticas"}: ${t(m[2])}`],
  [/^"(.+)" is selected more than once; it is drawn only once\.$/, m => `«${m[1]}» está seleccionado varias veces; se dibuja una sola vez.`],
  [/^"(.+)" is not in the component catalog and cannot be drawn\.$/, m => `«${m[1]}» no existe en el catálogo y no se puede dibujar.`],
  [/^(.+) has no visual representation yet\.$/, (m,t) => `${t(m[1])} todavía no tiene representación visual.`],
  [/^(.+) cannot be drawn: (.+)\.$/, (m,t) => `No se puede dibujar ${t(m[1])}: ${t(m[2])}.`],
  [/^partId "(.+)" is repeated$/, m => `el identificador de pieza «${m[1]}» está repetido`],
  [/^part "(.+)" (.+)$/, (m,t) => `la pieza «${m[1]}» ${t(m[2])}`],
  [/^is a (cylinder|cone) whose X and Z diameters differ$/, m => `es ${m[1] === "cone" ? "un cono" : "un cilindro"} con diámetros X y Z diferentes`],
  [/^cell (.+)$/, m => `celda ${m[1]}`],
  [/^Timeline is limited to (.+) samples\.$/, m => `La secuencia está limitada a ${m[1]} muestras.`],
];

export function translateText(text: string, language: Language): string {
  if (language === "en" || !text.trim()) return text;
  const core = text.trim();
  let translated = es[core];
  if (translated === undefined) {
    for (const [pattern, render] of rules) {
      const match = core.match(pattern);
      if (match) { translated = render(match, value => translateText(value, language)); break; }
    }
  }
  // Lists of catalog/part names occur in accessible 2D descriptions.
  if (translated === undefined && core.includes(", ")) {
    const items = core.split(", ");
    const translatedItems = items.map(item => translateText(item, language));
    if (translatedItems.some((item, i) => item !== items[i])) translated = translatedItems.join(", ");
  }
  return translated === undefined ? text : text.replace(core, translated);
}
