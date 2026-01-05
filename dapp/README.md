# GUA Airdrop dApp (Static)

This is a static HTML/JS dApp. No build step required.

## Run locally

```bash
cd dapp
python -m http.server 4173
```

Open `http://localhost:4173`.

## Config

The app reads `dapp/config.json` at startup to auto-fill:

- `airdropAddress` per chain
- `proofsUrl` per chain
- `defaultChainId`

Update those values before deploying. For local testing, you can set the
Anvil chain (31337) address there as well.
