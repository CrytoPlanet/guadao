# 部署与测试指南

本指南用于本地、测试网、主网的部署与基础测试流程。

## 0) 前置条件

- Foundry（`forge` / `cast` / `anvil`）
- Node.js（用于 Merkle 生成）
- 钱包私钥（测试网/主网部署）

## 1) 本地部署与测试（Anvil）

启动本地链：

```bash
anvil
```

使用默认私钥部署（PowerShell）：

```powershell
$env:PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast
```

使用默认私钥部署（Git Bash）：

```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast
```

可选参数（覆盖默认 owner/treasury）。管理员权限来自 Owner 地址，部署时确定：

```powershell
$env:OWNER_ADDRESS="0x..."
$env:TREASURY_ADDRESS="0x..."
```

```bash
export OWNER_ADDRESS=0x...
export TREASURY_ADDRESS=0x...
```

部署完成后，从 `broadcast/Deploy.s.sol/**/run-latest.json` 读取地址：
- `GUAToken`
- `MerkleAirdrop`
- `TopicBountyEscrow`

### 设置 Merkle root（本地）

```powershell
node script/GenerateMerkleRoot.js --input script/SnapshotExample.csv --out-dir merkle
$root = (Get-Content merkle\root.json | ConvertFrom-Json).merkleRoot
cast send <AIR_DROP_ADDR> "setMerkleRoot(bytes32)" $root --rpc-url http://127.0.0.1:8545 --private-key $env:PRIVATE_KEY
```

```bash
node script/GenerateMerkleRoot.js --input script/SnapshotExample.csv --out-dir merkle
root=$(node -e "console.log(JSON.parse(require('fs').readFileSync('merkle/root.json')).merkleRoot)")
cast send <AIR_DROP_ADDR> "setMerkleRoot(bytes32)" "$root" --rpc-url http://127.0.0.1:8545 --private-key "$PRIVATE_KEY"
```

上面 `<AIR_DROP_ADDR>` 需要替换成实际的 MerkleAirdrop 合约地址（可从 `broadcast/Deploy.s.sol/.../run-latest.json` 读取）。例如：

```bash
cast send 0x123... "setMerkleRoot(bytes32)" "$root" ...
```

### 本地 dApp 启动

更新 `dapp/config.json` 的 `31337` 配置（地址与 proofsUrl），然后：

```powershell
cd dapp
npm install
npm run dev
```

可参考：`docs/airdrop-local-test.md`。

## 2) 测试网部署与测试（Base Sepolia）

```powershell
$env:PRIVATE_KEY="0x..."
$env:OWNER_ADDRESS="0x..."     # 可选
$env:TREASURY_ADDRESS="0x..."  # 可选
forge script script/Deploy.s.sol:Deploy --rpc-url https://sepolia.base.org --broadcast
```

```bash
export PRIVATE_KEY=0x...
export OWNER_ADDRESS=0x...     # 可选
export TREASURY_ADDRESS=0x...  # 可选
forge script script/Deploy.s.sol:Deploy --rpc-url https://sepolia.base.org --broadcast
```

如果需要验证合约：

```powershell
$env:ETHERSCAN_API_KEY="your_key"
forge script script/Deploy.s.sol:Deploy --rpc-url https://sepolia.base.org --broadcast --verify --etherscan-api-key $env:ETHERSCAN_API_KEY
```

```bash
export ETHERSCAN_API_KEY=your_key
forge script script/Deploy.s.sol:Deploy --rpc-url https://sepolia.base.org --broadcast --verify --etherscan-api-key "$ETHERSCAN_API_KEY"
```

### 测试网测试

- 更新 `dapp/config.json` 的测试网地址与 RPC。
- 用小额账户走一遍 Airdrop/Voting/Escrow 主流程。
- 用 BaseScan 验证交易哈希与合约地址跳转。
- 建议先完成本地全功能测试，再进行测试网验证。

## 3) 主网部署与测试（Base Mainnet）

```powershell
$env:PRIVATE_KEY="0x..."
$env:OWNER_ADDRESS="0x..."     # 可选
$env:TREASURY_ADDRESS="0x..."  # 可选
forge script script/Deploy.s.sol:Deploy --rpc-url https://mainnet.base.org --broadcast
```

```bash
export PRIVATE_KEY=0x...
export OWNER_ADDRESS=0x...     # 可选
export TREASURY_ADDRESS=0x...  # 可选
forge script script/Deploy.s.sol:Deploy --rpc-url https://mainnet.base.org --broadcast
```

### 主网测试说明

- 主网不建议做功能测试，仅建议部署后做只读验证（查询状态/事件）。
- 若必须进行交易验证，请使用最小金额与严格的风控流程。
- 推荐先在本地与测试网完成全流程验证。

## 4) 测试与格式化

```bash
forge fmt
forge test -vv
```

## 5) dApp 手动冒烟测试

- Airdrop：加载 proofs → Claim
- Voting：Approve → Vote
- Escrow：提交交付 → 挑战（可选）→ 结算

详细步骤见：`docs/airdrop-local-test.md` 与 OpenSpec 变更中的验证清单。

## 6) 本地全功能测试方案（使用预置账户）

