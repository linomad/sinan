/**
 * TOC extraction service for assistant responses.
 * Depends on ChatNavTurnContentService for normalized markdown input.
 */
class ChatNavTocService {
  static buildTurnDomSignature(turn) {
    const segments = Array.isArray(turn?.assistantSegments) ? turn.assistantSegments : [];
    const assistantTextHash = ChatNavTocService.hashText(turn?.assistantText || '');

    if (segments.length === 0) {
      return `segments:0|assistant:${assistantTextHash}`;
    }

    const segmentSignatures = segments.map((segment, index) => {
      const segmentId = String(segment?.id || index);
      const markdownHash = ChatNavTocService.hashText(segment?.markdown || '');
      const htmlHash = ChatNavTocService.hashText(segment?.html || '');
      const textHash = ChatNavTocService.hashText(segment?.text || '');
      const headingSignature = ChatNavTocService.buildSegmentHeadingSignature(segment?.element);

      return `${segmentId}|md:${markdownHash}|html:${htmlHash}|text:${textHash}|heads:${headingSignature}`;
    }).join('||');

    return `segments:${segments.length}|assistant:${assistantTextHash}|${segmentSignatures}`;
  }

  static extractTurnDomHeadings(turn) {
    const segments = Array.isArray(turn?.assistantSegments) ? turn.assistantSegments : [];
    const toc = [];

    segments.forEach((segment, segmentIndex) => {
      const root = segment && segment.element && typeof segment.element.querySelectorAll === 'function'
        ? segment.element
        : null;
      if (!root) return;

      const headingElements = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6'));
      headingElements.forEach((headingElement, headingIndex) => {
        if (!ChatNavTocService.isVisibleHeading(headingElement)) return;

        const level = ChatNavTocService.parseHeadingLevel(headingElement);
        if (!level) return;

        const text = ChatNavTocService.normalizeHeadingText(
          headingElement.textContent || headingElement.innerText || ''
        );
        if (!text) return;

        toc.push({
          level,
          text,
          segmentIndex,
          headingIndex,
          targetElement: headingElement
        });
      });
    });

    return toc;
  }

  static extractTurnToc(turn, options = {}) {
    const contentService = ChatNavTocService.getTurnContentService();
    const markdown = contentService
      ? contentService.buildAssistantMarkdown(turn)
      : String(turn?.assistantText || '').trim();
    return ChatNavTocService.extractMarkdownToc(markdown, options);
  }

  static extractMarkdownToc(markdown, options = {}) {
    const normalized = String(markdown || '').replace(/\r\n/g, '\n');
    if (!normalized.trim()) return [];

    const minLevel = ChatNavTocService.normalizeLevel(options.minLevel, 1);
    const maxLevel = ChatNavTocService.normalizeLevel(options.maxLevel, 6);
    const lowerBound = Math.min(minLevel, maxLevel);
    const upperBound = Math.max(minLevel, maxLevel);

    const lines = normalized.split('\n');
    const toc = [];
    let activeFence = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed) continue;

      const fenceMatch = trimmed.match(/^(```+|~~~+)/);
      if (fenceMatch) {
        const marker = fenceMatch[1].charAt(0);
        if (!activeFence) {
          activeFence = marker;
        } else if (activeFence === marker) {
          activeFence = '';
        }
        continue;
      }

      if (activeFence) continue;

      const atxMatch = trimmed.match(/^(#{1,6})[ \t]+(.+?)\s*$/);
      if (atxMatch) {
        const level = atxMatch[1].length;
        if (level >= lowerBound && level <= upperBound) {
          const text = ChatNavTocService.normalizeHeadingText(atxMatch[2]);
          if (text) toc.push({ level, text });
        }
        continue;
      }

      const nextLine = (lines[i + 1] || '').trim();
      let setextLevel = 0;
      if (/^={2,}\s*$/.test(nextLine)) {
        setextLevel = 1;
      } else if (/^-{2,}\s*$/.test(nextLine)) {
        setextLevel = 2;
      }

      if (setextLevel >= lowerBound && setextLevel <= upperBound) {
        const text = ChatNavTocService.normalizeHeadingText(trimmed);
        if (text) toc.push({ level: setextLevel, text });
        i += 1;
      }
    }

    return toc;
  }

  static normalizeHeadingText(text) {
    return String(text || '')
      .replace(/[ \t]+#+[ \t]*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static normalizeLevel(level, fallback) {
    const value = Number(level);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(6, Math.max(1, Math.round(value)));
  }

  static parseHeadingLevel(element) {
    const tagName = String(element?.tagName || '').toUpperCase();
    const match = tagName.match(/^H([1-6])$/);
    if (!match) return 0;
    return Number(match[1]);
  }

  static isVisibleHeading(element) {
    if (!element) return false;

    if (element.hidden === true) return false;
    if (ChatNavTocService.isAriaHidden(element)) return false;
    if (ChatNavTocService.hasHiddenUtilityClass(element)) return false;
    if (ChatNavTocService.isHiddenByInlineStyle(element)) return false;
    if (ChatNavTocService.isInsideHiddenAncestor(element)) return false;

    return true;
  }

  static isAriaHidden(element) {
    if (!element || typeof element.getAttribute !== 'function') return false;
    const ariaHidden = element.getAttribute('aria-hidden');
    return String(ariaHidden || '').toLowerCase() === 'true';
  }

  static hasHiddenUtilityClass(element) {
    if (!element) return false;

    const hiddenClassNames = [
      'cdk-visually-hidden',
      'visually-hidden',
      'sr-only',
      'screen-reader-only'
    ];

    if (element.classList && typeof element.classList.contains === 'function') {
      return hiddenClassNames.some(className => element.classList.contains(className));
    }

    const className = typeof element.className === 'string' ? element.className : '';
    if (!className) return false;

    const classTokens = className.split(/\s+/);
    return hiddenClassNames.some(hiddenClassName => classTokens.includes(hiddenClassName));
  }

  static isHiddenByInlineStyle(element) {
    if (!element || typeof element.getAttribute !== 'function') return false;
    const style = String(element.getAttribute('style') || '');
    if (!style) return false;
    return /display\s*:\s*none/i.test(style) || /visibility\s*:\s*hidden/i.test(style);
  }

  static isInsideHiddenAncestor(element) {
    if (!element || typeof element.closest !== 'function') return false;
    const hiddenAncestorSelector = [
      '[hidden]',
      '[aria-hidden="true"]',
      '.cdk-visually-hidden',
      '.visually-hidden',
      '.sr-only',
      '.screen-reader-only'
    ].join(',');
    return !!element.closest(hiddenAncestorSelector);
  }

  static buildSegmentHeadingSignature(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return 'none';
    const headingElements = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    if (headingElements.length === 0) return 'none';

    return headingElements.map((headingElement) => {
      if (!ChatNavTocService.isVisibleHeading(headingElement)) return '';

      const level = ChatNavTocService.parseHeadingLevel(headingElement);
      const text = ChatNavTocService.normalizeHeadingText(
        headingElement.textContent || headingElement.innerText || ''
      );
      if (!level || !text) return '';
      return `${level}:${ChatNavTocService.hashText(text)}`;
    }).filter(Boolean).join(',');
  }

  static hashText(value) {
    const input = String(value || '');
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16);
  }

  static getTurnContentService() {
    const candidate = (typeof window !== 'undefined' && window.ChatNavTurnContentService)
      || (typeof globalThis !== 'undefined' && globalThis.ChatNavTurnContentService);
    return candidate && typeof candidate.buildAssistantMarkdown === 'function' ? candidate : null;
  }
}

window.ChatNavTocService = ChatNavTocService;
