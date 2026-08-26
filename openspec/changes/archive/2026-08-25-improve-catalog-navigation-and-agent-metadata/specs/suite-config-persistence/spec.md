# Delta for suite-config-persistence

## MODIFIED Requirements

### Requirement: Validate Built-In Overrides and Configuration Migration

The system MUST validate `builtInOverrides`, `disabledAgents`, `advancedOverrides` prior to persistence. If legacy `baseOverrides` encountered, MUST migrate to `builtInOverrides` without loss. If `agent-especialit-github` entries exist, MUST normalize to canonical `agent-github` as input-only: canonical wins, legacy gap-fills, no duplicate identity, and migrated persisted output plus diagnostics MUST contain only `agent-github` (zero legacy). Invalid keys or non-existent IDs MUST be rejected before writing.
(Previously: only `baseOverrides` migration without GitHub alias handling or precedence rules.)

**User Story:** As developer, I want legacy and alias configurations to migrate automatically without losing customizations or creating duplicates.

#### Acceptance & Edge Case Checklist
- [ ] Validates `builtInOverrides`, `disabledAgents`, `advancedOverrides`.
- [ ] Migrates `baseOverrides` and `agent-especialit-github` to canonical without loss.
- [ ] Canonical precedence, no duplicate, zero legacy in output/diagnostics, rejects invalid keys.

#### Scenario: Migrate legacy baseOverrides
- GIVEN persisted config with legacy `baseOverrides` for `build`
- WHEN loaded and saved
- THEN overrides preserved under `builtInOverrides` and no settings lost

#### Scenario: Migrate alias with precedence
- GIVEN config contains both `agent-especialit-github` and `agent-github` overrides
- WHEN migration runs
- THEN single `agent-github` remains, canonical retained, legacy gap-fills, no duplicate

#### Scenario: Legacy input normalization
- GIVEN config contains only legacy `agent-especialit-github` entry
- WHEN migration runs
- THEN normalized to single `agent-github` with gap-filled fields

#### Scenario: Zero legacy in persisted output and diagnostics
- GIVEN migrated config originated from legacy alias
- WHEN persisted JSON and diagnostic inspected
- THEN stored JSON and diagnostic contain only `agent-github`; zero legacy

#### Scenario: Reject invalid built-in override
- GIVEN override targeting unknown `invalid-agent`
- WHEN validation executed
- THEN persistence blocked with validation error

## ADDED Requirements

### Requirement: Deterministic Merge and Idempotent Recovery

Persistence MUST merge canonical and legacy metadata deterministically (canonical-wins), be idempotent, atomic, recoverable, handle partial/malformed legacy and customization conflicts, preserve manual edits, never duplicate identity or lose data. Failed validation/write MUST leave prior bytes intact; successful migration MUST atomically replace legacy sources. Persisted store MUST contain only `agent-github`.

**User Story:** As user, I want re-runnable migration that preserves my edits and survives partial or corrupt legacy data.

#### Acceptance & Edge Case Checklist
- [ ] Deterministic merge; canonical-wins with legacy gap-fill.
- [ ] Idempotent and atomic; no duplicate identity.
- [ ] Preserves customizations; handles partial/malformed legacy.
- [ ] Failed write leaves prior bytes intact.

#### Scenario: Partial malformed legacy
- GIVEN persisted `builtInOverrides` with malformed `agent-especialit-github` fragment and valid `agent-github`
- WHEN loaded
- THEN malformed fields ignored, canonical retained, load succeeds without crash

#### Scenario: Customization conflict preservation
- GIVEN installed definition has user-edited description for `agent-github` and legacy alias differs
- WHEN merged and persisted
- THEN user-edited description preserved, canonical fills only missing fields

#### Scenario: Idempotent recovery
- GIVEN legacy config with `baseOverrides` and alias entry
- WHEN migration executed twice with interruption between
- THEN results identical, no duplicate keys, no data loss

#### Scenario: Atomic failure preservation
- GIVEN validation fails or write interrupted
- WHEN error returned
- THEN prior persisted registry unchanged and observable

### Requirement: Alias-Aware Identifier Validation

The registry MUST validate IDs after normalizing `agent-especialit-github` to `agent-github`. Duplicate detection MUST apply across normalized IDs, including seed alias collisions, and MUST reject invalid IDs before persistence.

**User Story:** As system, I want alias-aware validation to prevent duplicate or invalid identities.

#### Acceptance & Edge Case Checklist
- [ ] Normalizes alias before validation.
- [ ] Duplicate detection across normalized set.
- [ ] Invalid IDs rejected atomically.

#### Scenario: Duplicate via alias rejected
- GIVEN registry contains `agent-github` and `agent-especialit-github`
- WHEN validated
- THEN persistence rejected as duplicate canonical ID

#### Scenario: Invalid ID rejected
- GIVEN registry contains ID failing identifier rules
- WHEN validated
- THEN error returned and prior persisted state untouched
