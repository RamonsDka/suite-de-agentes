# Design: AI Coordinator & Assisted Agent Authoring

## Technical Approach

Five force-chained vertical slices (≤400 lines each), strict TDD:

1. **Config schema + visual polish** — optional `coordinator` in `SuiteConfig`; yellow `Finalizar`, blue labels/white values, translucent search.
2. **Coordinator settings** — `⚙ Configuración` root option 3 (`landingRows` focus `0|1|2`); provider→model→effort reusing runtime builders; green/red gear; gating (`Configurar ahora`/`Cancelar`).
3. **Skill management** — installed discovery, searchable picker, recommend-first (installed → skills.sh/GitHub → generate), conflict diff (Replace/Keep/Rename), near-miss → variant.
4. **AI authoring + ephemeral runner** — conversational `description`/`operations`; mandatory preview (Approve/Request changes/Discard); `Finalizar` validates/saves/closes with `Cambios guardados`/`Edición pendiente`.
5. **Safe ingestion** — HTTPS import behind net guard; pre-validation; immutable plan; path-pinned writer; global install; agent-only assignment; post-install test; rollback; audit.

Non-AI paths fail open.

## Architecture Decisions

| Decision | Choice (alternatives rejected) | Rationale |
|---|---|---|
| Module boundary | Core (`src/core`): config/parsing/validation/plans/ranking/journal; adapters (`src/tui/ai`): SDK/network/discovery; TUI: nav+screens. (Rej: SDK in core; fs ports) | Core = pure logic + direct `node:fs` (`agents.ts`) |
| SDK dependency | Promote `@opencode-ai/sdk` (transitive via `@opencode-ai/plugin`) to direct runtime dependency; adapter builds `createOpencodeClient()`. (Rej: server events) | TUI gets no injected `client` — only `api.state.provider` (verified) |
| Ephemeral runner | Fail-closed: adapter enumerates ALL host tools (built-ins + dynamic MCP), builds per-tool `false` denial map, aborts unless tool-less execution is proven — never bare `tools: {}` (doesn't disable). Core sees `CoordinatorSession` port; cancel+progress. (Rej: tooled session) | Spec: tool-less ephemeral sessions; minimal injection surface |
| Coordinator shape | `{ provider; model; effort? }` via `parseSuiteConfig` whitelist (`config.ts:111`); effort via existing safe variant validator — variants dynamic, no closed vocab. (Rej: composite) | Spec: separate strings for provider→model screens |
| Skill writes | `globalSkillPath()` → `~/.config/opencode/skills/{id}/SKILL.md` (plural, official); atomic tmp+rename per `saveSuiteConfig`/`materializeGlobalAgent`; NEW multi-file journal for rollback. (Rej: in-place overwrite) | Proven atomic-write convention; new multi-file journal |
| Trust model | AI/remote content in-memory draft until Approve; frozen `IntegrationPlan`; hard-deny shell/traversal pre-write. (Rej: sandboxing) | Spec: draft-until-approval, immutable plan, append-only audit |

## Data Flow

    TUI ─> controller ─> core fn ─> adapter (SDK session | guarded fetch)
         └─ preview ─Approve─> frozen plan ─> safe writer ─> skills/{id}/SKILL.md
                                │              │
                                │   post-install: pass ─> assign+audit · fail ─> rollback+audit

## File Changes

| File | Action | Tests |
|---|---|---|
| `src/core/types.ts`, `config.ts`, `persistence.ts`, `package.json`, `package-lock.json` | Modify — `coordinator?`, whitelist, validation; SDK promoted to direct runtime dep | config, persistence, lock |
| `src/core/coordinator.ts`, `skill-package.ts`, `skill-catalog.ts`, `net-guard.ts`, `skill-install.ts` | Create — coordinator port/prompts/`parseAgentDraft`; validation/plan/conflicts/ranking; net guard; journal/rollback/audit | one `test/<module>.test.ts` each |
| `src/tui/ai/coordinator-session.ts`, `skill-sources.ts` | Create — deny-all SDK runner; `client.app.skills` + guarded search | per-module tests |
| `src/tui/agent-suite-nav.ts`, `agent-suite-controller.ts` | Modify — new screens/events; `coordinator()`/`setCoordinator()` | existing suites |
| `src/tui/screens/`: `landing.tsx` modify; `settings`,`coordinator-config`,`skill-picker`,`ai-preview`,`plan-review` new | Create/Modify | `agent-suite-*.test.ts` |
| `src/tui/agent-suite-app.tsx`, `visual-tokens.ts`, `visual-primitives.tsx`, `screens/create-agent.tsx`, `screens/modify-panel.tsx` | Modify — wiring, polish, `Finalizar` | existing suites |

## Interfaces / Contracts

```ts
export interface CoordinatorConfig { provider: string; model: string; effort?: string }
export interface CoordinatorSession {
  prompt(input: { system: string; message: string; coordinator: CoordinatorConfig;
    signal: AbortSignal; onProgress?: (text: string) => void }): Promise<string>;
}
export type SkillPackage = { id: string; files: readonly { path: string; content: string }[]; source: SkillSource };
export function buildIntegrationPlan(pkg: SkillPackage, agentId: string): Readonly<IntegrationPlan>;
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit (core) | coordinator/net-guard/package/plan/journal/ranking | Vitest; temp dirs |
| Integration | persistence; adapters with stubbed SDK/fetch; deny-map completeness; cancel mid-prompt | Vitest, fakes |
| TUI | `reduceNav` transitions, gating, preview, saved/pending, landing 3 options | Pure-function tests |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | RED tests |
|---|---|---|---|
| Documentation-like paths (`SKILL.md`, embedded shell) | **Applicable** — doc-like ingestion | Deny-listed shell patterns; `../` rejected; fail closed pre-write | Traversal/destructive-command/frontmatter fixtures |
| Git repository selection | N/A — no runtime git | — | — |
| Commit state | N/A — no git index writes | — | — |
| Push state | N/A — no push | — | — |
| PR commands | N/A — no PR automation (chaining = delivery) | — | — |
| Network trust / SSRF | **Applicable** — URL import | HTTPS-only; DNS private/loopback/link-local deny pre/post redirect; ≤3 redirects; size cap; violations → security error | http URL, private IP, redirect-to-private, oversized body |

## Migration / Rollout

`coordinator` optional — no migration; invalid blocks write, prior file preserved. Slices revert independently.

## Open Questions

None.

Assumptions: SDK factory/base-URL vs 1.18.5 + local host — slice-2 RED (stub transport); skills layout — slice-5 RED.
