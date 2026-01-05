## ADDED Requirements
### Requirement: Proposal/Topic 数据结构
系统 SHALL 支持创建包含 3–5 个 Topic 的 Proposal，并为每个 Topic 绑定 owner 地址与投票窗口。

#### Scenario: 创建 Proposal
- **WHEN** Admin 调用 createProposal
- **THEN** 系统持久化 Proposal 与 Topics，并记录投票 start/end

### Requirement: Proposal 事件
系统 SHALL 在创建 Proposal 时触发事件，供前端索引与渲染。

#### Scenario: 事件触发
- **WHEN** Admin 成功创建 Proposal
- **THEN** 系统发出包含 proposalId 与 topicIds 的事件