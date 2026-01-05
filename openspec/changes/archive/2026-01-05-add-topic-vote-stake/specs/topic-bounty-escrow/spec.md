## ADDED Requirements
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