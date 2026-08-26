# Agent Catalog Specification

## Purpose

Provide a focused Suite de Agentes catalog for inspecting owned agents and assigning their runtime model and effort. Agent definitions are managed outside the TUI by the user's orchestrator.

## Requirements

### Requirement: Direct catalog entry

Pressing `Alt+S`, invoking `/agent-suite`, or selecting the Suite command MUST open the searchable catalog directly. The TUI MUST NOT show a landing screen, creation action, configuration root, or coordinator setup.

#### Scenario: Open the Suite

- GIVEN the plugin is loaded
- WHEN the user opens Suite de Agentes with `Alt+S`
- THEN the first visible screen is the Spanish catalog
- AND no landing, create-agent, or configuration choice is displayed

### Requirement: Scoped catalog membership

The catalog MUST include built-ins (`general`, `build`, `plan`, `explore`, `compaction`, `title`, `summary` + discovered), seed `agent-github` (canonical ID and exact visible label `agent-github`), and custom agents. Legacy `agent-especialit-github` MUST be normalized to `agent-github` as input-only and MUST NOT appear in rows, details, permission text, or diagnostics. Coexisting entries MUST dedupe to single `agent-github` (canonical wins, legacy gap-fills). Disabled MUST be omitted; MUST exclude `gentle-orchestrator`, `sdd-*`, `review-*`, `jd-*`, `*-fallback`. Rows/details MUST render exactly `agent-github`.

#### Acceptance & Edge Case Checklist
- [ ] Lists built-ins, canonical `agent-github` (exactly `agent-github`), custom agents.
- [ ] Legacy input-only; zero legacy in rows/details/permission/diagnostics.
- [ ] Disabled and excluded IDs absent.

#### Scenario: Filter runtime inventory
- GIVEN inventory with built-in, custom, SDD, review, JD, fallback, orchestrator
- WHEN `Catálogo` opened
- THEN only built-in, seed, custom listed

#### Scenario: Seed absent
- GIVEN seed configured but absent from inventory
- WHEN catalog opened
- THEN seed listed as not-materialized/unavailable

#### Scenario: Alias deduplication
- GIVEN both `agent-especialit-github` and `agent-github` exist
- WHEN membership resolved
- THEN single `agent-github` with canonical precedence

#### Scenario: Legacy input normalization
- GIVEN inventory contains only `agent-especialit-github`
- WHEN membership resolved
- THEN catalog contains single `agent-github` with gap-filled fields

#### Scenario: Zero legacy in visible output
- GIVEN mixed legacy/canonical source
- WHEN rows, detail, permission prompt, diagnostics rendered
- THEN visible is `agent-github`; zero legacy

### Requirement: Searchable Spanish catalog and preserved details

The catalog MUST preserve the incumbent compact Spanish search, pagination, list, and detail presentation. Search MUST filter catalog names case-insensitively. Agent details MUST display identity, description, skills, operations, status, current model, and current effort.

#### Scenario: Inspect a filtered agent

- GIVEN multiple catalog members exist
- WHEN the user searches by a partial agent name and opens a matching row
- THEN only matching rows are listed
- AND the existing structured detail layout displays the agent's current data

### Requirement: Spanish compact catalog interaction

The catalog MUST be compact, scrollable, and Spanish. Each row MUST expose detail actions appropriate to its type: edit, baseline restore, and disable toggles for built-in agents; edit, delete, and materialization actions for custom agents. Disabled agents MUST NOT be selectable for execution.

#### Scenario: Inspect and materialize a custom member

- GIVEN a plugin-created custom member exists in the registry but is absent from the runtime inventory
- WHEN the user opens its detail and chooses its available action
- THEN the detail identifies the member and its not-materialized state
- AND materialization is offered without falsely reporting the member as ready

#### Scenario: Empty catalog state

- GIVEN no seed or custom member is available to render
- WHEN the user opens `Catálogo`
- THEN a compact Spanish empty-state message is shown
- AND the surface remains navigable back to the two-option root

### Requirement: Atomic provider-model-effort assignment

Selecting `Cambiar modelo y esfuerzo` MUST guide the user through provider, model, and effort screens. Models MUST be limited to the selected provider and use fully-qualified `provider/model` values. Effort choices MUST be derived from the selected model's supported variants.

The final effort selection MUST persist model and effort through one atomic controller mutation, refresh the catalog data, and return to the same agent's info screen. The TUI MUST NOT persist model and effort through separate mutations.

#### Scenario: Change an assignment

- GIVEN an agent detail screen and runtime providers with supported model variants
- WHEN the user selects a provider, a model, and an effort level
- THEN the saved assignment contains the selected fully-qualified model and effort together
- AND the user returns to the same read-only agent detail screen

### Requirement: Exact current-turn consent

The system MUST require session grants before automated dispatch to members, allowing manual invocation without confirmation. It MUST normalize `agent-especialit-github` to `agent-github` as input-only for grants/policy/session checks; user-facing grant text and diagnostics MUST contain only `agent-github`, never legacy. Internal SDD/review/refuter/Judgment Day exact names remain the maintainer-authorized exception.

#### Acceptance & Edge Case Checklist
- [ ] Dispatch requires grant (either ID same canonical).
- [ ] Manual invocation needs no grant.
- [ ] Only exact internal SDD/review/JD names bypass consent.

#### Scenario: Invoke via alias without and with grant
- GIVEN orchestrator targets alias `agent-especialit-github` with no grant
- WHEN dispatch attempted
- THEN denied; WHEN grant for `agent-github` confirmed THEN either ID succeeds

#### Scenario: Authorized internal bypass
- GIVEN orchestrator targets exact `sdd-propose`
- WHEN no grant exists
- THEN gate allows; AND `sdd-evil` denied

#### Scenario: Normalized lookup no duplicate
- GIVEN grants store legacy `agent-especialit-github`
- WHEN checking `agent-github`
- THEN succeeds via canonical lookup without duplicate

#### Scenario: Zero legacy in permission and diagnostic text
- GIVEN grant/diagnostic source contains legacy alias
- WHEN permission prompt or diagnostic rendered
- THEN visible text is only `agent-github`; zero legacy

### Requirement: Continuous Cross-Page Keyboard Navigation

The system MUST enable continuous ArrowDown/ArrowUp across pages: ArrowDown at last row MUST advance to `page+1, focus:0`; ArrowUp at `focus:0` MUST retreat to `page-1, focus:lastRow`. At first/last MUST clamp without wrap. MUST honor totals, partial pages, mouse wheel, PageUp/PageDown.

**User Story:** As user, I want continuous arrow traversal.

#### Acceptance & Edge Case Checklist
- [ ] Crosses page boundaries.
- [ ] Clamps at first/last without wrap.
- [ ] Handles filtered and partial pages.
- [ ] Coherent with mouse/PageUp/PageDown.

#### Scenario: ArrowDown crosses page
- GIVEN 14 items, page 6, `page:0, focus:5`
- WHEN ArrowDown
- THEN `page:1, focus:0`

#### Scenario: ArrowUp crosses page
- GIVEN `page:1, focus:0`
- WHEN ArrowUp
- THEN `page:0, focus:5`

#### Scenario: Clamp at boundaries
- GIVEN first `page:0, focus:0`
- WHEN ArrowUp
- THEN unchanged; ArrowDown at global last also unchanged

#### Scenario: Filtered and partial page
- GIVEN 7 filtered items, `page:0, focus:5`
- WHEN ArrowDown
- THEN `page:1, focus:0` with one row, filtered total

#### Scenario: Empty catalog
- GIVEN catalog empty
- WHEN ArrowDown or ArrowUp
- THEN no change, no error
