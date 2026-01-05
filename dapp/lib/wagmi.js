import { createConfig, http } from 'wagmi';
import { base, baseSepolia, foundry } from 'viem/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

import appConfig from '../config.json';

const chainById = {
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
  [foundry.id]: foundry,
};

const chainIds = Object.keys(appConfig.chains || {}).map((id) => Number(id));
const chains = chainIds.map((id) => chainById[id]).filter(Boolean);

const transports = chains.reduce((map, chain) => {
  const rpcUrl = appConfig.chains?.[String(chain.id)]?.rpcUrl;
  const fallback = chain.rpcUrls?.default?.http?.[0];
  map[chain.id] = http(rpcUrl || fallback);
  return map;
}, {});

const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ||
  appConfig.walletConnect?.projectId ||
  '';

const connectors = [
  injected(),
  ...(projectId
    ? [
        walletConnect({
          projectId,
          showQrModal: false,
        }),
      ]
    : []),
  coinbaseWallet({
    appName: 'GUA Airdrop Claim',
  }),
];

export const config = createConfig({
  chains,
  transports,
  connectors,
});
