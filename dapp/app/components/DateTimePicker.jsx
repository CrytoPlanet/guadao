import { useState, useEffect } from 'react';

export default function DateTimePicker({ value, onChange, label, disabled = false, showShortcuts = false }) {
    // Convert timestamp (seconds) to datetime-local string (YYYY-MM-DDTHH:mm)
    const toLocalISO = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(Number(timestamp) * 1000);
        if (Number.isNaN(date.getTime())) return '';

        const pad = (n) => n.toString().padStart(2, '0');
        const YYYY = date.getFullYear();
        const MM = pad(date.getMonth() + 1);
        const DD = pad(date.getDate());
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
    };

    const [inputValue, setInputValue] = useState(toLocalISO(value));
    const [mode, setMode] = useState('datetime'); // 'datetime' | 'timestamp'

    useEffect(() => {
        setInputValue(toLocalISO(value));
    }, [value]);

    const handleDateChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        if (!val) {
            onChange('');
            return;
        }
        const date = new Date(val);
        if (!Number.isNaN(date.getTime())) {
            onChange(Math.floor(date.getTime() / 1000));
        }
    };

    const handleTimestampChange = (e) => {
        const val = e.target.value;
        if (!val) {
            onChange('');
            return;
        }
        onChange(val); // Parent handles Number/BigInt conversion usually, but we keep it compatible
    };

    const addTime = (seconds) => {
        const base = value ? Number(value) : Math.floor(Date.now() / 1000);
        onChange(base + seconds);
    };

    return (
        <div className="datetime-picker-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {label && <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>}
                <button
                    type="button"
                    className="btn link"
                    onClick={() => setMode(m => m === 'datetime' ? 'timestamp' : 'datetime')}
                    style={{ fontSize: '0.75rem', padding: 0 }}
                >
                    {mode === 'datetime' ? '# Timestamp' : '📅 Date Picker'}
                </button>
            </div>

            {mode === 'datetime' ? (
                <input
                    type="datetime-local"
                    value={inputValue}
                    onChange={handleDateChange}
                    disabled={disabled}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '1rem',
                        width: '100%',
                    }}
                />
            ) : (
                <input
                    type="number"
                    value={value || ''}
                    onChange={handleTimestampChange}
                    placeholder="Unix Timestamp"
                    disabled={disabled}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: '1rem',
                        width: '100%',
                        fontFamily: 'monospace'
                    }}
                />
            )}

            {showShortcuts && !disabled && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn sm" onClick={() => addTime(3600)}>+1h</button>
                    <button type="button" className="btn sm" onClick={() => addTime(86400)}>+1d</button>
                    <button type="button" className="btn sm" onClick={() => addTime(604800)}>+1w</button>
                    <button type="button" className="btn sm" onClick={() => addTime(2592000)}>+30d</button>
                </div>
            )}
        </div>
    );
}
