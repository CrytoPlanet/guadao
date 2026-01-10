# gua-token Specification

## Purpose
TBD - created by archiving change init-project-setup. Update Purpose after archive.
## Requirements
### Requirement: GUA Token 基础功能
系统 SHALL 提供一个名为 "GUA Token" 的 ERC-20 代币，符号为 "GUA"。

#### Scenario: 代币基本信息正确
- **WHEN** 查询代币名称
- **THEN** 返回 "GUA Token"

#### Scenario: 代币符号正确
- **WHEN** 查询代币符号
- **THEN** 返回 "GUA"

#### Scenario: 代币精度正确
- **WHEN** 查询代币精度
- **THEN** 返回 18（标准 ERC-20 精度）

### Requirement: GUA Token 初始供应
GUA Token SHALL 初始供应量为 0，通过 MerkleAirdrop 或其他机制分发。

#### Scenario: 初始总供应量为零
- **WHEN** 部署 GUA Token 合约
- **THEN** 总供应量为 0

### Requirement: GUA Token Mint 功能
GUA Token SHALL 提供 mint 功能，仅允许拥有 `MINTER_ROLE` 的地址调用。

#### Scenario: 拥有 MINTER_ROLE 可以 mint
- **WHEN** 拥有 `MINTER_ROLE` 的地址调用 `mint(address, amount)`
- **THEN** 指定地址的代币余额增加相应数量

#### Scenario: 无 MINTER_ROLE 不能 mint
- **WHEN** 没有 `MINTER_ROLE` 的地址尝试调用 `mint()`
- **THEN** 交易 revert，代币余额不变

### Requirement: GUA Token 标准 ERC-20 功能
GUA Token SHALL 实现完整的 ERC-20 标准功能。

#### Scenario: 转账功能正常
- **WHEN** 用户调用 `transfer(to, amount)`
- **THEN** 代币从发送者转移到接收者

#### Scenario: 授权和转账功能正常
- **WHEN** 用户调用 `approve(spender, amount)` 然后 spender 调用 `transferFrom(from, to, amount)`
- **THEN** 代币从 from 转移到 to，授权额度相应减少

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

