# Agent Dispatch Consent Specification

## Purpose

Define consent boundaries, session-scoped grants, visibility, revocation, and fail-closed dispatch policies for agent-to-agent invocation.

## Requirements

### Requirement: Manual Invocation vs Automatic Dispatch

The system MUST allow direct manual user invocation in UI/CLI without confirmation prompts. The system MUST require explicit user confirmation before an agent automatically dispatches tasks to another agent.

#### Acceptance & Edge Case Checklist
- [ ] Direct manual invocation executes immediately without prompt.
- [ ] Automatic dispatch requests trigger explicit confirmation.

#### Scenario: Direct user selection
- GIVEN the user manually selects `build` from the interface
- WHEN the user issues a prompt directly
- THEN `build` executes without requesting dispatch confirmation

### Requirement: Detailed Confirmation and Session-Scoped Grants

Confirmation prompts MUST display the requester ID, target ID, stated purpose, planned operation, and session-scoped duration. An approved grant MUST remain valid only for the active session and MUST NOT persist across sessions.

#### Acceptance & Edge Case Checklist
- [ ] Displays requester, target, purpose, operation, and current-session duration.
- [ ] Grants expire upon session termination.
- [ ] Rejects standing or permanent multi-session grants.

#### Scenario: Confirm automatic dispatch request
- GIVEN `general` requests dispatch to `explore` for codebase search
- WHEN the user approves the confirmation prompt
- THEN a grant is recorded for `general -> explore` for the current session only

### Requirement: Fail-Closed Dispatch Policy

The dispatch policy MUST fail closed. The system MUST deny dispatch if consent is missing, target agent is disabled, requester is unknown, or the grant is stale or revoked.

#### Acceptance & Edge Case Checklist
- [ ] Denies dispatch without an active grant.
- [ ] Denies dispatch to disabled target agents even if previously granted.
- [ ] Denies dispatch from unverified or unknown requesters.

#### Scenario: Dispatch denied for disabled target
- GIVEN an active session grant exists for `general -> plan`
- WHEN `plan` is subsequently disabled and `general` attempts dispatch
- THEN dispatch is denied with a descriptive target-disabled error

### Requirement: Grant Visibility and Revocation

The system MUST display all active session grants and MUST allow immediate revocation from both the TUI/UI panel and command surfaces.

#### Acceptance & Edge Case Checklist
- [ ] Lists active session grants in UI panel and CLI commands.
- [ ] Revoking a grant immediately denies subsequent automatic dispatches.

#### Scenario: Revoke active session grant
- GIVEN an active grant exists for `build -> explore`
- WHEN the user revokes the grant via the grant management panel
- THEN subsequent automatic dispatch from `build` to `explore` is immediately denied
