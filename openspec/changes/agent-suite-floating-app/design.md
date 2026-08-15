# Design: Agent Suite Floating Graphical App — Phase 1

> **Pre-implementation plan.** This describes the target state. The current runtime still uses `api.route` and native dialogs; that is the starting point being removed, not a defect of this design. Tasks MUST delete the route files/exports/tests and create all new files before verification runs.

## Technical Approach

One host `Dialog(size="large")` holds one persistent `AgentSuiteApp`. All seven screens plus the Modificar sub-panel are internal reducer states. Per opening the dialog stack is touched exactly twice: `dialog.replace` once at mount and `dialog.clear` once at final close, both funnelled through `closeOnce`. `api.route` is removed.

```text
Alt+S | /agent-suite -> openAgentSuite(api)
  +-- safeHostAction(() => dialog.replace(render, closeOnce))   // sync-fail -> native
        +-- api.ui.Dialog(size="large", onClose=closeOnce)
              +-- ErrorBoundary -> AgentSuiteApp(theme=api.theme, controller, onClose=closeOnce)
                    +-- Shell (titlebar/body/keybar) + nav reducer + renderers
                          Escape@landing / F10 -> REQUEST_CLOSE -> closing=true -> onClose
```

API evidence — `api.ui.Dialog` is real, not fabricated: `tui.d.ts` 74–85 (`TuiDialogProps.size`, `TuiDialogStack`), 477–486 (`ui.Dialog`), 273–274/491 (`TuiTheme.current`).

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Host surface | one `Dialog` `size:"large"` | route; `medium`; `xlarge` | route loses caller location; `medium` crams 6 rows; `xlarge` reads near-fullscreen |
| Sizing | intrinsic/container-relative | `useTerminalDimensions()` | full-terminal math inside a smaller dialog clips and ghosts |
| Navigation | pure reducer over a screen stack | nested dialogs per screen | keeps replace=1, preserves focus/page/steps, no-FFI tests |
| Persistence | async controller | direct core calls from UI | core untouched; centralizes busy/error/refresh |
| Theme | read `theme.current` in render | mount-time snapshot | a snapshot freezes colors across live theme changes |
| Post-mount failure | in-dialog `ErrorBoundary` panel | native-flow fallback | native mid-flow is the defect removed here |
| Long content | `MAX_VISIBLE_ROWS=6` paging + `scrollbox` panels | unbounded column | bounds height inside the dialog frame |
| Titlebar | shared shell, per-screen `title` from `screen.kind` | one constant title | mockup gives each screen its own header |
| Modificar | `AppScreen` kind `"modify"` — a sub-state of Info, not an 8th product screen | 8th top-level screen; overloading `info` with a `mode` flag | keeps the 7-screen product while making `F5`/`OPEN_MODIFY` a single unambiguous target with its own titlebar and its own back edge to `info` |
| Skills/Operaciones editing | inline `edit` sub-mode **inside** the modify panel | separate pushed screens | both are custom-only list/text edits; inline keeps the stack shallow and `setSkills`/`setOperations` scoped to modify |
| Close accounting | one idempotent `closeOnce` shared by host `onClose` and `REQUEST_CLOSE` | app clears + host also clears | two entry points otherwise produce a double `clear`; a `closing` flag also absorbs double Escape |
| Slot teardown | host-managed, no disposer | `onDispose(slotDisposer)` | `slots.register` returns `string`; `TuiSlots` has no unregister (`tui.d.ts` 401–405) |

## Data Flow

```text
key/mouse -> dispatch -> reducer -> stack -> render
          \-> controller.run(op): busy -> await -> refresh | error -> core (unchanged)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/tui/agent-suite-{app.tsx,nav.ts,controller.ts,vm.ts}` | Create | root (one `useKeyboard`, busy/error); pure reducer+stack; async ops+refresh; view-models (paging, truncation, titles, tokens) |
| `src/tui/screens/suite-shell.tsx` | Create | shared frame: `title` prop, bounded body, keybar |
| `src/tui/screens/{landing,catalog,agent-info,modify-panel,model-select,effort-select,delete-warning,create-agent,error-panel}.tsx` | Create | seven screen renderers + the Modificar sub-panel (menu + inline skills/operations edit) + ErrorBoundary fallback |
| `src/tui/index.tsx` | Modify | new opener + real disposers; drop the four route exports |
| `src/tui/screens/suite-route.tsx` | Delete | rejected full-screen route |
| `test/tui-registration.test.ts` | Modify | drop route imports/tests (~15–26, 222–257) |

