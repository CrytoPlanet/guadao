## ADDED Requirements
### Requirement: 文档编码与指引一致性
系统 SHALL 统一 README 与 docs 为 UTF-8 编码，并保持指引与实际实现一致。

#### Scenario: 文档可读性
- **WHEN** 用户打开 README 或 docs
- **THEN** 文档不出现乱码

#### Scenario: 本地空投测试指引
- **WHEN** 用户执行本地空投测试
- **THEN** 指引包含 Next.js 本地启动步骤
