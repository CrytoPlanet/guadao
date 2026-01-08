## ADDED Requirements
### Requirement: 激励 Merkle root 管理入口
dApp SHALL 提供管理员入口以更新 Airdrop/Merkle root，支持按期激励发放。

#### Scenario: 管理员更新 root
- **WHEN** 管理员输入 Merkle root 并提交
- **THEN** 前端调用合约更新 root 并显示交易状态