## Interfaces / Contracts

```ts
// Modify is a sub-state of Info; the product still has 7 principal screens.
type ModifyEdit =
  | { mode: "menu" }
  | { mode: "skills"; selected: string[]; focus: number }   // custom agents only
  | { mode: "operations"; prompt: string };                 // custom agents only

type CreateDraft = {
  id: string;           // step 0 — slug, required, unique
  description: string;  // step 1 — required
  skills: string[];     // step 2 — may be empty
  operations: string;   // step 3 — operations prompt, may be empty
  model: string;        // step 4 — required
  effort: string;       // step 5 — required, normalized runtime variant
};

type AppScreen =
  | { kind: "landing"; focus: 0 | 1 }
  | { kind: "catalog"; page: number; focus: number }
  | { kind: "info" | "model" | "effort"; agentId: string; focus: number }
  | { kind: "modify"; agentId: string; focus: number; edit: ModifyEdit }
  | { kind: "delete"; agentId: string; confirmFocus: 0 | 1 }
  | { kind: "create"; step: 0 | 1 | 2 | 3 | 4 | 5; draft: CreateDraft; focus: number };

type NavState = { stack: AppScreen[]; busy: boolean; closing: boolean; error?: string };

interface AgentSuiteController {
  snapshot(): { rows: AgentCatalogRow[]; version: string };
  refresh(): void;
  createAgent(d: CreateDraft): Promise<void>;   // creation only — full draft in one call
  deleteAgent(id: string): Promise<void>;
  materialize(id: string): Promise<void>;
  setModel(id: string, model: string): Promise<void>;
  setEffort(id: string, variant: string): Promise<void>;
  setSkills(id: string, s: string[]): Promise<void>;      // modify panel, custom agents only
  setOperations(id: string, prompt: string): Promise<void>; // modify panel, custom agents only
}
```

`createAgent` is the **only** creation path and consumes the whole `CreateDraft`. `setSkills`/`setOperations` are **modification** operations invoked exclusively from the modify panel's inline edit modes on custom agents — never to assemble a new agent.

### Modify panel

Options come from a pure `modifyOptions(row)` in `vm.ts`, so `focus` always indexes a real entry:

| Agent source | Options (in order) |
|---|---|
| seed | `Modelo de IA`, `Nivel de esfuerzo`, `Volver` |
| custom | `Modelo de IA`, `Nivel de esfuerzo`, `Skills`, `Operaciones`, `Volver` |

`OPEN_MODIFY` (and `F5` from `info`) pushes `{ kind: "modify", edit: { mode: "menu" } }` — one unambiguous target. `MODIFY_ACTIVATE` on the focused option: `Modelo de IA` pushes `model`, `Nivel de esfuerzo` pushes `effort`, `Skills`/`Operaciones` switch `edit.mode` in place (no push), `Volver` pops to `info`. `BACK` from `edit.mode !== "menu"` returns to the menu; `BACK` from the menu returns to `info`. After `SELECT_MODEL`/`SELECT_EFFORT` the stack pops back to the modify menu, not straight to `info`.

Inline edit events: `EDIT_SKILLS_TOGGLE {index}` (toggle in `selected`), `EDIT_OPERATIONS_INPUT {value}` (bound to the panel `Input`), `EDIT_COMMIT` (calls `setSkills`/`setOperations`, refreshes, returns to menu), `EDIT_CANCEL` (discards, returns to menu). Reducer events replacing the previously ambiguous `MODIFY`: `OPEN_MODIFY`, `MODIFY_ACTIVATE`, `EDIT_SKILLS_TOGGLE`, `EDIT_OPERATIONS_INPUT`, `EDIT_COMMIT`, `EDIT_CANCEL`.

Titlebar map (pure, `vm.ts`): `landing → "SUITE DE AGENTES — v1.0.1"`, `catalog → "CATALOGO DE AGENTES"`, `info → "INFO DEL AGENTE"`, `modify → "MODIFICAR AGENTE"`, `model → "SELECCIONAR EL MODELO DE IA"`, `effort → "SELECCIONAR NIVEL DE ESFUERZO"`, `delete → "ADVERTENCIA"`, `create → "CREAR AGENTE — v1.0.1"`. `PLUGIN_VERSION` renders on `landing`/`create` and the sidebar label only.

