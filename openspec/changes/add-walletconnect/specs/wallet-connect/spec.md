## ADDED Requirements
### Requirement: WalletConnect 扫码连接
系统 SHALL 通过 ConnectKit 弹窗提供 WalletConnect v2 扫码连接能力。

#### Scenario: 手机扫码连接
- **WHEN** 用户在连接弹窗中选择 WalletConnect
- **THEN** 系统展示二维码并完成移动端连接

### Requirement: 统一连接弹窗
系统 SHALL 提供统一的钱包连接弹窗，包含注入钱包、Coinbase Wallet 与 WalletConnect 选项。

#### Scenario: 连接弹窗选项
- **WHEN** 用户点击连接按钮
- **THEN** 系统展示包含多钱包选项的 ConnectKit 弹窗

### Requirement: 网络不匹配提示
系统 SHALL 在用户连接到非目标网络时提示并引导切换到支持链。

#### Scenario: 目标网络不匹配
- **WHEN** 用户连接到不受支持的链
- **THEN** 系统提示切换到 Base 或 Base Sepolia

### Requirement: Project ID 配置
系统 SHALL 通过配置项注入 WalletConnect Project ID。

#### Scenario: 配置 Project ID
- **WHEN** 应用启动
- **THEN** WalletConnect Project ID 从配置加载