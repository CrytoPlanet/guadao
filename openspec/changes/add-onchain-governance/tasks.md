# Tasks: Add On-chain Governance

## 1. GUAToken 升级
- [x] 1.1 创建 GUATokenV2.sol 添加 ERC20VotesUpgradeable
- [x] 1.2 编写升级测试用例
- [x] 1.3 在本地 Anvil 测试升级流程
- [x] 1.4 验证升级后 Token 余额不变

## 2. 部署治理合约
- [x] 2.1 创建 GUAGovernor.sol 合约
- [x] 2.2 创建部署脚本 GovernorDeploy.s.sol
- [ ] 2.3 部署 TimelockController
- [ ] 2.4 部署 GUAGovernor
- [ ] 2.5 配置 Timelock 角色

## 3. 测试验证
- [x] 3.1 编写 Governor 单元测试
- [x] 3.2 测试提案创建流程
- [x] 3.3 测试投票流程
- [x] 3.4 测试时间锁执行
- [x] 3.5 测试紧急取消功能

## 4. Base Sepolia 部署
- [ ] 4.1 升级 GUAToken (通过 Safe)
- [ ] 4.2 部署 Governor + Timelock
- [ ] 4.3 创建测试提案验证

## 5. Tally 集成
- [ ] 5.1 在 Tally.xyz 注册 DAO
- [ ] 5.2 配置 Governor 地址
- [ ] 5.3 验证投票界面正常显示

## 6. dApp 更新
- [x] 6.1 在 config.json 添加 Governor 地址
- [x] 6.2 在 Header 添加 "协议治理 (Tally)" 链接
- [ ] 6.3 添加 delegate 引导组件（可选）

## 7. 文档
- [ ] 7.1 编写链上治理使用指南
- [ ] 7.2 更新项目文档说明治理架构

## 验证

### 自动化测试
```bash
forge test --match-contract GUATokenV2Test -vv
forge test --match-contract GUAGovernorTest -vv
```

### 手动验证
- 在 Tally 创建测试提案
- 使用测试钱包投票
- 验证时间锁执行
