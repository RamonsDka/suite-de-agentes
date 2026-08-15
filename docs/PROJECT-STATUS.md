# Suite de Agentes — Project Status

## Product

Suite de Agentes is the standalone `opencode-agent-suite` OpenCode plugin. It provides an owned agent catalog, custom-agent creation, per-turn consent controls, server lifecycle integration, and an OpenTUI/Solid user interface.

## Stack and architecture

| Area | Current fact |
|---|---|
| Language/runtime | TypeScript ESM, Node.js 24.x |
| Host | OpenCode Plugin API 1.18.5+ |
| UI | Solid/OpenTUI 0.4.5, separate TUI entrypoint |
| Package tooling | tsup, Vitest, strict TypeScript |
| Boundaries | `src/core` pure policy/persistence/catalog logic; `src/server` lifecycle adapters; `src/tui` UI and host compatibility |
| Git | Standalone repository on `master`; history preserved from the canonical checkout |

## Suite-only workstreams

The canonical working tree and its preserved OpenSpec artifacts contain these Suite workstreams:

- `redesign-agent-suite-tui`: prior dialog/screen redesign history and evidence.
- `fix-agent-suite-tui-runtime-bugs`: runtime clipping, navigation, exit, pagination, renderer fallback, and interaction hardening; some native-renderer scenarios remain pending.
- `restructure-agent-suite-tui-native`: native dialog-flow implementation and removal of the first-generation custom screens.
- `agent-suite-graphical-route`: graphical full-screen route spike and follow-up safety corrections.
- `agent-suite-floating-app`: second-generation floating app implementation with WU1 recovery, WU2/WU3/WU4 source evidence, and mandatory deployed smoke gates.

These artifacts are preserved as product history and continuation context. This migration did not create, update, or advance any SDD phase or state.

## Current factual state

### HEAD and migration base

- Repository HEAD is `46239bebee3ffab1dab68642a6098df403ac174c` on `master` at migration baseline.
- The preserved working tree is uncommitted. It contains current Suite product edits, including tracked modifications/deletions and untracked second-generation UI source, tests, and OpenSpec artifacts.
- **Migration safety:** Until a Git base includes the files currently untracked, do not run `git clean`, `git reset --hard`, or equivalent destructive operations.
- The canonical source checkout at `revision-selector-agente` remains unchanged and is still the source of truth for the captured baseline.

### Evidence boundary

- The product code is source-present, but the deployed runtime smoke gates are not proven by this migration.
- `agent-suite-floating-app` records WU4 accepted for source tests/typecheck and adapter/UI contracts, while `SMOKE.1`, `SMOKE.2`, and `SMOKE.G` remain pending before final verify/archive.
- This migration does not claim fresh tests or runtime evidence; no fresh test or runtime harness was run as part of the migration correction.

## Contradictions and known pending work

- Historical OpenSpec records overlap and describe successive UI generations. Treat the current working tree plus the latest product evidence as authoritative; do not replay older snapshots as new apply work.
- Native OpenTUI FFI/test-renderer coverage was unavailable in prior evidence, so deterministic host mocks do not equal a deployed terminal smoke pass.
- The active OpenCode installation still points to the old `revision-selector-agente\dist\server.js` and `revision-selector-agente\dist\tui.js` paths. This migration intentionally did not change global configuration.
- The old collection and unrelated workstreams are retained in quarantine, not deleted.

## Recommended resumption point

Resume at the `agent-suite-floating-app` smoke gates: validate `SMOKE.1` and `SMOKE.2` against the first externally rebuilt/deployed dist, then satisfy `SMOKE.G` before verify/archive, subject to current evidence.

Historical snapshots are not pending apply work. Do not treat historical snapshots or old collection exports as pending apply work.

## Installation note

The active installation may continue pointing temporarily to the old canonical checkout. Updating it is a separate, explicitly authorized configuration task; do not change `C:/Users/DELL/.config/opencode` as part of this migration.

## Migration boundary

This repository is now Suite-only. No `.superpowers-adoption/`, top-level `engram/`, `installed/`, `related/`, legacy copied `source/`, selective Superpowers OpenSpec changes, or external Observer Router material was copied into the rebuilt project. Those materials remain under the dated quarantine sibling.

## Next step

Use the repository-local status, preserved product OpenSpec artifacts, and current Git evidence before resuming product work.
