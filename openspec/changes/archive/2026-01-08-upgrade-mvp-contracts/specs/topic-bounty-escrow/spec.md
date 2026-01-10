## ADDED Requirements

### Requirement: TopicBountyEscrow 可升级
TopicBountyEscrow 合约 SHALL 使用 UUPS 代理模式部署，支持未来升级。

#### Scenario: 合约可升级
- **WHEN** Owner 部署新的 Implementation 并调用 `upgradeToAndCall`
- **THEN** 代理合约指向新的 Implementation，状态保留

#### Scenario: 非 Owner 无法升级
- **WHEN** 非 Owner 地址尝试调用 `upgradeToAndCall`
- **THEN** 交易 MUST revert

### Requirement: TopicBountyEscrow Treasury 可变
TopicBountyEscrow 合约 SHALL 支持 Owner 更新 Treasury 地址。

#### Scenario: Owner 可更新 Treasury
- **WHEN** Owner 调用 `setTreasury(newTreasury)`
- **THEN** treasury 地址被更新，发出 `TreasuryUpdated` 事件

#### Scenario: 非 Owner 不能更新 Treasury
- **WHEN** 非 Owner 地址尝试调用 `setTreasury`
- **THEN** 交易 MUST revert

### Requirement: TopicBountyEscrow 使用 OwnableUpgradeable
TopicBountyEscrow 合约 SHALL 使用 `OwnableUpgradeable` 进行初始化。

#### Scenario: 初始化 Owner
- **WHEN** 合约通过 `initialize` 初始化
- **THEN** 指定的 owner 地址成为合约 Owner
