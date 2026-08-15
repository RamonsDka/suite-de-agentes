# Design: Restructure Suite de Agentes TUI onto native host dialogs

## Technical Approach

Replace the custom OpenTUI/Solid screen layer with the native host-dialog flow, restructured screen-by-screen to the user's definitive diagram (Engram `sdd/restructure-agent-suite-tui-visual/target-diagram`). The retained foundation is the proven legacy dialog code already in `src/tui/index.tsx` (`openSuite`, `showCatalog`, `showCatalogDetails`, `showCatalogActions`, `showAgentModelSelector`, `createCustomAgent`) plus the thin promise wrappers in `src/tui/dialogs.tsx` (`selectValue`, `promptValue`, `confirmValue`, `showAlert`) — all of which render through the host's own `DialogSelect` / `DialogAlert` / `DialogConfirm` / `DialogPrompt`, the components whose keyboard, mouse, and Escape handling demonstrably work in the real terminal.

## Why native dialogs (decision record)

| Fact | Consequence |
|---|---|
| Custom screens clip, render an empty option, and ignore Enter/click/Escape in the real terminal (user screenshot, Engram `.../current-failure`) | The custom layer is not shippable in its current form |
| `testRender`/`createTestRenderer` require native OpenTUI FFI, unavailable in this Node runtime (direct probe, Engram `sdd/fix-agent-suite-tui-runtime-bugs/testrender-ffi-blocker`) | Custom-screen behavior cannot be verified here; every fix is a blind patch requiring a manual user test cycle |
| The user's diagram depicts the native dialog aesthetic (framed box, title, stacked options, scroll, SI/NO confirm) | Native dialogs match the target design more faithfully than the current custom render does |
| The legacy dialog flow still exists and has host-mock tests (`dialogHost()` covers `DialogSelect`/`DialogAlert`/`DialogConfirm`/`DialogPrompt`) | The restructure is testable with strict TDD in this environment |

## Architecture Decisions

| Decision | Alternatives | Choice | Rationale |
|---|---|---|---|
| Render base | Keep/debug custom OpenTUI screens | Native host dialogs | Only verifiable, working base (see decision record) |
| Custom screen files | Keep as dead fallback | Delete entirely (`screens/*.tsx`, `nav.ts`, `layout.ts`) | Dead code re-invites blind patches; deletion keeps one flow |
| Exit binding | Keep `Ctrl+Q` command | Remove with custom layer | Native dialogs close via host Escape; extra binding is redundant surface |
| Effort options | Re-derive | Reuse `core/effort.ts` `normalizeEffortOptions()` | Already yields the diagram's exact order `default, none, low, high, xhigh, max`, capability-filtered |
| Detail presentation | Single select with packed text | `DialogAlert` (fields) → `DialogSelect` (actions) | Matches diagram: info block, then Modificar/Eliminar/Volver |
| Operaciones field | Runtime description only | Custom prompt, else runtime description | Diagram shows the agent's own operations text |
| Operaciones cardinality | ERD 1:N `OPERACION` list + schema migration | Keep single prompt text | Mockup's Info screen shows one operations text; avoids `SuiteConfig` migration |
| Modificar scope | Model + effort only | Native submenu: `Modelo de IA`, `Nivel de esfuerzo`, plus `Skills`/`Operaciones` for custom agents | Informe §2.4 + recommendation 3 require editing everything; submenu fits native dialogs without new widgets |
| Crear chain order | Existing order (id→desc→model→prompt→skills) | Mockup order (Nombre→Descripción→Skills→Operaciones→Modelo→Esfuerzo) | Mockup's Crear screen is the user's visual contract |
| `Mas…` entry | Keep a manual "more" cell | Remove; native select scrolls | Informe's scrollbar expectation is satisfied by the host |
| Delete success target | Return to Info | Return to Catálogo | `flujo_suite_agentes.mermaid`: `Eliminado --> Catalogo` |
| Version | Keep 0.1.0 | Bump to 1.0.1 (`version.ts` + `package.json`) | Diagram shows `v1.0.1`; user wants visible version control |
| Divider lines / oversized frame | Custom widgets | Accept host chrome | Host owns dialog rendering; structural fidelity over pixel fidelity |

## Flow Map (diagram + flujo.mermaid + mockup → implementation)

```
Alt+S / /agent-suite
  └─ DialogSelect "Suite de Agentes · v1.0.1"          [PRIMERA PANTALLA]
       ├─ Catálogo
       │    └─ DialogSelect "Catálogo de agentes"       [AGENTES, scroll nativo;
       │         │                                       sin entrada "Mas…"]
       │         └─ (select agent)
       │              ├─ DialogAlert "Info del agente"  [INFO DEL AGENTE]
       │              │    Nombre / Descripción / Modelo / Esfuerzo /
       │              │    Skills / Operaciones / Estado
       │              └─ DialogSelect acciones
       │                   ├─ Modificar
       │                   │    └─ DialogSelect "Modificar agente"
       │                   │         ├─ Modelo de IA → picker de modelos
       │                   │         ├─ Nivel de esfuerzo → default, none,
       │                   │         │   low, high, xhigh, max (si lo permite)
       │                   │         ├─ Skills (solo custom) → multi-select loop
       │                   │         └─ Operaciones (solo custom) → prompt
       │                   ├─ Eliminar (solo custom)
       │                   │    └─ DialogConfirm "Advertencia —
       │                   │       ¿Desea eliminar el agente?" (Sí/No)
       │                   │       Sí → persiste y vuelve al Catálogo
       │                   │       No → vuelve a Info sin mutar
       │                   └─ Volver → Catálogo
       └─ Crear agente → cadena nativa (orden del mockup)
            Nombre(ID) → Descripción → Skills → Operaciones(instrucciones)
            → Modelo de IA → Nivel de esfuerzo (si lo permite)
            → confirmar guardado → materialización opcional
```

