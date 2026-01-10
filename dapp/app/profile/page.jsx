"use client";

import { useEffect, useMemo, useState } from 'react';
import {
    useAccount,
    useChainId,
    usePublicClient,
} from 'wagmi';
import { isAddress, parseAbi, formatUnits } from 'viem';

import { defaultChainId, getChainOptions } from '../../lib/appConfig';
import { bytes32ToCid, fetchFromIPFS } from '../../lib/ipfs';
import { statusLoading, statusLoaded, statusEmpty, statusError } from '../../lib/status';
import { useI18n } from '../components/LanguageProvider';
import { useTheme } from '../components/ThemeProvider';
import CopyButton from '../components/CopyButton';
import StatusNotice from '../components/StatusNotice';
import TokenBalance from '../../components/TokenBalance';
import ExplorerLink from '../components/ExplorerLink';
import Link from 'next/link';

const ESCROW_ABI = parseAbi([
    'function getProposal(uint256 proposalId) view returns (uint64,uint64,uint8,uint8,uint256,uint256,bool,uint256,uint256,uint256,bool,bytes32,bytes32,bytes32,uint256,bool,address,bytes32,bytes32,bool,address,bool,bool,bytes32)',
]);

const ERC20_ABI = parseAbi([
    'function balanceOf(address account) view returns (uint256)',
]);

const ESCROW_EVENTS_ABI = parseAbi([
    'event Voted(address indexed voter,uint256 indexed proposalId,uint256 indexed topicId,uint256 amount)',
    'event DeliveryChallenged(uint256 indexed proposalId,address indexed challenger,bytes32 reasonHash,bytes32 evidenceHash)',
    'event ProposalCreated(uint256 indexed proposalId,uint64 startTime,uint64 endTime,uint256[] topicIds,address[] topicOwners,bytes32[] contentCids,bytes32 metadata,address indexed creator)',
]);

const shortAddress = (address) =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';

// Helper function to fetch logs in chunks to avoid RPC block range limits
const fetchLogsChunked = async (publicClient, params, startBlock) => {
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = startBlock ? BigInt(startBlock) : 0n;
    const CHUNK_SIZE = 50000n;

    const chunks = [];
    for (let i = fromBlock; i <= currentBlock; i += CHUNK_SIZE) {
        const toBlock = i + CHUNK_SIZE - 1n < currentBlock ? i + CHUNK_SIZE - 1n : currentBlock;
        chunks.push({ from: i, to: toBlock });
    }

    const allResults = await Promise.all(
        chunks.map(async ({ from, to }) => {
            try {
                return await publicClient.getLogs({
                    ...params,
                    fromBlock: from,
                    toBlock: to,
                });
            } catch (e) {
                console.warn(`Failed to fetch logs for range ${from}-${to}`, e);
                return [];
            }
        })
    );

    return allResults.flat();
};

