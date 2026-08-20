# Delta for AI Coordinator

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: AI Action Gating and Ephemeral Execution

The system MUST gate AI-assisted actions behind coordinator configuration. If an unconfigured action is invoked, the system MUST display `Configurar ahora` and `Cancelar`. Selecting `Cancelar` MUST return to the original user intent without loss. AI interview tasks MUST execute in tool-less ephemeral sessions supporting multi-turn interactive state, cancellable foreground progress, and in-memory failure recovery.
(Previously: AI tasks executed in tool-less ephemeral sessions with cancellable foreground progress without multi-turn transcript preservation or recovery)

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
