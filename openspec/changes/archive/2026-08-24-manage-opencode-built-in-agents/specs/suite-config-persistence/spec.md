# Delta for Suite Config Persistence

## ADDED Requirements

### Requirement: Validate Built-In Overrides and Configuration Migration

The system MUST validate built-in overrides (`builtInOverrides`), disabled agent IDs (`disabledAgents`), and advanced override flags (`advancedOverrides`) prior to persistence. If legacy keys such as `baseOverrides` are encountered in configuration, the system MUST automatically migrate them to `builtInOverrides` without loss of user customizations. Invalid built-in override keys or non-existent built-in IDs MUST be rejected before writing.

#### Acceptance & Edge Case Checklist
- [ ] Validates `builtInOverrides`, `disabledAgents`, and `advancedOverrides`.
- [ ] Automatically migrates legacy `baseOverrides` to `builtInOverrides`.
- [ ] Rejects malformed override payloads before disk persistence.

#### Scenario: Migrate legacy baseOverrides
- GIVEN a persisted configuration containing legacy `baseOverrides` for `build`
- WHEN the configuration is loaded and saved
- THEN the overrides are preserved under `builtInOverrides`
- AND no custom or built-in settings are lost

#### Scenario: Reject invalid built-in override
- GIVEN an override submission targeting an unknown agent `invalid-agent`
- WHEN configuration validation is executed
- THEN persistence is blocked with a validation error

## MODIFIED Requirements

### Requirement: Minimal registry shape

The persisted configuration MUST contain `version`, `customAgents`, an optional `coordinator` object, optional `builtInOverrides`, optional `disabledAgents`, and optional `advancedOverrides`. The system MUST default to `{ version: 1, customAgents: {}, builtInOverrides: {}, disabledAgents: [], advancedOverrides: {} }` when no configuration exists, MUST preserve existing configurations lacking optional sections without error, and MUST reject unknown legacy suite/profile fields.
(Previously: The persisted configuration contained only version, customAgents, and optional coordinator without built-in agent overrides or disabled agent lists.)

**User Story:** As a developer, I want the configuration schema to support optional coordinator settings so that existing agent registries remain backward-compatible.

#### Acceptance & Edge Case Checklist
- [ ] Existing configuration files without coordinator or built-in overrides load cleanly without error.
- [ ] Optional coordinator object `{ provider, model, effort? }` is accepted.
- [ ] Optional `builtInOverrides`, `disabledAgents`, and `advancedOverrides` are accepted.
- [ ] Legacy suite/profile fields remain rejected.

#### Scenario: Read the minimal shape

- GIVEN persistence contains version `1`, custom agents, and optional built-in overrides
- WHEN the configuration is loaded
- THEN the registry, overrides, and coordinator settings are loaded into memory accurately

#### Scenario: Missing configuration

- GIVEN the configuration file does not exist
- WHEN the registry is loaded
- THEN default empty registry shape with version `1` is returned
- AND no global OpenCode or SDD configuration is changed
