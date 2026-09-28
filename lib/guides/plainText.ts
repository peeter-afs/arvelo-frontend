import type { Guide, GuideBlock } from './types';
import { headingSlug } from './types';

/**
 * Flattens a guide to Markdown-ish text for the assistant. Headings carry their
 * anchor so the assistant can link straight to a section (/help/<slug>#<anchor>).
 */
function blockToText(block: GuideBlock): string {
  switch (block.type) {
    case 'heading':
      return `## ${block.text} {#${headingSlug(block.text)}}`;
    case 'paragraph':
      return block.text;
    case 'steps':
      return block.items
        .map((item, index) => `${index + 1}. **${item.title}**${item.text ? ` — ${item.text}` : ''}`)
        .join('\n');
    case 'list':
      return block.items.map((item, index) => (block.ordered ? `${index + 1}. ${item}` : `- ${item}`)).join('\n');
    case 'callout':
      return `> ${block.tone === 'warning' ? 'NB! ' : ''}${block.title ? `**${block.title}** ` : ''}${block.text}`;
    case 'table':
      return [
        `| ${block.headers.join(' | ')} |`,
        `| ${block.headers.map(() => '---').join(' | ')} |`,
        ...block.rows.map((row) => `| ${row.join(' | ')} |`),
      ].join('\n');
    case 'image':
      return `[Ekraanipilt: ${block.alt}${block.caption ? ` — ${block.caption}` : ''}]`;
    case 'action':
      return `[Nupp „${block.label}": kasutaja palub assistendil: „${block.prompt}"]`;
    default:
      return '';
  }
}

export function guideToText(guide: Guide): string {
  return [`# ${guide.title}`, guide.summary, ...guide.blocks.map(blockToText)].filter(Boolean).join('\n\n');
}
