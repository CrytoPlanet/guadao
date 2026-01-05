## ADDED Requirements
### Requirement: 10% 预付与交付窗口
系统 SHALL 在 Admin 确认胜者后支付 10% 并开启 14 天交付窗口。

#### Scenario: confirmWinnerAndPay10
- **WHEN** Admin 调用 confirmWinnerAndPay10
- **THEN** 系统支付 10% 给 winner.owner 并记录 submitDeadline

#### Scenario: 重复确认
- **WHEN** 再次调用 confirmWinnerAndPay10
- **THEN** 系统 MUST revert