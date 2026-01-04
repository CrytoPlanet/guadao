Issue BC6 — finalizeDelivery(): after 72h auto-pay remaining 90%

Goal：72h 无质疑，任何人可 finalize，自动支付 90%。
Acceptance Criteria

✅ 72h 前 revert

✅ 72h 后支付成功并进入 COMPLETED

✅ 防重复 finalize
Labels：contract escrow core