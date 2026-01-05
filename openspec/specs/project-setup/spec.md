# project-setup Specification

## Purpose
TBD - created by archiving change init-project-setup. Update Purpose after archive.
## Requirements
### Requirement: Foundry 项目配置
项目 SHALL 使用 Foundry 作为开发、测试和部署框架。

#### Scenario: Foundry 配置正确
- **WHEN** 运行 `forge test`
- **THEN** 测试能够正常编译和运行

#### Scenario: 依赖库可用
- **WHEN** 合约导入 OpenZeppelin 或 Forge Std
- **THEN** 编译成功，无依赖错误

### Requirement: 项目目录结构
项目 SHALL 遵循标准的 Foundry 项目结构。

#### Scenario: 标准目录存在
- **WHEN** 查看项目根目录
- **THEN** 存在 `contracts/`、`test/`、`script/` 目录

### Requirement: 代码格式化
所有 Solidity 代码 SHALL 使用 `forge fmt` 格式化。

#### Scenario: 代码格式化检查
- **WHEN** 运行 `forge fmt --check`
- **THEN** 所有代码符合格式规范

