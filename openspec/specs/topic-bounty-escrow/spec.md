# topic-bounty-escrow Specification

## Purpose
TBD - created by archiving change add-delivery-challenge. Update Purpose after archive.
## Requirements
### Requirement: 质疑与保证金
系统 SHALL 允许在 72 小时质疑窗口内提交质疑并锁定 10,000 GUA 保证金。

#### Scenario: challengeDelivery
- **WHEN** 在质疑窗口内调用 challengeDelivery
- **THEN** 系统记录 challenger 与证据并进入 DISPUTED

#### Scenario: 质疑窗口外
- **WHEN** 在质疑窗口外调用 challengeDelivery
- **THEN** 系统 MUST revert

### Requirement: 提交交付证明
系统 SHALL 允许胜者 owner 提交交付证明并开启 72 小时质疑窗口。

#### Scenario: submitDelivery
- **WHEN** winner.owner 调用 submitDelivery
- **THEN** 系统记录交付信息并设置 challengeWindowEnd

#### Scenario: 非胜者调用
- **WHEN** 非 winner.owner 调用 submitDelivery
- **THEN** 系统 MUST revert

### Requirement: 管理员仲裁争议
系统 SHALL 仅允许管理员对处于争议中的交付进行 approve/deny 仲裁。

#### Scenario: Approve 争议（质疑失败）
- **WHEN** 管理员以 approve 方式仲裁争议
- **THEN** 剩余 90% MUST 支付给 winner，bond MUST 转入 treasury

#### Scenario: Deny 争议（质疑成功）
- **WHEN** 管理员以 deny 方式仲裁争议
- **THEN** 剩余 90% MUST 转入 treasury，bond MUST 退还给 challenger，并且从 treasury 额外转 5,000 GUA 给 challenger

#### Scenario: Allowance 不足
- **WHEN** deny 路径需要 treasury 转账但 allowance 不足
- **THEN** 调用 MUST revert

#### Scenario: 非管理员调用
- **WHEN** 非管理员调用 resolveDispute
- **THEN** 调用 MUST revert

### Requirement: Proposal/Topic 数据结构
系统 SHALL 支持创建包含 3–5 个 Topic 的 Proposal，并为每个 Topic 绑定 owner 地址与投票窗口。

#### Scenario: 创建 Proposal
- **WHEN** Admin 调用 createProposal
- **THEN** 系统持久化 Proposal 与 Topics，并记录投票 start/end

### Requirement: Proposal 事件
系统 SHALL 在创建 Proposal 时触发事件，供前端索引与渲染。

#### Scenario: 事件触发
- **WHEN** Admin 成功创建 Proposal
- **THEN** 系统发出包含 proposalId 与 topicIds 的事件

### Requirement: 结束投票与胜者计算
系统 SHALL 在投票结束后计算胜者并冻结奖池。

#### Scenario: finalizeVoting
- **WHEN** 投票结束后调用 finalizeVoting
- **THEN** 系统确定 winnerTopicId 并触发 VotingFinalized 事件

#### Scenario: 投票期内
- **WHEN** 投票未结束调用 finalizeVoting
- **THEN** 系统 MUST revert

### Requirement: 平票规则
系统 SHALL 在平票时选择 topicId 最小的 Topic 作为胜者。

#### Scenario: 平票
- **WHEN** 多个 Topic 得到相同最高 stake
- **THEN** 系统选择 topicId 最小者

### Requirement: 投票锁仓
系统 SHALL 允许用户在投票窗口内锁仓 GUA 并累计到对应 Topic。

#### Scenario: 投票成功
- **WHEN** 用户在投票期内调用 stakeVote
- **THEN** 系统更新 topicStakeTotal 与 voterStakeByTopic

#### Scenario: 投票期外
- **WHEN** 用户在投票期外调用 stakeVote
- **THEN** 系统 MUST revert

### Requirement: 投票事件
系统 SHALL 在投票成功时发出事件供前端统计。

#### Scenario: 事件触发
- **WHEN** 投票成功
- **THEN** 系统发出包含 voter/topicId/amount 的事件

### Requirement: 10% 预付与交付窗口
系统 SHALL 在 Admin 确认胜者后支付 10% 并开启 14 天交付窗口。

#### Scenario: confirmWinnerAndPay10
- **WHEN** Admin 调用 confirmWinnerAndPay10
- **THEN** 系统支付 10% 给 winner.owner 并记录 submitDeadline

#### Scenario: 重复确认
- **WHEN** 再次调用 confirmWinnerAndPay10
- **THEN** 系统 MUST revert

### Requirement: TopicBountyEscrow 可升级
TopicBountyEscrow 合约 SHALL 使用 UUPS 代理模式部署，支持未来升级。

#### Scenario: 合约可升级
- **WHEN** Owner 部署新的 Implementation 并调用 `upgradeToAndCall`
- **THEN** 代理合约指向新的 Implementation，状态保留

#### Scenario: 非 Owner 无法升级
- **WHEN** 非 Owner 地址尝试调用 `upgradeToAndCall`
- **THEN** 交易 MUST revert

### Requirement: TopicBountyEscrow Treasury 可变
TopicBountyEscrow 合约 SHALL 支持 Owner 更新 Treasury 地址。

#### Scenario: Owner 可更新 Treasury
- **WHEN** Owner 调用 `setTreasury(newTreasury)`
- **THEN** treasury 地址被更新，发出 `TreasuryUpdated` 事件

#### Scenario: 非 Owner 不能更新 Treasury
- **WHEN** 非 Owner 地址尝试调用 `setTreasury`
- **THEN** 交易 MUST revert

### Requirement: TopicBountyEscrow 使用 OwnableUpgradeable
TopicBountyEscrow 合约 SHALL 使用 `OwnableUpgradeable` 进行初始化。

#### Scenario: 初始化 Owner
- **WHEN** 合约通过 `initialize` 初始化
- **THEN** 指定的 owner 地址成为合约 Owner

