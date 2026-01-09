"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  usePublicClient,
} from 'wagmi';
import { isAddress, parseAbi, formatUnits, parseUnits, keccak256, toHex } from 'viem';

import { defaultChainId, getChainOptions } from '../../../lib/appConfig';
import { bytes32ToCid, fetchFromIPFS } from '../../../lib/ipfs';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import {
  statusReady,
  statusLoading,
  statusLoaded,
  statusEmpty,
  statusError,
  statusNetworkMismatch,
  statusNoRpc,
  statusInvalidAddress,
  statusTxSubmitted,
  statusTxConfirming,
  statusTxConfirmed,
} from '../../../lib/status';
import { useI18n } from '../../components/LanguageProvider';
import CopyButton from '../../components/CopyButton';
import ExplorerLink from '../../components/ExplorerLink';
import StatusNotice from '../../components/StatusNotice';
import ProposalTimeline from '../../../components/ProposalTimeline';
import ConfirmModal from '../../../components/ConfirmModal';
import DisabledButton from '../../../components/DisabledButton';
import GasEstimate from '../../../components/GasEstimate';
import ScrollProgress from '../../components/ScrollProgress';

const ESCROW_ABI = parseAbi([
  'function getProposal(uint256 proposalId) view returns (uint64,uint64,uint8,uint8,uint256,uint256,bool,uint256,uint256,uint256,bool,bytes32,bytes32,bytes32,uint256,bool,address,bytes32,bytes32,bool,address,bool,bool,bytes32)',
  'function getTopic(uint256 proposalId,uint256 topicId) view returns ((address owner, bytes32 contentCid))',
  'function stakeVote(uint256 proposalId,uint256 topicId,uint256 amount)',
  'function submitDelivery(uint256 proposalId,bytes32 youtubeUrlHash,bytes32 videoIdHash,bytes32 pinnedCodeHash)',
  'function challengeDelivery(uint256 proposalId,bytes32 reasonHash,bytes32 evidenceHash)',
  'function finalizeDelivery(uint256 proposalId)',
  'function expireIfNoSubmission(uint256 proposalId)',
  'function finalizeVoting(uint256 proposalId)',
  'function confirmWinnerAndPay10(uint256 proposalId)',
  'function resolveDispute(uint256 proposalId,bool approve)',
  'function owner() view returns (address)',
]);

const ERC20_ABI = parseAbi([
  'function approve(address spender,uint256 amount) returns (bool)',
  'function allowance(address owner,address spender) view returns (uint256)',
]);

