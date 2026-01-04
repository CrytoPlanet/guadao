Issue BC4 — confirmWinnerAndPay10(): admin confirm + 10% payout

Goal：Admin 确认采用 winner，立刻支付 10%，开启 14 天交付倒计时。
Acceptance Criteria

✅ onlyAdmin

✅ 支付金额：payout10 = pool / 10；remaining90 = pool - payout10

✅ 记录 submitDeadline = now + 14 days

✅ 状态进入 ACCEPTED

✅ 测试：重复调用 revert
Labels：contract escrow core