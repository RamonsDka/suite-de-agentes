# Agent Suite Screens Specification (Delta)

> Delta spec for SDD change `fix-agent-suite-tui-runtime-bugs`. Modifies requirements from the `agent-suite-screens` capability delivered by `redesign-agent-suite-tui`. On archive, these MODIFIED/ADDED requirements replace/extend the corresponding entries in the main capability spec.

## MODIFIED Requirements

### Requirement: Responsive layout adapts to terminal size

Grid and landing screens MUST derive their responsive layout decisions (compact/row layout, column count, page size — both width and height) from the actual on-screen box the host allocates to the mounted Dialog, not from the raw full-terminal renderer dimensions, whenever those two differ. If the host does not expose the allocated Dialog box size, the plugin MUST request `size: "xlarge"` and treat that as the full-bleed contract it relies on, rather than silently assuming `"large"` equals the full terminal.

#### Scenario: Dialog box smaller than the full terminal

- GIVEN the host renders the Suite dialog at `size: "large"` inside a terminal window taller/wider than that allocated box
- WHEN the landing or catalog screen computes its compact/column/page-size layout
- THEN the computed layout fits within the Dialog's real allocated box and does not overflow past its border

#### Scenario: Catalog page size respects vertical space

- GIVEN a Dialog box shorter than the full terminal height
- WHEN the catalog screen computes how many rows fit on one page
- THEN the page size is bounded by the Dialog's real allocated height, not the full-terminal height

### Requirement: Keyboard focus and navigation model

Every navigable screen MUST show an explicit focus indicator; arrows move focus, Enter selects, Esc/back returns. Esc on the landing closes without mutation; back unwinds the state machine (effort→model→detail→catalog→landing) without committing selections. Selection/navigation handlers triggered from inside a screen's own keyboard-event callback MUST NOT synchronously mutate the host dialog stack (`dialog.clear()`/`dialog.replace()`) from within that same callback invocation; the mutation MUST be deferred to a subsequent microtask/tick so the event dispatcher that is currently invoking the handler is never mutated mid-dispatch. Every screen's keyboard handler MUST call `preventDefault()` consistently on every handled key branch (not only on a subset), so no screen's Enter/arrow handling silently differs from the others.

#### Scenario: Cancel closes without mutation

- GIVEN an uncommitted modify-effort selection
- WHEN the user presses Esc
- THEN the flow returns to the previous screen and nothing is persisted

#### Scenario: Landing cancel

- GIVEN the landing is open
- WHEN the user presses Esc
- THEN the flow closes with no mutation

#### Scenario: Enter selection does not mutate the dialog stack mid-dispatch

- GIVEN any screen with a focused, selectable item
- WHEN the user presses Enter
- THEN the resulting `dialog.clear()`/`dialog.replace()` navigation happens after the current keypress dispatch completes, not synchronously inside the keypress callback

#### Scenario: Landing keyboard handling is consistent with other screens

- GIVEN the landing screen is open
- WHEN the user presses an arrow key or Enter
- THEN `preventDefault()` is called for that key, matching the behavior of every other screen

### Requirement: Suite dialog always has a guaranteed exit path

The Suite dialog MUST be closable through a host-level keybinding that does not depend solely on an embedded screen's own Escape handler successfully receiving and processing the raw key event.

#### Scenario: Guaranteed exit works even if the embedded Escape handler does not fire

- GIVEN the Suite dialog is open on any screen
- WHEN the user invokes the guaranteed host-level exit binding
- THEN the Suite dialog closes and control returns to the host, independent of whether the embedded screen's own `useKeyboard` Escape branch executed

## ADDED Requirements

### Requirement: Catalog pagination supports moving backward

The catalog screen MUST let the user page both forward and backward through the agent list when the catalog spans more than one page, without requiring the user to close and reopen the Suite dialog.

#### Scenario: Paging back after paging forward

- GIVEN a catalog with more agents than fit on one page
- WHEN the user pages forward and then requests the previous page
- THEN the previously seen page of agents is shown again

### Requirement: Renderer-unavailable failures are diagnosable

When the custom OpenTUI renderer is unavailable for a screen mount, the plugin MUST emit at least one diagnostic signal (not necessarily per-occurrence) so the condition is discoverable during development/support, instead of being fully silent.

#### Scenario: Renderer missing is logged at least once

- GIVEN the custom renderer throws "No renderer found" for a screen mount
- WHEN the plugin falls back to the legacy dialog flow
- THEN at least one diagnostic log entry records that the renderer was unavailable
