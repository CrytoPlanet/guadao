# GUA Token System (Base) — Airdrop → Vote → Escrow Payout → Incentives

这是「吃瓜群众自治社」旗下 **GUA 币（GUA Token）** 的主仓库。  
目标不是“发一个币”，而是把它做成一条 **可运行、可验证、可持续** 的闭环系统：

✅ **发放（Airdrop）**：成员自己领取（Claim），不靠人工逐个转账  
✅ **使用（Voting / Staking）**：用 GUA 投票决定本期视频选题/决策  
✅ **兑现（Escrow → Reward）**：投票锁仓的币不是口嗨，会按条件自动发给 Topic Owner（创作者）  
✅ **持续（Emission / Incentive）**：空投发完后，贡献者还能持续获得 GUA（按贡献发放、按期领取）
- 白皮书（Notion）：（https://www.notion.so/DAO-v0-1-1e1ed1b358148028bbddd80544f4467e?pvs=11）


> ⚠️ 重要提示  
> - 参与投票的锁仓 GUA **不会退回**：它进入“赏金池”，最终用于支付创作者或进入 Treasury。  
> - 本项目不承诺任何金融收益，不构成投资建议。

---

## 你来这里能做什么？

本仓库专门把任务拆成可认领的 Issue，欢迎不同类型的贡献者：

- Solidity / Foundry（合约与测试）
- 前端 dApp（领取、投票、提交交付、质疑）
- 脚本与数据（Merkle tree、snapshot、生成领取列表）
- 文档与规范（流程、参数、反诈骗、安全说明）

👉 从 **Issues** 入手，优先认领带 `good first issue` 的任务。

---

## 系统闭环概览（v0.1）

### A) Airdrop（Merkle Claim）
- 我们发布一份领取名单（地址 + 数量）
- 离线生成 Merkle root，上链
- 用户自己 `claim(amount, proof)` 领取（防重复领取）

### B) Voting（Stake-to-Bounty）
- 每期视频一次（一期一投票）
- 用 GUA 锁仓投票：锁仓池 = 本期赏金池
- 投票截止后 winner = 锁仓最多的 Topic

### C) Escrow Payout（10% / 90%）
- Admin 确认采用 winner → 立即支付 10%（订金）
- 创作者 14 天内提交交付证明
- 提交后 72h 质疑期：
  - 无质疑 → 自动支付剩余 90%
  - 有质疑 → 进入争议（v0.1 由 Admin 仲裁）

### D) Incentives（持续发放）
- 空投后，贡献者通过贡献获得“下一期领取额度”
- 仍采用 Merkle 方式：每期/每周发布新 root
- 贡献者自己领取（Claim），链上可验证、操作简单

---

## v0.1 关键参数（已冻结）

### 时间
- `submitDeadline`：**14 days**
- `challengeWindow`：**72 hours**

### 付款
- `payoutSplit`：**10% / 90%**
- 投票锁仓池：**不退回**（进入赏金池或 Treasury）

### 质疑（Challenge）
- `challengeBond`：**10,000 GUA**
- `challengeReward`：**5,000 GUA（从 Treasury 额外奖励）**
- 质疑失败：bond 全进 Treasury  
- 质疑成功：bond 退回 + Treasury 额外奖励 5,000 GUA

### 失败处理（投票者不退）
- 超时未提交交付：**剩余 90% → Treasury**
- 争议仲裁 deny：**剩余 90% → Treasury**

完整规则见：`docs/spec-v0.1.md`

---

## 交付证明（Pinned Comment 绑定钱包）

创作者提交交付时，必须在视频**置顶评论**粘贴固定格式文本：

`GUA-DELIVER:<proposalId>:<topicId>:<ownerWallet>:<nonce>`

- `ownerWallet` 必须与 Topic 创建时绑定的钱包一致
- `nonce` 由前端生成（防复制旧证明）
- 合约只存 `pinnedCodeHash`（不存完整文本）
- v0.1 不依赖 YouTube API 自动校验：靠公开证据 + 72h 质疑期

详见：`docs/pinned-comment-proof.md`

---

## 合约与地址（Base）
<!-- Latest Verification: 2026-01-08 (Chain 31337) -->

> 部署后把占位符替换为真实地址

- Network: **Base Sepolia**
- GUA Token: `0x0dcd1bf9a1b36ce34237eeafef220932846bcd82`
- MerkleAirdrop (Claim): `0x0b306bf915c4d645ff596e518faf3f9669b97016`
- TopicBountyEscrow (Vote+Payout): `0xc6e7df5e7b4f2a278906862b61205850344d4e7d`
- Treasury: `0x04caa97d9c6ffbcebf0edd924f110df28989ffcb`
- Admin: `0x04caa97d9c6ffbcebf0edd924f110df28989ffcb`

