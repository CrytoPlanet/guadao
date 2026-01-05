"use client";

import { useI18n } from './LanguageProvider';

export default function StatusNotice({ status, className = '' }) {
  const { t } = useI18n();

  if (!status) return null;

  const messageKey = status.messageKey || status.key || 'status.ready';
  const message = t(messageKey, status.values);
  const kind = status.kind || 'neutral';
  const classes = ['status-notice', kind, className].filter(Boolean).join(' ');

  return <div className={classes}>{message}</div>;
}
