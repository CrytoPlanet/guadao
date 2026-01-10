"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  usePublicClient,
} from 'wagmi';
import { isAddress, parseAbi } from 'viem';

import { defaultChainId, getChainOptions } from '../../lib/appConfig';
import {
  makeStatus,
  statusReady,
  statusLoading,
  statusLoaded,
  statusError,
  statusNetworkMismatch,
  statusNoRpc,
  statusInvalidAddress,
  statusTxSubmitted,
  statusTxConfirming,
  statusTxConfirmed,
} from '../../lib/status';
import { useI18n } from '../components/LanguageProvider';
import { useAdmin } from '../components/AdminProvider';
import CopyButton from '../components/CopyButton';
import ExplorerLink from '../components/ExplorerLink';
import StatusNotice from '../components/StatusNotice';

const AIRDROP_ABI = parseAbi([
  'function claim(address to,uint256 amount,bytes32[] proof)',
  'function claimed(address account) view returns (bool)',
  'function merkleRoot() view returns (bytes32)',
  'function setMerkleRoot(bytes32 merkleRoot)',
]);

const UNIVERSAL_AIRDROP_ABI = parseAbi([
  'function claim()',
  'function claimed(address account) view returns (bool)',
  'function claimAmount() view returns (uint256)',
  'function remainingSupply() view returns (uint256)',
  'function owner() view returns (address)',
  'function paused() view returns (bool)',
  'function setClaimAmount(uint256)',
  'function setMaxSupply(uint256)',
  'function pause()',
  'function unpause()',
]);

const shortAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';

const normalizeAddress = (address) => (address ? address.toLowerCase() : '');

const parseProofJson = (text) => {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !parsed.proofs) {
    throw new Error('Invalid proofs.json format');
  }
  return parsed;
};

