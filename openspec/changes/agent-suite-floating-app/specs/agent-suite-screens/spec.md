# Agent Suite Floating App Specification — Phase 1

UI copy is Spanish; this specification is English.

**Status: pre-implementation plan.** Every requirement below describes the behavior the implementation MUST produce, not behavior the current runtime already has. The current `src/tui/index.tsx` still registers `api.route` and still opens native dialogs mid-flow; that is the baseline this change deletes. Requirements are verified only after implementation: the tasks MUST delete the route files, exports, and tests and create all new files **before** any verification pass. A verification run that finds route code or native dialogs *before* those tasks execute is a sequencing error, not a spec violation.

## ADDED Requirements

### Requirement: Suite opens as one floating custom dialog

Alt+S and `/agent-suite` MUST open exactly one host `api.ui.Dialog` at `size: "large"` containing the graphical Suite app. The app MUST NOT call `api.route.register` or `api.route.navigate`, and MUST NOT read full-terminal dimensions.

#### Scenario: Open from an existing OpenCode screen
- GIVEN the user is on any OpenCode route
- WHEN Alt+S opens the Suite
- THEN a floating panel appears over that same route
- AND the host route remains unchanged
- AND `dialog.replace` has been called exactly once

#### Scenario: Slash command shares the opener
- GIVEN the plugin is registered
- WHEN `/agent-suite` runs
- THEN the same opener executes and the same single dialog opens

### Requirement: All seven screens live in one persistent mount

Principal, Catálogo, Info del agente, Modelo IA, Nivel de esfuerzo, Advertencia de eliminación, and Crear agente MUST all be internal states of one mounted `AgentSuiteApp`, together with the Modificar sub-panel of Info del agente. Internal navigation MUST NOT call `dialog.replace`, `dialog.clear`, `dialog.setSize`, or `route.navigate`. No native `DialogSelect`, `DialogPrompt`, `DialogConfirm`, or `DialogAlert` may be opened after the app mounts.

#### Scenario: Traverse the whole flow
- GIVEN Principal is open
- WHEN the user walks Principal → Catálogo → Info → Modificar → Modelo IA → back → Nivel de esfuerzo → back → back → Advertencia → back → Principal → Crear agente
- THEN every screen renders inside the same shell
- AND the dialog replace count remains one
- AND the dialog clear count remains zero

#### Scenario: No native dialog mid-flow
- GIVEN the graphical app is mounted
- WHEN any screen action runs, including failures
- THEN no native host dialog is opened

### Requirement: Mounting and closing touch the dialog stack exactly once each

Per opening, `dialog.replace` MUST be called **exactly once**, at mount. `dialog.clear` MUST be called **exactly zero times** for the entire duration of internal navigation, and **exactly once** at final close.

Final close MUST be performed by a single opening-scoped idempotent `closeOnce` function. The first invocation MUST call `dialog.clear()` once; every later invocation MUST return without touching the dialog stack. The host `api.ui.Dialog` `onClose` callback and the root `REQUEST_CLOSE` event (Escape on Principal, `F10`) MUST both converge on that same `closeOnce`, so the totals hold regardless of which side initiates the close.

`REQUEST_CLOSE` MUST also set a `closing` state. While `closing` is true, the root key handler MUST still call `preventDefault()` and `stopPropagation()` but MUST dispatch no further navigation and MUST start no controller operation. The `busy` state MUST NOT block `closeOnce`.

#### Scenario: Internal navigation never clears
- GIVEN the Suite is open
- WHEN the user traverses every screen and the Modificar sub-panel and returns to Principal
- THEN `dialog.replace` has been called exactly once
- AND `dialog.clear` has been called exactly zero times

#### Scenario: App-initiated close
- GIVEN Principal is open
- WHEN Escape requests the final close
- THEN `closeOnce` runs and `dialog.clear` is called exactly once
- AND a subsequent host `onClose` invocation of `closeOnce` calls `dialog.clear` no further times

#### Scenario: Host-initiated close
- GIVEN the Suite is open
- WHEN the host closes the dialog and invokes `onClose`
- THEN `closeOnce` runs and `dialog.clear` is called exactly once
- AND a subsequent `REQUEST_CLOSE` calls `dialog.clear` no further times

#### Scenario: Double Escape during closing
- GIVEN Escape on Principal has set `closing` to true
- WHEN Escape is pressed again before teardown completes
- THEN no additional navigation is dispatched and no controller operation starts
- AND `dialog.clear` has still been called exactly once in total

