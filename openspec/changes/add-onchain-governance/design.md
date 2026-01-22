# Design: On-chain Governance

## Context

GUA DAO 需要正式的链上治理机制，用于协议级决策。当前使用 Gnosis Safe 多签进行管理操作，但缺乏社区参与的投票流程。

### Stakeholders
- GUA Token 持有者（投票者）
- Safe 多签持有人（当前管理员）
- 智能合约系统

## Goals / Non-Goals

### Goals
- ✅ 实现代币持有者投票决策
- ✅ 添加时间锁保护重要操作
- ✅ 提供专业的投票界面 (Tally)
- ✅ 保持与现有系统兼容

### Non-Goals
- ❌ 不替换现有的 TopicBountyEscrow 投票逻辑
- ❌ 不改变现有业务流程

## Architecture

```
                     ┌─────────────────────────────┐
                     │         Tally.xyz           │
                     │     (Governance UI)         │
                     └──────────────┬──────────────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │        GUAGovernor          │
                     │   (OpenZeppelin Governor)   │
                     │  - propose()                │
                     │  - castVote()               │
                     │  - execute()                │
                     └──────────────┬──────────────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │     TimelockController      │
                     │  - 2 days delay             │
                     │  - queue/execute            │
                     └──────────────┬──────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│   GUAToken    │          │TopicBountyEsc │          │  Gnosis Safe  │
│ +ERC20Votes   │          │   row         │          │  (Treasury)   │
└───────────────┘          └───────────────┘          └───────────────┘
```

## Decisions

### Decision 1: GUAToken 升级方案
**选择**: 使用 UUPS 代理升级，添加 ERC20VotesUpgradeable

**原因**:
- GUAToken 已经是 UUPS 可升级合约
- 可以无缝添加 Votes 功能
- 不影响现有的 Token 余额和功能

**替代方案**:
- 部署新 Token 并迁移 - 太复杂，用户体验差
- Wrapper Token - 增加复杂度

### Decision 2: Governor 参数配置
| 参数 | 值 | 原因 |
|------|-----|----|
| Voting Delay | 1 day | 给社区准备时间 |
| Voting Period | 7 days | 足够的参与时间 |
| Proposal Threshold | 100 GUA | 防止垃圾提案 |
| Quorum | 10% | 用户指定 |
| Timelock Delay | 2 days | 安全缓冲 |

### Decision 3: 权限配置
**Timelock Roles**:
- `PROPOSER_ROLE`: Governor 合约
- `EXECUTOR_ROLE`: Governor 合约 或 任何人 (`address(0)`)
- `CANCELLER_ROLE`: Gnosis Safe (紧急取消) ← **已确认需要**
- `ADMIN_ROLE`: Gnosis Safe (初始配置后移除)

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 用户不理解 delegate | 添加 dApp 引导，首次连接时提示 delegate |
| 治理攻击 | 时间锁 + Quorum 保护 |
| 投票率低 | 初期可选使用，逐步过渡 |

## Migration Plan

1. **阶段 1**: 本地测试
   - 在 Anvil 本地测试 Token 升级
   - 测试 Governor 全流程

2. **阶段 2**: Base Sepolia 测试
   - 部署 Governor + Timelock
   - 升级 GUAToken
   - 创建测试提案

3. **阶段 3**: Base Mainnet 部署
   - 使用 Safe 执行所有部署/升级
   - 注册 Tally

4. **阶段 4**: 权限移交
   - 将 TopicBountyEscrow.owner 移交给 Timelock

## Open Questions

~1. 是否需要 Guardian 角色可以取消提案？~ **已确认：需要**
~2. Quorum 设置多少合适？~ **已确认：10%**
~3. 是否先在测试网验证一段时间再上主网？~ **已确认：是**
