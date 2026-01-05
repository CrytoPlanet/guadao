"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  usePublicClient,
} from 'wagmi';
import { isAddress, parseAbi } from 'viem';

import { defaultChainId, getChainOptions } from '../../../lib/appConfig';
import {
  statusReady,
  statusLoading,
  statusLoaded,
  statusEmpty,
  statusError,
  statusNetworkMismatch,
  statusNoRpc,
  statusInvalidAddress,
  statusInvalidProposal,
} from '../../../lib/status';
import { useI18n } from '../../components/LanguageProvider';
import CopyButton from '../../components/CopyButton';
import ExplorerLink from '../../components/ExplorerLink';
import StatusNotice from '../../components/StatusNotice';

const ESCROW_ABI = parseAbi([
  'function getProposal(uint256 proposalId) view returns (uint64,uint64,uint8,uint8,uint256,uint256,bool,uint256,uint256,uint256,bool,bytes32,bytes32,bytes32,uint256,bool,address,bytes32,bytes32,bool)',
  'function getTopic(uint256 proposalId,uint256 topicId) view returns (address)',
]);

const ESCROW_EVENTS_ABI = parseAbi([
  'event ProposalCreated(uint256 indexed proposalId,uint64 startTime,uint64 endTime,uint256[] topicIds,address[] topicOwners)',
  'event Voted(address indexed voter,uint256 indexed proposalId,uint256 indexed topicId,uint256 amount)',
  'event VotingFinalized(uint256 indexed proposalId,uint256 winnerTopicId,uint256 totalPool)',
  'event WinnerConfirmed(uint256 indexed proposalId,uint256 indexed winnerTopicId,address indexed winnerOwner,uint256 payout10,uint256 submitDeadline)',
  'event DeliverySubmitted(uint256 indexed proposalId,address indexed submitter,bytes32 youtubeUrlHash,bytes32 videoIdHash,bytes32 pinnedCodeHash,uint256 challengeWindowEnd)',
  'event DeliveryChallenged(uint256 indexed proposalId,address indexed challenger,bytes32 reasonHash,bytes32 evidenceHash)',
  'event DisputeResolved(uint256 indexed proposalId,address indexed resolver,bool approved)',
  'event Expired(uint256 indexed proposalId,uint256 amount)',
]);

const STATUS_LABELS = {
  zh: ['已创建', '投票中', '投票结束', '已确认', '已提交', '质疑中', '已完成', '已拒绝', '已过期'],
  en: ['Created', 'Voting', 'Voting ended', 'Accepted', 'Submitted', 'Disputed', 'Completed', 'Denied', 'Expired'],
};

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

const formatLogLabel = (log) => {
  if (!log?.eventName) return 'Event';
  return log.eventName;
};

const formatArgValue = (value) => {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return `[${value.map((item) => formatArgValue(item)).join(', ')}]`;
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '-';
  return String(value);
};

const formatArgs = (args) => {
  if (!args) return [];
  return Object.entries(args).map(([key, value]) => ({
    key,
    value: formatArgValue(value),
  }));
};

