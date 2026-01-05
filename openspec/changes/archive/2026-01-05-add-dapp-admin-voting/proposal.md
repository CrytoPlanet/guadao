# 变更：dApp 补齐投票与管理功能对接

## 为什么
当前 dApp 已提供空投、提案列表与交付结算，但仍缺少投票/锁仓、投票结束、确认获胜者、管理员仲裁等关键功能入口，导致闭环无法在前端完成。

## 变更内容
- 增加投票入口（stakeVote），展示 Topic 列表与锁仓金额
- 增加投票结束入口（finalizeVoting）与获胜者确认支付 10%（confirmWinnerAndPay10）
- 增加管理员仲裁入口（resolveDispute approve/deny）
- 增加投票与管理相关事件详情展示

## 影响范围
- 影响规格：dapp
- 影响代码：dapp/app（投票与管理页面/组件）、dapp/lib（合约交互与事件读取）