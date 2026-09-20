import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// react-markdown never renders raw HTML from the source by default (no
// rehype-raw plugin here) — safe to feed it any user-authored string
// without a separate sanitization pass.
export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-neutral max-w-none text-neutral-700 dark:prose-invert dark:text-neutral-300',
        'prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-headings:mt-4 prose-headings:mb-2',
        'prose-a:text-forest-600 dark:prose-a:text-forest-400',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
