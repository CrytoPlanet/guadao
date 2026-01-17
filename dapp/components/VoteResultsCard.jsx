"use client";

import { useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useI18n } from '../app/components/LanguageProvider';

// Wallet avatar component - renders ENS avatar or Blockie-style fallback
const WalletAvatar = ({ address, chainId, size = 32 }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [imgError, setImgError] = useState(false);
    const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';

    // effigy.im provides ENS avatars with blockie fallback
    const avatarUrl = address ? `https://effigy.im/a/${address}.svg` : null;

    const handleClick = () => {
        if (chainId && address) {
            const explorers = {
                1: 'https://etherscan.io',
                8453: 'https://basescan.org',
                84532: 'https://sepolia.basescan.org',
                31337: 'https://etherscan.io',
            };
            const baseUrl = explorers[chainId] || 'https://etherscan.io';
            window.open(`${baseUrl}/address/${address}`, '_blank');
        }
    };

    // Fallback color based on address
    const fallbackColor = address
        ? `rgb(${parseInt(address.slice(2, 4), 16)}, ${parseInt(address.slice(4, 6), 16)}, ${parseInt(address.slice(6, 8), 16)})`
        : '#888';

    return (
        <div
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div
                onClick={handleClick}
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '2px solid var(--bg)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    background: imgError ? fallbackColor : 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                }}
            >
                {avatarUrl && !imgError ? (
                    <img
                        src={avatarUrl}
                        alt={shortAddr}
                        width={size}
                        height={size}
                        style={{ display: 'block' }}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <span style={{
                        fontSize: size * 0.4,
                        fontWeight: 'bold',
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}>
                        {address ? address.slice(2, 4).toUpperCase() : '?'}
                    </span>
                )}
            </div>
            {showTooltip && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginBottom: '8px',
                        padding: '8px 12px',
                        background: '#1a1a2e',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                        zIndex: 1000,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        pointerEvents: 'none',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    {shortAddr}
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            borderWidth: '6px',
                            borderStyle: 'solid',
                            borderColor: '#1a1a2e transparent transparent transparent',
                        }}
                    />
                </div>
            )}
        </div>
    );
};

// Format large numbers compactly
const formatCompact = (num) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(2).replace(/\.?0+$/, '') + 'K';
    }
    return num.toFixed(2).replace(/\.?0+$/, '');
};

