"use client";

import { useState } from 'react';

import { useI18n } from './LanguageProvider';

export default function CopyButton({ value }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      setCopied(false);
    }
  };

  return (
    <button className="copy-btn" type="button" onClick={handleCopy} disabled={!value}>
      {copied ? t('status.copied') : t('status.copy')}
    </button>
  );
}