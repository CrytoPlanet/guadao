## ADDED Requirements
### Requirement: 配置化合约地址
系统 SHALL 通过 `config.json` 提供各网络的 MerkleAirdrop 合约地址与 proofs 地址。

#### Scenario: 自动加载配置
- **WHEN** dApp 启动
- **THEN** 自动读取 `config.json` 并设置合约地址与 proofs 地址

### Requirement: 网络映射
系统 SHALL 根据当前链 ID 选择对应的配置项。

#### Scenario: Base Sepolia
- **WHEN** 用户连接到 Base Sepolia
- **THEN** 使用 Base Sepolia 的配置项
