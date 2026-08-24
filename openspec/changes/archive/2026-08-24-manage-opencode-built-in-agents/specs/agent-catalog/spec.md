# Delta for Agent Catalog

## MODIFIED Requirements

### Requirement: Scoped catalog membership

The catalog MUST include all active controllable OpenCode built-in agents (canonical set `general`, `build`, `plan`, `explore`, `compaction`, `title`, `summary` and discovered built-ins), seed member `agent-especialit-github`, and custom agents created through this plugin. Disabled agents MUST be omitted from active catalog listings. The catalog MUST exclude external orchestrator and framework agents, including `gentle-orchestrator`, IDs beginning with `sdd-`, `review-`, or `jd-`, and IDs ending with `-fallback`.
(Previously: The catalog included only seed members general and agent-especialit-github plus custom agents.)

#### Acceptance & Edge Case Checklist
- [ ] Lists active canonical and discovered built-in agents alongside custom agents.
- [ ] Omits disabled agents from active catalog view.
- [ ] Excludes orchestrator, SDD, review, Judgment Day, and fallback agents.

#### Scenario: Filter the runtime inventory

- GIVEN the runtime inventory contains built-in, custom, SDD, review, Judgment Day, fallback, orchestrator, and unrelated IDs
- WHEN `Catálogo` is opened
- THEN only active controllable built-in, seed, and plugin-created custom members are listed
- AND excluded IDs are absent regardless of their runtime descriptions

#### Scenario: Seed runtime agent is absent

- GIVEN a seed member is configured as Suite de Agentes membership but is absent from the current runtime inventory
- WHEN the catalog is opened
- THEN the seed remains listed with a not-materialized/unavailable state
- AND the catalog does not replace it with an unrelated runtime agent

### Requirement: Spanish compact catalog interaction

The catalog MUST be compact, scrollable, and Spanish. Each row MUST expose detail actions appropriate to its type: edit, baseline restore, and disable toggles for built-in agents; edit, delete, and materialization actions for custom agents. Disabled agents MUST NOT be selectable for execution.
(Previously: Row actions were limited to member detail and custom materialization/deletion without built-in editing or disable toggles.)

#### Acceptance & Edge Case Checklist
- [ ] Exposes edit, baseline restore, and disable actions for built-ins.
- [ ] Preserves materialization and delete actions for custom members.
- [ ] Prevents execution of disabled agents.

#### Scenario: Inspect and materialize a custom member

- GIVEN a plugin-created custom member exists in the registry but is absent from the runtime inventory
- WHEN the user opens its detail and chooses its available action
- THEN the detail identifies the member and its not-materialized state
- AND materialization is offered without falsely reporting the member as ready

#### Scenario: Empty catalog state

- GIVEN no seed or custom member is available to render
- WHEN the user opens `Catálogo`
- THEN a compact Spanish empty-state message is shown
- AND the surface remains navigable back to the two-option root

### Requirement: Exact current-turn consent

The change MUST require explicit session-scoped confirmation grants before any agent automatically dispatches tasks to controllable Suite de Agentes members, while allowing direct manual user invocation without confirmation. The configured internal Gentle-AI system remains the maintainer-authorized exception for its exact primary/fallback SDD, review/refuter, and Judgment Day names.
(Previously: Required exact same-turn text 'usa también agente: <id>' for all invocations of user-controlled members.)

#### Acceptance & Edge Case Checklist
- [ ] Requires session-scoped consent for automated dispatch to user-controlled agents.
- [ ] Permits direct manual selection without consent prompt.
- [ ] Maintains authorized exception for exact configured internal SDD/review/JD agents.

#### Scenario: Invoke without and with consent

- GIVEN the orchestrator targets `agent-especialit-github`
- WHEN no active session grant exists
- THEN invocation is denied until explicit confirmation is granted
- WHEN an active session grant is confirmed
- THEN invocation is allowed for the remainder of the session

#### Scenario: Invoke an authorized internal agent without consent

- GIVEN the orchestrator targets one exact configured internal SDD, review/refuter, or Judgment Day primary/fallback name
- WHEN the current message has no consent grant
- THEN the task gate allows that exact internal name
- AND a lookalike name such as `sdd-evil` remains denied
