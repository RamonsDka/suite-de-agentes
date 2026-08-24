# Built-In Agent Management Specification

## Purpose

Provide structured classification, configuration, protected deactivation, baseline restoration, and safe discovery for OpenCode built-in agents.

## Requirements

### Requirement: Canonical Built-In Agent Registry and Presentation

The system MUST manage the canonical set of seven OpenCode built-ins: `general`, `build`, `plan`, `explore`, `compaction`, `title`, and `summary`. The system MUST preserve lowercase runtime IDs and display proper capitalized names (`General`, `Build`, `Plan`, `Explore`, `Compaction`, `Title`, `Summary`). Each built-in MUST provide editable curated Spanish descriptions, operations, model, effort, and skill assignments.

#### Acceptance & Edge Case Checklist
- [ ] Preserves lowercase runtime IDs for all seven canonical agents.
- [ ] Displays capitalized display names and curated Spanish metadata.
- [ ] Supports editing model, effort, operations, and assigned skills.

#### Scenario: Display and edit canonical built-in agent
- GIVEN the canonical built-in agent `plan` exists
- WHEN the user inspects its configuration in the Suite interface
- THEN display name `Plan` and curated Spanish metadata are shown
- AND the user can update its model, effort, or operations

### Requirement: Internal Agent Protection and Advanced Override

The system MUST classify `compaction`, `title`, and `summary` as internal system agents, and `general`, `build`, `plan`, and `explore` as subagents. The system MUST require an explicit advanced override confirmation before allowing deactivation of internal agents.

#### Acceptance & Edge Case Checklist
- [ ] Classifies `compaction`, `title`, and `summary` as internal system agents.
- [ ] Blocks disabling internal agents without advanced override confirmation.
- [ ] Allows disabling standard subagents without advanced override.

#### Scenario: Attempt disabling internal agent without override
- GIVEN `compaction` is enabled and advanced override is inactive
- WHEN the user attempts to disable `compaction`
- THEN the system prompts for advanced override confirmation and remains enabled if canceled

### Requirement: Per-Agent Baseline Restoration

The system MUST provide a per-agent restore action that resets an edited built-in agent back to its curated baseline metadata, model, effort, operations, and skills.

#### Acceptance & Edge Case Checklist
- [ ] Restores curated baseline fields for the target agent only.
- [ ] Leaves other built-in and custom agents unchanged.

#### Scenario: Restore modified agent to baseline
- GIVEN `explore` has customized model and operation settings
- WHEN the user invokes baseline restoration for `explore`
- THEN `explore` resets to its original curated baseline values

### Requirement: Future Built-In Discovery and Curation

The system MUST automatically discover unclassified OpenCode built-in agents, assigning generic Spanish metadata, a pending-curation marker, and conservative warnings without making uncurated capability claims.

#### Acceptance & Edge Case Checklist
- [ ] Discovers new runtime built-ins not in the canonical registry.
- [ ] Flags them as pending curation with generic Spanish metadata.
- [ ] Shows warnings and avoids false role or permission claims.

#### Scenario: Discovered new built-in agent
- GIVEN runtime introduces a new built-in agent `indexer`
- WHEN the runtime inventory is synchronized
- THEN `indexer` is registered with pending curation status and generic Spanish metadata
