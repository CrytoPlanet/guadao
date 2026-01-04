Issue BC5 — submitDelivery(): creator submits proof (YouTube + pinnedCodeHash)

Goal：winner.owner 提交交付证明，开启 72h 质疑期。
Acceptance Criteria

✅ only winner.owner

✅ 记录 challengeWindowEnd = now + 72 hours

✅ 存 videoIdHash/youtubeUrlHash + pinnedCodeHash

✅ 状态进入 SUBMITTED
Labels：contract escrow core