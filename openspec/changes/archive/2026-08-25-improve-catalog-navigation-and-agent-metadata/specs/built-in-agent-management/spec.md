# Delta for built-in-agent-management

## MODIFIED Requirements

### Requirement: Canonical Built-In Agent Registry and Presentation

The system MUST manage seven built-ins `general`, `build`, `plan`, `explore`, `compaction`, `title`, `summary` plus seed `agent-github` (canonical ID and exact visible label `agent-github`). It MUST preserve lowercase IDs; seven displays MUST be capitalized (`General`, `Build`, `Plan`, `Explore`, `Compaction`, `Title`, `Summary`) and GitHub display MUST be exactly `agent-github`. Legacy `agent-especialit-github` MUST be input-only and MUST NOT appear in detail screens, diagnostics, or newly created filenames/content. Each of eight MUST provide editable Spanish descriptions, operations, model, effort, skill assignments. All eight MUST have accurate non-duplicative metadata; `agent-github` MUST bind `github-review-orchestration`, `issue-creation`, `branch-pr`, `chained-pr` with least-privilege/SHA-pinning guidance, and MUST NOT claim push.
(Previously: seven agents only, without eight-agent accuracy; display was `Agent-Github`.)

**User Story:** As user, I want metadata tied to installed skills.

#### Acceptance & Edge Case Checklist
- [ ] Lowercase IDs preserved; seven capitalized, `agent-github` exactly lowercase.
- [ ] Eight agents have accurate non-duplicative Spanish metadata.
- [ ] `agent-github` binds correct skills with Actions guidance and no push claim.

#### Scenario: Display and edit canonical built-in agent
- GIVEN canonical `plan` exists
- WHEN user inspects configuration
- THEN `Plan` and metadata shown and model/effort/operations editable

#### Scenario: GitHub specialist binding
- GIVEN `agent-github` inspected
- WHEN metadata reviewed
- THEN skills are `github-review-orchestration`, `issue-creation`, `branch-pr`, `chained-pr` with `gh` workflows and pinning guidance

#### Scenario: No duplicative claims
- GIVEN audit of eight agents
- WHEN descriptions compared
- THEN no duplicate responsibility and no reference to uninstalled external assets

#### Scenario: Legacy input normalization for definitions
- GIVEN definition exists only under legacy filename `agent-especialit-github.md`
- WHEN registry loads it
- THEN normalized to `agent-github` with legacy gap-fill only

#### Scenario: Zero legacy in visible output and new files
- GIVEN legacy file/content or alias present
- WHEN new file materialized or diagnostic rendered
- THEN filename, content, diagnostic contain only `agent-github`; zero legacy

## ADDED Requirements

### Requirement: Customization-Preserving Baseline Update

The system MUST update installed definitions to curated baselines while preserving identifiable manual customizations. Canonical fields MUST win; legacy MUST fill only missing fields. Migration MUST be idempotent, atomic, recoverable, and handle partial/malformed legacy and conflicts without loss or duplicate identity.

**User Story:** As user with customizations, I want baseline improvements without losing edits, safely re-runnable.

#### Acceptance & Edge Case Checklist
- [ ] Customizations preserved; canonical precedence honored.
- [ ] Idempotent, atomic, no duplicate identity.
- [ ] Partial/malformed legacy handled.

#### Scenario: Preserve customization
- GIVEN installed `explore` has custom description
- WHEN baseline refresh runs
- THEN custom description remains, other fields updated

#### Scenario: Gap-fill and idempotence
- GIVEN definition has canonical `operations` and legacy `description` and migration run twice
- WHEN merged
- THEN canonical `operations` retained, legacy fills only missing, second run unchanged and no duplication

### Requirement: Internal Agent Safe Capability Boundaries

`compaction`, `title`, `summary` MUST support silent durable memory, contextual quality, session auditing, reads, and allowlisted read-only commands. They MUST NOT edit, delegate, use destructive commands, or obtain unrestricted shell. They MUST preserve OpenCode contracts, avoid noisy/duplicate memory, and handle unavailable memory services and denied commands gracefully.

**User Story:** As operator, I want internal agents to capture context silently without risky side effects.

#### Acceptance & Edge Case Checklist
- [ ] Silent memory, quality, auditing, reads, allowlisted commands allowed.
- [ ] Edit/delegate/destructive/unrestricted shell denied.
- [ ] No noisy/duplicate memory; unavailable service handled.

#### Scenario: Allow silent capture
- GIVEN `compaction` invoked post-session
- WHEN it captures summary via allowlisted reads
- THEN durable memory written silently without delegation

#### Scenario: Deny prohibited action
- GIVEN `title` attempts edit or delegation
- WHEN gated
- THEN denied with auditable error and no side effect

#### Scenario: Unavailable memory
- GIVEN memory service unavailable during `compaction`
- WHEN capture attempted
- THEN degrades gracefully and reports recoverable status
