## ADDED Requirements

### Requirement: ERC20Votes Extension
GUAToken SHALL support vote delegation and checkpointing for on-chain governance.

#### Scenario: Delegate voting power to self
- **WHEN** a user holding 1000 GUA calls `delegate(self)`
- **THEN** their voting power becomes 1000
- **AND** previous voting power was 0

#### Scenario: Delegate voting power to another address
- **WHEN** user A with 1000 GUA delegates to user B
- **THEN** user B's voting power increases by 1000
- **AND** user A's voting power remains 0

#### Scenario: Transfer after delegation
- **WHEN** a delegated user transfers tokens
- **THEN** voting power is automatically updated

---

### Requirement: Governor Proposal Creation
Token holders with sufficient GUA SHALL be able to create governance proposals.

#### Scenario: Create proposal with sufficient tokens
- **WHEN** a user with 100+ GUA and delegated votes creates a proposal
- **THEN** the proposal is created with "Pending" status

#### Scenario: Create proposal with insufficient tokens
- **WHEN** a user with less than 100 GUA attempts to create a proposal
- **THEN** the transaction reverts

---

### Requirement: On-chain Voting
GUA token holders who have delegated their votes SHALL be able to vote on proposals.

#### Scenario: Cast vote during voting period
- **WHEN** a user with voting power votes during the voting period
- **THEN** their vote is recorded with correct weight

#### Scenario: Vote after voting period
- **WHEN** a user attempts to vote after the voting period
- **THEN** the transaction reverts

---

### Requirement: Timelock Execution
Passed proposals SHALL be queued and executed through a timelock.

#### Scenario: Execute after timelock delay
- **WHEN** a proposal passes and timelock delay (2 days) has passed
- **THEN** the proposal can be executed

#### Scenario: Execute before timelock delay
- **WHEN** a proposal passes but timelock delay has not passed
- **THEN** execution reverts

---

### Requirement: Emergency Cancellation
The Safe multisig SHALL be able to cancel queued proposals in emergencies.

#### Scenario: Cancel by canceller role
- **WHEN** the Safe (canceller role) cancels a queued proposal
- **THEN** the proposal is cancelled and cannot be executed

---

### Requirement: Tally Integration
The Governor contract SHALL be compatible with Tally.xyz for governance UI.

#### Scenario: Access governance UI
- **WHEN** a user visits the Tally page for GUA DAO
- **THEN** they can view active proposals and cast votes
