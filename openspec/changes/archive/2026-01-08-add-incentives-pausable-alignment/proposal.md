# 变更：补齐激励运维流程与可选暂停能力

## 为什么
文档中提到可选 Pausable 与按期激励发放，但当前实现缺少暂停能力与可操作的激励发布流程，导致规范与实际不一致。

## 变更内容
- Escrow 合约加入可选暂停能力（Pausable），用于紧急停用关键路径
- dApp 增加空投/激励运维入口：管理员可更新 Merkle root
- 文档补充“激励发放”的实际操作步骤与指引

## 影响范围
- 影响规格：escrow、dapp、docs
- 影响代码：contracts/TopicBountyEscrow.sol、dapp/app/airdrop、docs/*
