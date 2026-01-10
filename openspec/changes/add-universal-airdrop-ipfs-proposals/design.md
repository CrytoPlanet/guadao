# 设计文档：通用空投 + 创作者提案 + IPFS 存储

## Context

GUA Token System 当前版本 v0.1 存在以下限制：
1. 空投依赖预生成的 Merkle tree，无法实现"任意钱包均可领取"
2. 提案创建权限仅限于 Admin，创作者无法自主发起
3. 提案内容直接存储在链上，成本高且不够灵活

本设计旨在解决以上问题，同时保持系统的安全性和可扩展性。

## Goals / Non-Goals

### Goals
- 任意钱包可领取固定数量 GUA（可配置）
- 创作者可自主提交包含最多 5 个 Topic 的提案
- Topic 内容（标题、描述）存储于 IPFS，链上仅存引用
- 保持现有安全机制（重入保护、访问控制）

### Non-Goals
- 本次不改变投票、交付、质疑等核心流程
- 不支持动态调整已领取用户的空投数量
- 不支持 IPFS 内容的链上验证（仅存哈希）

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ UniversalAirdrop│     │TopicBountyEscrow│     │    Pinata/IPFS  │
│    (NEW)        │     │   (MODIFIED)    │     │                 │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ - claimAmount   │     │ - Topic.cid     │     │ - Topic JSON    │
│ - totalSupply   │     │ - creatorDeposit│     │ - Pinned content│
│ - claimed[]     │     │ - createProposal│     │                 │
│ - claim()       │     │   (any user)    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Decisions

### Decision 1: 新建 UniversalAirdrop 合约 vs 扩展 MerkleAirdrop

**选择**：新建独立合约

**理由**：
- MerkleAirdrop 设计用于固定名单分配，扩展会破坏其简洁性
- 职责分离：Merkle 用于特定用户差异化分配，Universal 用于通用领取
- 便于独立升级和管理

**Alternative considered**：
- 扩展 MerkleAirdrop 添加 "wildcard" 模式 → 复杂度高，与原设计冲突

### Decision 2: 链上存储 CID 哈希 vs 完整 CID

**选择**：存储 `bytes32 contentHash = keccak256(cidBytes)`

**理由**：
- Gas 成本：完整 CIDv1 (bafk...) 约 46 bytes，哈希仅 32 bytes
- 安全性：可链下提供完整 CID 并验证哈希匹配
- 兼容性：支持任意 CID 版本

**验证流程**：
```
1. 前端上传内容到 Pinata → 获取 CID
2. 计算 hash = keccak256(bytes(CID))
3. 调用 createProposal(..., hash)
4. 读取时：前端从事件/索引获取 CID，验证 hash 匹配
```

### Decision 3: 创作者提案防滥用机制

**选择**：创作者提交时支付押金（如 100 GUA），提案完成后退还

**流程**：
1. 创作者调用 `createProposal` 时转入押金
2. 押金锁定于合约
3. 提案进入 Completed/Expired 状态后，创作者可调用 `refundDeposit`
4. 若提案被标记为 spam，Admin 可没收押金

### Decision 4: Topic 内容 IPFS JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version", "title", "creator"],
  "properties": {
    "version": { "type": "integer", "const": 1 },
    "title": { "type": "string", "maxLength": 100 },
    "description": { "type": "string", "maxLength": 2000 },
    "creator": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
    "timestamp": { "type": "integer" },
    "tags": { "type": "array", "items": { "type": "string" } }
  }
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Pinata 宕机 | 前端缓存已获取内容；备用网关 (ipfs.io, cloudflare-ipfs) |
| 滥用通用空投 | 设置每日/总量上限；Admin 可暂停 |
| 恶意提案 spam | 押金机制；Admin 可标记并没收 |
| CID 与链上哈希不匹配 | 前端必须验证；UI 警告用户 |

## Migration Plan

1. 部署 `UniversalAirdrop` 合约
2. 升级 `TopicBountyEscrow` 代理合约实现
3. 配置 Pinata API keys 到 Vercel 环境变量
4. 更新前端并部署
5. Admin 设置 UniversalAirdrop 参数（claimAmount, maxSupply）

## Open Questions

- [ ] 创作者押金数额应设为多少？（建议 100 GUA）
- [ ] 通用空投每钱包领取数额？（建议 10 GUA）
- [ ] 是否需要 Admin 预审核创作者提案？（建议 v1 不需要，后续可加）
