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

When a user requests a capability, the system MUST check matching installed skills first. If none match, the system MUST query remote verified registries (`skills.sh` and verified GitHub repositories) before proposing generation. The system MUST present exactly one top match with an explanatory rationale.

**User Story:** As a developer, I want existing skill recommendations before generating new ones so that I avoid unnecessary duplication.

#### Acceptance & Edge Case Checklist
- [ ] Checks installed skills first, remote registries second, generation last.
- [ ] Presents single best candidate with rationale.
- [ ] Allows accepting recommendation or proceeding with generation.

#### Scenario: Recommend installed skill
- GIVEN an installed skill matches the requested capability
- WHEN coordinator evaluates the request
- THEN the installed skill is recommended with match rationale

#### Scenario: Recommend remote registry skill
- GIVEN no installed skill matches the requested capability
- WHEN coordinator searches verified remote registries
- THEN the top matching remote skill is presented with source and rationale

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
