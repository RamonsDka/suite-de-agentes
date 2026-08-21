# Agent Creation Interview Specification

## Purpose

Provide an adaptive multi-turn AI interview for agent creation and modification, featuring single-question turns, quick replies with free-text input, live draft checkpoint updates, explicit transition to review, and in-memory session recovery across transient failures.

## Requirements

### Requirement: Multi-Turn Adaptive Questioning and Input

The system MUST execute an adaptive conversational loop for agent authoring, presenting exactly one focused question per turn. Each turn MUST provide 2 to 4 contextual quick-reply options alongside a free-text input option.

#### Scenario: Answer with quick reply
- GIVEN an active interview turn displays quick replies and free-text input
- WHEN the user selects one of the quick-reply options
- THEN the system records the choice and generates the next adaptive turn

#### Scenario: Answer with free-text input
- GIVEN an active interview turn is awaiting user input
- WHEN the user submits a custom free-text response
- THEN the coordinator processes the text and adapts subsequent questions accordingly

### Requirement: Live Draft Checkpoint Synthesis

After each turn, the system MUST synthesize an updated in-memory agent draft checkpoint of safe fields (`id`, `description`, `operations`, `skills`, `model`, `effort`) and render a compact live summary displaying current agent `id`, purpose summary, operation count, assigned skills, and recommended model. The system MUST NOT display the full multi-field review editor until review transition.

#### Scenario: Update draft checkpoint after turn
- GIVEN an interview turn is completed
- WHEN the coordinator processes the answer
- THEN the in-memory draft checkpoint updates safe fields and the compact live summary refreshes

### Requirement: Review Transition Gate and User Control

When the coordinator determines sufficient context has been collected to form a valid agent definition, it MUST propose transitioning to the final review screen with an explanatory rationale. The system MUST allow the user to accept transition or request more questions.

#### Scenario: Accept review transition
- GIVEN the coordinator proposes transitioning to review
- WHEN the user confirms the transition
- THEN the system opens the review screen populated with the synthesized draft

#### Scenario: Request additional interview turns
- GIVEN the coordinator proposes transitioning to review
- WHEN the user chooses to continue interviewing
- THEN the system presents another adaptive clarification question

### Requirement: Shared Creation and Modification Engine

The interview engine MUST support both creating new agents and modifying existing agents. When modifying, the engine MUST initialize the interview transcript and draft checkpoint from the existing agent's current definition.

#### Scenario: Initialize modification interview
- GIVEN an existing agent is selected for modification
- WHEN the user launches the modification interview
- THEN the transcript and draft checkpoint are pre-populated with the existing agent's safe fields

### Requirement: In-Memory Recovery and Cancellation

The system MUST preserve interview turns, transcript history, and draft checkpoints in memory across transient coordinator errors or dialog closes during the active process session. If a turn fails, the system MUST allow retrying the turn. Explicit cancellation MUST discard the in-memory session cleanly. The system MUST NOT write unapproved drafts to disk.

#### Scenario: Recover from transient error
- GIVEN a turn encounters a network or provider error
- WHEN the error occurs
- THEN the system preserves transcript history and allows the user to retry the turn

#### Scenario: Explicit cancellation discards draft
- GIVEN an active or paused interview session exists
- WHEN the user selects Cancel
- THEN the session is discarded without persisting changes to disk
