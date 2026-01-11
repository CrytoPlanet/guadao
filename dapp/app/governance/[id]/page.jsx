"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useChainId, useSwitchChain, usePublicClient, useWriteContract, useReadContract } from 'wagmi';
import { isAddress, parseAbi, formatUnits, keccak256, toBytes } from 'viem';
import { defaultChainId, getChainOptions } from '../../../lib/appConfig';
import { statusReady, statusLoading, statusLoaded, statusError, statusTxSubmitted, statusTxConfirming, statusTxConfirmed, statusNetworkMismatch, statusNoRpc } from '../../../lib/status';
import { useI18n } from '../../components/LanguageProvider';
import StatusNotice from '../../components/StatusNotice';
import ExplorerLink from '../../components/ExplorerLink';
import MarkdownRenderer from '../../components/MarkdownRenderer';

const GOVERNOR_ABI = parseAbi([
    'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)',
    'function state(uint256 proposalId) view returns (uint8)',
    'function proposalSnapshot(uint256 proposalId) view returns (uint256)',
    'function proposalDeadline(uint256 proposalId) view returns (uint256)',
    'function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)',
    'function castVote(uint256 proposalId, uint8 support)',
    'function hasVoted(uint256 proposalId, address account) view returns (bool)',
    'function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash)',
    'function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash)'
]);

const TOKEN_ABI = parseAbi([
    'function getVotes(address account) view returns (uint256)',
    'function delegates(address account) view returns (address)',
    'function delegate(address delegatee)'
]);



const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(Number(timestamp) * 1000);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

