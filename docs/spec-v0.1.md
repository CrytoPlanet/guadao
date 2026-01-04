# GUA Token System — 规范 v0.1（冻结版）

> **状态：** 冻结（v0.1）  
> **网络：** Base  
> **范围：** 本规范定义 GUA 的最小闭环：**空投 → 投票 → 托管发放 → 持续激励**  
> **非目标：** v0.1 不追求完全去信任化。争议采用 **管理员仲裁**，以便快速迭代。

---

## 0. 术语表

- **GUA Token**：Base 链上的 ERC-20 代币。
- **Admin（管理员）**：v0.1 的运营账户（后续建议迁移到 Safe 多签）。
- **Treasury（国库）**：存放 GUA 的地址，用于系统运营支出（例如质疑成功奖励）。
- **Proposal（提案/一期）**：一次投票轮次（**每期视频一次**），包含 3–5 个 Topic。
- **Topic（主题）**：候选主题，绑定一个 **Topic Owner** 地址。
- **Topic Owner / Creator（创作者）**：若主题获胜，将收到赏金的绑定钱包地址。
- **Bounty Pool（赏金池）**：本期所有投票锁仓 GUA 的总和。**不退回**。
- **Delivery（交付）**：创作者提交的交付证明（YouTube 链接 + 置顶评论绑定钱包）。
- **Challenge（质疑）**：在 72 小时质疑窗口内发起的争议，并押入质疑保证金（bond）。

---

## 1. v0.1 系统闭环概览

### A) 空投（Merkle Claim）
- 发放采用 **Merkle 领取**。
- 离线准备领取名单（地址 + 数量），生成 Merkle root 并上链。
- 用户用 `claim(amount, proof)` 自助领取，合约防止重复领取。

### B) 使用（投票 / 锁仓）
- 每一期（每期视频一次）开一轮投票。
- 用户用 GUA **锁仓投票**到某个 Topic。
- **锁仓的 GUA 直接构成赏金池**（Bounty Pool）。

### C) 兑现（托管 → 发放）
- 投票结束后产生 winner。
- Admin 确认采用 winner。
- 赏金按里程碑发放：**10% 订金 + 90% 乐观验证后发放**。

### D) 持续激励（Emission / Incentives）
- 初始空投后，持续激励仍采用 **按期 Merkle 领取**（每周/每期）。
- 贡献统计可先链下进行；领取在链上可验证、可追溯。

---

## 2. 角色与权限（v0.1）

### Admin（onlyAdmin）可以：
- 创建 Proposal 与 Topics
- 结束投票并最终确定 winner
- 确认采用 winner 并触发 10% 发放
- 仲裁争议（approve/deny）
- 设置 Merkle root（空投/贡献领取）

### 任何人可以：
- 在投票窗口内锁仓投票
- 在无质疑情况下，72h 后 finalize 交付并触发 90% 发放
- 超时后触发过期处理（把剩余 90% 归 Treasury）

### Topic Owner 可以：
- 在截止期内提交交付证明（Delivery）

---

## 3. Proposal 生命周期（投票 + 托管）

### 3.1 状态机（State）

Proposal 典型路径如下（或其子集）：

- `CREATED` → `VOTING` → `VOTING_FINALIZED` → `ACCEPTED`
- `ACCEPTED` → `SUBMITTED` → `COMPLETED`
- `SUBMITTED` → `DISPUTED` →（`COMPLETED` 或 `DENIED`）
- `ACCEPTED` → `EXPIRED`（超时未提交交付）

### 3.2 冻结参数（Frozen）

**时间**
- `submitDeadline`：**14 天**（从 Admin 确认采用开始计时）
- `challengeWindow`：**72 小时**（从交付提交开始计时）

**发放比例**
- `payoutSplit`：**10% / 90%**
- `payout10 = floor(pool / 10)`
- `payout90 = pool - payout10`（避免精度损失）

**质疑**
- `challengeBond`：**10,000 GUA**
- `challengeReward`：**5,000 GUA**（质疑成功时从 Treasury 额外奖励）

**投票锁仓不退**
- 投票锁仓的 GUA **不退回**。
- 无论结果如何，锁仓都构成赏金池/国库流转。

---

## 4. 投票规则（Stake-to-Bounty）

### 4.1 投票窗口
- Proposal 定义 `voteStart` 与 `voteEnd`。
- `stakeVote()` 仅在 `voteStart <= now < voteEnd` 有效。

### 4.2 Winner 判定
- winner 为 **锁仓总额最高**的 Topic。
- **平票规则（冻结 v0.1）：** `topicId` 最小者获胜。

