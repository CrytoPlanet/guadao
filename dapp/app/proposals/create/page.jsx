"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    useAccount,
    useChainId,
    useSwitchChain,
    useWriteContract,
    usePublicClient,
    useReadContract,
} from 'wagmi';
import { isAddress, parseAbi, parseEther } from 'viem';
import { uploadToIPFS, cidToBytes32, createTopicContent } from '../../../lib/ipfs';

import MarkdownRenderer from '../../components/MarkdownRenderer';
import MarkdownEditor from '../../components/MarkdownEditor';

import { defaultChainId, getChainOptions } from '../../../lib/appConfig';
import {
    statusReady,
    statusLoading,
    statusError,
    statusNetworkMismatch,
    statusNoRpc,
    statusTxSubmitted,
    statusTxConfirming,
    statusTxConfirmed,
} from '../../../lib/status';
import { useI18n } from '../../components/LanguageProvider';
import { useTheme } from '../../components/ThemeProvider';
import StatusNotice from '../../components/StatusNotice';
import DateTimePicker from '../../components/DateTimePicker';
import ExplorerLink from '../../components/ExplorerLink';

const ESCROW_ABI = parseAbi([
    'function createProposal(address[] topicOwners,bytes32[] contentCids,bytes32 metadata,uint64 startTime,uint64 endTime) returns (uint256)',
    'function CREATOR_DEPOSIT() view returns (uint256)',
    'function owner() view returns (address)',
]);

const TOKEN_ABI = parseAbi([
    'function approve(address spender,uint256 amount) returns (bool)',
    'function allowance(address owner,address spender) view returns (uint256)',
    'function getVotes(address account) view returns (uint256)',
]);

const GOVERNOR_ABI = parseAbi([
    'function propose(address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description) returns (uint256)',
    'function proposalThreshold() view returns (uint256)',
]);

