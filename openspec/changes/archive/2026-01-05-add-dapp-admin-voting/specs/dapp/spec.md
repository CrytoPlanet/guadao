## ADDED Requirements
### Requirement: 投票入口
系统 SHALL 提供投票入口，展示 Topic 列表并允许锁仓投票。

#### Scenario: 提交投票
- **WHEN** 用户输入投票数量并选择 Topic
- **THEN** dApp 调用 stakeVote 并反馈交易状态

### Requirement: 投票结束与确认获胜者
系统 SHALL 提供投票结束与确认获胜者支付 10% 的入口。

#### Scenario: 结束投票
- **WHEN** 投票窗口结束且用户触发 finalizeVoting
- **THEN** 系统显示获胜 Topic 与总锁仓

### Requirement: 管理员仲裁
系统 SHALL 提供管理员仲裁入口以处理争议结果。

#### Scenario: 争议裁决
- **WHEN** 管理员选择 approve 或 deny
- **THEN** dApp 调用 resolveDispute 并更新状态

### Requirement: 事件详情
系统 SHALL 展示投票与管理相关事件的详细参数。

#### Scenario: 查看事件参数
- **WHEN** 用户查看投票/管理事件
- **THEN** 展示关键参数（topicId、amount、winner、payout 等）