### 4.3 投票结束
- `finalizeVoting()` 只能在 `voteEnd` 后调用。
- 只能执行一次，并冻结：
  - winner topicId
  - total pool（赏金池总额）

---

## 5. 采用确认 & 10% 订金发放

### 5.1 管理员确认
- 投票 finalize 后，Admin 调用：
  - `confirmWinnerAndPay10()`

### 5.2 结果
- 状态进入 `ACCEPTED`
- 立刻将 `payout10` 转给 `winner.owner`
- 记录 `submitDeadlineAt = now + 14 days`
- 记录 `remaining90 = pool - payout10`

---

## 6. 交付提交（14 天内）

### 6.1 谁能提交
- 仅 `winner.owner` 可调用 `submitDelivery()`。

### 6.2 提交内容
- `youtubeUrl`（或等价标识）
- `pinnedCodeHash = keccak256(置顶评论文本)`

### 6.3 置顶评论绑定格式（冻结 v0.1）
创作者需要在 YouTube 视频 **置顶评论**中粘贴以下模板：

`GUA-DELIVER:<proposalId>:<topicId>:<ownerWallet>:<nonce>`

- `ownerWallet` 必须等于创建 Topic 时绑定的钱包
- `nonce` 由 dApp 生成（防重复/防复用）

> v0.1 不做链上 YouTube API 校验。  
> 采用 **乐观验证**：置顶评论是公开证据；72h 内任何人可质疑。

### 6.4 质疑窗口开启
提交成功后：
- `challengeWindowEnd = now + 72 hours`
- 状态进入 `SUBMITTED`

---

## 7. 72h 无质疑 → 发放剩余 90%

### 7.1 无质疑路径
- 72h 内无人质疑：
  - 任何人可调用 `finalizeDelivery()`
  - 合约将 `remaining90` 转给 `winner.owner`
  - 状态进入 `COMPLETED`

### 7.2 限制
`finalizeDelivery()` 必须在以下情况 revert：
- 72h 未结束
- 状态不是 `SUBMITTED`
- 已完成/已否决/已过期

---

## 8. 质疑与争议（v0.1 管理员仲裁）

### 8.1 发起质疑（Challenge）
在 72h 窗口内，任何人可调用 `challengeDelivery()`：
- 押入 `bond = 10,000 GUA`（转入合约）
- 可附带 `reasonHash` / `evidenceHash`
- 状态进入 `DISPUTED`

### 8.2 仲裁（Admin）
Admin 调用 `resolveDispute(approve | deny)`。

#### (A) approve = 质疑失败
- 发放 `remaining90` 给 `winner.owner`
- 质疑者 bond（10,000）→ Treasury
- 状态进入 `COMPLETED`

#### (B) deny = 质疑成功
- `remaining90` → Treasury
- 退回质疑者 bond（10,000）
- Treasury 额外奖励质疑者 **+5,000 GUA**（通过 `transferFrom`）
- 状态进入 `DENIED`

> Treasury 需要提前给合约设置 allowance。  
> allowance 不足时，deny 路径应 revert（需要运维补 allowance）。

---

## 9. 超时未交付（Expiry）

若达到 `submitDeadlineAt` 且创作者未提交交付：
- 任何人可调用 `expireIfNoSubmission()`
- 将 `remaining90` 转入 Treasury
- 状态进入 `EXPIRED`

---

## 10. Treasury 规则（冻结 v0.1）

### Treasury 收入
- 质疑失败：bond 进入 Treasury
- 超时未交付：remaining90 进入 Treasury
- 质疑成功（deny）：remaining90 进入 Treasury

### Treasury 支出
- 质疑成功奖励：`challengeReward = 5,000 GUA`

### 运维要求
- Treasury 必须对 escrow 合约设置 allowance：
  - `approve(escrow, amount)`
- escrow 会执行：
  - `transferFrom(TREASURY, challenger, 5000)`

---

## 11. v0.1 不做的事情（Out of Scope）

- 完全去信任化的 YouTube 验证（oracle）
- 自动化 YouTube API 校验
- 投票锁仓退回
- 二次投票机制（QV/conviction voting 等）
- 链上身份与抗女巫
- permissionless 提案创建（v0.1 仅管理员创建）
- 升级治理（v0.2+ 再做）

---

## 12. 安全要求（v0.1 最低线）

必须具备：
- payout 相关函数的重入保护（ReentrancyGuard）
- 清晰严格的状态机检查
- 完整事件（events）便于前端/索引
- （可选）Pausable 紧急暂停

