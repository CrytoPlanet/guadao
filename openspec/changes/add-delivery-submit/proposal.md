# Change: submitDelivery 交付提交与质疑窗口（BC5）

## Why

BC4 已完成胜者确认与 10% 预付，需要允许胜者提交交付证明并开启 72 小时质疑窗口，作为争议流程的前置条件。

## What Changes

- 新增 submitDelivery（only winner.owner）
- 记录交付内容（youtubeUrlHash / videoIdHash / pinnedCodeHash）
- 设置 challengeWindowEnd = now + 72 hours
- 触发 DeliverySubmitted 事件
- 新增测试覆盖成功/权限/状态校验

## Impact

- Affected specs: `topic-bounty-escrow`
- Affected code: `contracts/`, `test/`