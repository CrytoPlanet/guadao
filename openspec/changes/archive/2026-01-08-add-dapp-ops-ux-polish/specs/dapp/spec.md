## ADDED Requirements
### Requirement: 可追踪与可观测体验
dApp SHALL 提供交易哈希、合约地址与区块浏览器链接，并展示链 ID、RPC 状态与区块时间。

#### Scenario: 交易追踪
- **WHEN** 用户提交交易并完成
- **THEN** 页面展示可点击的区块浏览器链接

#### Scenario: 环境可观测
- **WHEN** 用户打开任意页面
- **THEN** 页面显示链 ID、RPC 状态与区块时间

### Requirement: 运维控制入口
dApp SHALL 提供管理员 Pause/Unpause 操作入口。

#### Scenario: 暂停与恢复
- **WHEN** 管理员触发 Pause 或 Unpause
- **THEN** 页面提示当前暂停状态
