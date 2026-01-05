# dapp Specification

## Purpose
TBD - created by archiving change add-dapp-admin-voting. Update Purpose after archive.
## Requirements
### Requirement: 投票入口
系统 SHALL 提供投票入口，展示 Topic 列表并允许锁仓投票。

#### Scenario: 提交投票
- **WHEN** 用户输入投票数量并选择 Topic
- **THEN** dApp 调用 stakeVote 并反馈交易状态

### Requirement: 投票结束与确认获胜者
系统 SHALL 提供投票结束与确认获胜者支付 10% 的入口。

#### Scenario: 结束投票
- **WHEN** 投票窗口结束且用户触发 finalizeVoting
- **THEN** 系统显示获胜 Topic 与总锁仓

### Requirement: 管理员仲裁
系统 SHALL 提供管理员仲裁入口以处理争议结果。

#### Scenario: 争议裁决
- **WHEN** 管理员选择 approve 或 deny
- **THEN** dApp 调用 resolveDispute 并更新状态

### Requirement: 事件详情
系统 SHALL 展示投票与管理相关事件的详细参数。

#### Scenario: 查看事件参数
- **WHEN** 用户查看投票/管理事件
- **THEN** 展示关键参数（topicId、amount、winner、payout 等）

### Requirement: 双语界面
系统 SHALL 提供中文与英文界面，并默认使用中文。

#### Scenario: 默认语言
- **WHEN** 用户首次打开 dApp
- **THEN** 界面默认显示中文

### Requirement: 语言切换与记忆
系统 SHALL 允许用户切换语言并持久化选择。

#### Scenario: 切换并记忆
- **WHEN** 用户切换到英文
- **THEN** 该偏好在刷新后仍生效

### Requirement: 术语简化与解释
系统 SHALL 使用易懂文案替换专业术语，并在需要时提供解释。

#### Scenario: 显示解释
- **WHEN** 页面出现“质疑期/锁仓/质押”等术语
- **THEN** 用户可看到简短解释或提示

### Requirement: 状态与错误反馈
系统 SHALL 提供一致的状态、错误与空状态反馈。

#### Scenario: 空状态提示
- **WHEN** 数据为空或未加载
- **THEN** 页面显示明确的空状态说明与下一步指引

### Requirement: 易用性小功能
系统 SHALL 提供提升效率的小功能（如复制地址、友好时间格式、网络切换提示）。

#### Scenario: 一键复制
- **WHEN** 用户查看地址或交易哈希
- **THEN** 可一键复制并获得提示

### Requirement: 状态机展示
系统 SHALL 在前端展示完整的 Proposal 状态机与当前状态。

#### Scenario: 状态可见
- **WHEN** 用户打开 Proposal 详情
- **THEN** 页面显示当前状态与可执行操作

### Requirement: finalizeDelivery 操作入口
系统 SHALL 在满足条件时提供 finalizeDelivery 操作。

#### Scenario: 质疑期结束后结算
- **WHEN** Proposal 为 Submitted 且 challengeWindow 已结束且无争议
- **THEN** 用户可触发 finalizeDelivery 完成结算

### Requirement: expireIfNoSubmission 操作入口
系统 SHALL 在满足条件时提供 expireIfNoSubmission 操作。

#### Scenario: 超时未提交
- **WHEN** Proposal 为 Accepted 且已超过 submitDeadline 且未提交交付
- **THEN** 用户可触发 expireIfNoSubmission 进入过期结算

### Requirement: 操作按钮 gating
系统 SHALL 根据状态与时间窗口控制按钮可用性。

#### Scenario: 非法状态禁用操作
- **WHEN** Proposal 状态不满足操作条件
- **THEN** 对应按钮不可用或隐藏

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