const ESCROW_EVENTS_ABI = parseAbi([
  'event ProposalCreated(uint256 indexed proposalId,uint64 startTime,uint64 endTime,uint256[] topicIds,address[] topicOwners,bytes32[] contentCids,bytes32 metadata,address indexed creator)',
  'event DepositRefunded(uint256 indexed proposalId,address indexed creator,uint256 amount)',
  'event DepositConfiscated(uint256 indexed proposalId,address indexed creator,uint256 amount)',
  'event ProposalMarkedSpam(uint256 indexed proposalId)',
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

const shortAddress = (address) =>
  (address && typeof address === 'string') ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';

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

const toBytes32Hash = (value) => {
  const text = value?.trim() || '';
  return keccak256(toHex(text));
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
  const [guaTokenAddress, setGuaTokenAddress] = useState('');

  const [events, setEvents] = useState([]);
  const [proposalMetadata, setProposalMetadata] = useState(null);
  const [status, setStatus] = useState(statusReady());
  const [topics, setTopics] = useState([]);
  const [expandedTopics, setExpandedTopics] = useState({});
  const [selectedTopic, setSelectedTopic] = useState('');
  const [voteAmount, setVoteAmount] = useState('');
  const [chainTime, setChainTime] = useState(null);
  const [action, setAction] = useState('');
  const [lastTxHash, setLastTxHash] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Delivery fields
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [pinnedComment, setPinnedComment] = useState('');

  // Challenge fields
  const [challengeReason, setChallengeReason] = useState('');
  const [challengeEvidence, setChallengeEvidence] = useState('');

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
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

  const activeChainConfig = useMemo(() => {
    return chainOptions.find((item) => item.id === Number(targetChainId));
  }, [chainOptions, targetChainId]);

  const chainMismatch = isConnected && targetChainId && chainId !== targetChainId;

  // Sync targetChainId with wallet chainId
  useEffect(() => {
    if (chainId && chainOptions.some(c => c.id === chainId)) {
      setTargetChainId(chainId);
    }
  }, [chainId, chainOptions]);

  // Initialize addresses from config
  useEffect(() => {
    const active = chainOptions.find((item) => item.id === Number(targetChainId));
    if (!active) return;
    setEscrowAddress(active.escrowAddress || '');
    setGuaTokenAddress(active.guaTokenAddress || '');
  }, [chainOptions, targetChainId]);

  // Update chain time
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

  const fetchEvents = useCallback(async () => {
    if (!publicClient || !isAddress(escrowAddress) || proposalIdValue === null) {
      return;
    }

    try {
      // Don't set global loading status here to avoid flickering logic,
      // or key it differently. For now, we only set 'loaded' or 'error'.
      // If we are refreshing, we might not want to show full page loading state.
      const logs = await Promise.all(
        ESCROW_EVENTS_ABI.map((event) =>
          publicClient.getLogs({
            address: escrowAddress,
            event,
            args: { proposalId: proposalIdValue },
            fromBlock: activeChainConfig?.startBlock ? BigInt(activeChainConfig.startBlock) : 0n,
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
      // Only update status if it's currently loading or empty
      setStatus((prev) => {
        if (prev?.kind === 'loading') return flattened.length ? statusLoaded() : statusEmpty();
        return prev;
      });
    } catch (error) {
      console.error('Fetch events failed', error);
    }
  }, [publicClient, escrowAddress, proposalIdValue, activeChainConfig]);

  // Auto-load events
  useEffect(() => {
    setStatus(statusLoading());
    fetchEvents().then(() => {
      // Initial load
    });
  }, [fetchEvents]);


  // Proposal data
  const proposalResult = useReadContract({
    address: isAddress(escrowAddress) ? escrowAddress : undefined,
    abi: ESCROW_ABI,
    functionName: 'getProposal',
    args: proposalIdValue !== null ? [proposalIdValue] : undefined,
    query: {
      enabled: isAddress(escrowAddress) && proposalIdValue !== null,
    },
  });

  // Contract owner (admin)
  const ownerResult = useReadContract({
    address: isAddress(escrowAddress) ? escrowAddress : undefined,
    abi: ESCROW_ABI,
    functionName: 'owner',
    query: {
      enabled: isAddress(escrowAddress),
    },
  });

  const isAdmin = address && ownerResult.data && address.toLowerCase() === ownerResult.data.toLowerCase();

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

  // Allowance for voting
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
  const submitDeadline = readField(proposalResult.data, 'submitDeadline', 7);
  const challengeWindowEnd = readField(proposalResult.data, 'challengeWindowEnd', 14);
  const remaining90 = readField(proposalResult.data, 'remaining90', 9);
  const metadataHash = readField(proposalResult.data, 'metadata', 23);

  // Fetch Proposal Metadata
  useEffect(() => {
    if (!metadataHash || metadataHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      setProposalMetadata(null);
      return;
    }
    const load = async () => {
      try {
        const cid = bytes32ToCid(metadataHash);
        const data = await fetchFromIPFS(cid);
        setProposalMetadata(data);
      } catch (e) {
        console.error('Failed to fetch proposal metadata', e);
      }
    };
    load();
  }, [metadataHash]);

  // Load topics
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
          const topicData = await publicClient.readContract({
            address: escrowAddress,
            abi: ESCROW_ABI,
            functionName: 'getTopic',
            args: [proposalIdValue, BigInt(i)],
          });

          let meta = null;
          if (topicData.contentCid && topicData.contentCid !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            try {
              const cid = bytes32ToCid(topicData.contentCid);
              meta = await fetchFromIPFS(cid);
            } catch (e) { /* ignore */ }
          }

          results.push({
            id: i,
            owner: topicData.owner,
            contentCid: topicData.contentCid,
            title: meta?.title,
            description: meta?.description
          });
        } catch (error) {
          results.push({ id: i, owner: null, contentCid: null });
        }
      }
      setTopics(results);
    };

    loadTopics();
  }, [publicClient, escrowAddress, proposalIdValue, topicCount]);

  // Voting conditions
  const canVote =
    isConnected &&
    proposalStatusValue === 1 &&
    chainTime !== null &&
    startTime !== undefined &&
    endTime !== undefined &&
    chainTime >= Number(startTime) &&
    chainTime < Number(endTime);

  const getVoteDisabledReason = () => {
    if (!isConnected) return t('airdrop.status.disconnected');
    if (proposalStatusValue !== 1) return t('voting.window.closed');
    if (chainTime !== null && startTime !== undefined && chainTime < Number(startTime)) {
      return t('voting.window.closed');
    }
    if (chainTime !== null && endTime !== undefined && chainTime >= Number(endTime)) {
      return t('voting.window.closed');
    }
    if (!selectedTopic) return t('voting.topic.select');
    return null;
  };

  // Delivery conditions
  const canSubmitDelivery =
    isConnected &&
    proposalStatusValue === 3 &&
    chainTime !== null &&
    submitDeadline !== undefined &&
    chainTime <= Number(submitDeadline);

  const canChallenge =
    isConnected &&
    proposalStatusValue === 4 &&
    chainTime !== null &&
    challengeWindowEnd !== undefined &&
    chainTime < Number(challengeWindowEnd);

  const canFinalizeDelivery =
    isConnected &&
    proposalStatusValue === 4 &&
    chainTime !== null &&
    challengeWindowEnd !== undefined &&
    chainTime >= Number(challengeWindowEnd);

  const canExpire =
    isConnected &&
    proposalStatusValue === 3 &&
    chainTime !== null &&
    submitDeadline !== undefined &&
    chainTime > Number(submitDeadline);

  // Admin conditions
  const canFinalizeVoting =
    isAdmin &&
    proposalStatusValue === 1 &&
    chainTime !== null &&
    endTime !== undefined &&
    chainTime > Number(endTime);

  const canConfirmWinner = isAdmin && proposalStatusValue === 2;
  const canResolveDispute = isAdmin && proposalStatusValue === 5;

  const allowanceValue = allowanceResult.data ?? 0n;

  const handleSwitchChain = async () => {
    if (!targetChainId) return;
    try {
      await switchChainAsync({ chainId: Number(targetChainId) });
    } catch (error) {
      setStatus(statusNetworkMismatch());
    }
  };

  const runAction = async (name, fn, options = {}) => {
    const { requireConfirm = false, confirmTitle = '', confirmMessage = '' } = options;

    const execute = async () => {
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
        setAction(name);
        setStatus(statusTxSubmitted());
        const hash = await fn();
        if (hash) setLastTxHash(hash);
        setStatus(statusTxConfirming());
        await publicClient.waitForTransactionReceipt({ hash });
        setStatus(statusTxConfirmed());

        // Refresh all data
        await Promise.all([
          proposalResult.refetch(),
          allowanceResult.refetch(),
          ownerResult.refetch(),
          winnerTopicResult.refetch(),
          fetchEvents(),
        ]);

      } catch (error) {
        const message = error?.shortMessage || error?.message || 'Action failed';
        setStatus(statusError('status.tx.failed', { reason: message }));
      } finally {
        setAction('');
      }
    };

    if (requireConfirm) {
      setConfirmModal({
        open: true,
        title: confirmTitle,
        message: confirmMessage,
        onConfirm: () => {
          setConfirmModal({ open: false });
          execute();
        },
      });
    } else {
      execute();
    }
  };

  // Voting actions
  const handleApprove = () =>
    runAction('approve', async () => {
      const amount = parseUnits(voteAmount.trim(), 18);
      return writeContractAsync({
        address: guaTokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [escrowAddress, amount],
      });
    });

  const handleVote = () =>
    runAction('vote', async () => {
      const amount = parseUnits(voteAmount.trim(), 18);
      return writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'stakeVote',
        args: [proposalIdValue, BigInt(selectedTopic), amount],
      });
    });

  // Delivery actions
  const handleSubmitDelivery = () =>
    runAction('submit', async () => {
      return writeContractAsync({
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
    });

  const handleChallenge = () =>
    runAction(
      'challenge',
      async () => {
        return writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'challengeDelivery',
          args: [
            proposalIdValue,
            toBytes32Hash(challengeReason),
            toBytes32Hash(challengeEvidence),
          ],
        });
      },
      {
        requireConfirm: true,
        confirmTitle: t('ui.confirm.title'),
        confirmMessage: t('ui.confirm.danger'),
      }
    );

  const handleFinalizeDelivery = () =>
    runAction('finalize', async () => {
      return writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'finalizeDelivery',
        args: [proposalIdValue],
      });
    });

  const handleExpire = () =>
    runAction('expire', async () => {
      return writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'expireIfNoSubmission',
        args: [proposalIdValue],
      });
    });

  // Admin actions
  const handleFinalizeVoting = () =>
    runAction(
      'finalizeVoting',
      async () => {
        return writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'finalizeVoting',
          args: [proposalIdValue],
        });
      },
      {
        requireConfirm: true,
        confirmTitle: t('admin.finalizeVoting'),
        confirmMessage: t('ui.confirm.danger'),
      }
    );

  const handleConfirmWinner = () =>
    runAction(
      'confirmWinner',
      async () => {
        return writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'confirmWinnerAndPay10',
          args: [proposalIdValue],
        });
      },
      {
        requireConfirm: true,
        confirmTitle: t('admin.confirmWinner'),
        confirmMessage: t('ui.confirm.danger'),
      }
    );

  const handleResolve = (approve) =>
    runAction(
      approve ? 'approveDispute' : 'denyDispute',
      async () => {
        return writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'resolveDispute',
          args: [proposalIdValue, approve],
        });
      },
      {
        requireConfirm: true,
        confirmTitle: approve ? t('admin.resolveApprove') : t('admin.resolveDeny'),
        confirmMessage: t('ui.confirm.danger'),
      }
    );

  const actionLocked = !isConnected || chainMismatch;
  const isAnyActionRunning = isWriting || action !== '';

  const toggleTopic = (id) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <main className="layout">
      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false })}
      />

      <section className="panel hero">
        <div>
          <p className="eyebrow">{t('proposal.detail.eyebrow')}</p>
          <h1>
            {proposalMetadata?.title ? proposalMetadata.title : `${t('proposal.detail.title')}${proposalIdValue?.toString() || '-'}`}
          </h1>
          <p className="lede">{t('proposal.detail.lede')}</p>
          <div className="hero-actions">
            <button
              className="mode-toggle"
              type="button"
              onClick={() => setShowAdvanced((c) => !c)}
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
            <span>{t('voting.window.start')}</span>
            <span>{formatDateTime(startTime)}</span>
          </div>
          <div className="status-row">
            <span>{t('voting.window.end')}</span>
            <span>{formatDateTime(endTime)}</span>
          </div>
          <div className="status-row">
            <span>{t('escrow.summary.winner')}</span>
            <span className="inline-group">
              {shortAddress(readField(winnerTopicResult.data, 'owner', 0))}
              <CopyButton value={readField(winnerTopicResult.data, 'owner', 0)} />
            </span>
          </div>
        </div>
      </section>

      {/* Proposal Description */}
      {proposalMetadata?.description && (
        <section className="panel">
          <h2>{t('proposals.create.description')}</h2>
          <MarkdownRenderer showToc={true}>{proposalMetadata.description}</MarkdownRenderer>
        </section>
      )}

      {/* Timeline */}
      <section className="panel">
        <h2>{t('escrow.steps.title')}</h2>
        <ProposalTimeline
          currentStatus={proposalStatusValue}
          proposal={{
            startTime,
            endTime,
            submitDeadline,
            challengeWindowEnd,
            challenger: readField(proposalResult.data, 'challenger', 16),
          }}
        />
        {/* Admin Section - Only for admin */}
        {isAdmin && (
          <section className="panel">
            <h2>{t('admin.actions.title')}</h2>

            <div className="actions">
              {/* Finalize Voting */}
              {(proposalStatusValue === 1 || (proposalStatusValue === 2 && !canConfirmWinner)) && (
                <DisabledButton
                  className="btn primary"
                  onClick={handleFinalizeVoting}
                  disabled={isAnyActionRunning || actionLocked || !canFinalizeVoting}
                  disabledReason={
                    !canFinalizeVoting
                      ? (proposalStatusValue === 1 ? t('voting.window.open') : t('status.invalidState'))
                      : null
                  }
                >
                  {action === 'finalizeVoting' ? t('status.loading') : t('admin.finalizeVoting')}
                </DisabledButton>
              )}

              {/* Confirm Winner */}
              {(proposalStatusValue === 2) && (
                <DisabledButton
                  className="btn primary"
                  onClick={handleConfirmWinner}
                  disabled={isAnyActionRunning || actionLocked || !canConfirmWinner}
                  disabledReason={!canConfirmWinner ? t('status.invalidState') : null}
                >
                  {action === 'confirmWinner' ? t('status.loading') : t('admin.confirmWinner')}
                </DisabledButton>
              )}

              {/* Resolve Dispute */}
              {(proposalStatusValue === 5) && (
                <>
                  <DisabledButton
                    className="btn ghost"
                    onClick={() => handleResolve(true)}
                    disabled={isAnyActionRunning || actionLocked || !canResolveDispute}
                  >
                    {action === 'approveDispute' ? t('status.loading') : t('admin.resolveApprove')}
                  </DisabledButton>
                  <DisabledButton
                    className="btn ghost"
                    onClick={() => handleResolve(false)}
                    disabled={isAnyActionRunning || actionLocked || !canResolveDispute}
                  >
                    {action === 'denyDispute' ? t('status.loading') : t('admin.resolveDeny')}
                  </DisabledButton>
                </>
              )}

              {/* Show message if no actions available */}
              {proposalStatusValue !== 1 && proposalStatusValue !== 2 && proposalStatusValue !== 5 && (
                <p className="muted" style={{ margin: 0 }}>{t('admin.noActions')}</p>
              )}
            </div>
            {status?.messageKey !== 'status.loaded' && <StatusNotice status={status} />}
          </section>
        )}

      </section>

      {/* Voting Section - Show if status is Voting */}
      {proposalStatusValue === 1 && (
        <section className="panel">
          <h2>{t('voting.title')}</h2>
          <p className="hint">{t('voting.lede')}</p>

          {/* Topic Selection */}
          <div className="status-grid">
            {topics.map((topic) => (
              <label
                key={topic.id}
                id={`topic-${topic.id}`}
                className="status-row"
                style={{ alignItems: 'flex-start', scrollMarginTop: '120px' }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      {topic.title ? topic.title : `${t('voting.topic.select')} #${topic.id}`}
                    </span>
                    {topic.description && (
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto', minHeight: 'unset' }}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleTopic(topic.id);
                        }}
                      >
                        {expandedTopics[topic.id] ? t('ui.mode.hideAdvanced') : t('ui.mode.showAdvanced')}
                      </button>
                    )}
                  </div>

                  {expandedTopics[topic.id] && topic.description && (
                    <div style={{
                      fontSize: '0.9em',
                      marginTop: '4px',
                      padding: '12px',
                      background: 'rgba(0,0,0,0.03)',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <MarkdownRenderer>{topic.description}</MarkdownRenderer>
                    </div>
                  )}

                  {(!topic.title && !topic.description) && (
                    <span>{t('voting.topic.select')} #{topic.id}</span>
                  )}
                  {topic.contentCid && (
                    <span className="muted" style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Hash: {shortAddress(topic.contentCid)}
                      <CopyButton value={topic.contentCid} />
                    </span>
                  )}
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

          <div className="form-grid">
            <label className="field">
              <span>{t('voting.amount.label')}</span>
              <input
                value={voteAmount}
                placeholder={t('voting.amount.placeholder')}
                onChange={(e) => setVoteAmount(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('voting.allowance.label')}</span>
              <input value={formatUnits(allowanceValue, 18)} readOnly />
            </label>
          </div>

          {voteAmount && selectedTopic && canVote && (
            <GasEstimate
              show={true}
              contractCall={{
                address: escrowAddress,
                abi: ESCROW_ABI,
                functionName: 'stakeVote',
                args: [proposalIdValue, BigInt(selectedTopic), parseUnits(voteAmount.trim() || '0', 18)],
                account: address,
              }}
            />
          )}

          <div className="actions">
            <DisabledButton
              className="btn ghost"
              onClick={handleApprove}
              disabled={isAnyActionRunning}
              disabledReason={null}
            >
              {action === 'approve' ? t('voting.submitting') : t('voting.approve')}
            </DisabledButton>
            <DisabledButton
              className="btn primary"
              onClick={handleVote}
              disabled={isAnyActionRunning || !canVote}
              disabledReason={getVoteDisabledReason()}
            >
              {action === 'vote' ? t('voting.submitting') : t('voting.submit')}
            </DisabledButton>
          </div>
          <StatusNotice status={status} />
        </section>
      )}

      {/* Delivery Section - Show if status is Accepted */}
      {proposalStatusValue === 3 && (
        <section className="panel">
          <h2>{t('escrow.delivery.title')}</h2>
          <p className="hint">{t('escrow.delivery.hint')}</p>

          <div className="form-grid">
            <label className="field full">
              <span>{t('escrow.delivery.youtube')}</span>
              <input
                value={youtubeUrl}
                placeholder="https://youtu.be/..."
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={actionLocked}
              />
            </label>
            <label className="field">
              <span>{t('escrow.delivery.videoId')}</span>
              <input
                value={videoId}
                placeholder="YouTube video id"
                onChange={(e) => setVideoId(e.target.value)}
                disabled={actionLocked}
              />
            </label>
            <label className="field full">
              <span>{t('escrow.delivery.pinned')}</span>
              <textarea
                rows="2"
                value={pinnedComment}
                placeholder="GUA-DELIVER:..."
                onChange={(e) => setPinnedComment(e.target.value)}
                disabled={actionLocked}
              />
            </label>
          </div>

          <div className="actions">
            <DisabledButton
              className="btn primary"
              onClick={handleSubmitDelivery}
              disabled={isAnyActionRunning || actionLocked || !canSubmitDelivery}
              disabledReason={
                actionLocked
                  ? '请刷新页面'
                  : !canSubmitDelivery
                    ? t('term.submitDeadline.help')
                    : null
              }
            >
              {action === 'submit' ? t('escrow.delivery.submitting') : t('escrow.delivery.submit')}
            </DisabledButton>
          </div>
          <StatusNotice status={status} />
        </section>
      )}

      {/* Challenge & Settlement Section - Show if status is Submitted or Accepted */}
      {(proposalStatusValue === 4 || (proposalStatusValue === 3 && canExpire)) && (
        <section className="panel">
          <h2>{t('escrow.settlement.title')}</h2>

          {proposalStatusValue === 4 && canChallenge && (
            <>
              <h3>{t('escrow.challenge.title')}</h3>
              <div className="form-grid">
                <label className="field full">
                  <span>{t('escrow.challenge.reason')}</span>
                  <input
                    value={challengeReason}
                    placeholder={t('ui.optional')}
                    onChange={(e) => setChallengeReason(e.target.value)}
                    disabled={actionLocked}
                  />
                </label>
                <label className="field full">
                  <span>{t('escrow.challenge.evidence')}</span>
                  <input
                    value={challengeEvidence}
                    placeholder={t('ui.optional')}
                    onChange={(e) => setChallengeEvidence(e.target.value)}
                    disabled={actionLocked}
                  />
                </label>
              </div>

              <div className="actions">
                {allowanceValue < parseUnits('10000', 18) ? (
                  <DisabledButton
                    className="btn ghost"
                    onClick={() => runAction('approveBond', async () => {
                      return writeContractAsync({
                        address: guaTokenAddress,
                        abi: ERC20_ABI,
                        functionName: 'approve',
                        args: [escrowAddress, parseUnits('10000', 18)],
                      });
                    })}
                    disabled={isAnyActionRunning || actionLocked}
                    disabledReason={actionLocked ? '请刷新页面' : null}
                  >
                    {action === 'approveBond' ? t('escrow.challenge.submitting') : t('escrow.challenge.approveBond')}
                  </DisabledButton>
                ) : (
                  <DisabledButton
                    className="btn ghost"
                    onClick={handleChallenge}
                    disabled={isAnyActionRunning || actionLocked}
                    disabledReason={actionLocked ? '请刷新页面' : null}
                  >
                    {action === 'challenge' ? t('escrow.challenge.submitting') : t('escrow.challenge.submit')}
                  </DisabledButton>
                )}
              </div>
            </>
          )}

          <div className="actions">
            {canFinalizeDelivery && (
              <DisabledButton
                className="btn primary"
                onClick={handleFinalizeDelivery}
                disabled={isAnyActionRunning || actionLocked}
                disabledReason={actionLocked ? '请刷新页面' : null}
              >
                {action === 'finalize' ? t('escrow.settlement.finalizing') : t('escrow.settlement.finalize')}
              </DisabledButton>
            )}
            {canExpire && (
              <DisabledButton
                className="btn ghost"
                onClick={handleExpire}
                disabled={isAnyActionRunning || actionLocked}
                disabledReason={actionLocked ? '请刷新页面' : null}
              >
                {action === 'expire' ? t('escrow.settlement.expiring') : t('escrow.settlement.expire')}
              </DisabledButton>
            )}
          </div>
          <StatusNotice status={status} />
        </section>
      )}



      {/* Advanced Config */}
      {showAdvanced && (
        <section className="panel">
          <h2>{t('proposals.config.title')}</h2>
          <div className="form-grid">
            <label className="field">
              <span>{t('proposals.config.contract')}</span>
              <input
                value={escrowAddress}
                placeholder="0x..."
                onChange={(e) => setEscrowAddress(e.target.value)}
              />
              <ExplorerLink
                chainId={chainId}
                type="address"
                value={escrowAddress}
                label={t('status.contract.link')}
              />
            </label>
            <label className="field">
              <span>{t('voting.config.token')}</span>
              <input
                value={guaTokenAddress}
                placeholder="0x..."
                onChange={(e) => setGuaTokenAddress(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t('proposals.config.network')}</span>
              <select
                value={targetChainId}
                onChange={(e) => setTargetChainId(Number(e.target.value))}
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
      )}

      {/* Proposal Details */}
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
          <div className="status-row">
            <span>{t('escrow.summary.remaining')}</span>
            <span>{remaining90 !== undefined ? formatUnits(remaining90, 18) + ' GUA' : '-'}</span>
          </div>
        </div>
        <div className="status-row">
          <span>{t('status.tx.latest')}</span>
          <span className="inline-group">
            {lastTxHash || '-'}
            <ExplorerLink chainId={chainId} type="tx" value={lastTxHash} />
          </span>
        </div>
      </section>

      {/* Events */}
      <section className="panel">
        <h2>{t('proposal.detail.events')}</h2>
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
      <ScrollProgress />
    </main>
  );
}
