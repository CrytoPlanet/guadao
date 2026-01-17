"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';

import { useI18n } from './LanguageProvider';
import { useAdmin } from './AdminProvider';
import NetworkStatus from './NetworkStatus';
import TokenBalance from '../../components/TokenBalance';
import { useTheme } from '../components/ThemeProvider';
import config from '../../config.json';

export default function SiteHeader() {
  const { address, isConnected } = useAccount();
  const { lang, setLang, t } = useI18n();
  const { isAdmin } = useAdmin();
  const { theme, toggleTheme, mounted } = useTheme();

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      setIsAtTop(currentScrollY < 10);

      if (currentScrollY > 100) {
        if (currentScrollY > lastScrollY) {
          setIsVisible(false); // Scrolling down
        } else {
          setIsVisible(true); // Scrolling up
        }
      } else {
        setIsVisible(true); // At top
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const toggleLang = () => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  };

  return (
    <header
      className="site-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: isAtTop ? 'transparent' : 'var(--header-bg)',
        backdropFilter: isAtTop ? 'none' : 'blur(12px)',
        transition: 'transform 0.3s ease, background 0.3s ease, backdrop-filter 0.3s ease',
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
      }}
    >
      <div className="brand">
        <span className="brand-mark">GUA</span>
        <div className="brand-text">
          <span className="title">{t('brand.title')}</span>
          <span className="subtitle">{t('brand.subtitle')}</span>
        </div>
      </div>
      <nav className="nav">
        <Link href="/">{t('nav.home')}</Link>
        <Link href="/features">{lang === 'zh' ? '功能' : 'Guide'}</Link>
        <Link href="/airdrop">{t('nav.airdrop')}</Link>
        <Link href="/proposals">{t('nav.proposals')}</Link>
        <Link href="/profile">{t('nav.profile')}</Link>
        {mounted && isAdmin && <Link href="/admin">{t('nav.admin')}</Link>}
      </nav>
      <div className="header-actions">
        {mounted && isConnected && <TokenBalance />}
        <button className="lang-toggle" type="button" onClick={toggleTheme}>
          {mounted ? (theme === 'dark' ? '🌞' : '🌙') : '🌓'}
        </button>
        <button className="lang-toggle" type="button" onClick={toggleLang}>
          {lang === 'zh' ? t('lang.en') : t('lang.zh')}
        </button>
        <ConnectButton.Custom>
          {({ account, openConnectModal, openAccountModal }) => {
            const { login, exportWallet, authenticated, ready, user: privyUser } = usePrivy();

            // 如果通过 Privy 登录了但没有链接 Wagmi
            if (authenticated && !account) {
              // 理想情况下这里应该同步钱包，但作为演示先显示 Privy 状态
              return (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn primary" onClick={() => {
                    // Privy Logout logic usually here
                  }}>
                    {privyUser?.email?.address || privyUser?.wallet?.address?.slice(0, 6) || 'Social User'}
                  </button>
                  {/* 导出私钥按钮 */}
                  <button
                    className="btn ghost"
                    onClick={exportWallet}
                    style={{ fontSize: '0.8em', padding: '4px 8px' }}
                    title={t('wallet.export_key')}
                  >
                    🔑
                  </button>
                  {/* 仍允许连接传统钱包 */}
                  <button className="btn ghost" onClick={openConnectModal}>
                    Connect Wallet
                  </button>
                </div>
              )
            }

            return (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!account && !authenticated && (
                  <button
                    className="btn ghost"
                    onClick={login}
                    disabled={!ready}
                    style={{ fontSize: '0.9em', opacity: ready ? 1 : 0.7, cursor: ready ? 'pointer' : 'not-allowed' }}
                  >
                    {!ready ? 'Loading...' : t('wallet.social_login')}
                  </button>
                )}
                <button
                  className="btn primary"
                  onClick={account ? openAccountModal : openConnectModal}
                >
                  {mounted && account
                    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                    : t('wallet.connect')}
                </button>
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
      {mounted && <NetworkStatus />}
    </header>
  );
}
