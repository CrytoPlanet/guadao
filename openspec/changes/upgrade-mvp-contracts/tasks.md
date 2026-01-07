## 1. 合约重构
- [x] 1.1 安装 OpenZeppelin Upgradeable 依赖
- [x] 1.2 重构 `GUAToken.sol` 为 UUPS + AccessControl
- [x] 1.3 重构 `MerkleAirdrop.sol` 为 UUPS + Ownable
- [x] 1.4 重构 `TopicBountyEscrow.sol` 为 UUPS + Ownable
- [x] 1.5 添加 `setTreasury()` 函数到 `TopicBountyEscrow`

## 2. 部署脚本
- [x] 2.1 更新 `Deploy.s.sol` 使用 `ERC1967Proxy`
- [x] 2.2 配置初始化参数与角色授权
- [x] 2.3 添加多签地址环境变量支持

## 3. 测试
- [x] 3.1 更新 `GUAToken.t.sol` 覆盖代理部署与角色验证
- [x] 3.2 更新 `MerkleAirdrop.t.sol` 覆盖代理部署
- [x] 3.3 更新 `TopicBountyEscrow.t.sol` 覆盖代理部署与 treasury 变更
- [x] 3.4 运行完整测试套件 `forge test`

## 4. 验证
- [x] 4.1 本地 Anvil 部署模拟
- [x] 4.2 验证升级路径（V1 -> V2 模拟）
