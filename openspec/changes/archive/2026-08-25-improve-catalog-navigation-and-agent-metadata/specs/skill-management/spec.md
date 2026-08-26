# Delta for skill-management

## MODIFIED Requirements

### Requirement: Recommend-First Search Hierarchy

When evaluating agent capabilities during authoring, the system MUST check matching installed skills first, deduplicate by responsibility, and present match rationales. It MUST reuse one installed skill per responsibility and complement any missing guidance via prompt or metadata updates rather than installing overlapping external assets. If no installed match exists, the system MUST record the capability as pending and MUST NOT query remote registries or generate code until post-approval ingestion.
(Previously: checked installed skills first but without responsibility deduplication, reuse complement rule, or explicit external overlap prohibition.)

**User Story:** As a developer, I want installed skills reused first with clear rationale and missing gaps complemented without redundant installs.

#### Acceptance & Edge Case Checklist
- [ ] Installed skills checked first with rationale.
- [ ] One installed skill per responsibility; duplicates avoided.
- [ ] Missing guidance complemented via prompt/metadata, not overlapping install.
- [ ] Pending state with deferred remote search until approval.

#### Scenario: Recommend installed skill
- GIVEN installed skill matches requested capability
- WHEN coordinator evaluates in interview turn
- THEN installed skill recommended with match rationale

#### Scenario: Deduplicate by responsibility
- GIVEN two installed skills overlap on PR review capability
- WHEN evaluation runs
- THEN single best match reused and duplicate not installed or assigned

#### Scenario: Defer remote search and generation during interview
- GIVEN no installed skill matches capability
- WHEN coordinator identifies it
- THEN skill tagged pending without remote fetch or generation

## ADDED Requirements

### Requirement: Agent-Github Skill Binding and Security Guidance

`agent-github` MUST use existing installed skills `github-review-orchestration`, `issue-creation`, `branch-pr`, `chained-pr` and incorporate GitHub Actions security guidance (least-privilege permissions, SHA pinning, OIDC where applicable). The system MUST NOT grant autonomous git push or unsafe delivery authority and MUST expose security checklist in operations prompt.

**User Story:** As a GitHub specialist user, I want PR/issue/CI guidance grounded in installed skills and secure Actions practices without automatic push.

#### Acceptance & Edge Case Checklist
- [ ] Binds only existing installed GitHub skills.
- [ ] Includes Actions least-privilege and SHA-pinning guidance.
- [ ] No autonomous `git push`; push remains developer-controlled.
- [ ] Prompt references `gh` CLI workflows, not MCP `mcp__github__*`.

#### Scenario: GitHub assignment
- GIVEN `agent-github` configured
- WHEN skills inspected
- THEN assigned exactly `github-review-orchestration`, `issue-creation`, `branch-pr`, `chained-pr` with no overlapping external skill

#### Scenario: Deny push authority
- GIVEN `agent-github` executes workflow guidance
- WHEN operation completed
- THEN no automatic `git push` performed and delivery authority remains denied

### Requirement: Overlapping External Asset Rejection

The system MUST NOT install skills, agents, commands, or MCP dependencies from external catalogs (`davila7/claude-code-templates`, `github/awesome-copilot`) that overlap installed responsibilities or require MCP/MCP-server dependencies (`mcp__github__*`). Such assets MUST be treated as reference material only. Rejected examples include `github-workflow-automation`, `git-pushing`, `github-issues` MCP variants, and `create-github-action-workflow-specification` niche assets.

**User Story:** As an operator, I want external assets evaluated but not auto-installed when they duplicate or violate boundaries.

#### Acceptance & Edge Case Checklist
- [ ] Overlapping, MCP-dependent, or security-violating external assets not installed.
- [ ] Reference material does not trigger disk writes or downloads during interview.

#### Scenario: Reject overlapping install
- GIVEN interview identifies `github-workflow-automation` external skill overlapping `github-review-orchestration`
- WHEN authorization evaluated
- THEN external skill not installed and installed skill reused with prompt complement

#### Scenario: Reject MCP-dependent asset
- GIVEN capability could be satisfied by MCP-based `github-issues` command
- WHEN ingestion considered
- THEN MCP asset rejected and native `gh` CLI guidance retained
