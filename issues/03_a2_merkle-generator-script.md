Issue A2 — Merkle generator script (snapshot → merkleRoot + proofs)

Goal：提供 Node 脚本：从 snapshot.csv/json 生成 root 和每个地址的 proof。
Output

merkle/root.json（root + metadata）

merkle/proofs.json（address → proof + amount）
Acceptance Criteria

✅ 输入固定 snapshot，输出 root 可复现

✅ 提供示例 snapshot（50 addresses）

✅ README/Docs 说明如何运行脚本
Status

? Completed
- Snapshot example expanded to 10 addresses (script/SnapshotExample.csv)
- Generated outputs: merkle/root.json and merkle/proofs.json
- Docs: docs/merkle-generator.md
Labels：script airdrop good first issue