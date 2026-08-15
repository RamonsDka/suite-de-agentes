# Proposal: Suite de Agentes gráfica sobre ruta full-screen

## Intent

El usuario quiere la TUI del `mockup_tui_suite_agentes.html`: barra de título, cuerpo enmarcado, ítems de menú con selector `►`, divisores punteados, chips de skills, botones `[ MODIFICAR ]` / `[ ELIMINAR ]`, modal de advertencia y barra de teclas inferior. Los diálogos nativos entregan el flujo pero no ese aspecto. El intento anterior de pantallas custom falló, y ahora tenemos las dos causas reales confirmadas — no hipótesis:

1. **Superficie de montaje equivocada.** Las pantallas se montaban con `api.ui.dialog.replace` + `api.ui.Dialog({size})`, una caja pequeña superpuesta a la UI del host, mientras cada pantalla calculaba su layout con `useTerminalDimensions()` = tamaño de la terminal completa. Contenido dimensionado para toda la terminal dentro de una caja pequeña ⇒ se desborda y se corta, y la UI del host alrededor se percibe como "sombra de otra ventana". `api.route.register` — descartado explícitamente en el diseño original — da una vista full-screen donde `useTerminalDimensions()` es la medida correcta y esa clase de bug desaparece por construcción.
2. **Texto invisible por token de color mal pareado.** `landing.tsx` pintaba la etiqueta enfocada con `theme.selectedListItemText` sobre `theme.backgroundPanel`. Ese color está pensado para una barra de selección clara; sobre panel oscuro es ilegible. Por eso "Catálogo" aparecía vacío y "Crear agente" no.

## Clarifications

- Fuentes autoritativas: el diagrama del usuario, `ERD_suite_agentes.mermaid`, `flujo_suite_agentes.mermaid`, `informe_suite_agentes.md` y `mockup_tui_suite_agentes.html` (7 pantallas).
- **El flujo nativo actual no se borra.** Queda como camino de respaldo funcional mientras la ruta gráfica no esté probada en terminal real.
- **No puedo verificar el renderer aquí** (`testRender` requiere FFI nativo de OpenTUI, no disponible). Por eso la entrega es incremental con validación humana entre etapas, en vez de construir 7 pantallas a ciegas otra vez.
- El mockup es HTML/CSS; en terminal se traduce a primitivas OpenTUI (`box` con `border`, `title`, colores de tema, `text`). Bordes dobles, sombras y `border-radius` no son replicables literalmente: se traducen al equivalente de terminal más cercano.

## Scope

### In Scope — Etapa 1 (spike, esta unidad de trabajo)

- Registrar una ruta full-screen (`api.route.register`) y navegar a ella desde el comando Alt+S existente.
- **Solo la pantalla principal** del mockup: barra de título `SUITE DE AGENTES — v1.0.1`, ítems `CATALOGO` y `CREAR AGENTE` apilados con selector `►` en el enfocado, divisor entre ellos, y barra inferior de teclas (`↑↓ navega · Enter selecciona · Esc salir`).
- Colores exclusivamente por tokens de tema, con la regla: **nunca** un token `selected*` de primer plano sobre un fondo no seleccionado.
- Selección con Enter que abre el flujo correspondiente, y salida con Escape.
- Respaldo: si el registro o la navegación de la ruta falla, Alt+S abre el flujo nativo actual sin romperse.
- Tests deterministas del contrato de ruta y de las opciones/etiquetas, sin renderer.

### In Scope — Etapas siguientes (tras validación humana de la etapa 1)

- Pantallas 2–7 del mockup: Catálogo con scroll, Info del agente con chips y botones, Modelo de IA, Nivel de esfuerzo, Advertencia y Crear agente.

### Out of Scope

- Bordes dobles, sombras proyectadas y otros efectos CSS no representables en terminal.
- Cambios en `src/core/**`, `src/server/**`, esquema de `SuiteConfig`, consentimiento o materialización.
- Borrar el flujo nativo actual mientras la ruta no esté validada por el usuario.

## Capabilities

### Modified Capabilities

- `agent-suite-screens`: se añade una superficie de presentación en ruta full-screen; el flujo nativo permanece como respaldo.

## Approach

1. Registrar la ruta y navegar desde el comando existente, conservando el respaldo nativo.
2. Implementar la pantalla principal conforme al mockup con tokens de tema seguros.
3. Entregar al usuario para prueba en terminal real: ¿ocupa toda la pantalla?, ¿sin recorte ni ventana fantasma?, ¿flechas?, ¿Enter?, ¿Escape?
4. Solo con esa confirmación, construir las seis pantallas restantes.

## Review Workload Forecast

Etapa 1: ~200–300 líneas. Riesgo de presupuesto 800: bajo. PR único. Etapas siguientes se reevalúan tras la validación.
