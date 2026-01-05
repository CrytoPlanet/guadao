# Change: 项目初始化与 GUA Token 基础设置

## Why

项目目前还没有任何代码和开发环境配置。为了开始构建 MVP，需要：
1. 设置 Foundry 开发环境，这是所有智能合约开发的基础
2. 创建 GUA Token（ERC-20），这是整个系统的代币基础，其他合约都依赖它
3. 建立标准的项目结构和开发规范

这是所有后续开发工作的前提条件。

## What Changes

- **添加 Foundry 项目配置**：创建 `foundry.toml` 配置文件（Solidity 0.8.28+）
- **安装依赖库**：OpenZeppelin Contracts v5.x 和 Forge Std（最新稳定版）
- **创建项目目录结构**：`contracts/`、`test/`、`script/` 等标准目录
- **实现 GUA Token 合约**：基于 OpenZeppelin 的 ERC-20 代币
- **添加基础测试**：GUA Token 的基本功能测试
- **创建部署脚本框架**：为后续合约部署做准备

## Impact

- **影响的规范**：
  - `project-setup`：项目基础设施（新增）
  - `gua-token`：GUA 代币合约（新增）
- **影响的代码**：
  - 新建 `foundry.toml`
  - 新建 `contracts/GUAToken.sol`
  - 新建 `test/GUAToken.t.sol`
  - 新建 `script/Deploy.s.sol`（框架）
- **依赖关系**：
  - 这是所有后续合约开发的基础
  - MerkleAirdrop 和 TopicBountyEscrow 都需要引用 GUA Token

