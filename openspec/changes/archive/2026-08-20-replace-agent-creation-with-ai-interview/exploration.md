## Exploration: replace-agent-creation-with-ai-interview

### Current State

Today, agent creation in Suite de Agentes is driven by a 6-step sequential form (`CreateAgent` in `src/tui/screens/create-agent.tsx`):
1. Step 0: `id` (text input, regex-validated kebab-case)
2. Step 1: `description` (text input)
3. Step 2: `skills` (comma-separated string input)
4. Step 3: `operations` (text input; if coordinator is configured and `!aiApproved`, pressing Enter offers opening `ai-request`)
5. Step 4: `model` (text input)
6. Step 5: `effort` (text input; pressing Enter invokes `onSubmit` → `createAgent`)

When the AI assistant is triggered from Step 3 or from the Modify panel:
- It uses a one-shot prompt (`runAuthoringConversation` in `src/core/coordinator.ts`) executing via `CoordinatorSession.prompt()` against an ephemeral, tool-less host session.
- The prompt sends `Current intent`, `Current operations`, and `User request`, asking the model to emit a single strict JSON object containing all 6 fields (`id`, `description`, `operations`, `model`, `effort`, `skills`).
- The response is parsed via `parseAgentDraft`, which ignores `systemPrompt` and `permissions` (safe permissions `{ read: "allow", edit: "ask" }` are hardcoded at creation time).
- A 3-action preview screen (`AiPreview` in `src/tui/screens/ai-preview.tsx`: `Approve`, `Request changes`, `Discard`) lets the user review the generated fields before anything is committed to disk.

While functional, this model has significant usability limitations:
- **Blank-canvas problem**: Users are forced through manual form steps before reaching AI assistance.
- **One-shot cognitive load**: The LLM must infer all requirements in a single response without clarifying user intent, target workflows, or constraints.
- **Disconnected capabilities**: The authoring prompt does not leverage installed OpenCode skills dynamically or guide model/effort tradeoffs interactively.

### Affected Areas

- `src/core/coordinator.ts` — Authoring protocol, interview turn state, prompt templates with dynamic context (installed skills, catalog constraints), structured draft extraction and refinement.
- `src/core/types.ts` — Type definitions for interview messages, turn state, skill recommendations, and authoring checkpoints.
- `src/tui/agent-suite-nav.ts` — Navigation state machine: new `ai-interview` screen definition, turn/message state, deprecation of the 6-step `create` wizard navigation.
- `src/tui/agent-suite-app.tsx` — End-to-end event routing, multi-turn session streaming/cancellation, controller bridge, and transition to review/approval.
- `src/tui/screens/create-agent.tsx` — Replaced or restructured into a final structured review/edit panel rather than a 6-step wizard.
- `src/tui/screens/ai-interview.tsx` (new) — Interactive conversational UI rendering dialogue turns, progressive draft checkpoints, skill recommendation chips, and quick-reply choices.
- `src/tui/screens/ai-preview.tsx` — Shared preview/review component for finalizing and approving candidate agents.
- `test/coordinator.test.ts`, `test/agent-suite-nav.test.ts`, `test/ai-preview.test.ts` — Unit and regression test suites covering multi-turn interview flows, parsing resilience, and cancellation.

### Approaches

| Approach | Pros | Cons | Complexity |
|----------|------|------|------------|
| **1. Deterministic Wizard Enhanced by AI**<br>Keep 6-step form, adding an AI assist/suggest button at each field step | Minimal navigation changes; predictable sequential steps; low blast radius | Still suffers from rigid form structure; fragmented AI context per field; high friction for non-expert users | Medium |
| **2. Pure Conversational AI Interview**<br>Replace creation entirely with a free-form chat session that directly outputs the final agent | Intuitive, natural interaction; zero manual form entry; allows deep context exploration | Risk of open-ended conversational drift; harder keyboard navigation in TUI; harder to manually tweak individual fields before save | High |
| **3. Hybrid Adaptive Interview with Live Synthesis & Manual Escape Hatch (Recommended)**<br>AI leads a structured multi-turn interview (1 question per turn with suggestions), progressively compiling a visible draft checkpoint, with an immediate transition to structured preview/manual editing | Combines conversational discovery with deterministic precision; clear progress visibility; guarantees user control; easy escape hatch to manual editing; leverages Matt Pocock questionnaire/grilling patterns | Requires careful turn state management, structured checkpoint extraction, and bounded TUI layout | Medium-High |

### Recommendation

Adopt **Approach 3: Hybrid Adaptive Interview with Live Synthesis & Manual Escape Hatch**.

**Key Design Pillars**:
1. **Adaptive Turn-Based Interview Loop**:
   - The user selects "Crear agente". If the coordinator is configured, it immediately opens the AI Interview.
   - The AI acts as an expert agent designer (grounded in clean architecture, deep modules, and specialized tooling).
   - In each turn, the AI asks **one focused question** (e.g., core mission, trigger situations, required tools/skills, output expectations) and optionally provides 2–4 quick-select suggestions.
