# Delta for Skill Management

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Recommend-First Search Hierarchy

When evaluating agent capabilities during authoring, the system MUST check matching installed skills first and present match rationales during the interview. If a required capability has no installed match, the system MUST record the skill recommendation as pending and MUST NOT query remote registries or generate code until post-approval ingestion.
(Previously: Searched remote verified registries and proposed immediate generation during authoring)

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
