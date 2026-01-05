# Change: finalizeVoting 计算胜者并冻结奖池（BC3）

## Why

BC2 已实现投票锁仓，但未能确定胜者与奖池规模。需要在投票结束后计算 winnerTopicId 并冻结结果，为后续支付与交付流程提供确定输入。

## What Changes

- 新增 finalizeVoting（投票期结束后可调用）
- 计算胜者（最高 stake），并确定总奖池
- 明确平票规则（默认：topicId 最小优先）
- 新增 VotingFinalized 事件
- 补充成功/失败测试用例

## Impact

- Affected specs: `topic-bounty-escrow`
- Affected code: `contracts/`, `test/`