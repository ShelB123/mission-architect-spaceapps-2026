# Entorno espacial: diseño y plan de implementación

## Objetivo y alcance
Sustituir la tierra procedural por cartografía Blue Marble verificable y ofrecer exploración de Tierra, ISS, Luna, satélite sintético y basura espacial. Objetos seleccionables con fichas ES/EN; la misión se pausa al explorar. Los objetos no son obstáculos físicos implementados: sin efemérides, riesgo de colisión, maniobras ni puntuación por inspeccionar.

## Arquitectura e interfaces
Presentación de solo lectura. FlightView recibe frame/IDs y callback onExplore para pausar el reloj; el renderer recibe objeto seleccionado y callback de inspección. Datos educativos separados del motor. Escenas de vuelo conservan fase del motor; decoraciones con posiciones fijas ilustrativas. Un explorador modal ofrece encuadre dedicado, navegación por objetos, fuente y cierre con restauración de foco. Sin scroll: paneles adaptados y fichas breves.

Archivos: FlightScene.tsx, nuevos SpaceEnvironment.tsx y environment.ts, FlightView.tsx, nuevo EnvironmentExplorer.tsx y CSS local; integración mínima App.tsx; pruebas y assets locales con créditos. Ningún cambio de contracts.ts, catálogo físico o motor. Dependencias: React, Three y Fiber existentes.

## Riesgos y opción sencilla
Texturas locales pequeñas para no depender de servidores NASA durante la demo; degradar a esfera básica si falla imagen y 2D si falla WebGL. Geometría ISS estilizada, tamaños/distancias exagerados. No simular un cinturón de asteroides en LEO ni alterar órbitas para añadir obstáculos. La alternativa mínima son fichas y modelos esquemáticos, sin nuevas dinámicas. Integrador debe revisar cambios de App y presentación en PR #13. Prioridad alta, complejidad media.

## Aceptación
Continentes reconocibles; Luna/ISS/satélite/basura visibles y seleccionables; fichas con fuentes y límites; teclado/Escape/foco; misión pausada durante lectura y sin reejecución; idioma conservado; usable sin WebGL/textura; sin desplazamiento a 1280×720 y 375×667; build y suite de regresión.

## Prompt de implementación
Extiende el MVP existente en su rama de integración. Usa activos locales con procedencia verificada, modelos modulares y un explorador accesible bilingüe. No importes motores en visualización ni inventes telemetría real. Inspeccionar debe pausar y no modificar configuración, comandos ni resultados. Mantén vistas a bordo, seguimiento y 2D. Añade pruebas de integración que ejerzan abrir/cambiar/cerrar, foco, idiomas, fallback y conservación del reloj. Ejecuta pruebas y build antes del commit.

## Fuentes y activos
- Tierra: NASA Blue Marble 2002, mosaico histórico. https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/
- Luna: https://science.nasa.gov/moon/facts/ y https://svs.gsfc.nasa.gov/4720/ (textura estética LROC).
- ISS: https://www.nasa.gov/reference/international-space-station/ (inclinación); https://www.nasa.gov/missions/station/iss-research/observing-our-planet-from-low-earth-orbit/ (400 km y 90 min aproximados).
- Basura: https://orbitaldebris.jsc.nasa.gov/faq/ . No se copian recuentos variables ni probabilidades para inventar encuentros.
- Créditos y descargas exactas: public/textures/CREDITS.md; JPEGs locales de 593729 y 457942 bytes.

## Validación en curso
Build local correcto. Un primer test falló por un nombre español esperado incorrecto en el test; se corrigió el selector, no la interfaz. El navegador integrado no logró abrir la pestaña en dos intentos aunque el servidor local devuelve HTTP 200. La comprobación visual y de dimensiones de este incremento no se considera aprobada por pruebas jsdom.

## Resultado automático
- npm test: 229/229 tests en 16 archivos. Nuevas pruebas: pausa/reanudación real sin reevaluar motor, cinco fichas sin WebGL, foco y Escape, retorno a cámara elegida y español; pérdida de contexto y excepción del renderer eliminan controles inoperantes.
- npm run build: correcto; se mantiene aviso del bundle Three.js grande y diferido. Sin dependencias nuevas.
- Historial: etiqueta backup/pre-space-environment-20261114 apunta a 072dc37; checkpoint eab1203 publicado antes del incremento.
- Limitaciones: posiciones estáticas de exhibición, ISS esquemática, escalas exageradas, Luna sin efemérides; no sistema jugable de choques. La carga fallida de textura conserva una esfera básica. No se han validado visualmente tamaños de pantalla en este turno por fallo del navegador integrado.
