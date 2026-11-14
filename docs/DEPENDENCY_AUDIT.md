# Dependencias e integración del visor (14-11-2026)

## Versiones comprobadas

| Paquete | Versión fijada |
|---|---|
| react / react-dom | 19.3.1 / 19.3.1 |
| three | 0.187.0 |
| @react-three/fiber | 9.8.2 |
| @types/three (desarrollo) | 0.187.0 |
| vitest (desarrollo) | 4.1.12 |
| npm | 12.2.2 |

Fiber declara peers react/react-dom >=19 <19.4 y three >=0.156. npm ls confirma una única versión de React/React DOM y sin conflictos de peers. [Compatibilidad oficial de Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction). La compatibilidad de paquetes no sustituye la aceptación WebGL del visor de Fable.

Node de CI/.nvmrc: 22.23.4. Verificación local: Node 24.22.1. El rango engines refleja los requisitos de jsdom 31.0.1 y npm 12: ^22.22.2 || ^24.15.0 || >=26.0.0. No basta cualquier Node 22 antiguo.

## Instalar y verificar

Con la versión Node de .nvmrc:
```sh
npm install --global npm@12.2.2
npm ci
npm run build
npm test
npm run audit
npm ls react react-dom three @react-three/fiber @types/three
```

package-lock.json se generó con npm, nunca a mano. npm ci desde una instalación limpia completó correctamente y no alteró el SHA-256 del lockfile. CI fija Node/npm, usa npm ci y ejecuta build, tests y audit. Incluye PRs con destino feature/** para validar PRs apilados.

npm 10.9.9 falló al resolver conjuntamente el nuevo grafo con un error interno de Arborist (edgesOut). npm 12.2.2 lo resolvió sin --force ni --legacy-peer-deps. npm 12 bloqueó por defecto el postinstall de esbuild; la compilación funcionó usando el binario opcional instalado. No se habilitaron scripts globalmente.

## Auditoría antes y después

| Medición | Resultado |
|---|---|
| Antes: npm audit, Vitest 3.2.7 | 3 paquetes afectados: 2 críticos, 1 moderado |
| Dependencias afectadas | vitest, @vitest/mocker, tinypool (herramientas de desarrollo) |
| Corrección | Vitest 4.1.12; sin override forzado de dependencias internas |
| Después: npm audit --json | 0 vulnerabilidades reportadas |
| Compilación y pruebas sobre rama de dependencias | Correctas, 99 pruebas (base P0; escenarios están en PR separado) |

El informe inicial enumera [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8), [GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) y [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr). Los conteos son de paquetes afectados, no un conteo de exploits independientes. No se ha demostrado explotación en esta aplicación. Cero hallazgos refleja la auditoría en esta fecha, no una garantía futura.

## Acuerdo que debe utilizar el responsable 3D

Usar exactamente las versiones anteriores y el lockfile del integrador. Mantener las modificaciones de Fable en src/visualization/** y sus pruebas. No copiar un package.json/lockfile alternativo, añadir Drei automáticamente ni migrar React de versión. Si Fable necesita otra dependencia, indicar paquete, versión, uso concreto y peers antes de modificar el conjunto compartido.

No se ha recibido una confirmación del responsable 3D en esta sesión: este documento y el PR son la propuesta concreta verificable para coordinarla. No hay renderer implementado por el integrador.
