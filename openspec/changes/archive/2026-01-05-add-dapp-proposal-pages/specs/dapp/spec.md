## ADDED Requirements
### Requirement: 页面拆分与导航
系统 SHALL 将单页拆分为独立路由，并提供清晰导航。

#### Scenario: 多页面访问
- **WHEN** 用户访问 dApp
- **THEN** 可通过导航进入 Airdrop、Proposal 列表/详情与 Escrow 页面

### Requirement: Proposal 详情页
系统 SHALL 提供 Proposal 详情页展示状态机与关键字段。

#### Scenario: 详情展示
- **WHEN** 用户打开某 Proposal
- **THEN** 显示状态、时间窗口、获胜者、剩余金额等信息

### Requirement: 事件面板
系统 SHALL 提供链上事件面板，展示投票、交付、质疑、结算与过期事件。

#### Scenario: 事件可视化
- **WHEN** 用户查看 Proposal 详情
- **THEN** 页面展示相关事件列表与时间顺序