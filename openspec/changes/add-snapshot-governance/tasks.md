# Tasks: Add Snapshot Governance

## 1. Snapshot Space 配置
- [ ] 1.1 在 snapshot.org 创建 GUA DAO Space
- [ ] 1.2 配置投票策略 (erc20-balance-of)
- [ ] 1.3 设置 Space 基本信息（名称、描述、Logo）
- [ ] 1.4 配置投票参数（投票时长、提案门槛）

## 2. dApp 集成
- [x] 2.1 在 `config.json` 添加 Snapshot Space URL 配置
- [x] 2.2 在 Header 导航添加 "社区投票" 链接
- [x] 2.3 在首页添加 Snapshot 入口卡片

## 3. oSnap (UMA) 集成
- [x] 3.1 安装 `zodiac-module-reality` 依赖
- [x] 3.2 创建 `DeployOSnap.s.sol` 部署脚本
- [x] 3.3 编写 Snapshot + oSnap 配置文档
- [ ] 3.4 部署 RealityModuleEth (连接 UMA)

## 4. 文档与测试
- [ ] 4.1 编写 Snapshot 使用指南
- [ ] 4.2 创建测试提案验证流程
- [ ] 4.3 更新 README 说明

## 验证

- 在 Snapshot 创建测试提案
- 使用测试钱包投票
- 验证投票权重正确
- （可选）验证 Zodiac Reality 自动执行
