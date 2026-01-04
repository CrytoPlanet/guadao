# Change: 基础 dApp (参照 Nouns 的最小交互) + 空投领取

## Why

当前项目已有合约与脚本，但缺少最基础的用户入口。参照 Nouns dApp 的最小可用形态，先提供：连接钱包、查看基础信息、领取空投。这样可以让普通用户完成“从进入到领取”的完整闭环。

## What Changes

- 新增最小 dApp 功能集合（只包含基础页面与必要交互）
- 支持 Merkle 空投领取（proof 查找或手动输入）
- 明确网络与账户状态提示，避免误操作

## Impact

- Affected specs: `dapp-basic`, `airdrop-claim-ui`
- Affected code: 前端 dApp（目录待确定）
