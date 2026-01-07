"use client";

import { useEffect, useMemo, useState } from 'react';
import {
    useAccount,
    useChainId,
    usePublicClient,
} from 'wagmi';
import { isAddress, parseAbi, formatUnits } from 'viem';

import { defaultChainId, getChainOptions } from '../../lib/appConfig';
import { statusLoading, statusLoaded, statusEmpty, statusError } from '../../lib/status';
import { useI18n } from '../components/LanguageProvider';
import CopyButton from '../components/CopyButton';
import StatusNotice from '../components/StatusNotice';
import TokenBalance from '../../components/TokenBalance';
import Link from 'next/link';

const ERC20_ABI = parseAbi([
    'function balanceOf(address account) view returns (uint256)',
]);

const ESCROW_EVENTS_ABI = parseAbi([
    'event Voted(address indexed voter,uint256 indexed proposalId,uint256 indexed topicId,uint256 amount)',
    'event DeliveryChallenged(uint256 indexed proposalId,address indexed challenger,bytes32 reasonHash,bytes32 evidenceHash)',
    'event ProposalCreated(uint256 indexed proposalId,uint64 startTime,uint64 endTime,uint256[] topicIds,address[] topicOwners)',
]);

const shortAddress = (address) =>
    address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';

export default function ProfilePage() {
    const { t } = useI18n();
    const chainOptions = useMemo(getChainOptions, []);
    const [targetChainId, setTargetChainId] = useState(defaultChainId || '');

    // Sync targetChainId with wallet chainId
    useEffect(() => {
        if (chainId && chainOptions.some(c => c.id === chainId)) {
            setTargetChainId(chainId);
        }
    }, [chainId, chainOptions]);
    const [votes, setVotes] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [topics, setTopics] = useState([]);
    const [votesStatus, setVotesStatus] = useState(statusEmpty());
    const [challengesStatus, setChallengesStatus] = useState(statusEmpty());
    const [topicsStatus, setTopicsStatus] = useState(statusEmpty());

    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const publicClient = usePublicClient();

    const chainConfig = useMemo(() => {
        return chainOptions.find((c) => c.id === Number(targetChainId));
    }, [chainOptions, targetChainId]);

    // Airdrop data
    const [airdrops, setAirdrops] = useState([]);
    const [airdropsStatus, setAirdropsStatus] = useState(statusEmpty());

    const airdropAddress = chainConfig?.airdropAddress || '';

    // Load Airdrop history
    useEffect(() => {
        const loadAirdrops = async () => {
            if (!publicClient || !isAddress(airdropAddress) || !address) {
                setAirdrops([]);
                return;
            }

            try {
                setAirdropsStatus(statusLoading());
                const logs = await publicClient.getLogs({
                    address: airdropAddress,
                    event: parseAbi(['event Claimed(address indexed to, uint256 amount)'])[0],
                    args: { to: address },
                    fromBlock: chainConfig?.startBlock ? BigInt(chainConfig.startBlock) : 'earliest',
                });

                const mapped = logs.map((log) => ({
                    amount: log.args?.amount ? formatUnits(log.args.amount, 18) : '-',
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
    }, [publicClient, airdropAddress, address, isConnected]);

    const escrowAddress = chainConfig?.escrowAddress || '';

    // 加载用户投票记录
    useEffect(() => {
        const loadVotes = async () => {
            if (!publicClient || !isAddress(escrowAddress) || !address) {
                setVotes([]);
                return;
            }

            try {
                setVotesStatus(statusLoading());
                const logs = await publicClient.getLogs({
                    address: escrowAddress,
                    event: ESCROW_EVENTS_ABI[0], // Voted event
                    args: { voter: address },
                    fromBlock: chainConfig?.startBlock ? BigInt(chainConfig.startBlock) : 'earliest',
                });

                const mapped = logs.map((log) => ({
                    proposalId: log.args?.proposalId?.toString() ?? '-',
                    topicId: log.args?.topicId?.toString() ?? '-',
                    amount: log.args?.amount ? formatUnits(log.args.amount, 18) : '-',
                    blockNumber: log.blockNumber?.toString(),
                    txHash: log.transactionHash,
                }));

                setVotes(mapped);
                setVotesStatus(mapped.length ? statusLoaded() : statusEmpty());
            } catch (error) {
                const message = error?.shortMessage || error?.message || 'Load failed';
                setVotesStatus(statusError('status.error', { message }));
            }
        };

        if (isConnected) {
            loadVotes();
        }
    }, [publicClient, escrowAddress, address, isConnected]);

    // 加载用户质疑记录
    useEffect(() => {
        const loadChallenges = async () => {
            if (!publicClient || !isAddress(escrowAddress) || !address) {
                setChallenges([]);
                return;
            }

            try {
                setChallengesStatus(statusLoading());
                const logs = await publicClient.getLogs({
                    address: escrowAddress,
                    event: ESCROW_EVENTS_ABI[1], // DeliveryChallenged event
                    args: { challenger: address },
                    fromBlock: chainConfig?.startBlock ? BigInt(chainConfig.startBlock) : 'earliest',
                });

                const mapped = logs.map((log) => ({
                    proposalId: log.args?.proposalId?.toString() ?? '-',
                    blockNumber: log.blockNumber?.toString(),
                    txHash: log.transactionHash,
                }));

                setChallenges(mapped);
                setChallengesStatus(mapped.length ? statusLoaded() : statusEmpty());
            } catch (error) {
                const message = error?.shortMessage || error?.message || 'Load failed';
                setChallengesStatus(statusError('status.error', { message }));
            }
        };

        if (isConnected) {
            loadChallenges();
        }
    }, [publicClient, escrowAddress, address, isConnected]);

    // 加载用户的 Topic
    useEffect(() => {
        const loadTopics = async () => {
            if (!publicClient || !isAddress(escrowAddress) || !address) {
                setTopics([]);
                return;
            }

            try {
                setTopicsStatus(statusLoading());
                const logs = await publicClient.getLogs({
                    address: escrowAddress,
                    event: ESCROW_EVENTS_ABI[2], // ProposalCreated event
                    fromBlock: chainConfig?.startBlock ? BigInt(chainConfig.startBlock) : 'earliest',
                });

                const userTopics = [];
                for (const log of logs) {
                    const proposalId = log.args?.proposalId?.toString();
                    const topicOwners = log.args?.topicOwners || [];
                    const topicIds = log.args?.topicIds || [];

                    topicOwners.forEach((owner, index) => {
                        if (owner.toLowerCase() === address.toLowerCase()) {
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
            } catch (error) {
                const message = error?.shortMessage || error?.message || 'Load failed';
                setTopicsStatus(statusError('status.error', { message }));
            }
        };

        if (isConnected) {
            loadTopics();
        }
    }, [publicClient, escrowAddress, address, isConnected]);

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
                        <span>{isConnected ? t('airdrop.status.connected') : t('airdrop.status.disconnected')}</span>
                    </div>
                    <div className="status-row">
                        <span>{t('airdrop.status.address')}</span>
                        <span className="inline-group">
                            {shortAddress(address)}
                            <CopyButton value={address} />
                        </span>
                    </div>
                    <div className="status-row">
                        <span>{t('profile.balance')}</span>
                        <span><TokenBalance /></span>
                    </div>
                    <div className="status-row">
                        <span>{t('airdrop.status.network')}</span>
                        <span>{chainId || '-'}</span>
                    </div>
                </div>
            </section>

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
                                    {t('proposal.detail.title')}{vote.proposalId} / Topic #{vote.topicId}
                                </span>
                                <span>{vote.amount} GUA</span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

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
                                    {t('proposal.detail.title')}{topic.proposalId}
                                </span>
                                <span>Topic #{topic.topicId}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

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
                                    {t('proposal.detail.title')}{challenge.proposalId}
                                </span>
                                <span>#{challenge.blockNumber}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
