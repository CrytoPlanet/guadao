# escrow Specification

## Purpose
TBD - created by archiving change update-escrow-lifecycle-v0.1. Update Purpose after archive.
## Requirements
### Requirement: Proposal State Machine
系统 SHALL 维护完整的 Proposal 状态机，以保证投票、交付、争议、完成与过期流程可验证。

#### Scenario: Valid state transitions
- **WHEN** 管理员创建 Proposal 并进入投票阶段
- **THEN** 状态依次进入 Voting -> VotingFinalized -> Accepted

### Requirement: Finalize Delivery
系统 SHALL 在交付提交后 72 小时无争议时，允许任何人 finalize 并发放剩余 90%。

#### Scenario: Finalize after challenge window
- **WHEN** 交付已提交且挑战窗口已结束且无争议
- **THEN** remaining90 转给 Topic Owner 并进入 Completed

### Requirement: Expire If No Submission
系统 SHALL 在 submitDeadline 到期且未提交交付时允许任何人触发过期处理。

#### Scenario: Expire after deadline
- **WHEN** submitDeadline 已过且未提交交付
- **THEN** remaining90 转入 Treasury 并进入 Expired

### Requirement: Challenge Gating
系统 SHALL 仅允许在 Submitted 状态与挑战窗口内发起挑战。

#### Scenario: Challenge outside window
- **WHEN** 超过挑战窗口
- **THEN** challengeDelivery 调用 MUST revert

### Requirement: 紧急暂停（Pausable）
Escrow 合约 SHALL 支持管理员启用/解除暂停，用于紧急停止资金相关操作。

#### Scenario: 暂停后限制
- **WHEN** 合约处于暂停状态
- **THEN** 资金相关函数调用被拒绝

#### Scenario: 恢复后可用
- **WHEN** 管理员解除暂停
- **THEN** 资金相关函数可正常执行

### Requirement: 结算流程重入保护
Escrow 合约 SHALL 对所有资金转移相关函数启用重入保护。

#### Scenario: 结算路径
- **WHEN** 调用支付/结算相关函数
- **THEN** 合约阻止重入攻击并保持状态一致

