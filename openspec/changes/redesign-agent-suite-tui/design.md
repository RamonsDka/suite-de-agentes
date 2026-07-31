# Design: Redesign Suite de Agentes TUI

## Technical Approach

Add owned OpenTUI/Solid screens under `src/tui/screens/`, mounted via the verified seam `api.ui.dialog.replace(() => <api.ui.Dialog size="large" onClose={…}>{screen}</api.ui.Dialog>)` behind a render guard; on `"No renderer found"` the flow falls back to today's native dialog chain, unchanged. Effort normalization is a pure `core/` mapping. Layout uses verified Yoga flexbox, `<box border title focusedBorderColor>`, `useTerminalDimensions()`, `useKeyboard`; tests: `testRender`, `createMockKeys`; no invented APIs.

## Architecture Decisions

| Decision | Alternatives | Choice | Rationale |
|---|---|---|---|
| Mount surface | `api.route.register` | Dialog stack | Tested seam; degraded hosts keep dialogs |
| Matrix layout | `<select>` (1-D) | Wrap boxes + 2-D index | Pure math, unit-testable |
| Focus model | OpenTUI focus tree | Index + `borderActive` ring | One hook; deterministic for TDD |
| Effort module | Extend `suites.ts` | New `core/effort.ts` | Smallest owning boundary |
| Screen flow | Async chain | Pure reducer `reduceScreen` | Testable without rendering |
| Color | Hardcoded hex | Theme tokens only | Per-theme contrast guaranteed |

## Screen State Machine

```
landing─►catalog─►detail─►model─►effort─►detail
  │               ├─delete─►confirm-delete─yes─►catalog
  └─►create(steps)─save─►catalog
back: effort→model→detail→catalog→landing; cancel (Esc/onClose): close stack, no mutation
```

Contract (`screens/nav.ts`):

```ts
type ScreenState =
  | { screen: "landing" } | { screen: "catalog"; page: number }
  | { screen: "detail"; agentId: string } | { screen: "modify-model"; agentId: string }
  | { screen: "modify-effort"; agentId: string; model: string } | { screen: "confirm-delete"; agentId: string }
  | { screen: "create"; step: CreateStep; draft: Partial<CustomAgent> };
// events: open-catalog|open-create|select-agent|modify|delete|model-chosen|
// effort-chosen|delete-confirmed|page(±1)|back|cancel
```

Focus order: landing `[Catálogo, Crear agente]`; catalog cells L→R/T→B then `Más…`; detail `[Modificar, Eliminar, Volver]`; confirm `[No (default), Sí]`.

## Responsive Breakpoints (`layout.ts`)

`catalogColumns(w) = w>=100?3 : w>=70?2 : 1`; `pageSize = columns × max(2, floor((h−8)/4))`; h<20 → compact landing; w<70 → one-column list.

## Color / Contrast Roles (tokens only)

Frame `border`, focused `borderActive`, divider `borderSubtle`; panel `backgroundPanel`; chips `backgroundElement`+`text`; selected `backgroundMenu`+`selectedListItemText`; title `primary`; body `text`; hints `textMuted`; Delete `error`; success `success`; warning `warning`.

## ASCII Structural Wireframe

```
┌────── Suite de Agentes ──────┐
│       SUITE DE AGENTES       │
│            v1.4.2            │
│  ┌────────┐  ┌────────────┐  │
│  │Catálogo│  │Crear agente│  │
│  └────────┘  └────────────┘  │
│  ↑↓ navegar · Enter · Esc    │
└──────────────────────────────┘
┌─ Catálogo · v1.4.2 ──────────┐
│ [● general][○ gh-spec][○ mi] │
│  Disponible No mater. Creado │
│ [ Más… (2) ] ←→↑↓·Enter·Esc  │
└──────────────────────────────┘
┌─ general ─────────┐┌─ Esfuerzo ─┐
│Disponible·gpt-5   ││✓ Predet.   │
│Agente prop. general│ low · high │
│[testing][github]  │└────────────┘
│[Modif][Elim][Vol.]│ ¿Eliminar? [No] [Sí]
└───────────────────┘
```

## Data Flow

```
Alt+S / :agent-suite → openSuite → loadSuiteConfig → safeScreenMount
   ├─ ok → dialog.replace(<Dialog>{screen}</Dialog>)
   └─ "No renderer found" → existing dialog chain
reads: catalog builder, models, variants · mutations: setAgentModelAssignment→saveSuiteConfig; materializeGlobalAgent
```

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `src/core/effort.ts` | Create | `EFFORT_ORDER`, `normalizeEffortOptions()` |
| `src/tui/layout.ts` | Create | Breakpoints, pagination, ring styles |
| `src/tui/screens/nav.ts` | Create | State machine, `safeScreenMount` guard |
| `src/tui/screens/landing.tsx` | Create | Frame: title, version, 2 actions |
| `src/tui/screens/catalog.tsx` | Create | Responsive matrix, `Más…` |
| `src/tui/screens/detail.tsx` | Create | Chips, Modify/Delete, confirm |
| `src/tui/screens/modify.tsx` | Create | Model → effort selectors |
| `src/tui/screens/create.tsx` | Create | Structured create flow |
| `src/tui/index.tsx` | Modify | Route via screens; keep legacy chain |
| `src/tui/host-compat.ts` | Modify | Extend guard for screen mounts |
| `test/{effort,layout,screens}.test.{ts,tsx}` | Create | New coverage |
| `test/tui-registration.test.ts`, `test/host-compat.test.ts` | Modify | Screen + fallback contracts |

## Interfaces / Contracts

```ts
// core/effort.ts — default first, then runtime∩vocabulary
export const EFFORT_ORDER = ["none", "low", "high", "xhigh", "max"] as const;
export function normalizeEffortOptions(runtimeVariants: readonly string[]): string[];
export function catalogColumns(width: number): 1 | 2 | 3; // layout.ts
export function paginate<T>(items: readonly T[], page: number, size: number): { slice: T[]; hasMore: boolean };
```

## Testing Strategy (strict TDD)

| Layer | What | How |
|-------|------|-----|
| Unit | effort order/filter, breakpoints, pagination, reducer back/cancel | RED first, pure |
| Component | landing, matrix→1-col `resize`, `Más…`, chips, yes/no, ring, Esc | `testRender`+`createMockKeys` |
| Integration | Alt+S/`/agent-suite`→landing; no-renderer→legacy chain per screen | `dialogHost` mock |
| Regression | existing suite green | `vitest run`, `tsc --noEmit` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR, executable-file, or process-integration boundary. Mount fallback covered by guard + degradation tests.

## Migration / Rollout

None. No `SuiteConfig` change or category field. Rollback: delete `src/tui/screens/`, restore `index.tsx`.

## Review-Slice Strategy (auto-chain)

Chained PRs off `feat/redesign-agent-suite-tui`, each autonomous, tests green: **PR1** effort core (~150 LOC); **PR2** layout+nav+landing+fallback (~300); **PR3** catalog matrix (~300); **PR4** detail+modify+confirm (~300); **PR5** create flow (~250).

## Open Questions

- None blocking. All mount/layout/focus/theme/test primitives verified against installed `@opentui/solid@0.4.5`, `@opentui/core`, `@opencode-ai/plugin@1.18.5` declarations. Cosmetic: confirm `Dialog size="xlarge"` centering at apply time.
