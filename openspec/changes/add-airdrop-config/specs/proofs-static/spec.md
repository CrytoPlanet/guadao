## ADDED Requirements
### Requirement: 静态 proofs.json 查询
系统 SHALL 支持从静态 `proofs.json` 自动查询当前地址的 proof 与 amount。

#### Scenario: 自动匹配地址
- **WHEN** 用户连接钱包
- **THEN** 系统自动查询并填充 proof 与 amount

### Requirement: 错误处理
系统 SHALL 在 proofs.json 不可用或地址无资格时给出提示。

#### Scenario: 无资格
- **WHEN** 地址不在 proofs.json
- **THEN** 系统提示“无领取资格”
