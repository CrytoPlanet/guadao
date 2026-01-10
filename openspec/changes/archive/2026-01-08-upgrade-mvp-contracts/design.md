## Context
MVP 合约需要长期运维能力（修复 Bug、添加功能）和安全的权限管理（多签控制）。

## Goals / Non-Goals
- **Goals**:
  - 实现 UUPS 代理模式，支持未来升级
  - 分离 Mint 权限与管理权限
  - Treasury 地址可变
- **Non-Goals**:
  - 实现完整的 DAO 治理（v0.2+）
  - 引入 Timelock（可后续追加）

## Decisions
- **UUPS vs Transparent Proxy**: 选择 UUPS，因其更低 gas 成本且升级逻辑在 implementation 中更易管理。
- **AccessControl vs Ownable2Step**: GUAToken 使用 AccessControl 实现细粒度角色；其他合约保持 Ownable 简单结构。
- **Treasury 可变**: 通过 `setTreasury()` 实现，Owner 可在不升级合约的情况下更换多签地址。

## Risks / Trade-offs
- **升级风险**: 错误的升级实现可能导致存储冲突。→ 使用 OpenZeppelin 升级插件验证。
- **权限集中**: Owner 仍可升级合约。→ 建议将 Owner 设为多签钱包。

## Migration Plan
1. 部署新的 Implementation 合约
2. 通过 ERC1967Proxy 部署 Proxy
3. 调用 `initialize` 配置初始状态
4. 转移 ownership 到多签钱包

## Open Questions
- 是否需要 Timelock 延迟升级生效？（建议 v0.2+ 考虑）
