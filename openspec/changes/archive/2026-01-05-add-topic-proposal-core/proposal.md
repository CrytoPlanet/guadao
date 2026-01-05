# Change: TopicBountyEscrow 提案与 Topic 数据模型（BC1）

## Why

完整的投票与托管流程过大，先落地 Proposal/Topic 数据结构与 createProposal 入口，作为后续投票与交付流程的基础。

## What Changes

- 新增 Proposal/Topic 结构与存储
- 实现 createProposal（onlyAdmin）与事件
- 记录投票窗口（start/end）供前端渲染

## Impact

- Affected specs: `topic-bounty-escrow`
- Affected code: `contracts/`, `test/`