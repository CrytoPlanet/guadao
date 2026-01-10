import { getAddress, isAddress } from 'viem';
import appConfig from '../config.json';

// 将地址转换为标准校验和格式
const normalizeAddress = (addr) => {
  if (!addr || !isAddress(addr)) return '';
  try {
    return getAddress(addr);
  } catch {
    return addr;
  }
};

export const getChainOptions = () => {
  if (!appConfig.chains) return [];
  return Object.entries(appConfig.chains).map(([id, entry]) => ({
    id: Number(id),
    label: entry.label || id,
    airdropAddress: normalizeAddress(entry.airdropAddress),
    universalAirdropAddress: normalizeAddress(entry.universalAirdropAddress),
    escrowAddress: normalizeAddress(entry.escrowAddress),
    guaTokenAddress: normalizeAddress(entry.guaTokenAddress),
    proofsUrl: entry.proofsUrl || '',
    rpcUrl: entry.rpcUrl || '',
    explorerUrl: entry.explorerUrl || '',
    startBlock: entry.startBlock || 0,
  }));
};

export const defaultChainId =
  appConfig.defaultChainId || getChainOptions()[0]?.id || undefined;

export const getExplorerUrl = (chainId, type, value) => {
  if (!chainId || !value) return '';
  const entry = getChainOptions().find((item) => item.id === Number(chainId));
  if (!entry?.explorerUrl) return '';
  const base = entry.explorerUrl.replace(/\/$/, '');
  if (type === 'tx') return `${base}/tx/${value}`;
  if (type === 'address') return `${base}/address/${value}`;
  return '';
};
