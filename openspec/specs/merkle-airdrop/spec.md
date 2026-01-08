# merkle-airdrop Specification

## Purpose
TBD - created by archiving change add-merkle-airdrop. Update Purpose after archive.
## Requirements
### Requirement: Merkle Root 管理
系统 SHALL 允许管理员设置和更新 Merkle root，用于控制可领取的代币分配。

#### Scenario: 管理员设置 Merkle root
- **WHEN** 管理员调用 `setMerkleRoot(root)`
- **THEN** Merkle root 被更新，发出 `MerkleRootUpdated` 事件

#### Scenario: 非管理员不能设置 root
- **WHEN** 非管理员地址尝试调用 `setMerkleRoot()`
- **THEN** 交易 revert，root 保持不变

#### Scenario: Root 更新支持多期空投
- **WHEN** 管理员更新 root 后
- **THEN** 用户可以使用新 root 对应的 proof 领取新一轮代币

### Requirement: Merkle Proof 验证
系统 SHALL 验证用户提供的 Merkle proof，确保用户有资格领取指定数量的代币。

#### Scenario: 有效的 proof 通过验证
- **WHEN** 用户提供有效的 `(address, amount, proof)`
- **THEN** proof 验证通过，允许领取

#### Scenario: 无效的 proof 被拒绝
- **WHEN** 用户提供无效的 proof（错误的 proof、amount 或地址）
- **THEN** 验证失败，交易 revert

#### Scenario: Proof 验证使用正确的 leaf
- **WHEN** 系统验证 proof
- **THEN** leaf 为 `keccak256(abi.encodePacked(address, amount))`

### Requirement: 代币领取功能
系统 SHALL 允许符合条件的用户通过 Merkle proof 领取 GUA Token。

#### Scenario: 用户成功领取代币
- **WHEN** 用户调用 `claim(to, amount, proof)` 且 proof 有效且未领取过
- **THEN** 指定数量的 GUA Token 被 mint 到 `to` 地址，发出 `Claimed` 事件

#### Scenario: 领取后标记为已领取
- **WHEN** 用户成功领取后
- **THEN** `claimed[to]` 被设置为 `true`

### Requirement: 防重复领取
系统 SHALL 防止同一地址重复领取代币。

#### Scenario: 重复领取被拒绝
- **WHEN** 用户尝试第二次调用 `claim()` 领取代币
- **THEN** 交易 revert，代币不会被重复 mint

#### Scenario: 已领取状态持久化
- **WHEN** 用户已领取后
- **THEN** `claimed[address]` 永久为 `true`，即使 root 更新也无法再次领取

### Requirement: 与 GUAToken 集成
MerkleAirdrop SHALL 能够调用 GUAToken 的 mint 功能。

#### Scenario: 成功 mint 代币
- **WHEN** MerkleAirdrop 验证通过后调用 GUAToken.mint()
- **THEN** 代币成功 mint 到用户地址

#### Scenario: Mint 权限正确
- **WHEN** MerkleAirdrop 尝试 mint
- **THEN** MerkleAirdrop 必须具有 GUAToken 的 mint 权限（owner 或授权）

### Requirement: 事件记录
系统 SHALL 发出事件用于前端索引和监听。

#### Scenario: Root 更新事件
- **WHEN** 管理员更新 root
- **THEN** 发出 `MerkleRootUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot)` 事件

#### Scenario: 领取事件
- **WHEN** 用户成功领取
- **THEN** 发出 `Claimed(address indexed to, uint256 amount)` 事件

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

