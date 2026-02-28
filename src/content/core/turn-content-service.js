/**
 * Shared turn content normalization service.
 * Centralizes assistant rich-content to markdown conversion so upper services
 * (export/toc) stay focused on their own domains.
 */
class ChatNavTurnContentService {
  static buildAssistantMarkdown(turn) {
    const segments = Array.isArray(turn?.assistantSegments) ? turn.assistantSegments : [];
    const richParts = [];

    segments.forEach((segment) => {
      const markdown = (segment?.markdown || '').trim();
      if (markdown) {
        richParts.push(markdown);
        return;
      }

      const html = (segment?.html || '').trim();
      if (html) {
        const converted = ChatNavTurnContentService.htmlToMarkdown(html);
        if (converted) {
          richParts.push(converted);
          return;
        }
      }

      const text = (segment?.text || '').trim();
      if (text) {
        richParts.push(text);
      }
    });

    if (richParts.length > 0) {
      return richParts.join('\n\n').trim();
    }

    return (turn?.assistantText || '').trim();
  }

  static htmlToMarkdown(html) {
    if (!html) return '';

    const service = ChatNavTurnContentService.getTurndownService();
    if (!service) {
      return ChatNavTurnContentService.normalizeMarkdown(
        ChatNavTurnContentService.stripHtml(html)
      );
    }

    try {
      return ChatNavTurnContentService.normalizeMarkdown(service.turndown(html));
    } catch (error) {
      console.warn('Sinan: turndown conversion failed, fallback to plain text.', error);
      return ChatNavTurnContentService.normalizeMarkdown(
        ChatNavTurnContentService.stripHtml(html)
      );
    }
  }

  static getTurndownService() {
    if (ChatNavTurnContentService.turndownService) {
      return ChatNavTurnContentService.turndownService;
    }

    const TurndownCtor = (typeof window !== 'undefined' && window.TurndownService)
      || (typeof globalThis !== 'undefined' && globalThis.TurndownService);
    if (typeof TurndownCtor !== 'function') return null;

    const service = new TurndownCtor({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**'
    });

    const pluginRoot = (typeof window !== 'undefined' && window.turndownPluginGfm)
      || (typeof globalThis !== 'undefined' && globalThis.turndownPluginGfm);
    if (pluginRoot && typeof pluginRoot.gfm === 'function') {
      service.use(pluginRoot.gfm);
    }

    ChatNavTurnContentService.turndownService = service;
    return service;
  }

  static normalizeMarkdown(value) {
    return String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  static stripHtml(value) {
    if (!value) return '';

    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(String(value), 'text/html');
      return (doc.body && doc.body.textContent) ? doc.body.textContent : '';
    }

    return String(value).replace(/<[^>]+>/g, ' ');
  }
}

window.ChatNavTurnContentService = ChatNavTurnContentService;
