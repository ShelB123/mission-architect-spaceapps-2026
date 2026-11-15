# Respuesta a inundaciones y decisiones comprensibles

## Diseño previo
Objetivo: dar propósito a la misión inicial y hacer visibles las consecuencias de decidir. Presentación contextual sobre el escenario survey existente; no añadir un motor de inundaciones ni cambiar condiciones de éxito o contratos. Nuevo botón de entrenamiento inicia el diseño de reparación de survey, con cámara exigente y potencia limitada; mantiene alternativas de ingeniería y órdenes durante vuelo. El inicio normal sigue disponible.

Arquitectura: módulo UI de contexto/diagnóstico y comparación de órdenes. Entradas: snapshot de misión, seed, escenario, frames y registro de comandos; salidas: dos estados a +300 s (o final si llega antes). Ambas alternativas se calculan con replayMission existente, conservando órdenes pasadas. Solo al pulsar una opción se registra una orden real. Comparación indica que se mantiene esa elección durante el intervalo y no tiene órdenes posteriores.

Archivos: App.tsx, DecisionCard.tsx; nuevos decisionPreview.ts, MissionPurpose.tsx y CSS, missionDiagnosis.ts; diccionario español y tests. Ninguna dependencia nueva. Complejidad media, prioridad P1. Alternativa sencilla elegida: contexto ficticio y cinco minutos calculados; sin mapas reales de cobertura, procesamiento de imágenes ni predicción de desastre.

Riesgos: presentar MB como utilidad científica validada; mitigación: objetivo de entrega sintético, contexto NASA citado como inspiración solamente. Evitar simulaciones por cada frame: solo comparar bajo demanda. Respetar pausas, idioma, interfaz sin scroll y fallback sin WebGL. App/CSS se proponen en PR de integración, sin merge a main.

Aceptación: reto accesible ES/EN, al menos dos diseños/estrategias válidos verificados, fracaso explicable, comparación reproduce las ramas exactas del motor sin alterar partida ni órdenes previas, diagnóstico no atribuye causas no calculadas, teclado y Brave. Build y suite. Prueba de diversión con personas nuevas pendiente: observar si pueden explicar y corregir una decisión sin ayuda.

Prompt de implementación: amplía el MVP en la rama actual con una misión ficticia de observación de inundaciones. Añade comparación opcional de cámara encendida/apagada para cinco minutos usando el motor existente. No cambies física, scoring, contratos o catálogo. Conserva seed y comandos pasados, indica condiciones de comparación y no ejecutes nada al solo mirar. Añade diagnóstico breve basado en los frames/resultados y un acceso a fuentes y límites. Verifica las ramas en todos los escenarios, la regresión UI y una partida en Brave. Guarda commits aditivos.

Fuente conceptual: https://science.nasa.gov/mission/landsat/benefits/disaster-management/ . Las observaciones Landsat apoyan análisis y respuesta a desastres; este juego no reproduce Landsat ni sus instrumentos o resolución.

## Entrega verificada
- 238 tests correctos en 18 archivos; build correcto. Aviso existente del chunk Three.js de ~951 KB, cargado de forma diferida.
- Dos arreglos de hardware (cámara básica o panel avanzado) y una estrategia operativa (cámara apagada en eclipses) superan el ejercicio con seed 2026; diseño original falla por energía.
- Comparación de ambas órdenes verificada contra replayMission en los cuatro escenarios, sin mutar inputs ni estados pasados. Límite: muestra el último frame calculado hasta +300 s, y anuncia el intervalo real (p. ej., 4,2 min), sin interpolación de recursos. Las dos alternativas mantienen su orden y omiten órdenes futuras. No es una predicción de los siguientes botones que elegirá el jugador.
- Pruebas UI: fuente NASA, modal ES/EN, teclado/Escape/foco, apertura de diseño exigente real, reloj detenido al comparar, registro real intacto y diagnóstico de fallo.
- Ficha de componente equipado corregida: valores absolutos al inspeccionar instalado; diferencias antes/después del cambio.
- Brave local verificado a 1910×992: inicio de Río Seguro, diseño, revisión, vuelo, primer eclipse y comparación. Captura riverwatch-brave.jpg. Sin scroll de documento en escritorio. Comprobación móvil interrumpida por conexión del navegador: pendiente; nueva pestaña final conserva tamaño normal 1910×992 y briefing abierto para el usuario. Preferencia: abrir siempre en Brave, no en el navegador integrado.
- Respaldo: backup/pre-flood-response-20261115 → 308dd38, checkpoint 964d892 antes de implementar. Cambios aditivos, sin modificar main.
- Limitaciones: contexto ficticio, sin cartografía real de inundación, cobertura, nubes ni calidad científica; fase orbital y catálogo siguen idealizados. La prueba de aprendizaje/diversión con personas nuevas no se ha realizado. Integrador debe revisar archivos UI compartidos en PR #13.
