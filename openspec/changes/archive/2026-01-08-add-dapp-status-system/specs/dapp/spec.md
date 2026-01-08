## ADDED Requirements
### Requirement: 统一状态提示
系统 SHALL 提供统一的状态提示组件（加载/成功/错误/空）。

#### Scenario: 统一展示
- **WHEN** 页面进入加载、成功、错误或空状态
- **THEN** 使用统一的状态组件展示

### Requirement: 统一错误提示
系统 SHALL 统一网络、RPC、地址校验等错误提示。

#### Scenario: RPC 不可用
- **WHEN** RPC 不可用
- **THEN** 页面展示一致的错误提示与下一步指引

### Requirement: 统一交易反馈
系统 SHALL 统一交易提交流程提示（提交/确认/完成）。

#### Scenario: 交易完成
- **WHEN** 交易确认完成
- **THEN** 状态提示更新为完成并提供操作结果