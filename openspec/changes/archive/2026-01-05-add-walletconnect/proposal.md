# Change: 接入 WalletConnect (Next.js + wagmi + ConnectKit)

## Why

当前 dApp 仅支持浏览器注入钱包，无法覆盖移动端扫码连接。参考 nouns-webapp 的连接架构（wagmi + ConnectKit + WalletConnect v2），并使用 Next.js 提供更规范的前端工程结构与部署方式，提升连接体验与可维护性。

## What Changes

- 使用 Next.js 重构 dapp 前端（App Router）
- 引入 wagmi + ConnectKit + viem 作为连接层与 UI 统一入口
- 连接器组合对齐 nouns-webapp：injected + walletConnect + coinbaseWallet
- WalletConnect v2 使用 `projectId` 配置，并由 ConnectKit 弹窗展示二维码
- 提供自定义连接按钮（ConnectKitButton.Custom），未连接/已连接状态一致化
- 兼容 Base / Base Sepolia 网络配置与 RPC fallback，网络不匹配时提示并引导切换
- 使用环境变量注入配置（如 `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`）

## Impact

- Affected specs: `wallet-connect`
- Affected code: `dapp/` 前端结构、连接逻辑、Next.js 配置与依赖