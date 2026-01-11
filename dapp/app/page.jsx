"use client";

import Link from 'next/link';
import { useI18n } from './components/LanguageProvider';
import TokenBalance from '../components/TokenBalance';
import { useAccount } from 'wagmi';
import { useTheme } from './components/ThemeProvider';
import config from '../config.json';

const DISCORD_URL = 'https://discord.gg/Gkg8mGEvMG';
const YOUTUBE_URL = 'https://www.youtube.com/@cryptoplanet-i5k';

export default function HomePage() {
  const { t, lang } = useI18n();
  const { isConnected } = useAccount();
  const { mounted } = useTheme();

  const values = [
    { icon: '🎯', title: lang === 'zh' ? '自治而非独裁' : 'Self-governance', desc: lang === 'zh' ? '所有方向由群众共决' : 'All directions decided by the community' },
    { icon: '🎁', title: lang === 'zh' ? '贡献即奖励' : 'Contribution = Reward', desc: lang === 'zh' ? '每一次互动都值得被奖励' : 'Every interaction deserves rewards' },
    { icon: '📚', title: lang === 'zh' ? '学习即成长' : 'Learning = Growth', desc: lang === 'zh' ? '通过内容教育，促进自我升级' : 'Self-improvement through content education' },
    { icon: '🤝', title: lang === 'zh' ? '共建即共享' : 'Co-build = Co-share', desc: lang === 'zh' ? '收益与价值由早期成员共享' : 'Benefits shared by early members' },
  ];

  const tokenUsages = [
    { icon: '📢', title: lang === 'zh' ? '社群投票' : 'Voting Power', desc: lang === 'zh' ? '参与社群重要决策与提案表决' : 'Participate in community decisions' },
    { icon: '🎁', title: lang === 'zh' ? '贡献奖励' : 'Rewards', desc: lang === 'zh' ? '内容创作、互动、推广奖励' : 'Rewards for content and engagement' },
    { icon: '🎟️', title: lang === 'zh' ? '专属权益' : 'Privileges', desc: lang === 'zh' ? '特殊身份与专属活动' : 'Special access and events' },
    { icon: '🧩', title: lang === 'zh' ? 'DAO 治理' : 'DAO Governance', desc: lang === 'zh' ? '成为去中心化自治的一部分' : 'Part of decentralized governance' },
  ];

  const roadmap = [
    { time: '2025 Q2', event: lang === 'zh' ? '吃瓜群众自治社正式启动' : 'GUA DAO Official Launch' },
    { time: '2025 Q4', event: lang === 'zh' ? '开启内容投票共创 + OG NFT 徽章发布' : 'Content Voting + OG NFT Badge' },
    { time: '2026 Q1', event: lang === 'zh' ? 'GUA Token 上链，积分 1:1 兑换代币' : 'GUA Token On-chain, 1:1 Points Swap' },
    { time: '2026 Q2+', event: lang === 'zh' ? '多平台联动 + 线下 Meetup' : 'Multi-platform + Offline Meetups' },
  ];

  const participationMethods = [
    { action: lang === 'zh' ? '加入 Discord 社群' : 'Join Discord', reward: lang === 'zh' ? '获取最新资讯与活动' : 'Get latest news and events' },
    { action: lang === 'zh' ? '视频点赞评论' : 'Like & Comment Videos', reward: '5 GUA' },
    { action: lang === 'zh' ? '参与内容任务' : 'Content Tasks', reward: '10–50 GUA' },
    { action: lang === 'zh' ? '提交选题建议' : 'Submit Topic Ideas', reward: '100 GUA' },
  ];

  return (
    <main className="layout">
      {/* Hero Section */}
      <section className="panel hero">
        <div>
          <p className="eyebrow">🍉 {lang === 'zh' ? '吃瓜群众自治社' : 'GUA DAO'}</p>
          <h1>{lang === 'zh' ? '你不只是看客，你是未来的共建者' : "You're not just a viewer, you're a co-builder"}</h1>
          <p className="lede">
            {lang === 'zh'
              ? '以区块链为信任底座，以 Web3 精神为驱动力，由观众驱动、创作者引导、代币连接的去中心化内容社群。'
              : 'A decentralized content community built on blockchain trust, driven by Web3 spirit, powered by viewers, guided by creators, connected by tokens.'}
          </p>
          <div className="hero-actions">
            <a className="btn primary" href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
              {lang === 'zh' ? '🚀 加入 Discord' : '🚀 Join Discord'}
            </a>
            <a className="btn ghost" href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
              🎥 YouTube
            </a>
          </div>
        </div>
        <div className="status-card">
          {mounted && isConnected && (
            <div className="status-row">
              <span>{lang === 'zh' ? '我的 GUA 余额' : 'My GUA Balance'}</span>
              <TokenBalance />
            </div>
          )}
          <div className="status-row">
            <span>{lang === 'zh' ? '当前阶段' : 'Current Phase'}</span>
            <span>{lang === 'zh' ? '社区建设期' : 'Community Building'}</span>
          </div>
          <div className="status-row">
            <span>{lang === 'zh' ? 'GUA Token' : 'GUA Token'}</span>
            <span>{lang === 'zh' ? '已上链' : 'On-chain'} ✓</span>
          </div>
          <p className="hint">{lang === 'zh' ? '每一位吃瓜群众不仅是观众，更是导演、编剧、出品人' : 'Every viewer is also a director, writer, and producer'}</p>
        </div>
      </section>

      {/* Values Section */}
      <section className="panel">
        <h2>❤️ {lang === 'zh' ? '我们的价值观' : 'Our Values'}</h2>
        <div className="form-grid">
          {values.map((v) => (
            <div key={v.title} className="status-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{v.icon}</div>
              <strong>{v.title}</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GUA Token Section */}
      <section className="panel">
        <h2>🍉 {lang === 'zh' ? '什么是 GUA 代币？' : 'What is GUA Token?'}</h2>
        <p className="lede">
          {lang === 'zh'
            ? 'GUA 代币是吃瓜群众自治社内部的专属贡献代币，代表每一位成员的参与度、贡献力与治理权。'
            : 'GUA Token is the exclusive contribution token of GUA DAO, representing participation, contribution, and governance rights.'}
        </p>
        <div className="form-grid">
          {tokenUsages.map((u) => (
            <div key={u.title} className="status-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{u.icon}</div>
              <strong>{u.title}</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How to Participate */}
      <section className="panel">
        <h2>🎯 {lang === 'zh' ? '如何参与' : 'How to Participate'}</h2>
        <div className="status-grid">
          {participationMethods.map((m) => (
            <div key={m.action} className="status-row">
              <span>{m.action}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{m.reward}</span>
            </div>
          ))}
        </div>
        <div className="actions" style={{ marginTop: '20px' }}>
          <Link className="btn primary" href="/airdrop">
            {lang === 'zh' ? '🎁 领取空投' : '🎁 Claim Airdrop'}
          </Link>
          <Link className="btn ghost" href="/proposals">
            {lang === 'zh' ? '🗳️ 查看提案' : '🗳️ View Proposals'}
          </Link>
          <Link className="btn ghost" href="/profile">
            {lang === 'zh' ? '👤 个人中心' : '👤 My Profile'}
          </Link>
          <a className="btn ghost" href={config.governance.snapshotUrl} target="_blank" rel="noopener noreferrer">
            ⚡ {lang === 'zh' ? '社区投票' : 'Snapshot Vote'}
          </a>
          <a className="btn ghost" href={config.governance.tallyUrl} target="_blank" rel="noopener noreferrer">
            🏛️ {lang === 'zh' ? '协议治理' : 'Governance'}
          </a>
        </div>
      </section>

      {/* Roadmap */}
      <section className="panel">
        <h2>🏗️ {lang === 'zh' ? '发展路线图' : 'Roadmap'}</h2>
        <div className="guide">
          {roadmap.map((r, index) => (
            <div key={r.time} className={`guide-step ${index === 0 ? 'done' : index === 1 ? 'active' : ''}`}>
              <span className="badge">{index + 1}</span>
              <div>
                <strong>{r.time}</strong>
                <p className="muted" style={{ margin: 0 }}>{r.event}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Links */}
      <section className="panel">
        <h2>📬 {lang === 'zh' ? '联系与加入' : 'Connect & Join'}</h2>
        <div className="form-grid">
          <a className="btn ghost" href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
            💬 Discord
          </a>
          <a className="btn ghost" href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
            🎥 YouTube: CryptoPlanet
          </a>
          <a className="btn ghost" href="https://github.com/LemonAdorable/guadao" target="_blank" rel="noopener noreferrer">
            🐙 GitHub
          </a>
        </div>
        <p className="hint" style={{ marginTop: '16px' }}>
          {lang === 'zh'
            ? '在这里，我们可以一块慢慢进入 Web3 的世界。'
            : "Here, we can slowly enter the world of Web3 together."}
        </p>
      </section>
    </main>
  );
}
