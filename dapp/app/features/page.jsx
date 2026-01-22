"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '../components/LanguageProvider';

export default function FeaturesPage() {
    const { lang } = useI18n();
    const [flowTab, setFlowTab] = useState('bounty');

    const features = [
        {
            icon: '🎁',
            title: lang === 'zh' ? 'GUA 空投' : 'GUA Airdrop',
            desc: lang === 'zh'
                ? '早期贡献者通过 Merkle 证明领取代币'
                : 'Early contributors claim tokens via Merkle proof',
            link: '/airdrop',
        },
        {
            icon: '🗳️',
            title: lang === 'zh' ? '悬赏提案' : 'Bounty Proposals',
            desc: lang === 'zh'
                ? '质押 GUA 投票，获胜者获得奖励'
                : 'Stake GUA to vote, winners get rewards',
            link: '/proposals',
        },
        {
            icon: '⚖️',
            title: lang === 'zh' ? '链上治理' : 'On-Chain Governance',
            desc: lang === 'zh'
                ? '创建提案、投票、执行链上决策'
                : 'Create proposals, vote, execute on-chain',
            link: '/proposals',
        },
        {
            icon: '📦',
            title: lang === 'zh' ? '交付结算' : 'Delivery & Settlement',
            desc: lang === 'zh'
                ? '提交交付物，社区质疑，管理员裁决'
                : 'Submit deliverables, community challenges',
            link: '/proposals',
        },
        {
            icon: '👤',
            title: lang === 'zh' ? '个人中心' : 'Profile',
            desc: lang === 'zh'
                ? '查看余额、投票记录、治理参与'
                : 'View balance, votes, governance activity',
            link: '/profile',
        },
        {
            icon: '🔐',
            title: lang === 'zh' ? '管理面板' : 'Admin Panel',
            desc: lang === 'zh'
                ? '管理员操作：暂停/恢复、角色管理'
                : 'Admin operations: pause, role management',
            link: '/admin',
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

            {/* Flowchart with Tabs */}
            <section className="panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 style={{ margin: 0 }}>🔄 {lang === 'zh' ? '核心流程' : 'Core Workflow'}</h2>
                    <div className="hero-actions" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                            className={`mode-toggle ${flowTab === 'bounty' ? 'active' : ''}`}
                            onClick={() => setFlowTab('bounty')}
                        >
                            {lang === 'zh' ? '🗳️ 悬赏流程' : '🗳️ Bounty'}
                        </button>
                        <button
                            className={`mode-toggle ${flowTab === 'governance' ? 'active' : ''}`}
                            onClick={() => setFlowTab('governance')}
                        >
                            {lang === 'zh' ? '⚖️ 治理流程' : '⚖️ Governance'}
                        </button>
                    </div>
                </div>

                {flowTab === 'bounty' && (
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
                )}

                {flowTab === 'governance' && (
                    <div className="flowchart">
                        <div className="flow-step">
                            <div className="flow-icon">✍️</div>
                            <div className="flow-content">
                                <strong>{lang === 'zh' ? '1. 创建治理提案' : '1. Create Governance Proposal'}</strong>
                                <p className="muted">{lang === 'zh' ? '持有足够投票权的用户可创建链上治理提案' : 'Users with enough voting power can create on-chain proposals'}</p>
                            </div>
                        </div>
                        <div className="flow-arrow">↓</div>
                        <div className="flow-step">
                            <div className="flow-icon">🗳️</div>
                            <div className="flow-content">
                                <strong>{lang === 'zh' ? '2. 社区投票' : '2. Community Voting'}</strong>
                                <p className="muted">{lang === 'zh' ? '代币持有者对提案进行投票（支持/反对/弃权）' : 'Token holders vote on proposals (For/Against/Abstain)'}</p>
                            </div>
                        </div>
                        <div className="flow-arrow">↓</div>
                        <div className="flow-step">
                            <div className="flow-icon">⏳</div>
                            <div className="flow-content">
                                <strong>{lang === 'zh' ? '3. 时间锁队列' : '3. Timelock Queue'}</strong>
                                <p className="muted">{lang === 'zh' ? '通过的提案进入时间锁队列，等待执行' : 'Passed proposals enter timelock queue, waiting for execution'}</p>
                            </div>
                        </div>
                        <div className="flow-arrow">↓</div>
                        <div className="flow-step">
                            <div className="flow-icon">🚀</div>
                            <div className="flow-content">
                                <strong>{lang === 'zh' ? '4. 执行提案' : '4. Execute Proposal'}</strong>
                                <p className="muted">{lang === 'zh' ? '时间锁到期后，任何人可执行已通过的提案' : 'After timelock expires, anyone can execute the passed proposal'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Features Grid - 3 columns */}
            <section className="panel">
                <h2>🧩 {lang === 'zh' ? '功能模块' : 'Feature Modules'}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {features.map((f) => (
                        <Link key={f.title} href={f.link} className="status-card" style={{ padding: '20px', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{f.icon}</div>
                            <strong style={{ fontSize: '1.1rem' }}>{f.title}</strong>
                            <p className="muted" style={{ margin: '8px 0 0', flex: 1, fontSize: '0.9em' }}>{f.desc}</p>
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
