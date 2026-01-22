"use client";

import { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useBalance } from 'wagmi';
import { useI18n } from './LanguageProvider';

export default function SocialWalletModal({ isOpen, onClose }) {
    const {
        user,
        logout,
        exportWallet,
        linkGoogle, unlinkGoogle,
        linkTwitter, unlinkTwitter,
        linkDiscord, unlinkDiscord,
        linkEmail, unlinkEmail,
        linkGithub, unlinkGithub,
        linkWallet, unlinkWallet
    } = usePrivy();
    const { t } = useI18n();
    const modalRef = useRef(null);

    // Get wallet details
    const wallet = user?.wallet;
    const address = wallet?.address;
    const { data: balance } = useBalance({
        address: address,
    });

    // Close on click outside & Lock Scroll
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !user) return null;

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            // Could verify copy success
        }
    };

    // Helper for dynamic access
    const getLinkMethods = (provider) => {
        switch (provider) {
            case 'google': return { link: linkGoogle, unlink: unlinkGoogle, icon: '🇬' };
            case 'twitter': return { link: linkTwitter, unlink: unlinkTwitter, icon: '🐦' };
            case 'discord': return { link: linkDiscord, unlink: unlinkDiscord, icon: '👾' };
            case 'email': return { link: linkEmail, unlink: unlinkEmail, icon: '📧' };
            case 'github': return { link: linkGithub, unlink: unlinkGithub, icon: '🐱' };
            case 'wallet': return { link: linkWallet, unlink: unlinkWallet, icon: '👛' };
            default: return {};
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999, // Increased z-index
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div
                ref={modalRef}
                style={{
                    background: 'var(--card-bg, #fff)',
                    border: '1px solid var(--border-color, #eee)',
                    borderRadius: '24px',
                    padding: '24px',
                    width: '360px',
                    maxWidth: '90vw',
                    maxHeight: '90vh', // Prevent overflow on small screens
                    overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                    color: 'var(--text-color, #000)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    fontFamily: 'var(--font-body, system-ui)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                        {t('wallet.social_user')}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: 'none',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            color: 'var(--text-secondary, #666)'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Identity Card */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px',
                    background: 'var(--bg-secondary, #f5f5f5)',
                    borderRadius: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px'
                        }}>
                            👻
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{user?.email?.address || 'Social Account'}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #666)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No Address'}
                                <button
                                    onClick={copyAddress}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}
                                    title={t('wallet.copy_address')}
                                >
                                    📋
                                </button>
                                <a
                                    href={address ? `https://basescan.org/address/${address}` : '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: 'none', color: 'inherit', marginLeft: '4px' }}
                                    title="View on Explorer"
                                >
                                    ↗️
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Balance Row */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-color, #e5e5e5)',
                        fontSize: '0.9rem'
                    }}>
                        <span style={{ color: 'var(--text-secondary, #666)' }}>Balance</span>
                        <span style={{ fontWeight: 600 }}>
                            {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '...'}
                        </span>
                    </div>
                </div>

                {/* Account Management Section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '16px',
                    background: 'var(--bg-secondary, #f5f5f5)',
                    borderRadius: '16px'
                }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>
                        {t('wallet.account_management')}
                    </div>

                    {['google', 'twitter', 'discord', 'email', 'github', 'wallet'].map((provider) => {
                        // Map simple provider names to Privy account types
                        const typeMap = {
                            google: 'google_oauth',
                            twitter: 'twitter_oauth',
                            discord: 'discord_oauth',
                            github: 'github_oauth',
                            email: 'email',
                            wallet: 'wallet'
                        };

                        const linkedAccount = user?.linkedAccounts?.find(a => {
                            if (provider === 'wallet') {
                                // Exclude embedded wallets from "External Wallet" list
                                return a.type === 'wallet' && a.connectorType !== 'embedded';
                            }
                            return a.type === typeMap[provider];
                        });

                        const isLinked = !!linkedAccount;
                        const { link, unlink, icon } = getLinkMethods(provider);

                        // Helper to get display name
                        const getAccountName = (acc) => {
                            if (!acc) return '';
                            if (acc.email) return acc.email;
                            if (acc.username) return `@${acc.username}`;
                            if (acc.name) return acc.name;
                            if (acc.type === 'wallet' && acc.address) return `${acc.address.slice(0, 6)}...`;
                            if (acc.subject) return `${acc.subject.slice(0, 6)}...`;
                            return 'Linked';
                        };
                        const accountName = getAccountName(linkedAccount);

                        return (
                            <div key={provider} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.85rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{icon}</span>
                                    <span>{t(`wallet.${provider}`)}</span>
                                </div>

                                {isLinked ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary, #666)',
                                            maxWidth: '100px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {accountName}
                                        </span>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const target = provider === 'wallet' ? linkedAccount.address : linkedAccount.subject;
                                                    console.log('Unlinking', provider, target);
                                                    await unlink(target);
                                                } catch (error) {
                                                    console.error('Unlink failed:', error);
                                                    alert(t('wallet.unlink_failed') || 'Unlink failed: You cannot remove your only login method.');
                                                }
                                            }}
                                            title={t('wallet.unlink')}
                                            style={{
                                                border: 'none',
                                                background: 'rgba(255, 0, 0, 0.1)',
                                                color: 'var(--red-500, #ef4444)',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                            }}
                                        >
                                            {t('wallet.unlink')}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            try {
                                                console.log('Linking', provider);
                                                await link();
                                            } catch (error) {
                                                console.error('Link failed:', error);
                                            }
                                        }}
                                        disabled={provider === 'email'}
                                        style={{
                                            border: '1px solid var(--border-color, #e5e5e5)',
                                            background: 'var(--primary, #3b82f6)',
                                            color: '#fff',
                                            borderRadius: '6px',
                                            padding: '4px 10px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            opacity: provider === 'email' ? 0.5 : 1
                                        }}
                                    >
                                        {t('wallet.link')}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Actions Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button
                        onClick={exportWallet}
                        style={{
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color, #eee)',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background 0.2s',
                        }}
                        className="hover-card"
                    >
                        <span style={{ fontSize: '24px' }}>🔑</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t('wallet.export_key')}</span>
                    </button>

                    <button
                        onClick={logout}
                        style={{
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color, #eee)',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--red-500, #ef4444)'
                        }}
                        className="hover-card"
                    >
                        <span style={{ fontSize: '24px' }}>⏏</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t('wallet.disconnect')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
