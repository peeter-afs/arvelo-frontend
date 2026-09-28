'use client';

import { renderInline } from '@/components/guides/GuideBody';

/**
 * Renders an assistant reply: paragraphs, `-`/`1.` lists and the same inline
 * `**bold**` / `[label](/href)` syntax the guides use — which is what the
 * assistant is told to write.
 */
export function AssistantText({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph.split('\n');
        const bullet = lines.every((line) => /^\s*[-*•]\s+/.test(line));
        const numbered = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));

        if (bullet || numbered) {
          const Tag = numbered ? 'ol' : 'ul';
          return (
            <Tag key={index} className={`space-y-1 pl-4 ${numbered ? 'list-decimal' : 'list-disc'}`}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>
              ))}
            </Tag>
          );
        }

        return (
          <p key={index}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
