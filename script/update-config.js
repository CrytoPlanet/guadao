#!/usr/bin/env node
/**
 * 部署后配置自动同步脚本
 * 用法: node script/update-config.js [chainId]
 * 示例: node script/update-config.js 84532
 * 如果不提供 chainId，尝试从 broadcast 目录自动检测最近的部署
 */

const fs = require('fs');
const path = require('path');

const DAPP_CONFIG_PATH = path.join(__dirname, '..', 'dapp', 'config.json');
const README_PATH = path.join(__dirname, '..', 'README.md');
const BROADCAST_DIR = path.join(__dirname, '..', 'broadcast', 'Deploy.s.sol');

function main() {
    let chainId = process.argv[2];

    if (!chainId) {
        // 尝试推断
        console.log('未指定 chainId，尝试自动检测...');
        if (fs.existsSync(BROADCAST_DIR)) {
            const dirs = fs.readdirSync(BROADCAST_DIR).filter(d => /^\d+$/.test(d));
            // 找修改时间最近的目录？或者直接拿最后一个
            // 简单起见，优先找 84532, 8453, 31337
            if (dirs.includes('84532')) chainId = '84532';
            else if (dirs.includes('8453')) chainId = '8453';
            else if (dirs.includes('31337')) chainId = '31337';
            else if (dirs.length > 0) chainId = dirs[dirs.length - 1];
        }
    }

    if (!chainId) {
        console.error('❌ 错误: 未指定且无法自动检测到 chainId');
        printUsage();
        process.exit(1);
    }

    const runLatestPath = path.join(BROADCAST_DIR, chainId, 'run-latest.json');
    if (!fs.existsSync(runLatestPath)) {
        console.error(`❌ 错误: 找不到广播日志文件: ${runLatestPath}`);
        console.error('请先运行部署脚本: forge script script/Deploy.s.sol ... --broadcast');
        process.exit(1);
    }

    console.log(`📄 读取部署日志: ${runLatestPath}`);
    const runData = JSON.parse(fs.readFileSync(runLatestPath, 'utf-8'));

    // 提取 CREATE 类型的交易
    const creations = runData.transactions.filter(tx => tx.transactionType === 'CREATE');

    /**
     * 根据 Deploy.s.sol 的部署顺序:
     * 1. GUAToken Impl
     * 2. GUAToken Proxy      <-- Index 1
     * 3. MerkleAirdrop Impl
     * 4. MerkleAirdrop Proxy <-- Index 3
     * 5. TopicBountyEscrow Impl
     * 6. TopicBountyEscrow Proxy <-- Index 5
     */

    if (creations.length < 6) {
        console.error(`❌ 错误: 部署日志中 CREATE 交易数量不足 (期待至少 6 个，实际 ${creations.length} 个)`);
        console.log('请检查 Deploy.s.sol 是否有变更。');
        process.exit(1);
    }

    const guaTokenAddress = creations[1].contractAddress;
    const airdropAddress = creations[3].contractAddress;
    const escrowAddress = creations[5].contractAddress;

    // Extract Owner and Treasury from TopicBountyEscrow initialization usage
    // Tx 5 Arg 1 is the data: 0x + Selector(4bytes) + GuaToken(32bytes) + Owner(32bytes) + Treasury(32bytes)
    const escrowInitData = creations[5].arguments[1];

    // Helper to extract address from 32-byte padded hex at specific index (0-based param index)
    const getParamAddress = (data, index) => {
        // 0x + 8 chars (selector) + index * 64 chars
        const start = 2 + 8 + index * 64;
        // Address is last 40 chars of the 64-char block
        return '0x' + data.slice(start + 24, start + 64);
    };

    const ownerAddress = getParamAddress(escrowInitData, 1); // 2nd param
    const treasuryAddress = getParamAddress(escrowInitData, 2); // 3rd param

    // Extract startBlock (block number of the first creation - GUAToken)
    // The previous attempt used creations[0].blockNumber which might be null in 'transactions'.
    // Typically in run-latest.json, blockNumber for deployment is in 'receipts'.
    // Or we can look at `receipts` array if it exists at root level.

    let startBlock = 0;
    if (runData.receipts && runData.receipts.length > 0) {
        // receipts is an array corresponding to transactions? 
        // usually receipts is keyed by tx hash or is a list. 
        // Forge broadcast structure: 
        // "receipts": [ { "transactionHash": "...", "blockNumber": "0x..." } ]
        // Let's try to find the receipt for the first creation transaction.
        const firstTxHash = creations[0].hash;
        const receipt = runData.receipts.find(r => r.transactionHash === firstTxHash);
        if (receipt && receipt.blockNumber) {
            startBlock = parseInt(receipt.blockNumber, 16);
        }
    } else {
        // Fallback: sometimes transactions have blockNumber if included
        if (creations[0].blockNumber) {
            startBlock = parseInt(creations[0].blockNumber, 16);
        }
    }

    if (!startBlock || isNaN(startBlock)) {
        console.warn('⚠️ 警告: 无法从日志中提取 StartBlock，配置中将不包含 startBlock');
        startBlock = 0; // Skip
    }

    console.log(`🔍 提取部署信息:`);
    console.log(`   - GUAToken:     ${guaTokenAddress}`);
    console.log(`   - MerkleAirdrop: ${airdropAddress}`);
    console.log(`   - Escrow:       ${escrowAddress}`);
    console.log(`   - Owner:        ${ownerAddress}`);
    console.log(`   - Treasury:     ${treasuryAddress}`);
    console.log(`   - StartBlock:   ${startBlock || 'Not Found'}`);

    // 更新 dapp/config.json
    updateDappConfig(chainId, guaTokenAddress, airdropAddress, escrowAddress, startBlock);

    // 更新 README.md
    updateReadme(chainId, guaTokenAddress, airdropAddress, escrowAddress, ownerAddress, treasuryAddress);
}

