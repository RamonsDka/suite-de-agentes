# Proposal: Agent Suite Floating Graphical App — Phase 1

## Artifact Status — pre-implementation plan

This proposal, its specs, and its design describe the **target state to be built**. They are a plan, not a description of the current runtime. At the time of writing, `src/tui/index.tsx` still registers `api.route` and still opens native dialogs mid-flow — that is the **starting point this change removes**, not a defect of these artifacts and not a finding against them. Verification runs only against the implemented result: implementation tasks MUST delete the route files, exports, and tests and create every new file before any verification pass is executed. Reviewing these artifacts against today's runtime is out of scope.

## Intent

Deliver the user's graphical Suite de Agentes as a **single floating custom TUI** matching the supplied mockup, preserving the host screen underneath. Phase 1 is **not a spike**: it implements **all seven screens** of the flow inside one persistent custom dialog. Partial delivery is explicitly rejected — a half-graphical Suite that hands mid-flow control to native dialogs is the exact defect this change removes.

Two prior architectural extremes were proven wrong:

- a custom child laid out with full-terminal dimensions inside a host Dialog clips and appears displaced;
- a plugin route receives reliable input but replaces the whole OpenCode screen and loses the caller's original location.

The correct boundary is one host `Dialog(size="large")` containing one custom `AgentSuiteApp` whose internal state machine renders every screen without clearing/replacing the dialog and without touching `api.route`.

## Authoritative Inputs

- User screenshots and annotated flow diagrams supplied in the session.
- `C:\Users\DELL\Downloads\mockup_tui_suite_agentes.html`.
- `ERD_suite_agentes.mermaid`, `flujo_suite_agentes.mermaid`, `informe_suite_agentes.md`.
- Reference plugin `j0k3r-dev-rgl/sdd-engram-plugin` (MIT): behavioral reference for `api.ui.dialog.replace`, `api.lifecycle.onDispose` disposer registration, and guarded host actions. Its native `DialogSelect` presentation is **not** adopted. Its registration patterns are adopted only where this repository's installed types actually return a disposer (see Host API Evidence).

## Host API Evidence

`api.ui.Dialog` and `size: "large"` are real, typed host surfaces — not fabricated. Verified in this repository at
`node_modules/@opencode-ai/plugin/dist/tui.d.ts`:

- lines 74–85 — `TuiDialogProps = { size?: "medium" | "large" | "xlarge"; onClose: () => void; children?: JSX.Element }` and `TuiDialogStack = { replace; clear; setSize; size; depth; open }`;
- lines 477–486 — `ui: { Dialog: (props: TuiDialogProps) => JSX.Element; ...; dialog: TuiDialogStack }`.

`theme: TuiTheme` with `readonly current: TuiThemeCurrent` is verified at lines 273–274 and 491.

### Registration return types — verified, not assumed

| Registration | Verified signature | Source | Disposable |
|---|---|---|---|
| Keymap layer | `registerLayer(layer): () => void` | `node_modules/@opentui/keymap/src/keymap.d.ts` line 32 (`TuiKeymap = Keymap<Renderable, KeyEvent>`, `tui.d.ts` 35/470) | **Yes** — real disposer |
| Slash command | `register: (cb: () => TuiCommand[]) => () => void` | `tui.d.ts` line 68 (`TuiCommandApi`) | **Yes** — real disposer |
| Sidebar slot | `register: { (plugin: TuiSlotPlugin): string; ... }` | `tui.d.ts` lines 401–405 (`TuiSlots`) | **No** — returns an ID `string` |

`api.slots.register` returns a slot **ID string**, and `TuiSlots` exposes no `unregister`, `remove`, or `dispose` member. The slot is therefore **host-managed**: the plugin cannot tear it down and MUST NOT claim to. Any statement that a slot disposer is registered with `api.lifecycle.onDispose` would be unimplementable against these types.

`api.lifecycle.onDispose(fn): () => void` (`tui.d.ts` 413–416) is used **only** for the two registrations that actually return a disposer.

## Confirmed Root Causes

1. **Clipping/ghost panel:** prior custom screens called `useTerminalDimensions()` inside a smaller host Dialog, then rendered at full-terminal width/height.
2. **Invisible focused text:** `selectedListItemText` rendered over `backgroundPanel` without the paired selected background.
3. **Dead Enter/Escape:** handlers synchronously cleared/replaced the dialog from inside `useKeyboard`, creating event-cycle reentrancy.
4. **Dead/incorrect mouse actions:** callbacks set a focus signal and immediately read its stale value.
5. **Full-screen escape regression:** the route spike navigated to `home`, not the caller's prior OpenCode screen.
6. **Mixed design:** the graphical landing launched old native dialogs for Catalog/Create.

## Phase 1 Scope

### In Scope — all seven screens, one dialog

- **Principal** — `CATALOGO`, `CREAR AGENTE`, `►` focus marker, version `v1.0.1`.
- **Catálogo** — real agent rows, focus, pagination, model/effort summary.
- **Info del agente** — detail panel with skills/operations/model/effort and its action keys, including its **Modificar** sub-panel.
- **Modelo IA** — model and variant selection.
- **Nivel de esfuerzo** — effort selection from normalized runtime variants.
- **Advertencia de eliminación** — destructive confirmation panel.
- **Crear agente** — multi-step custom creation form.

