# Project Context

## Purpose

GUA Token System 是「吃瓜群众自治社」旗下的 DAO 治理系统，旨在构建一个**可运行、可验证、可持续**的闭环系统：

- **发放（Airdrop）**：通过 Merkle Claim 机制让成员自助领取 GUA Token
- **使用（Voting / Staking）**：用 GUA 锁仓投票决定每期视频选题
- **兑现（Escrow → Reward）**：投票锁仓的币按条件自动发给 Topic Owner（创作者），采用 10% 订金 + 90% 交付后发放的模式
- **持续（Emission / Incentive）**：空投后，贡献者通过按期 Merkle 领取持续获得 GUA

系统部署在 **Base 链**上，当前版本为 **v0.1（冻结版）**，专注于跑通 MVP 闭环。

## Tech Stack

### 核心技术
- **Solidity**：智能合约开发语言（版本：0.8.28+，推荐 0.8.30）
- **Foundry**：开发、测试、部署框架（最新稳定版，v1.0+）
- **Base**：部署网络（Layer 2，Ethereum 兼容）

### 依赖库
- **OpenZeppelin Contracts**：标准合约库 v5.x（支持 Solidity 0.8.x，包含 ERC-20, ReentrancyGuard, Pausable 等）
- **Forge Std**：Foundry 标准库（随 Foundry 自动安装）

### 工具链
- **forge fmt**：代码格式化
- **forge test**：运行测试套件
- **forge script**：部署脚本
- **cast**：与链交互的工具

### 前端（待定）
- 前端 dApp 用于用户交互（领取、投票、提交交付、质疑）
- 具体技术栈待确定

## Project Conventions

### Code Style

#### Solidity 代码规范
- 使用 `forge fmt` 进行代码格式化（遵循 Solidity 官方风格指南）
- 命名约定：
  - 合约：PascalCase（如 `TopicBountyEscrow`）
  - 函数：camelCase（如 `stakeVote()`）
  - 变量：camelCase（如 `bountyPool`）
  - 常量：UPPER_SNAKE_CASE（如 `CHALLENGE_BOND`）
  - 事件：PascalCase（如 `VoteStaked`）
- 函数可见性：明确指定 `public`、`external`、`internal`、`private`
- 使用 NatSpec 注释：`///` 用于单行，`/** */` 用于多行
- 状态变量顺序：常量 → 状态变量 → 事件 → 函数

#### 文件组织
- 合约文件：`contracts/` 目录
- 测试文件：`test/` 目录，命名 `*.t.sol`
- 部署脚本：`script/` 目录，命名 `*.s.sol`
- 文档：`docs/` 目录

### Architecture Patterns

#### 合约设计原则
- **模块化**：核心功能分离到独立合约
  - `MerkleAirdrop.sol`：空投/贡献领取
  - `TopicBountyEscrow.sol`：投票 + 托管 + 发放
  - `Treasury.sol`（可选）：国库管理
- **状态机模式**：Proposal 生命周期通过明确的状态转换管理
- **访问控制**：使用 `onlyAdmin` 修饰符保护关键操作
- **重入保护**：所有涉及资金转移的函数使用 `ReentrancyGuard`
- **事件驱动**：关键操作发出事件，便于前端索引和监听

#### 安全模式
- **最小权限原则**：Admin 权限仅用于必要的运营操作
- **乐观验证**：交付证明采用 72h 质疑窗口，而非链上自动验证
- **不可变参数**：v0.1 关键参数（时间、比例、bond）应尽可能设为 immutable 常量

### Testing Strategy

#### 测试要求
- **覆盖率目标**：核心业务逻辑（投票、发放、质疑）必须 100% 覆盖
- **测试文件组织**：
  - `Airdrop.t.sol`：空投领取测试
  - `Voting.t.sol`：投票逻辑测试
  - `Delivery.t.sol`：交付提交测试
  - `Dispute.t.sol`：质疑与仲裁测试
  - `Expiry.t.sol`：超时处理测试
- **测试方法**：
  - 使用 Foundry 的 `forge test`
  - 使用 `forge-std/Test.sol` 作为测试基类
  - 使用 `vm` 作弊码进行时间、状态模拟
  - 测试用例命名：`test_<功能>_<场景>()`
- **测试数据**：
  - 使用固定测试地址和金额
  - 模拟真实场景（多用户投票、平票处理等）

#### 验证流程
- 本地测试：`forge test -vv`
- 格式化检查：`forge fmt --check`
- 部署前验证：在 Base Sepolia 测试网验证

### Git Workflow

#### 分支策略
- **主分支**：`main`（稳定版本）
- **开发分支**：`develop`（可选，用于集成）
- **功能分支**：`feature/<issue-number>-<description>`（从 Issues 认领任务）

