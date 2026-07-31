# Local Installation

Suite de Agentes is not published on npm. These examples use the checkout directly and do not modify configuration automatically.

## Windows

From PowerShell:

```powershell
Set-Location -LiteralPath "C:\Users\DELL\projects\0.-MEJORA-OPENCODE-TRABAJANDO\revision-selector-agente"
npm install
npm run build
```

Add the server entry to `C:\Users\DELL\.config\opencode\opencode.json`:

```json
{
  "plugin": [
    "C:\\Users\\DELL\\projects\\0.-MEJORA-OPENCODE-TRABAJANDO\\revision-selector-agente\\dist\\server.js"
  ]
}
```

Add the TUI entry to `C:\Users\DELL\.config\opencode\tui.json`:

```json
{
  "plugin": [
    "C:\\Users\\DELL\\projects\\0.-MEJORA-OPENCODE-TRABAJANDO\\revision-selector-agente\\dist\\tui.js"
  ]
}
```

## Use the TUI

Restart OpenCode after installing the plugin. Press **Alt+S** or run `/agent-suite`; the window contains only **Catálogo** and **Crear agente**. The catalog footer/title reports the plugin version (`v0.1.0`).

## POSIX

```sh
cd /path/to/revision-selector-agente
npm install
npm run build
```

`~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "/path/to/revision-selector-agente/dist/server.js"
  ]
}
```

`~/.config/opencode/tui.json`:

```json
{
  "plugin": [
    "/path/to/revision-selector-agente/dist/tui.js"
  ]
}
```

The server package exports `.` and `./server` to `dist/server.js`; the TUI package export is `./tui` to `dist/tui.js`. Absolute paths avoid relying on npm publication or package-manager resolution.

## Runtime authorization boundary

After OpenCode loads the plugin, its server `config` hook replaces the in-memory
top-level and `agent["gentle-orchestrator"].permission.task` maps with `*`:
`deny` plus exact allows for the configured Gentle-AI internal SDD,
review/refuter, and Judgment Day primary/fallback agents. The per-agent map is
the effective boundary because OpenCode gives it precedence over top-level
permissions. This prevents stale task rules from reintroducing prompts. `general`,
built-in `explore`, `agent-especialit-github`, custom agents, and lookalike names
such as `sdd-evil` still require the exact current-turn consent line. The hook
preserves unrelated configuration and permission fields and never writes global
configuration; restart OpenCode after changing the plugin build.