export default function VoteResultsCard({
    proposalData,
    quorum,
    symbol = 'GUA',
    voters = [],
    chainId,
    canVote,
    onVote,
    isVoting,
    hasVoted,
    myVotes,
    isConnected
}) {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState('results'); // 'cast' or 'results'
    const [expandedType, setExpandedType] = useState(null); // 'for', 'against', 'abstain'

    const stats = useMemo(() => {
        if (!proposalData) return null;
        const forVotes = BigInt(proposalData.forVotes || 0n);
        const againstVotes = BigInt(proposalData.againstVotes || 0n);
        const abstainVotes = BigInt(proposalData.abstainVotes || 0n);

        const totalVotes = forVotes + againstVotes + abstainVotes;
        const total = Number(formatUnits(totalVotes, 18));
        const safeTotal = total === 0 ? 1 : total;

        const forVal = Number(formatUnits(forVotes, 18));
        const againstVal = Number(formatUnits(againstVotes, 18));
        const abstainVal = Number(formatUnits(abstainVotes, 18));

        return {
            for: forVal,
            against: againstVal,
            abstain: abstainVal,
            total: total,
            forPercent: (forVal / safeTotal) * 100,
            againstPercent: (againstVal / safeTotal) * 100,
            abstainPercent: (abstainVal / safeTotal) * 100,
        };
    }, [proposalData]);

    // Filter voters by support type
    const votersByType = useMemo(() => ({
        for: voters.filter(v => v.support === 1),
        against: voters.filter(v => v.support === 0),
        abstain: voters.filter(v => v.support === 2),
    }), [voters]);

    const quorumVal = quorum ? Number(formatUnits(quorum, 18)) : 0;
    const quorumReached = stats?.total >= quorumVal;

    if (!stats) return null;

    const handleRowClick = (type) => {
        setExpandedType(expandedType === type ? null : type);
    };

    const renderVotersAvatars = (typeVoters) => {
        if (typeVoters.length === 0) {
            return (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                    {t('governance.voters.empty')}
                </p>
            );
        }

        return (
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                alignItems: 'center',
                padding: '4px 0'
            }}>
                {typeVoters.slice(0, 20).map((v, idx) => (
                    <WalletAvatar
                        key={idx}
                        address={v.voter}
                        chainId={chainId}
                        size={34}
                    />
                ))}
                {typeVoters.length > 20 && (
                    <span style={{
                        fontSize: '0.85rem',
                        color: 'var(--muted)',
                        marginLeft: '8px'
                    }}>
                        +{typeVoters.length - 20} more
                    </span>
                )}
            </div>
        );
    };

    const renderVoteRow = (type, label, value, percent, colorClass) => {
        const typeVoters = votersByType[type];
        const isExpanded = expandedType === type;

        return (
            <div key={type} style={{ marginBottom: '12px' }}>
                <div
                    className="result-row"
                    style={{ cursor: typeVoters.length > 0 ? 'pointer' : 'default' }}
                    onClick={() => typeVoters.length > 0 && handleRowClick(type)}
                >
                    <div className="result-header">
                        <span className={`label ${colorClass}`}>
                            {label}
                            {typeVoters.length > 0 && (
                                <span style={{
                                    marginLeft: '8px',
                                    fontSize: '0.8em',
                                    opacity: 0.7,
                                    background: 'var(--bg-subtle)',
                                    padding: '2px 8px',
                                    borderRadius: '12px'
                                }}>
                                    {typeVoters.length} {t('governance.voters.title')}
                                </span>
                            )}
                        </span>
                        <span className="value">{formatCompact(value)} {symbol}</span>
                    </div>
                    <div className="progress-bar-bg">
                        <div className={`progress-bar ${colorClass}`} style={{ width: `${percent}%` }}></div>
                    </div>
                    <div className="result-meta">
                        <span>{percent.toFixed(2)}%</span>
                        {typeVoters.length > 0 && (
                            <span style={{ fontSize: '0.85em', opacity: 0.6, marginLeft: '8px' }}>
                                {isExpanded ? '▲ 收起' : '▼ 展开'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Voters Avatars - Expanded */}
                {isExpanded && (
                    <div
                        style={{
                            padding: '16px',
                            background: 'var(--bg-subtle)',
                            borderRadius: '12px',
                            marginTop: '8px',
                            border: '1px solid var(--border)',
                        }}
                    >
                        {renderVotersAvatars(typeVoters)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="vote-results-card">
            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '0',
                marginBottom: '1.5rem',
                borderBottom: '2px solid var(--border)',
            }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('cast')}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'cast' ? '3px solid var(--primary)' : '3px solid transparent',
                        color: activeTab === 'cast' ? 'var(--primary)' : 'var(--muted)',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'cast' ? 'bold' : 'normal',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        marginBottom: '-2px',
                    }}
                >
                    {t('governance.voting.title')}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('results')}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'results' ? '3px solid var(--primary)' : '3px solid transparent',
                        color: activeTab === 'results' ? 'var(--primary)' : 'var(--muted)',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'results' ? 'bold' : 'normal',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        marginBottom: '-2px',
                    }}
                >
                    {t('proposal.results.title')} ({voters.length})
                </button>
            </div>

            {/* Cast Vote Tab */}
            {activeTab === 'cast' && (
                <div style={{ padding: '8px 0' }}>
                    {!isConnected ? (
                        <p className="muted">{t('wallet.connect')}</p>
                    ) : hasVoted ? (
                        <div style={{
                            padding: '20px',
                            background: 'var(--bg-subtle)',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>✓</span>
                            <span style={{ fontSize: '1.1rem' }}>{t('voting.steps.submit')} (Done)</span>
                        </div>
                    ) : canVote ? (
                        <div>
                            <p className="muted" style={{ marginBottom: '16px' }}>{t('voting.lede')}</p>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '12px'
                            }}>
                                <button
                                    className="btn primary"
                                    onClick={() => onVote && onVote(1)}
                                    disabled={isVoting}
                                    style={{ padding: '16px', fontSize: '1rem' }}
                                >
                                    {isVoting ? '...' : t('governance.votes.for')}
                                </button>
                                <button
                                    className="btn secondary"
                                    onClick={() => onVote && onVote(0)}
                                    disabled={isVoting}
                                    style={{ padding: '16px', fontSize: '1rem' }}
                                >
                                    {isVoting ? '...' : t('governance.votes.against')}
                                </button>
                                <button
                                    className="btn ghost"
                                    onClick={() => onVote && onVote(2)}
                                    disabled={isVoting}
                                    style={{ padding: '16px', fontSize: '1rem' }}
                                >
                                    {isVoting ? '...' : t('governance.votes.abstain')}
                                </button>
                            </div>
                            {myVotes === 0n && (
                                <p style={{ color: 'orange', marginTop: '12px', fontSize: '0.9rem' }}>
                                    {t('governance.warning.noVotes')}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="muted">{t('voting.window.closed')}</p>
                    )}
                </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
                <div>
                    {renderVoteRow('for', t('governance.votes.for'), stats.for, stats.forPercent, 'type-for')}
                    {renderVoteRow('against', t('governance.votes.against'), stats.against, stats.againstPercent, 'type-against')}
                    {renderVoteRow('abstain', t('governance.votes.abstain'), stats.abstain, stats.abstainPercent, 'type-abstain')}

                    <div className="result-divider" />

                    {quorumVal > 0 && (
                        <div className="quorum-section" style={quorumReached ? {
                            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginTop: '8px'
                        } : { marginTop: '8px' }}>
                            <div className="result-header">
                                <span className="label" style={quorumReached ? { color: 'var(--success)', fontWeight: 'bold' } : {}}>
                                    {t('governance.quorum')}
                                </span>
                                <span className="value" style={{ fontSize: '0.9em' }}>
                                    {formatCompact(stats.total)} / {formatCompact(quorumVal)} {symbol}
                                </span>
                            </div>
                            <div className="progress-bar-bg">
                                <div
                                    className={`progress-bar ${quorumReached ? 'type-success' : 'type-neutral'}`}
                                    style={{ width: `${Math.min((stats.total / quorumVal) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <div className="result-meta">
                                {quorumReached ? (
                                    <span style={{
                                        color: '#22c55e',
                                        fontWeight: 'bold',
                                        fontSize: '1.05em',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <span style={{ fontSize: '1.2em' }}>✓</span>
                                        {t('governance.quorum.reached')}
                                    </span>
                                ) : (
                                    <span className="text-muted">{t('governance.quorum.needed')}</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
