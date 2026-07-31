# Agent Effort Options Specification

## Purpose

Derive the set of selectable agent effort options from runtime capability, normalized to a fixed vocabulary and ordered by a fixed display sequence, without inventing unsupported variants.

## Requirements

### Requirement: Fixed effort display order

The system MUST present effort options in the fixed order `default, none, low, high, xhigh, max`. `default` MUST always appear first regardless of the order reported by the runtime. The system MUST NOT reorder options by runtime position.

#### Scenario: Default always first

- GIVEN the runtime returns variants `[max, low]`
- WHEN effort options are derived
- THEN the display order is `default, low, max`

### Requirement: Capability-driven filtering

The system MUST show only effort variants that are both reported by the runtime and members of the fixed vocabulary `{default, none, low, high, xhigh, max}`. The system MUST NOT display any variant absent from the runtime, and MUST NOT invent variants the runtime does not report.

#### Scenario: Unsupported variant dropped

- GIVEN the runtime reports `[low, high, turbo]`
- WHEN options are derived
- THEN `turbo` is absent and only `default, low, high` remain

#### Scenario: Empty runtime

- GIVEN the runtime reports no variants
- WHEN options are derived
- THEN only `default` is offered

### Requirement: Effort variant normalization

The system MUST map raw runtime variant keys to the canonical vocabulary before display. Keys that do not map to a canonical entry MUST be dropped rather than surfaced as unknown options.

#### Scenario: Normalize raw keys

- GIVEN the runtime variants include keys that differ in casing or aliasing but map to known effort levels
- WHEN the options are normalized
- THEN each maps to its canonical vocabulary entry
- AND the fixed display order is preserved
