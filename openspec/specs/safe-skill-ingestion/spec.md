# Safe Skill Package Utilities Specification

## Purpose

Provide reusable validation and installation utilities for externally supplied skill packages. These utilities are not a Suite de Agentes TUI workflow.

## Requirements

### Requirement: Validate external packages

The utility API MUST validate externally supplied skill packages before installation. Validation MUST reject invalid identifiers, unsafe paths, duplicate paths, invalid `SKILL.md` frontmatter, and prohibited executable content.

#### Scenario: Reject unsafe package content

- GIVEN an external integration supplies a package with path traversal or prohibited shell content
- WHEN package validation runs
- THEN validation rejects the package before disk writes

### Requirement: Install only approved immutable plans

The generic installer MUST require an approved, frozen integration plan plus caller-provided validation and assignment callbacks. It MUST constrain writes to the configured OpenCode skill directory, reject symbolic-link escapes, roll back failed writes, and append a summarized audit record.

#### Scenario: Roll back a failed external installation

- GIVEN an approved immutable plan writes a valid package
- WHEN the caller-provided post-install validation fails
- THEN prior files are restored and the assignment callback is not completed

### Requirement: No Suite UI ingestion

The Suite catalog MUST NOT fetch, recommend, generate, install, assign, resolve conflicts for, or ingest skills. External integrations decide whether and how to use these generic utilities.
