# Change: Add On-chain Governance (OZ Governor + Tally)

## Why

项目需要正式的链上治理机制，用于协议级决策（参数修改、合约升级、资金分配）。OpenZeppelin Governor 是最安全、最广泛使用的链上治理框架，配合 Tally 提供专业的投票界面。

## What Changes

- **BREAKING**: 升级 GUAToken 合约添加 ERC20Votes 支持
- 部署 TimelockController 合约
- 部署 GUAGovernor 合约
- 在 Tally.xyz 注册 DAO
- 更新 dApp 添加 Tally 链接

## Impact

- Affected specs: 
  - `gua-token` - 添加 ERC20Votes 扩展
  - 新增 `onchain-governance` 规范
- Affected code:
  - `contracts/GUAToken.sol` - 升级添加 ERC20Votes
  - 新增 `contracts/GUAGovernor.sol`
  - 新增 `contracts/TimelockController.sol` 部署脚本
  - `script/Deploy.s.sol` - 添加治理合约部署
  - `dapp/config.json` - 添加 Governor 地址

## 关键决策

1. **投票延迟 (Voting Delay)**: 1 天 - 给社区准备时间
2. **投票时长 (Voting Period)**: 7 天 - 足够的投票时间
3. **提案门槛 (Proposal Threshold)**: 100 GUA
4. **Quorum**: 4% 的 Token 供应量
5. **时间锁延迟 (Timelock Delay)**: 2 天 - 安全缓冲

## 风险与注意事项

> [!WARNING]  
> GUAToken 升级是破坏性变更，用户需要调用 `delegate()` 才能获得投票权。

> [!IMPORTANT]  
> Tally 目前主要支持主网，测试网支持有限。建议先在本地/测试网验证 Governor 功能。
