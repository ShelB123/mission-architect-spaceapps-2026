# QA de la candidata Windows 0.2.0-rc.1

## Estado y alcance
Candidata de entrega para pruebas del equipo, no certificación de compatibilidad con todos los equipos. Base 9232027 (idéntica a 627e4ca) + ampliación orbital 1dde820 integrada en 10583ce. Rama integration/windows-rc-20261115. Los archivos de la release incluyen BUILD-INFO.json con el commit exacto del paquete.

## Verificaciones realizadas

| Comprobación | Resultado |
|---|---|
| npm test -- --maxWorkers=2 | 277 pruebas, 20 archivos, aprobadas |
| npm run build | Aprobada; aviso conocido del chunk gráfico de ~951 kB |
| npm audit | 0 vulnerabilidades en dependencias bloqueadas al preparar RC |
| Integración orbital | Sin conflictos; 54 pruebas orbitales y regresiones de escenarios aprobadas |
| Protocolos/rutas de escritorio | 11 pruebas: entrada, módulos, texturas, límites de ruta y HTTPS externo |
| Paquete ZIP de prueba | Verificado PE x64, runtime, entrypoint Electron, 12 recursos y hashes dentro de ASAR |
| Ejecución nativa Windows | Se inició Mission Architect.exe; ventana registrada con título Mission Architect / Diseña tu misión |
| Verificación visual de cámaras/escenas/resultado dentro del exe | PENDIENTE: autorización del control del PC denegada para esta aplicación |
| Windows sin Node instalado / VM limpia | PENDIENTE: runtime incluido y sin servidor, pero no disponible VM limpia |
| Equipo de ejecución | Windows 10 x64 10.0.19045, Core i7-6500U, 8 GiB; GPU no consultable por WMI |

La validación visual anterior en Brave sí cubrió inspección, seguir satélite, cámara a bordo, ISS y Luna; no sustituye el recorrido dentro del ejecutable. Durante esta sesión el control de Windows falló primero al capturar la ventana y después rechazó su acceso con “Computer Use was not approved to use mission architect”. No se evadió ese permiso. Las pruebas UI automatizadas usan escenas controladas en jsdom; tampoco son un benchmark de renderizado WebGL nativo.

El primer comprobador de ASAR usó separadores / que su API Windows no resolvió; la inspección del inventario confirmó archivos presentes. Se corrigió con path.join/path.normalize y la misma candidata pasó verificación.

## Recorrido manual que debe completar el equipo

1. Extraer TODO el ZIP a una ruta con espacios, abrir Mission Architect.exe y comprobar idioma y ventana. No necesita servidor ni entorno de desarrollo.
2. En Diseño, ver satélite, girar/acercar, cambiar cámara/panel/batería/radio y activar esquema. Confirmar que cifras y piezas coinciden.
3. Revisar y lanzar; observar Tierra texturizada en Seguir satélite y Cámara a bordo; probar Órbita 2D y volver.
4. Explorar Tierra, ISS y Luna. Cerrar; comprobar pausa y reanudar.
5. Ante eclipse, comparar órdenes y apagar cámara; verificar menor consumo y adquisición detenida, radio automática.
6. Completar misión, revisar diagnóstico y reintentar con igual semilla. Probar cuatro escenarios y un diseño inválido.
7. Si falla 3D, usar Reintentar 3D; seguir jugando en 2D. Reportar la GPU y controladores, no cambiar opciones de seguridad del PC.

Para registrar prueba, adjuntar versión/commit de BUILD-INFO.json, Windows, escenario, semilla, componentes, pasos y captura. No se han medido FPS, RAM máxima o requisitos mínimos; no prometerlos.

## Reproducibilidad y distribución

Electron 45.3.2, @electron/packager 20.3.0 y fflate 0.8.3 fijados en package-lock.json. npm ci instala esas versiones, npm run package:win compila el frontend y crea un directorio nuevo por commit (o intento de trabajo), ZIP y checksum. El paquete incluye Chromium, runtime, DLL, locales, ASAR, créditos NASA, licencias de bibliotecas y BUILD-INFO. Solo contiene el bundle de producción y host desktop; excluye código de desarrollo y node_modules. El ZIP se publica como asset de Release; binarios ignorados por Git.

Verificación: npm run verify:package -- release/Mission-Architect-0.2.0-rc.1-Windows-x64.zip. Compara el checksum externo, revisa PE x64 y comprueba todos los recursos dist contra su inventario SHA256. No certifica firma ni garantiza funcionamiento gráfico en otros equipos. El ejecutable no está firmado; no hay autoactualización. Se conserva todo el directorio portable.

## Arquitectura Windows/web

El mismo dist se sirve en app://mission mediante un protocolo estándar, seguro y restringido al directorio empaquetado. Mantiene rutas absolutas de assets/textures y carga diferida de escenas. No usa localhost, un backend ni CDN para jugar. Renderer sin Node, sandbox y contextIsolation activos, permisos denegados; fuentes externas HTTPS se abren fuera del juego. No se modifica la física ni la configuración desde el host.

La versión web sigue compilando con npm run build y se aloja como archivos HTML/JS/CSS e imágenes estáticas (WebGL 2 para 3D). No requiere exportación a WebAssembly. La única dependencia específica de plataforma está en desktop/ y scripts/; src/ no importa Electron. Para hosting bajo una subruta configurar --base y comprobar assets; para Electron usar la base / predeterminada. El visor tiene fallback 2D, y el idioma usa localStorage separado por plataforma. El estado de partidas no se guarda entre cierres.

## Límites de la candidata

Sin firma digital, instalador, autoactualización, pruebas Windows 11/ARM, acceso remoto o multijugador. Los objetos espaciales son referencias ilustrativas, no seguimiento ni obstáculos con colisiones. Escenarios/eventos y hardware sintéticos. Los modelos físicos, ópticos y de comunicaciones siguen idealizados. La ampliación beta es una API opt-in y no una nueva capacidad operativa del jugador. Probar con jugadores reales antes de afirmar que mejora aprendizaje o diversión.

## Instalación limpia
Se ejecutó npm ci con npm 12.2.2 y Node 22.23.5 en Windows, sin errores y con auditoría de cero vulnerabilidades. npm 12 bloquea scripts de instalación sin aprobación: package.json limita allowScripts a esbuild@0.28.2, necesario para las herramientas de build. Electron 45 descarga su runtime de desarrollo al primer uso del CLI; el empaquetador incluye su runtime por separado y el jugador no descarga dependencias.