---

## 13. 版本与变更策略

- v0.1 用于跑通 MVP 闭环，规则冻结。
- 任何变更必须：GitHub Issue 讨论 → PR → 版本升级到 v0.2+。


# GUA Token System — Spec v0.1 (Frozen)

> **Status:** Frozen (v0.1)  
> **Network:** Base  
> **Scope:** This spec defines the minimum end-to-end loop for GUA: **Airdrop → Vote → Escrow Payout → Incentives**.  
> **Non-goal:** v0.1 is NOT trying to be fully trustless. Disputes use **admin arbitration** to keep iteration fast.

---

## 0. Glossary

- **GUA Token**: ERC-20 token on Base.
- **Admin**: The operator account (v0.1). Future versions should migrate to a Safe multisig.
- **Treasury**: A GUA-holding address used for system operations (e.g., challenge success reward).
- **Proposal**: One “round” (一期视频一次) containing 3–5 Topics to vote on.
- **Topic**: A candidate topic bound to a **Topic Owner** address.
- **Topic Owner / Creator**: The wallet that will receive bounty payouts if their topic wins.
- **Bounty Pool**: The total locked votes (stake) in a proposal. **Not refundable**.
- **Delivery**: Creator’s proof that the chosen topic has been delivered (YouTube link + pinned comment binding).
- **Challenge**: A dispute raised during the 72h challenge window with a bond.

---

## 1. v0.1 System Overview (End-to-End Loop)

### A) Airdrop (Merkle Claim)
- Distribution is done via **Merkle claim**.
- A snapshot (address + amount) is published off-chain.
- A Merkle root is set on-chain.
- Users call `claim(amount, proof)` to receive tokens.

### B) Use (Voting / Staking)
- Each proposal is a voting round.
- Users lock (stake) GUA on topics.
- **Locked stake becomes the bounty pool**.

### C) Cash-out (Escrow → Reward)
- After voting ends, the winning topic is determined.
- Admin confirms that the winning topic is adopted.
- Payout is milestone-based: **10% upfront + 90% after optimistic verification**.

### D) Sustain (Incentives)
- After the initial airdrop, new token distribution continues via **epoch-based Merkle claims** (weekly / per episode).
- Contributions are tracked off-chain; claiming is verified on-chain via Merkle proofs.

---

## 2. Roles & Permissions (v0.1)

- **Admin (onlyAdmin)** can:
  - Create proposals and topics
  - Finalize voting
  - Confirm winner adoption and trigger 10% payout
  - Resolve disputes (approve / deny)
  - Update critical configuration values only when explicitly allowed by v0.1 (prefer immutable constants)

- **Anyone** can:
  - Stake vote during voting window
  - Finalize delivery after the 72h challenge window (if no challenge)
  - Trigger expiry after submit deadline

- **Topic Owner** can:
  - Submit delivery proof for the winning topic (within deadline)

---

## 3. Proposal Lifecycle (Voting + Escrow)

### 3.1 States

A proposal MUST move through these states (or a subset as applicable):

- `CREATED` → `VOTING` → `VOTING_FINALIZED` → `ACCEPTED`
- `ACCEPTED` → `SUBMITTED` → `COMPLETED`
- `SUBMITTED` → `DISPUTED` → (`COMPLETED` or `DENIED`)
- `ACCEPTED` → `EXPIRED` (no submission within deadline)

### 3.2 Parameters (Frozen)

**Time**
- `submitDeadline` = **14 days** (from the moment Admin confirms adoption)
- `challengeWindow` = **72 hours** (from delivery submission time)

**Payout Split**
- `payoutSplit` = **10% / 90%**
- `payout10 = floor(pool / 10)`
- `payout90 = pool - payout10` (avoid rounding loss)

**Challenge**
- `challengeBond` = **10,000 GUA**
- `challengeReward` = **5,000 GUA** (paid from Treasury when challenge succeeds)

**Non-refundable stake**
- All vote stake is **locked into the bounty pool**.
- Vote stake is **NOT refundable** under any outcome.

---

## 4. Voting Rules (Stake-to-Bounty)

### 4.1 Voting Window
- Proposal defines `voteStart` and `voteEnd`.
- `stakeVote()` only valid when `voteStart <= now < voteEnd`.

### 4.2 Winner Determination
- Winner topic is the one with **maximum total stake**.
- **Tie-breaker (Frozen v0.1):** lowest `topicId` wins.

