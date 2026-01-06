"use client";

import { useAccount, useChainId, useReadContract } from 'wagmi';
import { isAddress, parseAbi, formatUnits } from 'viem';
import { useMemo } from 'react';

import { getChainOptions } from '../lib/appConfig';
import { useI18n } from '../app/components/LanguageProvider';

const ERC20_ABI = parseAbi([
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
]);

/**
 * 用户代币余额显示组件
 * @param {string} tokenAddress - 可选，代币地址（不传则使用配置中的 guaTokenAddress）
 * @param {boolean} showSymbol - 是否显示代币符号
 */
export default function TokenBalance({ tokenAddress, showSymbol = true }) {
    const { t } = useI18n();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const chainOptions = useMemo(getChainOptions, []);

    // 获取当前链的代币地址
    const resolvedTokenAddress = useMemo(() => {
        if (tokenAddress && isAddress(tokenAddress)) return tokenAddress;
        const chainConfig = chainOptions.find((c) => c.id === chainId);
        return chainConfig?.guaTokenAddress || '';
    }, [tokenAddress, chainOptions, chainId]);

    const balanceResult = useReadContract({
        address: isAddress(resolvedTokenAddress) ? resolvedTokenAddress : undefined,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
            enabled: isAddress(resolvedTokenAddress) && isConnected && Boolean(address),
        },
    });

    const decimalsResult = useReadContract({
        address: isAddress(resolvedTokenAddress) ? resolvedTokenAddress : undefined,
        abi: ERC20_ABI,
        functionName: 'decimals',
        query: {
            enabled: isAddress(resolvedTokenAddress),
        },
    });

    const symbolResult = useReadContract({
        address: isAddress(resolvedTokenAddress) ? resolvedTokenAddress : undefined,
        abi: ERC20_ABI,
        functionName: 'symbol',
        query: {
            enabled: isAddress(resolvedTokenAddress) && showSymbol,
        },
    });

    if (!isConnected || !isAddress(resolvedTokenAddress)) {
        return null;
    }

    const decimals = decimalsResult.data ?? 18;
    const balance = balanceResult.data ?? 0n;
    const symbol = symbolResult.data ?? 'GUA';

    // 格式化余额，保留最多 4 位小数
    const formattedBalance = formatUnits(balance, decimals);
    const displayBalance = parseFloat(formattedBalance).toLocaleString(undefined, {
        maximumFractionDigits: 4,
    });

    const addToWallet = async () => {
        if (typeof window !== 'undefined' && window.ethereum && isAddress(resolvedTokenAddress)) {
            try {
                await window.ethereum.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC20',
                        options: {
                            address: resolvedTokenAddress,
                            symbol: symbol,
                            decimals: decimals,
                        },
                    },
                });
            } catch (error) {
                console.error('Failed to add token to wallet:', error);
            }
        }
    };

    return (
        <div className="token-balance" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span className="balance-value">{displayBalance}</span>
            {showSymbol && <span className="balance-symbol">{symbol}</span>}
            <button
                onClick={addToWallet}
                className="btn ghost small"
                title={t ? t('wallet.addToken', 'Add to Wallet') : 'Add to Wallet'}
                style={{ padding: '2px 6px', fontSize: '0.8em', minWidth: 'auto', height: 'auto' }}
            >
                + 🦊
            </button>
        </div>
    );
}
