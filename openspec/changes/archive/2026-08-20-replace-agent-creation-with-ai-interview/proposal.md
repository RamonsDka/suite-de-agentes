# Proposal: Replace Agent Creation with AI Interview

## Intent

Creation forces a 6-step blank-canvas form with one-shot AI inference. Replace it with an adaptive AI interview as the single primary creation experience; validation and persistence stay authoritative.

## Scope

### In Scope
- Multi-turn engine: one question/turn, 2–4 optional quick replies, free text.
- Compact live summary; full fields at review.
- AI proposes review transition with rationale; user accepts or continues.
- Installed skills recommended first and explained; missing skills pending.
- AI recommends provider/model/effort with rationale; user decides.
- Shared Create/Modify engine; Modify starts from current state.
- In-memory recovery across provider/network/dialog failures; Cancel discards; no cross-restart persistence.
- Final review edits id, description, operations, skills, model, effort.

### Out of Scope
- Skill search/import/generation inside interview (post-approval).
- AI-authored permissions/security restrictions.
- Cross-restart draft persistence.
- Catalog membership, consent gates, persistence schema.

## Capabilities

### New Capabilities
- `agent-creation-interview`: adaptive interview engine — quick replies, live checkpoint, review transition, recovery.

### Modified Capabilities
- `assisted-agent-authoring`: one-shot generation becomes interview; preview gains safe-field editing.
- `ai-coordinator`: ephemeral execution becomes multi-turn, recoverable, cancellable.
- `skill-management`: installed-skill recommendations surface in interview; missing skills pending.
- `agent-catalog`: `Crear agente` opens the gated interview, not the wizard.

## Wizard Replacement Semantics

Configured coordinator: `Crear agente` opens the interview; otherwise the existing coordinator gate applies — never a fallback wizard. The step form becomes the review/edit panel; manual editing is its only escape hatch. No competing creation path remains.

## Approach

Per exploration: turn-based coordinator protocol returning question, quick replies, draft checkpoint; new interview screen; bridge to `AiPreview` and atomic persistence.

## Affected Areas

| Area | Impact | Change |
|------|--------|--------|
| `src/core/coordinator.ts` | Modified | Turn protocol |
| `src/core/types.ts` | Modified | Turn/draft types |
| `src/tui/agent-suite-nav.ts` | Modified | `ai-interview` route |
| `src/tui/agent-suite-app.tsx` | Modified | Streaming/cancellation handoff |
| `src/tui/screens/ai-interview.tsx` | New | Dialogue UI |
| `src/tui/screens/create-agent.tsx` | Modified | Review/edit panel |
| `src/tui/screens/ai-preview.tsx` | Modified | Safe-field editing |
| `test/coordinator.test.ts`, `test/agent-suite-nav.test.ts`, `test/ai-preview.test.ts` | Modified | Interview/cancellation coverage |

## Safety and Trust Boundaries

- No writes before final approval; validation and atomic persistence stay authoritative.
- Permissions product-owned (`read: allow, edit: ask`); AI permission output stripped.
- Skill ingestion stays under `safe-skill-ingestion` post-approval; every turn cancellable; state in-memory only.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Malformed LLM turn | Med | Dual-part parsing; checkpoint fallback |
| Token/latency growth | Med | Bounded turns, concise prompts |
| Two creation paths linger | Low | Wizard route removed; entry tested |

## Rollback Plan

Revert the change's commits; the interview route is additive, restoring wizard and one-shot authoring. Persistence schema untouched.

## Dependencies

Configured AI coordinator (existing gating), installed-skills discovery, existing validation/atomic persistence pipeline.

## Success Criteria

- [ ] `Crear agente` opens the interview, never the wizard.
- [ ] One question per turn; ≤4 quick replies plus free text; summary updates.
- [ ] No persistence before final approval (test-verified).
- [ ] Cancel discards; failure recovery preserves transcript and draft.
- [ ] Modify shares the engine from current state.
- [ ] `npm test`, typecheck, and build pass.

## Delivery Forecast

Budget 400 lines/slice, `auto-chain`: 4 slices — interview core, screen/navigation, skill recommendations + review bridge, wizard retirement + integration tests. `sdd-tasks` owns the final forecast.
