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

const ESCROW_ABI = parseAbi([
  'function getProposal(uint256 proposalId) view returns (uint64,uint64,uint8,uint8,uint256,uint256,bool,uint256,uint256,uint256,bool,bytes32,bytes32,bytes32,uint256,bool,address,bytes32,bytes32,bool,address,bool,bool,bytes32)',
  'function createProposal(address[] topicOwners,bytes32[] contentCids,bytes32 metadata,uint64 startTime,uint64 endTime) returns (uint256)',
  'function finalizeVoting(uint256 proposalId)',
  'function confirmWinnerAndPay10(uint256 proposalId)',
  'function resolveDispute(uint256 proposalId,bool approve)',
  'function markSpam(uint256 proposalId)',
  'function confiscateDeposit(uint256 proposalId)',
  'function pause()',
  'function unpause()',
  'function paused() view returns (bool)',
  'function owner() view returns (address)',
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
  const [lastTxHash, setLastTxHash] = useState('');

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const publicClient = usePublicClient();

  const chainMismatch = isConnected && targetChainId && chainId !== targetChainId;

  // Read contract owner
  const ownerResult = useReadContract({
    address: isAddress(escrowAddress) ? escrowAddress : undefined,
    abi: ESCROW_ABI,
    functionName: 'owner',
    query: {
      enabled: isAddress(escrowAddress),
    },
  });

  const isAdmin = isConnected && ownerResult.data && address?.toLowerCase() === ownerResult.data.toLowerCase();



  // Sync targetChainId with wallet chainId
  useEffect(() => {
    if (chainId && chainOptions.some(c => c.id === chainId)) {
      setTargetChainId(chainId);
    }
  }, [chainId, chainOptions]);

  useEffect(() => {
    const active = chainOptions.find((item) => item.id === Number(targetChainId));
    if (!active) return;
    setEscrowAddress(active.escrowAddress || '');
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

  const runAction = async (name, fn) => {
    setAction(name);
    setStatus(statusTxSubmitted());
    try {
      const hash = await fn();
      setLastTxHash(hash);
      setStatus(statusTxConfirming());
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(statusTxConfirmed());
      pausedResult.refetch();
    } catch (error) {
      console.error(error);
      setStatus(statusError(error.shortMessage || error.message));
    } finally {
      setAction('');
    }
  };

  const handlePause = () => {
    if (!isAddress(escrowAddress)) {
      setStatus(statusInvalidAddress());
      return;
    }
    if (chainMismatch) {
      setStatus(statusNetworkMismatch());
      return;
    }
    runAction('pause', () =>
      writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'pause',
        chainId: Number(targetChainId),
      })
    );
  };

  const handleUnpause = () => {
    if (!isAddress(escrowAddress)) {
      setStatus(statusInvalidAddress());
      return;
    }
    if (chainMismatch) {
      setStatus(statusNetworkMismatch());
      return;
    }
    runAction('unpause', () =>
      writeContractAsync({
        address: escrowAddress,
        abi: ESCROW_ABI,
        functionName: 'unpause',
        chainId: Number(targetChainId),
      })
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

      {!isConnected && (
        <section className="panel">
          <p className="hint">{lang === 'zh' ? '请先连接钱包' : 'Please connect wallet first'}</p>
        </section>
      )}

      {isConnected && !isAdmin && (
        <section className="panel">
          <p className="hint" style={{ color: 'var(--primary)' }}>
            {lang === 'zh' ? '⚠️ 当前钱包不是合约管理员，无法使用管理功能' : '⚠️ Current wallet is not the contract owner. Admin functions are disabled.'}
          </p>
        </section>
      )}

      {isAdmin && (
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
      )}
    </main>
  );
}
