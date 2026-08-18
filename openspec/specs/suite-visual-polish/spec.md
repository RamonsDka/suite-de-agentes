# Suite Visual Polish Specification

## Purpose

Enhance visual contrast, action prominence, and input styling across all Suite de Agentes TUI surfaces.

## Requirements

### Requirement: Prominent Yellow Finalizar Action

The system MUST render the `Finalizar` key hint and action with a prominent yellow visual style to clearly distinguish commit and completion actions from secondary navigation.

**User Story:** As a user, I want the finalize action visually highlighted so that I can easily identify how to save and finish my work.

#### Acceptance & Edge Case Checklist
- [ ] `Finalizar` action is rendered with yellow visual accent.
- [ ] Styling applies consistently across all authoring and settings screens.

#### Scenario: Render yellow Finalizar action
- GIVEN an authoring or settings surface is displayed
- WHEN the action footer renders
- THEN the `Finalizar` action is styled with a yellow color accent

---

### Requirement: Blue Labels and White Values Contrast Hierarchy

The system MUST style form labels, section headers, and field titles in blue, and input values, active selections, and body content in white.

**User Story:** As a user, I want clear contrast between field labels and values so that forms are easy to read and navigate.

#### Acceptance & Edge Case Checklist
- [ ] Field labels and titles render in blue palette.
- [ ] Editable values and active text render in white.
- [ ] High contrast is preserved across terminal backgrounds.

#### Scenario: Form field rendering
- GIVEN a form screen with configuration fields
- WHEN the screen renders
- THEN all field labels are displayed in blue
- AND all field values are displayed in white

---

### Requirement: Semi-Transparent Blue Search Input

The system MUST render search filter fields with a semi-transparent blue container and blue focus accent.

**User Story:** As a user, I want search inputs to look distinct and responsive so that filtering feels focused and clear.

#### Acceptance & Edge Case Checklist
- [ ] Search input has semi-transparent blue background styling.
- [ ] Active focus displays blue border and cursor accent.

#### Scenario: Search field focused
- GIVEN a list view with a search filter
- WHEN the search field is focused
- THEN the search box displays semi-transparent blue styling with focus indication
