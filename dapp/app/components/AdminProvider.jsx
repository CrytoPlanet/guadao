"use client";

import { createContext, useContext, useMemo } from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { isAddress, parseAbi } from 'viem';
import { defaultChainId, getChainOptions } from '../../lib/appConfig';

const OWNER_ABI = parseAbi(['function owner() view returns (address)']);

const AdminContext = createContext({
    isAdmin: false,
    isLoading: true,
    ownerAddress: null,
});

export function AdminProvider({ children }) {
    const chainOptions = useMemo(getChainOptions, []);
    const { address, isConnected } = useAccount();
    const chainId = useChainId();

    // Find the active chain config
    const activeChainConfig = useMemo(() => {
        const targetId = chainId || defaultChainId;
        return chainOptions.find((c) => c.id === targetId);
    }, [chainOptions, chainId]);

    const escrowAddress = activeChainConfig?.escrowAddress || '';

    // Read owner from Escrow contract
    const ownerResult = useReadContract({
        address: isAddress(escrowAddress) ? escrowAddress : undefined,
        abi: OWNER_ABI,
        functionName: 'owner',
        query: {
            enabled: isAddress(escrowAddress),
        },
    });

    const isAdmin = useMemo(() => {
        if (!isConnected || !address || !ownerResult.data) return false;
        return address.toLowerCase() === ownerResult.data.toLowerCase();
    }, [isConnected, address, ownerResult.data]);

    const value = useMemo(
        () => ({
            isAdmin,
            isLoading: ownerResult.isLoading,
            ownerAddress: ownerResult.data || null,
        }),
        [isAdmin, ownerResult.isLoading, ownerResult.data]
    );

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
    return useContext(AdminContext);
}
