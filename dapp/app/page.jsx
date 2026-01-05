"use client";

import { useEffect, useMemo, useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  usePublicClient,
} from 'wagmi';
import { isAddress, parseAbi } from 'viem';

import appConfig from '../config.json';

const AIRDROP_ABI = parseAbi([
  'function claim(address to,uint256 amount,bytes32[] proof)',
  'function claimed(address account) view returns (bool)',
]);

const shortAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';

const normalizeAddress = (address) => (address ? address.toLowerCase() : '');

const getChainOptions = () => {
  if (!appConfig.chains) return [];
  return Object.entries(appConfig.chains).map(([id, entry]) => ({
    id: Number(id),
    label: entry.label || id,
    airdropAddress: entry.airdropAddress || '',
    proofsUrl: entry.proofsUrl || '',
  }));
};

const parseProofJson = (text) => {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !parsed.proofs) {
    throw new Error('Invalid proofs.json format');
  }
  return parsed;
};

export default function HomePage() {
  const chainOptions = useMemo(getChainOptions, []);
  const defaultChainId = appConfig.defaultChainId || chainOptions[0]?.id;
  const [targetChainId, setTargetChainId] = useState(defaultChainId || '');
  const [contractAddress, setContractAddress] = useState('');
  const [proofsUrl, setProofsUrl] = useState('');
  const [proofsStatus, setProofsStatus] = useState('No proofs loaded.');
  const [proofs, setProofs] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimProof, setClaimProof] = useState('');
  const [claimResult, setClaimResult] = useState('Ready to claim.');

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

  useEffect(() => {
    const active = chainOptions.find((item) => item.id === Number(targetChainId));
    if (!active) return;
    setContractAddress((current) => current || active.airdropAddress || '');
    setProofsUrl((current) => current || active.proofsUrl || '');
  }, [chainOptions, targetChainId]);

  useEffect(() => {
    if (!address) return;
    setRecipientAddress(address);
    if (!proofs) return;
    const entry = proofs.proofs?.[normalizeAddress(address)];
    if (!entry) return;
    if (!claimAmount) {
      setClaimAmount(entry.amount);
    }
    if (!claimProof) {
      setClaimProof(JSON.stringify(entry.proof, null, 2));
    }
  }, [address, proofs, claimAmount, claimProof]);

  useEffect(() => {
    if (claimedResult.isError) {
      setClaimResult('Unable to check claim status.');
    }
  }, [claimedResult.isError]);

  const claimStatus = (() => {
    if (!address || !proofs) {
      return claimedResult.data ? 'Claimed' : '-';
    }
    if (claimedResult.data) return 'Claimed';
    const entry = proofs.proofs?.[normalizeAddress(address)];
    if (!entry) return 'Not eligible';
    return 'Eligible';
  })();

  const loadProofsFromUrl = async () => {
    const url = proofsUrl.trim();
    if (!url) {
      setProofsStatus('No URL provided.');
      return;
    }
    setProofsStatus('Loading proofs...');
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      const parsed = parseProofJson(JSON.stringify(json));
      setProofs(parsed);
      setProofsStatus('Proofs loaded.');
    } catch (error) {
      setProofsStatus(`Failed to load proofs: ${error.message}`);
    }
  };

  const loadProofsFromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setProofsStatus('Loading proofs...');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseProofJson(reader.result);
        setProofs(parsed);
        setProofsStatus('Proofs loaded.');
      } catch (error) {
        setProofsStatus(`Failed to parse proofs: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  const fillFromProofs = () => {
    if (!proofs) {
      setClaimResult('No proofs loaded.');
      return;
    }
    const addressInput = recipientAddress.trim();
    if (!isAddress(addressInput)) {
      setClaimResult('Recipient address is invalid.');
      return;
    }
    const entry = proofs.proofs?.[normalizeAddress(addressInput)];
    if (!entry) {
      setClaimResult('Address not found in proofs.');
      return;
    }
    setClaimAmount(entry.amount);
    setClaimProof(JSON.stringify(entry.proof, null, 2));
    setClaimResult('Filled from proofs.json.');
  };

  const handleSwitchChain = async () => {
    if (!targetChainId) return;
    try {
      await switchChainAsync({ chainId: Number(targetChainId) });
    } catch (error) {
      setClaimResult('Network switch cancelled.');
    }
  };

  const handleClaim = async () => {
    if (!isConnected) {
      setClaimResult('Error: Connect wallet first.');
      return;
    }
    if (!isAddress(contractAddress)) {
      setClaimResult('Error: Invalid contract address.');
      return;
    }
    if (!isAddress(recipientAddress)) {
      setClaimResult('Error: Invalid recipient address.');
      return;
    }
    if (!claimAmount.trim()) {
      setClaimResult('Error: Amount is required.');
      return;
    }
    let amount;
    try {
      amount = BigInt(claimAmount.trim());
    } catch (error) {
      setClaimResult('Error: Amount must be a number.');
      return;
    }
    let proof;
    try {
      proof = JSON.parse(claimProof.trim() || '[]');
      if (!Array.isArray(proof)) {
        throw new Error('Proof must be an array.');
      }
    } catch (error) {
      setClaimResult(`Error: Invalid proof: ${error.message}`);
      return;
    }
    if (chainMismatch) {
      setClaimResult('Error: Wrong network. Switch and retry.');
      return;
    }
    if (!publicClient) {
      setClaimResult('Error: No RPC client available.');
      return;
    }
    try {
      setClaimResult('Submitting claim...');
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: AIRDROP_ABI,
        functionName: 'claim',
        args: [recipientAddress, amount, proof],
      });
      setClaimResult(`Transaction sent: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
      setClaimResult('Claim successful.');
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Claim failed';
      if (message.includes('invalid proof')) {
        setClaimResult('Error: Proof error. Verify amount and proof.');
      } else if (message.includes('already claimed')) {
        setClaimResult('Error: Already claimed for this epoch.');
      } else {
        setClaimResult(`Error: ${message}`);
      }
    }
  };

  return (
    <>
      <div className="bg">
        <div className="orb orb-one"></div>
        <div className="orb orb-two"></div>
        <div className="grid"></div>
      </div>

      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">GUA</span>
          <div className="brand-text">
            <span className="title">Airdrop Claim</span>
            <span className="subtitle">Minimal dApp starter</span>
          </div>
        </div>
        <nav className="nav">
          <a href="#home">Home</a>
          <a href="#airdrop">Airdrop</a>
        </nav>
        <ConnectKitButton.Custom>
          {({ show }) => (
            <button className="btn primary" onClick={show}>
              {isConnected ? shortAddress(address) : 'Connect Wallet'}
            </button>
          )}
        </ConnectKitButton.Custom>
      </header>

      <main className="layout">
        <section id="home" className="panel hero">
          <div>
            <p className="eyebrow">Merkle Claim</p>
            <h1>Claim your GUA tokens in seconds.</h1>
            <p className="lede">
              This is a minimal dApp inspired by the Nouns approach: clear navigation,
              wallet-aware actions, and just enough surface to claim your airdrop.
            </p>
          </div>
          <div className="status-card">
            <div className="status-row">
              <span>Wallet</span>
              <span>{isConnected ? 'Connected' : 'Not connected'}</span>
            </div>
            <div className="status-row">
              <span>Address</span>
              <span>{shortAddress(address)}</span>
            </div>
            <div className="status-row">
              <span>Network</span>
              <span>
                {chainId ? `${chainId}${chainMismatch ? ' (mismatch)' : ''}` : '-'}
              </span>
            </div>
            <div className="status-row">
              <span>Claimed</span>
              <span>{claimStatus}</span>
            </div>
            <p className="hint">
              No private keys or seed phrases are ever required. Only approve transactions in your
              wallet.
            </p>
          </div>
        </section>

        <section id="airdrop" className="panel">
          <h2>Configuration</h2>
          <div className="form-grid">
            <label className="field">
              <span>MerkleAirdrop Contract</span>
              <input
                value={contractAddress}
                placeholder="0x..."
                onChange={(event) => setContractAddress(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Target Network</span>
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
              Network mismatch. Please switch to the target network.
              <button
                className="btn ghost"
                onClick={handleSwitchChain}
                disabled={isSwitching}
              >
                {isSwitching ? 'Switching...' : 'Switch Network'}
              </button>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Proofs Source</h2>
          <div className="form-grid">
            <label className="field">
              <span>Proofs URL</span>
              <input
                value={proofsUrl}
                onChange={(event) => setProofsUrl(event.target.value)}
              />
            </label>
            <button className="btn ghost" onClick={loadProofsFromUrl}>
              Load from URL
            </button>
            <label className="field">
              <span>Upload proofs.json</span>
              <input type="file" accept="application/json" onChange={loadProofsFromFile} />
            </label>
          </div>
          <p className="muted">{proofsStatus}</p>
        </section>

        <section className="panel">
          <h2>Claim</h2>
          <div className="form-grid">
            <label className="field">
              <span>Recipient Address</span>
              <input
                value={recipientAddress}
                placeholder="0x..."
                onChange={(event) => setRecipientAddress(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Amount</span>
              <input
                value={claimAmount}
                placeholder="0"
                onChange={(event) => setClaimAmount(event.target.value)}
              />
            </label>
            <label className="field full">
              <span>Proof (JSON array)</span>
              <textarea
                value={claimProof}
                rows="4"
                placeholder='["0xabc...", "0xdef..."]'
                onChange={(event) => setClaimProof(event.target.value)}
              ></textarea>
            </label>
          </div>
          <div className="actions">
            <button className="btn ghost" onClick={fillFromProofs}>
              Auto-fill from proofs.json
            </button>
            <button className="btn primary" onClick={handleClaim} disabled={isClaiming}>
              {isClaiming ? 'Claiming...' : 'Claim Tokens'}
            </button>
          </div>
          <p className="muted">{claimResult}</p>
        </section>

        <section className="panel">
          <h2>Alternative: Direct Contract Call</h2>
          <p className="muted">
            If you prefer not to use this dApp, you can call the contract directly using tools such
            as Foundry or ethers.js.
          </p>
          <pre className="code-block">
            <code>claim(address to, uint256 amount, bytes32[] proof)</code>
          </pre>
        </section>
      </main>
    </>
  );
}
