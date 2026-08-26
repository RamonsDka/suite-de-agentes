# Local Installation

Suite de Agentes is designed as a local OpenCode plugin. These examples demonstrate how to build and configure the plugin from a local repository checkout.

---

## Windows (PowerShell)

### 1. Build the Plugin

```powershell
Set-Location -LiteralPath "C:\path\to\suite-de-agentes"
npm install
npm run build
```

### 2. Configure OpenCode

Add the server entry to your user configuration in `C:\Users\<username>\.config\opencode\opencode.json`:

```json
{
  "plugin": [
    "C:\\path\\to\\suite-de-agentes\\dist\\server.js"
  ]
}
```

Add the TUI entry to `C:\Users\<username>\.config\opencode\tui.json`:

```json
{
  "plugin": [
    "C:\\path\\to\\suite-de-agentes\\dist\\tui.js"
  ]
}
```

---

## POSIX (Linux / macOS)

### 1. Build the Plugin

```sh
cd /path/to/suite-de-agentes
npm install
npm run build
```

### 2. Configure OpenCode

Add the server entry to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "/path/to/suite-de-agentes/dist/server.js"
  ]
}
```

Add the TUI entry to `~/.config/opencode/tui.json`:

```json
{
  "plugin": [
    "/path/to/suite-de-agentes/dist/tui.js"
  ]
}
```

*Note: The server package exports `.` and `./server` to `dist/server.js`; the TUI package export is `./tui` to `dist/tui.js`. Specifying absolute paths ensures predictable resolution without requiring an npm registry publication.*

---

## Using the TUI

Restart OpenCode after updating configuration.

1. Press **`Alt+S`**, type **`/agent-suite`**, or select **Suite de Agentes** from the command palette.
2. The window opens directly to the searchable **Catálogo de Agentes**.
3. Use arrow keys (`↑` / `↓` / `←` / `→`) to navigate across agents, `PageUp` / `PageDown` to switch pages, or `/` to search.
4. Press `Enter` on any agent to inspect its details or configure AI provider, model, and reasoning effort.
5. For a complete visual walkthrough, see the [UI & Interaction Guide](ui-guide.md).

---

## Runtime Authorization Boundary

After OpenCode loads the plugin, the server `config` hook replaces the in-memory top-level and `agent["gentle-orchestrator"].permission.task` maps with a strict `*`: `deny` policy plus exact allows for configured internal Gentle-AI agents (`sdd-*`, `review-*`, `jd-*`).

The per-agent map is the effective security boundary because OpenCode gives it precedence over top-level permissions. This prevents stale task rules from reintroducing unvetted permissions.

User agents (`general`, `agent-github`, custom agents) and lookalike names (such as `sdd-evil`) always require an explicit, current-turn consent grant:

```text
usa también agente: agent-github
```

The hook preserves unrelated configuration and permission fields and never writes global configuration. Restart OpenCode after rebuilding the plugin.
