# Change: 增加 Merkle 生成器脚本

## Why
空投流程需要一个可复现的链下工具，用于生成与链上校验规则一致的 Merkle root 和 proof。

## What Changes
- 增加一个 CLI 脚本，从分配清单生成 Merkle root 和 proof。
- 规定输入/输出格式以及与 MerkleAirdrop 兼容的哈希规则。
- 定义输入校验规则，避免产生歧义 proof。

## Impact
- Affected specs: merkle-generator
- Affected code: script/（新增 CLI），docs/（使用说明）
