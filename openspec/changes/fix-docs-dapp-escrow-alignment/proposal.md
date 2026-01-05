# 变更：修复文档乱码并对齐 dApp/合约实现

## 为什么
当前 README 与 docs 存在明显乱码，影响阅读；部分文档指引（本地测试）已过时；dApp 交付证明缺少模板/nonce/哈希提示；合约未满足文档中的重入保护要求。

## 变更内容
- 统一 README 与 docs 编码为 UTF-8，消除乱码
- 更新本地空投测试文档为 Next.js 启动方式
- dApp 交付页面补齐模板、nonce 生成与哈希提示
- Escrow 合约加入 ReentrancyGuard，并保护付款/结算路径

## 影响范围
- 影响规格：docs、dapp、escrow
- 影响代码：README、docs、dapp/app/escrow、contracts/TopicBountyEscrow.sol、相关测试