### Requirement: Navigation state preserves context on Back

The app MUST maintain a screen stack. Returning to a previous screen MUST restore its focus index, its catalog page, and any in-progress Crear agente step and field values.

The reducer MUST be pure, host-independent, and MUST handle at least: `ACTIVATE_LANDING_ITEM`, `ACTIVATE_AGENT`, `MOVE_FOCUS`, `PAGE`, `OPEN_MODIFY`, `MODIFY_ACTIVATE`, `SELECT_MODEL`, `SELECT_EFFORT`, `EDIT_SKILLS_TOGGLE`, `EDIT_OPERATIONS_INPUT`, `EDIT_COMMIT`, `EDIT_CANCEL`, `REQUEST_DELETE`, `CONFIRM_DELETE`, `CANCEL_DELETE`, `CREATE_START`, `CREATE_INPUT`, `CREATE_NEXT`, `CREATE_PREV`, `CREATE_SUBMIT`, `BACK`, `REQUEST_CLOSE`, `SET_BUSY`, `SET_ERROR`.

The previously listed generic `MODIFY` event is replaced by `MODIFY_ACTIVATE` plus the four `EDIT_*` events; no event named `MODIFY` may remain.

#### Scenario: Catalog page and focus survive a detour
- GIVEN Catálogo is on page 2 with focus on row 3
- WHEN the user opens Info and presses Escape
- THEN Catálogo reappears on page 2 with focus on row 3

#### Scenario: Create form survives Back
- GIVEN Crear agente is on step 3 with entered values
- WHEN the user goes back one step and forward again
- THEN previously entered values are still present

### Requirement: Modificar is an unambiguous sub-panel of Info del agente

Modificar MUST be a sub-state of Info del agente, not an eighth principal screen; the product remains seven principal screens. It MUST be represented as an `AppScreen` of kind `modify` carrying `agentId`, `focus`, and an `edit` sub-mode of `menu`, `skills`, or `operations`.

`F5` from Info del agente and the `OPEN_MODIFY` event MUST both land on exactly one destination: the `modify` screen with `edit.mode = "menu"`. Neither MUST navigate directly to Modelo IA, Nivel de esfuerzo, or any other screen.

The panel titlebar MUST read `MODIFICAR AGENTE`. Its option list MUST be produced by a pure function of the agent row, ordered as follows:

| Agent source | Options |
|---|---|
| seed | `Modelo de IA`, `Nivel de esfuerzo`, `Volver` |
| custom | `Modelo de IA`, `Nivel de esfuerzo`, `Skills`, `Operaciones`, `Volver` |

Seed agents MUST NOT expose `Skills` or `Operaciones` as focusable or activatable options, because seed agents only support model and effort changes.

`MODIFY_ACTIVATE` on the focused option MUST behave exactly as:

| Option | Transition |
|---|---|
| `Modelo de IA` | push the `model` screen |
| `Nivel de esfuerzo` | push the `effort` screen |
| `Skills` | set `edit.mode = "skills"` in place — no screen is pushed |
| `Operaciones` | set `edit.mode = "operations"` in place — no screen is pushed |
| `Volver` | pop back to Info del agente |

`BACK` MUST return from `edit.mode` `skills` or `operations` to `menu`, and from `menu` to Info del agente. After `SELECT_MODEL` or `SELECT_EFFORT` completes, the stack MUST return to the modify menu, not directly to Info del agente.

#### Scenario: F5 lands on the modify panel
- GIVEN Info del agente is open for an agent
- WHEN `F5` is pressed
- THEN the `modify` screen opens with `edit.mode` equal to `menu`
- AND the titlebar shows `MODIFICAR AGENTE`

#### Scenario: Seed agent options
- GIVEN the modify panel is open for a seed agent
- THEN exactly three options are offered: `Modelo de IA`, `Nivel de esfuerzo`, `Volver`
- AND focus movement never reaches a `Skills` or `Operaciones` option

#### Scenario: Custom agent options
- GIVEN the modify panel is open for a custom agent
- THEN exactly five options are offered: `Modelo de IA`, `Nivel de esfuerzo`, `Skills`, `Operaciones`, `Volver`

#### Scenario: Model option pushes the model screen and returns to modify
- GIVEN the modify panel menu is open with `Modelo de IA` focused
- WHEN `MODIFY_ACTIVATE` runs and a model is then selected
- THEN the `model` screen is pushed, showing `SELECCIONAR EL MODELO DE IA`
- AND after selection the modify panel menu reappears showing `MODIFICAR AGENTE`