export default function CreateProposalPage() {
    const { t } = useI18n();
    const { mounted } = useTheme();
    const router = useRouter();
    const chainOptions = useMemo(getChainOptions, []);
    const [targetChainId, setTargetChainId] = useState(defaultChainId || '');
    const [status, setStatus] = useState(statusReady());
    const [lastTxHash, setLastTxHash] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Proposal Type: 'bounty' or 'dao'
    const [proposalType, setProposalType] = useState('bounty');

    // Topic form state (Bounty only)
    const [topics, setTopics] = useState([
        { title: '', description: '', owner: '' }
    ]);

    // Voting window (Bounty only)
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    // Proposal Metadata (Common)
    const [proposalTitle, setProposalTitle] = useState('');
    const [proposalDescription, setProposalDescription] = useState('');

    // Governance Actions (DAO only)
    const [actions, setActions] = useState([
        { target: '', value: '0', signature: '', calldata: '0x' }
    ]);

    const [previewProposal, setPreviewProposal] = useState(false);
    const [activeTopicIndex, setActiveTopicIndex] = useState(0);
    const [previewTopic, setPreviewTopic] = useState(false);

    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
    const { writeContractAsync, isPending: isSubmitting } = useWriteContract();
    const publicClient = usePublicClient();

    const chainMismatch = isConnected && targetChainId && chainId !== targetChainId;

    const activeChainConfig = useMemo(() => {
        return chainOptions.find((item) => item.id === Number(targetChainId));
    }, [chainOptions, targetChainId]);

    const escrowAddress = activeChainConfig?.escrowAddress || '';
    const tokenAddress = activeChainConfig?.guaTokenAddress || '';
    const governorAddress = activeChainConfig?.governorAddress || '';

    // Read contract owner (Bounty)
    const ownerResult = useReadContract({
        address: isAddress(escrowAddress) ? escrowAddress : undefined,
        abi: ESCROW_ABI,
        functionName: 'owner',
        query: {
            enabled: isAddress(escrowAddress) && proposalType === 'bounty',
        },
    });

    const isOwner = isConnected && ownerResult.data && address?.toLowerCase() === ownerResult.data.toLowerCase();

    // Read deposit amount (Bounty)
    const depositResult = useReadContract({
        address: isAddress(escrowAddress) ? escrowAddress : undefined,
        abi: ESCROW_ABI,
        functionName: 'CREATOR_DEPOSIT',
        query: {
            enabled: isAddress(escrowAddress) && proposalType === 'bounty',
        },
    });

    // Read allowance (Bounty)
    const allowanceResult = useReadContract({
        address: isAddress(tokenAddress) ? tokenAddress : undefined,
        abi: TOKEN_ABI,
        functionName: 'allowance',
        args: address ? [address, escrowAddress] : undefined,
        query: {
            enabled: isAddress(tokenAddress) && isAddress(escrowAddress) && Boolean(address) && proposalType === 'bounty',
        },
    });

    // Read Proposal Threshold (DAO)
    const thresholdResult = useReadContract({
        address: isAddress(governorAddress) ? governorAddress : undefined,
        abi: GOVERNOR_ABI,
        functionName: 'proposalThreshold',
        query: {
            enabled: isAddress(governorAddress) && proposalType === 'dao',
        },
    });

    // Read User Voting Power (DAO)
    const votesResult = useReadContract({
        address: isAddress(tokenAddress) ? tokenAddress : undefined,
        abi: TOKEN_ABI,
        functionName: 'getVotes',
        args: address ? [address] : undefined,
        query: {
            enabled: isAddress(tokenAddress) && Boolean(address) && proposalType === 'dao',
        },
    });

    // Sync targetChainId with wallet chainId
    useEffect(() => {
        if (chainId && chainOptions.some(c => c.id === chainId)) {
            setTargetChainId(chainId);
        }
    }, [chainId, chainOptions]);

    // Auto-fill owner address when wallet connects
    useEffect(() => {
        if (address && topics.length > 0 && !topics[0].owner) {
            setTopics(prev => prev.map((t, i) =>
                i === 0 ? { ...t, owner: address } : t
            ));
        }
    }, [address, topics]);

    const deposit = depositResult.data || parseEther('100');
    const allowance = allowanceResult.data || 0n;
    // If user is owner, they don't need approval (contract skips transferFrom check)
    // Only enforced for Bounty proposals
    const needsApproval = proposalType === 'bounty' ? (isOwner ? false : allowance < deposit) : false;

    // DAO Threshold logic
    const proposalThreshold = thresholdResult.data || 0n;
    const userVotes = votesResult.data || 0n;
    const canPropose = proposalType === 'dao' ? userVotes >= proposalThreshold : true;

    const addTopic = () => {
        if (topics.length >= 5) return;
        setTopics([...topics, { title: '', description: '', owner: address || '' }]);
        setActiveTopicIndex(topics.length);
    };

    const removeTopic = (index) => {
        if (topics.length <= 1) return;
        const newTopics = topics.filter((_, i) => i !== index);
        setTopics(newTopics);
        if (activeTopicIndex >= newTopics.length) {
            setActiveTopicIndex(Math.max(0, newTopics.length - 1));
        }
    };

    const updateTopic = (index, field, value) => {
        setTopics(topics.map((t, i) =>
            i === index ? { ...t, [field]: value } : t
        ));
    };

    const addAction = () => {
        if (actions.length >= 10) return;
        setActions([...actions, { target: '', value: '0', signature: '', calldata: '0x' }]);
    };

    const removeAction = (index) => {
        if (actions.length <= 0) return; // Allow 0 actions? Technically propose needs 1+ usually, but let's allow removal
        setActions(actions.filter((_, i) => i !== index));
    };

    const updateAction = (index, field, value) => {
        setActions(actions.map((a, i) =>
            i === index ? { ...a, [field]: value } : a
        ));
    };

    const handleApprove = async () => {
        if (!isConnected || !isAddress(tokenAddress) || !isAddress(escrowAddress)) {
            setStatus(statusError('status.invalidAddress'));
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
            setStatus(statusTxSubmitted());
            const hash = await writeContractAsync({
                address: tokenAddress,
                abi: TOKEN_ABI,
                functionName: 'approve',
                args: [escrowAddress, deposit],
            });
            setLastTxHash(hash);
            setStatus(statusTxConfirming());
            await publicClient.waitForTransactionReceipt({ hash });
            setStatus(statusTxConfirmed());
            allowanceResult.refetch?.();
        } catch (error) {
            const message = error?.shortMessage || error?.message || 'Approve failed';
            setStatus(statusError('status.error', { message }));
        }
    };

    const handleSubmit = async () => {
        // Validation Common
        if (!isConnected) {
            setStatus(statusError('airdrop.status.disconnected'));
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

        // Validate proposal metadata
        if (!proposalTitle.trim()) {
            setStatus(statusError('status.error', { message: 'Proposal title required' }));
            return;
        }

        try {
            setStatus(statusLoading());

            if (proposalType === 'bounty') {
                // --- BOUNTY PROPOSAL LOGIC ---
                if (!isAddress(escrowAddress)) {
                    setStatus(statusError('status.invalidAddress'));
                    return;
                }
                // Validate topics
                for (const topic of topics) {
                    if (!topic.title.trim()) {
                        setStatus(statusError('status.error', { message: 'Topic title required' }));
                        return;
                    }
                    if (!isAddress(topic.owner)) {
                        setStatus(statusError('status.invalidAddress'));
                        return;
                    }
                }
                // Validate time
                const start = BigInt(startTime || 0);
                const end = BigInt(endTime || 0);
                if (start <= 0 || end <= start) {
                    setStatus(statusError('status.error', { message: 'Invalid voting window' }));
                    return;
                }

                // 1. Upload Topics to IPFS
                const contentCids = [];
                for (const topic of topics) {
                    const topicContent = createTopicContent(
                        topic.title,
                        topic.owner,
                        topic.description
                    );
                    const cid = await uploadToIPFS(topicContent);
                    contentCids.push(cidToBytes32(cid));
                }

                // 2. Upload Proposal Metadata to IPFS
                const metadataContent = createTopicContent(
                    proposalTitle,
                    address,
                    proposalDescription,
                    ['proposal-metadata']
                );
                const metadataCid = await uploadToIPFS(metadataContent);
                const proposalMetadataHash = cidToBytes32(metadataCid);

                const topicOwners = topics.map(t => t.owner);

                setStatus(statusTxSubmitted());
                const hash = await writeContractAsync({
                    address: escrowAddress,
                    abi: ESCROW_ABI,
                    functionName: 'createProposal',
                    args: [topicOwners, contentCids, proposalMetadataHash, start, end],
                });
                setLastTxHash(hash);
                setStatus(statusTxConfirming());
                await publicClient.waitForTransactionReceipt({ hash });
                setStatus(statusTxConfirmed());

                setTimeout(() => router.push('/proposals'), 2000);

            } else {
                // --- GOVERNANCE PROPOSAL LOGIC ---
                if (!canPropose) {
                    setStatus(statusError('status.error', { message: 'Insufficient voting power to propose' }));
                    return;
                }
                if (!isAddress(governorAddress)) {
                    setStatus(statusError('status.error', { message: 'Governor address not configured for this chain' }));
                    return;
                }
                if (actions.length === 0) {
                    setStatus(statusError('status.error', { message: 'At least one action is required' }));
                    return;
                }

                const targets = [];
                const values = [];
                const signatures = [];
                const calldatas = [];

                for (const act of actions) {
                    if (!isAddress(act.target)) {
                        setStatus(statusError('status.error', { message: `Invalid target address: ${act.target}` }));
                        return;
                    }
                    targets.push(act.target);
                    values.push(parseEther(act.value || '0'));
                    signatures.push(act.signature || ''); // Standard Governor allows empty sig
                    calldatas.push(act.calldata || '0x');
                }

                // Description format: "# Title\n\nDescription" is standard convention for some DAOs, but we can just use the rendered description.
                // Or better, prefix title to description? Tally often uses the description as markdown which includes the title.
                // Let's combine: "# Title\n\nDescription"
                const fullDescription = `# ${proposalTitle}\n\n${proposalDescription}`;

                setStatus(statusTxSubmitted());
                const hash = await writeContractAsync({
                    address: governorAddress,
                    abi: GOVERNOR_ABI,
                    functionName: 'propose',
                    args: [targets, values, signatures, calldatas, fullDescription],
                });
                setLastTxHash(hash);
                setStatus(statusTxConfirming());
                await publicClient.waitForTransactionReceipt({ hash });
                setStatus(statusTxConfirmed());

                setTimeout(() => router.push('/proposals'), 2000);
            }

        } catch (error) {
            const message = error?.shortMessage || error?.message || 'Create failed';
            setStatus(statusError('status.error', { message }));
        }
    };

    const handleSwitchChain = async () => {
        if (!targetChainId) return;
        try {
            await switchChainAsync({ chainId: Number(targetChainId) });
        } catch (error) {
            setStatus(statusNetworkMismatch());
        }
    };

    const formatGUA = (value) => {
        if (!value) return '-';
        return `${(Number(value) / 1e18).toLocaleString()} GUA`;
    };

    return (
        <main className="layout">
            <section className="panel hero">
                <div>
                    <p className="eyebrow">{t('proposals.eyebrow')}</p>
                    <h1>{t('proposals.create.title')}</h1>
                    <p className="lede">{t('proposals.create.lede')}</p>
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
                {/* Status Card based on Proposal Type */}
                <div className="status-card">
                    {proposalType === 'bounty' ? (
                        <>
                            <div className="status-row">
                                <span>{t('proposals.create.deposit')}</span>
                                <span>
                                    {isOwner ? (
                                        <span style={{ color: 'var(--accent)' }}>0 GUA (Admin Exempt)</span>
                                    ) : (
                                        formatGUA(deposit)
                                    )}
                                </span>
                            </div>
                            <div className="status-row">
                                <span>{t('airdrop.status.wallet')}</span>
                                <span>{mounted ? (isConnected ? t('airdrop.status.connected') : t('airdrop.status.disconnected')) : '-'}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="status-row">
                                <span>{t('governance.create.threshold')}</span>
                                <span>{formatGUA(proposalThreshold)}</span>
                            </div>
                            <div className="status-row">
                                <span>{t('governance.create.votingPower')}</span>
                                <span style={{ color: canPropose ? 'var(--fg)' : 'var(--error)' }}>
                                    {formatGUA(userVotes)}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Proposal Type Selector */}
            <section className="panel">
                <h2>{t('governance.create.type')}</h2>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <button
                        className={`btn ${proposalType === 'bounty' ? 'primary' : 'ghost'}`}
                        onClick={() => setProposalType('bounty')}
                        style={{ justifyContent: 'center' }}
                    >
                        {t('governance.create.type.bounty')}
                    </button>
                    <button
                        className={`btn ${proposalType === 'dao' ? 'primary' : 'ghost'}`}
                        onClick={() => setProposalType('dao')}
                        style={{ justifyContent: 'center' }}
                    >
                        {t('governance.create.type.dao')}
                    </button>
                </div>
            </section>

            {showAdvanced && (
                <section className="panel">
                    <h2>{t('proposals.config.network')}</h2>
                    <div className="form-grid">
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

            {/* Proposal Details (Common) */}
            <section className="panel">
                <h2>{t('proposals.create.details')}</h2>
                <div className="form-grid">
                    <label className="field full">
                        <span>{t('proposals.create.propTitle')}</span>
                        <input
                            value={proposalTitle}
                            placeholder="e.g. Community Grants Program 2024"
                            onChange={(e) => setProposalTitle(e.target.value)}
                            maxLength={100}
                        />
                    </label>
                    <div className="field full">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span>{t('proposals.create.description')}</span>
                            <div className="inline-group" style={{ gap: '8px' }}>
                                <button
                                    className="btn ghost"
                                    style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto' }}
                                    onClick={() => setPreviewProposal(!previewProposal)}
                                >
                                    {previewProposal ? t('ui.mode.edit') : t('ui.mode.preview')}
                                </button>
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                    Markdown supported
                                </span>
                            </div>
                        </div>

                        {/* Templates */}
                        <div className="hero-actions" style={{ marginBottom: '12px', marginTop: '-4px' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--muted)', alignSelf: 'center' }}>
                                {t('proposals.create.templates')}:
                            </span>
                            <button
                                className="btn ghost"
                                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                onClick={() => setProposalDescription(
                                    `# Abstract
Brief summary of the proposal.

# Motivation
Why is this proposal necessary?

# Specification
Technical details or specific actions.`
                                )}
                            >
                                {t('proposals.create.template.general')}
                            </button>
                            <button
                                className="btn ghost"
                                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                onClick={() => setProposalDescription(
                                    `# Project Description
What are you building?

# Use of Funds
How will the grant be used?

# Roadmap
- [ ] Milestone 1: ...
- [ ] Milestone 2: ...

# Team
Who is working on this?`
                                )}
                            >
                                {t('proposals.create.template.grants')}
                            </button>
                        </div>
                        {/* Editor and Preview (Persist both to keep scroll) */}
                        <div style={{ display: previewProposal ? 'block' : 'none' }}>
                            <div className="markdown-preview" style={{
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '16px',
                                minHeight: '200px',
                                background: 'var(--input-bg)',
                                backdropFilter: 'blur(12px)'
                            }}>
                                <MarkdownRenderer>
                                    {proposalDescription || '_No description_'}
                                </MarkdownRenderer>
                            </div>
                        </div>
                        <div style={{ display: previewProposal ? 'none' : 'block' }}>
                            <MarkdownEditor
                                value={proposalDescription}
                                placeholder="# Summary&#10;Describe your proposal here..."
                                onChange={(e) => setProposalDescription(e.target.value)}
                                minRows={10}
                                maxLength={5000}
                            />
                        </div>
                    </div>
                </div>
            </section >

            {/* --- TOPIC MANAGEMENT (BOUNTY ONLY) --- */}
            {proposalType === 'bounty' && (
                <>
                    < section className="panel" >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h2>{t('proposals.create.topic')} ({topics.length}/5)</h2>
                        </div>

                        {/* Tabs */}
                        <div className="hero-actions" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            {topics.map((_, index) => (
                                <button
                                    key={index}
                                    className={`mode-toggle ${activeTopicIndex === index ? 'active' : ''}`}
                                    onClick={() => setActiveTopicIndex(index)}
                                >
                                    {topics[index].title.trim() || `${t('proposals.create.topic')} ${index + 1}`}
                                </button>
                            ))}
                            {topics.length < 5 && (
                                <button className="btn ghost" onClick={addTopic} style={{ padding: '4px 12px', fontSize: '0.9em' }}>
                                    + {t('proposals.create.addTopic')}
                                </button>
                            )}
                        </div>

                        {/* Active Topic Form */}
                        <div className="form-grid" style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', gridColumn: '1 / -1' }}>
                                <label className="field">
                                    <span>{t('proposals.create.topicTitle')}</span>
                                    <input
                                        value={topics[activeTopicIndex].title}
                                        placeholder="Enter topic title..."
                                        onChange={(e) => updateTopic(activeTopicIndex, 'title', e.target.value)}
                                        maxLength={100}
                                    />
                                </label>

                                <label className="field">
                                    <span>{t('proposals.create.topicOwner')}</span>
                                    <div className="inline-group">
                                        <input
                                            value={topics[activeTopicIndex].owner}
                                            placeholder="0x..."
                                            onChange={(e) => updateTopic(activeTopicIndex, 'owner', e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        {topics.length > 1 && (
                                            <button
                                                className="btn ghost"
                                                onClick={() => removeTopic(activeTopicIndex)}
                                                style={{ color: 'var(--error)', padding: '10px 14px', whiteSpace: 'nowrap' }}
                                                title={t('proposals.create.removeTopic')}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </label>
                            </div>

                            <div className="field full">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span>{t('proposals.create.topicDescription')}</span>
                                    <div className="inline-group" style={{ gap: '8px' }}>
                                        <button
                                            className="btn ghost"
                                            style={{ padding: '2px 8px', fontSize: '0.75rem', height: 'auto' }}
                                            onClick={() => setPreviewTopic(!previewTopic)}
                                        >
                                            {previewTopic ? t('ui.mode.edit') : t('ui.mode.preview')}
                                        </button>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                            Markdown supported
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: previewTopic ? 'block' : 'none' }}>
                                    <div className="markdown-preview" style={{
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        minHeight: '200px',
                                        background: 'var(--input-bg)',
                                        backdropFilter: 'blur(12px)'
                                    }}>
                                        <MarkdownRenderer>
                                            {topics[activeTopicIndex].description || '_No description_'}
                                        </MarkdownRenderer>
                                    </div>
                                </div>
                                <div style={{ display: previewTopic ? 'none' : 'block' }}>
                                    <MarkdownEditor
                                        value={topics[activeTopicIndex].description}
                                        placeholder="# Topic Overview&#10;Describe this topic..."
                                        onChange={(e) => updateTopic(activeTopicIndex, 'description', e.target.value)}
                                        minRows={10}
                                        maxLength={5000}
                                    />
                                </div>
                            </div>
                        </div>
                    </section >

                    <section className="panel">
                        <h2>{t('voting.window.start')} / {t('voting.window.end')}</h2>
                        <div className="form-grid">
                            <label className="field full">
                                <DateTimePicker
                                    value={startTime}
                                    onChange={setStartTime}
                                    label={t('voting.window.start')}
                                    showShortcuts={true}
                                />
                            </label>
                            <label className="field full">
                                <DateTimePicker
                                    value={endTime}
                                    onChange={setEndTime}
                                    label={t('voting.window.end')}
                                    showShortcuts={true}
                                />
                            </label>
                        </div>
                        <p className="hint">{t('admin.create.help')}</p>
                    </section>
                </>
            )}

            {/* --- DAO ACTIONS (GOVERNANCE ONLY) --- */}
            {proposalType === 'dao' && (
                <section className="panel">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2>{t('governance.actions.title')}</h2>
                        <button className="btn sm secondary" onClick={addAction}>
                            + {t('governance.actions.add')}
                        </button>
                    </div>

                    {actions.map((act, idx) => (
                        <div key={idx} style={{
                            marginBottom: '1rem',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '1rem',
                            background: 'var(--bg-subtle)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <strong>#{idx + 1}</strong>
                                <button
                                    className="btn ghost sm"
                                    style={{ color: 'var(--error)' }}
                                    onClick={() => removeAction(idx)}
                                >
                                    {t('governance.actions.remove')}
                                </button>
                            </div>

                            <div className="form-grid">
                                <label className="field full">
                                    <span>{t('governance.actions.target')} (Address)</span>
                                    <input
                                        value={act.target}
                                        onChange={(e) => updateAction(idx, 'target', e.target.value)}
                                        placeholder="0x..."
                                    />
                                </label>
                                <label className="field">
                                    <span>{t('governance.actions.value')} (ETH)</span>
                                    <input
                                        value={act.value}
                                        onChange={(e) => updateAction(idx, 'value', e.target.value)}
                                        placeholder="0.0"
                                    />
                                </label>
                                <label className="field">
                                    <span>{t('governance.actions.signature')} (Optional)</span>
                                    <input
                                        value={act.signature}
                                        onChange={(e) => updateAction(idx, 'signature', e.target.value)}
                                        placeholder="e.g. transfer(address,uint256)"
                                    />
                                </label>
                                <label className="field full">
                                    <span>{t('governance.actions.calldata')} (Hex)</span>
                                    <textarea
                                        value={act.calldata}
                                        onChange={(e) => updateAction(idx, 'calldata', e.target.value)}
                                        placeholder="0x..."
                                        style={{ fontFamily: 'monospace', fontSize: '0.85em', minHeight: '60px' }}
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                    {actions.length === 0 && (
                        <p className="muted" style={{ textAlign: 'center', padding: '1rem' }}>No actions added.</p>
                    )}
                </section>
            )}

            <section className="panel">
                <h2>{t('proposals.create.submit')}</h2>
                <div className="actions">
                    {needsApproval && (
                        <button
                            className="btn ghost"
                            onClick={handleApprove}
                            disabled={isSubmitting}
                        >
                            {t('voting.approve')} {formatGUA(deposit)}
                        </button>
                    )}
                    <button
                        className="btn primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || needsApproval}
                    >
                        {isSubmitting ? t('proposals.create.submitting') : t('proposals.create.submit')}
                    </button>
                </div>
                <StatusNotice status={status} />
                {lastTxHash && (
                    <div className="status-row">
                        <span>{t('status.tx.latest')}</span>
                        <span className="inline-group">
                            {lastTxHash.slice(0, 10)}...
                            <ExplorerLink chainId={chainId} type="tx" value={lastTxHash} />
                        </span>
                    </div>
                )}
            </section>
        </main >
    );
}
