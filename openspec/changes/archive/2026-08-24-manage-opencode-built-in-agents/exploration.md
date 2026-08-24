## Exploration: Manage OpenCode Built-In Agents

### Current State
Today, Suite de Agentes manages custom agents and a minimal hardcoded seed list (`SUITE_DE_AGENTES_SEED = ["general", "agent-especialit-github"]`). 
- **Catalog Membership**: The catalog builds rows exclusively for `SUITE_DE_AGENTES_SEED` plus custom agents (`src/core/suites.ts`). Other built-in OpenCode agents (`build`, `plan`, `explore`) are excluded from the catalog and cannot be customized or disabled through Suite de Agentes.
- **Base Overrides & Disabling**: The system supports overriding descriptions, operations, and skills for base agents in `SuiteConfig.baseOverrides` and deactivating base agents in `SuiteConfig.disabledAgents`. Deactivated base agents are stripped from runtime config and rejected by task policy.
- **Dispatch & Confirmation Seam**: Automatic dispatch via the `task` subagent tool is gated in `src/server/index.ts` (`tool.execute.before`) calling `decideTaskGate` in `src/core/policy.ts`. Only exact internal Gentle-AI agents (`INTERNAL_AGENT_ALLOWLIST`) are pre-authorized without consent. Any other agent (including `general` and `explore`) requires an exact same-turn user grant (`usa también agente: <id>`).
- **Internal vs Public Agents**: OpenCode defines public visible built-ins (`general`, `build`, `plan`, `explore`) and hidden internal runtime agents (`compaction`, `title`, `summary`). Currently, the codebase treats unknown non-internal agents homogeneously, but does not formalize the boundary between public controllable base agents and hidden runtime internals.

### Affected Areas
- `src/core/types.ts` — Agent metadata types, seed definitions, and catalog row representation.
- `src/core/suites.ts` — Extended seed agent definitions (`SUITE_DE_AGENTES_SEED` or `BUILTIN_AGENTS` descriptor table), default metadata, and catalog builder.
- `src/core/policy.ts` — Task gate policy rules, permission mapping, and confirmation rules distinguishing manual user selection from orchestrator auto-dispatch.
- `src/core/config.ts` — Validation for base agent overrides and deactivation across the expanded built-in set.
- `src/server/index.ts` — Runtime plugin hook integration, applying model/prompt overrides, handling disabling, and enforcing the confirmation gate.
- `src/tui/screens/catalog.tsx` & `src/tui/visual-tokens.ts` — Display formatting (e.g. proper casing "General", "Build", "Plan", "Explore") while keeping technical lowercase identifiers.
- `src/tui/screens/agent-info.tsx` & `src/tui/screens/modify-panel.tsx` — Base agent editing, operations/skills display, and deactivation/reactivation flows for all built-ins.
- `test/suites.test.ts`, `test/policy.test.ts`, `test/server.test.ts`, `test/agent-suite-catalog.test.ts`, `test/agent-suite-edit.test.ts` — Unit and integration tests covering the new built-ins, safe disable, overrides, display names, and confirmation gating.

### Approaches

1. **Extended Seed Registry with Explicit Tier Classification (Recommended)**
   - Define a structured metadata catalog for public controllable built-in agents (`general`, `build`, `plan`, `explore`, and `agent-especialit-github`) with display names, default descriptions, roles, and appropriate default skill sets.
   - Explicitly exclude hidden runtime utility agents (`compaction`, `title`, `summary`) from the user catalog and override/disable surfaces to protect core runtime stability.
   - Keep technical IDs lowercase (`general`, `build`, `plan`, `explore`) in storage, markdown, and runtime APIs, while presenting formatted display names ("General", "Build", "Plan", "Explore") in UI/TUI.
   - Enforce mandatory explicit user confirmation on automatic orchestrator dispatch for all public built-ins and custom agents through the existing `decideTaskGate` / `tool.execute.before` seam, while manual user invocation remains direct.
   - Fully integrate with existing `baseOverrides` and `disabledAgents` semantics: disabling a built-in removes it from runtime agent availability and task dispatch.
   - **Pros**:
     - Preserves clean catalog-only architecture and existing persistence schema (`SuiteConfig` version 1).
     - Protects hidden runtime engine utilities (`compaction`, `title`, etc.) from accidental user corruption or deactivation.
     - Provides first-class UX with clean display names and role-appropriate descriptions and skills.
     - Reuses verified task gating seam with zero runtime overhead.
   - **Cons**:
     - Adding future OpenCode built-ins requires updating the seed metadata table.
   - **Effort**: Low to Medium

2. **Dynamic Runtime Agent Discovery with Generic Protection Filters**
   - At startup, inspect OpenCode's runtime `config.agent` map dynamically to register all detected agents as base agents.
   - Filter out known internal prefixes or utility agents via regex/exclusion list (e.g., `compaction`, `title`, `summary`, `sdd-*`, `review-*`, `jd-*`), leaving remaining agents editable and visible.
   - Auto-generate display names by capitalizing kebab-case identifiers.
   - Intercept task dispatch generically for all non-allowlisted agents.
   - **Pros**:
     - Automatically picks up any new built-in agent added by future OpenCode updates without code changes.
   - **Cons**:
     - Unpredictable agent metadata (descriptions, default skills, role boundaries) if not statically known.
     - Risk of exposing internal subagents or plugins that should not be edited or disabled.
     - Harder to provide curated Spanish/English descriptions and role-aligned default skills.
     - More complex validation and test matrix.
   - **Effort**: Medium to High

### Recommendation
Adopt **Approach 1 (Extended Seed Registry with Explicit Tier Classification)**. It cleanly aligns with the existing architecture in `src/core/suites.ts` and `src/core/policy.ts`, provides deterministic role-specific descriptions and skill sets for `general`, `build`, `plan`, and `explore`, strictly isolates hidden runtime internals (`compaction`, `title`, `summary`), and seamlessly supports full editing, model assignment, safe disabling, and same-turn confirmation gating.

### Risks
- **Runtime Engine Dependency Risk**: If a user disables a fundamental agent like `build` or `plan`, workflows expecting that agent will fail unless clearly informed. (Mitigated by clear TUI status indication `DESACTIVADO` and predictable task gate error messages).
- **Identifier Case Sensitivity**: OpenCode routing expects lowercase kebab-case keys (`build`, `plan`). Display layer must maintain a clean separation between presentation names and technical keys. (Mitigated by display-layer mapping in `visual-tokens.ts`/`catalog.tsx`).
- **Orchestrator Deadlock**: If orchestrator attempts automatic dispatch to a controlled built-in agent without user consent grant, execution blocks. (Mitigated by clear error message instructing how to grant consent via `usa también agente: <id>`).

### Ready for Proposal
Yes. The requirements, architectural seam, built-in agent boundaries, confirmation UX, and test strategies are clear. The orchestrator can proceed with creating the formal proposal in `openspec/changes/manage-opencode-built-in-agents/proposal.md`.
