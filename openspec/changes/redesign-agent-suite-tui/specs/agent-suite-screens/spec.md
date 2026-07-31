# Agent Suite Screens Specification

## Purpose

Own the Suite de Agentes terminal surface — a framed, keyboard-navigable flow that degrades to the host-dialog chain when no renderer is available.

## Requirements

### Requirement: Suite entry opens the owned screen flow

Both Alt+S and `/agent-suite` MUST open the same owned landing screen; neither MUST bypass the flow.

#### Scenario: Hotkey entry

- GIVEN the plugin is loaded
- WHEN the user presses Alt+S
- THEN the landing opens in the owned mount

#### Scenario: Command entry

- GIVEN the plugin is loaded
- WHEN the user runs `/agent-suite`
- THEN the same landing opens

### Requirement: Keyboard focus and navigation model

Every navigable screen MUST show an explicit focus indicator; arrows move focus, Enter selects, Esc/back returns. Esc on the landing closes without mutation; back unwinds the state machine (effort→model→detail→catalog→landing) without committing selections.

#### Scenario: Cancel closes without mutation

- GIVEN an uncommitted modify-effort selection
- WHEN the user presses Esc
- THEN the flow returns to the previous screen and nothing is persisted

#### Scenario: Landing cancel

- GIVEN the landing is open
- WHEN the user presses Esc
- THEN the flow closes with no mutation

### Requirement: Responsive layout adapts to terminal size

Grid screens MUST use three columns at ≥100 columns, two at 70–99, one below 70; the landing MUST render compact below 20 terminal rows.

#### Scenario: Wide terminal

- GIVEN a 110-column terminal
- WHEN the catalog renders
- THEN the grid shows three columns

#### Scenario: Narrow terminal

- GIVEN a 60-column terminal
- WHEN the catalog renders
- THEN a single-column list renders

#### Scenario: Short terminal

- GIVEN a 16-row terminal
- WHEN the landing renders
- THEN a compact landing is shown

### Requirement: Page overflow pagination

Rows exceeding one page MUST paginate with a `Más…` affordance that advances pages and is hidden or disabled at the last page.

#### Scenario: Overflow shows more

- GIVEN the catalog exceeds one page
- WHEN the first page renders
- THEN `Más…` is offered and advances the page

### Requirement: Native-dialog degraded fallback

When the owned renderer is unavailable, each screen MUST fall back to the existing native host-dialog chain without crashing or losing catalog access.

#### Scenario: No renderer available

- GIVEN the host provides no preferred renderer
- WHEN any screen attempts to mount
- THEN the legacy dialog chain renders and the flow stays usable

### Requirement: Theme-token color contrast

All screen colors MUST come from theme tokens (border, focused-border, text, muted-text, error); no hardcoded literals, preserving contrast across themes.

#### Scenario: Token-only rendering

- GIVEN any installed theme
- WHEN a screen renders
- THEN every color resolves to a theme token

### Requirement: Modify agent flow

Model then effort selection MUST be separate screens, returning to detail on completion, cancellable at either step.

#### Scenario: Advance then cancel

- GIVEN the modify-model screen for an agent
- WHEN the user advances to effort then presses Esc
- THEN the flow returns to detail without persisting the model choice

### Requirement: Delete confirmation defaults to No

The delete confirmation MUST default its selection and initial focus to `No`; no deletion unless the user explicitly chooses `Sí`.

#### Scenario: Default declines

- GIVEN the delete confirmation screen
- WHEN the user presses Enter without moving focus
- THEN deletion is declined and the agent remains

### Requirement: Create agent flow

A structured multi-step create flow MUST return to the catalog on save and abort with no persisted agent when cancelled.

#### Scenario: Save returns to catalog

- GIVEN the create steps are complete
- WHEN the user saves
- THEN the new agent appears in the catalog

#### Scenario: Cancel aborts creation

- GIVEN the user is mid-create
- WHEN the user presses Esc
- THEN no agent is persisted
