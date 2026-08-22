# Suite Config Persistence Specification

## Purpose

Persist the independent Suite agent registry and its per-agent model and effort assignments without silently discarding legacy data.

## Requirements

### Requirement: Registry and assignment shape

The active configuration shape MUST include `version`, `customAgents`, `modelAssignments`, and `variantAssignments`. It MAY include `baseOverrides` and `disabledAgents`. Missing assignment maps MUST load as empty maps. A missing configuration file MUST load as an empty version `1` registry without changing global OpenCode or SDD configuration.

#### Scenario: Load a minimal registry

- GIVEN a version `1` configuration with custom agents and no assignment maps
- WHEN it is loaded
- THEN it exposes empty model and variant assignment maps

### Requirement: Legacy coordinator compatibility

An optional legacy `coordinator` field MAY be present in persisted configuration. The system MUST preserve it as opaque compatibility data when loading and saving, but MUST NOT validate its internal shape, expose it through current controller or TUI APIs, or treat it as an active feature.

#### Scenario: Round-trip legacy data

- GIVEN a valid Suite registry that includes a legacy `coordinator` field
- WHEN the registry is loaded and saved as part of another valid change
- THEN the legacy field is retained without becoming a current configuration surface

### Requirement: Safe legacy handling

An empty legacy suite configuration MAY be replaced by a successful valid write. A legacy configuration containing real suite assignments or model mappings MUST be rejected visibly in Spanish, left untouched, and never silently migrated.

#### Scenario: Reject non-empty legacy assignments

- GIVEN legacy suite data contains an agent-to-model assignment
- WHEN it is loaded or saved
- THEN the operation fails with a clear Spanish rejection
- AND no write or automatic migration occurs

### Requirement: Agent validation and atomic writes

The registry MUST validate custom-agent identifiers, membership collisions, models, variants, base overrides, and disabled-agent references before persisting. Writes MUST be atomic: readers observe either the prior complete configuration or the new complete configuration, never a partial file.

#### Scenario: Failed save preserves data

- GIVEN a configuration fails validation or cannot complete its write
- WHEN persistence reports the error
- THEN the prior persisted bytes remain available
- AND no agent registry or assignment data is lost
