# Change: Add Snapshot Governance

## Why

项目需要一个轻量级的社区投票机制，让 GUA 持有者可以在不消耗 Gas 的情况下参与社区决策。Snapshot 是目前最成熟的链下投票解决方案，适合用于意见收集、功能投票等非正式决策场景。

## What Changes

- 创建 Snapshot Space 配置，绑定 GUA Token
- 添加 Zodiac Reality Module 到 Gnosis Safe（可选，用于自动执行）
- 在 dApp 中添加 Snapshot 入口链接
- 添加相关文档说明

## Impact

- Affected specs: 新增 `snapshot-governance` 规范
- Affected code: 
  - `dapp/app/components/Header.jsx` - 添加导航链接
  - `dapp/config.json` - 添加 Snapshot Space 配置
  - 文档更新

## 关键决策

1. **投票策略**: 使用 `erc20-balance-of` 策略，1 GUA = 1 票
2. **提案门槛**: 持有 100 GUA 可创建提案
3. **投票时长**: 默认 7 天
4. **Quorum**: 暂不设置，初期观察

## 依赖

- Snapshot.org 账号配置
- GUA Token 合约地址
- Gnosis Safe 地址（用于 Zodiac Reality，可选）
