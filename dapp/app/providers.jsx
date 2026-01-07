"use client";

import { useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider } from 'connectkit';

import { config } from '../lib/wagmi';
import { LanguageProvider } from './components/LanguageProvider';
import { AdminProvider } from './components/AdminProvider';

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="nouns" mode="light">
          <LanguageProvider>
            <AdminProvider>{children}</AdminProvider>
          </LanguageProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}