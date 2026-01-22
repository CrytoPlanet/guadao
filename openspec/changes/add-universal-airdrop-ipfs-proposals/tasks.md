## 1. 合约开发
- [x] 1.1 创建 `UniversalAirdrop.sol` 合约
  - 可配置领取数量
  - 防重复领取 mapping
  - Admin 可设置总供应上限
- [x] 1.2 修改 `TopicBountyEscrow.sol`
  - 移除 `onlyOwner` 限制于 `createProposal`
  - 添加创作者押金机制
  - 添加 `bytes32 contentCid` 到 Topic struct
- [x] 1.3 编写合约单元测试

## 2. IPFS 集成
- [x] 2.1 创建 `dapp/lib/ipfs.ts` Pinata 集成
  - 上传 JSON 内容
  - 获取 CID
  - 计算 CID 哈希
- [x] 2.2 配置 Pinata API keys（环境变量）

## 3. 前端开发
- [x] 3.1 创建 UniversalAirdrop 领取页面
- [x] 3.2 修改 CreateProposal 页面
  - 移除 Admin 权限检查
  - 集成 IPFS 上传
  - 显示预估 Gas
  - 处理押金
- [x] 3.3 更新提案详情页读取 IPFS 内容

## 4. 验证
- [x] 4.1 运行 `forge test` 通过所有测试
- [x] 4.2 本地 Anvil 端到端测试
- [x] 4.3 Base Sepolia 测试网验证
