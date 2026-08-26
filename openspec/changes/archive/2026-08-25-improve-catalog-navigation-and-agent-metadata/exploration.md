# Exploration: improve-catalog-navigation-and-agent-metadata

## Current State

The Suite de Agentes (`opencode-agent-suite`) provides a terminal user interface (TUI) and runtime controller for managing AI agents in OpenCode. Currently:

1. **Catalog Keyboard Navigation**:
   - The catalog displays agents paginated at `MAX_VISIBLE_ROWS = 6` items per page.
   - When navigating with keyboard ArrowDown (`eventForKey` returning `{ type: "MOVE_FOCUS", delta: 1, maxFocus: 5 }`), `reduceNav` in `src/tui/agent-suite-nav.ts` clamps `focus` within `[0, maxFocus]`.
   - When focus reaches index 5 (the last row of page 0/1), `clamp(5 + 1, 5)` returns `5`. The catalog never automatically transitions to `page: 1, focus: 0`.
   - The user is currently forced to use the mouse scroll wheel (`dispatchCatalogWheel`) or `pageup`/`pagedown` keys to reach subsequent pages.

2. **Agent Catalog Metadata & Registry**:
   - The canonical seed list in `src/core/suites.ts` defines `SUITE_DE_AGENTES_SEED = ["general", "agent-especialit-github"]`.
   - Built-in agents (`general`, `build`, `plan`, `explore`, `compaction`, `title`, `summary`) and custom agents are cataloged and manageable via `baseOverrides` and custom agent records in `suite-config.json`.
   - Some agent descriptions and skill associations lack specificity or do not explicitly declare optimal skill bindings.

3. **GitHub Specialist Identity**:
   - The GitHub agent has a misspelled canonical ID `agent-especialit-github` in `src/core/suites.ts`, `test/*`, policy allowlists, and `~/.config/opencode/agent/agent-especialit-github.md`.
   - Its prompt text specifies: `The compatible Task identifier is agent-especialit-github; the requested visible name is exactly Agent-especialit-GitHub`.
   - The desired presentation is `Agent-Github`, and the canonical identifier should be cleaned up while preserving backward compatibility and migration safety.

4. **External Asset Ingestion**:
   - Multiple candidate skills, agents, and commands from `davila7/claude-code-templates` and `github/awesome-copilot` were proposed for evaluation.
   - These need technical evaluation against OpenCode's architecture, security boundaries (read-only vs write actions, MCP dependencies vs `gh` CLI), and existing skill inventory.

---

## Fast Deterministic Red-Capable Test / Harness

### Seam & Test Command
- **Test File**: `test/agent-suite-nav.test.ts` (or `test/agent-suite-catalog.test.ts`)
- **Execution Command**: `npm test -- test/agent-suite-nav.test.ts`
- **Current Behavior**: Fast execution (~1.8s) via Vitest with in-memory state transitions.

### Failure Mechanism (Why it will go RED before fix)
Given a catalog with 14 rows (`maxPage = 2`, `page = 0`, `focus = 5`):
```typescript
it("seamlessly advances page on ArrowDown at page bottom and retreats on ArrowUp at page top", () => {
  const catalogAtBottom: NavState = {
    stack: [
      { kind: "landing", focus: 0 },
      { kind: "catalog", page: 0, focus: 5, query: "", searchFocused: false }
    ],
    busy: false,
    closing: false
  };

  // Navigating Down from page 0, focus 5 should advance to page 1, focus 0
  const afterDown = reduceNav(catalogAtBottom, {
    type: "MOVE_FOCUS",
    delta: 1,
    maxFocus: 5,
    totalRowCount: 14 // or maxPage: 2
  });

  expect(afterDown.stack.at(-1)).toMatchObject({
    kind: "catalog",
    page: 1,
    focus: 0
  });
});
```
- **Red Result**: Currently `reduceNav` executes `focus: clamp(screen.focus + event.delta, event.maxFocus ?? 0)` which clamps `5 + 1` to `5`, leaving `page: 0, focus: 5`. The assertion `page: 1, focus: 0` will fail deterministically without mocking or UI rendering overhead.

---

## Affected Areas

