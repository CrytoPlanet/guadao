# Change: resolveDispute 争议仲裁（BC8）
## Why

BC7 进入 DISPUTED 后缺少管理员仲裁路径，资金与状态无法推进，需要在 v0.1 提供仲裁闭环。

## What Changes

- 新增 resolveDispute（onlyAdmin），支持 approve/deny 两条路径
- approve：支付剩余 90% 给 winner；质疑 bond 转入 treasury
- deny：剩余 90% 转入 treasury；bond 退还 challenger；treasury 额外奖励 5,000 GUA 给 challenger
- 补充事件与测试覆盖

## Impact

- Affected specs: `topic-bounty-escrow`
- Affected code: `contracts/`, `test/`
