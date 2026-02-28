/**
 * Markdown export service for conversation turns.
 */
class ChatNavExportService {
  static exportTurnAsMarkdown(turn, options = {}) {
    return ChatNavExportService.exportTurnsAsMarkdown([turn], options);
  }

  static exportTurnsAsMarkdown(turns, options = {}) {
    const validTurns = ChatNavExportService.normalizeTurns(turns);
    if (validTurns.length === 0) {
      return { ok: false, error: 'invalid_turn' };
    }

    const exportedAt = options.exportedAt || new Date();
    const meta = {
      source: options.source || window.location.hostname,
      url: options.url || window.location.href,
      exportedAt
    };

    const markdown = ChatNavExportService.buildTurnsMarkdown(validTurns, meta);
    const fileName = ChatNavExportService.buildFileNameForTurns(validTurns, meta);
    ChatNavExportService.downloadFile(fileName, markdown);

    return {
      ok: true,
      fileName,
      count: validTurns.length
    };
  }

  static buildMarkdown(turn, meta) {
    return ChatNavExportService.buildTurnsMarkdown([turn], meta);
  }

  static buildTurnsMarkdown(turns, meta) {
    const validTurns = ChatNavExportService.normalizeTurns(turns);
    const exportedAt = ChatNavExportService.formatDateTime(meta.exportedAt);
    const blocks = validTurns
      .map(turn => ChatNavExportService.buildTurnBlock(turn))
      .filter(Boolean)
      .join('\n\n');

    return [
      '# Sinan Export',
      '',
      `- Source: ${meta.source}`,
      `- URL: ${meta.url}`,
      `- Exported At: ${exportedAt}`,
      `- Selected Count: ${validTurns.length}`,
      '',
      blocks
    ].join('\n');
  }

  static buildTurnBlock(turn) {
    const userText = (turn?.user?.text || '').trim();
    if (!userText) return '';

    const heading = ChatNavExportService.buildTurnHeading(userText, 64);
    const assistantText = ChatNavExportService.buildAssistantMarkdown(turn) || '(no assistant response found)';

    return [
      `## ${heading}`,
      '',
      userText,
      '',
      assistantText
    ].join('\n');
  }

  static buildTurnHeading(text, maxLen = 64) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '(empty user message)';
    if (normalized.length <= maxLen) return normalized;
    if (maxLen <= 3) return '.'.repeat(Math.max(1, maxLen));
    return `${normalized.slice(0, maxLen - 3).trimEnd()}...`;
  }

  static buildAssistantMarkdown(turn) {
    const contentService = ChatNavExportService.getTurnContentService();
    if (contentService) {
      return contentService.buildAssistantMarkdown(turn);
    }
    return (turn?.assistantText || '').trim();
  }

  static buildFileName(turn, meta) {
    return ChatNavExportService.buildFileNameForTurns([turn], meta);
  }

  static buildFileNameForTurns(turns, meta) {
    const validTurns = ChatNavExportService.normalizeTurns(turns);
    const source = ChatNavExportService.normalizeForFileName(meta.source || 'chat');
    const stamp = ChatNavExportService.formatTimeStamp(meta.exportedAt);
    if (validTurns.length > 1) {
      return `sinan-${source}-${stamp}-selected-${validTurns.length}.md`;
    }

    const snippet = ChatNavExportService.normalizeForFileName((validTurns[0]?.user?.text || '').slice(0, 32)) || 'message';
    return `sinan-${source}-${stamp}-${snippet}.md`;
  }

  static downloadFile(fileName, content) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  static htmlToMarkdown(html) {
    const contentService = ChatNavExportService.getTurnContentService();
    if (contentService) {
      return contentService.htmlToMarkdown(html);
    }
    return ChatNavExportService.normalizeMarkdown(
      ChatNavExportService.stripHtml(html)
    );
  }

  static formatDateTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
  }

  static formatTimeStamp(date) {
    const d = date instanceof Date ? date : new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${min}`;
  }

  static normalizeForFileName(value) {
    return (value || '')
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  static getTurndownService() {
    const contentService = ChatNavExportService.getTurnContentService();
    if (!contentService) return null;
    return contentService.getTurndownService();
  }

  static normalizeMarkdown(value) {
    const contentService = ChatNavExportService.getTurnContentService();
    if (contentService) {
      return contentService.normalizeMarkdown(value);
    }
    return String(value || '').trim();
  }

  static stripHtml(value) {
    const contentService = ChatNavExportService.getTurnContentService();
    if (contentService) {
      return contentService.stripHtml(value);
    }
    return String(value || '').replace(/<[^>]+>/g, ' ');
  }

  static getTurnContentService() {
    const candidate = (typeof window !== 'undefined' && window.ChatNavTurnContentService)
      || (typeof globalThis !== 'undefined' && globalThis.ChatNavTurnContentService);
    return candidate && typeof candidate.buildAssistantMarkdown === 'function' ? candidate : null;
  }

  static normalizeTurns(turns) {
    const list = Array.isArray(turns) ? turns : [];
    return list.filter(turn => {
      const text = turn && turn.user && turn.user.text;
      return typeof text === 'string' && text.trim().length > 0;
    });
  }
}

window.ChatNavExportService = ChatNavExportService;
