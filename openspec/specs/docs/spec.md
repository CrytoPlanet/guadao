# docs Specification

## Purpose
TBD - created by archiving change add-dapp-ops-ux-polish. Update Purpose after archive.
## Requirements
### Requirement: 运维与用户指引
文档 SHALL 提供运维与用户快速指引，包括交易追踪与暂停操作说明。

#### Scenario: 指引可执行
- **WHEN** 运维/用户阅读文档
- **THEN** 能按步骤完成追踪与操作

### Requirement: 激励发放运维流程
文档 SHALL 说明按期激励发放的具体操作步骤，包括生成 root、更新合约与验证领取。

#### Scenario: 运维执行
- **WHEN** 运维人员按照文档操作
- **THEN** 能完成新一期 Merkle root 发布并验证领取

### Requirement: 文档编码与指引一致性
系统 SHALL 统一 README 与 docs 为 UTF-8 编码，并保持指引与实际实现一致。

#### Scenario: 文档可读性
- **WHEN** 用户打开 README 或 docs
- **THEN** 文档不出现乱码

#### Scenario: 本地空投测试指引
- **WHEN** 用户执行本地空投测试
- **THEN** 指引包含 Next.js 本地启动步骤

