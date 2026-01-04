Issue BC3 — finalizeVoting(): compute winner + freeze pool

Goal：投票结束后计算 winner（stake 最大），冻结结果。
Acceptance Criteria

✅ endTime 后才能 finalize

✅ finalize 只能一次

✅ 平票规则写清并测试（建议：topicId 最小胜）

✅ 事件 VotingFinalized(winnerTopicId, totalPool)
Labels：contract voting core