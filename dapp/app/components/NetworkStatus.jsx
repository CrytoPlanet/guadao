"use client";

import { useEffect, useState } from 'react';
import { useChainId, usePublicClient } from 'wagmi';

import { useI18n } from './LanguageProvider';

export default function NetworkStatus() {
  const { t } = useI18n();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [rpcStatus, setRpcStatus] = useState('status.rpc.unknown');
  const [blockTime, setBlockTime] = useState(null);

  useEffect(() => {
    if (!publicClient) {
      setRpcStatus('status.rpc.down');
      return undefined;
    }
    let active = true;
    const update = async () => {
      try {
        const block = await publicClient.getBlock();
        if (!active) return;
        setRpcStatus('status.rpc.ok');
        setBlockTime(Number(block.timestamp));
      } catch (error) {
        if (!active) return;
        setRpcStatus('status.rpc.down');
        setBlockTime(null);
      }
    };
    update();
    const timer = setInterval(update, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [publicClient]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp * 1000);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
  };

  return (
    <div className="network-status">
      <span>{t('status.chainId')}: {chainId || '-'}</span>
      <span>{t('status.rpc')}: {t(rpcStatus)}</span>
      <span>{t('status.blockTime')}: {formatTime(blockTime)}</span>
    </div>
  );
}
