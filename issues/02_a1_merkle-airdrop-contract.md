Issue A1 — Add MerkleAirdrop contract (claim + replay protection)

Goal：实现 MerkleAirdrop.sol，支持 Merkle proof 领取，防重复领取。
Scope

setMerkleRoot(bytes32 root) (onlyAdmin)

claim(address to, uint256 amount, bytes32[] calldata proof)

claimed[address] 或 claimedBitmap 防重复

事件 MerkleRootUpdated / Claimed
Acceptance Criteria

✅ 同一地址重复 claim 必须 revert

✅ proof 错误 revert

✅ root 更新后可领取新一轮（可选：按 epoch）

✅ Foundry tests 覆盖：success / double-claim / wrong-proof / wrong-amount
Labels：contract airdrop core
Status

- Completed
- Epoch-based re-claim support added in contracts/MerkleAirdrop.sol
- Tests updated in test/MerkleAirdrop.t.sol
- forge test: 25 passed
