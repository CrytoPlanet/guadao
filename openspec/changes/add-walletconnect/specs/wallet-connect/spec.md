## ADDED Requirements
### Requirement: WalletConnect 支持
系统 SHALL 支持通过 WalletConnect 扫码连接移动端钱包。

#### Scenario: 手机扫码连接
- **WHEN** 用户选择 WalletConnect
- **THEN** 系统展示二维码并完成连接

### Requirement: 统一连接体验
系统 SHALL 提供统一的连接按钮，兼容浏览器钱包与扫码连接。

#### Scenario: 连接按钮
- **WHEN** 用户点击连接按钮
- **THEN** 系统提供可选的钱包连接方式

### Requirement: 网络提示
系统 SHALL 在网络不匹配时给出提示并引导切换。

#### Scenario: 网络不匹配
- **WHEN** 用户连接到错误网络
- **THEN** 系统提示切换到支持网络

### Requirement: 配置化 Project ID
系统 SHALL 通过配置项注入 WalletConnect Project ID。

#### Scenario: 配置 Project ID
- **WHEN** 项目启动
- **THEN** WalletConnect Project ID 从配置加载