- `src/tui/agent-suite-nav.ts` — `NavEvent` and `reduceNav` handling for `MOVE_FOCUS` to support page wrapping / page advancement when crossing row boundaries.
- `src/tui/agent-suite-app.tsx` — `eventForKey` parameter calculation for `MOVE_FOCUS` and `Catalog` callback wiring (`onMoveFocus`, `onPage`).
- `src/tui/screens/catalog.tsx` — Key handling in `<input>` search field and row bounds calculation `catalogFocusBounds`.
- `src/tui/visual-tokens.ts` — `formatCatalogName` display helper / presentation formatting.
- `src/core/suites.ts` — `SUITE_DE_AGENTES_SEED` constant and catalog builder matching.
- `src/core/agents.ts` & `src/core/persistence.ts` — Agent file resolution, migration helper for `agent-especialit-github` -> `agent-github`.
- `src/core/policy.ts` & `src/server/index.ts` — Policy allowlists and consent handling for `agent-github` with alias compatibility.
- `test/agent-suite-catalog.test.ts`, `test/agent-suite-nav.test.ts`, `test/server.test.ts`, `test/config.test.ts` — Unit and integration tests.

---

## Approaches Analysis

### 1. Catalog Pagination & Arrow Navigation

| Approach | Description | Pros | Cons | Complexity |
|---|---|---|---|---|
| **Approach 1.A: Boundary-Aware Navigation in `reduceNav` (Recommended)** | `reduceNav` checks if `screen.focus + delta > maxFocus` on current page: if `screen.page < maxPage`, transitions to `page: screen.page + 1, focus: 0`. If `focus + delta < 0` and `screen.page > 0`, transitions to `page: screen.page - 1, focus: prevPageMaxFocus`. | Seamless keyboard navigation across all items; natural feel; preserves pagination chunking. | Needs `totalRowCount` or `maxPage` in event payload or state. | Low-Med |
| **Approach 1.B: Flat Global Index with Virtual Windowing** | State tracks `selectedIndex: 0..N-1` globally; `page` and `focus` are derived purely for rendering (`page = Math.floor(index / 6)`, `focus = index % 6`). | Simplifies navigation math to single integer increment/decrement. | Changes `AppScreen.catalog` schema shape; larger migration surface across VM and components. | Med-High |
| **Approach 1.C: Wrap Focus Within Current Page Only** | When hitting bottom row, wraps around to top row of same page (`focus = 0`, same page). | Trivial to implement. | Does NOT solve the user problem — still cannot access page 2 without mouse or PageDown. | Low |

### 2. GitHub Agent Renaming & Migration (`agent-especialit-github` -> `Agent-Github`)

| Approach | Description | Pros | Cons | Complexity |
|---|---|---|---|---|
| **Approach 2.A: Display-Name-Only Formatting** | Keep internal ID `agent-especialit-github`, but map display in TUI and catalog to `Agent-Github`. | Zero risk of breaking existing task invocations or config references. | Leaves the spelling typo in filesystem filenames (`.md`), config keys, logs, and CLI identifiers. | Low |
| **Approach 2.B: Canonical ID Rename with Automatic Migration & Alias Fallback (Recommended)** | Change canonical seed ID to `agent-github`. Add automatic migration in `persistence.ts`/`agents.ts` that renames `agent-especialit-github.md` to `agent-github.md` (or treats `agent-especialit-github` as an alias in policy/grants). Format title display as `Agent-Github`. | Clean, professional naming; fixes typo; maintains full backward compatibility for existing scripts/grants; matches OpenCode ID syntax (`/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/`). | Requires alias mapping in consent/policy checks during migration period. | Med |
| **Approach 2.C: Hard Breaking Rename** | Immediately rename ID to `agent-github` with no alias support for `agent-especialit-github`. | Simplest codebase diff. | Breaks any existing user config or active sessions referencing the old identifier. | Low |

---

## Canonical Agent Catalog & Metadata Audit

A systematic review of all built-in, seed, and custom catalog agents:

