"use client";

import { useRef, useCallback } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useI18n } from './LanguageProvider';

/**
 * Markdown toolbar buttons configuration
 */
const toolbarButtons = [
    { icon: 'B', title: 'Bold', prefix: '**', suffix: '**', placeholder: 'bold text' },
    { icon: 'I', title: 'Italic', prefix: '*', suffix: '*', placeholder: 'italic text' },
    { icon: 'S', title: 'Strikethrough', prefix: '~~', suffix: '~~', placeholder: 'strikethrough' },
    { type: 'separator' },
    { icon: 'H1', title: 'Heading 1', prefix: '# ', suffix: '', placeholder: 'Heading', block: true },
    { icon: 'H2', title: 'Heading 2', prefix: '## ', suffix: '', placeholder: 'Heading', block: true },
    { icon: 'H3', title: 'Heading 3', prefix: '### ', suffix: '', placeholder: 'Heading', block: true },
    { type: 'separator' },
    { icon: '•', title: 'Bullet List', prefix: '- ', suffix: '', placeholder: 'List item', block: true },
    { icon: '1.', title: 'Numbered List', prefix: '1. ', suffix: '', placeholder: 'List item', block: true },
    { icon: '☑', title: 'Task List', prefix: '- [ ] ', suffix: '', placeholder: 'Task item', block: true },
    { type: 'separator' },
    { icon: '🔗', title: 'Link', prefix: '[', suffix: '](url)', placeholder: 'link text' },
    { icon: '📷', title: 'Image', prefix: '![', suffix: '](image-url)', placeholder: 'alt text' },
    { icon: '`', title: 'Inline Code', prefix: '`', suffix: '`', placeholder: 'code' },
    { icon: '```', title: 'Code Block', prefix: '```\n', suffix: '\n```', placeholder: 'code block', block: true },
    { type: 'separator' },
    { icon: '❝', title: 'Blockquote', prefix: '> ', suffix: '', placeholder: 'quote', block: true },
    { icon: '—', title: 'Horizontal Rule', prefix: '\n---\n', suffix: '', placeholder: '', block: true },
    { icon: '📊', title: 'Table', prefix: '| Header 1 | Header 2 |\n| --- | --- |\n| ', suffix: ' | Cell 2 |', placeholder: 'Cell 1', block: true },
];

/**
 * Simple Markdown Editor with toolbar
 */
export default function MarkdownEditor({
    value,
    onChange,
    placeholder = '',
    minRows = 10,
    maxLength = 5000,
    style = {},
}) {
    const { t } = useI18n();
    const textareaRef = useRef(null);

    const insertMarkdown = useCallback((button) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const { selectionStart, selectionEnd } = textarea;
        const selectedText = value.substring(selectionStart, selectionEnd);
        const beforeText = value.substring(0, selectionStart);
        const afterText = value.substring(selectionEnd);

        // For block elements, ensure we start on a new line
        let prefix = button.prefix;
        let suffix = button.suffix;

        if (button.block && beforeText.length > 0 && !beforeText.endsWith('\n')) {
            prefix = '\n' + prefix;
        }

        const insertText = selectedText || button.placeholder;
        const newText = beforeText + prefix + insertText + suffix + afterText;

        onChange({ target: { value: newText } });

        // Set cursor position after insert
        requestAnimationFrame(() => {
            const newCursorPos = selectionStart + prefix.length + insertText.length;
            textarea.focus();
            textarea.setSelectionRange(
                selectionStart + prefix.length,
                selectionStart + prefix.length + insertText.length
            );
        });
    }, [value, onChange]);

    return (
        <div className="markdown-editor">
            {/* Toolbar */}
            <div className="markdown-toolbar">
                {toolbarButtons.map((button, index) => {
                    if (button.type === 'separator') {
                        return <div key={index} className="toolbar-separator" />;
                    }
                    return (
                        <button
                            key={index}
                            type="button"
                            className="toolbar-btn"
                            title={button.title}
                            onClick={() => insertMarkdown(button)}
                        >
                            {button.icon}
                        </button>
                    );
                })}
            </div>

            {/* Textarea */}
            <TextareaAutosize
                ref={textareaRef}
                value={value}
                placeholder={placeholder}
                onChange={onChange}
                minRows={minRows}
                maxLength={maxLength}
                style={{
                    width: '100%',
                    resize: 'vertical',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    padding: '16px',
                    borderRadius: '0 0 12px 12px',
                    borderTop: 'none',
                    ...style,
                }}
            />
        </div>
    );
}
