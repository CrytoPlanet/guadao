Issue BC8 — resolveDispute(): admin arbitration (approve/deny flows)

Goal：v0.1 仲裁逻辑（你已定规则）。
Rules

approve（质疑失败）：付 90% 给 owner；bond → treasury

deny（质疑成功）：90% → treasury；bond 退回 challenger；treasury 额外奖励 5,000 GUA
Acceptance Criteria

✅ onlyAdmin

✅ deny 路径使用 transferFrom(treasury, challenger, 5000)

✅ allowance 不足时 revert，并写明 ops 要求

✅ 单测覆盖 approve/deny
Labels：contract security core