Back navigation: each async step returns `undefined` when the host closes its dialog; callers return without mutation, matching the existing legacy semantics. `Volver` re-invokes the previous dialog explicitly.

## Code Changes

**Delete** — `src/tui/screens/` (landing, catalog, detail, modify, create, nav), `src/tui/layout.ts`, `deferScreenAction`, `resolveScreenBox`, `AGENT_SUITE_EXIT_COMMAND`/`AGENT_SUITE_EXIT_KEY`, the `safeScreenMount` export and every custom-mount branch in `index.tsx`; `test/screens.test.tsx`, `test/catalog.test.ts`, `test/layout.test.ts`.

**Keep** — `src/core/**` (including `effort.ts`, `suites.ts`, config, agents, types), `src/server/**`, `src/tui/dialogs.tsx`, `src/tui/host-compat.ts` (minus the `safeScreenMount` re-export; the sidebar `safeSlotRender` path and its one-shot diagnostic stay), effort/tui-registration test foundations.

**Rewrite** — `src/tui/index.tsx`:
- `openSuite` becomes the only entry; Alt+S and `/agent-suite` call it directly; remove `openSuiteSafely` and all custom-mount fallback branches.
- First screen: `selectValue` with title `suiteTitle()` (= `Suite de Agentes · v1.0.1`) and the two root options.
- `showCatalog`: native select titled `Catálogo de agentes` of all rows; per-option description = `Estado · Modelo · Esfuerzo`; empty catalog → alert pointing to `Crear agente`; no `Mas…` entry (native scroll).
- `showCatalogDetails` → native alert with the diagram's field order, then action select (`Modificar`, `Eliminar` custom-only, `Volver`).
- `Modificar` → new native submenu: `Modelo de IA`, `Nivel de esfuerzo` (all agents) + `Skills`, `Operaciones (instrucciones)` (custom only). Model path: picker titled `seleccionar el modelo de IA` with current marked, then effort picker titled `seleccionar el nivel de esfuerzo` when the model exposes variants (otherwise default). Direct effort path: picker over the current model's variants (`default` only when unsupported). Skills path: existing native skills multi-select loop persisting to the custom record. Operaciones path: existing native instructions prompt persisting to the custom record. Seed agents never expose Skills/Operaciones.
- `showCatalogActions` delete branch → `DialogConfirm` titled `Advertencia` with message `¿Desea eliminar el agente?`; Sí removes + persists + reopens Catálogo; No returns to Info without mutation.
- `createCustomAgent` chain reordered to the mockup: Nombre (ID) → Descripción → Skills (multi-select loop) → Operaciones (instrucciones) → Modelo → Nivel de esfuerzo (si lo permite) → confirmación → materialización opcional.
- `catalogDetailMessage` rebuilt to the field order Nombre, Descripción, Modelo, Esfuerzo, Skills, Operaciones, Estado.
- `registerSuiteKeymap` back to its 2-argument form (open only).

**Version** — `src/version.ts` → `1.0.1`; `package.json` version → `1.0.1`.

**Tests** — strict TDD against `dialogHost()`: first-screen title/options/order, version label, catalog option composition + empty-catalog alert + no `Mas…` entry, info field order, action gating by membership, Modificar submenu gating (seed: model/effort only; custom: all four), model/effort flow (variants present/absent, cancel-no-persist), skills/operaciones editing persisting for custom agents, create chain field order with conditional effort step, delete Sí→catalog / No→info semantics, registration (Alt+S + slash, no exit command, no custom imports). Delete the three custom-screen test files.

## Test Strategy (Strict TDD)

All coverage uses the existing `dialogHost()` host mock — no OpenTUI renderer, no FFI, fully deterministic in this environment:
1. RED: failing assertions per requirement above (suite rewrites `test/tui-registration.test.ts` and related dialog-flow tests).
2. GREEN: minimal restructure of the retained dialog functions.
3. REFACTOR: dedupe option builders; keep pure builders (`buildCatalogOptions`, `buildCatalogActionOptions`, `buildAgentModelOptions`, `buildAgentVariantOptions`, `catalogDetailMessage`) exported for direct unit tests.
4. `npm test` + `npm run typecheck` after each work unit; `npm run build` only on explicit user authorization, then a manual real-terminal smoke test.

## Risks / Assumptions

- Host dialog chrome (size, dividers) is outside plugin control — accepted per proposal; smoke test should confirm the dialog looks "super amplio" enough in practice.
- `DialogSelect` option `description` is single-line; the info layout therefore uses `DialogAlert` for the multi-line field block — matches the diagram's separate INFO DEL AGENTE screen.
- Removing the custom layer also removes the custom screens' bugs by construction; any residual input issue after the smoke test would be a host-level bug outside this plugin's control, to be reported upstream rather than patched here.
