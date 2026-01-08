# 变更：新增 Foundry CI 工作流

## 为什么
需要在每次 push 和 pull request 时自动构建、测试并检查格式，避免回归。

## 变更内容
- 新增 GitHub Actions 工作流，执行 forge build、forge test、forge fmt --check。
- 增加 Foundry 工具链与依赖缓存以加速 CI。

## 影响范围
- 影响规格：ci
- 影响代码：.github/workflows/foundry.yml