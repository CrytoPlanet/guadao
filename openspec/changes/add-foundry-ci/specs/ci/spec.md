## ADDED Requirements
### Requirement: Foundry CI 工作流
系统 SHALL 在每次 push 与 pull request 时运行 forge build、forge test、forge fmt --check。

#### Scenario: PR 校验
- **WHEN** 提交或更新 PR
- **THEN** CI 运行构建、测试与格式检查

### Requirement: CI 缓存
系统 SHALL 缓存 Foundry 与依赖产物以降低 CI 耗时。

#### Scenario: 缓存复用
- **WHEN** CI 触发且依赖未变化
- **THEN** 工作流在执行 forge 命令前恢复缓存