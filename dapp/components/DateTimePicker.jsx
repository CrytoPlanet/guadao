"use client";

import { useState, useEffect } from 'react';
import { useI18n } from '../app/components/LanguageProvider';

/**
 * 时间戳输入组件
 * @param {string} value - 当前时间戳值（Unix 秒）
 * @param {function} onChange - 值变化回调
 * @param {string} placeholder - 占位符
 * @param {string} label - 标签
 */
export default function DateTimePicker({
    value,
    onChange,
    placeholder,
    label,
}) {
    const { t } = useI18n();
    const [inputMode, setInputMode] = useState('datetime'); // 'datetime' | 'timestamp' | 'relative'
    const [localDatetime, setLocalDatetime] = useState('');
    const [relativeValue, setRelativeValue] = useState('');
    const [relativeUnit, setRelativeUnit] = useState('hours');

    // 将时间戳转换为本地 datetime-local 格式
    useEffect(() => {
        if (value && !isNaN(Number(value))) {
            const date = new Date(Number(value) * 1000);
            if (!isNaN(date.getTime())) {
                // 格式化为 YYYY-MM-DDTHH:mm
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                setLocalDatetime(`${year}-${month}-${day}T${hours}:${minutes}`);
            }
        }
    }, [value]);

    const handleDatetimeChange = (e) => {
        const datetimeString = e.target.value;
        setLocalDatetime(datetimeString);

        if (datetimeString) {
            const date = new Date(datetimeString);
            if (!isNaN(date.getTime())) {
                const timestamp = Math.floor(date.getTime() / 1000);
                onChange?.(String(timestamp));
            }
        } else {
            onChange?.('');
        }
    };

    const handleTimestampChange = (e) => {
        onChange?.(e.target.value);
    };

    const handleRelativeApply = () => {
        if (!relativeValue || isNaN(Number(relativeValue))) return;

        const now = Math.floor(Date.now() / 1000);
        const num = Number(relativeValue);
        let seconds = 0;

        switch (relativeUnit) {
            case 'minutes':
                seconds = num * 60;
                break;
            case 'hours':
                seconds = num * 3600;
                break;
            case 'days':
                seconds = num * 86400;
                break;
            case 'weeks':
                seconds = num * 604800;
                break;
            default:
                seconds = num * 3600;
        }

        const futureTimestamp = now + seconds;
        onChange?.(String(futureTimestamp));
    };

    const quickButtons = [
        { label: '+1h', seconds: 3600 },
        { label: '+6h', seconds: 21600 },
        { label: '+1d', seconds: 86400 },
        { label: '+7d', seconds: 604800 },
        { label: '+14d', seconds: 1209600 },
    ];

    const handleQuickAdd = (seconds) => {
        const now = Math.floor(Date.now() / 1000);
        onChange?.(String(now + seconds));
    };

    return (
        <div className="datetime-picker">
            {label && <span className="field-label">{label}</span>}

            <div className="datetime-mode-tabs">
                <button
                    type="button"
                    className={`mode-tab ${inputMode === 'datetime' ? 'active' : ''}`}
                    onClick={() => setInputMode('datetime')}
                >
                    {t('ui.datetime.calendar')}
                </button>
                <button
                    type="button"
                    className={`mode-tab ${inputMode === 'relative' ? 'active' : ''}`}
                    onClick={() => setInputMode('relative')}
                >
                    {t('ui.datetime.relative')}
                </button>
                <button
                    type="button"
                    className={`mode-tab ${inputMode === 'timestamp' ? 'active' : ''}`}
                    onClick={() => setInputMode('timestamp')}
                >
                    {t('ui.datetime.timestamp')}
                </button>
            </div>

            <div className="datetime-input-area">
                {inputMode === 'datetime' && (
                    <input
                        type="datetime-local"
                        value={localDatetime}
                        onChange={handleDatetimeChange}
                        className="datetime-input"
                    />
                )}

                {inputMode === 'timestamp' && (
                    <input
                        type="text"
                        value={value || ''}
                        onChange={handleTimestampChange}
                        placeholder={placeholder || '1700000000'}
                        className="timestamp-input"
                    />
                )}

                {inputMode === 'relative' && (
                    <div className="relative-input">
                        <input
                            type="number"
                            value={relativeValue}
                            onChange={(e) => setRelativeValue(e.target.value)}
                            placeholder="1"
                            className="relative-num"
                            min="0"
                        />
                        <select
                            value={relativeUnit}
                            onChange={(e) => setRelativeUnit(e.target.value)}
                            className="relative-unit"
                        >
                            <option value="minutes">{t('ui.datetime.minutes')}</option>
                            <option value="hours">{t('ui.datetime.hours')}</option>
                            <option value="days">{t('ui.datetime.days')}</option>
                            <option value="weeks">{t('ui.datetime.weeks')}</option>
                        </select>
                        <button
                            type="button"
                            className="btn ghost"
                            onClick={handleRelativeApply}
                        >
                            {t('ui.datetime.apply')}
                        </button>
                    </div>
                )}
            </div>

            <div className="datetime-quick-buttons">
                {quickButtons.map((btn) => (
                    <button
                        key={btn.label}
                        type="button"
                        className="btn ghost quick-btn"
                        onClick={() => handleQuickAdd(btn.seconds)}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            {value && (
                <div className="datetime-preview">
                    <span className="preview-label">{t('ui.datetime.preview')}:</span>
                    <span className="preview-value">
                        {new Date(Number(value) * 1000).toLocaleString()}
                    </span>
                    <span className="preview-timestamp">({value})</span>
                </div>
            )}
        </div>
    );
}
