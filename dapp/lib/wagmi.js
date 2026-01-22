import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, foundry } from 'viem/chains';
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  coinbaseWallet,
  safeWallet,
  tokenPocketWallet,
  injectedWallet,
  rabbyWallet,
  oneKeyWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { toPrivyWallet } from '@privy-io/cross-app-connect/rainbow-kit';

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

export const getConfig = (lang) => {
  const isZh = lang === 'zh';
  return getDefaultConfig({
    appName: 'GUA dApp',
    projectId,
    chains,
    wallets: [
      {
        groupName: isZh ? '推荐钱包' : 'Recommended',
        wallets: [
          metaMaskWallet,
          coinbaseWallet,
          rabbyWallet,
          oneKeyWallet,
          rainbowWallet,
          tokenPocketWallet,
          (options) => safeWallet({ ...options, allowedDomains: [/gnosis-safe\.io$/, /safe\.global$/, /.*/] }),
        ],
      },
      {
        groupName: isZh ? '社交登录' : 'Social Login',
        wallets: [
          toPrivyWallet({
            id: process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cm61a9k1d02o7y52s89x5g73w',
            name: 'Privy',
            iconUrl: 'https://docs.privy.io/privy-logo-dark.png',
          }),
        ],
      },
      {
        groupName: isZh ? '硬件及其他' : 'Hardware & Other',
        wallets: [
          walletConnectWallet, // Trezor 用户可通过 WalletConnect 连接
          injectedWallet,
        ],
      },
    ],
  });
};
