# Delta for Suite Config Persistence

## MODIFIED Requirements

### Requirement: Minimal registry shape

The persisted configuration MUST contain `version`, `customAgents`, and an optional `coordinator` object. The system MUST default to `{ version: 1, customAgents: {} }` when no configuration exists, MUST preserve existing configurations lacking `coordinator` without migration, and MUST reject unknown legacy suite/profile fields.

(Previously: The persisted configuration contained only `version` and `customAgents` without coordinator support.)

**User Story:** As a developer, I want the configuration schema to support optional coordinator settings so that existing agent registries remain backward-compatible.

#### Acceptance & Edge Case Checklist
- [ ] Existing configuration files without coordinator load cleanly without migration.
- [ ] Optional coordinator object `{ provider, model, effort? }` is accepted.
- [ ] Legacy suite/profile fields remain rejected.

#### Scenario: Read the minimal shape
- GIVEN persistence contains version `1`, custom agents, and an optional coordinator object
- WHEN the configuration is loaded
- THEN the registry and coordinator settings are loaded into memory accurately

#### Scenario: Missing configuration
- GIVEN the configuration file does not exist
- WHEN the registry is loaded
- THEN `{ version: 1, customAgents: {} }` is returned
- AND no global OpenCode or SDD configuration is changed

---

## ADDED Requirements

### Requirement: Validate Coordinator Configuration Shape

The system MUST validate the optional `coordinator` object upon loading and saving. The coordinator object MUST contain non-empty string fields `provider` and `model`, and MAY contain an optional string `effort`. Malformed coordinator objects MUST be rejected with a descriptive validation error before persistence.

**User Story:** As a system administrator, I want malformed coordinator settings rejected at validation time so that invalid configurations never persist to disk.

#### Acceptance & Edge Case Checklist
- [ ] Requires non-empty string fields for `provider` and `model`.
- [ ] Validates optional `effort` field as string when present.
- [ ] Validation failure blocks write and preserves prior persisted state.

#### Scenario: Reject malformed coordinator configuration
- GIVEN a configuration object with an empty provider or invalid model
- WHEN validation is performed
- THEN validation fails with a descriptive error message
- AND the prior persisted file remains untouched
