# pinned-comment-proof.md（置顶评论交付证明）— v0.1

> **用途：** 本文档说明在 GUA v0.1 体系里，Topic Owner（创作者）如何通过 **YouTube 置顶评论** 来完成“交付证明（Delivery Proof）”。  
> **核心目标：** 让社区用一个**公开、可验证、低门槛**的方法，绑定 “视频交付 ↔ 创作者钱包”，并开启 **72 小时质疑窗口**。

---

## 1. 为什么要用“置顶评论”作为交付证明？

v0.1 的设计原则是：**尽量减少人工干预，但允许在必要处保留轻量仲裁**。

使用置顶评论的好处：

- ✅ **公开可查**：任何人都能看到并截图/存证
- ✅ **低门槛**：创作者只需要复制粘贴一段文本
- ✅ **绑定钱包**：把本期 winner 的 Topic Owner 钱包公开写入评论
- ✅ **可触发链上流程**：提交后开启 72h 质疑窗口，之后可自动 payout 90%

> v0.1 不做链上 YouTube API 校验（成本高、复杂、升级慢）。  
> 交付验证采用“乐观机制”：**默认相信交付成立，72h 内允许质疑**。

---

## 2. 置顶评论模板（Frozen v0.1）

创作者必须在 YouTube 视频的**置顶评论**中粘贴以下模板（必须完整一致）：

GUA-DELIVER:<proposalId>:<topicId>:<ownerWallet>:<nonce>

字段解释：

- `proposalId`：本期 Proposal 的编号
- `topicId`：赢家 Topic 的编号
- `ownerWallet`：Topic Owner（创作者）钱包地址（必须与合约中登记的一致）
- `nonce`：一次性随机值（由 dApp 生成，用于防止复制复用）

---

## 3. 示例（Example）

假设：

- proposalId = 12
- topicId = 3
- ownerWallet = 0xAbc...123
- nonce = 9f2c7a

置顶评论应为：

GUA-DELIVER:12:3:0xAbc...123:9f2c7a

---

## 4. 创作者（Topic Owner）交付步骤

### Step 1：发布视频
发布本期赢家主题对应的视频（YouTube）。

### Step 2：置顶评论绑定钱包
在视频评论区发布一条评论，内容为上面的模板，然后 **Pin（置顶）**。

### Step 3：在 dApp / 合约提交交付
在网站（或脚本）里调用 `submitDelivery(...)`，提交：

- `youtubeUrl`（或 youtubeId）
- `pinnedCommentText` 的哈希：`pinnedCodeHash = keccak256(pinnedCommentText)`

提交后：
- 系统进入 `SUBMITTED`
- 开启 **72 小时**质疑窗口

---

## 5. 社区成员如何验证交付？

任何人都可以验证：

1. 打开视频链接
2. 找到置顶评论
3. 检查内容是否符合格式（proposalId/topicId/ownerWallet 是否匹配）
4. 保存证据（截图 / 存档）

> 建议：社区可以在 Discord 里开一个 thread，集中放置验证截图与链接，方便公开审计。

---

## 6. 72 小时质疑机制（Challenge Window）

### 6.1 质疑窗口何时开始？
从创作者链上提交 `submitDelivery()` 成功后开始计时：

- `challengeWindowEnd = submitTime + 72 hours`

### 6.2 何时可以质疑？
任何人都可以在 72h 内发起 `challengeDelivery()`：

- 需要押入 **10,000 GUA bond**
- 可附带 reason/evidence（链上存 hash，链下发详细说明）

### 6.3 质疑成功/失败后果（v0.1）

- **质疑失败（approve）**
  - 创作者拿到剩余 90%
  - 质疑者 bond 全进 Treasury

- **质疑成功（deny）**
  - 剩余 90% 进 Treasury
  - 质疑者 bond 退回
  - 质疑者额外获得 **5,000 GUA**（从 Treasury）

---

## 7. 常见错误（请避免）

- ❌ 没有置顶（Pin）评论
- ❌ 格式不一致（多空格/少字段/拼错前缀）
- ❌ ownerWallet 不是合约绑定的钱包地址
- ❌ nonce 复用旧的（必须每次生成新的）
- ❌ 提交了 pinnedCodeHash，但对应评论内容后来被修改/删除

---

## 8. 建议的“交付最小标准”（社区共识）

为了减少争议，建议社区默认认可的“交付标准”至少包括：

- 视频明确围绕 winner topic
- 创作者钱包绑定正确
- 置顶评论保持 72h 不删除、不篡改
- 提交期限内完成（14 天内）

> v0.1 的最终仲裁仍由 Admin 执行，但越清晰的标准越能减少人工介入。

---

## 9. 反诈骗提醒（Anti-Scam）

- 我们不会私聊索要助记词/私钥/转账
- 官方链接仅以公告渠道为准
- 任何自称“官方人员”私聊你要你操作钱包的，基本都是骗子

---

## 10. v0.1 一句话总结

> **置顶评论 = 公开绑定“视频交付 ↔ 创作者钱包”的证据；提交后 72 小时无质疑，即可自动发放 90%。**
