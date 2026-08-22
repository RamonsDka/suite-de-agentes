# Suite Visual Polish Specification

## Purpose

Preserve the incumbent visual system for the catalog-only Suite de Agentes TUI.

## Requirements

### Requirement: Focused read-only detail actions

The system MUST preserve the incumbent action-row treatment on agent details while rendering only `Cambiar modelo y esfuerzo` and `Volver`. It MUST NOT render `Finalizar`, authoring status, or other editing actions.

#### Scenario: Render agent detail actions

- GIVEN an agent detail surface is displayed
- WHEN its action footer renders
- THEN it shows `Cambiar modelo y esfuerzo` and `Volver`
- AND it does not show authoring or finalization controls

### Requirement: Blue labels and white values contrast hierarchy

The system MUST style field labels, section headers, and field titles with the incumbent blue palette, and display values, active selections, and body content with the incumbent high-contrast treatment.

#### Scenario: Render catalog details

- GIVEN a catalog detail or model-selection screen with fields
- WHEN the screen renders
- THEN labels use the blue hierarchy
- AND values remain clearly readable on supported terminal backgrounds

### Requirement: Semi-transparent blue search input

The catalog search field MUST retain its semi-transparent blue container and blue focus accent.

#### Scenario: Focus search

- GIVEN the catalog search field is focused
- WHEN the catalog renders
- THEN the search field shows the established focus styling
