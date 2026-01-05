# airdrop-docs Specification

## Purpose
TBD - created by archiving change add-airdrop-docs. Update Purpose after archive.
## Requirements
### Requirement: Airdrop 领取指南
系统 SHALL 提供 `docs/airdrop.md`，面向普通用户解释 Merkle airdrop 的基本概念与领取流程。

#### Scenario: 读者快速理解
- **WHEN** 用户阅读 `docs/airdrop.md`
- **THEN** 文档包含「什么是 Merkle airdrop（简版）」的说明

### Requirement: Proof 查找说明
系统 SHALL 说明如何从 `merkle/proofs.json` 或 API 获取个人 proof 与 amount。

#### Scenario: 使用 proofs.json
- **WHEN** 用户查看本地 `merkle/proofs.json`
- **THEN** 文档提供地址查找示例与字段说明

### Requirement: dApp 领取步骤
系统 SHALL 描述在 dApp 中完成 claim 的步骤，并包含示例内容。

#### Scenario: 用户按步骤领取
- **WHEN** 用户按照文档流程操作
- **THEN** 文档提供可执行的领取步骤与示例参数

### Requirement: 安全提示
系统 SHALL 明确声明领取过程不需要私钥或助记词。

#### Scenario: 避免敏感信息泄露
- **WHEN** 用户阅读安全提示
- **THEN** 文档明确提示“领取不需要私钥/助记词”

