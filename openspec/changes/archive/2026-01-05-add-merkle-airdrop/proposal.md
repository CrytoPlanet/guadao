# Change: 添加 MerkleAirdrop 合约

## Why

MerkleAirdrop 是 GUA Token 系统的第一个核心功能，用于让用户自助领取代币。这是 MVP 闭环的第一步：

1. **用户获取代币的入口**：用户需要通过 MerkleAirdrop 领取 GUA Token 才能参与后续的投票
2. **高效的分发机制**：使用 Merkle proof 机制，无需逐个转账，用户自助领取，节省 gas 成本
3. **支持多期空投**：初始空投后，持续激励也采用 Merkle 领取机制，可以更新 root 支持新一期领取

这是整个系统的基础设施，必须优先实现。

## What Changes

- **添加 MerkleAirdrop 合约**：实现基于 Merkle proof 的代币领取机制
- **核心功能**：
  - `setMerkleRoot(bytes32 root)` - 管理员设置 Merkle root（支持更新，用于多期空投）
  - `claim(address to, uint256 amount, bytes32[] calldata proof)` - 用户领取代币
  - 防重复领取机制（使用 mapping 记录已领取地址）
- **与 GUAToken 集成**：MerkleAirdrop 需要调用 GUAToken 的 `mint()` 功能
- **事件**：`MerkleRootUpdated`、`Claimed` 用于前端索引和监听
- **完整测试**：覆盖成功领取、重复领取、错误 proof、错误 amount 等场景

## Impact

- **影响的规范**：
  - `merkle-airdrop`：Merkle 空投功能（新增）
- **影响的代码**：
  - 新建 `contracts/MerkleAirdrop.sol`
  - 新建 `test/MerkleAirdrop.t.sol`
  - 更新 `script/Deploy.s.sol`（添加 MerkleAirdrop 部署）
- **依赖关系**：
  - 依赖 `GUAToken` 合约（需要 mint 权限）
  - 需要 OpenZeppelin 的 `MerkleProof` 库
  - 需要 OpenZeppelin 的 `Ownable` 用于权限控制
- **集成要求**：
  - GUAToken 需要授权 MerkleAirdrop 合约 mint 权限（或 MerkleAirdrop 成为 GUAToken 的 owner）

