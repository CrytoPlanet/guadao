Issue BC2 — stakeVote(): lock GUA into bounty pool

Goal：锁仓投票：投票者将 GUA 转入合约，累加到 topic。
Acceptance Criteria

✅ only during vote window

✅ 更新 topicStakeTotal + voterStakeByTopic

✅ 事件 Voted(voter, topicId, amount)

✅ 测试：投票期外 revert、余额不足 revert
Labels：contract voting core