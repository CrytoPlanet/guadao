"use client";

import { getExplorerUrl } from '../../lib/appConfig';
import { useI18n } from './LanguageProvider';

export default function ExplorerLink({ chainId, type, value, label }) {
  const { t } = useI18n();
  const url = getExplorerUrl(chainId, type, value);

  if (!url) return null;

  return (
    <a className="explorer-link" href={url} target="_blank" rel="noreferrer">
      {label || t('status.explorer')}
    </a>
  );
}
