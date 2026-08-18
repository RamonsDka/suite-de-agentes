# Safe Skill Ingestion Specification

## Purpose

Enforce security boundaries, structural validation, bounded integration plans, automatic rollback, and audit logging for imported and AI skills.

## Requirements

### Requirement: Untrusted Ingestion and Network Safety

The system MUST support importing skills from GitHub repository and direct HTTPS `SKILL.md` URLs. Network requests MUST enforce HTTPS-only, block private/loopback/link-local IPs (anti-SSRF), restrict redirect chains, and enforce payload size limits. Remote content and AI code MUST remain untrusted drafts until user approval.

**User Story:** As a system administrator, I want strict network boundaries so that imports cannot reach private networks.

#### Acceptance & Edge Case Checklist
- [ ] Enforces HTTPS-only and blocks private, loopback, and link-local IPs.
- [ ] Restricts redirects and caps payload sizes.
- [ ] Draft content remains unapplied until approved.

#### Scenario: Ingest from valid HTTPS URL
- GIVEN a valid public HTTPS URL pointing to `SKILL.md`
- WHEN user initiates import
- THEN content downloads into an in-memory staging buffer

#### Scenario: Block SSRF targeting private IP address
- GIVEN an import URL resolving to a private IP
- WHEN network validation runs
- THEN the request is blocked immediately with a security error

---

### Requirement: Structural and Security Pre-validation

The system MUST run mandatory structural and security pre-validation on candidate skill packages before installation. Pre-validation MUST verify package structure, frontmatter schemas, prevent path traversal outside skill directories, and enforce a hard deny policy on prohibited shell commands.

**User Story:** As a user, I want automated validation checks so that dangerous skills are blocked before disk writes.

#### Acceptance & Edge Case Checklist
- [ ] Validates frontmatter schema and manifest fields.
- [ ] Rejects paths attempting directory traversal (`../`).
- [ ] Blocks packages containing prohibited shell patterns.

#### Scenario: Reject skill with path traversal
- GIVEN a candidate skill referencing parent directories
- WHEN pre-validation runs
- THEN the package is rejected with an invalid path error

#### Scenario: Hard deny on prohibited shell patterns
- GIVEN a candidate skill containing destructive commands
- WHEN security pre-validation runs
- THEN the package is blocked with a security error

---

### Requirement: Bounded Integration Plan and Auto-Rollback

The system MUST generate an immutable, bounded integration plan summarizing file writes, config changes, and skill assignments requiring single explicit user approval. Installation MUST run a bounded post-install test. If validation fails, the system MUST automatically roll back all written files. External credentials MUST remain manual outside Suite.

**User Story:** As a user, I want an approved plan and auto-rollback so that failed installations leave no residue.

#### Acceptance & Edge Case Checklist
- [ ] Plan lists target paths and assignments.
- [ ] Single explicit approval executes installation.
- [ ] Test failure triggers automatic rollback.
- [ ] External credentials stay manual outside Suite.

#### Scenario: Successful integration with post-install test
- GIVEN an approved integration plan
- WHEN files are written and post-install test passes
- THEN the skill is activated and assigned to the active agent

#### Scenario: Automatic rollback on test failure
- GIVEN an integration plan is executing
- WHEN post-install validation fails
- THEN all created files are removed and prior state restored

---

### Requirement: Append-Only Audit Logging

The system MUST maintain an append-only, summarized audit log recording all skill imports, creations, approvals, rejections, and rollbacks with timestamps, sources, and outcomes.

**User Story:** As a system administrator, I want an audit trail of skill actions so that I can inspect lineage and outcomes.

#### Acceptance & Edge Case Checklist
- [ ] Audit entries append without mutating past records.
- [ ] Records timestamp, identifier, source, action, and result.

#### Scenario: Record skill installation in audit log
- GIVEN a skill is approved and integrated
- WHEN integration completes
- THEN an audit entry recording timestamp, identifier, source, and outcome is appended
