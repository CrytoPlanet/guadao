# Change: Complete Escrow Lifecycle (Finalize + Expiry + State Machine)

## Why
当前 TopicBountyEscrow 缺少 finalizeDelivery 与 expireIfNoSubmission，且状态机不完整（仅 Created/Disputed）。
这导致 v0.1 的交付与超时流程无法闭环，BC4/BC5/BC7 的验收标准也无法严格满足。

## What Changes
- 补齐状态机：Created -> Voting -> VotingFinalized -> Accepted -> Submitted -> Completed/Denied/Expired
- 实现 finalizeDelivery()：72h 无争议后发放剩余 90%
- 实现 expireIfNoSubmission()：14d 未提交转入 Treasury
- 校验挑战路径必须在 Submitted 状态 + 窗口内

## Impact
- Affected specs: escrow
- Affected code: contracts/TopicBountyEscrow.sol, test/TopicBountyEscrow.t.sol
