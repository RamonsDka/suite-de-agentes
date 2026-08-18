# Delta for Agent Catalog

## MODIFIED Requirements

### Requirement: Two-option Alt+S entry point

The system MUST render exactly three root options in the Alt+S Suite de Agentes surface: `Catálogo`, `Crear agente`, and `⚙ Configuración`. It MUST NOT render legacy suite, profile, model-assignment, or other CRUD options.

(Previously: The system rendered exactly two root options: `Catálogo` and `Crear agente`.)

**User Story:** As a user, I want direct access to settings from the Alt+S root menu so that I can configure the coordinator and manage suite capabilities easily.

#### Acceptance & Edge Case Checklist
- [ ] Root surface displays exactly `Catálogo`, `Crear agente`, and `⚙ Configuración`.
- [ ] Spanish labels and accents are preserved.

#### Scenario: Open the suite menu
- GIVEN the plugin is loaded and the user presses Alt+S
- WHEN the root surface opens
- THEN the visible options are exactly `Catálogo`, `Crear agente`, and `⚙ Configuración`
- AND the labels remain in Spanish with the stated accents and icons

---

## ADDED Requirements

### Requirement: Configuration Submenu Navigation

The system MUST open a dedicated `⚙ Configuración` screen when selected from the root menu, providing options for coordinator model setup, skill management, and visual status.

**User Story:** As a user, I want a structured configuration screen so that I can configure settings without cluttering the main catalog surface.

#### Acceptance & Edge Case Checklist
- [ ] Opens configuration screen upon selection from root menu.
- [ ] Supports clean navigation back to the root menu.

#### Scenario: Navigate to Configuration screen
- GIVEN the user is on the Alt+S root menu
- WHEN the user selects `⚙ Configuración`
- THEN the configuration submenu opens displaying settings options and status
- AND the user can navigate back to the root menu
