# Proposal: Improve Catalog Navigation and Agent Metadata

## Intent

Make catalog navigation continuous, correct the GitHub specialist identity safely, and improve metadata without losing OpenCode contracts or user customizations.

## Clarifications

- Arrow navigation crosses page boundaries but clamps at the first/final item; it never wraps.
- Canonical fields override coexisting legacy fields; legacy values fill only missing fields.
- The canonical ID and exact visible catalog/detail label are `agent-github`; `agent-especialit-github` is read only as an internal compatibility key for migration.
- External assets are reference material only and will not be installed.

## Scope

### In Scope
- Navigate catalog rows continuously with ArrowDown/ArrowUp across pages.
- Migrate older `agent-especialit-github` state to canonical ID and visible label `agent-github`, retaining the old key only for internal compatibility reads and migration.
- Audit metadata, permissions, and installed-skill assignments for all eight catalog agents.
- Update canonical defaults and installed definitions while preserving identifiable manual customizations.

### Out of Scope
- Installing proposed external skills, agents, commands, or MCP dependencies.
- Granting `agent-github` automatic push authority or broadening unrelated OpenCode behavior.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `agent-catalog`: Continuous cross-page arrow navigation, canonical GitHub identity, alias-compatible membership, and display behavior.
- `built-in-agent-management`: Curated metadata, safe internal-agent permissions, and customization-preserving baseline updates.
- `suite-config-persistence`: Deterministic legacy/canonical merging and identifier migration without customization loss.
- `skill-management`: Reuse one installed skill per responsibility and avoid overlapping external installations.

## Approach

Use boundary-aware navigation in the existing reducer. Normalize older GitHub state to `agent-github` across persistence, policy, grants, and installed definitions; emit only `agent-github` in catalog rows, details, permission text, diagnostics, and newly materialized files. Reconcile metadata by field: canonical values win, legacy fills gaps, and recognizable user edits remain. Reuse existing GitHub skills; add missing Actions guidance including least privilege and SHA pinning. Allow Compaction, Title, and Summary only silent durable-memory capture, quality/session auditing, reads, and allowlisted read-only commands; deny edits, delegation, destructive commands, and unrestricted shell.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/tui/` | Modified | Navigation and display formatting. |
| `src/core/` | Modified | Metadata, migration, persistence, and policy. |
| Installed agent definitions | Modified | Customization-preserving metadata refresh. |
| `test/` | Modified | Navigation, migration, metadata, and permission regressions. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| User customization overwritten | Medium | Field-level detection, atomic writes, and fixtures for mixed legacy/canonical data. |
| Compatibility key causes duplicate catalog/policy entries | Medium | Normalize identity before cataloging, grants, and persistence. |
| Internal-agent permissions become excessive | Medium | Explicit allowlists and negative permission tests. |

## Rollback Plan

Restore prior navigation/defaults, retain compatibility reads for older state, and atomically restore backed-up definitions and configuration. Never delete migrated user data.

## Dependencies

- Existing OpenCode inventory, configuration, installed skills, and authenticated `gh` CLI.

## Success Criteria

- [ ] Arrow keys traverse every catalog item across pages and clamp at both ends.
- [ ] Older GitHub state resolves to one canonical `agent-github` entry whose exact visible catalog/detail label is `agent-github`.
- [ ] Legacy text is absent from catalog rows, details, user-facing permissions and diagnostics, and newly materialized agent files.
- [ ] Mixed legacy/canonical metadata follows precedence rules with manual customizations preserved.
- [ ] All eight catalog agents have accurate, non-duplicative metadata and skill assignments.
- [ ] Permission tests prove least privilege and no external asset installation or push authority.
