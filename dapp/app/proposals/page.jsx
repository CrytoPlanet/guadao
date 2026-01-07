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
import { anvil } from 'viem/chains';

import { defaultChainId, getChainOptions } from '../../lib/appConfig';
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
  'event ProposalCreated(uint256 indexed proposalId,uint64 startTime,uint64 endTime,uint256[] topicIds,address[] topicOwners)',
  'function getProposal(uint256 proposalId) view returns (uint64,uint64,uint8,uint8,uint256,uint256,bool,uint256,uint256,uint256,bool,bytes32,bytes32,bytes32,uint256,bool,address,bytes32,bytes32,bool)',
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

  // Auto-load proposals when address is available
  useEffect(() => {
    const loadProposals = async () => {
      if (!isAddress(escrowAddress)) {
        return;
      }
      if (chainMismatch) {
        return;
      }

      // 使用 wagmi client 或创建备用 client
      let client = wagmiPublicClient;
      if (!client && activeChainConfig?.rpcUrl) {
        try {
          client = createPublicClient({
            chain: anvil,
            transport: http(activeChainConfig.rpcUrl),
          });
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
        const logs = await client.getLogs({
          address: escrowAddress,
          event: ESCROW_EVENTS_ABI[0],
          fromBlock: activeChainConfig?.startBlock ? BigInt(activeChainConfig.startBlock) : 'earliest',
        });

        // Fetch details for each proposal to get status
        const details = await Promise.all(
          logs.map(async (log) => {
            const pid = log.args?.proposalId;
            let currentStatus = 0;
            try {
              const data = await client.readContract({
                address: escrowAddress,
                abi: ESCROW_EVENTS_ABI, // using extended ABI
                functionName: 'getProposal',
                args: [pid],
              });
              // Proposal struct: status is at index 3 (uint8)
              // struct Members: 
              // 0: startTime, 1: endTime, 2: topicCount, 3: status, ...
              currentStatus = Number(data[3]);
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
            };
          })
        );

        // Sort by id descending (newest first)
        details.sort((a, b) => Number(b.id) - Number(a.id));

        // Split: 6=Completed, 7=Denied, 8=Expired => History
        const active = [];
        const history = [];

        details.forEach((p) => {
          if (p.status >= 6) {
            history.push(p);
          } else {
            active.push(p);
          }
        });

        setActiveProposals(active);
        setHistoryProposals(history);

        setStatus(details.length ? statusLoaded() : statusEmpty());
      } catch (error) {
        const message = error?.shortMessage || error?.message || 'Load failed';
        setStatus(statusError('status.error', { message }));
      }
    };

    loadProposals();
  }, [wagmiPublicClient, escrowAddress, chainMismatch, activeChainConfig]);

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
          <strong>{t('proposal.detail.title')}{proposal.id}</strong>
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
            <span>{activeProposals.length + historyProposals.length}</span>
          </div>
          <p className="hint">{t('proposals.lede')}</p>
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

      {/* Active Proposals */}
      <section className="panel">
        <h2>{t('proposals.list.active')}</h2>
        <StatusNotice status={status} />
        {activeProposals.length === 0 && status?.kind === 'loaded' ? (
          <p className="muted">{t('proposals.list.empty')}</p>
        ) : (
          <div className="form-grid">
            {activeProposals.map(renderProposalCard)}
          </div>
        )}
      </section>

      {/* History Proposals */}
      {historyProposals.length > 0 && (
        <section className="panel">
          <h2>{t('proposals.list.history')}</h2>
          <div className="form-grid">
            {historyProposals.map(renderProposalCard)}
          </div>
        </section>
      )}
    </main>
  );
}
