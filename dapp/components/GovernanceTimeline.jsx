"use client";

import { useI18n } from '../app/components/LanguageProvider';

const STATUS_CONFIG = [
    { status: 0, key: 'Pending' },
    { status: 1, key: 'Active' },
    { status: 2, key: 'Canceled' },
    { status: 3, key: 'Defeated' },
    { status: 4, key: 'Succeeded' },
    { status: 5, key: 'Queued' },
    { status: 6, key: 'Expired' },
    { status: 7, key: 'Executed' },
];


const formatBlockTime = (blockNumber, currentBlock, t) => {
    if (!blockNumber) return '-';
    // If it's a small number/block number, show Block #
    // Simple heuristic: Unix timestamp 2020+ is > 1.5 billion. Block numbers are usually < 100M or similar range on L2s (Base is different but distinct).
    // Base block number is ~18M+. Timestamp is 1.7B+.
    // A cutoff of 1,000,000,000 is safe.
    if (Number(blockNumber) > 1000000000) {
        // It's a timestamp
        const date = new Date(Number(blockNumber) * 1000);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
    }

    // It's a block
    let est = '';
    if (currentBlock) {
        const secondsDiff = (Number(blockNumber) - Number(currentBlock)) * 2; // Assume 2s per block
        const timestamp = (Date.now() / 1000) + secondsDiff;
        const date = new Date(timestamp * 1000);
        est = `(≈ ${date.toLocaleString()})`;
    }
    return `Block #${blockNumber} ${est}`;
};

export default function GovernanceTimeline({ currentStatus, proposal, currentBlock }) {
    const { t } = useI18n();

    // Lifecycle paths:
    // Success: Pending -> Active -> Succeeded -> Queued -> Executed
    // Defeat: Pending -> Active -> Defeated
    // Cancel: Pending -> Active -> Canceled (or from Pending)
    // Expired: Pending -> Active -> Succeeded -> Queued -> Expired

    const getTimelineSteps = () => {
        const baseSteps = [-1]; // Always start with Published
        if (currentStatus === 2) return [...baseSteps, 0, 1, 2]; // Canceled
        if (currentStatus === 3) return [...baseSteps, 0, 1, 3]; // Defeated
        if (currentStatus === 7) return [...baseSteps, 0, 1, 4, 5, 7]; // Executed
        if (currentStatus === 6) return [...baseSteps, 0, 1, 4, 5, 6]; // Expired
        if (currentStatus === 5) return [...baseSteps, 0, 1, 4, 5, 7]; // Queued (target Executed)
        if (currentStatus === 4) return [...baseSteps, 0, 1, 4, 5, 7]; // Succeeded (target Executed)

        // Default Active/Pending path
        return [...baseSteps, 0, 1, 4, 5, 7];
    };

    const timelineSteps = getTimelineSteps();

    // Determine current index based on status
    let activeStepIndex = timelineSteps.indexOf(currentStatus);

    if (activeStepIndex === -1) {
        if (currentStatus === 1) activeStepIndex = 2; // Published(0), Pending(1), Active(2)
        if (currentStatus === 0) activeStepIndex = 1; // Published(0), Pending(1)
        // Note: timelineSteps includes -1 at index 0, 0 at index 1.
        // If currentStatus is 0, indexOf is 1. Published (index 0) < 1 is Done. Correct.
    }

    const getStepClassName = (stepStatus, index) => {
        if (stepStatus === currentStatus) return 'timeline-step active';
        if (index < activeStepIndex) return 'timeline-step done';
        return 'timeline-step pending';
    };

    const getStepInfo = (stepStatus) => {
        // Map status to labels
        const labels = {
            '-1': t('governance.status.published'),
            0: t('governance.status.0'), // Pending
            1: t('governance.status.1'), // Active
            2: t('governance.status.2'), // Canceled
            3: t('governance.status.3'), // Defeated
            4: t('governance.status.4'), // Succeeded
            5: t('governance.status.5'), // Queued
            6: t('governance.status.6'), // Expired
            7: t('governance.status.7'), // Executed
        };

        let time = null;
        if (stepStatus === -1) {
            if (proposal?.creationTimestamp) {
                time = new Date(Number(proposal.creationTimestamp) * 1000).toLocaleString();
            }
        }
        if (stepStatus === 0) {
            // Created / Pending -> Now Voting Starts
            if (proposal?.startTimestamp) {
                time = new Date(Number(proposal.startTimestamp) * 1000).toLocaleString();
            } else {
                time = proposal?.voteStart ? formatBlockTime(proposal.voteStart, currentBlock) : null;
            }
        }
        if (stepStatus === 1) {
            // Active / Voting End
            if (proposal?.endTimestamp) {
                time = `${t('voting.window.end')}: ${new Date(Number(proposal.endTimestamp) * 1000).toLocaleString()}`;
            } else {
                time = proposal?.voteEnd ? `${t('voting.window.end')}: ${formatBlockTime(proposal.voteEnd, currentBlock)}` : null;
            }
        }
        if (stepStatus === 5 && proposal?.eta) time = `ETA: ${formatBlockTime(proposal.eta, null)}`; // ETA is usually timestamp in Timelock, but consistent check is safer

        return {
            label: labels[stepStatus] || `Status ${stepStatus}`,
            time: time
        };
    };

    return (
        <div className="proposal-timeline">
            <div className="timeline-track">
                {timelineSteps.map((stepStatus, index) => {
                    const { label, time } = getStepInfo(stepStatus);
                    return (
                        <div key={stepStatus} className={getStepClassName(stepStatus, index)}>
                            <div className="timeline-dot">
                                {index < activeStepIndex ? '✓' : index + 1}
                            </div>
                            <div className="timeline-content">
                                <div className="timeline-label">{label}</div>
                                {time && <div className="timeline-time">{time}</div>}
                            </div>
                            {index < timelineSteps.length - 1 && (
                                <div className={`timeline-connector ${index < activeStepIndex ? 'done' : ''}`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
