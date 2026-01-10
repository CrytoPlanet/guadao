# Change: 添加通用空投、创作者提案提交与 IPFS 存储

## Why
当前系统存在几个限制：
1. 空投需要预先生成 Merkle tree，无法让任意钱包领取
2. 只有 Admin 可以创建提案，创作者无法自主提交
3. 提案内容（Topic标题/描述）直接存链上，成本高且灵活性差

本变更引入通用空投、创作者提交提案、IPFS 内容存储三大功能。

## What Changes

### 1. 通用空投（Universal Airdrop）
- **NEW** 新增 `UniversalAirdrop` 合约，允许任意钱包领取固定数量 GUA
- Admin 可配置每钱包领取数量和总供应上限
- 防重复领取机制（每地址仅可领一次）

### 2. 创作者提案提交
- **MODIFIED** `TopicBountyEscrow` 允许任意用户创建提案（非仅 Admin）
- 创作者可提交最多 5 个 Topic
- 创作者提交提案时需支付少量 GUA 作为防滥用押金（可退还）

### 3. IPFS + Pinata 内容存储
- **NEW** Topic 标题、描述存储到 IPFS，链上仅存 CID
- 使用 Pinata 作为 pinning 服务
- 链上存储 `bytes32 contentHash` = keccak256(CID)，节省 gas

## Impact

### 受影响的 Specs
- `universal-airdrop` (NEW)
- `topic-bounty-escrow` (MODIFIED)
- `ipfs-storage` (NEW)
- `dapp` (需更新前端)

### 受影响的代码
| 文件 | 变更类型 |
|------|----------|
| `contracts/UniversalAirdrop.sol` | NEW |
| `contracts/TopicBountyEscrow.sol` | MODIFIED |
| `dapp/lib/ipfs.ts` | NEW |
| `dapp/components/CreateProposal.tsx` | MODIFIED |
| `dapp/components/UniversalAirdrop.tsx` | NEW |

## Design Decisions

### IPFS 存储策略建议

**链上存储**：
```solidity
struct Topic {
    address owner;
    bytes32 contentCid;  // IPFS CID 的 keccak256 哈希
}
```

**IPFS 内容结构**：
```json
{
  "version": 1,
  "title": "Topic 标题",
  "description": "详细描述",
  "creator": "0x...",
  "timestamp": 1234567890
}
```

**为什么用 `bytes32` 存 CID 哈希而非完整 CID**：
1. Gas 成本：完整 CIDv1 约 46 bytes，哈希仅 32 bytes
2. 链上验证：可通过链下提供完整 CID + 验证哈希匹配
3. 灵活性：支持任意长度的 CID 版本

### 通用空投 vs 扩展 Merkle

**方案对比**：
| 方案 | 优点 | 缺点 |
|------|------|------|
| 新 UniversalAirdrop 合约 | 简单直接，无需 Merkle proof | 无法差异化分配 |
| 扩展现有 MerkleAirdrop | 统一管理 | 需生成包含所有地址的巨大 tree |

**建议**：采用新合约，保持职责分离。