| Agent Identifier | Category | Current Description / Role | Current Skills Declared | Proposed Concrete Improvements (No Fabricated Capabilities) |
|---|---|---|---|---|
| `general` | Seed / Built-in | General default assistant for coding, questions, and system tasks | `[]` (inherits global environment) | Clarify description: general-purpose conversational agent for exploration, multi-step problem solving, and unspecialized code tasks. |
| `agent-github` (formerly `agent-especialit-github`) | Seed / Specialist | GitHub specialist for Issues, PRs, reviews, comments, CI/CD, checks, pre-merge validation | Referencing `github-review-orchestration` in prompt, but empty frontmatter `skills` list | 1) Rename canonical ID to `agent-github` (Display: `Agent-Github`).<br>2) Explicitly bind installed skills: `github-review-orchestration`, `issue-creation`, `branch-pr`, `chained-pr`.<br>3) Enhance operations prompt with explicit `gh` CLI workflows (issue triage, PR review comments, CI run logs). |
| `build` | Canonical Built-in | Autonomous build, test execution, and compilation agent | Inherits environment | Clarify operations: focused on compiler errors, dependency resolution, and build script validation. |
| `plan` | Canonical Built-in | Architecture, planning, and task breakdown agent | Inherits environment | Clarify operations: generates structured implementation phases, dependency DAGs, and work breakdown structures. |
| `explore` | Canonical Built-in | Codebase exploration and structural discovery | Inherits environment | Clarify operations: leverages AST/CodeGraph, repo mapping, and fast search without modifying source files. |
| `compaction` | Canonical Built-in | Context compaction and session summarization | Inherits environment | Clarify operations: preserves critical decisions, active tasks, and context summaries across token limits. |
| `title` | Canonical Built-in | Session title generation | Inherits environment | Clarify operations: concise, semantic session titling based on initial user prompts. |
| `summary` | Canonical Built-in | Session end/milestone summary generator | Inherits environment | Clarify operations: structured receipts, accomplishments, next steps, and changed files. |
| Custom agents (e.g. `prueba`) | Custom / User | User-defined agents created via Suite de Agentes | Configured in `suite-config.json` | Ensure `displayName`, `description`, `skills`, and `operations` can be inspected and edited cleanly via TUI `modify` screen. |

---

## External Asset Evaluation

Evaluation of proposed assets against primary GitHub sources (`davila7/claude-code-templates` and `github/awesome-copilot`), checking actual content, security model, and utility for the GitHub specialist.

### 1. `davila7/claude-code-templates` Assets

| Asset Path & Type | Analysis of Actual Content | Verdict | Justification |
|---|---|---|---|
| `skills/development/github-actions-creator` (Skill) | Provides structured methodology for designing, templating, and authoring GitHub Actions YAML workflows across languages and triggers. | **RECOMMENDED (Opt-in / Reference)** | Valuable for teams creating CI/CD workflows from scratch. High quality, structured templates. Can be attached to specialized authoring workflows. |
| `skills/workflow-automation/github-workflow-automation` (Skill) | Guides automated PR reviews, issue triage, and GitHub Actions integration. | **REJECTED (Redundant)** | Heavy overlap with existing `github-review-orchestration` and `issue-creation` skills already installed in the workspace. |
| `skills/development/git-pushing` (Skill) | Automatically stages, generates commit messages, and executes `git push origin <branch>`. | **REJECTED (Security / Boundary Violation)** | Violates the safety boundary of `Agent-Github` (which is read-only by default and must never unilaterally push code). Git staging and pushing belongs to developer/orchestrator control. |
| `agents/security/github-actions-expert` (Agent) | Agent prompt focusing on secure CI/CD, action pinning (SHA pinning), least-privilege permissions, OIDC authentication, and supply-chain hardening. | **RECOMMENDED (Incorporate into Agent-Github Prompt)** | The security hardening guidelines (least-privilege permissions, SHA pinning) should be incorporated directly into `Agent-Github`'s review checklist rather than creating a separate disconnected agent. |
| `commands/project-management/github-issues` (Command) | Slash command template using `@modelcontextprotocol/server-github` MCP tools to create/update issues. | **REJECTED (Incompatible Model & Overlap)** | Uses an external MCP server (`mcp__github__*`) rather than the authenticated, native `gh` CLI. Overlaps with native `issue-creation` skill. |

### 2. `github/awesome-copilot` Assets

