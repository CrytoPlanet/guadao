# universal-airdrop Specification

## ADDED Requirements

### Requirement: 通用空投领取
系统 SHALL 允许任意钱包地址领取固定数量的 GUA Token。

#### Scenario: 成功领取
- **WHEN** 用户调用 `claim()` 且未领取过
- **THEN** 系统将 `claimAmount` 数量的 GUA mint 到用户地址，标记为已领取

#### Scenario: 重复领取被拒绝
- **WHEN** 用户第二次调用 `claim()`
- **THEN** 交易 MUST revert

#### Scenario: 供应上限
- **WHEN** 已领取总量达到 `maxSupply`
- **THEN** 后续 `claim()` 调用 MUST revert

### Requirement: 空投参数配置
系统 SHALL 允许 Admin 配置空投参数。

#### Scenario: 设置领取数量
- **WHEN** Admin 调用 `setClaimAmount(amount)`
- **THEN** 后续领取使用新的数量

#### Scenario: 设置总供应上限
- **WHEN** Admin 调用 `setMaxSupply(supply)`
- **THEN** 系统使用新的上限值

#### Scenario: 非 Admin 无法配置
- **WHEN** 非 Admin 地址调用配置函数
- **THEN** 交易 MUST revert

### Requirement: 暂停功能
系统 SHALL 允许 Admin 暂停和恢复空投功能。

#### Scenario: 暂停后无法领取
- **WHEN** Admin 调用 `pause()` 后用户尝试 `claim()`
- **THEN** 交易 MUST revert

#### Scenario: 恢复后可领取
- **WHEN** Admin 调用 `unpause()` 后
- **THEN** 用户可正常调用 `claim()`

### Requirement: 事件记录
系统 SHALL 发出事件用于前端索引和监听。

#### Scenario: 领取事件
- **WHEN** 用户成功领取
- **THEN** 发出 `Claimed(address indexed user, uint256 amount)` 事件

#### Scenario: 配置变更事件
- **WHEN** Admin 变更配置
- **THEN** 发出相应的配置变更事件
