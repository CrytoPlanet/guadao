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
import { isAddress, parseAbi, formatUnits, parseUnits } from 'viem';

import { defaultChainId, getChainOptions } from '../../lib/appConfig';
import {
  statusReady,
  statusEmpty,
  statusError,
  statusNetworkMismatch,
  statusNoRpc,
  statusInvalidAddress,
  statusInvalidProposal,
  statusTxSubmitted,
  statusTxConfirming,
  statusTxConfirmed,
} from '../../lib/status';
import { useI18n } from '../components/LanguageProvider';
import CopyButton from '../components/CopyButton';
import ExplorerLink from '../components/ExplorerLink';
import StatusNotice from '../components/StatusNotice';

const ESCROW_ABI = parseAbi([
  'function getProposal(uint256 proposalId) view returns (uint64,uint64,uint8,uint8,uint256,uint256,bool,uint256,uint256,uint256,bool,bytes32,bytes32,bytes32,uint256,bool,address,bytes32,bytes32,bool)',
  'function getTopic(uint256 proposalId,uint256 topicId) view returns (address)',
  'function stakeVote(uint256 proposalId,uint256 topicId,uint256 amount)',
]);

const ERC20_ABI = parseAbi([
  'function approve(address spender,uint256 amount) returns (bool)',
  'function allowance(address owner,address spender) view returns (uint256)',
]);

const STATUS_LABELS = {
  zh: ['已创建', '投票中', '投票结束', '已确认', '已提交', '质疑中', '已完成', '已拒绝', '已过期'],
  en: ['Created', 'Voting', 'Voting ended', 'Accepted', 'Submitted', 'Disputed', 'Completed', 'Denied', 'Expired'],
};

const shortAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';

