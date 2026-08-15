# Agent Suite Screens Specification (Delta)

> Delta spec for SDD change `restructure-agent-suite-tui-native`. On archive, these ADDED requirements replace the `agent-suite-screens` capability, and the REMOVED requirements are deleted from it. This change removes the custom OpenTUI screen layer and delivers the flow on native host dialogs.

## REMOVED Requirements

### Requirement: Suite entry opens the owned screen flow

**Reason**: The owned OpenTUI/Solid screen layer is deleted; entry now opens the native dialog flow.

### Requirement: Responsive layout adapts to terminal size

**Reason**: No custom layout remains; the host dialog renders and sizes itself.

### Requirement: Keyboard focus and navigation model

**Reason**: Focus, keyboard, mouse, and Escape handling are owned by the native host dialogs.

### Requirement: Suite dialog always has a guaranteed exit path

**Reason**: Native dialogs provide Escape-based close; the custom `Ctrl+Q` binding is removed with the custom layer.

### Requirement: Catalog pagination supports moving backward

**Reason**: The catalog is a natively scrollable `DialogSelect`; hand-rolled pagination is removed.

### Requirement: Renderer-unavailable failures are diagnosable

**Reason**: There is no custom renderer to be unavailable.

## ADDED Requirements

### Requirement: Suite entry opens the native dialog flow

Both Alt+S and `/agent-suite` MUST open the same native `DialogSelect` first screen; neither MUST route through any custom OpenTUI screen, and no custom screen code MUST remain in the plugin.

#### Scenario: Hotkey entry

- GIVEN the plugin is loaded
- WHEN the user presses Alt+S
- THEN a native select dialog titled `Suite de Agentes · v1.0.1` opens

#### Scenario: Command entry

- GIVEN the plugin is loaded
- WHEN the user runs `/agent-suite`
- THEN the same native first screen opens

### Requirement: First screen structure

The first screen MUST present exactly two options — `Catálogo` and `Crear agente` — in that order, with the plugin version `v1.0.1` visible in the dialog title.

#### Scenario: Two options only

- GIVEN the first screen is open
- WHEN the user reads the options
- THEN exactly `Catálogo` and `Crear agente` are listed, in that order

### Requirement: AGENTES catalog list

Choosing `Catálogo` MUST open a native `DialogSelect` listing every catalog agent (seed and custom) with a per-option summary of state, model, and effort, scrollable by the host when the list overflows. An empty catalog MUST show a native alert explaining that no agents exist and pointing to `Crear agente`.

#### Scenario: Catalog content

- GIVEN agents exist in the catalog
- WHEN the catalog opens
- THEN each option shows the agent ID with its state, model, and effort summary

#### Scenario: Empty catalog

- GIVEN the catalog has no agents
- WHEN the user opens `Catálogo`
- THEN a native alert explains the empty state and mentions `Crear agente`

### Requirement: INFO DEL AGENTE detail and actions

Selecting an agent MUST open a native structured detail (alert) with fields in this order — Nombre, Descripción, Modelo, Esfuerzo, Skills, Operaciones, Estado — followed by a native action select. The action select MUST offer `Modificar` and `Volver` for every agent, and additionally `Eliminar` only for custom agents. Operaciones MUST show the custom agent's prompt or the runtime description.

#### Scenario: Seed agent actions

- GIVEN a seed agent
- WHEN its info actions open
- THEN only `Modificar` and `Volver` are offered

#### Scenario: Custom agent actions

- GIVEN a custom agent
- WHEN its info actions open
- THEN `Modificar`, `Eliminar`, and `Volver` are offered

### Requirement: Modificar submenu

`Modificar` MUST open a native `DialogSelect` submenu offering `Modelo de IA` and `Nivel de esfuerzo` for every agent, plus `Skills` and `Operaciones (instrucciones)` for custom agents only. Choosing `Modelo de IA` MUST open a native `DialogSelect` of available `provider/model` options with the current model marked. Choosing `Nivel de esfuerzo` (or completing the model step when the model exposes supported variants) MUST open a native `DialogSelect` listing efforts in the order `default, none, low, high, xhigh, max` (capability-filtered via the existing `normalizeEffortOptions()`); when the active model exposes none, the effort options are just `default`. Saving model/effort MUST persist through the existing assignment path and update the in-memory runtime agent. Editing `Skills` MUST reuse the native skills multi-select loop; editing `Operaciones (instrucciones)` MUST reuse the native instructions prompt; both MUST persist to the custom agent record.

#### Scenario: Seed agent submenu

- GIVEN a seed agent
- WHEN `Modificar` opens
- THEN only `Modelo de IA` and `Nivel de esfuerzo` are offered

#### Scenario: Custom agent submenu

- GIVEN a custom agent
- WHEN `Modificar` opens
- THEN `Modelo de IA`, `Nivel de esfuerzo`, `Skills`, and `Operaciones (instrucciones)` are offered

#### Scenario: Model with variants

- GIVEN a chosen model that supports `low` and `high`
- WHEN the effort step opens
- THEN the options are `default`, `low`, `high` in that order

#### Scenario: Model without variants

- GIVEN a chosen model with no supported variants
- WHEN the model is saved
- THEN no effort dialog opens and the effort is the default

#### Scenario: Edit custom skills

- GIVEN a custom agent and the `Skills` submenu choice
- WHEN the user completes the skills loop
- THEN the custom agent's skills are updated and persisted

### Requirement: Crear agente field order

The `Crear agente` native chain MUST collect fields in this order — Nombre (ID), Descripción, Skills, Operaciones (instrucciones), Modelo de IA, Nivel de esfuerzo (si lo permite) — followed by the existing save confirmation and optional global materialization.

#### Scenario: Create collects all fields in order

- GIVEN the user starts `Crear agente`
- WHEN the chain runs
- THEN fields are requested in the specified order, ending with an effort step only when the chosen model supports variants

### Requirement: Delete confirmation

`Eliminar` MUST open a native confirm dialog titled `Advertencia` asking `¿Desea eliminar el agente?`. Confirming (Sí) MUST remove the custom registration, persist, and return to the Catálogo; cancelling (No) MUST return to Info del agente without mutation.

#### Scenario: Confirm delete

- GIVEN the delete confirmation for a custom agent
- WHEN the user confirms
- THEN the custom registration is removed, persisted, and the Catálogo reopens

#### Scenario: Cancel delete

- GIVEN the delete confirmation
- WHEN the user cancels
- THEN nothing is persisted and the flow returns to Info del agente

### Requirement: Version display

The plugin MUST display version `v1.0.1` in the first-screen title and anywhere the version is shown (sidebar label, alerts).

#### Scenario: Version label

- GIVEN the plugin is loaded
- WHEN any Suite dialog or the sidebar label renders
- THEN the version shown is `v1.0.1`

### Requirement: Escape closes native dialogs

The user MUST be able to close any Suite dialog with the host's native Escape handling; no custom exit binding is required or registered.

#### Scenario: Escape from any screen

- GIVEN any Suite dialog is open
- WHEN the user presses Escape
- THEN the dialog closes via the host's native handling
