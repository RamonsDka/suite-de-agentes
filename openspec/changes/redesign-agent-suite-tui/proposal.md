# Proposal: Redesign Suite de Agentes TUI

## Intent

The suite is a chain of native host dialogs: no framed landing, no scannable catalog, no structured detail, and effort options echo raw runtime variant keys. This change delivers the graphical, keyboard-navigable surface the brief specifies.

## Clarifications

- Brief categories are agent examples, not data: no `category` field, no migration.
- Effort stays capability-driven: `default` always, supported variants normalized.
- The structured detail screen is required, not a text dialog.

## Scope

### In Scope

- Owned OpenTUI/Solid screens: landing (title, version, Catálogo, Crear agente), catalog matrix, detail, create/modify.
- Detail: name, description, skill chips, operations, Modify, Delete with explicit yes/no.
- Effort ordered `default, none, low, high, xhigh, max`, filtered to runtime support.
- Responsive: matrix wide, one column narrow, pagination for overflow (`Más…`), explicit focus, keyboard hints, accessible contrast.
- Host dialogs kept as degraded fallback via extended `safeSlotRender`/`safeHostAction`.

### Out of Scope

- `SuiteConfig` shape, `parseSuiteConfig` allowlist, migrations, unsupported effort variants.
- `openspec/revision-selector-agente/`, consent semantics, server entrypoint.

## Capabilities

### New Capabilities

- `agent-suite-screens`: owned screen flow, focus/navigation, responsive degradation, dialog fallback.
- `agent-effort-options`: capability-driven derivation, normalization, ordering of effort options.

### Modified Capabilities

- `agent-catalog`: landing replaces the root dialog (both actions kept); catalog becomes a responsive matrix over existing `AgentCatalogRow`; detail becomes structured; version moves into the frame.
- `suite-config-persistence`: None.

## Approach

Extend the existing core → tui → host-compat separation. Effort normalization is a pure `core/` mapping, testable without rendering. Screens are new Solid components under `src/tui/screens/`, mounted through `safeSlotRender`, each keeping its dialog path as fallback. Phase order: core mapping, landing/catalog, detail, create/modify. Strict TDD in the canonical repo.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/tui/screens/*` | New | Landing, catalog, detail, create/modify |
| `src/tui/index.tsx` | Modified | Route to screens, keep fallback |
| `src/tui/host-compat.ts` | Modified | Guard new render paths |
| `src/core/suites.ts` | Modified | Effort derivation and ordering |
| `test/tui-registration.test.ts`, `test/host-compat.test.ts` | Modified | Screen and fallback contracts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| OpenTUI lacks layout primitives | Med | Verify `@opentui/solid` types during design |
| Host-fallback regression | Med | No-renderer degradation test per screen |
| Oversized PR | High | Phase per screen, chained PRs |

## Rollback Plan

Screens are additive behind a render guard, one commit per phase. Revert by deleting `src/tui/screens/` and restoring `index.tsx` dialog routing. No persisted state changes.

## Dependencies

- Canonical repo `source/revision-selector-agente` for test, typecheck, build.

## Success Criteria

- [ ] Alt+S and `/agent-suite` open the landing with version and both actions.
- [ ] Catalog is a matrix wide, one column narrow, with visible focus.
- [ ] Detail shows name, description, chips, operations, Modify, Delete yes/no.
- [ ] Effort shows only supported options plus `default`, in the stated order.
- [ ] No-renderer host degrades to dialogs; tests, typecheck, build pass.
