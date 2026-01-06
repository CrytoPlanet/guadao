"use client";

import { useI18n } from '../app/components/LanguageProvider';

const STATUS_CONFIG = [
    { status: 0, key: 'Created' },      // 已创建
    { status: 1, key: 'Voting' },       // 投票中
    { status: 2, key: 'VotingFinalized' }, // 投票结束
    { status: 3, key: 'Accepted' },     // 已确认
    { status: 4, key: 'Submitted' },    // 已提交
    { status: 5, key: 'Disputed' },     // 质疑中
    { status: 6, key: 'Completed' },    // 已完成
    { status: 7, key: 'Denied' },       // 已拒绝
    { status: 8, key: 'Expired' },      // 已过期
];

const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(Number(timestamp) * 1000);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

/**
 * 提案状态时间轴组件
 * @param {number} currentStatus - 当前状态 (0-8)
 * @param {object} proposal - 提案数据对象
 */
export default function ProposalTimeline({ currentStatus, proposal }) {
    const { t, lang } = useI18n();

    // 根据不同状态显示不同的时间轴路径
    // 正常流程: Created -> Voting -> VotingFinalized -> Accepted -> Submitted -> Completed
    // 质疑流程: ... -> Submitted -> Disputed -> Completed/Denied
    // 过期流程: ... -> Accepted -> Expired (未提交交付)

    const getTimelineSteps = () => {
        // 如果是终态（Completed, Denied, Expired），显示对应的完整路径
        if (currentStatus === 8) {
            // Expired
            return [0, 1, 2, 3, 8];
        }
        if (currentStatus === 7) {
            // Denied (dispute rejected delivery)
            return [0, 1, 2, 3, 4, 5, 7];
        }
        if (currentStatus === 6) {
            // Completed
            if (proposal?.challenger && proposal.challenger !== '0x0000000000000000000000000000000000000000') {
                // 经过质疑后完成
                return [0, 1, 2, 3, 4, 5, 6];
            }
            // 正常完成
            return [0, 1, 2, 3, 4, 6];
        }
        if (currentStatus === 5) {
            // Disputed
            return [0, 1, 2, 3, 4, 5];
        }
        // 正常进行中的流程
        return [0, 1, 2, 3, 4, 6];
    };

    const timelineSteps = getTimelineSteps();
    const currentIndex = timelineSteps.indexOf(currentStatus);

    const getStepClassName = (stepStatus, index) => {
        if (stepStatus === currentStatus) return 'timeline-step active';
        if (index < currentIndex) return 'timeline-step done';
        return 'timeline-step pending';
    };

    const getStepInfo = (stepStatus) => {
        switch (stepStatus) {
            case 0:
                return {
                    label: t('timeline.created'),
                    time: null,
                };
            case 1:
                return {
                    label: t('timeline.voting'),
                    time: proposal?.startTime ? formatDateTime(proposal.startTime) : null,
                };
            case 2:
                return {
                    label: t('timeline.votingFinalized'),
                    time: proposal?.endTime ? formatDateTime(proposal.endTime) : null,
                };
            case 3:
                return {
                    label: t('timeline.accepted'),
                    time: null,
                };
            case 4:
                return {
                    label: t('timeline.submitted'),
                    time: proposal?.submitDeadline ? `${t('timeline.deadline')}: ${formatDateTime(proposal.submitDeadline)}` : null,
                };
            case 5:
                return {
                    label: t('timeline.disputed'),
                    time: proposal?.challengeWindowEnd ? `${t('timeline.challengeEnd')}: ${formatDateTime(proposal.challengeWindowEnd)}` : null,
                };
            case 6:
                return { label: t('timeline.completed'), time: null };
            case 7:
                return { label: t('timeline.denied'), time: null };
            case 8:
                return { label: t('timeline.expired'), time: null };
            default:
                return { label: '-', time: null };
        }
    };

    return (
        <div className="proposal-timeline">
            <div className="timeline-track">
                {timelineSteps.map((stepStatus, index) => {
                    const { label, time } = getStepInfo(stepStatus);
                    return (
                        <div key={stepStatus} className={getStepClassName(stepStatus, index)}>
                            <div className="timeline-dot">
                                {index < currentIndex ? '✓' : index + 1}
                            </div>
                            <div className="timeline-content">
                                <div className="timeline-label">{label}</div>
                                {time && <div className="timeline-time">{time}</div>}
                            </div>
                            {index < timelineSteps.length - 1 && (
                                <div className={`timeline-connector ${index < currentIndex ? 'done' : ''}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
