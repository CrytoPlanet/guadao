## ADDED Requirements
### Requirement: 质疑与保证金
系统 SHALL 允许在 72 小时质疑窗口内提交质疑并锁定 10,000 GUA 保证金。

#### Scenario: challengeDelivery
- **WHEN** 在质疑窗口内调用 challengeDelivery
- **THEN** 系统记录 challenger 与证据并进入 DISPUTED

#### Scenario: 质疑窗口外
- **WHEN** 在质疑窗口外调用 challengeDelivery
- **THEN** 系统 MUST revert