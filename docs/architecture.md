# Architecture

Suite de Agentes is deliberately sibling-shaped and SDD-independent.

## Boundaries

- `src/core`: strict custom-agent registry, owned seed-plus-custom catalog, atomic persistence, runtime model discovery, markdown generation, consent ledger, and task policy.
- `src/server`: OpenCode lifecycle adapters. `chat.message` records current-message grants; `tool.execute.before` is the only authority for `task` gating when the session agent is `gentle-orchestrator`.
- `src/tui`: OpenTUI/Solid entrypoint, Alt+S and `/agent-suite` registration, direct searchable catalog, read-only details, atomic provider/model/effort assignment, version labels, and host compatibility guards. Agent-definition changes remain outside the TUI. Registration relies on the host's current plugin lifecycle rather than adding duplicate disposal ownership.

## Trust model

The message event is the source of consent. OpenCode 1.18.5 exposes the current message ID to `chat.message`, while `tool.execute.before` exposes only `sessionID` and `callID`. The adapter stores one latest real `(messageID, agent)` mapping per session and rejects the task when it cannot resolve that mapping. The ledger key is `(sessionID, messageID, agentID)`. A registered canonical text grant is materialized as a schema-valid native `AgentPart`, because `SessionPrompt` derives `bypassAgentCheck` from user-message parts before TaskTool calls `ctx.ask`. The server hook remains the per-target authority, so the boolean bypass cannot turn an A grant into B permission. No previous message, unknown text, static permission setting, or UI selection can create a grant. The gate requires exact IDs and rejects ambiguity.

The internal Gentle-AI authorization boundary is intentionally hard-coded as one exact allowlist in `src/core/policy.ts`. It contains every configured primary and fallback `sdd-*` agent, every review lens plus `review-refuter` and their fallbacks, and `jd-fix-agent`, `jd-judge-a`, `jd-judge-b` plus their fallbacks. Authorization uses exact membership, never a `sdd-*`/`review-*`/`jd-*` prefix predicate; `sdd-evil` therefore remains blocked. `general`, built-in `explore`, `agent-especialit-github`, plugin-created custom agents, and any future name require the exact current-turn consent grant. `gentle-orchestrator` itself is not a grantable target. `delegate` is not intercepted because OpenCode 1.18.5 does not provide a stable, documented target field for this plugin to validate safely.

## Persistence and materialization

The registry JSON is private namespace data and is parsed before use. It stores `version`, `customAgents`, per-agent model and variant assignments, and optional base overrides or disabled-agent state. An optional legacy `coordinator` field remains opaque compatibility data only; the current plugin does not expose coordinator functionality. Empty legacy suite fields are tolerated for a safe replacement on the next successful write; non-empty assignments throw before any write. Writes use a random sibling temporary file, restrictive mode, and rename. Global agent markdown is generated only after caller confirmation and validates the ID before path construction. The generated frontmatter has `permission.skill`, while skills become explicit prompt instructions.

The server plugin captures registered agent IDs from the OpenCode `config` hook. The same hook applies `transformTaskPermission()` to the top-level runtime `permission.task` map and, when present, to `agent["gentle-orchestrator"].permission.task`; the per-agent map is required because it overrides top-level permissions. `*` is denied first, exact internal names are allowed after it, and stale task rules are replaced so global configuration cannot reintroduce prompts or permissions. Other config and permission fields are preserved, and a missing orchestrator entry is not invented. If the inventory is unavailable, canonical text and native `AgentPart` consent produce no grant. Session agent resolution uses the real chat message agent first and the official session-message API as a fallback; unresolved turns fail closed only at the orchestrator gate.

## Configuration transformation

`transformTaskPermission()` remains pure and documented. The server hook applies its exact map only to the in-memory runtime config object supplied by OpenCode; it does not write the user's global configuration. Because unrelated top-level config and permission fields are spread through unchanged, the hook hardens only task-agent authorization.
