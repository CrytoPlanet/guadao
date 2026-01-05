## ADDED Requirements
### Requirement: 提交交付证明
系统 SHALL 允许胜者 owner 提交交付证明并开启 72 小时质疑窗口。

#### Scenario: submitDelivery
- **WHEN** winner.owner 调用 submitDelivery
- **THEN** 系统记录交付信息并设置 challengeWindowEnd

#### Scenario: 非胜者调用
- **WHEN** 非 winner.owner 调用 submitDelivery
- **THEN** 系统 MUST revert