export default function ProposalDetailPage() {
  const { t, lang } = useI18n();
  const params = useParams();
  const chainOptions = useMemo(getChainOptions, []);
  const [targetChainId, setTargetChainId] = useState(defaultChainId || '');
  const [escrowAddress, setEscrowAddress] = useState('');
  const [fromBlock, setFromBlock] = useState('');
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState(statusReady());

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const publicClient = usePublicClient();

  const proposalIdValue = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    try {
      return BigInt(raw);
    } catch (error) {
      return null;
    }
  }, [params]);

  const chainMismatch = isConnected && targetChainId && chainId !== targetChainId;

  useEffect(() => {
    const active = chainOptions.find((item) => item.id === Number(targetChainId));
    if (!active) return;
    setEscrowAddress((current) => current || active.escrowAddress || '');
  }, [chainOptions, targetChainId]);

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

  const proposalStatusValue = Number(readField(proposalResult.data, 'status', 3));
  const proposalStatusLabel = STATUS_LABELS[lang]?.[proposalStatusValue] || '-';
  const submitDeadline = readField(proposalResult.data, 'submitDeadline', 7);
  const challengeWindowEnd = readField(proposalResult.data, 'challengeWindowEnd', 14);
  const remaining90 = readField(proposalResult.data, 'remaining90', 9);

  const handleSwitchChain = async () => {
    if (!targetChainId) return;
    try {
      await switchChainAsync({ chainId: Number(targetChainId) });
    } catch (error) {
      setStatus(statusNetworkMismatch());
    }
  };

  const loadEvents = async () => {
    if (!publicClient) {
      setStatus(statusNoRpc());
      return;
    }
    if (!isAddress(escrowAddress)) {
      setStatus(statusInvalidAddress());
      return;
    }
    if (proposalIdValue === null) {
      setStatus(statusInvalidProposal());
      return;
    }
    if (chainMismatch) {
      setStatus(statusNetworkMismatch());
      return;
    }

    let fromBlockValue = 0n;
    if (fromBlock.trim()) {
      try {
        fromBlockValue = BigInt(fromBlock.trim());
      } catch (error) {
        setStatus(statusError('proposals.config.fromBlock'));
        return;
      }
    }

    try {
      setStatus(statusLoading());
      const logs = await Promise.all(
        ESCROW_EVENTS_ABI.map((event) =>
          publicClient.getLogs({
            address: escrowAddress,
            event,
            args: { proposalId: proposalIdValue },
            fromBlock: fromBlockValue,
          })
        )
      );

      const flattened = logs.flat();
      flattened.sort((a, b) => {
        if (a.blockNumber === b.blockNumber) {
          return Number(a.logIndex - b.logIndex);
        }
        return Number(a.blockNumber - b.blockNumber);
      });

      setEvents(flattened);
      setStatus(flattened.length ? statusLoaded() : statusEmpty());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Load failed';
      setStatus(statusError('status.error', { message }));
    }
  };

  return (
    <main className="layout">
      <section className="panel hero">
        <div>
          <p className="eyebrow">{t('proposal.detail.eyebrow')}</p>
          <h1>
            {t('proposal.detail.title')}
            {proposalIdValue?.toString() || '-'}
          </h1>
          <p className="lede">{t('proposal.detail.lede')}</p>
        </div>
        <div className="status-card">
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
          <p className="hint">{t('status.ready')}</p>
        </div>
      </section>

      <section className="panel">
        <h2>{t('proposals.config.title')}</h2>
        <div className="form-grid">
          <label className="field">
            <span>{t('proposals.config.contract')}</span>
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
          <label className="field">
            <span>{t('proposals.config.network')}</span>
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
            <span>{t('proposals.config.fromBlock')}</span>
            <input
              value={fromBlock}
              placeholder="0"
              onChange={(event) => setFromBlock(event.target.value)}
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
        <h2>{t('proposal.detail.fields')}</h2>
        <div className="status-grid">
          <div className="status-row">
            <span>{t('escrow.summary.status')}</span>
            <span>{proposalStatusLabel}</span>
          </div>
          <div className="status-row">
            <span>{t('term.submitDeadline')}</span>
            <span>{formatDateTime(submitDeadline)}</span>
          </div>
          <div className="status-row">
            <span>{t('term.challengeWindow')}</span>
            <span>{formatDateTime(challengeWindowEnd)}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>{t('proposal.detail.events')}</h2>
        <div className="actions">
          <button className="btn primary" onClick={loadEvents}>
            {t('proposal.detail.loadEvents')}
          </button>
        </div>
        <StatusNotice status={status} />
        {events.length === 0 ? (
          <p className="muted">{t('proposal.detail.noEvents')}</p>
        ) : (
          <div className="status-grid">
            {events.map((log) => (
              <div key={`${log.blockNumber}-${log.logIndex}`} className="event-card">
                <div className="status-row">
                  <span>{formatLogLabel(log)}</span>
                  <span>#{log.blockNumber?.toString()}</span>
                </div>
                <div className="event-params">
                  <div className="muted">{t('proposal.detail.eventParams')}</div>
                  {formatArgs(log.args).map((item) => (
                    <div key={item.key} className="event-param">
                      <span>{item.key}</span>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
