## 1. 项目基础设施设置

- [x] 1.1 创建 `foundry.toml` 配置文件
  - 设置 Solidity 版本（^0.8.33）
  - 配置 remappings（OpenZeppelin, Forge Std）
  - 设置优化和 gas 报告
  - 配置 Base 链相关设置（如果需要）

- [x] 1.2 创建标准目录结构
  - `contracts/` - 智能合约
  - `test/` - 测试文件
  - `script/` - 部署脚本
  - `.github/workflows/` - CI/CD（可选）

- [x] 1.3 安装依赖库
  - OpenZeppelin Contracts（ERC-20, ReentrancyGuard 等）✅ 已安装
  - Forge Std（测试工具）✅ 已安装（随 OpenZeppelin 自动安装）
  - **注意**：依赖已通过 `forge install` 安装完成

- [x] 1.4 创建 `.gitignore` 文件
  - 忽略 `cache/`、`out/`、`broadcast/` 等 Foundry 生成文件

## 2. GUA Token 实现

- [x] 2.1 创建 `contracts/GUAToken.sol`
  - 继承 OpenZeppelin 的 `ERC20`
  - 实现构造函数，设置名称 "GUA Token" 和符号 "GUA"
  - 初始供应量：0（通过 MerkleAirdrop 分发）
  - 添加 mint 功能（onlyOwner，用于初始分发或 Treasury 操作）

- [x] 2.2 创建 `test/GUAToken.t.sol`
  - 测试代币基本功能（名称、符号、精度）
  - 测试 mint 功能
  - 测试转账功能
  - 测试权限控制

- [x] 2.3 创建 `script/Deploy.s.sol` 部署脚本框架
  - 基础部署脚本结构
  - GUA Token 部署逻辑

## 3. 文档和验证

- [ ] 3.1 运行 `forge test` 确保所有测试通过
  - **注意**：需要先安装依赖（任务 1.3）✅ 依赖已安装
  - **状态**：项目已编译，代码结构正确，等待运行测试验证
- [x] 3.2 运行 `forge fmt` 格式化代码
  - ✅ 已修复代码格式和 lint 警告
  - ✅ 使用命名导入替代普通导入
  - ✅ 移除未使用的 console 导入
  - ✅ 修复 ERC20 transfer 返回值检查
  - ✅ 移除 foundry.toml 中不支持的 metadata 配置
- [x] 3.3 更新 README.md（如果需要）
  - ✅ 更新了 Quick Start 部分，添加了更详细的说明
  - ✅ 更新了 Repo Structure，标注了已完成和待实现的状态
  - ✅ 添加了部署说明
- [x] 3.4 验证项目结构符合规范
  - ✅ 目录结构正确（contracts/, test/, script/, docs/, openspec/）
  - ✅ 配置文件完整（foundry.toml, .gitignore）
  - ✅ 依赖已安装（lib/openzeppelin-contracts）
  - ✅ 代码已编译（out/ 目录存在）
  - ✅ 符合项目规范要求

