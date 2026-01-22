# oSnap (UMA) Setup Guide

本指南说明如何配置 Snapshot Space 以使用 oSnap 模块实现链上执行。

## 前置条件
1. Gnosis Safe 已创建 (Owner 为多签管理员) on Base。
2. `RealityModuleETH` 已部署 (通过 `DeployOSnap.s.sol`) 并在 Safe 中启用。
3. Snapshot Space 已创建。

## 步骤 1: Gnosis Safe 配置
1. 运行部署脚本获取 Module 地址：
   ```bash
   SAFE_ADDRESS=0x... UMA_ORACLE_ADDRESS=0x... forge script script/DeployOSnap.s.sol --rpc-url base --broadcast
   ```
2. 在 Gnosis Safe 界面 -> Apps -> Zodiac (或直接通过 Transaction Builder):
   - 添加模块 (Add Module): 输入上一步生成的 Module 地址。
   - 签名并执行交易。

## 步骤 2: Snapshot Space 配置
1. 进入 Snapshot Space 设置 -> **Plugins** (插件)。
2. 添加 **SafeSnap (Zodiac)** 插件。
3. 在插件配置中：
   - 添加 Safe: 输入 Base 网络的 Safe 地址。
   - Module Address: 输入部署的 RealityModule 地址。
   - Oracle: 选择 UMA (Optimistic Oracle)。
   - 确保 Oracle 地址与部署时一致。

## 步骤 3: 验证
1. 创建一个包含 "Transaction" 的 Snapshot 提案。
2. 投票通过。
3. 等待 Challenge Period (挑战期，默认 24h)。
4. 在 Snapshot 界面点击 "Request Execution" 或直接调用合约执行。
