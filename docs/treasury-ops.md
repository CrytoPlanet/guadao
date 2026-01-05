# Treasury Ops（国库运维说明）— v0.1（中文）

> **目的：** 这份文档面向 GUA 项目的运维/管理员，说明 Treasury（国库）在 v0.1 需要做哪些链上操作，才能保证系统闭环正常运行，尤其是 **质疑成功奖励** 的发放。

---

## 0. 背景：为什么 Treasury 需要“授权（allowance）”？

在 v0.1 里，**质疑成功（deny）** 时，需要给质疑者发放：

- 退回质疑保证金：`10,000 GUA`（从合约内部退回）
- 额外奖励：`5,000 GUA`（**从 Treasury 额外发放**）

为了让合约能够从 Treasury 支付这 `5,000 GUA`，合约会调用：

`transferFrom(TREASURY, challenger, 5000)`

这要求 Treasury 事先对合约做一次 ERC20 授权：

`approve(TopicBountyEscrow, allowanceAmount)`

> 这是一种常见做法：Treasury 不需要把币先转进合约，只需给合约“可支出额度”。

---

## 1. v0.1 相关地址（部署后补全）

请在部署完成后把以下地址填入：

- **GUA Token（ERC20）**：`0x...`
- **TopicBountyEscrow（投票/托管合约）**：`0x...`
- **Treasury（国库地址）**：`0x...`
- **Admin（管理员）**：`0x...`

---

## 2. Treasury 的最低要求（必须满足）

### ✅ 2.1 Treasury 必须持有足够的 GUA
用于支付“质疑成功奖励”：
- 每次质疑成功需要：`5,000 GUA`
- 建议 Treasury 至少预留：`>= 50,000 GUA`（支持 10 次质疑成功奖励）

### ✅ 2.2 Treasury 必须对 Escrow 合约设置 allowance
否则当 Admin 仲裁为 **deny** 时，交易会失败（revert）。

---

## 3. 授权策略建议（推荐）

### 推荐策略 A：一次性给大额度（省运维）
例如给 `TopicBountyEscrow` 授权 `1,000,000 GUA`（或更高）：
- 优点：不用频繁调整 allowance
- 风险：合约若出现漏洞，理论上能消耗授权额度（因此合约安全与权限管理更重要）

### 推荐策略 B：按需授权（更稳，但更麻烦）
每次预计发奖励前，授权一个“够用额度”（比如 `50,000 GUA`）。
- 优点：把单次风险控制在较小范围
- 缺点：需要运维频繁操作，影响自动化

> v0.1 的目标是快速跑通闭环，**建议先用策略 A**，后续 v0.2+ 再收紧。

---

## 4. 操作步骤：如何设置 allowance

### 4.1 通过区块浏览器 / 钱包界面（最简单）
许多钱包（例如 Rabby / MetaMask）或区块浏览器都有 “Token Approvals” 界面：
1. 选择 GUA Token
2. 找到 “Approve / 授权”
3. Spender 填：`TopicBountyEscrow` 合约地址
4. Amount 填：如 `1000000`（按你选择的策略）

---

### 4.2 通过命令行（适合自动化/脚本）

#### 用 cast（Foundry）
> 前提：你已经配置好 RPC 与 Treasury 私钥/硬件钱包签名方式

```bash
cast send <GUA_TOKEN_ADDRESS> \
  "approve(address,uint256)" \
  <ESCROW_CONTRACT_ADDRESS> \
  <ALLOWANCE_AMOUNT_IN_WEI> \
  --rpc-url <BASE_RPC_URL> \
  --private-key <TREASURY_PRIVATE_KEY>
```
注意：ERC20 的 amount 通常需要按 decimals=18 转成 wei。
例如 1,000,000 GUA = 1000000 * 10^18

查询当前 allowance
```bash
cast call <GUA_TOKEN_ADDRESS> \
  "allowance(address,address)(uint256)" \
  <TREASURY_ADDRESS> \
  <ESCROW_CONTRACT_ADDRESS> \
  --rpc-url <BASE_RPC_URL>
  ```

## 5. 运维检查清单（每期开投票前建议检查）

- **Treasury 余额是否足够**（>= 50,000 GUA 或你的目标）
- **Allowance 是否足够覆盖预期质疑成功次数**
  - `allowance >= 质疑成功次数预估 * 5,000 GUA`
- **Admin 地址是否正确**（避免错误仲裁）
- **Escrow 合约地址是否正确**（避免授权给错误地址）

---

## 6. 常见故障与排查

### 6.1 deny 仲裁交易失败（revert）

**最常见原因：** Treasury allowance 不足

**排查步骤：**
1. 查 allowance 是否足够：
   - `allowance(TREASURY, ESCROW)`
2. 查 Treasury 余额是否足够：
   - `balanceOf(TREASURY)`
3. 补授权 / 补余额后重试

### 6.2 Treasury 误授权给了错误地址

**处理方式：**
1. 立即把错误 spender 的 allowance 设置为 0：
   - `approve(wrongSpender, 0)`
2. 再对正确的 escrow 合约重新授权

---

## 7. 安全建议（v0.1 最低线）

- Treasury 建议使用 **多签（Safe）**
  - （即使 v0.1 先用单签，也建议尽快迁移）
- Escrow 合约必须：
  - 仅在 deny 路径调用：`transferFrom(TREASURY, challenger, 5000)`
  - 权限必须严格（`onlyAdmin` 仲裁）
- 对外公布的所有合约地址要固定在公告渠道，防钓鱼与假合约

---

## 8. v0.1 重要结论（一句话）

只要你希望“质疑成功奖励”能自动发放，就必须让 Treasury 提前给 Escrow 合约足够的 allowance。

---

## 9. 运维补充（交易追踪与暂停）

- 交易追踪：通过 BaseScan 查看交易哈希与合约地址（dApp 页面提供直达链接）
- 紧急暂停：Admin 可使用 Pause/Unpause 暂停关键路径，排查后恢复
```makefile
::contentReference[oaicite:0]{index=0}
```