export default function AirdropPage() {
  const { t } = useI18n();
  const { isAdmin } = useAdmin();
  const chainOptions = useMemo(getChainOptions, []);
  const [targetChainId, setTargetChainId] = useState(defaultChainId || '');
  const [contractAddress, setContractAddress] = useState('');
  const [proofsUrl, setProofsUrl] = useState('');
  const [proofsStatus, setProofsStatus] = useState(
    makeStatus('empty', 'airdrop.proofs.status.empty')
  );
  const [proofs, setProofs] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimProof, setClaimProof] = useState('');
  const [claimStatus, setClaimStatus] = useState(statusReady());
  const [rootInput, setRootInput] = useState('');
  const [rootStatus, setRootStatus] = useState(statusReady());
  const [lastTxHash, setLastTxHash] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Airdrop type: 'merkle' or 'universal'
  const [airdropType, setAirdropType] = useState('merkle');
  const [universalAirdropAddress, setUniversalAirdropAddress] = useState('');
  const [universalClaimStatus, setUniversalClaimStatus] = useState(statusReady());
  const [newAmount, setNewAmount] = useState('');
  const [newSupply, setNewSupply] = useState('');
  const [adminStatus, setAdminStatus] = useState(statusReady());

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isClaiming } = useWriteContract();
  const publicClient = usePublicClient();

  const chainMismatch = isConnected && targetChainId && chainId !== targetChainId;

  const claimedResult = useReadContract({
    address: isAddress(contractAddress) ? contractAddress : undefined,
    abi: AIRDROP_ABI,
    functionName: 'claimed',
    args: address ? [address] : undefined,
    query: {
      enabled: isAddress(contractAddress) && Boolean(address),
    },
  });

  const rootResult = useReadContract({
    address: isAddress(contractAddress) ? contractAddress : undefined,
    abi: AIRDROP_ABI,
    functionName: 'merkleRoot',
    query: {
      enabled: isAddress(contractAddress),
    },
  });

  // Universal Airdrop read hooks
  const universalClaimedResult = useReadContract({
    address: isAddress(universalAirdropAddress) ? universalAirdropAddress : undefined,
    abi: UNIVERSAL_AIRDROP_ABI,
    functionName: 'claimed',
    args: address ? [address] : undefined,
    query: {
      enabled: isAddress(universalAirdropAddress) && Boolean(address),
    },
  });

  const universalClaimAmountResult = useReadContract({
    address: isAddress(universalAirdropAddress) ? universalAirdropAddress : undefined,
    abi: UNIVERSAL_AIRDROP_ABI,
    functionName: 'claimAmount',
    query: {
      enabled: isAddress(universalAirdropAddress),
    },
  });

  const universalRemainingResult = useReadContract({
    address: isAddress(universalAirdropAddress) ? universalAirdropAddress : undefined,
    abi: UNIVERSAL_AIRDROP_ABI,
    functionName: 'remainingSupply',
    query: {
      enabled: isAddress(universalAirdropAddress),
    },
  });

  const universalOwnerResult = useReadContract({
    address: isAddress(universalAirdropAddress) ? universalAirdropAddress : undefined,
    abi: UNIVERSAL_AIRDROP_ABI,
    functionName: 'owner',
    query: { enabled: isAddress(universalAirdropAddress) },
  });

  const universalPausedResult = useReadContract({
    address: isAddress(universalAirdropAddress) ? universalAirdropAddress : undefined,
    abi: UNIVERSAL_AIRDROP_ABI,
    functionName: 'paused',
    query: { enabled: isAddress(universalAirdropAddress) },
  });

  const isUniversalAdmin = isConnected && universalOwnerResult.data && address && universalOwnerResult.data.toLowerCase() === address.toLowerCase();

  // Sync targetChainId with wallet chainId
  useEffect(() => {
    if (chainId && chainOptions.some(c => c.id === chainId)) {
      setTargetChainId(chainId);
    }
  }, [chainId, chainOptions]);

  // Update contract addresses when targetChainId changes
  useEffect(() => {
    const active = chainOptions.find((item) => item.id === Number(targetChainId));
    if (!active) return;
    setContractAddress(active.airdropAddress || '');
    setUniversalAirdropAddress(active.universalAirdropAddress || '');
    setProofsUrl(active.proofsUrl || '');
    setProofsUrl(active.proofsUrl || '');
  }, [chainOptions, targetChainId]);

  useEffect(() => {
    console.log('Admin Check Debug:');
    console.log('isConnected:', isConnected);
    console.log('User Address:', address);
    console.log('Universal Airdrop Address:', universalAirdropAddress);
    console.log('Owner Result Data:', universalOwnerResult.data);
    console.log('Owner Result Status:', universalOwnerResult.status);
    console.log('Is Universal Admin:', isUniversalAdmin);
  }, [isConnected, address, universalAirdropAddress, universalOwnerResult.data, universalOwnerResult.status, isUniversalAdmin]);

  // 自动加载 proofs.json（非高级模式下）
  useEffect(() => {
    if (showAdvanced) return; // 高级模式不自动加载
    if (proofs) return; // 已加载过
    if (!proofsUrl) return;

    const autoLoad = async () => {
      setProofsStatus(statusLoading());
      try {
        const response = await fetch(proofsUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const parsed = parseProofJson(JSON.stringify(json));
        setProofs(parsed);
        setProofsStatus(statusLoaded());
      } catch (error) {
        // 静默失败，用户可以手动加载
        setProofsStatus(statusError('status.error', { message: error.message }));
      }
    };
    autoLoad();
  }, [showAdvanced, proofsUrl, proofs]);

  useEffect(() => {
    if (!address) return;
    setRecipientAddress(address);
    if (!proofs) return;
    // 尝试直接匹配或转小写匹配
    const normalizedAddr = normalizeAddress(address);
    let entry = proofs.proofs?.[normalizedAddr];

    if (!entry && address) {
      // 如果找不到，尝试全小写匹配
      const lowerAddr = address.toLowerCase();
      // 遍历寻找（性能稍差但更稳健，或者假设 json key 也是小写）
      entry = proofs.proofs?.[lowerAddr];

      // 如果还找不到，尝试遍历 proofs keys 比较
      if (!entry && proofs.proofs) {
        const key = Object.keys(proofs.proofs).find(k => k.toLowerCase() === lowerAddr);
        if (key) entry = proofs.proofs[key];
      }
    }

    if (!entry) return;
    // 在非高级模式下自动填充
    if (!claimAmount || !showAdvanced) {
      setClaimAmount(entry.amount);
    }
    if (!claimProof || !showAdvanced) {
      setClaimProof(JSON.stringify(entry.proof, null, 2));
    }
  }, [address, proofs, claimAmount, claimProof, showAdvanced]);

  useEffect(() => {
    if (claimedResult.isError) {
      setClaimStatus(statusInvalidAddress());
    }
  }, [claimedResult.isError]);

  const claimEligibility = (() => {
    if (airdropType === 'universal') {
      if (!address) return '-';
      if (universalClaimedResult.data) return t('airdrop.status.claimed.yes');
      // Check if supply remains? Optional but good.
      // For now:
      return t('airdrop.status.eligible');
    }

    if (!address || !proofs) {
      return claimedResult.data ? t('airdrop.status.claimed.yes') : '-';
    }
    if (claimedResult.data) return t('airdrop.status.claimed.yes');
    const entry = proofs.proofs?.[normalizeAddress(address)];
    if (!entry) return t('airdrop.status.notEligible');
    return t('airdrop.status.eligible');
  })();

  const steps = useMemo(() => {
    if (airdropType === 'merkle') {
      return [
        { label: t('airdrop.guide.connect'), done: isConnected },
        { label: t('airdrop.guide.load'), done: Boolean(proofs) },
        { label: t('airdrop.guide.claim'), done: claimStatus.kind === 'success' || claimedResult.data === true },
      ];
    }
    // Universal steps
    return [
      { label: t('airdrop.guide.connect'), done: isConnected },
      { label: t('airdrop.status.eligible'), done: Boolean(universalClaimAmountResult.data) || Boolean(universalClaimedResult.data) },
      { label: t('airdrop.guide.claim'), done: universalClaimedResult.data === true },
    ];
  }, [airdropType, isConnected, proofs, claimStatus, claimedResult.data, universalClaimAmountResult.data, universalClaimedResult.data, t]);

  const loadProofsFromUrl = async () => {
    const url = proofsUrl.trim();
    if (!url) {
      setProofsStatus(statusError('airdrop.proofs.url'));
      return;
    }
    setProofsStatus(statusLoading());
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      const parsed = parseProofJson(JSON.stringify(json));
      setProofs(parsed);
      setProofsStatus(statusLoaded());
    } catch (error) {
      setProofsStatus(statusError('status.error', { message: error.message }));
    }
  };

  const loadProofsFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setProofsStatus(statusLoading());
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseProofJson(reader.result);
        setProofs(parsed);
        setProofsStatus(statusLoaded());
      } catch (error) {
        setProofsStatus(statusError('status.error', { message: error.message }));
      }
    };
    reader.readAsText(file);
  };

  const fillFromProofs = () => {
    if (!proofs) {
      setClaimStatus(statusError('airdrop.proofs.status.empty'));
      return;
    }
    const addressInput = recipientAddress.trim();
    if (!isAddress(addressInput)) {
      setClaimStatus(statusInvalidAddress());
      return;
    }

    // 尝试直接匹配或转小写匹配
    const normalizedAddr = normalizeAddress(addressInput);
    let entry = proofs.proofs?.[normalizedAddr];

    if (!entry) {
      // 如果找不到，尝试全小写匹配
      const lowerAddr = addressInput.toLowerCase();
      entry = proofs.proofs?.[lowerAddr];

      // 如果还找不到，尝试遍历 proofs keys 比较
      if (!entry && proofs.proofs) {
        const key = Object.keys(proofs.proofs).find(k => k.toLowerCase() === lowerAddr);
        if (key) entry = proofs.proofs[key];
      }
    }

    if (!entry) {
      setClaimStatus(statusError('airdrop.status.notEligible'));
      return;
    }
    setClaimAmount(entry.amount);
    setClaimProof(JSON.stringify(entry.proof, null, 2));
    setClaimStatus(statusLoaded());
  };

  const handleSwitchChain = async () => {
    if (!targetChainId) return;
    try {
      await switchChainAsync({ chainId: Number(targetChainId) });
    } catch (error) {
      setClaimStatus(statusNetworkMismatch());
    }
  };

  const handleClaim = async () => {
    if (!isConnected) {
      setClaimStatus(statusError('airdrop.status.disconnected'));
      return;
    }
    if (!isAddress(contractAddress)) {
      setClaimStatus(statusInvalidAddress());
      return;
    }
    if (!isAddress(recipientAddress)) {
      setClaimStatus(statusInvalidAddress());
      return;
    }
    if (!claimAmount.trim()) {
      setClaimStatus(statusError('airdrop.claim.amount'));
      return;
    }
    let amount;
    try {
      amount = BigInt(claimAmount.trim());
    } catch (error) {
      setClaimStatus(statusError('airdrop.claim.amount'));
      return;
    }
    let proof;
    try {
      proof = JSON.parse(claimProof.trim() || '[]');
      if (!Array.isArray(proof)) {
        throw new Error('Proof must be an array.');
      }
    } catch (error) {
      setClaimStatus(statusError('status.error', { message: error.message }));
      return;
    }
    if (chainMismatch) {
      setClaimStatus(statusNetworkMismatch());
      return;
    }
    if (!publicClient) {
      setClaimStatus(statusNoRpc());
      return;
    }
    try {
      setClaimStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AIRDROP_ABI,
        functionName: 'claim',
        args: [recipientAddress, amount, proof],
      });
      setLastTxHash(hash);
      setClaimStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setClaimStatus(statusTxConfirmed());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Claim failed';
      setClaimStatus(statusError('status.error', { message }));
    }
  };

  const handleSetRoot = async () => {
    const root = rootInput.trim();
    if (!isConnected) {
      setRootStatus(statusError('airdrop.status.disconnected'));
      return;
    }
    if (!isAddress(contractAddress)) {
      setRootStatus(statusInvalidAddress());
      return;
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(root)) {
      setRootStatus(statusError('airdrop.admin.root.invalid'));
      return;
    }
    if (chainMismatch) {
      setRootStatus(statusNetworkMismatch());
      return;
    }
    if (!publicClient) {
      setRootStatus(statusNoRpc());
      return;
    }

    try {
      setRootStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AIRDROP_ABI,
        functionName: 'setMerkleRoot',
        args: [root],
      });
      setLastTxHash(hash);
      setRootStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setRootStatus(statusTxConfirmed());
      rootResult.refetch?.();
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Update failed';
      setRootStatus(statusError('status.error', { message }));
    }
  };

  const handleUniversalClaim = async () => {
    if (!isConnected) {
      setUniversalClaimStatus(statusError('airdrop.status.disconnected'));
      return;
    }
    if (!isAddress(universalAirdropAddress)) {
      setUniversalClaimStatus(statusError('airdrop.universal.notConfigured'));
      return;
    }
    if (chainMismatch) {
      setUniversalClaimStatus(statusNetworkMismatch());
      return;
    }
    if (!publicClient) {
      setUniversalClaimStatus(statusNoRpc());
      return;
    }
    try {
      setUniversalClaimStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: universalAirdropAddress,
        abi: UNIVERSAL_AIRDROP_ABI,
        functionName: 'claim',
        args: [],
      });
      setLastTxHash(hash);
      setUniversalClaimStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setUniversalClaimStatus(statusTxConfirmed());
      universalClaimedResult.refetch?.();
      universalRemainingResult.refetch?.();
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Claim failed';
      setUniversalClaimStatus(statusError('status.error', { message }));
    }
  };



  const handleUpdateAmount = async () => {
    if (!newAmount || isNaN(newAmount)) return;
    try {
      setAdminStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: universalAirdropAddress,
        abi: UNIVERSAL_AIRDROP_ABI,
        functionName: 'setClaimAmount',
        args: [BigInt(Number(newAmount) * 1e18)],
      });
      setLastTxHash(hash);
      setAdminStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setAdminStatus(statusTxConfirmed());
      universalClaimAmountResult.refetch?.();
    } catch (error) {
      setAdminStatus(statusError('status.error', { message: error.message }));
    }
  };

  const handleUpdateSupply = async () => {
    if (!newSupply || isNaN(newSupply)) return;
    try {
      setAdminStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: universalAirdropAddress,
        abi: UNIVERSAL_AIRDROP_ABI,
        functionName: 'setMaxSupply',
        args: [BigInt(Number(newSupply) * 1e18)],
      });
      setLastTxHash(hash);
      setAdminStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setAdminStatus(statusTxConfirmed());
      universalRemainingResult.refetch?.();
    } catch (error) {
      setAdminStatus(statusError('status.error', { message: error.message }));
    }
  };

  const handlePauseUnpause = async (shouldPause) => {
    try {
      setAdminStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: universalAirdropAddress,
        abi: UNIVERSAL_AIRDROP_ABI,
        functionName: shouldPause ? 'pause' : 'unpause',
      });
      setLastTxHash(hash);
      setAdminStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setAdminStatus(statusTxConfirmed());
      universalPausedResult.refetch?.();
    } catch (error) {
      setAdminStatus(statusError('status.error', { message: error.message }));
    }
  };

  const formatGUA = (value) => {
    if (!value) return '-';
    return `${(Number(value) / 1e18).toLocaleString()} GUA`;
  };

  return (
    <main className="layout">
      <section className="panel hero">
        <div>
          <p className="eyebrow">{t('airdrop.eyebrow')}</p>
          <h1>{airdropType === 'universal' ? t('airdrop.universal.title') : t('airdrop.title')}</h1>
          <p className="lede">{airdropType === 'universal' ? t('airdrop.universal.lede') : t('airdrop.lede')}</p>
          {/* Airdrop Type Tabs */}
          {/* Airdrop Type Tabs moved to below Guide */}
          <div className="hero-actions">
            <button
              className="mode-toggle"
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
            >
              {showAdvanced ? t('ui.mode.hideAdvanced') : t('ui.mode.showAdvanced')}
            </button>
          </div>
        </div>
        <div className="status-card">
          <div className="status-row">
            <span>{t('airdrop.status.wallet')}</span>
            <span>{isConnected ? t('airdrop.status.connected') : t('airdrop.status.disconnected')}</span>
          </div>
          <div className="status-row">
            <span>{t('airdrop.status.address')}</span>
            <span className="inline-group">
              {shortAddress(address)}
              <CopyButton value={address} />
            </span>
          </div>
          <div className="status-row">
            <span>{t('airdrop.status.network')}</span>
            <span>
              {chainId ? `${chainId}${chainMismatch ? ' (mismatch)' : ''}` : '-'}
            </span>
          </div>
          <div className="status-row">
            <span>{t('airdrop.status.claimed')}</span>
            <span>{claimEligibility}</span>
          </div>
          <p className="hint">{t('airdrop.lede')}</p>
        </div>
        {/* Debug Info for Local Anvil */}
        {chainId === 31337 && (
          <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#333', color: '#0f0', fontSize: '0.7em', borderRadius: '4px', fontFamily: 'monospace' }}>
            <p style={{ margin: 0 }}>DEBUG: Local Anvil</p>
            <p style={{ margin: 0 }}>User: {address}</p>
            <p style={{ margin: 0 }}>Owner: {universalOwnerResult.data || 'Loading...'}</p>
            <p style={{ margin: 0 }}>IsAdmin: {String(isUniversalAdmin)}</p>
            <p style={{ margin: 0 }}>Contract: {universalAirdropAddress}</p>
          </div>
        )}
      </section>




      {/* Airdrop Type Tabs */}
      <section className="panel" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', padding: '1rem' }}>
        <button
          className={`mode-toggle ${airdropType === 'merkle' ? 'active' : ''}`}
          type="button"
          onClick={() => setAirdropType('merkle')}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          {t('airdrop.type.merkle')}
        </button>
        <button
          className={`mode-toggle ${airdropType === 'universal' ? 'active' : ''}`}
          type="button"
          onClick={() => setAirdropType('universal')}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          {t('airdrop.type.universal')}
        </button>
      </section>

      {/* Merkle Airdrop Guide */
        airdropType === 'merkle' && (
          <section className="panel">
            <h2>{t('airdrop.guide.title')}</h2>
            <div className="guide">
              {steps.map((step, index) => (
                <div
                  key={step.label}
                  className={`guide-step${step.done ? ' done' : ''}${!step.done && index === 0 ? ' active' : ''}`}
                >
                  <span className="badge">{index + 1}</span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

      {/* Universal Airdrop Guide */}
      {airdropType === 'universal' && (
        <section className="panel">
          <h2>{t('airdrop.guide.title')}</h2>
          <div className="guide">
            {steps.map((step, index) => (
              <div
                key={step.label}
                className={`guide-step${step.done ? ' done' : ''}${!step.done && index === 0 ? ' active' : ''}`}
              >
                <span className="badge">{index + 1}</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}



      {/* Universal Airdrop Section (Moved here) */}
      {airdropType === 'universal' && (
        <section className="panel">
          <h2>{t('airdrop.universal.title')}</h2>
          {!isAddress(universalAirdropAddress) ? (
            <p className="hint">{t('airdrop.universal.notConfigured')}</p>
          ) : (
            <>
              <div className="form-grid">
                <div className="status-row">
                  <span>{t('airdrop.universal.amount')}</span>
                  <span>{formatGUA(universalClaimAmountResult.data)}</span>
                </div>
                <div className="status-row">
                  <span>{t('airdrop.universal.remaining')}</span>
                  <span>{formatGUA(universalRemainingResult.data)}</span>
                </div>
                <div className="status-row">
                  <span>{t('airdrop.status.claimed')}</span>
                  <span>
                    {universalClaimedResult.data
                      ? t('airdrop.universal.claimed')
                      : t('airdrop.universal.notClaimed')}
                  </span>
                </div>
              </div>
              <div className="actions" style={{ marginTop: '1rem' }}>
                <button
                  className="btn primary"
                  onClick={handleUniversalClaim}
                  disabled={isClaiming || universalClaimedResult.data}
                >
                  {isClaiming ? t('airdrop.universal.claiming') : t('airdrop.universal.claim')}
                </button>
              </div>
              <StatusNotice status={universalClaimStatus} />
              {lastTxHash && (
                <div className="status-row">
                  <span>{t('status.tx.latest')}</span>
                  <span className="inline-group">
                    {shortAddress(lastTxHash)}
                    <ExplorerLink chainId={chainId} type="tx" value={lastTxHash} />
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Admin Panel for Universal Airdrop */}
      {airdropType === 'universal' && isUniversalAdmin && (
        <section className="panel" style={{ border: '1px solid var(--accent)', background: 'rgba(var(--accent-rgb), 0.05)' }}>
          <h2>{t('airdrop.admin.title')}</h2>
          <div className="form-grid">
            {/* Status Row */}
            <div className="status-row" style={{ gridColumn: '1 / -1' }}>
              <span>{t('admin.statusLabel')}</span>
              <span style={{ color: universalPausedResult.data ? 'var(--error)' : 'var(--success)', fontWeight: 'bold' }}>
                {universalPausedResult.data ? t('airdrop.admin.paused') : t('airdrop.admin.notPaused')}
              </span>
            </div>

            {/* Claim Amount Control */}
            <label className="field">
              <span>{t('airdrop.admin.amount')}</span>
              <div className="inline-group">
                <input
                  type="number"
                  placeholder={universalClaimAmountResult.data ? Number(universalClaimAmountResult.data) / 1e18 : ''}
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                />
                <button className="btn" onClick={handleUpdateAmount} disabled={!newAmount}>{t('airdrop.admin.update')}</button>
              </div>
            </label>

            {/* Max Supply Control */}
            <label className="field">
              <span>{t('airdrop.admin.cap')}</span>
              <div className="inline-group">
                <input
                  type="number"
                  placeholder={universalRemainingResult.data ? ((Number(universalRemainingResult.data) + Number(universalClaimedResult.data ? 0 : 0)) / 1e18) : ''}
                  value={newSupply}
                  onChange={(e) => setNewSupply(e.target.value)}
                />
                <button className="btn" onClick={handleUpdateSupply} disabled={!newSupply}>{t('airdrop.admin.update')}</button>
              </div>
            </label>

            {/* Pause/Unpause Control */}
            <div className="actions" style={{ gridColumn: '1 / -1' }}>
              {universalPausedResult.data ? (
                <button className="btn primary" onClick={() => handlePauseUnpause(false)}>{t('airdrop.admin.unpause')}</button>
              ) : (
                <button className="btn ghost" style={{ color: 'var(--error)', borderColor: 'var(--error)' }} onClick={() => handlePauseUnpause(true)}>{t('airdrop.admin.pause')}</button>
              )}
            </div>
            <StatusNotice status={adminStatus} />
          </div>
        </section>
      )}

      {/* Merkle Airdrop Config */}
      {airdropType === 'merkle' && showAdvanced && (
        <section className="panel">
          <h2>{t('airdrop.config.title')}</h2>
          <div className="form-grid">
            {showAdvanced && (
              <label className="field">
                <span>{t('airdrop.config.contract')}</span>
                <input
                  value={contractAddress}
                  placeholder="0x..."
                  onChange={(event) => setContractAddress(event.target.value)}
                />
                <ExplorerLink
                  chainId={chainId}
                  type="address"
                  value={contractAddress}
                  label={t('status.contract.link')}
                />
              </label>
            )}
            <label className="field">
              <span>{t('airdrop.config.network')}</span>
              <select
                value={targetChainId}
                onChange={(event) => setTargetChainId(Number(event.target.value))}
              >
                {chainOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({option.id})
                  </option>
                ))}
              </select>
            </label>
          </div>
          {chainMismatch && (
            <div className="notice">
              {t('airdrop.config.mismatch')}
              <button
                className="btn ghost"
                onClick={handleSwitchChain}
                disabled={isSwitching}
              >
                {isSwitching ? t('airdrop.config.switching') : t('airdrop.config.switch')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Universal Airdrop Config */}
      {airdropType === 'universal' && showAdvanced && (
        <section className="panel">
          <h2>{t('airdrop.config.title')}</h2>
          <div className="form-grid">
            <label className="field">
              <span>{t('airdrop.config.contract')}</span>
              <input
                value={universalAirdropAddress}
                placeholder="0x..."
                onChange={(event) => setUniversalAirdropAddress(event.target.value)}
              />
              <ExplorerLink
                chainId={chainId}
                type="address"
                value={universalAirdropAddress}
                label={t('status.contract.link')}
              />
            </label>
            <label className="field">
              <span>{t('airdrop.config.network')}</span>
              <select
                value={targetChainId}
                onChange={(event) => setTargetChainId(Number(event.target.value))}
              >
                {chainOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({option.id})
                  </option>
                ))}
              </select>
            </label>
          </div>
          {chainMismatch && (
            <div className="notice">
              {t('airdrop.config.mismatch')}
              <button
                className="btn ghost"
                onClick={handleSwitchChain}
                disabled={isSwitching}
              >
                {isSwitching ? t('airdrop.config.switching') : t('airdrop.config.switch')}
              </button>
            </div>
          )}
        </section>
      )}

      {airdropType === 'merkle' && (
        <section className="panel">
          <h2>{t('airdrop.proofs.title')}</h2>
          <div className="form-grid">
            {showAdvanced && (
              <>
                <label className="field">
                  <span>{t('airdrop.proofs.url')}</span>
                  <input
                    value={proofsUrl}
                    onChange={(event) => setProofsUrl(event.target.value)}
                  />
                </label>
                <button className="btn ghost" onClick={loadProofsFromUrl}>
                  {t('airdrop.proofs.load')}
                </button>
                <label className="field">
                  <span>{t('airdrop.proofs.upload')}</span>
                  <input type="file" accept="application/json" onChange={loadProofsFromFile} />
                </label>
              </>
            )}
          </div>
          {!showAdvanced && proofs && (
            <p className="hint" style={{ color: 'var(--accent)' }}>✓ {t('status.loaded')}</p>
          )}
          {!showAdvanced && !proofs && <p className="hint">{t('airdrop.proofs.hint')}</p>}
          <StatusNotice status={proofsStatus} />
        </section>
      )}

      {/* Merkle Airdrop Claim Section */}
      {airdropType === 'merkle' && (
        <section className="panel">
          <h2>{t('airdrop.claim.title')}</h2>
          <div className="form-grid">
            <label className="field">
              <span>{t('airdrop.claim.recipient')}</span>
              <input
                value={recipientAddress}
                placeholder="0x..."
                onChange={(event) => setRecipientAddress(event.target.value)}
                readOnly={!showAdvanced && Boolean(address)}
              />
            </label>
            <label className="field">
              <span>{t('airdrop.claim.amount')}</span>
              <input
                value={claimAmount}
                placeholder="0"
                onChange={(event) => setClaimAmount(event.target.value)}
                readOnly={!showAdvanced}
              />
            </label>
            {showAdvanced && (
              <label className="field full">
                <span>{t('airdrop.claim.proof')}</span>
                <textarea
                  value={claimProof}
                  rows="4"
                  placeholder='["0xabc...", "0xdef..."]'
                  onChange={(event) => setClaimProof(event.target.value)}
                ></textarea>
              </label>
            )}
          </div>
          {!showAdvanced && <p className="hint">{t('airdrop.claim.hint')}</p>}
          <div className="actions">
            {showAdvanced && (
              <button className="btn ghost" onClick={fillFromProofs}>
                {t('airdrop.claim.fill')}
              </button>
            )}
            <button className="btn primary" onClick={handleClaim} disabled={isClaiming}>
              {isClaiming ? t('airdrop.claim.submitting') : t('airdrop.claim.submit')}
            </button>
          </div>
          <StatusNotice status={claimStatus} />
          <div className="status-row">
            <span>{t('status.tx.latest')}</span>
            <span className="inline-group">
              {lastTxHash || '-'}
              <ExplorerLink chainId={chainId} type="tx" value={lastTxHash} />
            </span>
          </div>
        </section>
      )}

      {airdropType === 'merkle' &&
        isAdmin && (
          <section className="panel">
            <h2>{t('airdrop.admin.title')}</h2>
            <p className="hint">{t('airdrop.admin.hint')}</p>
            <div className="form-grid">
              <label className="field full">
                <span>{t('airdrop.admin.root.current')}</span>
                <div className="inline-group">
                  <input
                    value={rootResult.data || ''}
                    readOnly
                  />
                  <CopyButton value={rootResult.data} />
                </div>
              </label>
              <label className="field full">
                <span>{t('airdrop.admin.root.next')}</span>
                <input
                  value={rootInput}
                  placeholder="0x..."
                  onChange={(event) => setRootInput(event.target.value)}
                />
              </label>
            </div>
            <div className="actions">
              <button className="btn primary" onClick={handleSetRoot} disabled={isClaiming}>
                {t('airdrop.admin.root.update')}
              </button>
            </div>
            <StatusNotice status={rootStatus} />
            <div className="status-row">
              <span>{t('status.tx.latest')}</span>
              <span className="inline-group">
                {lastTxHash || '-'}
                <ExplorerLink chainId={chainId} type="tx" value={lastTxHash} />
              </span>
            </div>
          </section>
        )
      }
    </main >
  );
}
