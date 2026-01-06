"use client";

import Link from 'next/link';
import { useI18n } from '../components/LanguageProvider';

export default function FeaturesPage() {
    const { lang } = useI18n();

    const features = [
        {
            icon: '🎁',
            title: lang === 'zh' ? 'GUA 空投领取' : 'GUA Airdrop',
            desc: lang === 'zh'
                ? '早期贡献者可以通过 Merkle 证明领取 GUA 代币空投奖励'
                : 'Early contributors can claim GUA tokens via Merkle proof',
            link: '/airdrop',
        },
        {
            icon: '🗳️',
            title: lang === 'zh' ? '提案投票' : 'Proposal Voting',
            desc: lang === 'zh'
                ? '使用 GUA 代币质押投票，支持你喜欢的 Topic，获胜者将获得奖励'
                : 'Stake GUA tokens to vote for your favorite topic, winners get rewards',
            link: '/proposals',
        },
        {
            icon: '📦',
            title: lang === 'zh' ? '交付与结算' : 'Delivery & Settlement',
            desc: lang === 'zh'
                ? '获胜者提交视频交付物，社区可质疑，最终由管理员裁决'
                : 'Winners submit video deliverables, community can challenge, admin resolves',
            link: '/proposals',
        },
        {
            icon: '👤',
            title: lang === 'zh' ? '个人中心' : 'Profile',
            desc: lang === 'zh'
                ? '查看你的 GUA 余额、投票记录、拥有的 Topic 和质疑记录'
                : 'View your GUA balance, voting history, owned topics and challenges',
            link: '/profile',
        },
    ];

    return (
        <main className="layout">
            {/* Hero */}
            <section className="panel hero">
                <div>
                    <p className="eyebrow">📚 {lang === 'zh' ? '功能介绍' : 'Features Guide'}</p>
                    <h1>{lang === 'zh' ? 'GUA DAO 是如何运作的？' : 'How does GUA DAO work?'}</h1>
                    <p className="lede">
                        {lang === 'zh'
                            ? '通过区块链智能合约实现去中心化的内容共创与激励分配'
                            : 'Decentralized content co-creation and incentive distribution via smart contracts'}
                    </p>
                </div>
            </section>

            {/* Flowchart */}
            <section className="panel">
                <h2>🔄 {lang === 'zh' ? '核心流程图' : 'Core Workflow'}</h2>
                <div className="flowchart">
                    <div className="flow-step">
                        <div className="flow-icon">📝</div>
                        <div className="flow-content">
                            <strong>{lang === 'zh' ? '1. 创建提案' : '1. Create Proposal'}</strong>
                            <p className="muted">{lang === 'zh' ? '管理员创建包含 3-5 个 Topic 的提案' : 'Admin creates proposal with 3-5 topics'}</p>
                        </div>
                    </div>
                    <div className="flow-arrow">↓</div>
                    <div className="flow-step">
                        <div className="flow-icon">🗳️</div>
                        <div className="flow-content">
                            <strong>{lang === 'zh' ? '2. 投票阶段' : '2. Voting Phase'}</strong>
                            <p className="muted">{lang === 'zh' ? '用户质押 GUA 代币为喜欢的 Topic 投票' : 'Users stake GUA tokens to vote for topics'}</p>
                        </div>
                    </div>
                    <div className="flow-arrow">↓</div>
                    <div className="flow-step">
                        <div className="flow-icon">🏆</div>
                        <div className="flow-content">
                            <strong>{lang === 'zh' ? '3. 确认获胜者' : '3. Confirm Winner'}</strong>
                            <p className="muted">{lang === 'zh' ? '投票结束后，得票最高的 Topic 获胜' : 'After voting ends, highest voted topic wins'}</p>
                        </div>
                    </div>
                    <div className="flow-arrow">↓</div>
                    <div className="flow-step">
                        <div className="flow-icon">🎬</div>
                        <div className="flow-content">
                            <strong>{lang === 'zh' ? '4. 提交交付' : '4. Submit Delivery'}</strong>
                            <p className="muted">{lang === 'zh' ? '获胜者制作视频并提交 YouTube 链接' : 'Winner creates video and submits YouTube link'}</p>
                        </div>
                    </div>
                    <div className="flow-arrow">↓</div>
                    <div className="flow-step">
                        <div className="flow-icon">⚖️</div>
                        <div className="flow-content">
                            <strong>{lang === 'zh' ? '5. 质疑与裁决' : '5. Challenge & Resolve'}</strong>
                            <p className="muted">{lang === 'zh' ? '社区可质疑交付物，管理员最终裁决' : 'Community can challenge, admin makes final decision'}</p>
                        </div>
                    </div>
                    <div className="flow-arrow">↓</div>
                    <div className="flow-step">
                        <div className="flow-icon">✅</div>
                        <div className="flow-content">
                            <strong>{lang === 'zh' ? '6. 结算完成' : '6. Settlement Complete'}</strong>
                            <p className="muted">{lang === 'zh' ? '奖励分配，投票者收回质押的代币' : 'Rewards distributed, voters get staked tokens back'}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="panel">
                <h2>🧩 {lang === 'zh' ? '功能模块' : 'Feature Modules'}</h2>
                <div className="features-grid">
                    {features.map((f) => (
                        <Link key={f.title} href={f.link} className="status-card" style={{ padding: '20px', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{f.icon}</div>
                            <strong style={{ fontSize: '1.1rem' }}>{f.title}</strong>
                            <p className="muted" style={{ margin: '8px 0 0', flex: 1 }}>{f.desc}</p>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Token Economics */}
            <section className="panel">
                <h2>💰 {lang === 'zh' ? '代币经济' : 'Token Economics'}</h2>
                <div className="status-grid">
                    <div className="status-row">
                        <span>{lang === 'zh' ? '获胜者首付' : 'Winner Initial Payout'}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>10%</span>
                    </div>
                    <div className="status-row">
                        <span>{lang === 'zh' ? '交付完成后' : 'After Delivery'}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>90%</span>
                    </div>
                    <div className="status-row">
                        <span>{lang === 'zh' ? '质疑保证金' : 'Challenge Bond'}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>10,000 GUA</span>
                    </div>
                    <div className="status-row">
                        <span>{lang === 'zh' ? '投票质押' : 'Voting Stake'}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{lang === 'zh' ? '自定义数量' : 'Custom Amount'}</span>
                    </div>
                </div>
            </section>

            {/* Quick Links */}
            <section className="panel">
                <h2>🚀 {lang === 'zh' ? '快速开始' : 'Quick Start'}</h2>
                <div className="actions">
                    <Link className="btn primary" href="/airdrop">
                        {lang === 'zh' ? '🎁 领取空投' : '🎁 Claim Airdrop'}
                    </Link>
                    <Link className="btn ghost" href="/proposals">
                        {lang === 'zh' ? '🗳️ 查看提案' : '🗳️ View Proposals'}
                    </Link>
                    <Link className="btn ghost" href="/profile">
                        {lang === 'zh' ? '👤 个人中心' : '👤 Profile'}
                    </Link>
                    <Link className="btn ghost" href="/">
                        {lang === 'zh' ? '🏠 返回首页' : '🏠 Home'}
                    </Link>
                </div>
            </section>
        </main>
    );
}
