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
import ExplorerLink from '../components/ExplorerLink';
import StatusNotice from '../components/StatusNotice';
import DateTimePicker from '../../components/DateTimePicker';

const ESCROW_ABI = parseAbi([
  'function getProposal(uint256 proposalId) view returns (uint64,uint64,uint8,uint8,uint256,uint256,bool,uint256,uint256,uint256,bool,bytes32,bytes32,bytes32,uint256,bool,address,bytes32,bytes32,bool)',
  'function createProposal(address[] topicOwners,uint64 startTime,uint64 endTime) returns (uint256)',
  'function finalizeVoting(uint256 proposalId)',
  'function confirmWinnerAndPay10(uint256 proposalId)',
  'function resolveDispute(uint256 proposalId,bool approve)',
  'function pause()',
  'function unpause()',
  'function paused() view returns (bool)',
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

export default function AdminPage() {
  const { t, lang } = useI18n();
  const chainOptions = useMemo(getChainOptions, []);
  const [targetChainId, setTargetChainId] = useState(defaultChainId || '');
  const [escrowAddress, setEscrowAddress] = useState('');
  const [status, setStatus] = useState(statusReady());
  const [chainTime, setChainTime] = useState(null);
  const [action, setAction] = useState('');
  const [ownerInputs, setOwnerInputs] = useState(['', '', '']);
  const [voteStart, setVoteStart] = useState('');
  const [voteEnd, setVoteEnd] = useState('');
  const [lastTxHash, setLastTxHash] = useState('');

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const publicClient = usePublicClient();

  const chainMismatch = isConnected && targetChainId && chainId !== targetChainId;



  useEffect(() => {
    const active = chainOptions.find((item) => item.id === Number(targetChainId));
    if (!active) return;
    setEscrowAddress((current) => current || active.escrowAddress || '');
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

  const pausedResult = useReadContract({
    address: isAddress(escrowAddress) ? escrowAddress : undefined,
    abi: ESCROW_ABI,
    functionName: 'paused',
    query: {
      enabled: isAddress(escrowAddress),
    },
  });





  const handleSwitchChain = async () => {
    if (!targetChainId) return;
    try {
      await switchChainAsync({ chainId: Number(targetChainId) });
    } catch (error) {
      setStatus(statusNetworkMismatch());
    }
  };

  const runAction = async (name, fn, options = {}) => {
    const { requireProposal = true } = options;
    if (requireProposal && !proposalIdValue) {
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
      setAction(name);
      setStatus(statusTxSubmitted());
      const hash = await fn();
      if (hash) setLastTxHash(hash);
      setStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(statusTxConfirmed());
    } catch (error) {
      const message = error?.shortMessage || error?.message || 'Action failed';
      setStatus(statusError('status.error', { message }));
    } finally {
      setAction('');
    }
  };



  const handlePause = () =>
    runAction(
      'pause',
      () =>
        writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'pause',
          args: [],
        }),
      { requireProposal: false }
    );

  const handleUnpause = () =>
    runAction(
      'unpause',
      () =>
        writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'unpause',
          args: [],
        }),
      { requireProposal: false }
    );

  const updateOwner = (index, value) => {
    setOwnerInputs((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const addOwner = () => {
    setOwnerInputs((current) => (current.length >= 5 ? current : [...current, '']));
  };

  const removeOwner = (index) => {
    setOwnerInputs((current) => {
      if (current.length <= 3) return current; // 最少保持 3 个
      return current.filter((_, i) => i !== index);
    });
  };

  const handleCreateProposal = () => {
    const owners = ownerInputs.map((item) => item.trim()).filter(Boolean);
    if (owners.length < 3 || owners.length > 5) {
      setStatus(statusError('admin.create.owners'));
      return;
    }
    if (!owners.every((item) => isAddress(item))) {
      setStatus(statusInvalidAddress());
      return;
    }
    if (!voteStart.trim() || !voteEnd.trim()) {
      setStatus(statusError('admin.create.start'));
      return;
    }
    let start;
    let end;
    try {
      start = BigInt(voteStart.trim());
      end = BigInt(voteEnd.trim());
    } catch (error) {
      setStatus(statusError('admin.create.start'));
      return;
    }
    if (end <= start) {
      setStatus(statusError('admin.create.help'));
      return;
    }
    runAction(
      'create',
      () =>
        writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'createProposal',
          args: [owners, start, end],
        }),
      { requireProposal: false }
    );
  };

  return (
    <main className="layout">
      <section className="panel hero">
        <div>
          <p className="eyebrow">{t('admin.eyebrow')}</p>
          <h1>{t('admin.title')}</h1>
          <p className="lede">{t('admin.lede')}</p>
        </div>

      </section>

      <section className="panel">
        <h2>{t('admin.config.title')}</h2>
        <label className="field full">
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
        <label className="field full">
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
        <h2>{t('admin.pause.title')}</h2>
        <div className="status-row">
          <span>{t('admin.statusLabel')}</span>
          <span>{pausedResult.data ? t('admin.pause.paused') : t('admin.pause.unpaused')}</span>
        </div>
        <div className="actions">
          <button
            className="btn ghost"
            onClick={handlePause}
            disabled={isWriting || action === 'pause' || pausedResult.data === true}
          >
            {t('admin.pause.action')}
          </button>
          <button
            className="btn ghost"
            onClick={handleUnpause}
            disabled={isWriting || action === 'unpause' || pausedResult.data === false}
          >
            {t('admin.pause.release')}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>🆕 {t('admin.create.title')}</h2>
        <p className="hint">{t('admin.create.help')}</p>

        <div className="status-row" style={{ marginBottom: '16px' }}>
          <span>{lang === 'zh' ? 'Topic 数量' : 'Topic Count'}</span>
          <span style={{ color: ownerInputs.filter(o => o.trim()).length >= 3 ? 'var(--accent)' : 'var(--primary)' }}>
            {ownerInputs.filter(o => o.trim()).length} / 3-5
          </span>
        </div>

        <div className="form-grid" style={{ gap: '12px' }}>
          {ownerInputs.map((value, index) => (
            <div key={`owner-${index}`} className="field full" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', textAlign: 'left' }}>
                  Topic {index + 1} {t('admin.create.owners')}
                </span>
                <input
                  value={value}
                  placeholder="0x..."
                  onChange={(event) => updateOwner(index, event.target.value)}
                  style={{ width: '100%', textAlign: 'left' }}
                />
              </div>
              {ownerInputs.length > 3 && (
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => removeOwner(index)}
                  style={{ padding: '8px 12px', minWidth: 'auto', marginTop: '20px' }}
                  title={lang === 'zh' ? '移除' : 'Remove'}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="actions" style={{ marginTop: '12px', marginBottom: '16px' }}>
          {ownerInputs.length < 5 && (
            <button className="btn ghost" type="button" onClick={addOwner}>
              + {t('admin.create.addOwner')}
            </button>
          )}
        </div>

        <div className="form-grid" style={{ gap: '16px', marginTop: '16px' }}>
          <label className="field full">
            <DateTimePicker
              value={voteStart}
              onChange={setVoteStart}
              label={t('admin.create.start')}
            />
          </label>
          <label className="field full">
            <DateTimePicker
              value={voteEnd}
              onChange={setVoteEnd}
              label={t('admin.create.end')}
            />
          </label>
        </div>

        <div className="actions" style={{ marginTop: '20px' }}>
          <button
            className="btn primary"
            onClick={handleCreateProposal}
            disabled={isWriting || action === 'create' || ownerInputs.filter(o => isAddress(o.trim())).length < 3}
          >
            {action === 'create' ? t('admin.create.submitting') : t('admin.create.submit')}
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
