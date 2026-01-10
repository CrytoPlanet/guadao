"use client";

import { useState, useEffect, useCallback } from 'react';

/**
 * Scroll Progress Ball - Shows reading progress and scrolls to top on click
 */
export default function ScrollProgress() {
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

            setProgress(Math.min(100, Math.max(0, scrollPercent)));
            setVisible(scrollTop > 200);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = useCallback(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, []);

    if (!visible) return null;

    // Calculate the stroke offset for the progress circle
    const circumference = 2 * Math.PI * 20; // radius = 20
    const strokeOffset = circumference - (progress / 100) * circumference;

    return (
        <button
            className="scroll-progress-ball"
            onClick={scrollToTop}
            title={`${progress}% - 回到顶部`}
            aria-label="Scroll to top"
        >
            <svg className="progress-ring" viewBox="0 0 48 48">
                {/* Background circle */}
                <circle
                    className="progress-ring-bg"
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    strokeWidth="3"
                />
                {/* Progress circle */}
                <circle
                    className="progress-ring-fill"
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                />
            </svg>
            <span className="progress-text">{progress}%</span>
        </button>
    );
}
