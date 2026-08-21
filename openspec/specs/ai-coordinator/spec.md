# AI Coordinator Specification

## Purpose

Provide persistent model configuration, runtime discovery, quality recommendations, action gating, and ephemeral execution for AI-assisted capabilities within Suite de Agentes.

## Requirements

### Requirement: Persistent Coordinator Configuration

The system MUST allow configuring a single persistent AI coordinator model specifying `provider`, `model`, and optional `effort`. The configuration MUST persist in suite configuration and load on startup.

**User Story:** As a developer, I want to configure a preferred AI model once so that all AI-assisted features use my chosen settings.

#### Acceptance & Edge Case Checklist
- [ ] Valid provider, model, and optional effort persist and reload accurately.
- [ ] Missing effort defaults to standard without error.
- [ ] Invalid provider or model fails validation with descriptive feedback.

#### Scenario: Save valid coordinator configuration
- GIVEN the user selects a valid provider, model, and effort
- WHEN the user saves coordinator settings
- THEN suite configuration updates with the coordinator settings
- AND subsequent AI actions use the configured model

#### Scenario: Unconfigured coordinator default
- GIVEN no coordinator has been configured
- WHEN the suite loads configuration
- THEN coordinator state is reported as unconfigured
- AND non-AI workflows remain fully functional

---

### Requirement: Live Model Discovery and Status

The system MUST discover available providers and models from the runtime environment, recommend balanced quality/cost models, and display coordinator status with a labeled status indicator (`Configurado` in green or `No configurado` in red).

**User Story:** As a user, I want to view available models and clear coordinator status so that I know when AI assistance is ready.

#### Acceptance & Edge Case Checklist
- [ ] Runtime models are discovered and recommended models are highlighted.
- [ ] Configured state renders green `Configurado` label.
- [ ] Unconfigured state renders red `No configurado` label.

#### Scenario: Display coordinator status indicator
- GIVEN the settings screen or root menu renders
- WHEN coordinator status is evaluated
- THEN green `Configurado` is displayed if configured
- AND red `No configurado` is displayed if unconfigured

#### Scenario: Discovered models and recommendations
- GIVEN runtime provides available models
- WHEN user opens model selection
- THEN models are presented with quality/cost recommendations

---

### Requirement: AI Model and Effort Recommendation

The system MUST evaluate agent complexity during the interview and recommend a suitable runtime provider, model, and effort level with an explanatory rationale. The user MUST retain the authority to override or accept the recommendation.

#### Scenario: Recommend model and effort based on agent requirements
- GIVEN an agent interview collects requirements for complex multi-step reasoning
- WHEN the coordinator synthesizes the agent definition
- THEN a capable model and appropriate effort level are recommended with rationale

#### Scenario: User overrides recommended model
- GIVEN the coordinator recommends a model and effort level
- WHEN the user selects a different model in the review screen
- THEN the agent definition is saved with the user-selected model settings

---

### Requirement: AI Action Gating and Ephemeral Execution

The system MUST gate AI-assisted actions behind coordinator configuration. If an unconfigured action is invoked, the system MUST display `Configurar ahora` and `Cancelar`. Selecting `Cancelar` MUST return to the original user intent without loss. AI interview tasks MUST execute in tool-less ephemeral sessions supporting multi-turn interactive state, cancellable foreground progress, and in-memory failure recovery.

**User Story:** As a user, I want unconfigured AI actions gated with clear guidance and resilient multi-turn execution so that I can configure the coordinator, cancel safely, or recover from errors.

#### Acceptance & Edge Case Checklist
- [ ] Unconfigured AI action prompts with configure or cancel options.
- [ ] Cancelling prompt preserves user context without side effects.
- [ ] Running ephemeral task cancels cleanly on user request.
- [ ] Multi-turn state is preserved in memory during session recovery.

#### Scenario: Trigger AI action when unconfigured
- GIVEN the coordinator is unconfigured
- WHEN the user invokes an AI-assisted action
- THEN the system prompts with `Configurar ahora` and `Cancelar`
- AND selecting `Cancelar` returns to the prior screen cleanly

#### Scenario: Cancel running AI generation
- GIVEN an ephemeral AI generation session is executing
- WHEN the user triggers cancellation
- THEN the session terminates immediately without applying draft changes

#### Scenario: Recover multi-turn session after network interruption
- GIVEN an active multi-turn AI interview session is interrupted by a transient error
- WHEN the user retries the turn
- THEN the coordinator resumes using the preserved in-memory transcript history
