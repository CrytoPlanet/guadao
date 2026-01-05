## ADDED Requirements
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