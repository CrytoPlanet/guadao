# Change: 新增空投领取指南文档

## Why

当前项目已有 Merkle 空投合约与生成脚本，但缺少面向普通用户的领取说明，容易导致误解（如需要私钥/助记词）或无法找到 proof。需要一篇结构清晰、可直接操作的指南文档。

## What Changes

- 新增 `docs/airdrop.md`，按「简述概念 → 找 proof → dApp 领取 → 常见问题」的结构说明空投领取流程
- 文档表达风格参考 `nouns-monorepo-master` 中的 docs：简短段落、清晰标题、提示/注意事项区块、示例代码块

## Impact

- Affected specs: `airdrop-docs`（新增文档能力）
- Affected code: `docs/airdrop.md`
