# MerkleAirdrop 技术设计文档

## Context

MerkleAirdrop 是 GUA Token 系统的代币分发机制，需要：
1. 与已部署的 GUAToken 合约集成
2. 支持 Merkle proof 验证
3. 防止重复领取
4. 支持多期空投（通过更新 root）

## Goals / Non-Goals

### Goals
- 实现安全的 Merkle proof 验证机制
- 防止重复领取和重放攻击
- 支持管理员更新 root（多期空投）
- 与 GUAToken 无缝集成
- Gas 效率优化

### Non-Goals
- 不实现链上 Merkle tree 构建（离线生成）
- 不实现自动化的 root 更新（需要管理员手动设置）
- v0.1 不实现按 epoch 的自动切换（未来可能添加）

## Decisions

### Decision 1: 使用 OpenZeppelin MerkleProof 库
**选择**：使用 `@openzeppelin/contracts/utils/cryptography/MerkleProof.sol`

**理由**：
- 经过审计，安全性有保障
- 标准实现，减少自定义代码
- 社区广泛使用，易于维护

**替代方案**：自定义 Merkle proof 验证（不推荐，增加安全风险）

### Decision 2: 防重复机制使用 mapping 而非 BitMap
**选择**：使用 `mapping(address => bool) public claimed`

**理由**：
- 实现简单，易于理解
- 对于 MVP 规模（预计 < 1000 用户），gas 成本可接受
- 如果需要优化，后续可以迁移到 BitMap

**替代方案**：使用 BitMap（更省 gas，但实现复杂）

### Decision 3: MerkleAirdrop 作为 GUAToken 的 owner
**选择**：MerkleAirdrop 成为 GUAToken 的 owner，直接调用 `mint()`

**理由**：
- 最简单直接的集成方式
- 符合 OpenZeppelin Ownable 的设计模式
- 如果未来需要更细粒度的权限控制，可以迁移到 AccessControl

**替代方案**：
- GUAToken 授权 MerkleAirdrop mint 权限（需要修改 GUAToken 添加授权机制）
- 使用 AccessControl（更复杂，v0.1 不需要）

### Decision 4: Leaf 格式使用 `keccak256(abi.encodePacked(address, amount))`
**选择**：标准格式，地址在前，数量在后

**理由**：
- 符合常见实践
- 防止不同参数组合产生相同 hash
- 与链下生成脚本保持一致

### Decision 5: 支持 root 更新但不重置 claimed 状态
**选择**：更新 root 后，已领取的地址仍标记为已领取

**理由**：
- 防止用户在新 root 中重复领取
- 符合"每期只能领取一次"的业务逻辑
- 如果需要重置，可以通过部署新合约实现

**替代方案**：按 epoch 重置 claimed（v0.1 不实现，未来可能添加）

## Risks / Trade-offs

### Risk 1: GUAToken owner 权限集中
**风险**：如果 MerkleAirdrop 被攻击，攻击者可能获得 mint 权限

**缓解措施**：
- MerkleAirdrop 使用 Ownable，只有管理员可以更新 root
- 部署后审计合约代码
- 未来可以迁移到多签或更细粒度的权限控制

### Risk 2: Root 设置错误
**风险**：管理员设置错误的 root，导致用户无法领取

**缓解措施**：
- 链下充分测试 root 和 proof 的生成
- 部署前在测试网验证
- 提供紧急暂停机制（可选，v0.1 不实现）

### Risk 3: Gas 成本
**风险**：大量用户领取时，gas 成本可能较高

**缓解措施**：
- 使用 Merkle proof 机制本身就是为了降低 gas（相比逐个转账）
- 对于 MVP 规模，成本可接受
- 未来可以优化为 BitMap 或批量领取

## Migration Plan

### 部署步骤
1. 部署 GUAToken（如果尚未部署）
2. 部署 MerkleAirdrop，传入 GUAToken 地址
3. 将 GUAToken 的 owner 转移给 MerkleAirdrop
4. 生成 Merkle tree 和 root（链下）
5. 调用 `setMerkleRoot()` 设置 root
6. 用户开始领取

### 回滚计划
- 如果 MerkleAirdrop 有问题，可以将 GUAToken owner 转回原地址
- 部署新版本的 MerkleAirdrop 并重新设置

## Open Questions

- [ ] 是否需要紧急暂停功能？（v0.1 暂不实现）
- [ ] 是否需要设置领取期限？（v0.1 暂不实现，root 更新即可视为新一期）
- [ ] 未来是否需要支持按 epoch 自动切换 root？（v0.2+ 考虑）

