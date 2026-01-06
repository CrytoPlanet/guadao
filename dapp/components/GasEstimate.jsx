"use client";

import { useState, useEffect } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { formatUnits } from 'viem';

import { useI18n } from '../app/components/LanguageProvider';

/**
 * Gas 预估组件
 * @param {object} contractCall - 合约调用配置 { address, abi, functionName, args, value? }
 * @param {boolean} show - 是否显示
 */
export default function GasEstimate({ contractCall, show = true }) {
    const { t } = useI18n();
    const publicClient = usePublicClient();
    const chainId = useChainId();
    const [gasEstimate, setGasEstimate] = useState(null);
    const [gasPrice, setGasPrice] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const estimate = async () => {
            if (!publicClient || !contractCall?.address || !contractCall?.functionName) {
                setGasEstimate(null);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // 获取 gas 预估
                const gas = await publicClient.estimateContractGas({
                    address: contractCall.address,
                    abi: contractCall.abi,
                    functionName: contractCall.functionName,
                    args: contractCall.args || [],
                    value: contractCall.value,
                    account: contractCall.account,
                });

                // 获取当前 gas 价格
                const price = await publicClient.getGasPrice();

                setGasEstimate(gas);
                setGasPrice(price);
            } catch (err) {
                setError(err?.shortMessage || err?.message || 'Estimation failed');
                setGasEstimate(null);
                setGasPrice(null);
            } finally {
                setIsLoading(false);
            }
        };

        if (show) {
            estimate();
        }
    }, [publicClient, contractCall, show]);

    if (!show) return null;

    // 计算预估费用 (ETH)
    const estimatedCost = gasEstimate && gasPrice
        ? formatUnits(gasEstimate * gasPrice, 18)
        : null;

    const displayCost = estimatedCost
        ? parseFloat(estimatedCost).toFixed(6)
        : null;

    return (
        <div className="gas-estimate">
            <span className="gas-label">{t('ui.gas.estimate')}:</span>
            {isLoading && <span className="gas-loading">{t('status.loading')}</span>}
            {error && <span className="gas-error" title={error}>-</span>}
            {!isLoading && !error && gasEstimate && (
                <>
                    <span className="gas-value">{gasEstimate.toString()} gas</span>
                    {displayCost && (
                        <span className="gas-cost">≈ {displayCost} ETH</span>
                    )}
                </>
            )}
            {!isLoading && !error && !gasEstimate && (
                <span className="gas-na">-</span>
            )}
        </div>
    );
}
