"use client";

import Link from 'next/link';
import { ConnectKitButton } from 'connectkit';
import { useAccount } from 'wagmi';

import { useI18n } from './LanguageProvider';
import NetworkStatus from './NetworkStatus';
import TokenBalance from '../../components/TokenBalance';

const shortAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '-';

export default function SiteHeader() {
  const { address, isConnected } = useAccount();
  const { lang, setLang, t } = useI18n();

  const toggleLang = () => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  };

  return (
    <header className="site-header">
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
        <Link href="/admin">{t('nav.admin')}</Link>
      </nav>
      <div className="header-actions">
        {isConnected && <TokenBalance />}
        <button className="lang-toggle" type="button" onClick={toggleLang}>
          {lang === 'zh' ? t('lang.en') : t('lang.zh')}
        </button>
        <ConnectKitButton.Custom>
          {({ show }) => (
            <button className="btn primary" onClick={show}>
              {isConnected ? shortAddress(address) : 'Connect Wallet'}
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>
      <NetworkStatus />
    </header>
  );
}