export default function GovernanceDetailPage() {
    const { t, lang } = useI18n();
    const params = useParams();
    const chainOptions = useMemo(getChainOptions, []);
    const [targetChainId, setTargetChainId] = useState(defaultChainId || '');
    const [governorAddress, setGovernorAddress] = useState('');
    const [guaTokenAddress, setGuaTokenAddress] = useState('');

    const [proposalData, setProposalData] = useState(null);
    const [status, setStatus] = useState(statusReady());
    const [action, setAction] = useState('');
    const [userDelegatee, setUserDelegatee] = useState(null);

    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
    const { writeContractAsync, isPending: isWriting } = useWriteContract();
    const publicClient = usePublicClient();

    const proposalId = useMemo(() => {
        try {
            return params?.id ? BigInt(params.id) : null;
        } catch { return null; }
    }, [params]);

    const activeChainConfig = useMemo(() =>
        chainOptions.find((item) => item.id === Number(targetChainId)),
        [chainOptions, targetChainId]);

    const chainMismatch = isConnected && targetChainId && chainId !== targetChainId;

    // Sync chainId
    useEffect(() => {
        if (chainId && chainOptions.some(c => c.id === chainId)) {
            setTargetChainId(chainId);
        }
    }, [chainId, chainOptions]);

    // Set addresses
    useEffect(() => {
        if (!activeChainConfig) return;
        setGovernorAddress(activeChainConfig.governorAddress || '');
        setGuaTokenAddress(activeChainConfig.guaTokenAddress || '');
    }, [activeChainConfig]);

    // Fetch Logic
    useEffect(() => {
        const load = async () => {
            if (!publicClient || !isAddress(governorAddress) || proposalId === null) return;

            try {
                setStatus(statusLoading());

                // 1. Fetch State & Votes using Promise.all
                const [state, votes, hasVotedUser, snapshot, deadline, quorumVal] = await Promise.all([
                    publicClient.readContract({ address: governorAddress, abi: GOVERNOR_ABI, functionName: 'state', args: [proposalId] }),
                    publicClient.readContract({ address: governorAddress, abi: GOVERNOR_ABI, functionName: 'proposalVotes', args: [proposalId] }),
                    publicClient.readContract({ address: governorAddress, abi: GOVERNOR_ABI, functionName: 'hasVoted', args: [proposalId, address || '0x0000000000000000000000000000000000000000'] }),
                    publicClient.readContract({ address: governorAddress, abi: GOVERNOR_ABI, functionName: 'proposalSnapshot', args: [proposalId] }),
                    publicClient.readContract({ address: governorAddress, abi: GOVERNOR_ABI, functionName: 'proposalDeadline', args: [proposalId] }),
                    publicClient.readContract({ address: governorAddress, abi: GOVERNOR_ABI, functionName: 'quorum', args: [proposalId] }).catch(() => 0n),
                ]);

                // Fetch User's Voting Power at Snapshot & Current Delegatee
                let myVotes = 0n;
                let delegatee = '0x0000000000000000000000000000000000000000';
                if (address && isAddress(guaTokenAddress)) {
                    try {
                        const [pastVotes, currentDelegatee] = await Promise.all([
                            publicClient.readContract({
                                address: guaTokenAddress,
                                abi: parseAbi(['function getPastVotes(address, uint256) view returns (uint256)']),
                                functionName: 'getPastVotes',
                                args: [address, snapshot]
                            }),
                            publicClient.readContract({
                                address: guaTokenAddress,
                                abi: TOKEN_ABI,
                                functionName: 'delegates',
                                args: [address]
                            })
                        ]);
                        myVotes = pastVotes;
                        delegatee = currentDelegatee;
                    } catch (e) { console.warn('Failed to fetch token data', e); }
                }
                setUserDelegatee(delegatee);

                // 2. Fetch Description from Event
                const startBlock = activeChainConfig?.startBlock ? BigInt(activeChainConfig.startBlock) : 0n;
                const currentBlock = await publicClient.getBlockNumber();
                const logs = await publicClient.getLogs({
                    address: governorAddress,
                    event: GOVERNOR_ABI[0],
                    args: { proposalId },
                    fromBlock: startBlock,
                    toBlock: currentBlock
                });

                const log = logs[0];

                setProposalData({
                    id: proposalId,
                    state: Number(state),
                    forVotes: votes ? votes[1] : 0n,
                    againstVotes: votes ? votes[0] : 0n,
                    abstainVotes: votes ? votes[2] : 0n,
                    hasVoted: hasVotedUser,
                    snapshot,
                    deadline,
                    quorum: quorumVal,
                    myVotes,
                    description: log?.args?.description || '',
                    proposer: log?.args?.proposer,
                    voteStart: log?.args?.voteStart,
                    voteEnd: log?.args?.voteEnd,
                    targets: log?.args?.targets || [],
                    values: log?.args?.values || [],
                    calldatas: log?.args?.calldatas || [],
                    signatures: log?.args?.signatures || [],
                });

                setStatus(statusLoaded());
            } catch (e) {
                console.error(e);
                setStatus(statusError('status.error', { message: e.message }));
            }
        };
        load();
    }, [publicClient, governorAddress, proposalId, address, activeChainConfig, guaTokenAddress]);

    // Voting
    const handleVote = async (support) => {
        if (!isConnected || chainMismatch) return;
        try {
            setAction('vote');
            setStatus(statusTxSubmitted());
            const hash = await writeContractAsync({
                address: governorAddress,
                abi: GOVERNOR_ABI,
                functionName: 'castVote',
                args: [proposalId, support]
            });
            setStatus(statusTxConfirming());
            await publicClient.waitForTransactionReceipt({ hash });
            setStatus(statusTxConfirmed());
            // Reload would be good here, but for now just status
        } catch (e) {
            if (e.message.includes('User rejected') || e.message.includes('User denied')) {
                setStatus(statusError('status.tx.rejected'));
            } else {
                setStatus(statusError('status.tx.failed', { reason: e.message }));
            }
        } finally {
            setAction('');
        }
    };

    // Delegate
    const handleDelegate = async () => {
        if (!isConnected || chainMismatch) return;
        try {
            setAction('delegate');
            setStatus(statusTxSubmitted());
            const hash = await writeContractAsync({
                address: guaTokenAddress,
                abi: TOKEN_ABI,
                functionName: 'delegate',
                args: [address]
            });
            setStatus(statusTxConfirming());
            await publicClient.waitForTransactionReceipt({ hash });
            setStatus(statusTxConfirmed());
            setUserDelegatee(address); // Optimistic update
        } catch (e) {
            if (e.message.includes('User rejected') || e.message.includes('User denied')) {
                setStatus(statusError('status.tx.rejected'));
            } else {
                setStatus(statusError('status.tx.failed', { reason: e.message }));
            }
        } finally {
            setAction('');
        }
    };

    // Queue (state 4 -> 5)
    const handleQueue = async () => {
        if (!isConnected || chainMismatch || !proposalData) return;
        try {
            setAction('queue');
            setStatus(statusTxSubmitted());
            const descriptionHash = keccak256(toBytes(proposalData.description));
            const hash = await writeContractAsync({
                address: governorAddress,
                abi: GOVERNOR_ABI,
                functionName: 'queue',
                args: [proposalData.targets, proposalData.values, proposalData.calldatas, descriptionHash]
            });
            setStatus(statusTxConfirming());
            await publicClient.waitForTransactionReceipt({ hash });
            setStatus(statusTxConfirmed());
        } catch (e) {
            if (e.message.includes('User rejected') || e.message.includes('User denied')) {
                setStatus(statusError('status.tx.rejected'));
            } else {
                setStatus(statusError('status.tx.failed', { reason: e.message }));
            }
        } finally {
            setAction('');
        }
    };

    // Execute (state 5 -> 7)
    const handleExecute = async () => {
        if (!isConnected || chainMismatch || !proposalData) return;
        try {
            setAction('execute');
            setStatus(statusTxSubmitted());
            const descriptionHash = keccak256(toBytes(proposalData.description));
            const hash = await writeContractAsync({
                address: governorAddress,
                abi: GOVERNOR_ABI,
                functionName: 'execute',
                args: [proposalData.targets, proposalData.values, proposalData.calldatas, descriptionHash]
            });
            setStatus(statusTxConfirming());
            await publicClient.waitForTransactionReceipt({ hash });
            setStatus(statusTxConfirmed());
        } catch (e) {
            if (e.message.includes('User rejected') || e.message.includes('User denied')) {
                setStatus(statusError('status.tx.rejected'));
            } else {
                setStatus(statusError('status.tx.failed', { reason: e.message }));
            }
        } finally {
            setAction('');
        }
    };


    return (
        <main className="layout">
            <section className="panel hero">
                <div>
                    <p className="eyebrow">{t('proposal.detail.eyebrow')}</p>
                    <h1>
                        {t('proposal.detail.title')}
                        {proposalId?.toString().length > 10
                            ? `${proposalId.toString().slice(0, 6)}...${proposalId.toString().slice(-4)}`
                            : proposalId?.toString()}
                    </h1>
                    <StatusNotice status={status} />
                </div>
                {proposalData && (
                    <div className="status-card">
                        <div className="status-row">
                            <span>{t('admin.statusLabel')}</span>
                            <span className="badge">{t(`governance.status.${proposalData.state}`) || proposalData.state}</span>
                        </div>
                        <div className="status-row">
                            <span>{t('voting.window.start')}</span>
                            <span>{formatDateTime(proposalData.voteStart)}</span>
                        </div>
                        <div className="status-row">
                            <span>{t('voting.window.end')}</span>
                            <span>{formatDateTime(proposalData.voteEnd)}</span>
                        </div>
                        <div className="status-row">
                            <span>{t('governance.votes.for')}</span>
                            <span>{formatUnits(proposalData.forVotes, 18)} GUA</span>
                        </div>
                        <div className="status-row">
                            <span>{t('governance.votes.against')}</span>
                            <span>{formatUnits(proposalData.againstVotes, 18)} GUA</span>
                        </div>
                        <div className="status-row">
                            <span>{t('governance.quorum')}</span>
                            <span>
                                {formatUnits(proposalData.quorum, 18)} GUA
                                <span style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                    ({Number(proposalData.quorum) > 0
                                        ? Math.min(((Number(proposalData.forVotes) + Number(proposalData.abstainVotes)) / Number(proposalData.quorum)) * 100, 100).toFixed(1)
                                        : '0'}%)
                                </span>
                            </span>
                        </div>
                        <div className="status-row">
                            <span>{t('governance.snapshot')}</span>
                            <span>{proposalData.snapshot.toString()}</span>
                        </div>
                        {isConnected && (
                            <div className="status-row" style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                                <span>{t('governance.myVotes')}</span>
                                <strong>{formatUnits(proposalData.myVotes || 0n, 18)} GUA</strong>
                            </div>
                        )}
                        {isConnected && userDelegatee === '0x0000000000000000000000000000000000000000' && (
                            <div style={{ marginTop: '1rem', background: 'rgba(255, 166, 0, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                                <p style={{ fontSize: '0.85em', color: 'orange', marginBottom: '0.5rem' }}>
                                    {t('governance.delegate.hint')}
                                </p>
                                <button className="btn sm secondary" onClick={handleDelegate} disabled={!!action || isWriting}>
                                    {t('governance.delegate.action')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {proposalData?.description && (
                <section className="panel">
                    <h2>{t('proposals.create.description')}</h2>
                    <MarkdownRenderer>{proposalData.description}</MarkdownRenderer>
                </section>
            )}

            {/* Actions Section */}
            {proposalData?.targets?.length > 0 && (
                <section className="panel">
                    <h2>{t('governance.actions.title')}</h2>
                    <div className="table-responsive">
                        {proposalData.targets.map((target, idx) => (
                            <div key={idx} style={{ marginBottom: '1.5rem', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ padding: '0.75rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                                    #{idx + 1} {t('governance.actions.useCalldata')}
                                </div>
                                <div style={{ padding: '0.5rem 1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                        <span className="muted">{t('governance.actions.target')}:</span>
                                        <ExplorerLink chainId={chainId} value={target} type="address" />
                                    </div>
                                    {proposalData.signatures[idx] && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                            <span className="muted">{t('governance.actions.signature')}:</span>
                                            <span className="mono" style={{ fontSize: '0.9em' }}>{proposalData.signatures[idx]}</span>
                                        </div>
                                    )}
                                    {proposalData.values[idx] > 0n && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                            <span className="muted">{t('governance.actions.value')}:</span>
                                            <span>{formatUnits(proposalData.values[idx], 18)} ETH</span>
                                        </div>
                                    )}
                                    {proposalData.calldatas[idx] && proposalData.calldatas[idx] !== '0x' && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <span className="muted" style={{ display: 'block', marginBottom: '0.25rem' }}>{t('governance.actions.calldata')}:</span>
                                            <div style={{
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                padding: '0.5rem',
                                                borderRadius: '4px',
                                                fontFamily: 'monospace',
                                                fontSize: '0.8em',
                                                wordBreak: 'break-all',
                                                maxHeight: '150px',
                                                overflowY: 'auto'
                                            }}>
                                                {proposalData.calldatas[idx]}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="panel">
                <h2>{t('governance.voting.title')}</h2>
                {proposalData?.state === 0 && (
                    <div className="status-message">
                        <p>{t('voting.window.pending', { time: formatDateTime(proposalData.voteStart) })}</p>
                    </div>
                )}

                {proposalData?.state === 1 && (
                    <>
                        {isConnected ? (
                            proposalData.hasVoted ? (
                                <p className="muted">{t('voting.steps.submit')} (Done)</p>
                            ) : (
                                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                    <button className="btn primary" onClick={() => handleVote(1)} disabled={!!action || proposalData.myVotes === 0n}>
                                        {t('governance.votes.for')}
                                    </button>
                                    <button className="btn secondary" onClick={() => handleVote(0)} disabled={!!action || proposalData.myVotes === 0n}>
                                        {t('governance.votes.against')}
                                    </button>
                                    <button className="btn ghost" onClick={() => handleVote(2)} disabled={!!action || proposalData.myVotes === 0n}>
                                        {t('governance.votes.abstain')}
                                    </button>
                                </div>
                            )
                        ) : (
                            <p className="muted">{t('wallet.connect')}</p>
                        )}
                        {isConnected && proposalData.myVotes === 0n && (
                            <p className="warning-text" style={{ color: 'orange', marginTop: '0.5rem' }}>
                                {t('governance.warning.noVotes')} {t('governance.warning.delegateCheck')}
                            </p>
                        )}
                    </>
                )}

                {/* Succeeded (4) -> Queue */}
                {proposalData?.state === 4 && (
                    <div className="actions">
                        <p className="muted" style={{ marginBottom: '1rem' }}>Proposal has succeeded. Queue it for execution.</p>
                        <button className="btn primary" onClick={handleQueue} disabled={!!action || isWriting}>
                            {t('governance.queue')}
                        </button>
                    </div>
                )}

                {/* Queued (5) -> Execute */}
                {proposalData?.state === 5 && (
                    <div className="actions">
                        <p className="muted" style={{ marginBottom: '1rem' }}>Proposal is queued. It can be executed after the timelock delay.</p>
                        <button className="btn primary" onClick={handleExecute} disabled={!!action || isWriting}>
                            {t('governance.execute')}
                        </button>
                    </div>
                )}

                {proposalData?.state === 2 && <p className="muted">Proposal Canceled</p>}
                {proposalData?.state === 3 && <p className="muted">Proposal Defeated</p>}
                {proposalData?.state === 6 && <p className="muted">Proposal Expired</p>}
                {proposalData?.state === 7 && <p className="muted">Proposal Executed</p>}
            </section>
        </main>
    );
}
