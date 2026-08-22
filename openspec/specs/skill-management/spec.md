# Skill Management Specification

## Purpose

Keep skill information visible in the catalog while leaving all skill changes to the external orchestrator.

## Requirements

### Requirement: Read-only skill display

Agent details MUST display the skills already assigned to the agent in the existing structured detail layout. An agent with no assigned skills MUST display the established empty value.

#### Scenario: Inspect assigned skills

- GIVEN an agent has assigned skills in persisted configuration
- WHEN the user opens the agent details
- THEN the skills are displayed read-only with the rest of the agent information

### Requirement: No Suite skill workflow

The Suite TUI MUST NOT offer skill discovery, a picker, assignment or detachment, recommendations, generation, installation, conflict resolution, or pending-skill ingestion. It MUST NOT perform skill-related network or disk side effects from catalog interaction.

#### Scenario: Open agent details

- GIVEN the user opens any catalog member
- WHEN the available actions render
- THEN no skill-management action is available
- AND only model-and-effort assignment and back navigation remain

### Requirement: External ownership of skill changes

The user's external orchestrator owns agent skill changes through retained persistence and controller seams. Generic skill package validation and safe installation utilities MAY be used by external integrations, but they are not exposed as a Suite TUI workflow.

#### Scenario: Refresh externally changed skills

- GIVEN the external orchestrator updates an agent's assigned skills in valid persisted Suite configuration
- WHEN the catalog is opened or refreshed
- THEN the updated skills are displayed read-only
