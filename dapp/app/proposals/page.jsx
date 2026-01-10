"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useAccount,
  useChainId,
  useSwitchChain,
  usePublicClient,
} from 'wagmi';
import { isAddress, parseAbi, createPublicClient, http } from 'viem';
import { baseSepolia, base, anvil } from 'viem/chains';

import { defaultChainId, getChainOptions } from '../../lib/appConfig';
import { bytes32ToCid, fetchFromIPFS } from '../../lib/ipfs';
import {
  statusReady,
  statusLoading,
  statusLoaded,
  statusEmpty,
  statusError,
  statusNetworkMismatch,
  statusNoRpc,
  statusInvalidAddress,
} from '../../lib/status';
import { useI18n } from '../components/LanguageProvider';
import ExplorerLink from '../components/ExplorerLink';
import StatusNotice from '../components/StatusNotice';

const ESCROW_EVENTS_ABI = parseAbi([
  'event ProposalCreated(uint256 indexed proposalId,uint64 startTime,uint64 endTime,uint256[] topicIds,address[] topicOwners,bytes32[] contentCids,bytes32 metadata,address indexed creator)',
  /* 
   * getProposal returns:
   * 0: startTime, 1: endTime, 2: topicCount, 3: status, 4: winnerTopicId, 5: totalPool
   * 6: finalized, 7: submitDeadline, 8: paid10, 9: remaining90, 10: confirmed
   * 11: youtubeUrlHash, 12: videoIdHash, 13: pinnedCodeHash, 14: challengeWindowEnd
   * 15: deliverySubmitted, 16: challenger, 17: reasonHash, 18: evidenceHash
   * 19: disputeResolved, 20: creator, 21: depositRefunded, 22: depositConfiscated, 23: metadata
   */
  'function getProposal(uint256 proposalId) view returns (uint64,uint64,uint8,uint8,uint256,uint256,bool,uint256,uint256,uint256,bool,bytes32,bytes32,bytes32,uint256,bool,address,bytes32,bytes32,bool,address,bool,bool,bytes32)',
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

export default function ProposalsPage() {
  const { t, lang } = useI18n();
  const chainOptions = useMemo(getChainOptions, []);
  const [targetChainId, setTargetChainId] = useState(defaultChainId || '');
  const [escrowAddress, setEscrowAddress] = useState('');
  const [status, setStatus] = useState(statusReady());
  const [activeProposals, setActiveProposals] = useState([]);
  const [historyProposals, setHistoryProposals] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Pagination State
  const [allLogs, setAllLogs] = useState([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const BATCH_SIZE = 12;

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const wagmiPublicClient = usePublicClient();

  const chainMismatch = isConnected && targetChainId && chainId !== targetChainId;

  // 获取当前链的 RPC URL
  const activeChainConfig = useMemo(() => {
    return chainOptions.find((item) => item.id === Number(targetChainId));
  }, [chainOptions, targetChainId]);

  // Sync targetChainId with wallet chainId
  useEffect(() => {
    if (chainId && chainOptions.some(c => c.id === chainId)) {
      setTargetChainId(chainId);
    }
  }, [chainId, chainOptions]);

  // Initialize escrow address from config
  useEffect(() => {
    if (!activeChainConfig) return;
    setEscrowAddress(activeChainConfig.escrowAddress || '');
  }, [activeChainConfig]);

  // Reset state when chain/address changes
  useEffect(() => {
    setAllLogs([]);
    setActiveProposals([]);
    setHistoryProposals([]);
    setLoadedCount(0);
    setStatus(statusReady());
  }, [targetChainId, escrowAddress]);

  // Step 1: Fetch ALL logs (lightweight)
  useEffect(() => {
    const fetchLogs = async () => {
      if (!isAddress(escrowAddress) || chainMismatch) return;

      // Get Client
      let client = wagmiPublicClient;
      if (!client && activeChainConfig?.rpcUrl) {
        try {
          // Select correct chain based on targetChainId
          const chainById = { [base.id]: base, [baseSepolia.id]: baseSepolia, [anvil.id]: anvil };
          const chain = chainById[targetChainId] || baseSepolia;
          client = createPublicClient({ chain, transport: http(activeChainConfig.rpcUrl) });
        } catch (e) {
          console.error('Failed to create fallback client:', e);
          setStatus(statusNoRpc());
          return;
        }
      }
      if (!client) {
        setStatus(statusNoRpc());
        return;
      }

      try {
        setStatus(statusLoading());

        // Fetch current block number to handle range
        const currentBlock = await client.getBlockNumber();
        const startBlock = activeChainConfig?.startBlock ? BigInt(activeChainConfig.startBlock) : 0n;
        const CHUNK_SIZE = 50000n; // Safety margin under 100k limit

        const chunks = [];
        for (let i = startBlock; i <= currentBlock; i += CHUNK_SIZE) {
          const toBlock = i + CHUNK_SIZE - 1n < currentBlock ? i + CHUNK_SIZE - 1n : currentBlock;
          chunks.push({ from: i, to: toBlock });
        }

        // Fetch chunks in parallel (limit concurrency if needed, but 3-4 chunks usually fine)
        const allLogsResults = await Promise.all(
          chunks.map(async ({ from, to }) => {
            try {
              return await client.getLogs({
                address: escrowAddress,
                event: ESCROW_EVENTS_ABI[0],
                fromBlock: from,
                toBlock: to,
              });
            } catch (e) {
              console.warn(`Failed to fetch logs for range ${from}-${to}`, e);
              return [];
            }
          })
        );

        const logs = allLogsResults.flat();

        // Sort desc by proposalId (assuming generic sorting by ID/Block is sufficient)
        // We use proposalId from args if available, or blockNumber as proxy
        logs.sort((a, b) => {
          const idA = a.args?.proposalId ? Number(a.args.proposalId) : 0;
          const idB = b.args?.proposalId ? Number(b.args.proposalId) : 0;
          return idB - idA;
        });

        setAllLogs(logs);

        if (logs.length === 0) {
          setStatus(statusEmpty());
        }
        // Step 2 will be triggered by useEffect depending on allLogs
      } catch (error) {
        console.error("Log fetch error:", error);
        const message = error?.shortMessage || error?.message || 'Load failed';
        setStatus(statusError('status.error', { message }));
      }
    };

    fetchLogs();
  }, [wagmiPublicClient, escrowAddress, chainMismatch, activeChainConfig]);

  // Step 2 working function: Fetch details for a batch
  const loadNextBatch = async (logsToProcess) => {
    // Get Client (Re-create logic briefly or assume valid from previous step, but safer to get again)
    let client = wagmiPublicClient;
    if (!client && activeChainConfig?.rpcUrl) {
      const chainById = { [base.id]: base, [baseSepolia.id]: baseSepolia, [anvil.id]: anvil };
      const chain = chainById[targetChainId] || baseSepolia;
      client = createPublicClient({ chain, transport: http(activeChainConfig.rpcUrl) });
    }
    if (!client) return;

    setIsLoadingMore(true);

    try {
      const details = await Promise.all(
        logsToProcess.map(async (log) => {
          const pid = log.args?.proposalId;
          let currentStatus = 0;
          let title = '';

          try {
            const data = await client.readContract({
              address: escrowAddress,
              abi: ESCROW_EVENTS_ABI,
              functionName: 'getProposal',
              args: [pid],
            });
            currentStatus = Number(data[3]);
            const metadataHash = data[23];

            // Optimistic IPFS fetch (non-blocking for batch, but we await for simplicity in this MVP)
            if (metadataHash && metadataHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
              try {
                const cid = bytes32ToCid(metadataHash);
                const content = await fetchFromIPFS(cid);
                if (content && content.title) {
                  title = content.title;
                }
              } catch (e) { /* ignore */ }
            }
          } catch (err) {
            console.error('Failed to fetch proposal details', pid, err);
          }

          return {
            id: pid?.toString() ?? '-1',
            startTime: log.args?.startTime,
            endTime: log.args?.endTime,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
            status: currentStatus,
            title: title,
          };
        })
      );

      // Distribute to Active/History
      const newActive = [];
      const newHistory = [];
      details.forEach(p => {
        if (p.status >= 6) newHistory.push(p); // 6=Completed ...
        else newActive.push(p);
      });

      setActiveProposals(prev => [...prev, ...newActive]);
      setHistoryProposals(prev => [...prev, ...newHistory]);

      setLoadedCount(prev => prev + logsToProcess.length);
      setStatus(statusLoaded()); // Ensure status is loaded
    } catch (err) {
      console.error("Batch load error", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Step 2 Trigger: Initial Load
  useEffect(() => {
    if (allLogs.length > 0 && loadedCount === 0 && !isLoadingMore) {
      const firstBatch = allLogs.slice(0, BATCH_SIZE);
      loadNextBatch(firstBatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLogs, loadedCount, isLoadingMore]);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Logic
  const filterProposals = (list) => {
    if (!searchQuery) return list;
    const lowerQuery = searchQuery.toLowerCase();
    return list.filter(p =>
      p.title.toLowerCase().includes(lowerQuery) ||
      p.id.toString() === lowerQuery
    );
  };

  const filteredActive = filterProposals(activeProposals);
  const filteredHistory = filterProposals(historyProposals);

  // Handler for manual "Load More"
  const handleLoadMore = () => {
    if (loadedCount >= allLogs.length || isLoadingMore) return;
    const nextBatch = allLogs.slice(loadedCount, loadedCount + BATCH_SIZE);
    loadNextBatch(nextBatch);
  };

  const handleSwitchChain = async () => {
    if (!targetChainId) return;
    try {
      await switchChainAsync({ chainId: Number(targetChainId) });
    } catch (error) {
      setStatus(statusNetworkMismatch());
    }
  };

  const renderProposalCard = (proposal) => (
    <Link
      key={proposal.id}
      className="btn ghost"
      href={`/proposals/${proposal.id}`}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>{proposal.title ? proposal.title : `${t('proposal.detail.title')}${proposal.id}`}</strong>
          <span className="badge">{STATUS_LABELS[lang]?.[proposal.status] || '-'}</span>
        </div>
        <div className="muted">{t('proposals.card.start')}: {formatDateTime(proposal.startTime)}</div>
        <div className="muted">{t('proposals.card.end')}: {formatDateTime(proposal.endTime)}</div>
      </div>
    </Link>
  );

  return (
    <main className="layout">
      <section className="panel hero">
        <div>
          <p className="eyebrow">{t('proposals.eyebrow')}</p>
          <h1>{t('proposals.title')}</h1>
          <p className="lede">{t('proposals.lede')}</p>
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
            <span>{t('airdrop.status.network')}</span>
            <span>{chainId ? chainId : '-'}</span>
          </div>
          <div className="status-row">
            <span>{t('proposals.list.title')}</span>
            <span>{allLogs.length > 0 ? allLogs.length : '-'}</span>
          </div>
          <p className="hint">{t('proposals.lede')}</p>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/proposals/create" className="btn primary">
              {t('proposals.create')}
            </Link>
          </div>
        </div>
      </section>

      {showAdvanced && (
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

      {/* Search Bar */}
      <div className="search-bar">
        <span className="icon">🔍</span>
        <input
          type="text"
          placeholder={t('proposals.search.placeholder') || "Search by Title or ID..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="clear-btn"
            onClick={() => setSearchQuery('')}
            title="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {/* Active Proposals */}
      <section className="panel">
        <h2>{t('proposals.list.active')}</h2>
        <StatusNotice status={status} />
        {filteredActive.length === 0 && searchQuery ? (
          <p className="muted">{t('proposals.search.no_results')}</p>
        ) : filteredActive.length === 0 && status?.kind === 'loaded' ? (
          <p className="muted">{t('proposals.list.empty')}</p>
        ) : (
          <div className="form-grid">
            {filteredActive.map(renderProposalCard)}
          </div>
        )}
      </section>

      {/* History Proposals */}
      {historyProposals.length > 0 && (
        <section className="panel">
          <h2>{t('proposals.list.history')}</h2>
          {filteredHistory.length === 0 && searchQuery ? (
            <p className="muted">{t('proposals.search.no_results')}</p>
          ) : filteredHistory.length === 0 ? (
            <p className="muted">{t('proposals.list.empty')}</p>
          ) : (
            <div className="form-grid">
              {filteredHistory.map(renderProposalCard)}
            </div>
          )}
        </section>
      )}

      {/* Load More Button */}
      {allLogs.length > loadedCount && (
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <button
            className="btn secondary"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? t('ui.loading') || 'Loading...' : `${t('ui.loadMore') || 'Load More'} (${loadedCount}/${allLogs.length})`}
          </button>
        </div>
      )}
    </main>
  );
}
