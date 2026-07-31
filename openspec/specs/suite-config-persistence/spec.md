# Suite Config Persistence Specification

## Purpose

Persist only the independent Suite de Agentes custom-agent registry while protecting users from silent legacy assignment loss.

## Requirements

### Requirement: Minimal registry shape

The persisted configuration MUST contain only `version` and `customAgents`. The system MUST default to `{ version: 1, customAgents: {} }` when no configuration exists and MUST reject unknown legacy suite/profile fields rather than treating them as active behavior.

#### Scenario: Read the minimal shape

- GIVEN persistence contains version `1` and a custom-agent registry
- WHEN the configuration is loaded
- THEN the same registry is returned without suites, active suite, profiles, or model assignments

#### Scenario: Missing configuration

- GIVEN the configuration file does not exist
- WHEN the registry is loaded
- THEN the minimal empty shape is returned
- AND no global OpenCode or SDD configuration is changed

### Requirement: Safe legacy handling

An empty legacy suite configuration MUST be convertible to the minimal shape on a successful write. A legacy configuration containing any real suite assignment or model mapping MUST be rejected visibly in Spanish, MUST leave the source data untouched, and MUST NOT silently discard or mutate user data.

#### Scenario: Convert empty legacy data

- GIVEN legacy suite fields exist but all suite assignments are empty
- WHEN the user performs a valid write
- THEN the saved result is the minimal shape
- AND the legacy source is replaced only by that successful atomic write

#### Scenario: Reject non-empty assignments

- GIVEN legacy data contains one or more agent-to-model assignments
- WHEN the configuration is loaded or saved
- THEN the operation fails with a clear Spanish rejection
- AND no write, deletion, or automatic migration occurs

### Requirement: Validate custom-agent identifiers

The registry MUST reject invalid custom-agent IDs and duplicate IDs before persistence. IDs MUST satisfy the existing agent identifier rules, and duplicate detection MUST be applied across seed and custom membership as well as within the submitted custom registry.

#### Scenario: Invalid or duplicate submission

- GIVEN a custom registry contains an invalid ID or two entries with the same ID
- WHEN the registry is validated
- THEN persistence is rejected with a testable validation error
- AND the previously persisted registry remains unchanged

### Requirement: Atomic persistence

The system MUST validate the complete minimal registry before writing and MUST publish it atomically. A failed validation or interrupted write MUST NOT expose a partial configuration.

#### Scenario: Successful replacement

- GIVEN a valid minimal registry
- WHEN it is saved
- THEN readers observe either the previous complete registry or the new complete registry
- AND no intermediate or partially written shape is observable

#### Scenario: Failed save preserves data

- GIVEN a registry fails validation or the write cannot complete
- WHEN persistence returns the error
- THEN the prior persisted bytes remain available
- AND no custom agent data is lost