#### Scenario: Volver returns to Info
- GIVEN the modify panel menu is open with `Volver` focused
- WHEN `MODIFY_ACTIVATE` runs
- THEN Info del agente reappears showing `INFO DEL AGENTE`

### Requirement: Skills and Operaciones are edited inline inside the modify panel

For custom agents, `Skills` and `Operaciones` MUST be edited inside the modify panel by switching `edit.mode`, without pushing a new screen and without opening any native dialog.

Skills editing MUST use a selectable list where `EDIT_SKILLS_TOGGLE` with a captured index toggles that skill in the pending `selected` array. Operations editing MUST use a text `Input` bound to `EDIT_OPERATIONS_INPUT`, holding the pending `prompt` value.

`EDIT_COMMIT` MUST call `controller.setSkills(agentId, selected)` or `controller.setOperations(agentId, prompt)` exactly once for the active mode, refresh the snapshot on success, and return to `edit.mode = "menu"`. `EDIT_CANCEL` MUST discard the pending value, call no controller operation, and return to `edit.mode = "menu"`. A failed commit MUST surface an in-panel error and keep the edit mode open with the pending value intact.

#### Scenario: Commit edited skills
- GIVEN the modify panel is in `skills` edit mode for a custom agent
- WHEN two skills are toggled and the edit is committed
- THEN `controller.setSkills` is called exactly once with the resulting array
- AND the snapshot refreshes and the modify menu reappears

#### Scenario: Cancel edited operations
- GIVEN the modify panel is in `operations` edit mode with a changed prompt
- WHEN the edit is cancelled
- THEN no controller operation is called
- AND the modify menu reappears with the stored prompt unchanged

#### Scenario: Failed commit keeps the edit open
- GIVEN an operations edit is committed
- WHEN `controller.setOperations` rejects
- THEN an in-panel error is shown
- AND the edit mode remains open with the pending prompt intact
- AND no native dialog is opened

### Requirement: CreateDraft is complete and creation is a single operation

`CreateDraft` MUST carry exactly these fields: `id` (string, required, unique slug), `description` (string, required), `skills` (string array, may be empty), `operations` (string operations prompt, may be empty), `model` (string, required), and `effort` (string, required, a normalized runtime variant).

The Crear agente form MUST collect them across steps 0–5 in that order, and `CREATE_INPUT` MUST carry the target field and its value. `CREATE_SUBMIT` MUST call `controller.createAgent(draft)` exactly once with the complete draft.

`controller.setSkills` and `controller.setOperations` are **modification** operations reserved for the modify panel on custom agents. They MUST NOT be called as part of agent creation.

#### Scenario: Draft carries every field
- GIVEN the user completes all six steps of Crear agente
- WHEN the form is submitted
- THEN `controller.createAgent` is called exactly once
- AND the draft passed to it contains `id`, `description`, `skills`, `operations`, `model`, and `effort`

#### Scenario: Required fields are validated
- GIVEN a step whose field is required is left empty
- WHEN the user advances
- THEN advancing is refused with an in-panel message
- AND no controller operation is called

#### Scenario: Creation does not use the modify operations
- GIVEN Crear agente is submitted successfully
- THEN `controller.setSkills` and `controller.setOperations` are never called during that flow

### Requirement: Layout is bounded by the dialog

The app MUST use intrinsic/container-relative layout. It MUST NOT import or call `useTerminalDimensions`, and MUST NOT set explicit terminal-derived width or height. Catalog rows MUST be limited to a fixed `MAX_VISIBLE_ROWS = 6` per page with PageUp/PageDown paging and a visible page affordance. Long panel content MUST be bounded by a scroll container or by defined wrapping/truncation, never by overflowing the dialog frame.

#### Scenario: Small terminal
- GIVEN a terminal of 80x24
- WHEN any screen renders
- THEN content stays inside the dialog frame with no right-edge clipping and no ghost frame

#### Scenario: Maximized terminal
- GIVEN a maximized terminal
- WHEN any screen renders
- THEN the panel has breathing room and does not approach full-screen

### Requirement: Keyboard handling is deterministic and does not leak

Every key the app handles MUST call both `preventDefault()` and `stopPropagation()`. Unhandled keys MUST NOT be swallowed.

Bindings: arrows move focus; Enter activates; PageUp/PageDown page the catalog; Escape performs internal Back and, on Principal, requests final close; `F2` opens Catálogo; `F3` opens Crear agente; `F5` from Info del agente opens the Modificar sub-panel at `edit.mode = "menu"` and nowhere else; `F8` requests deletion from Info del agente; `F10` requests final close. `F1` is intentionally unbound in Phase 1.

