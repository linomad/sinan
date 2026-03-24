/**
 * Adapter specifically for DeepSeek (chat.deepseek.com).
 */
class DeepSeekAdapter extends BaseAdapter {
  constructor() {
    super();
    this.observer = null;
    this.debounceTimer = null;
  }

  get domain() {
    return 'chat.deepseek.com';
  }

  isCompatible() {
    if (!super.isCompatible()) return false;

    const pathname = window.location && typeof window.location.pathname === 'string'
      ? window.location.pathname
      : '';

    if (BaseAdapter.isPathPrefixMatch(pathname, '/a/chat')) return true;
    if (BaseAdapter.isPathPrefixMatch(pathname, '/chat')) return true;

    // Fallback for root route chats when DeepSeek keeps conversation UI on '/'.
    return !!document.querySelector('.ds-virtual-list--printable')
      || !!document.querySelector('textarea[placeholder*="DeepSeek"]');
  }

  getScrollContainer() {
    const printableList = document.querySelector('.ds-virtual-list.ds-virtual-list--printable')
      || document.querySelector('.ds-virtual-list--printable')
      || document.querySelector('.ds-virtual-list');

    if (printableList && typeof printableList.closest === 'function') {
      const scrollArea = printableList.closest('.ds-scroll-area');
      if (scrollArea) return scrollArea;
    }

    return printableList || document.documentElement;
  }

  getUserMessages() {
    const messages = [];
    const elements = this.getConversationMessageElements();

    elements.forEach((element, index) => {
      if (this.isAssistantMessageElement(element)) return;

      const payload = this.extractMessagePayload(element);
      if (!payload.text) return;

      const key = this.getMessageKey(element, index);
      const navId = `chat-nav-deepseek-user-${key}`;

      if (element.id !== navId) {
        element.id = navId;
      }

      messages.push({
        id: navId,
        text: payload.text,
        element,
        order: index
      });
    });

    return messages;
  }

  getAssistantMessages() {
    const messages = [];
    const elements = this.getConversationMessageElements();

    elements.forEach((element, index) => {
      if (!this.isAssistantMessageElement(element)) return;

      const payload = this.extractMessagePayload(element);
      if (!payload.text) return;

      const key = this.getMessageKey(element, index);
      const navId = `chat-nav-deepseek-assistant-${key}`;

      if (element.id !== navId) {
        element.id = navId;
      }

      messages.push({
        id: navId,
        text: payload.text,
        html: payload.html,
        element,
        order: index
      });
    });

    return messages;
  }

  getConversationMessageElements() {
    const itemSelectors = [
      '.ds-virtual-list--printable [data-virtual-list-item-key]',
      '[data-virtual-list-item-key]'
    ];

    for (const selector of itemSelectors) {
      const items = Array.from(document.querySelectorAll(selector));
      if (items.length === 0) continue;

      const messageElements = items
        .map(item => this.getPrimaryMessageElement(item))
        .filter(Boolean);

      if (messageElements.length > 0) {
        return messageElements;
      }
    }

    return [];
  }

  getPrimaryMessageElement(item) {
    if (!item) return null;

    const children = item.children ? Array.from(item.children) : [];
    for (const child of children) {
      if (!child) continue;

      if (child.classList && child.classList.contains('ds-message')) {
        return child;
      }

      if (typeof child.className === 'string' && child.className.includes('ds-message')) {
        return child;
      }
    }

    if (typeof item.querySelector === 'function') {
      return item.querySelector('.ds-message');
    }

    return null;
  }

  isAssistantMessageElement(element) {
    return !!(element
      && typeof element.querySelector === 'function'
      && element.querySelector('.ds-markdown'));
  }

  extractMessagePayload(element) {
    if (!element) {
      return { text: '', html: '' };
    }

    const markdownNode = typeof element.querySelector === 'function'
      ? element.querySelector('.ds-markdown')
      : null;

    if (markdownNode) {
      return this.extractVisiblePayload(markdownNode);
    }

    const primaryNode = element.firstElementChild || element;
    return this.extractVisiblePayload(primaryNode);
  }

  extractVisiblePayload(node) {
    if (!node) {
      return { text: '', html: '' };
    }

    return {
      text: this.normalizeMessageText(node.innerText || node.textContent || ''),
      html: node.innerHTML || ''
    };
  }

  normalizeMessageText(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getMessageKey(element, fallbackIndex) {
    const item = element && typeof element.closest === 'function'
      ? element.closest('[data-virtual-list-item-key]')
      : null;

    const key = item && typeof item.getAttribute === 'function'
      ? item.getAttribute('data-virtual-list-item-key')
      : null;

    return key || String(fallbackIndex);
  }

  observeMutations(callback) {
    if (this.observer) this.observer.disconnect();

    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(callback, 800);
    });

    const target = document.querySelector('.ds-virtual-list--printable') || document.body;
    this.observer.observe(target, {
      childList: true,
      subtree: true
    });

    return this.observer;
  }
}

window.DeepSeekAdapter = DeepSeekAdapter;
