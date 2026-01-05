# GUA Airdrop dApp (Next.js)

This dApp uses Next.js with wagmi + ConnectKit for wallet connections.

## Run locally

```bash
cd dapp
npm install
npm run dev
```

Open the URL shown in the Next.js output (default `http://localhost:3000`).

## Config

The app reads `dapp/config.json` at startup to auto-fill:

- `airdropAddress` per chain
- `proofsUrl` per chain
- `defaultChainId`
- `walletConnect.projectId`
- `chains[*].rpcUrl`

You can also provide `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` as an environment
variable to override the config value.

Update those values before deploying. For local testing, you can set the
Anvil chain (31337) address and RPC URL there as well.
