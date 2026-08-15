# Design: Suite de Agentes gráfica sobre ruta full-screen

## Decisión arquitectónica central

| Decisión | Alternativa | Elección | Evidencia |
|---|---|---|---|
| Superficie de montaje | `api.ui.dialog.replace` + `api.ui.Dialog({size})` | **`api.route.register` + `api.route.navigate`** | `tui.d.ts:25-30, 472-476`. El diálogo es una caja `medium/large/xlarge` superpuesta; las pantallas dimensionaban con `useTerminalDimensions()` (terminal completa) ⇒ desbordes y "ventana fantasma". En ruta full-screen esa medida es la correcta |
| Color de ítem enfocado | `fg={selectedListItemText}` sobre `backgroundPanel` | **`fg={theme.text}` siempre; el foco se expresa con `►`, `borderActive` y, si se resalta, cambiando también `backgroundColor` a la de selección** | `git show HEAD:src/tui/screens/landing.tsx` — el pareado actual vuelve el texto ilegible |
| Estrategia de entrega | 7 pantallas de una vez | **Spike de 1 pantalla, validación humana, luego el resto** | El renderer no es verificable aquí (`testRender` requiere FFI nativo). Construir todo a ciegas ya falló dos veces |
| Flujo nativo actual | Borrarlo | **Conservarlo como respaldo** | Es la única versión que el usuario confirmó funcionando; no debe perderla si la ruta falla |

## Traducción del mockup a primitivas de terminal

| Mockup (CSS) | Terminal (OpenTUI) |
|---|---|
| `.titlebar` (fondo gris, texto centrado) | `box` con `title` y `borderColor`, o `box` con `backgroundColor` de tema + `text` centrado |
| `.win` (borde doble, sombra) | `box border` con `borderColor`; sombra y borde doble **no** se replican |
| `.menuitem` + `.arrow ►` | `box`/`text` por ítem, prefijo `►` en el enfocado y espacio en los demás |
| `.divider` (punteada) | `text` con una fila de `─` o `·` usando `theme.border` |
| `.tag` (chip verde) | `text` con `[ nombre ]` y color de acento del tema |
| `.btn` / `.btn.danger` | `text` con `[ MODIFICAR ]` / `[ ELIMINAR ]`, acento y color de error del tema |
| `.keybar` (barra inferior fija) | último `box` de la columna raíz con las teclas |

Regla de color: todo sale de `api.theme.current`; nada hardcodeado. Ningún token `selected*` de primer plano sin su fondo correspondiente.

## Estructura de la etapa 1

```
tui(api)
 ├─ api.route.register([{ name: "agent-suite", render: () => <SuiteRoute .../> }])
 ├─ registerSuiteKeymap(api, abrir)      // Alt+S
 └─ abrir():
      intenta api.route.navigate("agent-suite")
      si falla  -> openSuite(api)        // flujo nativo actual, intacto
```

`SuiteRoute` (pantalla principal):

```
box columna, ocupa la terminal (useTerminalDimensions() aquí SÍ es la medida correcta)
 ├─ barra de título:  SUITE DE AGENTES — v1.0.1
 ├─ cuerpo enmarcado:
 │    ► CATALOGO
 │    ────────────────
 │      CREAR AGENTE
 └─ barra de teclas:  ↑↓ navega · Enter selecciona · Esc salir
```

Teclado con `useKeyboard`: `up`/`down` mueven el foco, `return`/`linefeed` selecciona, `escape` sale. `preventDefault()` en **todas** las ramas manejadas, sin excepción (la falta de paridad fue un defecto real detectado en revisión).

Al seleccionar: `CATALOGO` y `CREAR AGENTE` invocan por ahora el flujo nativo existente (`showCatalog` / `createCustomAgent`), de modo que la etapa 1 prueba **solo la superficie**, sin reescribir lógica de negocio.

## Estrategia de test

Sin renderer disponible, se prueba lo determinista:
- El plugin registra la ruta con el nombre esperado y una función `render`.
- El comando Alt+S intenta navegar y cae al flujo nativo cuando `navigate` lanza.
- Constructores puros de las etiquetas/ítems de la pantalla principal y del prefijo `►` según el índice enfocado.
- Regla de color: aserción de que la etiqueta enfocada no usa un token `selected*` sin fondo de selección.

Lo que **no** se puede probar aquí y requiere validación humana: que la ruta ocupe la pantalla, que no haya recorte ni ventana fantasma, y que Enter/Escape/flechas lleguen realmente al componente.

## Riesgos

- Si el host no entrega eventos de teclado a una vista de ruta de plugin, el spike lo revelará en una sola pantalla en lugar de en siete.
- Si `api.route.navigate` no acepta rutas de plugin, el respaldo nativo mantiene el plugin usable y se reporta como limitación del host.
- El flujo nativo actual debería commitearse antes de experimentar, para no perder la única versión confirmada como funcional.
