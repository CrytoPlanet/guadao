# 本地空投测试指南

本指南说明如何使用 Anvil + 静态 dApp 在本地完成空投领取测试。

## 准备工作

- Foundry（`forge` / `cast` / `anvil`）
- Node.js（用于生成 Merkle）
- MetaMask 浏览器扩展

## 1) 启动本地链

```bash
anvil
```

默认链 ID：`31337`  
默认私钥：
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## 2) 部署合约

```bash
$env:PRIVATE_KEY="0xac0974...f2ff80"
forge script script/Deploy.s.sol:Deploy --rpc-url http://127.0.0.1:8545 --broadcast
```

记下输出里的 `MerkleAirdrop` 地址。

## 3) 生成 proofs 并设置 root

```bash
node script/GenerateMerkleRoot.js --input script/SnapshotExample.csv --out-dir merkle
```

```bash
$root = (Get-Content merkle\root.json | ConvertFrom-Json).merkleRoot
cast send <AIR_DROP_ADDR> "setMerkleRoot(bytes32)" $root --rpc-url http://127.0.0.1:8545 --private-key 0xac0974...f2ff80
```

## 4) 准备 dApp 资源

```bash
mkdir dapp\merkle
copy merkle\proofs.json dapp\merkle\proofs.json
```

更新 `dapp/config.json`：

- `defaultChainId` 设为 `31337`
- `chains.31337.airdropAddress` 设为 `<AIR_DROP_ADDR>`

## 5) 启动 dApp

```bash
cd dapp
python -m http.server 4173
```

浏览器打开 `http://localhost:4173`。

## 6) MetaMask 配置

右上角星球图标的蓝色链接添加自定义网络，并在星球图标管理权限处只保留自定义网络权限：

- RPC URL：`http://127.0.0.1:8545`
- Chain ID：`31337`
- Currency symbol：`ETH`

导入 Anvil 默认私钥，并连接钱包。

## 7) 在 UI 中领取

1. 下拉选择 `Local Anvil (31337)`
2. 点击 “Auto-fill from proofs.json”
3. 点击 “Claim Tokens”

## 常见问题

### Network mismatch
确认 MetaMask 在 `Localhost 8545 (31337)`，且页面目标网络选 `Local Anvil (31337)`。

### Address not found in proofs
示例 `proofs.json` 中是 `0x000...001` 这类地址。  
可选方案：
- 把 Recipient 改成 `0x0000000000000000000000000000000000000001` 进行演示
- 在 `script/SnapshotExample.csv` 里换成你的地址，然后重新生成 `proofs.json`

### Connection header did not include upgrade
确认 RPC URL 使用 `http://127.0.0.1:8545`（不要用 `ws://...`）。
