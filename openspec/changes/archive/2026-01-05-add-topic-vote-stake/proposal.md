# Change: 投票锁仓（stakeVote）与投票统计（BC2）

## Why

BC1 已完成 Proposal/Topic 数据结构。下一步最小可用投票功能是允许用户在投票窗口内锁仓 GUA 并累计到 Topic，从而为后续胜者计算与结算流程提供基础数据。

## What Changes

- 新增 stakeVote 入口与投票期校验
- 记录 topicStakeTotal 与 voterStakeByTopic
- 增加投票事件，便于前端统计与索引
- 新增投票相关测试用例

## Impact

- Affected specs: `topic-bounty-escrow`
- Affected code: `contracts/`, `test/`