Enter ownership MUST be exclusive: when a text `Input` holds focus, only that input's `onSubmit` processes Enter and the root handler MUST ignore it.

#### Scenario: Escape from a nested screen
- GIVEN Nivel de esfuerzo is open
- WHEN Escape is pressed
- THEN the previous screen reappears
- AND the dialog remains mounted

#### Scenario: Escape from Principal
- GIVEN Principal is open
- WHEN Escape is pressed
- THEN `closeOnce` runs and the dialog closes exactly once
- AND the caller's original OpenCode route remains current

#### Scenario: Enter inside the create form
- GIVEN Crear agente has a focused text input
- WHEN Enter is pressed
- THEN exactly one submit occurs, produced by the input
- AND the root handler produces no additional transition

### Requirement: Mouse activation uses captured identity

Mouse handlers MUST accept an explicit event, act only on the left button, call `preventDefault()` and `stopPropagation()`, and dispatch with the row ID or index captured at render time. Activation MUST NOT read a focus signal that the same handler just wrote. Wheel events over the catalog MUST page the list within its bounds.

#### Scenario: Click a catalog row
- GIVEN Catálogo shows rows
- WHEN the user left-clicks row 4
- THEN row 4 becomes focused and activated in one action
- AND no other row is activated

#### Scenario: Non-left button
- GIVEN Catálogo shows rows
- WHEN a right-click occurs on a row
- THEN no activation is dispatched

### Requirement: Theme is reactive

`AgentSuiteApp` MUST receive `theme: TuiPluginApi["theme"]` and read `theme.current` during render. It MUST NOT capture a `TuiThemeCurrent` snapshot at mount. Selected foreground and background tokens MUST always change as a pair; a selected foreground token MUST never be rendered over a non-selected background.

#### Scenario: Theme changes while open
- GIVEN the Suite is open
- WHEN the host theme changes
- THEN the panel repaints with the new theme tokens without remounting

### Requirement: Real disposers are retained; the slot is host-managed

Disposal MUST follow the disposability the installed host types actually provide:

| Registration | Verified return | Requirement |
|---|---|---|
| `api.keymap.registerLayer` | `() => void` (`@opentui/keymap/src/keymap.d.ts` line 32) | disposer MUST be retained and passed to `api.lifecycle.onDispose` |
| `api.command.register` | `() => void` (`tui.d.ts` line 68) | disposer MUST be retained and passed to `api.lifecycle.onDispose` |
| `api.slots.register` | `string` slot ID (`tui.d.ts` lines 401–405) | host-managed; NO disposer exists and none MUST be registered |

`api.slots.register` returns an identifier, and `TuiSlots` exposes no `unregister`, `remove`, or `dispose`. The plugin therefore MUST NOT treat the slot return value as a disposer, MUST NOT wrap it in a synthetic teardown, and MUST NOT claim slot teardown anywhere in code or docs. The sidebar slot's lifetime belongs to the host.

The Dialog render root is host-owned: the plugin MUST NOT call `createRoot` manually.

#### Scenario: Plugin dispose invokes only real disposers
- GIVEN the plugin registered a keymap layer and a slash command
- WHEN the host disposes the plugin
- THEN the keymap disposer is invoked exactly once
- AND the slash-command disposer is invoked exactly once

#### Scenario: Slot registration produces no disposer
- GIVEN the plugin registered the sidebar slot
- WHEN the slot registration returns
- THEN the returned value is treated as an ID only
- AND no slot teardown callback is passed to `api.lifecycle.onDispose`

### Requirement: All mutations go through the adapter

The UI MUST NOT call persistence, config, or filesystem functions directly. An adapter/controller MUST expose the snapshot plus async operations: `createAgent(draft)`, `setModel`, `setEffort`, `setSkills`, `setOperations`, `deleteAgent`, and `materialize`. Every async operation MUST set a busy state, surface failures as an in-panel error, and refresh the snapshot after a successful mutation. Core modules MUST remain unchanged.

`createAgent` is the sole creation entry point and takes the complete `CreateDraft`. `setSkills` and `setOperations` are modification operations invoked only from the Modificar sub-panel's inline edit modes on custom agents. The busy state MUST NOT block the final close path.

#### Scenario: Successful model change
- GIVEN Info del agente is open for an agent
- WHEN the user selects a new model
- THEN the adapter persists it, the snapshot refreshes, and Info shows the new model