export default function ProfilePage() {
    const { t, lang } = useI18n();
    const { mounted } = useTheme();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const publicClient = usePublicClient();

    const chainOptions = useMemo(getChainOptions, []);
    const [targetChainId, setTargetChainId] = useState(defaultChainId || '');

    // Tabs state
    const [activeTab, setActiveTab] = useState('proposals');

    // Sync targetChainId with wallet chainId
    useEffect(() => {
        if (chainId && chainOptions.some(c => c.id === chainId)) {
            setTargetChainId(chainId);
        }
    }, [chainId, chainOptions]);

    const [votes, setVotes] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [topics, setTopics] = useState([]);
    const [createdProposals, setCreatedProposals] = useState([]);
    const [proposalTitles, setProposalTitles] = useState({});

    const [votesStatus, setVotesStatus] = useState(statusEmpty());
    const [challengesStatus, setChallengesStatus] = useState(statusEmpty());
    const [topicsStatus, setTopicsStatus] = useState(statusEmpty());
    const [createdProposalsStatus, setCreatedProposalsStatus] = useState(statusEmpty());
    const [expandedTx, setExpandedTx] = useState(null);

    const chainConfig = useMemo(() => {
        return chainOptions.find((c) => c.id === Number(targetChainId));
    }, [chainOptions, targetChainId]);

    // Airdrop data
    const [airdrops, setAirdrops] = useState([]);
    const [airdropsStatus, setAirdropsStatus] = useState(statusEmpty());

    const airdropAddress = chainConfig?.airdropAddress || '';
    const universalAirdropAddress = chainConfig?.universalAirdropAddress || '';

    // Load Airdrop history
    useEffect(() => {
        const loadAirdrops = async () => {
            if (!publicClient || !address) {
                setAirdrops([]);
                return;
            }

            try {
                setAirdropsStatus(statusLoading());

                // Fetch Merkle Airdrop Logs
                let merkleLogs = [];
                if (isAddress(airdropAddress)) {
                    merkleLogs = await fetchLogsChunked(
                        publicClient,
                        {
                            address: airdropAddress,
                            event: parseAbi(['event Claimed(address indexed to, uint256 amount)'])[0],
                            args: { to: address },
                        },
                        chainConfig?.startBlock
                    );
                }

                // Fetch Universal Airdrop Logs
                let universalLogs = [];
                if (isAddress(universalAirdropAddress)) {
                    universalLogs = await fetchLogsChunked(
                        publicClient,
                        {
                            address: universalAirdropAddress,
                            event: parseAbi(['event Claimed(address indexed user, uint256 amount)'])[0],
                            args: { user: address },
                        },
                        chainConfig?.startBlock
                    );
                }

                const allLogs = [...merkleLogs, ...universalLogs];
                // Sort by block number descending
                allLogs.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

                const mapped = allLogs.map((log) => ({
                    amount: log.args?.amount ? formatUnits(log.args.amount, 18) : (log.args?.[1] ? formatUnits(log.args[1], 18) : '-'),
                    // Note: if args are named differently, accessing by index or normalizing might be needed depending on viem version.
                    // safely accessing args.
                    blockNumber: log.blockNumber?.toString(),
                    txHash: log.transactionHash,
                }));

                setAirdrops(mapped);
                setAirdropsStatus(mapped.length ? statusLoaded() : statusEmpty());
            } catch (error) {
                const message = error?.shortMessage || error?.message || 'Load failed';
                setAirdropsStatus(statusError('status.error', { message }));
            }
        };

        if (isConnected) {
            loadAirdrops();
        }
    }, [publicClient, airdropAddress, universalAirdropAddress, address, isConnected, chainConfig]);

    const escrowAddress = chainConfig?.escrowAddress || '';

    // Helper to fetch valid titles
    const fetchAndCacheTitles = async (items, type = 'log') => {
        if (!publicClient || !isAddress(escrowAddress)) return;

        const needsFetch = [];
        const hashesToFetch = {};

        // 1. Identify what needs fetching
        for (const item of items) {
            const pid = item.proposalId;
            if (!pid || proposalTitles[pid]) continue;

            // If we already have the hash from the event (Created Proposals), use it
            if (item.metadataHash && item.metadataHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                hashesToFetch[pid] = item.metadataHash;
            } else {
                needsFetch.push(pid);
            }
        }

        // 2. Fetch hashes for items that don't have them (Votes, Topics, Challenges)
        if (needsFetch.length > 0) {
            // Deduplicate
            const uniquePids = [...new Set(needsFetch)];
            try {
                const results = await Promise.all(
                    uniquePids.map(pid =>
                        publicClient.readContract({
                            address: escrowAddress,
                            abi: ESCROW_ABI,
                            functionName: 'getProposal',
                            args: [BigInt(pid)]
                        }).catch(() => null)
                    )
                );

                results.forEach((res, idx) => {
                    // metadata is at index 23 in the returned tuple from getProposal
                    if (res && res[23] && res[23] !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                        hashesToFetch[uniquePids[idx]] = res[23];
                    }
                });
            } catch (e) {
                console.error("Failed to fetch proposal hashes", e);
            }
        }

        // 3. Fetch IPFS content
        const newTitles = {};
        await Promise.all(
            Object.entries(hashesToFetch).map(async ([pid, hash]) => {
                try {
                    const cid = bytes32ToCid(hash);
                    const data = await fetchFromIPFS(cid);
                    if (data?.title) {
                        newTitles[pid] = data.title;
                    }
                } catch (e) { /* ignore */ }
            })
        );

        if (Object.keys(newTitles).length > 0) {
            setProposalTitles(prev => ({ ...prev, ...newTitles }));
        }
    };

    // Load Created Proposals
    useEffect(() => {
        const loadCreatedProposals = async () => {
            if (!publicClient || !isAddress(escrowAddress) || !address) {
                setCreatedProposals([]);
                return;
            }
            try {
                setCreatedProposalsStatus(statusLoading());
                const logs = await fetchLogsChunked(
                    publicClient,
                    {
                        address: escrowAddress,
                        event: ESCROW_EVENTS_ABI[2], // ProposalCreated
                        args: { creator: address },
                    },
                    chainConfig?.startBlock
                );

                const mapped = logs.map(log => ({
                    proposalId: log.args.proposalId.toString(),
                    topicCount: log.args.topicIds.length,
                    startTime: log.args.startTime.toString(),
                    blockNumber: log.blockNumber.toString(),
                    metadataHash: log.args.metadata // Capture metadata hash from event
                }));
                // Sort newest first
                mapped.reverse();

                setCreatedProposals(mapped);
                setCreatedProposalsStatus(mapped.length ? statusLoaded() : statusEmpty());

                // Trigger title fetch
                fetchAndCacheTitles(mapped);
            } catch (error) {
                const message = error?.shortMessage || error?.message || 'Load failed';
                setCreatedProposalsStatus(statusError('status.error', { message }));
            }
        };

        if (isConnected) loadCreatedProposals();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicClient, escrowAddress, address, isConnected, chainConfig]);


    // 加载用户投票记录
    useEffect(() => {
        const loadVotes = async () => {
            if (!publicClient || !isAddress(escrowAddress) || !address) {
                setVotes([]);
                return;
            }

            try {
                setVotesStatus(statusLoading());
                const logs = await fetchLogsChunked(
                    publicClient,
                    {
                        address: escrowAddress,
                        event: ESCROW_EVENTS_ABI[0], // Voted event
                        args: { voter: address },
                    },
                    chainConfig?.startBlock
                );

                const mapped = logs.map((log) => ({
                    proposalId: log.args?.proposalId?.toString() ?? '-',
                    topicId: log.args?.topicId?.toString() ?? '-',
                    amount: log.args?.amount ? formatUnits(log.args.amount, 18) : '-',
                    blockNumber: log.blockNumber?.toString(),
                    txHash: log.transactionHash,
                }));

                setVotes(mapped);
                setVotesStatus(mapped.length ? statusLoaded() : statusEmpty());
                fetchAndCacheTitles(mapped);
            } catch (error) {
                const message = error?.shortMessage || error?.message || 'Load failed';
                setVotesStatus(statusError('status.error', { message }));
            }
        };

        if (isConnected) {
            loadVotes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicClient, escrowAddress, address, isConnected, chainConfig]);

    // 加载用户质疑记录
    useEffect(() => {
        const loadChallenges = async () => {
            if (!publicClient || !isAddress(escrowAddress) || !address) {
                setChallenges([]);
                return;
            }

            try {
                setChallengesStatus(statusLoading());
                const logs = await fetchLogsChunked(
                    publicClient,
                    {
                        address: escrowAddress,
                        event: ESCROW_EVENTS_ABI[1], // DeliveryChallenged event
                        args: { challenger: address },
                    },
                    chainConfig?.startBlock
                );

                const mapped = logs.map((log) => ({
                    proposalId: log.args?.proposalId?.toString() ?? '-',
                    blockNumber: log.blockNumber?.toString(),
                    txHash: log.transactionHash,
                }));

                setChallenges(mapped);
                setChallengesStatus(mapped.length ? statusLoaded() : statusEmpty());
                fetchAndCacheTitles(mapped);
            } catch (error) {
                const message = error?.shortMessage || error?.message || 'Load failed';
                setChallengesStatus(statusError('status.error', { message }));
            }
        };

        if (isConnected) {
            loadChallenges();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicClient, escrowAddress, address, isConnected, chainConfig]);

    // 加载用户的 Topic
    useEffect(() => {
        const loadTopics = async () => {
            if (!publicClient || !isAddress(escrowAddress) || !address) {
                setTopics([]);
                return;
            }

            try {
                setTopicsStatus(statusLoading());
                const logs = await fetchLogsChunked(
                    publicClient,
                    {
                        address: escrowAddress,
                        event: ESCROW_EVENTS_ABI[2], // ProposalCreated event
                    },
                    chainConfig?.startBlock
                );

                const userTopics = [];
                for (const log of logs) {
                    const proposalId = log.args?.proposalId?.toString();
                    const topicOwners = log.args?.topicOwners || [];
                    const topicIds = log.args?.topicIds || [];

                    topicOwners.forEach((owner, index) => {
                        if (owner.toLowerCase() === (address || '').toLowerCase()) {
                            userTopics.push({
                                proposalId,
                                topicId: topicIds[index]?.toString() ?? index.toString(),
                                blockNumber: log.blockNumber?.toString(),
                            });
                        }
                    });
                }

                setTopics(userTopics);
                setTopicsStatus(userTopics.length ? statusLoaded() : statusEmpty());
                fetchAndCacheTitles(userTopics);
            } catch (error) {
                const message = error?.shortMessage || error?.message || 'Load failed';
                setTopicsStatus(statusError('status.error', { message }));
            }
        };

        if (isConnected) {
            loadTopics();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicClient, escrowAddress, address, isConnected, chainConfig]);

    // Compute aggregated transactions from all activities
    const transactions = useMemo(() => {
        const txList = [];

        // Add votes with txHash
        votes.forEach((vote) => {
            if (vote.txHash) {
                txList.push({
                    type: 'vote',
                    txHash: vote.txHash,
                    blockNumber: vote.blockNumber,
                    description: proposalTitles[vote.proposalId]
                        ? `${proposalTitles[vote.proposalId]} / Topic #${vote.topicId}`
                        : `Proposal #${vote.proposalId} / Topic #${vote.topicId}`,
                    amount: vote.amount,
                });
            }
        });

        // Add airdrops with txHash
        airdrops.forEach((airdrop) => {
            if (airdrop.txHash) {
                txList.push({
                    type: 'airdrop',
                    txHash: airdrop.txHash,
                    blockNumber: airdrop.blockNumber,
                    description: `${airdrop.amount} GUA`,
                    amount: airdrop.amount,
                });
            }
        });

        // Add challenges with txHash
        challenges.forEach((challenge) => {
            if (challenge.txHash) {
                txList.push({
                    type: 'challenge',
                    txHash: challenge.txHash,
                    blockNumber: challenge.blockNumber,
                    description: proposalTitles[challenge.proposalId]
                        ? proposalTitles[challenge.proposalId]
                        : `Proposal #${challenge.proposalId}`,
                });
            }
        });

        // Sort by block number descending
        txList.sort((a, b) => Number(b.blockNumber || 0) - Number(a.blockNumber || 0));

        return txList;
    }, [votes, airdrops, challenges, proposalTitles]);

    const tabs = [
        { id: 'proposals', label: t('profile.tab.proposals') },
        { id: 'topics', label: t('profile.topics') },
        { id: 'votes', label: t('profile.votes') },
        { id: 'challenges', label: t('profile.challenges') },
        { id: 'airdrops', label: t('profile.airdrops') },
        { id: 'transactions', label: t('profile.transactions') },
    ];

    return (
        <main className="layout">
            <section className="panel hero">
                <div>
                    <p className="eyebrow">{t('profile.eyebrow')}</p>
                    <h1>{t('profile.title')}</h1>
                    <p className="lede">{t('profile.lede')}</p>
                </div>
                <div className="status-card">
                    <div className="status-row">
                        <span>{t('airdrop.status.wallet')}</span>
                        <span>{mounted ? (isConnected ? t('airdrop.status.connected') : t('airdrop.status.disconnected')) : '-'}</span>
                    </div>
                    <div className="status-row">
                        <span>{t('airdrop.status.address')}</span>
                        <span className="inline-group">
                            {shortAddress(address)}
                            <CopyButton value={address} />
                        </span>
                    </div>

                    <div className="status-row">
                        <span>{t('airdrop.status.network')}</span>
                        <span>{chainId || '-'}</span>
                    </div>
                </div>
            </section>

            {/* Stats Grid */}
            <section className="panel" style={{ background: 'transparent', border: 'none', padding: '0', boxShadow: 'none', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                    <div className="status-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {t('profile.stats.votes')}
                        </span>
                        <span style={{ fontSize: '1.8rem', fontFamily: 'var(--font-title)', fontWeight: '600', color: 'var(--accent)' }}>
                            {votes.length}
                        </span>
                    </div>
                    <div className="status-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {t('profile.stats.proposals')}
                        </span>
                        <span style={{ fontSize: '1.8rem', fontFamily: 'var(--font-title)', fontWeight: '600', color: 'var(--accent)' }}>
                            {createdProposals.length}
                        </span>
                    </div>
                    <div className="status-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {t('profile.stats.airdrops')}
                        </span>
                        <span style={{ fontSize: '1.8rem', fontFamily: 'var(--font-title)', fontWeight: '600', color: 'var(--accent)' }}>
                            {airdrops.length}
                        </span>
                    </div>
                    <div className="status-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {t('profile.stats.airdropAmount')}
                        </span>
                        <span style={{ fontSize: '1.8rem', fontFamily: 'var(--font-title)', fontWeight: '600', color: 'var(--accent)' }}>
                            {airdrops.reduce((acc, curr) => {
                                const val = parseFloat(curr.amount);
                                return acc + (isNaN(val) ? 0 : val);
                            }, 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="status-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {t('profile.balance')}
                        </span>
                        <span style={{ fontSize: '1.8rem', fontFamily: 'var(--font-title)', fontWeight: '600', color: 'var(--accent)' }}>
                            <TokenBalance />
                        </span>
                    </div>
                </div>
            </section>

            <section className="panel" style={{ padding: '0 1rem', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                <div className="hero-actions" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`mode-toggle ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </section>

            {activeTab === 'proposals' && (
                <section className="panel">
                    <h2>{t('profile.tab.proposals')}</h2>
                    {createdProposals.length === 0 ? (
                        <>
                            <p className="muted">{t('profile.noProposals')}</p>
                            <StatusNotice status={createdProposalsStatus} />
                        </>
                    ) : (
                        <div className="status-grid">
                            {createdProposals.map((item, index) => (
                                <Link key={`prop-${index}`} href={`/proposals/${item.proposalId}`} className="status-row" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                                    <span>
                                        {proposalTitles[item.proposalId] ? proposalTitles[item.proposalId] : `${t('proposal.detail.title')}${item.proposalId}`}
                                    </span>
                                    <span>
                                        {item.topicCount} {t('proposals.create.topic')}
                                        <span className="muted" style={{ marginLeft: '8px' }}>#{item.blockNumber}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'airdrops' && (
                <section className="panel">
                    <h2>{t('profile.airdrops')}</h2>
                    {airdrops.length === 0 ? (
                        <>
                            <p className="muted">{t('profile.noAirdrops')}</p>
                            <StatusNotice status={airdropsStatus} />
                        </>
                    ) : (
                        <div className="status-grid">
                            {airdrops.map((item, index) => (
                                <div key={`airdrop-${index}`} className="status-row">
                                    <span>{t('airdrop.guide.claim')}</span>
                                    <span className="inline-group">
                                        {item.amount} GUA
                                        <span className="muted">#{item.blockNumber}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'votes' && (
                <section className="panel">
                    <h2>{t('profile.votes')}</h2>
                    {votes.length === 0 ? (
                        <>
                            <p className="muted">{t('profile.noVotes')}</p>
                            <StatusNotice status={votesStatus} />
                        </>
                    ) : (
                        <div className="status-grid">
                            {votes.map((vote, index) => (
                                <Link key={`vote-${index}`} href={`/proposals/${vote.proposalId}`} className="status-row" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                                    <span>
                                        {proposalTitles[vote.proposalId] ? proposalTitles[vote.proposalId] : `${t('proposal.detail.title')}${vote.proposalId}`} / Topic #{vote.topicId}
                                    </span>
                                    <span>{vote.amount} GUA</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'topics' && (
                <section className="panel">
                    <h2>{t('profile.topics')}</h2>
                    {topics.length === 0 ? (
                        <>
                            <p className="muted">{t('profile.noTopics')}</p>
                            <StatusNotice status={topicsStatus} />
                        </>
                    ) : (
                        <div className="status-grid">
                            {topics.map((topic, index) => (
                                <Link key={`topic-${index}`} href={`/proposals/${topic.proposalId}`} className="status-row" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                                    <span>
                                        {proposalTitles[topic.proposalId] ? proposalTitles[topic.proposalId] : `${t('proposal.detail.title')}${topic.proposalId}`}
                                    </span>
                                    <span>{t('proposals.create.topic')} #{topic.topicId}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'challenges' && (
                <section className="panel">
                    <h2>{t('profile.challenges')}</h2>
                    {challenges.length === 0 ? (
                        <>
                            <p className="muted">{t('profile.noChallenges')}</p>
                            <StatusNotice status={challengesStatus} />
                        </>
                    ) : (
                        <div className="status-grid">
                            {challenges.map((challenge, index) => (
                                <Link key={`challenge-${index}`} href={`/proposals/${challenge.proposalId}`} className="status-row" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                                    <span>
                                        {proposalTitles[challenge.proposalId] ? proposalTitles[challenge.proposalId] : `${t('proposal.detail.title')}${challenge.proposalId}`}
                                    </span>
                                    <span>#{challenge.blockNumber}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'transactions' && (
                <section className="panel">
                    <h2>{t('profile.transactions')}</h2>
                    {transactions.length === 0 ? (
                        <>
                            <p className="muted">{t('profile.noTransactions')}</p>
                        </>
                    ) : (
                        <div className="status-grid">
                            {transactions.map((tx, index) => (
                                <div
                                    key={`tx-${index}`}
                                    className="status-row"
                                    style={{
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        gap: '8px',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                        setExpandedTx(prev => prev === index ? null : index);
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span className="badge" style={{ fontSize: '0.75rem' }}>
                                                {t(`profile.tx.type.${tx.type}`)}
                                            </span>
                                            <span>{tx.description}</span>
                                        </span>
                                        <span className="inline-group">
                                            <span className="muted">#{tx.blockNumber}</span>
                                            <span style={{ fontSize: '0.8rem' }}>{expandedTx === index ? '▲' : '▼'}</span>
                                        </span>
                                    </div>
                                    {expandedTx === index && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                padding: '12px',
                                                background: 'rgba(0,0,0,0.03)',
                                                borderRadius: '8px',
                                                fontSize: '0.9em'
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {tx.type === 'vote' && tx.amount && tx.amount !== '-' && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span className="muted">{t('voting.amount.label')}</span>
                                                    <span style={{ color: '#e74c3c', fontWeight: '600' }}>-{tx.amount} GUA</span>
                                                </div>
                                            )}
                                            {tx.type === 'airdrop' && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span className="muted">{t('airdrop.claim.amount')}</span>
                                                    <span style={{ color: 'var(--accent)', fontWeight: '600' }}>+{tx.amount} GUA</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span className="muted">Tx Hash</span>
                                                <span className="inline-group">
                                                    <span style={{ fontSize: '0.85em' }}>{tx.txHash?.slice(0, 10)}...{tx.txHash?.slice(-8)}</span>
                                                    <CopyButton value={tx.txHash} />
                                                    <ExplorerLink chainId={chainId} type="tx" value={tx.txHash} />
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}
