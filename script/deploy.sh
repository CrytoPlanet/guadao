#!/bin/bash
# 一键部署脚本 - 部署合约并自动更新前端配置
# 用法: ./script/deploy.sh <network>
# 示例: ./script/deploy.sh sepolia

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 网络配置
case "$1" in
    "local"|"anvil")
        CHAIN_ID=31337
        RPC_URL="http://localhost:8545"
        VERIFY_FLAG=""
        echo -e "${YELLOW}🔧 部署到本地 Anvil...${NC}"
        ;;
    "sepolia"|"base-sepolia")
        CHAIN_ID=84532
        RPC_URL="https://sepolia.base.org"
        VERIFY_FLAG="--verify"
        echo -e "${YELLOW}🔧 部署到 Base Sepolia 测试网...${NC}"
        ;;
    "mainnet"|"base")
        CHAIN_ID=8453
        RPC_URL="https://mainnet.base.org"
        VERIFY_FLAG="--verify"
        echo -e "${RED}⚠️  警告: 即将部署到 Base 主网!${NC}"
        read -p "确认继续? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "已取消"
            exit 1
        fi
        ;;
    *)
        echo "用法: ./script/deploy.sh <network>"
        echo "可用网络:"
        echo "  local / anvil      - 本地 Anvil 节点"
        echo "  sepolia            - Base Sepolia 测试网"
        echo "  mainnet / base     - Base 主网"
        exit 1
        ;;
esac

# 检查环境变量
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}错误: 请设置 PRIVATE_KEY 环境变量${NC}"
    exit 1
fi

# 执行部署
echo -e "${YELLOW}📦 开始部署合约...${NC}"
OUTPUT=$(forge script script/Deploy.s.sol:Deploy \
    --rpc-url "$RPC_URL" \
    --broadcast \
    $VERIFY_FLAG \
    2>&1)

echo "$OUTPUT"

# 从输出中提取地址
GUA_TOKEN=$(echo "$OUTPUT" | grep "GUAToken Proxy deployed at:" | awk '{print $NF}')
AIRDROP=$(echo "$OUTPUT" | grep "MerkleAirdrop Proxy deployed at:" | awk '{print $NF}')
ESCROW=$(echo "$OUTPUT" | grep "TopicBountyEscrow Proxy deployed at:" | awk '{print $NF}')

if [ -z "$GUA_TOKEN" ] || [ -z "$AIRDROP" ] || [ -z "$ESCROW" ]; then
    echo -e "${RED}无法从部署输出中提取合约地址${NC}"
    echo "请手动更新 dapp/config.json"
    exit 1
fi

# 更新前端配置
echo -e "${YELLOW}📝 更新前端配置...${NC}"
node script/update-config.js "$CHAIN_ID" "$GUA_TOKEN" "$AIRDROP" "$ESCROW"

echo -e "${GREEN}✅ 部署完成!${NC}"
echo ""
echo "下一步:"
echo "  1. git add dapp/config.json"
echo "  2. git commit -m 'chore: update contract addresses for chainId $CHAIN_ID'"
echo "  3. git push origin main"
echo "  4. Vercel 将自动部署更新后的前端"
