## ADDED Requirements

### Requirement: MerkleAirdrop 可升级
MerkleAirdrop 合约 SHALL 使用 UUPS 代理模式部署，支持未来升级。

#### Scenario: 合约可升级
- **WHEN** Owner 部署新的 Implementation 并调用 `upgradeToAndCall`
- **THEN** 代理合约指向新的 Implementation，状态保留

#### Scenario: 非 Owner 无法升级
- **WHEN** 非 Owner 地址尝试调用 `upgradeToAndCall`
- **THEN** 交易 MUST revert

### Requirement: MerkleAirdrop 使用 OwnableUpgradeable
MerkleAirdrop 合约 SHALL 使用 `OwnableUpgradeable` 进行初始化。

#### Scenario: 初始化 Owner
- **WHEN** 合约通过 `initialize` 初始化
- **THEN** 指定的 owner 地址成为合约 Owner
