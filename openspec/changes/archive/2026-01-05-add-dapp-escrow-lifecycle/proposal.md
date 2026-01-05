# 变更：前端适配最新 Escrow 生命周期

## 为什么
合约状态机已补齐 finalizeDelivery / expireIfNoSubmission 等流程，前端未同步会导致用户无法完成交付、质疑与结算闭环。

## 变更内容
- 前端展示完整状态流转：Voting → VotingFinalized → Accepted → Submitted → Disputed/Completed/Denied/Expired
- 增加 finalizeDelivery 与 expireIfNoSubmission 的操作入口
- 严格按状态与时间窗口控制按钮可用性

## 影响范围
- 影响规格：dapp
- 影响代码：dapp/app（相关页面与组件）、dapp/lib（合约交互）