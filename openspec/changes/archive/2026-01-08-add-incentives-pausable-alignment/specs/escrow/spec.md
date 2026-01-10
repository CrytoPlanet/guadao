## ADDED Requirements
### Requirement: 紧急暂停（Pausable）
Escrow 合约 SHALL 支持管理员启用/解除暂停，用于紧急停止资金相关操作。

#### Scenario: 暂停后限制
- **WHEN** 合约处于暂停状态
- **THEN** 资金相关函数调用被拒绝

#### Scenario: 恢复后可用
- **WHEN** 管理员解除暂停
- **THEN** 资金相关函数可正常执行
