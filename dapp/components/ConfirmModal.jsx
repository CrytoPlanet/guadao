"use client";

import { useI18n } from '../app/components/LanguageProvider';

/**
 * 危险操作二次确认弹窗
 * @param {boolean} isOpen - 是否显示弹窗
 * @param {string} title - 弹窗标题
 * @param {string} message - 提示信息
 * @param {function} onConfirm - 确认回调
 * @param {function} onCancel - 取消回调
 * @param {string} confirmText - 确认按钮文字（可选）
 * @param {boolean} isDanger - 是否为危险操作（红色按钮）
 */
export default function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText,
    isDanger = true,
}) {
    const { t } = useI18n();

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onCancel?.();
        }
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content" role="dialog" aria-modal="true">
                <h3 className="modal-title">{title || t('ui.confirm.title')}</h3>
                <p className="modal-message">{message}</p>
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn ghost"
                        onClick={onCancel}
                    >
                        {t('ui.confirm.cancel')}
                    </button>
                    <button
                        type="button"
                        className={`btn ${isDanger ? 'danger' : 'primary'}`}
                        onClick={onConfirm}
                    >
                        {confirmText || t('ui.confirm.ok')}
                    </button>
                </div>
            </div>
        </div>
    );
}
