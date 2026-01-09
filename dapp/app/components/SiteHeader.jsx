"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

import { useI18n } from './LanguageProvider';
import { useAdmin } from './AdminProvider';
import NetworkStatus from './NetworkStatus';
import TokenBalance from '../../components/TokenBalance';
import { useTheme } from '../components/ThemeProvider';

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
          {({ account, openConnectModal, openAccountModal }) => (
            <button
              className="btn primary"
              onClick={account ? openAccountModal : openConnectModal}
            >
              {mounted && account
                ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                : t('wallet.connect')}
            </button>
          )}
        </ConnectButton.Custom>
      </div>
      {mounted && <NetworkStatus />}
    </header>
  );
}