---

## Repo Structure

```text
├── contracts/
│   └── (Upgradeable UUPS Contracts) # ✅ GUAToken, TopicBountyEscrow, MerkleAirdrop
├── script/
│   ├── Deploy.s.sol                 # ✅ 部署脚本（Foundry）
│   ├── deploy.ps1                   # ✅ Windows 一键部署脚本
│   ├── deploy.sh                    # ✅ Linux/Mac 一键部署脚本
│   └── update-config.js             # ✅ 前端配置自动同步脚本
├── test/                            # ✅ 包含所有合约的单元测试
├── dapp/                            # ✅ Next.js 前端应用
│   ├── config.json                  # 自动同步的合约地址配置
│   └── .env                         # 前端私有配置 (WalletConnect ID)
├── docs/                            # 系统设计文档
├── openspec/                        # OpenSpec 规范
├── foundry.toml                     # Foundry 配置
└── README.md                        # 本文件
```

**状态说明**：
- ✅ 已完成

## Quick Start

### 1) Prerequisites
- **Foundry**: [Install Guide](https://book.getfoundry.sh/getting-started/installation)
- **Node.js**: (For frontend & automation scripts)
- **Git**

### 2) Install Dependencies
```bash
# Install Submodules (Foundry)
forge install

# Install NPM packages (Frontend & Scripts)
npm install
cd dapp && npm install && cd ..
```

### 3) Configuration (.env)
Copy the example environment files and fill in your details:

**Backend (.env)**:
```bash
cp .env.example .env
# Edit .env and set PRIVATE_KEY, OWNER_ADDRESS, etc.
```

**Frontend (dapp/.env)**:
```bash
cp dapp/.env.template dapp/.env
# Edit dapp/.env and set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
```

### 4) Build & Test
```bash
forge build
forge test
```

### 5) Deploy & Sync (One-Click)
We provide automation scripts to deploy contracts and sync addresses to the frontend automatically.

**Windows (PowerShell)**:
```powershell
.\script\deploy.ps1 -Network sepolia
```

**Mac / Linux**:
```bash
chmod +x script/deploy.sh
./script/deploy.sh sepolia
```

This script will:
1. Deploy UUPS Upgradeable contracts to Base Sepolia.
2. Verify contracts on BaseScan.
3. **Automatically update** `dapp/config.json` and this `README.md` with new addresses.

### 6) Run Frontend
```bash
cd dapp
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to interact with the DAO.

## Treasury Ops（重要）

因为质疑成功需要从 Treasury 额外奖励 5,000 GUA，Treasury 必须提前给合约授权 allowance：

- Treasury 执行：approve(TopicBountyEscrow, <amount>)

- 合约将使用：transferFrom(TREASURY, challenger, 5000 GUA)

详见：docs/treasury-ops.md

## 运维快速指引（Nouns 风格）

- 交易追踪：用 BaseScan 查看交易哈希与合约地址（dApp 页面提供直达链接）
- 紧急暂停：Admin 可在前端执行 Pause/Unpause，用于快速止损与排查
- 激励发布：生成新一期 root → 更新合约 root → 公布 proofs.json

## MVP Demo（我们要跑通的最小闭环）

目标：跑通 一次完整闭环，证明系统可用。

1) 发布一份测试空投名单（50 个地址）

2) 用户自己 Claim 领取 GUA（MerkleAirdrop）

3) 开一轮投票：3–5 个 Topic，锁仓投票决定 winner

4) Admin 确认采用 winner → 支付 10%

5) 创作者提交交付 → 72h 无质疑 → 支付 90%

6) 发布下一期“贡献领取”名单（Merkle root 更新）→ 贡献者自己 Claim

## How to Contribute（贡献方式）

流程：

1) 在 Issues 认领任务（留言 “I’ll take this”）

2) Fork 仓库 → 新建分支开发

3) 提交 PR：说明做了什么、如何验证、测试结果/截图

4) Review 通过后合并

建议从 good first issue 开始。

## Anti-Scam（反诈骗提示）

- 我们不会私聊索要助记词/私钥/转账

- 官方链接仅以公告渠道为准

- 任何自称“官方人员”私聊你要你操作钱包的，基本都是骗子

## License（建议）

- Code: MIT

- Docs: CC BY-NC 4.0（可选）

提交代码/文档即表示你有权贡献并同意本项目许可条款。
::contentReference[oaicite:0]{index=0}





---

## Links

- 白皮书（Notion）：（https://www.notion.so/DAO-v0-1-1e1ed1b358148028bbddd80544f4467e?pvs=11）


