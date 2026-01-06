"use client";

/**
 * 带禁用原因的按钮组件
 * @param {boolean} disabled - 是否禁用
 * @param {string} disabledReason - 禁用原因（tooltip 显示）
 * @param {string} className - 按钮样式类名
 * @param {function} onClick - 点击回调
 * @param {React.ReactNode} children - 按钮内容
 * @param {string} type - 按钮类型 (button/submit)
 */
export default function DisabledButton({
    disabled,
    disabledReason,
    className = 'btn primary',
    onClick,
    children,
    type = 'button',
    ...rest
}) {
    const isDisabled = disabled || Boolean(disabledReason);

    return (
        <div className="disabled-button-wrapper" title={isDisabled ? disabledReason : undefined}>
            <button
                type={type}
                className={`${className}${isDisabled ? ' disabled' : ''}`}
                onClick={isDisabled ? undefined : onClick}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                {...rest}
            >
                {children}
            </button>
            {isDisabled && disabledReason && (
                <span className="disabled-reason">{disabledReason}</span>
            )}
        </div>
    );
}
