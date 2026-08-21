# Design: Replace Agent Creation with AI Interview

## Technical Approach

Add a turn-based interview engine to the pure core (`src/core/coordinator.ts`), a new `ai-interview` screen, rerouting both `Crear agente` entries (`ACTIVATE_LANDING_ITEM` 1, `CREATE_START`) through the gate. Each turn replays the transcript via the tool-less `CoordinatorSession`, parses a strict payload, updates a safe-field checkpoint. Review bridges to `AiPreview` with inline safe-field editing; `Approve` flows through untouched controller validation and atomic persistence.

## Architecture Decisions

| # | Decision | Alternatives rejected | Rationale (evidence) |
|---|----------|----------------------|----------------------|
| 1 | Transcript replay: every turn sends full transcript in a fresh ephemeral `session.prompt` | Persistent server session — breaks deny-all ephemeral contract | Session layer untouched; transcript gives free in-memory recovery |
| 2 | Engine in pure core beside `parseAgentDraft` | Engine inside the Solid app | Fake-session unit tests; fail-closed parsing |
| 3 | Session in app-level signal, not nav stack | Transcript inside `AppScreen` | Must survive dialog closes/errors; matches `authoringAbort` pattern |
| 4 | Dual-part payload; checkpoint falls back to last valid draft | Text-only protocol | Proposal mitigation: "dual-part parsing; checkpoint fallback" |
| 5 | Pending skills tracked beside `AgentDraft.skills` | Merging pending into `skills` | `parseAgentDraft` validates installed IDs; spec forbids pre-approval writes |
| 6 | Retire one-shot `ai-request`; `create` screen kept as manual editor | Keeping two AI paths | Spec: no fallback wizard, no competing path |
| 7 | Reuse `recommendSkill` + `discoverInstalledSkills` | New discovery path | Installed-first hierarchy matches `skill-management` delta |

## Data Flow

    Landing "Crear agente" ─→ gate (configured?) ─→ ai-interview screen
                                                  │ answer/reply
                                                  ▼
    app signal: transcript + checkpoint + pendingSkills (memory only)
                                                  │ runInterviewTurn (AbortSignal)
                                                  ▼
    CoordinatorSession.prompt (fresh ephemeral, deny-all tools, replay)
                                                  │ strict parseInterviewTurn
                                                  ▼
    question + replies + summary ──loop──┐
                                        │ proposeReview (rationale)
                                        ▼ accept / continue
    AiPreview (editable fields) ─Approve─→ controller.createAgent / patchAgent
    Cancel / abort ─→ discard session (no prior writes)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/core/coordinator.ts` | Modify | Add `InterviewTurn`, `InterviewTranscript`, `parseInterviewTurn`, `buildInterviewPrompt`, `runInterviewTurn`; keep `parseAgentDraft`; remove one-shot authoring |
| `src/core/types.ts` | Modify | Add `PendingSkill`, `ModelRecommendation` |
| `src/tui/agent-suite-nav.ts` | Modify | `ai-interview` kind + INTERVIEW_* events; reroute landing 1/`CREATE_START` to gated interview; extend `AiIntent`; drop `ai-request` |
| `src/tui/agent-suite-app.tsx` | Modify | Session signal, per-turn abort, retry/cancel, skill context, review bridge |
| `src/tui/screens/ai-interview.tsx` | Create | Question, quick replies, free text, compact checkpoint, review proposal, retry/cancel |
| `src/tui/screens/create-agent.tsx` | Modify | Manual edit panel only; drop step-3 AI offer |
| `src/tui/screens/ai-preview.tsx` | Modify | Inline safe-field editing + rationale; keep 3 actions |
| `test/coordinator.test.ts`, `test/agent-suite-nav.test.ts`, `test/ai-preview.test.ts` | Modify | RED coverage below |

## Interfaces / Contracts

```ts
export interface InterviewTurn {
  question: string;
  quickReplies: readonly string[];   // 2–4, validated
  proposeReview?: { rationale: string; draft: AgentDraft };
}
export interface InterviewCheckpoint {
  draft: AgentDraft;                  // safe fields only
  pendingSkills: readonly PendingSkill[];
  recommendation?: ModelRecommendation;
}
```

`runInterviewTurn({ session, coordinator, transcript, installedSkills, signal, onProgress }) → Promise<InterviewTurn>`. Permissions/`systemPrompt` keys stay rejected (`LEGACY_IGNORED_DRAFT_KEYS`). Modify seeds transcript/checkpoint from current safe fields.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Turn parsing (malformed, extra keys, permission injection, reply count), fallback, replay, seeding | Fake sessions in `test/coordinator.test.ts` (RED first) |
| Unit | Gated entry never opens wizard; interview events; cancel; review transition | `test/agent-suite-nav.test.ts` |
| Unit | Safe-field editing, rationale, 3 preview actions | `test/ai-preview.test.ts` |
| Integration | Approve calls `createAgent` once; nothing persists before approval; abort preserves transcript | Controller fakes per existing pattern |

## Threat Matrix

| Boundary | Adversarial cases | Applicability | Design response / RED tests |
|---|---|---|---|
| Documentation-like paths | `README.sh`, executable MDX | N/A — no file classification/execution | — |
| Git repository selection | `git -C`, relative/absolute paths | N/A — no VCS operations | — |
| Commit state | staged, `commit -a`, empty index | N/A — no commit automation | — |
| Push state | tracking branch, first push, refspec | N/A — no push automation | — |
| PR commands | `--head`, env prefix, composed commands | N/A — no PR automation | — |
| Coordinator process integration | Malformed turn; unconfigured coordinator; mid-turn cancel; permission injection | **Applicable** | Safe: parse error keeps checkpoint; gate shows `Configurar ahora`/`Cancelar`, never wizard; abort discards turn, keeps transcript; permission keys rejected. Failure: error shown, retry offered. RED tests: malformed keeps checkpoint; unconfigured pushes `ai-gate` not `create`; abort keeps transcript; `permissions` rejected |

## Migration / Rollout

No data migration; schema untouched. Rollout follows the proposal's 4 chained slices. Rollback: revert commits; wizard restored.

## Open Questions

- [ ] `Request changes`: re-enter interview with transcript, or fresh refinement turn? (Assumes re-entry)
