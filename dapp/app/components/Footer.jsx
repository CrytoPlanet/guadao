'use client';
import { useI18n } from './LanguageProvider';

export default function Footer() {
    const { t } = useI18n();
    return (
        <footer style={{
            padding: '1.5rem 1rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-secondary, #888)',
            marginTop: 'auto',
            background: 'transparent',
        }}>
            <div>
                {t('footer.copyright')}
            </div>
        </footer>
    );
}
