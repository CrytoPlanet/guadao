# Testing Governance Locally

This guide explains how to deploy the Governor contract and test the "Governance Proposals" tab in the dApp using a local Anvil chain.

## 1. Start Local Chain
Open a terminal and run Anvil:
```bash
anvil
```
Keep this terminal open.

## 2. Setup Environment
Ensure your `.env` file has the following (using Anvil default account #0):
```ini
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=http://localhost:8545
```

## 3. Deploy Base Contracts (Token & Escrow)
If you haven't deployed the core contracts yet (or want a fresh start):
```bash
forge script script/Deploy.s.sol:Deploy --rpc-url http://localhost:8545 --broadcast
```
**Take note of the `GUAToken` address** from the output (e.g., `0x...`).

## 4. Deploy Governor
Run the Governor deployment script. Replace `<TOKEN_ADDRESS>` with the address from Step 3.
You can use any address for `<SAFE_ADDRESS>` (e.g., Anvil Account #1: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`).

```bash
export GUA_TOKEN_ADDRESS=<TOKEN_ADDRESS>
export SAFE_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8

forge script script/DeployGovernor.s.sol:DeployGovernor --rpc-url http://localhost:8545 --broadcast
```

**Take note of the `GUAGovernor` address** from the output.

## 5. Update dApp Config
Open `dapp/config.json` and update the `Local Anvil` section (Chain ID 31337):
1.  Update `guaTokenAddress` (from Step 3).
2.  Update `governorAddress` (from Step 4).

## 6. Delegate Votes (Important!)
To create a proposal, the proposer must have voting power. Delegate tokens to yourself:
```bash
cast send $GUA_TOKEN_ADDRESS "delegate(address)" 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --private-key $PRIVATE_KEY --rpc-url http://localhost:8545
```
*(Address `0xf39...` is Anvil Account #0)*

## 7. Create a Test Proposal
We created a helper script `script/CreateProposal.s.sol`.
Run it to create a proposal:

```bash
export GOVERNOR_ADDRESS=<GOVERNOR_ADDRESS_FROM_STEP_4>

forge script script/CreateProposal.s.sol:CreateProposal --rpc-url http://localhost:8545 --broadcast
```

## 8. Verify in UI
1.  Ensure dApp is running (`npm run dev`).
2.  Switch your wallet (MetaMask/Rabby) to **Localhost 8545**.
3.  Go to the "DAO Governance" page (`/proposals`).
4.  Click the **"Governance Proposals" (协议治理提案)** tab.
5.  You should see your new proposal listed as "Pending" or "Active" (depending on block height).
