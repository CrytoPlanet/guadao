# Change: confirmWinnerAndPay10 预付与交付窗口（BC4）

## Why

BC3 已确定胜者与奖池，需要在 Admin 确认胜者后支付 10% 并开启 14 天交付窗口，作为交付/争议阶段的起点。

## What Changes

- 新增 confirmWinnerAndPay10（onlyAdmin）
- 计算 10% 预付与剩余 90%
- 记录 submitDeadline = now + 14 days
- 触发 WinnerConfirmed/Pay10 事件（命名可定）
- 新增测试覆盖成功与重复调用

## Impact

- Affected specs: `topic-bounty-escrow`
- Affected code: `contracts/`, `test/`