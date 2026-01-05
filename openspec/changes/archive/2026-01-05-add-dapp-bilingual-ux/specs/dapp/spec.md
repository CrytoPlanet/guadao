## ADDED Requirements
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