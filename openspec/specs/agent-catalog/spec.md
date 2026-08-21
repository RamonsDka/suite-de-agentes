# Agent Catalog Specification

## Purpose

Provide a small, independent Suite de Agentes surface that does not expose OpenCode runtime, SDD, review, Judgment Day, fallback, or orchestrator agents.

## Requirements

### Requirement: Two-option Alt+S entry point

The system MUST render exactly three root options in the Alt+S Suite de Agentes surface: `Catálogo`, `Crear agente`, and `⚙ Configuración`. It MUST NOT render legacy suite, profile, model-assignment, or other CRUD options.

**User Story:** As a user, I want direct access to settings from the Alt+S root menu so that I can configure the coordinator and manage suite capabilities easily.

#### Acceptance & Edge Case Checklist
- [ ] Root surface displays exactly `Catálogo`, `Crear agente`, and `⚙ Configuración`.
- [ ] Spanish labels and accents are preserved.

#### Scenario: Open the suite menu

- GIVEN the plugin is loaded and the user presses Alt+S
- WHEN the root surface opens
- THEN the visible options are exactly `Catálogo`, `Crear agente`, and `⚙ Configuración`
- AND the labels remain in Spanish with the stated accents and icons

### Requirement: Configuration Submenu Navigation

The system MUST open a dedicated `⚙ Configuración` screen when selected from the root menu, providing options for coordinator model setup, skill management, and visual status.

**User Story:** As a user, I want a structured configuration screen so that I can configure settings without cluttering the main catalog surface.

#### Acceptance & Edge Case Checklist
- [ ] Opens configuration screen upon selection from root menu.
- [ ] Supports clean navigation back to the root menu.

#### Scenario: Navigate to Configuration screen

- GIVEN the user is on the Alt+S root menu
- WHEN the user selects `⚙ Configuración`
- THEN the configuration submenu opens displaying settings options and status
- AND the user can navigate back to the root menu

---

### Requirement: Scoped catalog membership

The catalog MUST include the seed members `general` and `agent-especialit-github`, plus every custom agent created through this plugin. It MUST exclude every other runtime agent, including `gentle-orchestrator`, IDs beginning `sdd-`, `review-`, or `jd-`, IDs ending `-fallback`, and agents not owned by the plugin.

#### Scenario: Filter the runtime inventory

- GIVEN the runtime inventory contains seed, custom, SDD, review, Judgment Day, fallback, orchestrator, and unrelated IDs
- WHEN `Catálogo` is opened
- THEN only the two seeds and plugin-created custom members are listed
- AND excluded IDs are absent regardless of their runtime descriptions

#### Scenario: Seed runtime agent is absent

- GIVEN a seed member is configured as Suite de Agentes membership but is absent from the current runtime inventory
- WHEN the catalog is opened
- THEN the seed remains listed with a not-materialized/unavailable state
- AND the catalog does not replace it with an unrelated runtime agent

### Requirement: Spanish compact catalog interaction

The catalog MUST be compact, scrollable, and Spanish. Each row MUST expose a detail action and actions appropriate to its membership and materialization state. A custom member not present in the runtime MUST visibly indicate that it is created but not materialized and MUST offer materialization; custom deletion MUST NOT apply to seed members.

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

### Requirement: Version footer and host fallback

The catalog and Suite de Agentes sidebar MUST show the plugin version in a footer. Rendering MUST degrade to the host-compatible fallback when the preferred renderer or slot is unavailable, without crashing or omitting catalog access.

#### Scenario: Renderer is unavailable

- GIVEN the host does not provide the preferred slot renderer
- WHEN the Suite de Agentes surface renders
- THEN the host-compatible fallback renders the catalog or its navigation safely
- AND the plugin version remains visible wherever the fallback supports a footer

### Requirement: Exact current-turn consent

The change MUST preserve current-turn consent for user-controlled Suite de Agentes members: invoking `agent-especialit-github` or a plugin-created custom member from the orchestrator requires the exact same-turn grant `usa también agente: <id>`. The configured internal Gentle-AI system is the maintainer-authorized exception: its exact primary/fallback SDD, review/refuter, and Judgment Day names are automatically allowed. The catalog MUST NOT create standing consent or weaken the per-target server check for user agents.

#### Scenario: Invoke without and with consent

- GIVEN the orchestrator targets `agent-especialit-github`
- WHEN the current turn lacks the exact grant
- THEN invocation is denied
- WHEN the same turn contains `usa también agente: agent-especialit-github`
- THEN the existing consent-safe materialization and invocation path is allowed

#### Scenario: Invoke an authorized internal agent without consent

- GIVEN the orchestrator targets one exact configured internal SDD, review/refuter, or Judgment Day primary/fallback name
- WHEN the current message has no consent grant
- THEN the task gate allows that exact internal name
- AND a lookalike name such as `sdd-evil` remains denied

### Requirement: AI Interview Navigation from Crear Agente

When the user selects `Crear agente` from the root menu, the system MUST verify coordinator configuration. If configured, the system MUST navigate directly to the `ai-interview` screen. If unconfigured, the system MUST display the coordinator gating prompt (`Configurar ahora` and `Cancelar`) and MUST NOT launch a legacy creation wizard or fallback form.

#### Scenario: Navigate to AI interview when coordinator configured
- GIVEN the AI coordinator is configured
- WHEN the user selects `Crear agente` from the root menu
- THEN the system navigates directly to the `ai-interview` screen

#### Scenario: Gate Crear agente when coordinator unconfigured
- GIVEN the AI coordinator is unconfigured
- WHEN the user selects `Crear agente` from the root menu
- THEN the system displays the gating prompt with `Configurar ahora` and `Cancelar`
- AND selecting `Cancelar` returns to the root menu without launching a creation wizard