以下步骤以本地 Anvil 为基准，覆盖空投管理、投票、交付、质疑、暂停等功能。

### 6.1 账户分配（Anvil 预置）

角色分配（管理员在部署时确定为 Owner）：
- 管理员 / Owner / Treasury：Account 0（默认部署者）
- Topic Owner A：Account 1
- Topic Owner B：Account 2
- Topic Owner C：Account 3
- 投票者 / 质疑者：Account 4

预置账户（Anvil 默认）：
- Account 0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  - Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Account 1: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  - Private key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- Account 2: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
  - Private key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
- Account 3: `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
  - Private key: `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6`
- Account 4: `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`
  - Private key: `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a`

### 6.2 准备数据与配置

1) 按“本地部署”完成三份合约部署并设置 Merkle root。  
2) 更新 `dapp/config.json` 的 `31337` 地址（airdrop/escrow/guaToken）。  
3) 启动 dApp 并连接 MetaMask（Localhost 8545 / 31337）。  
4) 全流程测试使用以上预置账户，避免使用真实钱包地址。  

### 6.3 空投管理（管理员：Account 0）

目标：验证管理员入口与 Merkle root 更新流程。

1) 使用 Account 0 连接钱包。  
2) 进入 `Airdrop` 页面，切到“高级模式”。  
3) 在“当前 Root”可见已设置的 root。  
4) 输入新的 root 并点击更新，确认交易成功提示。  

### 6.4 空投领取（用户：Account 4）

1) 使用 Account 4 连接钱包。  
2) 点击“加载 proofs”。  
3) 点击“Auto-fill from proofs.json”。  
4) 点击“Claim Tokens”，确认交易成功提示。  

### 6.5 创建提案（管理员：Account 0）

目标：创建投票提案并用于后续投票流程。

1) 使用 Account 0 连接钱包，进入 `Admin` 页面。  
2) 填写 3 个 Topic Owner 地址：Account 1/2/3。  
3) 填写 `startTime/endTime`。建议参考当前时间戳：  
  - PowerShell: `(Get-Date -UFormat %s) + 60`  
  - Git Bash: `$(date +%s)`  
 例如 `startTime=$(date +%s)`、`endTime=$(($(date +%s)+86400))`，先运行 `date` 计算秒数再粘贴到表单。  
4) 点击创建，记录 `proposalId`。  

### 6.6 投票流程（投票者：Account 4）

1) 使用 Account 4 连接钱包，进入 `Voting` 页面。  
2) 输入 `proposalId`，选择 Topic 0（对应 Account 1）。  
3) 输入投票数量，先 `Approve` 再 `Vote`。  
4) 确认交易成功提示。  

### 6.7 结束投票与确认赢家（管理员：Account 0）

1) 快进时间结束投票窗口：

```bash
cast rpc evm_increaseTime 172800 --rpc-url http://127.0.0.1:8545
cast rpc evm_mine --rpc-url http://127.0.0.1:8545
```

2) 使用 Account 0 在 `Admin` 页面执行 `Finalize Voting`。  
3) 执行 `Confirm Winner`，确认 10% 已支付。  

### 6.8 交付与哈希提示（创作者：Account 1）

1) 使用 Account 1 连接钱包，进入 `Escrow` 页面。  
2) 输入 `proposalId`。  
3) 生成 nonce 并套用模板。  
4) 填写 YouTube URL、Video ID、Pinned Comment，确认哈希提示可见。  
5) 提交交付并确认成功。  

### 6.9 质疑与仲裁（质疑者：Account 4 / 管理员：Account 0）

1) 使用 Account 4 进入 `Escrow`（高级模式），先 `Approve bond`。  
2) 提交质疑并确认成功。  
3) 使用 Account 0 在 `Admin` 页面执行 `Resolve`（Approve/Deny）并确认结果。  

### 6.10 结算路径与过期路径

结算路径（无质疑）：
1) 快进至挑战窗口结束。  
2) 在 `Escrow` 执行 `Finalize Delivery`。  

过期路径（单独新提案）：
1) 重新创建一个提案并确认赢家。  
2) 不提交交付，快进至提交截止后执行 `Expire`。  

### 6.11 暂停/恢复（管理员：Account 0）

1) 在 `Admin` 页面执行 Pause。  
2) 在 `Voting/Escrow` 发起交易，应提示暂停不可执行。  
3) 执行 Unpause，功能恢复。  

### 6.12 状态提示与列表页

1) 在 `Proposals` 页加载列表，验证空态/加载态/错误态提示。  
2) 在 `Proposals/<id>` 详情页加载事件列表，验证事件显示正常。  

### 6.13 Merkle 空投专项测试

目标：验证 Merkle root 轮换与领取规则。
1) 使用 Account 0 生成新的 `SnapshotExample.csv`（包含 Account 4 地址与额度）。  
2) 运行 `GenerateMerkleRoot.js`，在 `Airdrop` 高级模式更新 root。  
3) 使用 Account 4 执行一次 Claim，确认成功。  
4) 再次用 Account 4 领取同一轮 root，应提示已领取/失败。  
5) 再生成一份新的 root（epoch +1），再次更新 root。  
6) 使用 Account 4 再次 Claim，应允许领取（新 epoch）。  
