# Proposal: Manage OpenCode Built-In Agents

## Intent

Give users explicit, recoverable control over all current OpenCode built-in agents while preserving safe dispatch, catalog ownership boundaries, and the external orchestrator seam.

## Scope

### In Scope
- Manage `general`, `build`, `plan`, `explore`, `compaction`, `title`, and `summary` with proper display names and lowercase runtime IDs.
- Edit metadata, model, effort, operations, skills, and enabled state; provide curated Spanish defaults and restore-to-baseline.
- Require session-scoped, visible, revocable confirmation for automatic invocation; keep manual selection direct.
- Protect internal-agent deactivation behind an advanced override and auto-register future built-ins as pending curation with generic Spanish metadata and warnings.

### Out of Scope
- Altering OpenCode's internal implementation.
- Permanent or cross-session invocation grants.
- Making uncurated behavioral claims about future agents.

## Capabilities

### New Capabilities
- `built-in-agent-management`: Classification, full configuration, protected disabling, baseline restoration, and cautious future-agent discovery.
- `agent-dispatch-consent`: Manual-versus-automatic invocation rules, confirmation details, session grants, visibility, and panel/command revocation.

### Modified Capabilities
- `agent-catalog`: Expand catalog membership and presentation from two seeds to all detected controllable built-ins while preserving catalog-only exclusions and safe-disable behavior.
- `suite-config-persistence`: Persist validated built-in overrides, disabled state, baseline-compatible metadata, and advanced protection choices atomically.

## Approach

Extend the catalog registry with explicit built-in tiers and curated definitions, then reconcile runtime discovery against it. Reuse `decideTaskGate` through `tool.execute.before` for fail-closed automatic invocation. Keep configuration and policy logic in pure core modules; expose editing, grant visibility/revocation, warnings, and restoration through existing Suite surfaces. Deliver conceptually as registry/classification, persistence, consent policy, runtime integration, then UI slices.

## Clarifications and Assumptions

- Confirmation shows requester, target, purpose, planned operation, and current-session duration.
- Disabled agents are absent and undispatchable. Unknown future agents receive no curated classification claims.
- `ai-coordinator` requirements remain unchanged.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/core/{types,suites,config,policy}.ts` | Modified | Registry, validation, baseline, discovery, consent |
| `src/server/index.ts` | Modified | Runtime overrides, disable enforcement, confirmation hook |
| `src/tui/screens/*` | Modified | Controls, warnings, grants, restore actions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Internal-agent control destabilizes runtime | High | Protected disable, warnings, baseline restore |
| Future discovery misclassifies agents | High | Pending-curation state, generic metadata, conservative warnings |
| Grant or disable bypass | Medium | Central fail-closed policy and integration tests |

## Rollback Plan

Disable discovery and internal controls, restore curated baselines, revoke active grants, and revert registry/config interpretation while preserving user custom agents and unrelated OpenCode configuration.

## Dependencies

- OpenCode runtime agent inventory and existing plugin hooks.

## Success Criteria

- [ ] All seven current built-ins appear with correct names and editable fields.
- [ ] Automatic dispatch is denied without confirmation; grants expire per session and revoke from both surfaces.
- [ ] Internal disable requires advanced override; disabled agents cannot appear or dispatch.
- [ ] Restore reproduces every curated baseline field.
- [ ] Unknown built-ins register as pending curation with warnings and no unsupported claims.
