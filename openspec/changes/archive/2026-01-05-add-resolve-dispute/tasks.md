## 1. Implementation
- [x] 1.1 增加 resolveDispute（onlyAdmin）
- [x] 1.2 approve：remaining90 -> winner.owner，bond -> treasury
- [x] 1.3 deny：remaining90 -> treasury，bond -> challenger，treasury 额外转 5,000 GUA 给 challenger
- [x] 1.4 allowance 不足时 revert，并明确运维要求
- [x] 1.5 事件与测试覆盖 approve/deny
