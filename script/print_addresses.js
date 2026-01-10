const fs = require('fs');
const path = 'broadcast/Deploy.s.sol/31337/run-latest.json';
if (!fs.existsSync(path)) {
    console.error('File not found:', path);
    process.exit(1);
}
const run = JSON.parse(fs.readFileSync(path, 'utf8'));
const txs = run.transactions.filter(tx => tx.transactionType === 'CREATE');

console.log('GUAToken:' + txs[1].contractAddress);
console.log('MerkleAirdrop:' + txs[3].contractAddress);
console.log('TopicBountyEscrow:' + txs[5].contractAddress);
