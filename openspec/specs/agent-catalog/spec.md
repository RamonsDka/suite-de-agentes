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

### Requirement: Scoped membership and external refresh

The catalog MUST contain only the Suite seed members `general` and `agent-especialit-github` plus custom agents held in the Suite registry. It MUST exclude unrelated runtime agents, including orchestrator, SDD, review, Judgment Day, and fallback agents. A seed or registered custom agent absent from the runtime MUST remain visible with its accurate unavailable or not-materialized status.

The controller MUST reload persisted Suite configuration when the catalog is opened or refreshed so agents added externally by the user's orchestrator appear without becoming runtime-wide catalog members.

#### Scenario: Refresh an externally managed agent

- GIVEN the external orchestrator adds a valid custom agent to persisted Suite configuration
- WHEN the catalog is opened or refreshed
- THEN the agent appears if it belongs to the Suite registry
- AND unrelated runtime agent IDs remain absent

### Requirement: Searchable Spanish catalog and preserved details

The catalog MUST preserve the incumbent compact Spanish search, pagination, list, and detail presentation. Search MUST filter catalog names case-insensitively. Agent details MUST display identity, description, skills, operations, status, current model, and current effort.

#### Scenario: Inspect a filtered agent

- GIVEN multiple catalog members exist
- WHEN the user searches by a partial agent name and opens a matching row
- THEN only matching rows are listed
- AND the existing structured detail layout displays the agent's current data

### Requirement: Read-only details

Agent details MUST be read-only. The only actions MUST be `Cambiar modelo y esfuerzo` and `Volver`. The TUI MUST NOT offer agent creation, renaming, description, skills, or operations editing, deletion, activation changes, materialization, AI assistance, coordinator configuration, or skill picking.

#### Scenario: View an agent's actions

- GIVEN the user opens any catalog member
- WHEN its detail actions render
- THEN the actions are exactly `Cambiar modelo y esfuerzo` and `Volver`

### Requirement: Atomic provider-model-effort assignment

Selecting `Cambiar modelo y esfuerzo` MUST guide the user through provider, model, and effort screens. Models MUST be limited to the selected provider and use fully-qualified `provider/model` values. Effort choices MUST be derived from the selected model's supported variants.

The final effort selection MUST persist model and effort through one atomic controller mutation, refresh the catalog data, and return to the same agent's info screen. The TUI MUST NOT persist model and effort through separate mutations.

#### Scenario: Change an assignment

- GIVEN an agent detail screen and runtime providers with supported model variants
- WHEN the user selects a provider, a model, and an effort level
- THEN the saved assignment contains the selected fully-qualified model and effort together
- AND the user returns to the same read-only agent detail screen

### Requirement: Version, fallback, and current-turn consent

The Suite sidebar and catalog shell MUST display the plugin version. If the preferred renderer is unavailable, the host-compatible fallback MUST fail safely without crashing the host.

Current-turn consent behavior MUST remain unchanged: user-controlled Suite members require an exact same-turn grant, while the exact maintainer-configured internal Gentle-AI allowlist remains the exception. Catalog navigation MUST NOT grant standing consent or weaken server-side per-target checks.

#### Scenario: Invoke a user-controlled member with consent

- GIVEN `gentle-orchestrator` targets `agent-especialit-github`
- WHEN the current turn lacks `usa también agente: agent-especialit-github`
- THEN the task is denied
- WHEN that exact grant is present in the same turn
- THEN the existing consent-safe invocation path is allowed
