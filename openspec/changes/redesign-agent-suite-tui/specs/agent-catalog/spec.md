# Delta for agent-catalog

## MODIFIED Requirements

### Requirement: Two-option Alt+S entry point

The system MUST render exactly two options in the Suite de Agentes landing screen: `Catálogo` and `Crear agente`, presented inside an owned framed screen that shows the suite title and plugin version. It MUST NOT render suite, profile, model-assignment, or other CRUD options. The `/agent-suite` command MUST open the same landing screen.
(Previously: the two options appeared as root options in a plain Alt+S surface; now they are framed inside the owned landing screen with title and version.)

#### Scenario: Open the suite landing

- GIVEN the plugin is loaded and the user presses Alt+S or runs `/agent-suite`
- WHEN the landing screen opens
- THEN the visible options are exactly `Catálogo` and `Crear agente`
- AND the labels remain in Spanish with the stated accents
- AND the suite title and plugin version are visible in the frame

### Requirement: Spanish compact catalog interaction

The catalog MUST be Spanish and MUST render as a responsive matrix on wide terminals or a single-column list on narrow terminals, over the existing catalog rows. Selecting a member MUST open a structured detail screen showing its name, description, skill chips, operations, and materialization state. A custom member not present in the runtime MUST visibly indicate that it is created but not materialized and MUST offer materialization; deletion MUST NOT apply to seed members. Catalog membership, filtering, and consent behavior remain unchanged by this presentation change.
(Previously: a compact, scrollable list with a single detail action; now a responsive matrix/list with a structured detail screen containing skill chips and operations.)

#### Scenario: Inspect and materialize a custom member

- GIVEN a plugin-created custom member exists in the registry but is absent from the runtime inventory
- WHEN the user opens its structured detail and chooses its available action
- THEN the detail identifies the member and its not-materialized state
- AND materialization is offered without falsely reporting the member as ready

#### Scenario: Structured detail content

- GIVEN a materialized custom member that has skills and operations
- WHEN the user opens its detail
- THEN the detail shows name, description, skill chips, and operations
- AND exposes Modify, Delete (custom only), and back navigation

#### Scenario: Empty catalog state

- GIVEN no seed or custom member is available to render
- WHEN the user opens `Catálogo`
- THEN a Spanish empty-state message is shown
- AND the surface remains navigable back to the landing

### Requirement: Version footer and host fallback

The owned Suite de Agentes screen frame MUST show the plugin version, and the catalog MUST retain a version footer. Rendering MUST degrade to the host-compatible native-dialog chain when the owned screen renderer or slot is unavailable, evaluated per screen, without crashing or omitting catalog access.
(Previously: version appeared only in a catalog/sidebar footer with a single host-compat fallback; now version is also in the owned screen frame and fallback is per-screen to the legacy dialog chain.)

#### Scenario: Renderer is unavailable

- GIVEN the host does not provide the preferred slot renderer
- WHEN any Suite de Agentes screen attempts to render
- THEN the host-compatible fallback renders the catalog or its navigation safely
- AND the plugin version remains visible wherever the fallback supports it

## ADDED Requirements

### Requirement: Catalog persistence and data invariants

The redesign MUST NOT change the `SuiteConfig` shape, MUST NOT introduce a `category` field, and MUST NOT require any data migration. Model and effort selections MUST persist through the existing assignment mechanism. Catalog membership, filtering, and per-turn consent MUST remain behaviorally unchanged by the presentation redesign.

#### Scenario: No schema change after edits

- GIVEN the redesigned surface is in use
- WHEN a user creates, modifies, or deletes an agent
- THEN the persisted configuration uses the existing SuiteConfig shape with no new fields