const formatDateTime = (timestamp) => {
  if (!timestamp) return '-';
  const date = new Date(Number(timestamp) * 1000);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const readField = (proposal, name, index) => {
  if (!proposal) return undefined;
  if (Object.prototype.hasOwnProperty.call(proposal, name)) return proposal[name];
  if (Array.isArray(proposal)) return proposal[index];
  return undefined;
};

export default function VotingPage() {
  const { t, lang } = useI18n();
  const chainOptions = useMemo(getChainOptions, []);
  const [targetChainId, setTargetChainId] = useState(defaultChainId || '');
  const [escrowAddress, setEscrowAddress] = useState('');
  const [guaTokenAddress, setGuaTokenAddress] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [voteAmount, setVoteAmount] = useState('');
  const [status, setStatus] = useState(statusReady());
  const [chainTime, setChainTime] = useState(null);
  const [action, setAction] = useState('');
  const [lastTxHash, setLastTxHash] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const publicClient = usePublicClient();

  const chainMismatch = isConnected && targetChainId && chainId !== targetChainId;

  const proposalIdValue = useMemo(() => {
    const trimmed = proposalId.trim();
    if (!trimmed) return null;
    try {
      return BigInt(trimmed);
    } catch (error) {
      return null;
    }
  }, [proposalId]);

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
    // Always update addresses based on the selected chain
    setEscrowAddress(active.escrowAddress || '');
    setGuaTokenAddress(active.guaTokenAddress || '');
  }, [chainOptions, targetChainId]);

  useEffect(() => {
    if (!publicClient) return undefined;
    let active = true;
    const updateTime = async () => {
      try {
        const block = await publicClient.getBlock();
        if (!active) return;
        setChainTime(Number(block.timestamp));
      } catch (error) {
        if (!active) return;
        setChainTime(null);
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [publicClient]);

  const proposalResult = useReadContract({
    address: isAddress(escrowAddress) ? escrowAddress : undefined,
    abi: ESCROW_ABI,
    functionName: 'getProposal',
    args: proposalIdValue !== null ? [proposalIdValue] : undefined,
    query: {
      enabled: isAddress(escrowAddress) && proposalIdValue !== null,
    },
  });

  const allowanceResult = useReadContract({
    address: isAddress(guaTokenAddress) ? guaTokenAddress : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args:
      address && isAddress(escrowAddress)
        ? [address, escrowAddress]
        : undefined,
    query: {
      enabled: isAddress(guaTokenAddress) && Boolean(address) && isAddress(escrowAddress),
    },
  });

  const proposalStatusValue = Number(readField(proposalResult.data, 'status', 3));
  const proposalStatusLabel = STATUS_LABELS[lang]?.[proposalStatusValue] || '-';
  const startTime = readField(proposalResult.data, 'startTime', 0);
  const endTime = readField(proposalResult.data, 'endTime', 1);
  const topicCount = readField(proposalResult.data, 'topicCount', 2);

  useEffect(() => {
    const loadTopics = async () => {
      if (!publicClient || !isAddress(escrowAddress) || proposalIdValue === null) {
        setTopics([]);
        return;
      }
      if (!topicCount || Number(topicCount) === 0) {
        setTopics([]);
        return;
      }
      const count = Number(topicCount);
      const results = [];
      for (let i = 0; i < count; i += 1) {
        try {
          const owner = await publicClient.readContract({
            address: escrowAddress,
            abi: ESCROW_ABI,
            functionName: 'getTopic',
            args: [proposalIdValue, BigInt(i)],
          });
          results.push({ id: i, owner });
        } catch (error) {
          results.push({ id: i, owner: null });
        }
      }
      setTopics(results);
    };

    loadTopics();
  }, [publicClient, escrowAddress, proposalIdValue, topicCount]);

  const canVote =
    isConnected &&
    proposalStatusValue === 1 &&
    chainTime !== null &&
    startTime !== undefined &&
    endTime !== undefined &&
    chainTime >= Number(startTime) &&
    chainTime < Number(endTime);

  const allowanceValue = allowanceResult.data ?? 0n;
  const steps = [
    { label: t('voting.guide.connect'), done: isConnected },
    { label: t('voting.guide.pick'), done: Boolean(selectedTopic) },
    { label: t('voting.guide.approve'), done: allowanceValue > 0n },
    { label: t('voting.guide.submit'), done: status.kind === 'success' },
  ];

  const handleSwitchChain = async () => {
    if (!targetChainId) return;
    try {
      await switchChainAsync({ chainId: Number(targetChainId) });
    } catch (error) {
      setStatus(statusNetworkMismatch());
    }
  };

  const handleApprove = async () => {
    if (!isConnected) {
      setStatus(statusError('airdrop.status.disconnected'));
      return;
    }
    if (!isAddress(guaTokenAddress) || !isAddress(escrowAddress)) {
      setStatus(statusInvalidAddress());
      return;
    }
    if (!voteAmount.trim()) {
      setStatus(statusError('voting.amount.label'));
      return;
    }
    if (chainMismatch) {
      setStatus(statusNetworkMismatch());
      return;
    }
    if (!publicClient) {
      setStatus(statusNoRpc());
      return;
    }

    let amount;
    try {
      amount = parseUnits(voteAmount.trim(), 18);
    } catch (error) {
      setStatus(statusError('voting.amount.label'));
      return;
    }

    try {
      setAction('approve');
      setStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: guaTokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [escrowAddress, amount],
      });
      setLastTxHash(hash);
      setStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(statusTxConfirmed());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Approve failed';
      setStatus(statusError('status.error', { message }));
    } finally {
      setAction('');
    }
  };

  const handleVote = async () => {
    if (proposalIdValue === null) {
      setStatus(statusInvalidProposal());
      return;
    }
    if (!isConnected) {
      setStatus(statusError('airdrop.status.disconnected'));
      return;
    }
    if (!isAddress(escrowAddress)) {
      setStatus(statusInvalidAddress());
      return;
    }
    if (!selectedTopic) {
      setStatus(statusError('voting.topic.select'));
      return;
    }
    if (!voteAmount.trim()) {
      setStatus(statusError('voting.amount.label'));
      return;
    }
    if (!canVote) {
      setStatus(statusError('voting.window.closed'));
      return;
    }
    if (chainMismatch) {
      setStatus(statusNetworkMismatch());
      return;
    }
    if (!publicClient) {
      setStatus(statusNoRpc());
      return;
    }

    let amount;
    try {
      amount = parseUnits(voteAmount.trim(), 18);
    } catch (error) {
      setStatus(statusError('voting.amount.label'));
      return;
    }

    try {
      setAction('vote');
      setStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'stakeVote',
        args: [proposalIdValue, BigInt(selectedTopic), amount],
      });
      setLastTxHash(hash);
      setStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(statusTxConfirmed());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Vote failed';
      setStatus(statusError('status.error', { message }));
    } finally {
      setAction('');
    }
  };

  return (
    <main className="layout">
      <section className="panel hero">
        <div>
          <p className="eyebrow">{t('voting.eyebrow')}</p>
          <h1>{t('voting.title')}</h1>
          <p className="lede">{t('voting.lede')}</p>
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
            <span>{t('admin.statusLabel')}</span>
            <span>{proposalStatusLabel}</span>
          </div>
          <div className="status-row">
            <span>{t('voting.window.start')}</span>
            <span>{formatDateTime(startTime)}</span>
          </div>
          <div className="status-row">
            <span>{t('voting.window.end')}</span>
            <span>{formatDateTime(endTime)}</span>
          </div>
          <div className="status-row">
            <span>{t('voting.config.topicCount')}</span>
            <span>{topicCount ? topicCount.toString() : '-'}</span>
          </div>
          <p className="hint">{canVote ? t('status.ready') : t('voting.window.closed')}</p>
        </div>
      </section>

      <section className="panel">
        <h2>{t('voting.guide.title')}</h2>
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

      <section className="panel">
        <h2>{t('voting.config.title')}</h2>
        <div className="form-grid">
          {showAdvanced && (
            <label className="field">
              <span>{t('voting.config.contract')}</span>
              <input
                value={escrowAddress}
                placeholder="0x..."
                onChange={(event) => setEscrowAddress(event.target.value)}
              />
              <ExplorerLink
                chainId={chainId}
                type="address"
                value={escrowAddress}
                label={t('status.contract.link')}
              />
            </label>
          )}
          {showAdvanced && (
            <label className="field">
              <span>{t('voting.config.token')}</span>
              <input
                value={guaTokenAddress}
                placeholder="0x..."
                onChange={(event) => setGuaTokenAddress(event.target.value)}
              />
            </label>
          )}
          <label className="field">
            <span>{t('voting.config.network')}</span>
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
          <label className="field">
            <span>{t('voting.config.proposal')}</span>
            <input
              value={proposalId}
              placeholder="0"
              onChange={(event) => setProposalId(event.target.value)}
            />
          </label>
        </div>
        {chainMismatch && (
          <div className="notice">
            {t('status.networkMismatch')}
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

      <section className="panel">
        <h2>{t('voting.topic.title')}</h2>
        {topics.length === 0 ? (
          <StatusNotice status={statusEmpty()} />
        ) : (
          <div className="status-grid">
            {topics.map((topic) => (
              <label key={topic.id} className="status-row">
                <span>
                  {t('voting.topic.select')} #{topic.id}
                </span>
                <span className="inline-group">
                  {shortAddress(topic.owner)}
                  <CopyButton value={topic.owner} />
                  <input
                    type="radio"
                    name="topic"
                    value={topic.id}
                    checked={String(selectedTopic) === String(topic.id)}
                    onChange={() => setSelectedTopic(String(topic.id))}
                  />
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>{t('voting.submit')}</h2>
        <div className="form-grid">
          <label className="field">
            <span>{t('voting.amount.label')}</span>
            <input
              value={voteAmount}
              placeholder={t('voting.amount.placeholder')}
              onChange={(event) => setVoteAmount(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('voting.allowance.label')}</span>
            <input
              value={formatUnits(allowanceValue, 18)}
              readOnly
            />
          </label>
        </div>
        {!showAdvanced && <p className="hint">{t('voting.submit.hint')}</p>}
        <div className="actions">
          <button
            className="btn ghost"
            onClick={handleApprove}
            disabled={isWriting || action === 'approve'}
          >
            {action === 'approve' ? t('voting.submitting') : t('voting.approve')}
          </button>
          <button
            className="btn primary"
            onClick={handleVote}
            disabled={isWriting || action === 'vote' || !canVote}
          >
            {action === 'vote' ? t('voting.submitting') : t('voting.submit')}
          </button>
        </div>
        <StatusNotice status={status} />
        <div className="status-row">
          <span>{t('status.tx.latest')}</span>
          <span className="inline-group">
            {lastTxHash || '-'}
            <ExplorerLink chainId={chainId} type="tx" value={lastTxHash} />
          </span>
        </div>
      </section>
    </main>
  );
}
