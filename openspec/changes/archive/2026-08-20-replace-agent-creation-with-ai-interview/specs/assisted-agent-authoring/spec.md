# Delta for Assisted Agent Authoring

## MODIFIED Requirements

### Requirement: Conversational Agent Generation and Refinement

The system MUST allow users to author agents through an adaptive multi-turn AI interview and use the AI coordinator to progressively generate, refine, and checkpoint structured safe agent fields: `id`, `description`, `operations`, `skills`, `model`, and `effort`. Permissions and security settings MUST remain product-owned (`read: allow, edit: ask`) and MUST NOT be AI-authored.
(Previously: The system allowed users to describe agent intent in plain language and used one-shot generation to generate or refine fields including `name`, `description`, `systemPrompt`, and `operations`)

**User Story:** As a creator, I want to describe intent through an adaptive interview so that the coordinator creates agent capabilities and settings progressively.

#### Acceptance & Edge Case Checklist
- [ ] Adaptive multi-turn interview generates and updates candidate agent fields.
- [ ] Conversational feedback refines targeted safe fields iteratively.
- [ ] Ambiguous intent prompts for clarification without generating invalid definitions.
- [ ] Permissions and security settings remain strictly product-owned.

#### Scenario: Generate agent from natural language intent
- GIVEN a user enters a description of desired agent behavior in the interview
- WHEN the coordinator processes the prompt
- THEN a candidate agent definition with `id`, `description`, `operations`, `skills`, and model settings is checkpointed

#### Scenario: Refine agent from conversational feedback
- GIVEN an existing agent definition is loaded in authoring
- WHEN the user submits refinement feedback in the interview
- THEN the coordinator returns an updated candidate definition

---

### Requirement: Mandatory Change Preview and Review Actions

The system MUST NOT apply generated or refined agent attributes automatically. All proposed additions, modifications, or deletions MUST be presented in a structured preview offering direct editing of safe fields (`id`, `description`, `operations`, `skills`, `model`, `effort`) while keeping permissions and security settings product-owned (`read: allow, edit: ask`). The preview MUST offer three explicit actions: `Approve`, `Request changes`, and `Discard`.
(Previously: Preview offered Approve, Request changes, and Discard without direct safe-field editing)

**User Story:** As a creator, I want to inspect AI-generated changes in a structured preview and adjust safe fields directly so that I retain full control before applying edits.

#### Acceptance & Edge Case Checklist
- [ ] Draft remains unapplied in memory until explicit user action.
- [ ] Preview permits direct editing of safe fields while permissions remain product-owned.
- [ ] Preview offers exactly `Approve`, `Request changes`, and `Discard`.
- [ ] Selecting `Discard` reverts cleanly to the previous baseline.

#### Scenario: User approves draft proposal
- GIVEN a generated agent preview is displayed
- WHEN the user selects `Approve`
- THEN proposed changes are applied to the active editor draft

#### Scenario: User requests modifications
- GIVEN a generated agent preview is displayed
- WHEN the user selects `Request changes` with new feedback
- THEN a revised preview is generated incorporating the request

#### Scenario: User discards proposal
- GIVEN a generated agent preview is displayed
- WHEN the user selects `Discard`
- THEN the draft is discarded and editor reverts to prior state

#### Scenario: User edits safe fields in review
- GIVEN a generated agent preview is displayed
- WHEN the user edits `id`, `description`, `operations`, `skills`, `model`, or `effort` directly
- THEN the draft updates with the edited safe values while permissions remain product-owned
