"use client";

import { useI18n } from './components/LanguageProvider';

export default function HomePage() {
  const { t } = useI18n();

  return (
    <main className="layout">
      <section className="panel hero">
        <div>
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1>{t('home.title')}</h1>
          <p className="lede">{t('home.lede')}</p>
        </div>
        <div className="status-card">
          <div className="status-row">
            <span>{t('home.sections')}</span>
            <span>4</span>
          </div>
          <div className="status-row">
            <span>{t('home.section.airdrop')}</span>
            <span>{t('home.section.airdrop.desc')}</span>
          </div>
          <div className="status-row">
            <span>{t('home.section.proposals')}</span>
            <span>{t('home.section.proposals.desc')}</span>
          </div>
          <div className="status-row">
            <span>{t('home.section.escrow')}</span>
            <span>{t('home.section.escrow.desc')}</span>
          </div>
          <p className="hint">{t('home.hint')}</p>
        </div>
      </section>

      <section className="panel">
        <h2>{t('home.quick.title')}</h2>
        <div className="form-grid">
          <a className="btn primary" href="/airdrop">
            {t('home.quick.airdrop')}
          </a>
          <a className="btn ghost" href="/proposals">
            {t('home.quick.proposals')}
          </a>
          <a className="btn ghost" href="/escrow">
            {t('home.quick.escrow')}
          </a>
        </div>
      </section>
    </main>
  );
}
