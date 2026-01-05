"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  useAccount,
  useChainId,
  useSwitchChain,
  usePublicClient,
} from 'wagmi';
import { isAddress, parseAbi } from 'viem';

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
]);

const formatDateTime = (timestamp) => {
  if (!timestamp) return '-';
  const date = new Date(Number(timestamp) * 1000);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

export default function ProposalsPage() {
  const { t } = useI18n();
  const chainOptions = useMemo(getChainOptions, []);
  const [targetChainId, setTargetChainId] = useState(defaultChainId || '');
  const [escrowAddress, setEscrowAddress] = useState('');
  const [fromBlock, setFromBlock] = useState('');
  const [status, setStatus] = useState(statusReady());
  const [proposals, setProposals] = useState([]);

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const publicClient = usePublicClient();

  const chainMismatch = isConnected && targetChainId && chainId !== targetChainId;

  const handleSwitchChain = async () => {
    if (!targetChainId) return;
    try {
      await switchChainAsync({ chainId: Number(targetChainId) });
    } catch (error) {
      setStatus(statusNetworkMismatch());
    }
  };

  const loadProposals = async () => {
    if (!publicClient) {
      setStatus(statusNoRpc());
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
      const logs = await publicClient.getLogs({
        address: escrowAddress,
        event: ESCROW_EVENTS_ABI[0],
        fromBlock: fromBlockValue,
      });

      const mapped = logs.map((log) => ({
        id: log.args?.proposalId?.toString() ?? '-1',
        startTime: log.args?.startTime,
        endTime: log.args?.endTime,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
      }));

      setProposals(mapped);
      setStatus(mapped.length ? statusLoaded() : statusEmpty());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Load failed';
      setStatus(statusError('status.error', { message }));
    }
  };

  return (
    <main className="layout">
      <section className="panel hero">
        <div>
          <p className="eyebrow">{t('proposals.eyebrow')}</p>
          <h1>{t('proposals.title')}</h1>
          <p className="lede">{t('proposals.lede')}</p>
        </div>
        <div className="status-card">
          <div className="status-row">
            <span>{t('airdrop.status.network')}</span>
            <span>{chainId ? chainId : '-'}</span>
          </div>
          <div className="status-row">
            <span>{t('proposals.list.title')}</span>
            <span>{proposals.length}</span>
          </div>
          <p className="hint">{t('proposals.lede')}</p>
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
        <div className="actions">
          <button className="btn primary" onClick={loadProposals}>
            {t('proposals.load')}
          </button>
        </div>
        <StatusNotice status={status} />
      </section>

      <section className="panel">
        <h2>{t('proposals.list.title')}</h2>
        {proposals.length === 0 ? (
          <p className="muted">{t('proposals.list.empty')}</p>
        ) : (
          <div className="form-grid">
            {proposals.map((proposal) => (
              <Link
                key={proposal.id}
                className="btn ghost"
                href={`/proposals/${proposal.id}`}
              >
                <div>
                  <strong>{t('proposal.detail.title')}{proposal.id}</strong>
                  <div className="muted">{t('proposals.card.start')}: {formatDateTime(proposal.startTime)}</div>
                  <div className="muted">{t('proposals.card.end')}: {formatDateTime(proposal.endTime)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
