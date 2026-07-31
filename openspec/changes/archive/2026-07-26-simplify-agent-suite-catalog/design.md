# Design: Simplify Agent Suite Catalog

## Technical Approach

Exploration Option A: surgical in-place removal. One pure allowlist function owns membership; the TUI shrinks to two DialogSelect surfaces; persistence trims to a minimal registry; server/policy untouched. Strict TDD (RED→GREEN→REFACTOR).

## Architecture Decisions

### Decision: Owned membership boundary

**Choice**: `buildSuiteDeAgentesCatalog(runtime, custom, seed)` in `src/core/suites.ts`. Membership = explicit seed ∪ custom registry — a pure allowlist. Runtime config (`api.state.config.agent`) only enriches rows with `enabled`/model/description; it never adds members. A seed absent from runtime stays listed with `enabled: false`.
**Alternatives**: denylist over the runtime map (rejected: new agents leak in — today's bug); separate module (rejected: `suites.ts` becomes the cohesive catalog home).
**Rationale**: fails closed; runtime noise (`gentle-orchestrator`, `sdd-*`, `review-*`, `jd-*`, `*-fallback`) is excluded by construction.

### Decision: Minimal persistence + legacy split

**Choice**: `SuiteConfig = { version: 1; customAgents }`. Legacy keys (`suites`, `activeSuite`): any non-empty `agents` map → Spanish throw, source bytes untouched; all-empty legacy (the current install) → tolerated on load, replaced by the trimmed shape on the next atomic write (0600 + rename, unchanged).
**Alternatives**: auto-migrate (rejected: dead semantics); reject all legacy (rejected: bricks the current empty install).
**Rationale**: no silent data loss; current install converts safely.

### Decision: Delete, don't hide

**Choice**: physically delete suite CRUD (`createSuite`, `addSuiteAssignment`, `updateSuiteAssignment`, `removeSuiteAssignment`, `deleteSuite`, `AgentSuite`, `mergeAgentModels`, `MergedRuntimeConfig`), TUI functions (`activateSuite`, `showSuiteDetail`, `editAssignment`, `createNewSuite`), `test/suites.test.ts`, and the merge test.
**Rationale**: spec requires full removal; hidden code resurfaces via regression.

### Decision: DialogSelect-native TUI

**Choice**: root = two `DialogSelect` options (`Catálogo`, `Crear agente`); catalog = one `DialogSelect` (native scrolling per `dialogs.tsx`); row detail = `DialogAlert` + action `DialogSelect` (`Materializar` custom-not-materialized, `Eliminar` custom-only). Empty catalog → host-compatible `DialogAlert`, Spanish: "No hay agentes en la Suite de Agentes. Usa Crear agente.", then back to the two-option root. Footer: sidebar appends `· v{PLUGIN_VERSION}` inside the existing `safeSlotRender` guard; the dialog title repeats it as fallback. `PLUGIN_VERSION` = constant in new `src/version.ts` mirrored from `package.json` (no tsup `define` today).
**Alternatives**: custom virtualized catalog component (rejected: undocumented host surface, speculative risk).
**Rationale**: proven host APIs; `host-compat.test.ts` covers fallback.

### Decision: Server/consent boundary

**Choice**: zero changes to `src/server/index.ts`/`src/core/policy.ts`. Known-agent validation stays on runtime config keys; the exported seed + builder keep membership discoverable in core without a server dependency on persistence.
**Rationale**: consent contract (`usa también agente: <id>` + per-target `tool.execute.before`) proven by untouched server/policy/consent tests.

### Maintainer-authorized scope amendment: internal Gentle-AI authorization

**Choice**: the server policy now owns one exact, auditable allowlist for every
configured primary and fallback SDD agent, every review lens/refuter pair, and
the Judgment Day judge/fix pairs. `decideTaskGate` consults exact membership;
it MUST NOT infer authorization from a prefix, so names such as `sdd-evil`
remain user-controlled. `general`, built-in `explore`,
`agent-especialit-github`, and custom agents continue to require the existing
exact current-turn grant.

The plugin `config` hook applies the same deny-by-default map to the in-memory
runtime `permission.task` configuration (`*` deny followed by exact internal
allows). It replaces stale task rules but preserves unrelated config and
permission fields. It does not write global configuration or change catalog
membership, model selection, or ledger behavior.

## Data Flow

    Alt+S → openSuite → loadSuiteConfig → parseSuiteConfig (trim/throw)
      ├─ Catálogo → buildSuiteDeAgentesCatalog(runtime, custom, SEED) → rows + enabled/model
      └─ Crear agente → validateAgentId (+seed-dup reject) → atomic save / materializeGlobalAgent

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/core/types.ts` | Modify | Drop `AgentSuite`/`suites`/`activeSuite`; add row `membership`/`enabled` |
| `src/core/suites.ts` | Modify | Delete CRUD; add `SUITE_DE_AGENTES_SEED` + `buildSuiteDeAgentesCatalog` |
| `src/core/config.ts` | Modify | Trim `parseSuiteConfig` (legacy split); delete `mergeAgentModels` |
| `src/core/persistence.ts` | Modify | Default `{version:1, customAgents:{}}`; path/atomic write unchanged |
| `src/version.ts` | Create | `PLUGIN_VERSION = "0.1.0"` (mirrors `package.json`) |
| `src/tui/index.tsx` | Modify | Two-option root; catalog + detail/actions; footer; suite UI deleted; `createCustomAgent`/registration kept |
| `test/catalog.test.ts` | Create | RED→GREEN: allowlist, seed-absent, ordering, consent labels |
| `test/suites.test.ts` | Delete | CRUD gone |
| `test/config.test.ts`, `test/persistence.test.ts` | Modify | New shape; legacy split; bytes preserved on rejection |
| `README.md`, `docs/`, `examples/suites.json` | Modify/Delete | New behavior; drop legacy example |
| `src/server/index.ts`, `src/core/policy.ts`, `tsup.config.ts` | Untouched | Consent/gating; `dist/tui.js`/`dist/server.js` paths stable |

## Interfaces / Contracts

```ts
export interface SuiteConfig { version: 1; customAgents: Record<string, CustomAgent>; }
export interface AgentCatalogRow {
  id: string; membership: "seed" | "custom"; enabled: boolean; // enabled = in runtime map
  model?: string; skills: string[];
  consent: "explicit-current-turn"; description?: string;
}
export const SUITE_DE_AGENTES_SEED = ["general", "agent-especialit-github"] as const;
export function buildSuiteDeAgentesCatalog(
  runtime: Record<string, { model?: string; description?: string }>,
  custom: Record<string, CustomAgent>,
  seed: readonly string[] = SUITE_DE_AGENTES_SEED,
): AgentCatalogRow[]; // deterministic order; custom id colliding with seed rejected upstream
```

## Testing Strategy

| Layer | What | Approach |
|-------|-----|----------|
| Unit | Allowlist, seed-absent row, ordering | `test/catalog.test.ts` RED first |
| Unit | Legacy split; seed-duplicate id rejection | `config.test.ts` RED first |
| Unit | Atomic round-trip; rejected load preserves bytes | `persistence.test.ts` |
| Integration | Two-option menu, empty-catalog DialogAlert, footer, fallback | host-double tests |
| Regression | Consent/policy/server unchanged | existing suites unmodified |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary modified; the maintainer-authorized amendment is limited to exact task-agent policy and the in-memory config hook.

## Migration / Rollout

No automatic migration. Empty legacy converts on first write; non-empty fails visibly in Spanish, source preserved; `suites.json` never deleted. Two chained slices: (1) core/persistence/catalog + tests, (2) TUI + footer + docs.

## Open Questions

- [ ] `PLUGIN_VERSION` mirror vs tsup `define` — constant chosen; revisit only on real drift.
