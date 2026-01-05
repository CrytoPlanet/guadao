# Change: 接入 WalletConnect (ConnectKit) 支持扫码连接

## Why

当前最小 dApp 仅支持浏览器注入钱包（如 MetaMask 扩展），不支持移动端扫码连接。为提升可用性与覆盖面，需要接入 WalletConnect，并提供统一的连接体验。

## What Changes

- 引入 ConnectKit + wagmi/viem 作为连接层
- 支持移动端扫码连接（WalletConnect）
- 提供统一的连接按钮与网络提示
- 兼容 Base / Base Sepolia 网络配置

## Impact

- Affected specs: `wallet-connect`
- Affected code: `dapp/` 前端结构与连接逻辑
