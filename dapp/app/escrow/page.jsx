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
import { isAddress, parseAbi, keccak256, toHex } from 'viem';

import { defaultChainId, getChainOptions } from '../../lib/appConfig';
import {
  statusReady,
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
  'function submitDelivery(uint256 proposalId,bytes32 youtubeUrlHash,bytes32 videoIdHash,bytes32 pinnedCodeHash)',
  'function challengeDelivery(uint256 proposalId,bytes32 reasonHash,bytes32 evidenceHash)',
  'function finalizeDelivery(uint256 proposalId)',
  'function expireIfNoSubmission(uint256 proposalId)',
]);

const ERC20_ABI = parseAbi([
  'function approve(address spender,uint256 amount) returns (bool)',
  'function allowance(address owner,address spender) view returns (uint256)',
]);

const STATUS_LABELS = {
  zh: ['已创建', '投票中', '投票结束', '已确认', '已提交', '质疑中', '已完成', '已拒绝', '已过期'],
  en: ['Created', 'Voting', 'Voting ended', 'Accepted', 'Submitted', 'Disputed', 'Completed', 'Denied', 'Expired'],
};

const BOND_AMOUNT = 10_000n * 10n ** 18n;

const shortAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';

const toBytes32Hash = (value) => {
  const text = value?.trim() || '';
  return keccak256(toHex(text));
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return '-';
  const date = new Date(Number(timestamp) * 1000);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const makeNonce = () => {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    return `${Date.now().toString(16)}${Math.floor(Math.random() * 1e6).toString(16)}`;
  }
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const readField = (proposal, name, index) => {
  if (!proposal) return undefined;
  if (Object.prototype.hasOwnProperty.call(proposal, name)) return proposal[name];
  if (Array.isArray(proposal)) return proposal[index];
  return undefined;
};

export default function EscrowPage() {
  const { t, lang } = useI18n();
  const chainOptions = useMemo(getChainOptions, []);
  const [targetChainId, setTargetChainId] = useState(defaultChainId || '');
  const [escrowAddress, setEscrowAddress] = useState('');
  const [guaTokenAddress, setGuaTokenAddress] = useState('');
  const [proposalId, setProposalId] = useState('');
  const [status, setStatus] = useState(statusReady());
  const [chainTime, setChainTime] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [pinnedComment, setPinnedComment] = useState('');
  const [templateNonce, setTemplateNonce] = useState('');
  const [challengeReason, setChallengeReason] = useState('');
  const [challengeEvidence, setChallengeEvidence] = useState('');
  const [escrowAction, setEscrowAction] = useState('');
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

  const winnerTopicId = readField(proposalResult.data, 'winnerTopicId', 4);

  const winnerTopicResult = useReadContract({
    address: isAddress(escrowAddress) ? escrowAddress : undefined,
    abi: ESCROW_ABI,
    functionName: 'getTopic',
    args:
      proposalIdValue !== null && winnerTopicId !== undefined
        ? [proposalIdValue, BigInt(winnerTopicId)]
        : undefined,
    query: {
      enabled:
        isAddress(escrowAddress) &&
        proposalIdValue !== null &&
        winnerTopicId !== undefined,
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
  const statusValue = Number.isFinite(proposalStatusValue) ? proposalStatusValue : -1;
  const proposalStatusLabel = STATUS_LABELS[lang]?.[proposalStatusValue] || '-';
  const submitDeadline = readField(proposalResult.data, 'submitDeadline', 7);
  const challengeWindowEnd = readField(proposalResult.data, 'challengeWindowEnd', 14);
  const remaining90 = readField(proposalResult.data, 'remaining90', 9);
  const winnerTopicLabel =
    winnerTopicId !== undefined ? winnerTopicId.toString() : '-';

  const templateText =
    proposalIdValue !== null
      ? `GUA-DELIVER:${proposalIdValue.toString()}:${winnerTopicLabel}:${winnerTopicResult.data || '0x...'
      }:${templateNonce || 'nonce'}`
      : '';

  const youtubeHash = youtubeUrl.trim() ? toBytes32Hash(youtubeUrl) : '';
  const videoIdHash = videoId.trim() ? toBytes32Hash(videoId) : '';
  const pinnedHash = pinnedComment.trim() ? toBytes32Hash(pinnedComment) : '';

  const canSubmitDelivery =
    isConnected &&
    statusValue === 3 &&
    chainTime !== null &&
    submitDeadline !== undefined &&
    chainTime <= Number(submitDeadline);

  const canChallenge =
    isConnected &&
    statusValue === 4 &&
    chainTime !== null &&
    challengeWindowEnd !== undefined &&
    chainTime < Number(challengeWindowEnd);

  const canFinalizeDelivery =
    isConnected &&
    statusValue === 4 &&
    chainTime !== null &&
    challengeWindowEnd !== undefined &&
    chainTime >= Number(challengeWindowEnd);

  const canExpire =
    isConnected &&
    statusValue === 3 &&
    chainTime !== null &&
    submitDeadline !== undefined &&
    chainTime > Number(submitDeadline);

  const allowanceValue = allowanceResult.data ?? 0n;
  const hasBondAllowance = allowanceValue >= BOND_AMOUNT;

  const guideSteps = [
    { label: t('escrow.guide.connect'), done: isConnected },
    { label: t('escrow.guide.pick'), done: proposalIdValue !== null },
    { label: t('escrow.guide.submit'), done: statusValue >= 4 },
    { label: t('escrow.guide.settle'), done: statusValue >= 6 },
  ];

  const handleSwitchChain = async () => {
    if (!targetChainId) return;
    try {
      await switchChainAsync({ chainId: Number(targetChainId) });
    } catch (error) {
      setStatus(statusNetworkMismatch());
    }
  };

  const handleApproveBond = async () => {
    if (!isConnected) {
      setStatus(statusError('airdrop.status.disconnected'));
      return;
    }
    if (!isAddress(guaTokenAddress) || !isAddress(escrowAddress)) {
      setStatus(statusInvalidAddress());
      return;
    }
    if (!publicClient) {
      setStatus(statusNoRpc());
      return;
    }
    if (chainMismatch) {
      setStatus(statusNetworkMismatch());
      return;
    }
    try {
      setEscrowAction('approve');
      setStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: guaTokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [escrowAddress, BOND_AMOUNT],
      });
      setLastTxHash(hash);
      setStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(statusTxConfirmed());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Approve failed';
      setStatus(statusError('status.error', { message }));
    } finally {
      setEscrowAction('');
    }
  };

  const handleSubmitDelivery = async () => {
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
    if (!youtubeUrl.trim() || !videoId.trim() || !pinnedComment.trim()) {
      setStatus(statusError('escrow.delivery.title'));
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
    try {
      setEscrowAction('submit');
      setStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'submitDelivery',
        args: [
          proposalIdValue,
          toBytes32Hash(youtubeUrl),
          toBytes32Hash(videoId),
          toBytes32Hash(pinnedComment),
        ],
      });
      setLastTxHash(hash);
      setStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(statusTxConfirmed());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Submit failed';
      setStatus(statusError('status.error', { message }));
    } finally {
      setEscrowAction('');
    }
  };

  const handleChallenge = async () => {
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
    if (!hasBondAllowance) {
      setStatus(statusError('escrow.challenge.approveBond'));
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
    try {
      setEscrowAction('challenge');
      setStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'challengeDelivery',
        args: [
          proposalIdValue,
          toBytes32Hash(challengeReason),
          toBytes32Hash(challengeEvidence),
        ],
      });
      setLastTxHash(hash);
      setStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(statusTxConfirmed());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Challenge failed';
      setStatus(statusError('status.error', { message }));
    } finally {
      setEscrowAction('');
    }
  };

  const handleFinalizeDelivery = async () => {
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
    if (chainMismatch) {
      setStatus(statusNetworkMismatch());
      return;
    }
    if (!publicClient) {
      setStatus(statusNoRpc());
      return;
    }
    try {
      setEscrowAction('finalize');
      setStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'finalizeDelivery',
        args: [proposalIdValue],
      });
      setLastTxHash(hash);
      setStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(statusTxConfirmed());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Finalize failed';
      setStatus(statusError('status.error', { message }));
    } finally {
      setEscrowAction('');
    }
  };

  const handleExpire = async () => {
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
    if (chainMismatch) {
      setStatus(statusNetworkMismatch());
      return;
    }
    if (!publicClient) {
      setStatus(statusNoRpc());
      return;
    }
    try {
      setEscrowAction('expire');
      setStatus(statusTxSubmitted());
      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'expireIfNoSubmission',
        args: [proposalIdValue],
      });
      setLastTxHash(hash);
      setStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(statusTxConfirmed());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Expire failed';
      setStatus(statusError('status.error', { message }));
    } finally {
      setEscrowAction('');
    }
  };

  return (
    <main className="layout">
      <section className="panel hero">
        <div>
          <p className="eyebrow">{t('escrow.eyebrow')}</p>
          <h1>{t('escrow.title')}</h1>
          <p className="lede">{t('escrow.lede')}</p>
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
            <span>{t('escrow.summary.status')}</span>
            <span>{proposalStatusLabel}</span>
          </div>
          <div className="status-row">
            <span>{t('airdrop.status.network')}</span>
            <span>{chainId ? chainId : '-'}</span>
          </div>
          <div className="status-row">
            <span>{t('term.submitDeadline')}</span>
            <span>{formatDateTime(submitDeadline)}</span>
          </div>
          <div className="status-row">
            <span>{t('term.challengeWindow')}</span>
            <span>{formatDateTime(challengeWindowEnd)}</span>
          </div>
          <p className="hint">{t('escrow.status.title')}</p>
        </div>
      </section>

      <section className="panel">
        <h2>{t('escrow.guide.title')}</h2>
        <div className="guide">
          {guideSteps.map((step, index) => (
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
        <h2>{t('escrow.config.title')}</h2>
        <div className="form-grid">
          {showAdvanced && (
            <label className="field">
              <span>{t('escrow.config.contract')}</span>
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
              <span>{t('escrow.config.token')}</span>
              <input
                value={guaTokenAddress}
                placeholder="0x..."
                onChange={(event) => setGuaTokenAddress(event.target.value)}
              />
            </label>
          )}
          <label className="field">
            <span>{t('escrow.config.network')}</span>
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
            <span>{t('escrow.config.proposal')}</span>
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
        <h2>{t('escrow.summary.title')}</h2>
        <div className="status-grid">
          <div className="status-row">
            <span>{t('escrow.summary.status')}</span>
            <span>{proposalStatusLabel}</span>
          </div>
          <div className="status-row">
            <span>{t('escrow.summary.winner')}</span>
            <span className="inline-group">
              {shortAddress(winnerTopicResult.data)}
              <CopyButton value={winnerTopicResult.data} />
            </span>
          </div>
          <div className="status-row">
            <span>{t('escrow.summary.remaining')}</span>
            <span>{remaining90 !== undefined ? remaining90.toString() : '-'}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{t('escrow.delivery.title')}</h2>
        <p className="hint">{t('escrow.delivery.hint')}</p>
        <div className="status-grid">
          <div className="status-row">
            <span>{t('escrow.delivery.template.title')}</span>
            <span className="inline-group">
              <button
                className="btn ghost"
                type="button"
                onClick={() => setTemplateNonce(makeNonce())}
              >
                {t('escrow.delivery.template.generate')}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setPinnedComment(templateText)}
                disabled={!templateText}
              >
                {t('escrow.delivery.template.apply')}
              </button>
            </span>
          </div>
          <div className="status-row">
            <span>{t('escrow.delivery.template.nonce')}</span>
            <span>{templateNonce || '-'}</span>
          </div>
          <div className="status-row">
            <span>{t('escrow.delivery.template.label')}</span>
            <span className="inline-group">
              <code>{templateText || '-'}</code>
              <CopyButton value={templateText} />
            </span>
          </div>
        </div>
        <p className="hint">{t('escrow.delivery.template.help')}</p>
        <div className="form-grid">
          <label className="field full">
            <span>{t('escrow.delivery.youtube')}</span>
            <input
              value={youtubeUrl}
              placeholder="https://youtu.be/..."
              onChange={(event) => setYoutubeUrl(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('escrow.delivery.videoId')}</span>
            <input
              value={videoId}
              placeholder="YouTube video id"
              onChange={(event) => setVideoId(event.target.value)}
            />
          </label>
          <label className="field full">
            <span>{t('escrow.delivery.pinned')}</span>
            <textarea
              rows="2"
              value={pinnedComment}
              placeholder="GUA-DELIVER:..."
              onChange={(event) => setPinnedComment(event.target.value)}
            ></textarea>
          </label>
        </div>
        <div className="status-grid">
          <div className="status-row">
            <span>{t('escrow.delivery.hash.youtube')}</span>
            <span className="inline-group">
              {youtubeHash || '-'}
              <CopyButton value={youtubeHash} />
            </span>
          </div>
          <div className="status-row">
            <span>{t('escrow.delivery.hash.videoId')}</span>
            <span className="inline-group">
              {videoIdHash || '-'}
              <CopyButton value={videoIdHash} />
            </span>
          </div>
          <div className="status-row">
            <span>{t('escrow.delivery.hash.pinned')}</span>
            <span className="inline-group">
              {pinnedHash || '-'}
              <CopyButton value={pinnedHash} />
            </span>
          </div>
        </div>
        <div className="actions">
          <button
            className="btn primary"
            onClick={handleSubmitDelivery}
            disabled={isWriting || !canSubmitDelivery}
          >
            {escrowAction === 'submit' ? t('escrow.delivery.submitting') : t('escrow.delivery.submit')}
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

      {showAdvanced && (
        <section className="panel">
          <h2>{t('escrow.challenge.title')}</h2>
          <p className="hint">{t('term.challengeWindow.help')}</p>
          <p className="hint">{t('term.bond')}</p>
          <div className="form-grid">
            <label className="field full">
              <span>{t('escrow.challenge.reason')}</span>
              <input
                value={challengeReason}
                placeholder={t('ui.optional')}
                onChange={(event) => setChallengeReason(event.target.value)}
              />
            </label>
            <label className="field full">
              <span>{t('escrow.challenge.evidence')}</span>
              <input
                value={challengeEvidence}
                placeholder={t('ui.optional')}
                onChange={(event) => setChallengeEvidence(event.target.value)}
              />
            </label>
          </div>
          <div className="actions">
            <button
              className="btn ghost"
              onClick={handleApproveBond}
              disabled={isWriting || escrowAction === 'approve' || !isConnected}
            >
              {hasBondAllowance ? t('escrow.challenge.approved') : t('escrow.challenge.approveBond')}
            </button>
            <button
              className="btn ghost"
              onClick={handleChallenge}
              disabled={isWriting || !canChallenge || !hasBondAllowance}
            >
              {escrowAction === 'challenge' ? t('escrow.challenge.submitting') : t('escrow.challenge.submit')}
            </button>
          </div>
        </section>
      )}

      {showAdvanced && (
        <section className="panel">
          <h2>{t('escrow.settlement.title')}</h2>
          <p className="hint">{t('term.submitDeadline.help')}</p>
          <div className="actions">
            <button
              className="btn primary"
              onClick={handleFinalizeDelivery}
              disabled={isWriting || !canFinalizeDelivery}
            >
              {escrowAction === 'finalize' ? t('escrow.settlement.finalizing') : t('escrow.settlement.finalize')}
            </button>
            <button
              className="btn ghost"
              onClick={handleExpire}
              disabled={isWriting || !canExpire}
            >
              {escrowAction === 'expire' ? t('escrow.settlement.expiring') : t('escrow.settlement.expire')}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
