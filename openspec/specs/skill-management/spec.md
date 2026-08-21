# Skill Management Specification

## Purpose

Provide discovery, search-first recommendations, agent assignment, and conflict handling for OpenCode skills in Suite de Agentes.

## Requirements

### Requirement: Installed Skill Discovery and Assignment

The system MUST discover skills installed in OpenCode, present them in an interactive picker with search filtering, and support attaching or detaching skills to the active agent.

**User Story:** As a developer, I want to browse installed skills so that I can attach capabilities to my agent.

#### Acceptance & Edge Case Checklist
- [ ] Lists installed skills with name, description, and status.
- [ ] Filters list dynamically by search query.
- [ ] Toggling attachment updates agent skill references.

#### Scenario: Attach installed skill to agent
- GIVEN the skill picker is open for an agent
- WHEN user selects an unattached skill and toggles attachment
- THEN the skill is added to the agent's assigned skills

#### Scenario: Search installed skills
- GIVEN multiple skills are installed
- WHEN user types a query term in search
- THEN only matching skills are displayed

---

### Requirement: Recommend-First Search Hierarchy

When evaluating agent capabilities during authoring, the system MUST check matching installed skills first and present match rationales during the interview. If a required capability has no installed match, the system MUST record the skill recommendation as pending and MUST NOT query remote registries or generate code until post-approval ingestion.

**User Story:** As a developer, I want existing installed skills recommended first and missing skills deferred so that agent interviewing remains fast, safe, and free from premature side effects.

#### Acceptance & Edge Case Checklist
- [ ] Checks installed skills first and explains matches in interview turns.
- [ ] Flags uninstalled capabilities as pending skills without immediate network download.
- [ ] Defers remote registry search and generation until after agent approval.

#### Scenario: Recommend installed skill
- GIVEN an installed skill matches the requested capability
- WHEN coordinator evaluates the request in an interview turn
- THEN the installed skill is recommended with match rationale

#### Scenario: Defer remote search and generation during interview
- GIVEN no installed skill matches the requested capability
- WHEN coordinator identifies the capability during an interview
- THEN the skill is tagged as pending in the draft checkpoint
- AND no remote fetch or code generation is executed during the interview

---

### Requirement: Global Installation with Scoped Agent Assignment

Skills added through Suite de Agentes MUST install globally in OpenCode, but MUST be assigned strictly to the active agent.

**User Story:** As a developer, I want skills installed globally for system reuse while keeping assignment scoped so that only the current agent uses them.

#### Acceptance & Edge Case Checklist
- [ ] Installs package into global OpenCode skills directory.
- [ ] Assigns skill reference exclusively to active agent.
- [ ] Leaves other agents unmodified.

#### Scenario: Install skill during authoring
- GIVEN an agent is being edited
- WHEN a new skill is approved and installed
- THEN the package is installed globally in OpenCode
- AND only the active agent is assigned the skill

---

### Requirement: Conflict Resolution and Skill Adaptation

If an added skill collides with an existing skill identifier, the system MUST show a diff comparison offering `Replace`, `Keep existing`, and `Rename`. When adapting a close match, the system MUST create a distinct new skill variant.

**User Story:** As a developer, I want clear conflict resolution so that I never overwrite existing skills unintentionally.

#### Acceptance & Edge Case Checklist
- [ ] Identifier collisions trigger diff comparison before write.
- [ ] User can choose `Replace`, `Keep existing`, or `Rename`.
- [ ] Editing existing skills creates new named variants.

#### Scenario: Resolve naming conflict with rename
- GIVEN a new skill shares an identifier with an installed skill
- WHEN collision is detected
- THEN diff and resolution options are displayed
- AND selecting `Rename` prompts for a new unique identifier

---

### Requirement: Pending Skill Ingestion Post-Approval

The system MUST defer remote skill search, installation, conflict resolution, and generation until after the agent definition is approved in the final review screen. During the interview, non-installed skill suggestions MUST remain in a pending state without triggering downloads or disk writes.

#### Scenario: Suggest non-installed skill as pending
- GIVEN the user requests a capability not covered by installed skills during an interview
- WHEN the coordinator identifies a missing skill requirement
- THEN the skill is listed as pending in the draft without triggering remote installation

#### Scenario: Ingest pending skill after agent approval
- GIVEN an agent definition with pending skills is approved in final review
- WHEN the user completes finalization
- THEN the system triggers the safe skill ingestion workflow for the pending skills
