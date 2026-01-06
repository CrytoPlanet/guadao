/**
 * 从 Foundry 部署产物自动提取合约地址并更新 config.json
 * 
 * 用法：
 *   node scripts/update-config.js [chainId]
 * 
 * 示例：
 *   node scripts/update-config.js 31337
 */

const fs = require('fs');
const path = require('path');

const CHAIN_ID = process.argv[2] || '31337';
const BROADCAST_PATH = path.resolve(__dirname, '../../broadcast/Deploy.s.sol', CHAIN_ID, 'run-latest.json');
const CONFIG_PATH = path.resolve(__dirname, '../config.json');

// 合约名称到配置键的映射
const CONTRACT_MAP = {
    'GUAToken': 'guaTokenAddress',
    'MerkleAirdrop': 'airdropAddress',
    'TopicBountyEscrow': 'escrowAddress',
};

function main() {
    console.log(`Reading deployment from: ${BROADCAST_PATH}`);

    if (!fs.existsSync(BROADCAST_PATH)) {
        console.error(`Error: Deployment file not found: ${BROADCAST_PATH}`);
        console.log('Make sure you have run the deployment script first:');
        console.log('  forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast');
        process.exit(1);
    }

    const broadcast = JSON.parse(fs.readFileSync(BROADCAST_PATH, 'utf8'));
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

    // 从 transactions 中提取合约地址
    const transactions = broadcast.transactions || [];
    const deployed = {};

    for (const tx of transactions) {
        if (tx.transactionType === 'CREATE' && tx.contractName) {
            const configKey = CONTRACT_MAP[tx.contractName];
            if (configKey) {
                deployed[configKey] = tx.contractAddress;
                console.log(`Found ${tx.contractName}: ${tx.contractAddress}`);
            }
        }
    }

    if (Object.keys(deployed).length === 0) {
        console.error('No known contracts found in deployment.');
        process.exit(1);
    }

    // 更新 config
    if (!config.chains[CHAIN_ID]) {
        console.error(`Chain ${CHAIN_ID} not found in config.json`);
        process.exit(1);
    }

    for (const [key, address] of Object.entries(deployed)) {
        config.chains[CHAIN_ID][key] = address;
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
    console.log(`Updated config.json for chain ${CHAIN_ID}`);
}

main();