#### 贡献流程
1. 在 Issues 认领任务（留言 "I'll take this"）
2. Fork 仓库 → 创建功能分支
3. 开发并提交代码
4. 提交 PR：说明做了什么、如何验证、测试结果/截图
5. Review 通过后合并

#### Commit 规范
- 使用清晰的中文或英文描述
- 格式建议：`<type>: <description>`
  - `feat:` 新功能
  - `fix:` 修复 bug
  - `docs:` 文档更新
  - `test:` 测试相关
  - `refactor:` 重构
  - `chore:` 构建/工具相关

#### PR 要求
- 必须包含测试结果
- 必须通过 `forge test` 和 `forge fmt`
- 说明变更内容和影响范围
- 如涉及规范变更，需更新 `docs/spec-v0.1.md` 或创建新版本

## Domain Context

### 核心概念
- **GUA Token**：Base 链上的 ERC-20 代币
- **Proposal（提案/一期）**：一次投票轮次，每期视频一次，包含 3–5 个 Topic
- **Topic（主题）**：候选主题，绑定一个 Topic Owner 地址
- **Topic Owner / Creator（创作者）**：若主题获胜，将收到赏金的绑定钱包地址
- **Bounty Pool（赏金池）**：本期所有投票锁仓 GUA 的总和，**不退回**
- **Delivery（交付）**：创作者提交的交付证明（YouTube 链接 + 置顶评论绑定钱包）
- **Challenge（质疑）**：在 72 小时质疑窗口内发起的争议，需押入质疑保证金（bond）

### 业务流程
1. **空投阶段**：发布 Merkle root → 用户自助 claim
2. **投票阶段**：创建 Proposal 和 Topics → 用户锁仓投票 → 确定 winner
3. **发放阶段**：Admin 确认 winner → 支付 10% 订金 → 创作者 14 天内提交交付 → 72h 无质疑后支付 90%
4. **质疑机制**：72h 内可发起质疑（需 bond）→ Admin 仲裁 → 根据结果分配资金
5. **持续激励**：按期发布新的 Merkle root → 贡献者自助 claim

### 关键参数（v0.1 冻结）
- `submitDeadline`：14 天
- `challengeWindow`：72 小时
- `payoutSplit`：10% / 90%
- `challengeBond`：10,000 GUA
- `challengeReward`：5,000 GUA

## Important Constraints

### 技术约束
- **网络限制**：必须部署在 Base 链（L2，gas 成本较低）
- **版本冻结**：v0.1 规范已冻结，任何变更需升级到 v0.2+
- **不可退款**：投票锁仓的 GUA **不退回**，无论结果如何
- **Admin 仲裁**：v0.1 争议由 Admin 仲裁，非完全去信任化（v0.2+ 可能升级）

### 业务约束
- **一期一投票**：每期视频对应一次投票轮次
- **交付期限**：创作者必须在 14 天内提交交付
- **质疑窗口**：交付提交后 72 小时内可质疑
- **Treasury 运维**：Treasury 必须提前给合约设置 allowance（用于质疑成功奖励）

### 安全约束
- **重入保护**：所有资金转移函数必须使用 ReentrancyGuard
- **状态机检查**：严格的状态转换验证，防止非法状态
- **权限控制**：Admin 操作必须使用 `onlyAdmin` 修饰符
- **事件记录**：关键操作必须发出事件，便于审计和前端索引

### 合规约束
- **反诈骗提示**：项目不承诺任何金融收益，不构成投资建议
- **公开透明**：交付证明采用公开的置顶评论机制
- **社区验证**：72h 质疑窗口允许社区参与验证

## External Dependencies

### 链上依赖
- **GUA Token 合约**：ERC-20 代币合约地址（需部署后配置）
- **Treasury 地址**：国库地址，用于接收罚没资金和支付质疑奖励
- **Admin 地址**：管理员地址（建议未来升级为 Safe 多签）

### 链下依赖
- **Merkle Root 生成**：需要链下脚本生成 Merkle tree 和 root（Node.js 或 Python）
- **YouTube 平台**：交付证明依赖 YouTube 置顶评论（v0.1 不依赖 API，仅公开验证）
- **前端 dApp**：用户交互界面（待开发）

### 开发依赖
- **Foundry**：必须安装 Foundry 工具链
- **OpenZeppelin Contracts**：通过 `forge install` 安装
- **Forge Std**：通过 `forge install` 安装

### 运维依赖
- **Base RPC**：需要 Base 主网和测试网的 RPC 端点
- **部署工具**：使用 Foundry 的 `forge script` 进行部署
- **监控工具**：建议使用区块浏览器（BaseScan）监控合约状态
