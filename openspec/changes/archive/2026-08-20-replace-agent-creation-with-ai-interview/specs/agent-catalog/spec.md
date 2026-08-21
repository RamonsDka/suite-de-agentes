# Delta for Agent Catalog

## ADDED Requirements

### Requirement: AI Interview Navigation from Crear Agente

When the user selects `Crear agente` from the root menu, the system MUST verify coordinator configuration. If configured, the system MUST navigate directly to the `ai-interview` screen. If unconfigured, the system MUST display the coordinator gating prompt (`Configurar ahora` and `Cancelar`) and MUST NOT launch a legacy creation wizard or fallback form.

#### Scenario: Navigate to AI interview when coordinator configured
- GIVEN the AI coordinator is configured
- WHEN the user selects `Crear agente` from the root menu
- THEN the system navigates directly to the `ai-interview` screen

#### Scenario: Gate Crear agente when coordinator unconfigured
- GIVEN the AI coordinator is unconfigured
- WHEN the user selects `Crear agente` from the root menu
- THEN the system displays the gating prompt with `Configurar ahora` and `Cancelar`
- AND selecting `Cancelar` returns to the root menu without launching a creation wizard