**Modificar is a sub-state of Info del agente, not an eighth product screen.** The product remains seven principal screens. `F5` / `OPEN_MODIFY` from Info del agente opens one unambiguous `MODIFICAR AGENTE` panel offering: *Modelo de IA*, *Nivel de esfuerzo*, *Skills*, *Operaciones*, *Volver*. Seed agents expose only *Modelo de IA*, *Nivel de esfuerzo*, *Volver*; custom agents expose all four editable options. *Modelo de IA* and *Nivel de esfuerzo* push the existing Modelo IA / Nivel de esfuerzo screens; *Skills* and *Operaciones* edit inline inside the same panel; *Volver* returns to Info del agente.

The shell (frame, titlebar slot, body, keybar) is **shared**; the titlebar **text changes per screen**, exactly as in the mockup:

| Screen | Titlebar text | Shows version |
|---|---|---|
| Principal | `SUITE DE AGENTES — v1.0.1` | Yes |
| Catálogo | `CATALOGO DE AGENTES` | No |
| Info del agente | `INFO DEL AGENTE` | No |
| Modificar (sub-panel de Info del agente) | `MODIFICAR AGENTE` | No |
| Modelo IA | `SELECCIONAR EL MODELO DE IA` | No |
| Nivel de esfuerzo | `SELECCIONAR NIVEL DE ESFUERZO` | No |
| Advertencia de eliminación | `ADVERTENCIA` | No |
| Crear agente | `CREAR AGENTE — v1.0.1` | Yes |

The version string appears only on **Principal**, **Crear agente**, and the **sidebar slot label** — not on every screen. It is always rendered as `v1.0.1` from `PLUGIN_VERSION`; the mockup's `v.1.0.1` stylization is not reproduced.

Plus:

- Alt+S and `/agent-suite` open exactly one `api.ui.Dialog` with `size: "large"`. Per opening: `dialog.replace` is called **exactly once** (at mount), `dialog.clear` **exactly zero times** during all internal navigation, and **exactly once** at final close through an idempotent `closeOnce`. The host `onClose` callback and the root `REQUEST_CLOSE` event both converge on that same `closeOnce`, so whichever side initiates, the totals stay 1 replace / 1 clear.
- One persistent `AgentSuiteApp` mounted once per opening; all seven screens and the Modificar sub-panel are internal states of one state stack that preserves focus, page, and in-progress form steps on Back.
- No native dialog appears mid-flow, ever.
- Keyboard: arrows, Enter, PageUp/PageDown, Escape Back; function keys F2/F3/F5/F8/F10 per the mockup. Every handled key calls `preventDefault()` **and** `stopPropagation()`.
- Mouse: explicit left-button events carrying the captured row ID/index; catalog wheel paging.
- Reactive theme: the app receives `api.theme` and reads `.current` at render time, never a mount-time snapshot.
- An async adapter/controller owns create, model, effort, skills, operations, delete, and materialize; the UI never persists directly. Core modules stay untouched.
- The **real** disposers returned by `keymap.registerLayer` and `command.register` are retained and registered with `api.lifecycle.onDispose`; the sidebar slot stays host-managed because `slots.register` returns only an ID string and the API exposes no unregister.
- Full removal of the route experiment (`src/tui/screens/suite-route.tsx` and its exports/tests).
- Strict-TDD coverage without FFI, plus mandatory real-terminal smoke.

### Out of Scope

- `SuiteConfig` schema changes, true ERD 1:N operations, server/consent changes.
- `F1 Ayuda` — no help screen exists in the mockup flow; the key is explicitly unbound in Phase 1.
- Pixel-exact CSS effects not representable in a terminal: double borders, projected shadows, rounded corners.

## Success Criteria

1. The panel floats over the current OpenCode screen, with breathing room, and is neither content-tight nor near-full-screen.
2. No right-edge clipping, ghost frame, or displaced content at 80x24 and maximized.
3. All labels remain readable focused and unfocused in the active theme, and after a live theme change.
4. All seven screens and the Modificar sub-panel render inside the same shell; per opening the dialog replace count is exactly one and the clear count is zero until final close, then exactly one; the titlebar text matches the per-screen table above.
5. Escape walks the stack back and only closes from Principal, returning to the exact prior OpenCode location. A second Escape during closing is absorbed and never produces a second clear.
6. Keyboard, function keys, and mouse produce exactly one action each — no duplicates, no host leakage.
7. A render error after mount shows the in-dialog error panel, not a native dialog.
8. Native flow is reachable only when the opener fails synchronously before mount.

## Delivery Strategy

Phase 1 is one feature delivered as four bounded work units, each under 800 review lines:

| WU | Content | Est. lines |
|----|---------|-----------|
| WU1 | Shell, navigation reducer, opener, lifecycle, route removal | ~600 |
| WU2 | Catálogo + Info del agente | ~550 |
| WU3 | Modificar sub-panel, Modelo IA, Nivel de esfuerzo, Advertencia/Eliminar | ~600 |
| WU4 | Crear agente (full `CreateDraft`), Modificar inline Skills/Operaciones editing, adapter integration | ~700 |

Work units are review slices, not releases. User acceptance happens once, after WU4, against the complete seven-screen flow.

## Review Workload Forecast

Estimated Phase 1 total: 2000–2400 changed lines including tests. 800-line budget risk per PR: **low** with the four-slice chain; **high** as a single PR. Chained PRs recommended: **Yes**. Decision needed before apply: **Yes**.
