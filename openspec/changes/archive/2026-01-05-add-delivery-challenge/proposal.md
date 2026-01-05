# Change: challengeDelivery 质疑与保证金（BC7）

## Why

BC5 已允许交付提交并开启 72h 质疑窗口，需要在窗口内提供质疑入口并锁定保证金，才能进入争议仲裁流程。

## What Changes

- 新增 challengeDelivery（仅在质疑窗口内）
- 固定 bond = 10,000 GUA 并锁定到合约
- 记录 challenger、reasonHash、evidenceHash
- 状态进入 DISPUTED 并触发事件
- 新增测试覆盖成功/窗口外/重复质疑

## Impact

- Affected specs: `topic-bounty-escrow`
- Affected code: `contracts/`, `test/`