## ADDED Requirements
### Requirement: 领取资格展示
系统 SHALL 展示当前地址的领取资格信息（amount 与领取状态）。

#### Scenario: 已有领取资格
- **WHEN** 用户连接钱包且地址存在于快照
- **THEN** 页面显示领取数量与状态

### Requirement: Proof 获取或输入
系统 SHALL 支持从 `merkle/proofs.json` 或 API 获取 proof，且允许手动输入。

#### Scenario: 手动输入 proof
- **WHEN** 用户选择手动输入 proof
- **THEN** 页面提供可编辑的 proof 输入区

### Requirement: 发起领取交易
系统 SHALL 调用合约 `claim(address,uint256,bytes32[])` 并展示交易结果。

#### Scenario: 领取成功
- **WHEN** 交易确认成功
- **THEN** 页面提示领取成功并更新状态

### Requirement: 错误提示
系统 SHALL 在 proof 错误、已领取或网络错误时给出明确提示。

#### Scenario: Proof 错误
- **WHEN** 用户提交错误 proof
- **THEN** 页面显示“proof 错误”提示

### Requirement: 安全提示
系统 SHALL 明确声明领取不需要私钥或助记词。

#### Scenario: 用户查看安全提示
- **WHEN** 用户浏览领取页面
- **THEN** 页面包含“无需私钥/助记词”的提示
