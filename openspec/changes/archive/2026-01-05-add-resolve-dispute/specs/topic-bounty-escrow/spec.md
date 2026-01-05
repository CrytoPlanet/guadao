## ADDED Requirements
### Requirement: 管理员仲裁争议
系统 SHALL 仅允许管理员对处于争议中的交付进行 approve/deny 仲裁。

#### Scenario: Approve 争议（质疑失败）
- **WHEN** 管理员以 approve 方式仲裁争议
- **THEN** 剩余 90% MUST 支付给 winner，bond MUST 转入 treasury

#### Scenario: Deny 争议（质疑成功）
- **WHEN** 管理员以 deny 方式仲裁争议
- **THEN** 剩余 90% MUST 转入 treasury，bond MUST 退还给 challenger，并且从 treasury 额外转 5,000 GUA 给 challenger

#### Scenario: Allowance 不足
- **WHEN** deny 路径需要 treasury 转账但 allowance 不足
- **THEN** 调用 MUST revert

#### Scenario: 非管理员调用
- **WHEN** 非管理员调用 resolveDispute
- **THEN** 调用 MUST revert