# Design: Manage OpenCode Built-In Agents

## Technical Approach

Keep Suite de Agentes catalog-only and preserve the external `gentle-orchestrator` seam. Introduce one deep built-in registry that owns identity, classification, Spanish presentation, curated baseline, and discovery rules. Pure core functions reconcile that registry with OpenCode's merged runtime `config.agent`; the server applies validated overrides and enforces ephemeral consent in the existing `tool.execute.before` task seam. The TUI adds built-in actions and a compact session-permissions utility panel, not authoring or coordinator UI.

## Architecture Decisions

| Decision | Alternatives | Rationale |
|---|---|---|
| Create `src/core/built-in-agents.ts` with seven lowercase IDs, separate display metadata, `public | internal` class, baseline, and pending-curation materializer | Extend seed arrays; infer from display names | Centralizes invariants and eliminates scattered conditionals. |
| Discover candidates from merged runtime agent configuration, excluding custom registry IDs, seed custom agents, exact orchestrator/internal allowlists, and `sdd-`/`review-`/`jd-`/`*-fallback` namespaces | Treat every runtime ID as built-in | Prevents Suite/custom agents being mislabeled as OpenCode built-ins. Unknown candidates remain generic and `pending-curation`. |
| Keep config `version: 1`; accept `builtInOverrides`, retain read compatibility for `baseOverrides`, and normalize it on the next atomic save | Version 2 migration | Existing optional-field evolution needs no breaking schema bump. `disabledAgents` remains compatible; add optional `advancedOverrides`. |
| Replace current-message grants with a session ledger keyed by requester/target; disabled state is checked first | Persist grants; UI-owned grants | Ephemeral server ownership is fail-closed, visible, immediately revocable, and expires on session deletion. |
| Manual direct selection bypasses consent because it does not execute the `task` tool; only `tool.execute.before` automatic task dispatch is gated | Infer intent from prompt text | Uses a reliable hook boundary. If OpenCode emits manual selection through `task`, implementation must stop and resolve the open question below. |
| Restore removes only the target built-in's override fields and reapplies its registry baseline | Rewrite provider/runtime configuration | Deterministic and does not erase unrelated provider model/effort choices. |

## Data Flow

```text
merged config.agent -> classify/reconcile -> catalog rows -> catalog/detail/grants panel
suite config -> validate/normalize -> runtime overrides/disable filter
task hook -> disabled? -> internal exception? -> session grant? -> allow/deny
command/panel -> ledger list/revoke ---------------------------^
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/core/built-in-agents.ts` | Create | Canonical registry, baseline, classification, discovery. |
| `src/core/types.ts` | Modify | Built-in definitions/overrides, advanced flags, catalog classification, session grants. |
| `src/core/{config,suites,grants,policy}.ts` | Modify | Normalize legacy config, reconcile catalog, manage grants, fail-closed decisions. |
| `src/server/index.ts` | Modify | Capture merged inventory, apply overrides, expire grants, expose list/revoke commands, enforce dispatch. |
| `src/tui/agent-suite-{controller,app}.tsx` | Modify | Built-in edit/restore/disable flows and compact grant-panel navigation. |
| `src/tui/screens/{catalog,agent-info,session-grants}.tsx` | Modify/Create | Type-specific actions, warnings, advanced confirmation, grant visibility/revocation. |
| `test/{config,policy,server,agent-suite-catalog,agent-suite-controller}.test.ts` | Modify | Closest existing owners for core, integration, and TUI behavior. |
| `test/built-in-agents.test.ts` | Create | Registry/discovery/baseline unit owner. |

## Interfaces / Contracts

`BuiltInDefinition` contains `id`, `displayName`, `classification`, `curation`, and immutable `baseline`; `SessionGrant` contains `sessionID`, `requester`, `target`, `purpose`, and `operation`. Grant APIs are `grant/list/revoke/clearSession`. Overrides are validated only against canonical or currently discovered built-ins.

## Testing Strategy

Strict RED→GREEN per slice: registry/discovery; config migration/atomic rejection; catalog actions/restore; ledger/revocation; server hook. Unit tests prove seven IDs, exclusion rules, pending curation, baseline isolation, internal override, and disabled precedence. Integration tests prove missing/stale/revoked/unknown grants deny, session deletion clears grants, exact internal exceptions remain, and commands/panel share the same ledger. No E2E layer is configured.

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable classification | No path execution introduced | None |
| Git repository selection | N/A — no Git commands | No repository authority introduced | None |
| Commit state | N/A — no commits | No index/worktree handling | None |
| Push state | N/A — no pushes | No ref resolution | None |
| PR commands | N/A — no PR automation | No command composition | None |

Routing is applicable outside those shell/VCS rows: RED tests in `test/policy.test.ts` and `test/server.test.ts` cover unknown requester/target, absent/revoked/stale grant, disabled-over-grant, lookalike internal IDs, and unavailable security state; every case must deny without dispatch.

## Migration / Rollout

Lazy normalization preserves `baseOverrides` values as `builtInOverrides`; rollback continues reading both keys, revokes in-memory grants, and removes discovery/UI exposure without touching custom agents or unrelated OpenCode settings.

## Open Questions

- [ ] Blocking only if runtime evidence contradicts the current hook boundary: can a manual direct agent selection ever arrive as a `task` tool execution indistinguishable from automatic dispatch?
