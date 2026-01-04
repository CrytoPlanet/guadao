# Merkle 生成器脚本（Node.js）

用于从快照文件生成 Merkle root 与每个地址的 proof，规则与链上校验保持一致。

## 安装

在 `script/` 目录安装依赖：

```bash
cd script
npm install
```

## 使用

```bash
node script/GenerateMerkleRoot.js --input script/SnapshotExample.csv --out-dir merkle
```

输出目录默认是 `merkle/`，会生成：

- `merkle/root.json`
- `merkle/proofs.json`

## 输入格式

### CSV

```csv
address,amount
0x1111111111111111111111111111111111111111,100
0x2222222222222222222222222222222222222222,200
```

### JSON

支持以下任一格式：

```json
[
  {"address":"0x1111111111111111111111111111111111111111","amount":"100"},
  ["0x2222222222222222222222222222222222222222","200"]
]
```

```json
{
  "0x1111111111111111111111111111111111111111": "100",
  "0x2222222222222222222222222222222222222222": "200"
}
```

金额建议使用字符串，避免 JS number 精度问题。

## 规则说明

- Leaf 哈希：`keccak256(abi.encodePacked(address, amount))`
- 叶子排序：按字节序升序排序
- Pair 哈希：每层配对先按字节序排序后再哈希
- 奇数节点：最后一个节点自复制后参与哈希（duplicate odd）

## 输出格式

`root.json` 示例：

```json
{
  "merkleRoot": "0x...",
  "totalEntries": 5,
  "leafHash": "keccak256(abi.encodePacked(address, amount))",
  "sortLeaves": true,
  "sortPairs": true,
  "duplicateOdd": true,
  "inputFile": "script/SnapshotExample.csv",
  "generatedAt": "2026-01-05T00:00:00.000Z"
}
```

`proofs.json` 示例：

```json
{
  "merkleRoot": "0x...",
  "proofs": {
    "0x1111111111111111111111111111111111111111": {
      "amount": "100",
      "proof": ["0x...", "0x..."]
    }
  }
}
```

## 可复现性检查（基础 Fixture）

用同一份快照运行两次，输出的 `root.json` 与 `proofs.json` 应完全一致：

```bash
node script/GenerateMerkleRoot.js --input script/SnapshotExample.csv --out-dir merkle
node script/GenerateMerkleRoot.js --input script/SnapshotExample.csv --out-dir merkle_repeat
```
