# Airdrop 领取指南 (Merkle Claim)

这是一份面向普通用户的领取说明，帮助你理解什么是 Merkle airdrop，如何找到自己的 proof，并完成领取。

## 什么是 Merkle airdrop (简版)

项目方会把领取名单整理成一份快照 (地址 + 数量)，再生成一棵 Merkle Tree。链上只保存 Merkle root，用户用自己的 proof 就可以证明自己在名单里并领取。

好处是：不需要项目方逐个转账，gas 成本更低。

## 你需要准备什么

- 你的钱包地址
- 对应的领取数量 (amount)
- 对应的 Merkle proof (从 proofs.json 或 API 获取)

> [!IMPORTANT]
> 领取空投不需要你的私钥或助记词。任何要求你提供私钥/助记词的行为都是诈骗。

## 如何找到自己的 proof

最常见的方式是查看 `merkle/proofs.json`。

示例结构:

```json
{
  "merkleRoot": "0x...",
  "proofs": {
    "0x1111111111111111111111111111111111111111": {
      "amount": "100",
      "proof": ["0xabc...", "0xdef..."]
    }
  }
}
```

找到与你钱包地址完全匹配的一项，记下:

- `amount`
- `proof` 数组

如果未来提供了 API，逻辑相同: 用地址查询，返回 amount + proof。

## 领取方式 1: 使用 dApp (推荐)

1. 打开 dApp，并连接你的钱包
2. 页面会自动查询你的领取资格 (或提示你粘贴 proof)
3. 确认领取数量和目标地址 (通常就是你的钱包地址)
4. 点击 Claim 并在钱包中签名发送交易
5. 交易确认后，代币会到账

## 领取方式 2: 直接调用合约

适合开发者或高级用户。你需要调用合约的 `claim` 方法:

```
claim(address to, uint256 amount, bytes32[] proof)
```

示例 (Foundry cast):

```bash
cast send <MERKLE_AIRDROP_ADDRESS> \
  "claim(address,uint256,bytes32[])" \
  <YOUR_ADDRESS> \
  <AMOUNT> \
  '[ "0xabc...", "0xdef..." ]' \
  --private-key <YOUR_PRIVATE_KEY>
```

说明:
- `<MERKLE_AIRDROP_ADDRESS>`: 空投合约地址
- `<YOUR_ADDRESS>`: 你的地址 (通常与钱包一致)
- `<AMOUNT>`: proofs.json 里的 amount
- `proof` 数组必须与 proofs.json 完全一致

> [!NOTE]
> 直接调用合约时，你需要本地钱包签名，因此会用到私钥。但私钥只在本地使用，绝不要发送给他人。

## 常见问题

### 为什么我找不到自己的地址?
- 可能不在本轮快照中
- 请确认地址大小写完全一致

### 为什么交易失败?
- proof 错误
- amount 错误
- 已经领取过
- 合约 root 已更新，但你用了旧的 proof