| Asset Path & Type | Analysis of Actual Content | Verdict | Justification |
|---|---|---|---|
| `skills/github-issues` (Skill) | Comprehensive prompt for managing GitHub issues via GitHub MCP tools (fields, milestones, dependencies, sub-issues). | **REJECTED (MCP Dependency & Overlap)** | Relies on MCP tools instead of `gh` CLI; redundant with existing `issue-creation` and `github-review-orchestration`. |
| `skills/create-github-action-workflow-specification` (Skill) | Reverse-engineers existing GitHub Actions workflow files into formal, implementation-agnostic specifications. | **REJECTED (Niche / Low Value)** | Niche documentation task; not directly aligned with GitHub agent core missions (triage, review, remediation, CI diagnosis). |
| `skills/git-commit` (Skill) | Interactive commit staging and conventional commit message generation using bash git commands. | **REJECTED (Redundant)** | Redundant with workspace conventions and existing `work-unit-commits` skill. |
| `skills/excalidraw-diagram-generator` (Skill) | Generates `.excalidraw` JSON diagrams via Python helper scripts. | **REJECTED (Out of Scope)** | Belongs to design/architecture domain (covered by `canvas-design` / `ckm:design`), completely out of scope for GitHub specialist. |
| `skills/documentation-writer` (Skill) | Technical writing guide based on the Diátaxis documentation framework (tutorials, how-to, reference, explanation). | **REJECTED (Out of Scope)** | General doc-writing skill, redundant with `cognitive-doc-design`; not specific to GitHub operations. |
| `skills/prd` (Skill) | Product Requirements Document generator for system features. | **REJECTED (Out of Scope)** | Belongs to product specification; handled by SDD (`sdd-propose`/`sdd-spec`). |
| `skills/gh-cli` (Skill) | *Asset does not exist in `github/awesome-copilot` repository.* | **REJECTED (Non-Existent)** | The repository contains `gh-attach`, but no standalone `gh-cli` skill. `gh` CLI operations are already well-covered in `github-review-orchestration`. |
| `skills/refactor` (Skill) | Code refactoring guide (extracting functions, reducing complexity). | **REJECTED (Out of Scope)** | Code refactoring belongs to core engineering / TDD agents, not GitHub agent. |

---

## OpenSpec Specs & Change Alignment

- **Affected Existing Specs**:
  - `openspec/specs/agent-catalog/spec.md`: Update catalog navigation requirements to require continuous arrow navigation across page boundaries. Update seed member specification to reference `agent-github` (Display: `Agent-Github`) with alias compatibility for `agent-especialit-github`.
  - `openspec/specs/built-in-agent-management/spec.md`: Clarify base agent override behavior and display name presentation.
- **Change Scope**:
  - OpenSpec change: `openspec/changes/improve-catalog-navigation-and-agent-metadata/`.
  - Review budget: under 400 lines of changes.

---

## Recommendation

1. **Pagination**: Implement **Approach 1.A** (Boundary-Aware Navigation in `reduceNav` & `Catalog`). When pressing ArrowDown at the last row of page $k < \text{maxPage}$, seamlessly transition to page $k+1$, focus 0. When pressing ArrowUp at the first row of page $k > 0$, seamlessly transition to page $k-1$, focus $\text{lastRow}$.
2. **GitHub Identity**: Implement **Approach 2.B** (Canonical ID `agent-github`, Display `Agent-Github`, with automatic migration of existing `agent-especialit-github.md` and alias support in policy/grants).
3. **GitHub Metadata & Operations**:
   - Update `agent-github.md` with explicit skill declarations (`github-review-orchestration`, `issue-creation`, `branch-pr`, `chained-pr`).
   - Enhance the operations prompt by incorporating CI security hardening guidelines (action pinning, permissions least privilege) from `github-actions-expert`.
4. **External Skills**: Reject redundant, MCP-dependent, and out-of-scope assets; retain `github-actions-creator` as an optional reference for workflow authoring.

---

## Risks

1. **Input Focus vs Result Focus Interference**:
   - *Risk*: When the search input is focused (`searchFocused === true`), ArrowDown switches focus to results. If pressing ArrowDown at the bottom row immediately triggers another page change, rapid key repeats might skip pages.
   - *Mitigation*: Ensure clean separation between `FOCUS_CATALOG_RESULTS` and `MOVE_FOCUS` boundary handling; verify with debounce and deterministic key event tests.
2. **Backward Compatibility with Existing Workflows**:
   - *Risk*: Existing scripts or orchestrator prompt history might still reference `agent-especialit-github`.
   - *Mitigation*: Keep `agent-especialit-github` registered as an accepted alias in `src/core/policy.ts` and `src/core/grants.ts` so calls to either ID succeed.
3. **Review Line Budget**:
   - *Risk*: Spanning UI navigation, agent config, and migration logic could exceed the 400-line budget if not cleanly modularized.
   - *Mitigation*: Focus changes strictly on `reduceNav` boundary conditions, `agent-suite-app.tsx` event propagation, and `suites.ts` seed naming.

---

## Ready for Proposal

**Yes.** The exploration is complete with concrete evidence from code intelligence, primary GitHub repository inspection, deterministic red-capable test definitions, and bounded architectural recommendations. The orchestrator may proceed to the `sdd-propose` phase for `improve-catalog-navigation-and-agent-metadata`.
