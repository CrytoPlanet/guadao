# topic-bounty-escrow Specification

## MODIFIED Requirements

### Requirement: Proposal/Topic 数据结构
系统 SHALL 支持创建包含 1–5 个 Topic 的 Proposal，每个 Topic 绑定 owner 地址、IPFS 内容哈希与投票窗口。

#### Scenario: 创建 Proposal
- **WHEN** 用户调用 createProposal 并提供 Topic 信息和内容哈希
- **THEN** 系统持久化 Proposal 与 Topics，记录 contentCid 哈希和投票 start/end

#### Scenario: Topic 数量验证
- **WHEN** 提供的 Topic 数量少于 1 或多于 5
- **THEN** 交易 MUST revert

## ADDED Requirements

### Requirement: 创作者提案提交
系统 SHALL 允许任意用户（非仅 Admin）创建包含 Topic 的 Proposal。

#### Scenario: 创作者创建提案
- **WHEN** 任意用户调用 `createProposal` 并支付押金
- **THEN** 系统创建提案，锁定押金

#### Scenario: 押金不足
- **WHEN** 用户调用 `createProposal` 但 GUA 余额或 allowance 不足
- **THEN** 交易 MUST revert

### Requirement: 创作者押金机制
系统 SHALL 在提案完成后允许创作者取回押金。

#### Scenario: 押金退还
- **WHEN** 提案进入 Completed/Expired 状态后创作者调用 `refundDeposit`
- **THEN** 系统退还押金给提案创建者

#### Scenario: 押金没收
- **WHEN** Admin 将提案标记为 spam 并调用 `confiscateDeposit`
- **THEN** 押金转入 treasury

#### Scenario: 提案进行中无法退款
- **WHEN** 提案未结束时创作者调用 `refundDeposit`
- **THEN** 交易 MUST revert

### Requirement: IPFS 内容引用
系统 SHALL 通过存储 IPFS CID 哈希来引用 Topic 内容。

#### Scenario: 存储内容哈希
- **WHEN** 创建提案时提供 `bytes32[] contentCids`
- **THEN** 系统将每个 Topic 的 contentCid 存储在链上

#### Scenario: 读取内容哈希
- **WHEN** 前端查询 Topic 信息
- **THEN** 系统返回 contentCid 供链下解析
