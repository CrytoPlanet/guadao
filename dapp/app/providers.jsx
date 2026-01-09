"use client";

import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit';

import { config } from '../lib/wagmi';
import { LanguageProvider, useI18n } from './components/LanguageProvider';
import { AdminProvider } from './components/AdminProvider';
import { ThemeProvider, useTheme } from './components/ThemeProvider';

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
    // Add custom overrides if needed, similar to previous guaPurpleTheme
    // For now using default RainbowKit themes with simple accent override for consistency
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

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <RainbowKitWrapper>
              <AdminProvider>{children}</AdminProvider>
            </RainbowKitWrapper>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}