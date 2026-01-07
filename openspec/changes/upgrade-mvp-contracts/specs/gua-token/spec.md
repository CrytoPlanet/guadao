## MODIFIED Requirements

### Requirement: GUA Token Mint 功能
GUA Token SHALL 提供 mint 功能，仅允许拥有 `MINTER_ROLE` 的地址调用。

#### Scenario: 拥有 MINTER_ROLE 可以 mint
- **WHEN** 拥有 `MINTER_ROLE` 的地址调用 `mint(address, amount)`
- **THEN** 指定地址的代币余额增加相应数量

#### Scenario: 无 MINTER_ROLE 不能 mint
- **WHEN** 没有 `MINTER_ROLE` 的地址尝试调用 `mint()`
- **THEN** 交易 revert，代币余额不变

## ADDED Requirements

### Requirement: GUA Token 可升级
GUA Token 合约 SHALL 使用 UUPS 代理模式部署，支持未来升级。

#### Scenario: 合约可升级
- **WHEN** Owner 部署新的 Implementation 并调用 `upgradeToAndCall`
- **THEN** 代理合约指向新的 Implementation，状态保留

#### Scenario: 非 Owner 无法升级
- **WHEN** 非 Owner 地址尝试调用 `upgradeToAndCall`
- **THEN** 交易 MUST revert

### Requirement: GUA Token 权限控制
GUA Token 合约 SHALL 使用 AccessControl 管理角色。

#### Scenario: 初始化时配置角色
- **WHEN** 合约初始化
- **THEN** 部署者获得 `DEFAULT_ADMIN_ROLE`，指定的 Airdrop 地址获得 `MINTER_ROLE`

#### Scenario: Admin 可授予和撤销角色
- **WHEN** `DEFAULT_ADMIN_ROLE` 调用 `grantRole` 或 `revokeRole`
- **THEN** 指定地址的角色被授予或撤销
