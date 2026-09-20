'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TextB, TextItalic, ListBullets, ListNumbers, Link as LinkIcon } from '@phosphor-icons/react';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}

type Formatter = (selected: string) => { text: string; cursorOffset: number };

// Minimal markdown authoring toolbar: wraps the current selection (or
// inserts a placeholder if nothing's selected) with the right markdown
// syntax. Deliberately a plain textarea + syntax helpers rather than a
// full WYSIWYG/contenteditable editor — much smaller surface area, no
// HTML-sanitization concerns on render (see markdown-content.tsx), and
// the "common effects" asked for (bold/italic/lists) are exactly what
// markdown syntax covers.
export function MarkdownEditor({
  label,
  value,
  onChange,
  placeholder,
  required,
  maxLength,
}: MarkdownEditorProps) {
  const t = useTranslations('trips');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Write/preview tabs exist specifically because plain markdown syntax
  // gives no visual feedback while typing — overlapping selections (e.g.
  // bolding a phrase that spans into a line you later turn into a list)
  // can silently produce malformed markdown that only becomes obvious once
  // rendered. This lets an author catch that before publishing instead of
  // after.
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  const applyFormat = (format: Formatter) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const { text, cursorOffset } = format(selected);

    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + cursorOffset;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const bold = () =>
    applyFormat((selected) => ({
      text: `**${selected || 'bold text'}**`,
      cursorOffset: selected ? selected.length + 4 : 2,
    }));

  const italic = () =>
    applyFormat((selected) => ({
      text: `*${selected || 'italic text'}*`,
      cursorOffset: selected ? selected.length + 2 : 1,
    }));

  const bulletList = () =>
    applyFormat((selected) => {
      const lines = (selected || 'List item').split('\n');
      const text = lines.map((line) => `- ${line}`).join('\n');
      return { text, cursorOffset: text.length };
    });

  const numberedList = () =>
    applyFormat((selected) => {
      const lines = (selected || 'List item').split('\n');
      const text = lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
      return { text, cursorOffset: text.length };
    });

  const link = () =>
    applyFormat((selected) => {
      const text = `[${selected || 'link text'}](https://)`;
      return { text, cursorOffset: text.length - 1 };
    });

  const toolbarButtonClass =
    'flex h-7 w-7 items-center justify-center rounded text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800';

  const tabClass = (active: boolean) =>
    cn(
      'rounded px-2 py-1 text-xs font-medium transition-colors',
      active
        ? 'bg-forest-50 text-forest-700 dark:bg-forest-600/20 dark:text-forest-400'
        : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
    );

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
      )}
      <div className="rounded-lg border border-neutral-300 dark:border-neutral-700">
        <div className="flex items-center justify-between gap-1 border-b border-neutral-200 p-1 dark:border-neutral-800">
          {mode === 'write' ? (
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={bold} aria-label="Bold" title="Bold" className={toolbarButtonClass}>
                <TextB size={15} weight="regular" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={italic} aria-label="Italic" title="Italic" className={toolbarButtonClass}>
                <TextItalic size={15} weight="regular" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={bulletList}
                aria-label="Bullet list"
                title="Bullet list"
                className={toolbarButtonClass}
              >
                <ListBullets size={15} weight="regular" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={numberedList}
                aria-label="Numbered list"
                title="Numbered list"
                className={toolbarButtonClass}
              >
                <ListNumbers size={15} weight="regular" strokeWidth={1.5} />
              </button>
              <button type="button" onClick={link} aria-label="Link" title="Link" className={toolbarButtonClass}>
                <LinkIcon size={15} weight="regular" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => setMode('write')} className={tabClass(mode === 'write')}>
              {t('markdownWrite')}
            </button>
            <button type="button" onClick={() => setMode('preview')} className={tabClass(mode === 'preview')}>
              {t('markdownPreview')}
            </button>
          </div>
        </div>
        {mode === 'write' ? (
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
            className="min-h-32 rounded-t-none border-0 focus-visible:ring-0"
          />
        ) : value.trim() ? (
          <MarkdownContent content={value} className="min-h-32 p-3" />
        ) : (
          <p className="min-h-32 p-3 text-sm text-neutral-400 dark:text-neutral-600">
            {t('markdownPreviewEmpty')}
          </p>
        )}
      </div>
    </div>
  );
}
