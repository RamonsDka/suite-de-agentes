# Suite de Agentes

`opencode-agent-suite` is an independent OpenCode plugin that exposes a scoped agent catalog, model-and-effort assignment, and per-turn consent controls. The visible product name is **Suite de Agentes**.

## Quick start

This package is not published to npm. Build it from this checkout:

```sh
npm install
npm run build
```

Add the server entry to `opencode.json` and the TUI entry to `tui.json`:

```json
// ~/.config/opencode/opencode.json
{
  "plugin": [
    "C:\\path\\to\\suite-de-agentes\\dist\\server.js"
  ]
}
```

```json
// ~/.config/opencode/tui.json
{
  "plugin": [
    "C:\\path\\to\\suite-de-agentes\\dist\\tui.js"
  ]
}
```

Use absolute paths as shown; this matches the local TUI plugin installation used by OpenCode 1.18.5. The package exports are also available as `.`/`./server` for `dist/server.js` and `./tui` for `dist/tui.js` when a local package spec is supported by the host. Restart OpenCode, then press **Alt+S**, use `/agent-suite`, or select Suite de Agentes from the command palette.

Suite de Agentes opens directly on the native, searchable OpenTUI catalog. Each row opens the existing Spanish detail layout for identity, status, description, skills, operations, model, and effort.

The catalog UI is intentionally read-only except for one focused assignment flow:

1. Choose **Cambiar modelo y esfuerzo** from an agent's details.
2. Select a provider.
3. Select one of that provider's models.
4. Select an effort level supported by that model.

Agent creation and all other definition changes are owned by the external orchestrator. Reopening or refreshing Suite de Agentes reloads persisted configuration so externally integrated agents appear in the catalog. The sidebar and dialog titles show the plugin version (`v1.0.1`).

Exact Windows and POSIX examples are in [`docs/local-install.md`](docs/local-install.md).

## What it manages

- The owned catalog contains `general`, `agent-especialit-github`, and externally managed custom agents.
- Runtime agents outside that allowlist—including `sdd-*`, `review-*`, `jd-*`, `*-fallback`, `gentle-orchestrator`, and unrelated IDs—never become catalog members.
- A member absent from the current runtime is shown as unavailable/not materialized instead of being replaced by another runtime agent.
- The runtime model catalog is read from OpenCode state; the plugin does not invent providers or models.
- Custom agents have an ID, description, model, prompt, permissions, and associated skills; the catalog displays those values without editing them.
- The Suite UI changes only model and effort. It has no built-in AI, interview, or skill-ingestion flow; creation, skills, operations, permissions, lifecycle, and agent-definition edits are performed externally.
- Host failures disable only the optional UI surface; the host-compatible fallback keeps registration and catalog access safe.

## Consent per turn

When the active session agent is `gentle-orchestrator`, the plugin permanently authorizes only the exact internal Gentle-AI system allowlist: every configured primary and fallback `sdd-*` agent, every configured review lens and `review-refuter` pair, and every configured Judgment Day judge/fix pair. This is an explicit name allowlist, not a prefix rule; a name such as `sdd-evil` is not internal. `general`, built-in `explore`, `agent-especialit-github`, and externally managed custom agents remain user agents and require an exact current-message grant:

```text
usa también agente: github-specialist
```

`@github-specialist` is accepted only when OpenCode has already produced an unambiguous AgentPart. Grants are keyed by `sessionID` and message ID, are never carried to a later turn, and fail closed for ambiguity or negation. OpenCode 1.18.5 supplies the current message ID through `chat.message` (or its output message), not through `tool.execute.before`; the adapter therefore keeps only the latest real message mapping per session and rejects tasks when that mapping is absent. The gate runs in `tool.execute.before` for `task`; prompts, `always` permissions, and the TUI are not authority. `delegate` is not granted by this plugin because OpenCode does not expose a stable target contract for it in this version.

