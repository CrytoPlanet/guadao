Issue BC1 — Implement TopicBountyEscrow: data model + createProposal

Goal：实现 proposal/topic 数据结构与创建入口（onlyAdmin）。
Acceptance Criteria

✅ 支持 3–5 topics，每个 topic 绑定 owner 地址

✅ 存储 vote window：start/end

✅ 事件可用于前端渲染
Labels：contract voting core