2. **Progressive Live Synthesis**:
   - Alongside the conversation, the system maintains a visible "Draft Checkpoint" summary (`id`, `description`, `skills`, `operations`, `model`, `effort`).
   - Each model response returns both the next conversational question and an updated structured draft.
3. **Skill & Model Intelligence**:
   - The interview queries installed OpenCode skills (`client.app.skills`) and proactively suggests exact matches with explanations.
   - Recommends provider/model/effort based on the complexity of the agent's responsibilities.
4. **Deterministic Gate & Manual Review**:
   - Once requirements are understood, the interview concludes with a synthesis turn that transitions to the structured `AiPreview` screen.
   - Users can approve, request further conversational changes, or jump into manual field tweaking before final persistence.
   - No filesystem or config writes occur until explicit `Finalizar` / `Approve`.

### Safety & User Control Contract

- **Zero Unapproved Writes**: No agent file (`~/.config/opencode/agents/<id>.md`) or config entry is written during the interview. Persistence only occurs after explicit user approval on the final preview.
- **Immediate Cancellation**: Every turn respects `AbortSignal`. Pressing `Esc` or activating `Cancelar` immediately aborts any inflight LLM request and returns safely without state corruption.
- **Fail-Closed Permissions**: Permissions remain non-negotiable product policy (`{ read: "allow", edit: "ask" }`). Suggestions from LLMs regarding permissions are stripped.
- **Skill Safety & Reuse**: Installed skills are discovered and recommended first. New skill generation or external imports remain subject to the existing safe ingestion boundaries.
- **Deterministic Validation**: Final draft fields undergo strict schema validation (`validateAgentId`, `validateModelId`, `validateSkillId`, `validateVariantId`) before submission.

### Session Lifecycle: Ephemeral vs Persisted

- **Recommendation**: Ephemeral in-memory interview state per TUI session.
- **Rationale**: An agent creation interview takes 1–3 minutes. Persisting draft conversational state to disk introduces orphaned scratch files, migration overhead, and stale state bugs. If the user cancels or closes the TUI, the in-memory draft is cleanly discarded. If the user completes the interview, it transitions directly to the existing atomic persistence pipeline.

### Prioritized Product Decisions Frontier (For Orchestrator)

Before proceeding to formal proposal and specifications, the orchestrator should clarify these prioritized decisions with the user:

1. **Default Creation Experience & Fallback**:
   - *Question*: Should selecting "Crear agente" launch the AI interview directly as the single primary experience (with a manual editor accessible from the preview/escape hatch), or should users without a configured coordinator be guided through coordinator setup first?
   - *Why it matters*: Determines whether the legacy 6-step form is completely retired or kept as an unconfigured fallback.

2. **Interview Pacing & Turn Structure**:
   - *Question*: Should the interview follow a strict single-question-per-turn rhythm (with 2–4 clickable/selectable quick-reply options), or allow open multi-paragraph conversational exchanges?
   - *Why it matters*: Influences TUI input ergonomics, keyboard navigation, and prompt engineering for token efficiency.

3. **Installed Skills Recommendation Behavior**:
   - *Question*: Should the AI proactively propose attaching specific installed skills based on the agent's description during the interview, requiring user confirmation per skill, or present a filtered skill checklist at the end of the interview?
   - *Why it matters*: Defines how dynamic skill context is injected into the coordinator prompt and how skill selections are confirmed.

4. **Model and Effort Assignment Strategy**:
   - *Question*: Should the AI automatically recommend and set the optimal provider/model/effort in the draft based on task complexity (e.g. reasoning vs fast execution), or should model selection always prompt the standard provider→model→effort picker?
   - *Why it matters*: Balances automation convenience with user preference for explicit model control.

5. **Modify Flow Parity**:
   - *Question*: Should the "Asistente IA" action in the existing agent Modify panel also use this multi-turn interview experience, or retain a single-turn refinement prompt?
   - *Why it matters*: Governs component reuse and review budget sizing across Create and Modify domains.

### Risks

- **Context Window & Latency**: Multi-turn history increases token usage and latency. *Mitigation*: Keep conversation bounded to 3–5 turns, sending concise system prompts and summarizing previous turns.
- **Non-JSON or Malformed LLM Turns**: Model might fail to return the structured checkpoint. *Mitigation*: Robust dual-part parsing (conversational text + JSON checkpoint block) with fallback to previous checkpoint.
- **Review Budget Breach (>400 lines)**: Full overhaul touches navigation, screens, core prompt, and tests. *Mitigation*: Force-chain into 4 focused vertical slices: (1) Core multi-turn interview types and coordinator engine; (2) TUI interview screen and navigation state; (3) Skill recommendation and preview bridge; (4) Wizard deprecation and integration tests.

### Ready for Proposal

**Yes**. The codebase structure, state machines, and coordinator contracts have been mapped. Once the orchestrator resolves the 5-question frontier with the user, the change is ready for the formal SDD Proposal phase.
