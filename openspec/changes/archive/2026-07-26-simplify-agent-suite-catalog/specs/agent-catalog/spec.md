# Agent Catalog Specification

## Purpose

Provide a small, independent Suite de Agentes surface that does not expose OpenCode runtime, SDD, review, Judgment Day, fallback, or orchestrator agents.

## Requirements

### Requirement: Two-option Alt+S entry point

The system MUST render exactly two root options in the Alt+S Suite de Agentes surface: `Catálogo` and `Crear agente`. It MUST NOT render suite, profile, model-assignment, or other CRUD options.

#### Scenario: Open the suite menu

- GIVEN the plugin is loaded and the user presses Alt+S
- WHEN the root surface opens
- THEN the visible options are exactly `Catálogo` and `Crear agente`
- AND the labels remain in Spanish with the stated accents

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
