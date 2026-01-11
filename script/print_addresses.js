const fs = require('fs');
const path = 'broadcast/RedeployLocal.s.sol/31337/run-latest.json';
if (!fs.existsSync(path)) {
    console.error('File not found:', path);
    process.exit(1);
}
const run = JSON.parse(fs.readFileSync(path, 'utf8'));
const txs = run.transactions.filter(tx => tx.transactionType === 'CREATE');

// Order in RedeployLocal:
// 0: Token Impl
// 1: Token Proxy
// 2: Timelock
// 3: Governor
// 4: Escrow Impl
// 5: Escrow Proxy

if (txs.length < 6) {
    console.log("Not enough txs found. Found:", txs.length);
    txs.forEach((tx, i) => console.log(i, tx.contractName, tx.contractAddress));
} else {
    const output = {
        token: txs[1].contractAddress,
        timelock: txs[2].contractAddress,
        governor: txs[3].contractAddress,
        escrow: txs[5].contractAddress
    };
    console.log(JSON.stringify(output));
}