function updateDappConfig(chainId, guaToken, airdrop, escrow, startBlock) {
    try {
        const config = JSON.parse(fs.readFileSync(DAPP_CONFIG_PATH, 'utf-8'));

        if (!config.chains[chainId]) {
            console.warn(`⚠️ 警告: config.json 中未预定义 chainId ${chainId}，将跳过更新 config.json`);
            return;
        }

        config.chains[chainId].guaTokenAddress = guaToken;
        config.chains[chainId].airdropAddress = airdrop;
        config.chains[chainId].escrowAddress = escrow;
        if (startBlock) {
            config.chains[chainId].startBlock = startBlock;
        }

        fs.writeFileSync(DAPP_CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
        console.log(`✅ 已更新 dapp/config.json`);
    } catch (error) {
        console.error('❌ 更新 config.json 失败:', error.message);
    }
}

function updateReadme(chainId, guaToken, airdrop, escrow, owner, treasury) {
    try {
        let content = fs.readFileSync(README_PATH, 'utf-8');

        // 简单的正则替换，寻找 ## 合约与地址（Base） 区域
        // 我们假设用户主要部署到 Base Sepolia 或 Base Mainnet，这里做个通用的替换
        // 或者我们可以寻找特定的标记。
        // 原文:
        // - GUA Token: `0x...`
        // - MerkleAirdrop (Claim): `0x...`
        // - TopicBountyEscrow (Vote+Payout): `0x...`

        // 构造新的部分
        const networkName = chainId === '8453' ? 'Base Mainnet' : (chainId === '84532' ? 'Base Sepolia' : 'Local Anvil');
        const explorerUrl = chainId === '8453' ? 'https://basescan.org' : (chainId === '84532' ? 'https://sepolia.basescan.org' : '');

        const replaceLine = (prefix, address) => {
            // 匹配 `0x...` 或者 `0x123...` (带或不带反引号)
            // 优先匹配带反引号的
            const regex = new RegExp(`(- ${prefix}: )\`0x[a-fA-F0-9.]+\``);
            if (regex.test(content)) {
                content = content.replace(regex, `$1\`${address}\``);
            } else {
                // 尝试不带反引号的或者 ... 的
                const regex2 = new RegExp(`(- ${prefix}: )\`?0x[^\n]+\`?`);
                if (regex2.test(content)) {
                    content = content.replace(regex2, `$1\`${address}\``);
                }
            }
        };

        replaceLine('GUA Token', guaToken);
        replaceLine('MerkleAirdrop \\(Claim\\)', airdrop);
        replaceLine('TopicBountyEscrow \\(Vote\\+Payout\\)', escrow);

        // Update Treasury and Admin which uses specific pattern in README
        replaceLine('Treasury', treasury);
        // Admin line usually includes comment like (建议未来升级为 Safe 多签), regex handles it as it matches until newline or `
        // But our regex `0x[^\n]+` might eat the comment if not careful.
        // The regex `\`?0x[^\n]+\`?` matches the address part. 
        // In README: `- Admin: `0x...`（建议...）`
        // We want to replace just the `0x...` part.
        // Our regex `\`0x[a-fA-F0-9.]+\`` matches exactly the code block. Perfect.
        replaceLine('Admin', owner);

        // 更新 Network 名称（如果有）
        if (chainId === '84532' || chainId === '8453') {
            content = content.replace(/- Network: \*\*.*\*\*/, `- Network: **${networkName}**`);
        }

        // 添加一个更新时间戳注释，方便确认
        const notice = `<!-- Latest Verification: ${new Date().toISOString().split('T')[0]} (Chain ${chainId}) -->`;
        if (content.includes('<!-- Latest Verification:')) {
            content = content.replace(/<!-- Latest Verification: .* -->/, notice);
        } else {
            // 插在合约章节标题下面
            content = content.replace(/(## 合约与地址.*)/, `$1\n${notice}`);
        }

        fs.writeFileSync(README_PATH, content);
        console.log(`✅ 已更新 README.md`);
    } catch (error) {
        console.error('❌ 更新 README.md 失败:', error.message);
    }
}

function printUsage() {
    console.log(`
用法:
  node script/update-config.js [chainId]

支持的 Chain ID:
  84532 (Base Sepolia)
  8453  (Base Mainnet)
  31337 (Local)
`);
}

main();
