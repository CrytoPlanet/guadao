import appConfig from '../config.json';

export const getChainOptions = () => {
  if (!appConfig.chains) return [];
  return Object.entries(appConfig.chains).map(([id, entry]) => ({
    id: Number(id),
    label: entry.label || id,
    airdropAddress: entry.airdropAddress || '',
    escrowAddress: entry.escrowAddress || '',
    guaTokenAddress: entry.guaTokenAddress || '',
    proofsUrl: entry.proofsUrl || '',
    rpcUrl: entry.rpcUrl || '',
    explorerUrl: entry.explorerUrl || '',
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
