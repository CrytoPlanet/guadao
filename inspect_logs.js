const fs = require('fs');
const path = require('path');
const runLatestPath = path.join('broadcast', 'Deploy.s.sol', '84532', 'run-latest.json');
const data = JSON.parse(fs.readFileSync(runLatestPath, 'utf8'));

data.transactions.forEach((tx, i) => {
    if (tx.transactionType === 'CREATE') {
        console.log(`Tx ${i} (CREATE): arguments length = ${tx.arguments ? tx.arguments.length : 'undefined'}`);
        if (tx.arguments) {
            console.log(`Arg 0: ${tx.arguments[0]}`);
            // Print start of Arg 1 if it exists (it's likely the long data)
            if (tx.arguments[1]) console.log(`Arg 1 (slice): ${tx.arguments[1].slice(0, 100)}...`);
        }
    }
});