#### Scenario: Failed deletion
- GIVEN deletion is confirmed
- WHEN the adapter operation rejects
- THEN an in-panel error is shown with the failure message
- AND no native dialog is opened
- AND the app remains mounted

### Requirement: Fallback is synchronous-open-time only

`safeHostAction` MUST wrap `dialog.replace` and detect only a synchronous failure occurring before mount. On such a failure the plugin MAY open the existing native flow once. After mount, render errors MUST be caught by a Solid `ErrorBoundary` inside the dialog that renders a graphical error panel offering retry and close. A post-mount error MUST NOT trigger the native flow.

#### Scenario: Opener fails synchronously
- GIVEN `dialog.replace` throws synchronously
- WHEN the Suite is opened
- THEN the native flow opens exactly once

#### Scenario: Render error after mount
- GIVEN the app is mounted
- WHEN a screen throws during render
- THEN the in-dialog error panel appears with retry and close
- AND the native flow is not opened

### Requirement: The shell is shared and the titlebar is per-screen

All screens MUST render inside the same shell (frame, titlebar, body, keybar), but the titlebar text MUST change per screen exactly as in the mockup:

| Screen state | Titlebar text |
|---|---|
| `landing` (Principal) | `SUITE DE AGENTES — v1.0.1` |
| `catalog` | `CATALOGO DE AGENTES` |
| `info` | `INFO DEL AGENTE` |
| `modify` (sub-panel of Info del agente) | `MODIFICAR AGENTE` |
| `model` | `SELECCIONAR EL MODELO DE IA` |
| `effort` | `SELECCIONAR NIVEL DE ESFUERZO` |
| `delete` | `ADVERTENCIA` |
| `create` | `CREAR AGENTE — v1.0.1` |

The mapping MUST be a pure function of the current screen state, unit-testable without the host.

A single constant titlebar on all screens is a defect: it misreports the user's location.

#### Scenario: Titlebar follows navigation
- GIVEN Principal is open showing `SUITE DE AGENTES — v1.0.1`
- WHEN the user opens Catálogo, then Info del agente, then Modificar, then Modelo IA
- THEN the titlebar shows `CATALOGO DE AGENTES`, then `INFO DEL AGENTE`, then `MODIFICAR AGENTE`, then `SELECCIONAR EL MODELO DE IA`
- AND the surrounding shell frame and keybar remain the same shell

#### Scenario: Destructive confirmation header
- GIVEN Info del agente is open
- WHEN deletion is requested with `F8`
- THEN the titlebar shows `ADVERTENCIA`

#### Scenario: Back restores the previous titlebar
- GIVEN Nivel de esfuerzo is open showing `SELECCIONAR NIVEL DE ESFUERZO`
- WHEN Escape is pressed
- THEN the titlebar shows the previous screen's text

### Requirement: Version label is scoped and uses the project convention

The version MUST be sourced from `PLUGIN_VERSION` and rendered as `v1.0.1`. The mockup's `v.1.0.1` is a visual stylization and MUST NOT be reproduced.

The version MUST appear only on the Principal titlebar, the Crear agente titlebar, and the sidebar slot label. It MUST NOT appear on the Catálogo, Info del agente, Modificar, Modelo IA, Nivel de esfuerzo, or Advertencia titlebars.

#### Scenario: Version on Principal and Crear agente
- GIVEN Principal is rendered
- THEN the titlebar shows `SUITE DE AGENTES — v1.0.1`
- AND when Crear agente is rendered the titlebar shows `CREAR AGENTE — v1.0.1`

#### Scenario: No version on intermediate screens
- GIVEN Catálogo, Info del agente, Modificar, Modelo IA, Nivel de esfuerzo, or Advertencia is rendered
- THEN the titlebar contains no version substring

## REMOVED Requirements

### Requirement: Full-screen graphical route

**Reason:** full-screen route behavior was validated but rejected by the user because it replaces the entire OpenCode screen and Escape loses the caller's prior location. `src/tui/screens/suite-route.tsx`, the exports `registerSuiteRoute`, `navigateSuiteRoute`, `leaveSuiteRoute`, and `selectSuiteRouteItem`, and their tests MUST be deleted by the implementation tasks. The new app never uses `api.route`.

Removal is an implementation obligation with an explicit order: the tasks MUST delete the route files, exports, and tests and create every new file **before** verification runs. Route code still present in the working tree ahead of those tasks is the expected pre-implementation baseline, not a violation of this specification.
