"use client";

import { useState, useEffect } from 'react';
import { usePrivyWagmi } from '@privy-io/wagmi';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProvider } from '@privy-io/react-auth';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'viem/chains';

import { getConfig } from '../lib/wagmi';
import { LanguageProvider, useI18n } from './components/LanguageProvider';
import { AdminProvider } from './components/AdminProvider';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { useMemo } from 'react';
import { injected } from 'wagmi/connectors';
import { useConnect, useDisconnect, useAccount } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';

/**
 * Syncs Privy wallet with Wagmi
 */
function WalletSync() {
  const { isConnected, connector } = useAccount();
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { connect, status } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    const syncWallet = async () => {
      if (ready && authenticated && !isConnected && wallets.length > 0 && status !== 'pending') {
        const privyWallet = wallets.find((w) => w.walletClientType === 'privy') || wallets[0];
        console.log('WalletSync: Syncing Privy wallet to Wagmi...', privyWallet.address);
        try {
          const provider = await privyWallet.getEthereumProvider();
          await connect({ connector: injected({ target: { provider, id: 'privy', name: 'Privy Wallet' } }) });
        } catch (e) {
          console.error('WalletSync: Sync failed', e);
        }
      }
      if (ready && !authenticated && isConnected && connector?.id === 'privy') {
        console.log('WalletSync: Privy logged out, disconnecting Wagmi...');
        disconnect();
      }
    };
    syncWallet();
  }, [ready, authenticated, isConnected, wallets, connect, status, disconnect]);

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

function WagmiWrapper({ children, mounted }) {
  const { lang } = useI18n();
  const config = useMemo(() => getConfig(lang), [lang]);

  return (
    <WagmiProvider config={config}>
      <ThemeProvider>
        <RainbowKitWrapper>
          <WalletSync />
          <AdminProvider>{children}</AdminProvider>
        </RainbowKitWrapper>
      </ThemeProvider>
    </WagmiProvider>
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
          <LanguageProvider>
            <WagmiWrapper mounted={mounted}>
              {children}
            </WagmiWrapper>
          </LanguageProvider>
        )}
      </QueryClientProvider>
    </PrivyProvider>
  );
}
