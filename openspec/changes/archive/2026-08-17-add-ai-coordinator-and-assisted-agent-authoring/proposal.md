# Proposal: AI Coordinator & Assisted Agent Authoring

## Intent

Skills are untyped strings, authoring is blank-canvas manual, no plugin-level LLM assists. Add an optional AI coordinator, conversational authoring, real skill management (discover/recommend/import/generate), and visual polish. Non-AI workflows stay fully usable unconfigured.

## Scope

### In Scope
- Coordinator settings, status gear, AI-action gating.
- Conversational authoring of description/operations with mandatory preview.
- Installed-skill discovery, picker, search-first recommendation.
- Safe URL import and AI skill generation.
- TUI visual polish.

### Out of Scope
- Credential setup (manual, outside Suite); project-local installs; git cloning; unrelated changes.

## Capabilities

### New Capabilities
- `ai-coordinator`: model configuration, status, recommendations, gating, ephemeral runner.
- `assisted-agent-authoring`: conversational authoring with mandatory preview and `Finalizar` validation.
- `skill-management`: installed discovery, picker attach/detach, recommend-first search.
- `safe-skill-ingestion`: URL import and AI generation behind trust boundaries, post-install test, audit, rollback.
- `suite-visual-polish`: `Finalizar` action/status, label/value contrast, translucent search.

### Modified Capabilities
- `agent-catalog`: root gains `⚙ Configuración` (three options).
- `suite-config-persistence`: optional validated `coordinator` field.

## Approach

Five vertical force-chained slices (≤400 changed lines each, strict TDD): visual + config schema → coordinator settings → skill management → AI authoring + ephemeral runner → safe ingestion/integration. `SuiteConfig` gains optional `coordinator` (backward compatible, no migration). Coordinator uses tool-less ephemeral sessions (`client.session.create/prompt`). AI/remote content is untrusted draft until approval; writes are path-pinned, schema-validated, audited, rollback-safe.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/core/types.ts`, `src/core/config.ts` | Modified | Optional `coordinator` schema |
| `src/core/coordinator.ts`, `src/core/skill-*.ts` | New | Runner, discovery, ingestion |
| `src/tui/screens/*`, `src/tui/visual-*` | Modified | Settings, picker, dialogs, polish |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SSRF/malicious skill content | Med | HTTPS-only, private-network deny, size cap, schema validation, preview |
| Coordinator prompt injection | Med | Tool-less ephemeral sessions; draft-only until approval |
| Review-budget breach | Med | Force-chained ≤400-line slices |

## Rollback Plan

Slices are independent chained PRs; revert the offender. `coordinator` is optional; deleting it restores minimal config. Skill installs live in per-skill directories; uninstall deletes them. Integration auto-rolls-back on failure.

## Dependencies

- OpenCode Plugin SDK 1.18.5 / `@opencode-ai/sdk` (`client.app.skills`, `client.session.*`, `api.state.provider`); network for ingestion/model metadata.

## Success Criteria

- [ ] Non-AI workflows pass existing tests unconfigured.
- [ ] Coordinator configurable end-to-end; gear shows red/green.
- [ ] No AI/URL content reaches disk without preview approval; malicious fixtures rejected.
- [ ] Generated skill installs globally, binds only to current agent, passes audited post-install test.
- [ ] Each slice ≤400 lines; `npm test`, `typecheck`, `build` green.

## Clarifications

Closed decisions (canonical: Engram #7136):

- **Trust**: draft until Approve/Request-changes/Discard; hard-deny dangerous actions; auto-rollback; append-only audit; mandatory structural/security pre-validation.
- **Skills**: global default; installed match recommended first; skills.sh/verified GitHub searched before generating; one best result; conflict diff (replace/keep/rename); near-miss adapted as new variant; complete packages; current-agent-only assignment; one immutable approved integration plan; bounded post-install test.
- **Coordinator**: one persistent model (provider → model → effort); live quality/cost recommendations; labeled red/green gear; Configure-now/Cancel returns to intent; cancellable progress; credentials manual outside Suite.
- **Authoring**: conversational; intent → description+operations; `Finalizar` validates/saves/closes with green `Cambios guardados`/yellow `Edición pendiente`; invalid pending edits block or explain.
- **Visual**: yellow `Finalizar`; blue labels, white values; blue semi-transparent search.
