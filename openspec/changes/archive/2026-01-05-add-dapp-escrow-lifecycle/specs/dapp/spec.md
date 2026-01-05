## ADDED Requirements
### Requirement: 状态机展示
系统 SHALL 在前端展示完整的 Proposal 状态机与当前状态。

#### Scenario: 状态可见
- **WHEN** 用户打开 Proposal 详情
- **THEN** 页面显示当前状态与可执行操作

### Requirement: finalizeDelivery 操作入口
系统 SHALL 在满足条件时提供 finalizeDelivery 操作。

#### Scenario: 质疑期结束后结算
- **WHEN** Proposal 为 Submitted 且 challengeWindow 已结束且无争议
- **THEN** 用户可触发 finalizeDelivery 完成结算

### Requirement: expireIfNoSubmission 操作入口
系统 SHALL 在满足条件时提供 expireIfNoSubmission 操作。

#### Scenario: 超时未提交
- **WHEN** Proposal 为 Accepted 且已超过 submitDeadline 且未提交交付
- **THEN** 用户可触发 expireIfNoSubmission 进入过期结算

### Requirement: 操作按钮 gating
系统 SHALL 根据状态与时间窗口控制按钮可用性。

#### Scenario: 非法状态禁用操作
- **WHEN** Proposal 状态不满足操作条件
- **THEN** 对应按钮不可用或隐藏