### Mount and close

`dialog.replace` runs exactly once per opening. Internal navigation never calls `replace`, `clear`, or `setSize`. Final close goes through one opening-scoped `closeOnce`:

```ts
let closed = false;
const closeOnce = () => { if (closed) return; closed = true; dialog.clear(); };
```

`api.ui.Dialog`'s `onClose` and the root's `REQUEST_CLOSE` (Escape on `landing`, `F10`) both call `closeOnce`, so `clear` totals exactly 1 per opening no matter which side initiates. `REQUEST_CLOSE` also sets `closing: true`; while `closing` is true the root handler still calls `preventDefault()`/`stopPropagation()` but dispatches nothing and starts no controller op, so a second Escape is absorbed. `busy` blocks new controller ops but never blocks `closeOnce`.

Keyboard: handled keys call `preventDefault()` **and** `stopPropagation()`; `F2/F3/F5/F8/F10` per mockup, `F1` unbound; root ignores Enter while an `Input` is focused. Mouse: explicit event, `button === 0` only, row ID captured at render.

Lifecycle — verified against installed types:

| Registration | Return | Handling |
|---|---|---|
| `keymap.registerLayer` | `() => void` (`@opentui/keymap/src/keymap.d.ts` 32) | retain → `api.lifecycle.onDispose` |
| `command.register` | `() => void` (`tui.d.ts` 68) | retain → `api.lifecycle.onDispose` |
| `slots.register` | `string` ID (`tui.d.ts` 401–405) | host-managed; no unregister exists |

Dialog/render root is host-owned — no manual `createRoot`.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | reducer transitions, stack preservation, paging, truncation, focus tokens, titlebar map incl. `modify → MODIFICAR AGENTE` | pure, no FFI |
| Unit | `OPEN_MODIFY`/`F5` lands on the modify menu; `modifyOptions` = 3 seed / 5 custom; `MODIFY_ACTIVATE` routing; `BACK` edges menu→info and edit→menu; `SELECT_MODEL`/`SELECT_EFFORT` return to the menu | pure, no FFI |
| Unit | `EDIT_*` cycle: commit calls `setSkills`/`setOperations` once then refreshes, cancel discards, failed commit keeps the pending value, edit modes unreachable for seed agents | pure + fake controller |
| Unit | `CreateDraft`: six fields captured across steps 0–5, required-field validation, `createAgent` gets the whole draft in one call, `setSkills`/`setOperations` never called during creation; controller busy/error/refresh | fake core boundary |
| Contract | per opening: replace=1, clear=0 across full internal navigation, clear=1 after final close; `closeOnce` idempotent under host-`onClose`-first, `REQUEST_CLOSE`-first, and both; double Escape and Escape-while-`closing` produce no second clear; `size:"large"`, no `route.*`, sync-fail fallback once, keymap+slash disposers each invoked once, no slot disposer attempted, Enter ownership, mouse ID, ErrorBoundary | mocked `TuiPluginApi` |
| Smoke | 80x24 + maximized: floating, no clipping, 7 screens + modify panel, keys/mouse | real Windows Terminal |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no file classification/execution | — | — |
| Git / commit / push / PR commands | N/A — no VCS or PR automation | — | — |
| Host routing surface | **Applicable** — route removed | never calls `api.route` | zero `route.register`/`route.navigate` in the flow |
| Process integration (dialog stack) | **Applicable** — dialog mutated near key handlers, with two close entry points | mutate only at open (`replace`) and at final close (`clear`) via idempotent `closeOnce`; `closing` flag absorbs repeat input | per opening replace=1, clear=0 during navigation, clear=1 after close; `closeOnce` idempotent from host `onClose`, from `REQUEST_CLOSE`, and from both; double Escape adds no clear |
| Filesystem mutation via controller | **Applicable** — delete/materialize write config | UI never writes; ID validated, confirm required | unconfirmed delete rejects; write failure shows in-panel error, keeps mount |

## Migration / Rollout

No migration; `SuiteConfig` unchanged; route removal is a straight deletion performed in WU1, before verification. Four work units under 800 review lines: WU1 shell/nav/opener/`closeOnce`/lifecycle/route-removal, WU2 Catálogo+Info, WU3 Modificar panel+Modelo/Esfuerzo/Eliminar, WU4 Crear (full `CreateDraft`)+inline Skills/Operaciones+adapter. Acceptance once, after WU4.

## Open Questions

- None blocking.
