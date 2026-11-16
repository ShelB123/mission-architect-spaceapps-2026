# Registro de versiones

## 0.2.1-web.1 — candidata actual: navegador

Decisión del equipo: continuar la orientación web anterior. Base main 9232027, mismo árbol de juego que cockpit 627e4ca. Se conserva el flujo, interfaz, 3D, cámaras, texturas, escenarios y decisiones. Se integran la ampliación orbital opcional 1dde820 y la publicación Cloudflare 08d2631. La rama actual no incluye host, empaquetado, dependencias ni CI de Electron. El resultado de npm run build se publica como sitio estático. Los modelos quedan preparados para que su responsable los afine en una rama propia.

Rama: integration/web-rc-20261115. Ver docs/WEB_CANDIDATE.md.

## 0.2.0-rc.1 — distribución Windows histórica

Commit 8fcdbcb; integration/windows-rc-20261115. Añadió un envoltorio Electron y ZIP portable del mismo juego. Se conserva como referencia, junto con la Release y el PR histórico; ya no es la línea de entrega prioritaria. No se reescribió el juego para escritorio.

## Mejoras de juego anteriores, conservadas

- 627e4ca: recuperación de cargas/contextos 3D y altura del visor.
- c8fab89: Riverwatch, comparación calculada de decisiones y diagnóstico.
- 308dd38: Tierra/Luna NASA y explorador espacial.
- 072dc37: decisiones operativas y cámaras de vuelo; interfaz de juego sin página larga.
- 65416de: español/inglés.
- Los subsistemas anteriores de ingeniería, eventos, puntuación, QA y modelos están integrados en main y se conservan.
