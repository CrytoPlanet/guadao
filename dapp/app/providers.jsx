"use client";

import { useState, useEffect } from 'react';
import { WagmiProvider, usePrivyWagmi } from '@privy-io/wagmi';
import { useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'viem/chains';

import { config } from '../lib/wagmi';
import { LanguageProvider, useI18n } from './components/LanguageProvider';
import { AdminProvider } from './components/AdminProvider';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { reconnect } from '@wagmi/core';

/**
 * Syncs Privy wallet with Wagmi
 */
function WalletSync() {
  const { isConnected } = useAccount();
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { setActiveWallet } = usePrivyWagmi();

  useEffect(() => {
    // Force sync if authenticated but not connected in Wagmi
    if (ready && authenticated && !isConnected && wallets.length > 0) {
      // Find the embedded wallet (type 'privy') or default to first
      const privyWallet = wallets.find((w) => w.walletClientType === 'privy');
      const targetWallet = privyWallet || wallets[0];

      console.log('WalletSync: Syncing Privy wallet to Wagmi', targetWallet);
      setActiveWallet(targetWallet);
    }
  }, [ready, authenticated, isConnected, wallets, setActiveWallet]);

  return null;
}

/**
 * GUA Themes
 */
const customTheme = (baseTheme) => ({
  ...baseTheme({
    accentColor: '#ffa500', // Warning: will be overridden below
    borderRadius: 'large',
    fontStack: 'system',
    overlayBlur: 'small',
  }),
  colors: {
    ...baseTheme().colors,
  },
  fonts: {
    body: '"Sora", "Trebuchet MS", sans-serif',
  },
});

function RainbowKitWrapper({ children }) {
  const { lang } = useI18n();
  const { theme, mounted } = useTheme();

  // Use light theme on server and until mounted to prevent hydration mismatch
  const rkTheme = mounted && theme === 'dark' ? darkTheme() : lightTheme({
    accentColor: '#8b5cf6', // Violet for light
    borderRadius: 'large',
  });

  return (
    <RainbowKitProvider
      theme={rkTheme}
      locale={lang === 'zh' ? 'zh-CN' : 'en'}
      modalSize="wide"
      showRecentTransactions={true}
      coolMode
    >
      {children}
    </RainbowKitProvider>
  );
}

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient());

  // Privy App ID - 替换为你自己的 App ID
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cm61a9k1d02o7y52s89x5g73w';

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
          logo: 'https://guadao.xyz/icon.svg',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        {mounted && (
          <WagmiProvider config={config}>
            <RainbowKitProvider
              chains={config.chains}
              theme={{
                light: lightTheme(),
                dark: darkTheme(),
              }}
            >
              <WalletSync />
              {children}
            </RainbowKitProvider>
          </WagmiProvider>
        )}
      </QueryClientProvider>
    </PrivyProvider>
  );
}