### 4.3 Finalization
- `finalizeVoting()` can only be called after `voteEnd`.
- Finalization is one-time and freezes:
  - winner topic id
  - total pool amount

---

## 5. Adoption & Payout (10%)

### 5.1 Admin Confirmation
- After voting is finalized, Admin calls:
  - `confirmWinnerAndPay10()`

### 5.2 Effects
- Proposal transitions to `ACCEPTED`.
- `payout10` is immediately transferred to `winner.owner`.
- `submitDeadlineAt = now + 14 days`.
- Remaining pool tracked as `remaining90 = pool - payout10`.

---

## 6. Delivery Submission (within 14 days)

### 6.1 Who can submit
- Only `winner.owner` can call `submitDelivery()`.

### 6.2 What is submitted
- `youtubeUrl` (or an equivalent identifier)
- `pinnedCodeHash` = `keccak256(pinnedCommentText)`

### 6.3 Pinned Comment Binding Format (Frozen v0.1)
Creator must pin the following template in the YouTube video top comment:

`GUA-DELIVER:<proposalId>:<topicId>:<ownerWallet>:<nonce>`

- `ownerWallet` MUST equal the Topic Owner wallet bound at proposal creation.
- `nonce` is generated by the dApp for replay prevention.

> v0.1 does NOT require YouTube API verification on-chain.  
> Verification is **optimistic**: the pinned comment is public evidence, and challengers have 72h to dispute.

### 6.4 Challenge Window Start
- Upon successful submission:
  - `challengeWindowEnd = now + 72 hours`
  - Proposal transitions to `SUBMITTED`

---

## 7. Optimistic Finalization (90%)

### 7.1 No challenge path
- If no one challenges within 72h:
  - anyone can call `finalizeDelivery()`
  - contract transfers `remaining90` to `winner.owner`
  - proposal transitions to `COMPLETED`

### 7.2 Constraints
- `finalizeDelivery()` must revert if:
  - called before `challengeWindowEnd`
  - proposal not in `SUBMITTED`
  - proposal already completed/denied/expired

---

## 8. Challenge & Dispute (v0.1 Admin Arbitration)

### 8.1 Challenge action
- During the 72h window, anyone can call `challengeDelivery()` with:
  - `bond = 10,000 GUA` transferred to escrow contract
  - optional `reasonHash` / `evidenceHash`
- Proposal transitions to `DISPUTED`.

### 8.2 Resolution action (Admin)
Admin resolves via `resolveDispute(approve | deny)`.

#### (A) Approve = challenge failed
- Pay `remaining90` to `winner.owner`
- Transfer challenger bond (10,000) to `Treasury`
- Proposal transitions to `COMPLETED`

#### (B) Deny = challenge succeeded
- Transfer `remaining90` to `Treasury`
- Refund challenger bond (10,000) back to challenger
- Reward challenger **+5,000 GUA** from `Treasury` (via `transferFrom`)
- Proposal transitions to `DENIED`

> Treasury must pre-approve allowance to the escrow contract.  
> If allowance is insufficient, deny-resolution must revert (and ops must top up allowance).

---

## 9. Expiry (No Delivery Submission)

If `submitDeadlineAt` is reached and creator has not submitted delivery:

- anyone can call `expireIfNoSubmission()`
- transfer `remaining90` to `Treasury`
- proposal transitions to `EXPIRED`

---

## 10. Treasury Rules (Frozen v0.1)

- Treasury receives:
  - challenger bond when challenge fails
  - remaining90 when expiry or deny occurs

- Treasury pays:
  - `challengeReward = 5,000 GUA` on successful challenge (deny)

**Operational requirement**
- Treasury must set allowance for the escrow contract:
  - `approve(escrow, amount)`
- escrow will call:
  - `transferFrom(TREASURY, challenger, 5000)`

---

## 11. Out of Scope (v0.1)

v0.1 intentionally excludes:
- Fully trustless oracle verification of YouTube content
- Automatic YouTube API checking
- Vote stake refunds
- Multi-round quadratic voting / conviction voting
- On-chain identity / sybil resistance
- Permissionless proposal creation (onlyAdmin in v0.1)
- Full DAO governance for upgrades (planned for v0.2+)

---

## 12. Security Notes (v0.1 Minimal)

Must-have protections:
- Reentrancy guard on payout flows
- Pausable (optional but recommended) for emergency stop
- Strict state machine transitions
- Clear events for indexing / frontend

---

## 13. Versioning & Change Policy

- v0.1 is frozen for the MVP demo.
- Any changes must be proposed via GitHub Issue + discussion, and then version bumped (v0.2+).
