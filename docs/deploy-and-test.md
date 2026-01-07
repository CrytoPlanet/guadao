# 部署与测试指南

本指南将指导您如何在本地网络 (Anvil) 和测试网 (Base Sepolia) 上部署和测试 GUA DAO 合约。

## 1. 环境准备

首先，确保您已安装 Foundry。如果未安装，请参考 `INSTALL.md`。

### 配置环境变量

为了安全起见，我们将敏感信息存储在 `.env` 文件中。

1. 复制示例配置文件：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件填入您的信息：
   - `PRIVATE_KEY`: **必填**。用于支付部署 Gas 费用的钱包私钥。**建议使用一个新的、仅存有少量 ETH 的临时钱包。**
   - `OWNER_ADDRESS`: **可选**（推荐）。合约的管理员地址，建议填入您的 Gnosis Safe 多签钱包地址。
   - `TREASURY_ADDRESS`: **可选**。金库地址，通常也是多签钱包地址。
   - `BASE_ETHERSCAN_API_KEY`: **可选**。用于在 BaseScan 上验证合约源码。

> **⚠️ 安全警告**：`.env` 文件已被加入 `.gitignore`，请确保不要将其提交到代码仓库中！

## 2. 自动化一键部署

我们提供了自动化脚本，可以一键完成合约部署并将新地址同步到前端配置中。

### Windows (PowerShell)

```powershell
# 部署到 Base Sepolia 测试网
.\script\deploy.ps1 -Network sepolia

# 部署到 Base 主网
.\script\deploy.ps1 -Network mainnet
```

### Linux / Mac

```bash
# 添加执行权限
chmod +x script/deploy.sh

# 部署到 Base Sepolia 测试网
./script/deploy.sh sepolia

# 部署到 Base 主网
./script/deploy.sh mainnet
```

脚本执行成功后，会自动：
1. 部署 GUAToken, MerkleAirdrop, TopicBountyEscrow 合约
2. 验证合约源码 (如果提供了 API Key)
3. 更新 `dapp/config.json` 中的合约地址

---

## 3. 手动部署步骤 (如果你不想用自动脚本)

### 本地 Anvil 测试

1. 启动 Anvil 节点：
   ```bash
   anvil --block-time 2
   ```

2. 部署合约：
   ```bash
   forge script script/Deploy.s.sol:Deploy --rpc-url http://localhost:8545 --broadcast
   ```

### 测试网部署 (Base Sepolia)

确保 `.env` 文件已配置正确，然后运行：

```bash
source .env
forge script script/Deploy.s.sol:Deploy --rpc-url https://sepolia.base.org --broadcast --verify
```

部署完成后，您需要手动将输出的合约地址更新到 `dapp/config.json` 文件中。

## 4. 运行测试

运行所有单元测试：

```bash
forge test
```

查看测试覆盖率：

```bash
forge coverage
```
