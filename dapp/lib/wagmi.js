import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, foundry } from 'viem/chains';
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  safeWallet,
  tokenPocketWallet,
  injectedWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';

import appConfig from '../config.json';

const chainById = {
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
  [foundry.id]: foundry,
};

// 获取配置的链ID列表
const chainIds = Object.keys(appConfig.chains || {}).map((id) => Number(id));

// 将 defaultChainId 排在第一位，确保 wagmi 使用它作为默认链
const defaultId = appConfig.defaultChainId;
const sortedChainIds = defaultId
  ? [defaultId, ...chainIds.filter((id) => id !== defaultId)]
  : chainIds;

const chains = sortedChainIds.map((id) => chainById[id]).filter(Boolean);

const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ||
  appConfig.walletConnect?.projectId ||
  '';

export const config = getDefaultConfig({
  appName: 'GUA dApp',
  projectId,
  chains,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        safeWallet,
        coinbaseWallet,
        tokenPocketWallet,
        ledgerWallet,
      ],
    },
    {
      groupName: 'Other',
      wallets: [
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
});
