"use client";

import { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useBalance } from 'wagmi';
import { useI18n } from './LanguageProvider';

export default function SocialWalletModal({ isOpen, onClose }) {
    const { user, logout, exportWallet } = usePrivy();
    const { t } = useI18n();
    const modalRef = useRef(null);

    // Get wallet details
    const wallet = user?.wallet;
    const address = wallet?.address;
    const { data: balance } = useBalance({
        address: address,
    });

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
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

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
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
