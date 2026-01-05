## ADDED Requirements

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
GUA Token SHALL 提供 mint 功能，仅允许授权地址（owner）调用。

#### Scenario: Owner 可以 mint
- **WHEN** owner 调用 `mint(address, amount)`
- **THEN** 指定地址的代币余额增加相应数量

#### Scenario: 非 Owner 不能 mint
- **WHEN** 非 owner 地址尝试调用 `mint()`
- **THEN** 交易 revert，代币余额不变

### Requirement: GUA Token 标准 ERC-20 功能
GUA Token SHALL 实现完整的 ERC-20 标准功能。

#### Scenario: 转账功能正常
- **WHEN** 用户调用 `transfer(to, amount)`
- **THEN** 代币从发送者转移到接收者

#### Scenario: 授权和转账功能正常
- **WHEN** 用户调用 `approve(spender, amount)` 然后 spender 调用 `transferFrom(from, to, amount)`
- **THEN** 代币从 from 转移到 to，授权额度相应减少

