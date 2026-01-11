"use client";

import { useMemo } from 'react';
import { useAccount, useChainId, useBalance, useReadContract, useSwitchChain } from 'wagmi';
import { isAddress, formatEther, parseAbi } from 'viem';
import { useI18n } from '../components/LanguageProvider';
import { getChainOptions, defaultChainId } from '../../lib/appConfig';
import StatusNotice from '../components/StatusNotice';
import ExplorerLink from '../components/ExplorerLink';
import { statusReady, statusNetworkMismatch } from '../../lib/status';

const TIMELOCK_ABI = parseAbi([
    'function getMinDelay() view returns (uint256)',
]);

const TOKEN_ABI = parseAbi([
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
]);

const AIRDROP_ABI = parseAbi([
    'function totalClaimed() view returns (uint256)',
    'function maxSupply() view returns (uint256)',
    'function claimAmount() view returns (uint256)',
]);

export default function TreasuryPage() {
    const { t } = useI18n();
    const chainId = useChainId();
    const { switchChainAsync } = useSwitchChain();
    const chainOptions = useMemo(getChainOptions, []);

    // Default to configured chain even if wallet not connected
    const targetChainId = chainId && chainOptions.some(c => c.id === chainId) ? chainId : defaultChainId;
    const isMismatch = chainId && targetChainId && chainId !== targetChainId;

    const activeChainConfig = chainOptions.find(c => c.id === Number(targetChainId));

    const timelockAddress = activeChainConfig?.timelockAddress;
    const tokenAddress = activeChainConfig?.guaTokenAddress;
    const airdropAddress = activeChainConfig?.universalAirdropAddress;

    // 1. Timelock ETH Balance
    const timelockEth = useBalance({
        address: isAddress(timelockAddress) ? timelockAddress : undefined,
        chainId: targetChainId,
    });

    // 2. Timelock GUA Balance
    const timelockGua = useReadContract({
        address: isAddress(tokenAddress) ? tokenAddress : undefined,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: [timelockAddress],
        query: { enabled: isAddress(tokenAddress) && isAddress(timelockAddress) }
    });

    // 3. Token Total Supply
    const totalSupply = useReadContract({
        address: isAddress(tokenAddress) ? tokenAddress : undefined,
        abi: TOKEN_ABI,
        functionName: 'totalSupply',
        query: { enabled: isAddress(tokenAddress) }
    });

    // 4. Airdrop Stats
    const totalClaimed = useReadContract({
        address: isAddress(airdropAddress) ? airdropAddress : undefined,
        abi: AIRDROP_ABI,
        functionName: 'totalClaimed',
        query: { enabled: isAddress(airdropAddress) }
    });

    const maxSupply = useReadContract({
        address: isAddress(airdropAddress) ? airdropAddress : undefined,
        abi: AIRDROP_ABI,
        functionName: 'maxSupply',
        query: { enabled: isAddress(airdropAddress) }
    });

    const formatVal = (val) => val ? Number(formatEther(val)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-';

    return (
        <main className="layout">
            <section className="panel hero">
                <div>
                    <p className="eyebrow">{t('treasury.eyebrow')}</p>
                    <h1>{t('treasury.title')}</h1>
                    <p className="lede">{t('treasury.lede')}</p>
                </div>
            </section>

            {isMismatch && (
                <section className="panel notice warning">
                    <p>{t('status.networkMismatch')}</p>
                    <button className="btn primary sm" onClick={() => switchChainAsync({ chainId: targetChainId })}>
                        {t('airdrop.config.switch')}
                    </button>
                </section>
            )}

            {/* Protocol Treasury (Timelock) */}
            <section className="panel">
                <h2>{t('treasury.section.timelock')}</h2>
                <p className="muted" style={{ marginBottom: '1rem', fontSize: '0.9em' }}>
                    {t('treasury.timelock.desc')}
                    <br />
                    <span className="mono">{timelockAddress}</span>
                    <ExplorerLink chainId={targetChainId} type="address" value={timelockAddress} />
                </p>

                <div className="status-card">
                    <div className="status-row">
                        <span>ETH {t('treasury.balance')}</span>
                        <span className="sc-val">{timelockEth.data ? Number(timelockEth.data.formatted).toFixed(4) : '-'} ETH</span>
                    </div>
                    <div className="status-row">
                        <span>GUA {t('treasury.balance')}</span>
                        <span className="sc-val">{formatVal(timelockGua.data)} GUA</span>
                    </div>
                </div>
            </section>

            {/* Token Stats */}
            <section className="panel">
                <h2>{t('treasury.section.token')}</h2>
                <div className="status-card">
                    <div className="status-row">
                        <span>{t('treasury.token.supply')}</span>
                        <span className="sc-val">{formatVal(totalSupply.data)} GUA</span>
                    </div>
                    <div className="status-row">
                        <span>{t('treasury.token.address')}</span>
                        <span className="mono" style={{ fontSize: '0.8em', wordBreak: 'break-all' }}>
                            {tokenAddress}
                            <ExplorerLink chainId={targetChainId} type="address" value={tokenAddress} />
                        </span>
                    </div>
                </div>
            </section>

            {/* Airdrop Pool (Universal) */}
            <section className="panel">
                <h2>{t('treasury.section.airdrop')}</h2>
                <p className="muted">{t('treasury.airdrop.desc')}</p>

                <div className="status-card">
                    <div className="status-row">
                        <span>{t('treasury.airdrop.minted')}</span>
                        <span>{formatVal(totalClaimed.data)} GUA</span>
                    </div>
                    <div className="status-row">
                        <span>{t('treasury.airdrop.cap')}</span>
                        <span>{formatVal(maxSupply.data)} GUA</span>
                    </div>
                    <div className="status-row">
                        <span>{t('treasury.airdrop.progress')}</span>
                        <span>
                            {maxSupply.data && Number(maxSupply.data) > 0
                                ? ((Number(totalClaimed.data || 0n) * 100) / Number(maxSupply.data)).toFixed(1)
                                : '0.0'}%
                        </span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-sub)', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
                        <div style={{
                            width: `${maxSupply.data && Number(maxSupply.data) > 0
                                ? ((Number(totalClaimed.data || 0n) * 100) / Number(maxSupply.data))
                                : 0}%`,
                            height: '100%',
                            background: 'var(--accent)'
                        }} />
                    </div>
                </div>
            </section>
        </main>
    );
}