For a registered canonical text grant, the server hook appends a valid OpenCode `AgentPart` (`prt_*`, current `sessionID`/`messageID`, exact `name`, and source span). OpenCode's `SessionPrompt` uses that part to set `bypassAgentCheck` for the turn, so the static task deny does not block the explicitly granted agent. The server hook still checks every `subagent_type` before TaskTool runs, so an AgentPart for A cannot authorize B. Unknown text never creates an AgentPart; plain `@agent` text is not a grant unless OpenCode itself supplied the native AgentPart.

The internal allowlist currently contains these exact names:

```text
sdd-init, sdd-explore, sdd-onboard, sdd-propose, sdd-spec,
sdd-design, sdd-tasks, sdd-apply, sdd-verify, sdd-archive,
sdd-init-fallback, sdd-explore-fallback, sdd-onboard-fallback,
sdd-propose-fallback, sdd-spec-fallback, sdd-design-fallback,
sdd-tasks-fallback, sdd-apply-fallback, sdd-verify-fallback,
sdd-archive-fallback,
review-readability, review-readability-fallback, review-refuter,
review-refuter-fallback, review-reliability, review-reliability-fallback,
review-resilience, review-resilience-fallback, review-risk,
review-risk-fallback,
jd-fix-agent, jd-fix-agent-fallback, jd-judge-a, jd-judge-a-fallback,
jd-judge-b, jd-judge-b-fallback
```

The server policy is scoped to `gentle-orchestrator`; other session agents are not changed by the plugin.

## Private registry and files

The private registry defaults to:

```text
~/.config/opencode/agent-suite/suites.json
```

The persisted shape includes `version`, `customAgents`, `modelAssignments`, and `variantAssignments`, with optional base overrides and disabled-agent state. A legacy `coordinator` field is retained only as opaque compatibility data; it is not a current UI or controller feature. Writes are validated, mode `0600`, temporary-file plus rename atomic, and do not edit global OpenCode configuration. An empty legacy registry is replaced only by a successful write; real legacy assignments are rejected visibly in Spanish and left untouched. Global custom agents, when explicitly confirmed, are written as markdown under:

```text
~/.config/opencode/agent/<agent-id>.md
```

IDs are lowercase kebab-case and path traversal is rejected. Existing global files are replaced only after confirmation by the caller.

## Recommended task permission hardening

The exported `transformTaskPermission()` returns the documented policy shape: `*` deny, exact internal agents allow, and `general`/other agents deny. The server plugin applies that exact map in its runtime `config` hook both to the top-level task permissions and, when present, to `agent["gentle-orchestrator"].permission.task`—the per-agent map that takes precedence in OpenCode. Stale task rules are replaced while unrelated configuration and permission fields are preserved; a missing orchestrator entry is not invented. Installation and tests do not modify the user's real configuration or global files.

## Compatibility

- OpenCode `1.18.5+`
- Node `24.x` (the development environment used Node `24.14.0`)
- ESM, strict TypeScript, tsup, Vitest, OpenTUI/Solid

The TUI uses the OpenTUI/Solid plugin shape used by the MIT reference plugin, with separate server and TUI entries. It is not a fork of `sdd-engram-plugin`, shares no SDD state, and does not activate or modify SDD profiles.

## Security and rollback

Back up `~/.config/opencode/agent-suite/` before manual changes. To roll back, remove the plugin entries, restore the suite JSON backup, and remove only markdown files created by Suite de Agentes. The plugin never changes `~/.config/opencode` during installation, tests, or build.

## Troubleshooting

- **A task is blocked:** add the exact Spanish consent line to the current user message. Do not rely on a previous turn or a task prompt.
- **The TUI is absent:** verify that `opencode-agent-suite/tui` is installed and restart OpenCode. An incompatible renderer is intentionally disabled safely.
- **A model is missing:** refresh/restart OpenCode so the plugin can read the current provider state.
- **Global materialization is refused:** provide an explicit confirmation and verify the ID is lowercase kebab-case.
- **Config validation fails:** inspect `suites.json`; unknown shapes and non-empty legacy assignments are rejected instead of silently repaired.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```

See [`docs/architecture.md`](docs/architecture.md) and [`docs/local-install.md`](docs/local-install.md).

## Project status

See [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) for the current product boundary, preserved workstreams, migration status, and recommended resumption point.
