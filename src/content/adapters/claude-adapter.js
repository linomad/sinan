/**
 * Adapter specifically for Claude (claude.ai).
 */
class ClaudeAdapter extends BaseAdapter {
  constructor() {
    super();
    this.observer = null;
    this.debounceTimer = null;
  }

  get domain() {
    return "claude.ai";
  }

  getScrollContainer() {
    const primary = document.querySelector('div.overflow-y-scroll.overflow-x-hidden.pt-6.flex-1');
    if (primary) return primary;

    const fallback = document.querySelector('div.overflow-y-scroll');
    return fallback || document.documentElement;
  }

  getUserMessages() {
    const messages = [];
    const userElements = document.querySelectorAll('[data-testid="user-message"]');

    userElements.forEach((el, index) => {
      if (!el.id) {
        el.id = `chat-nav-claude-user-${index}`;
      }

      let text = el.innerText || "";
      text = text.replace(/\s+/g, " ").trim();

      if (!text) return;

      messages.push({
        id: el.id,
        text,
        element: el
      });
    });

    return messages;
  }

  getAssistantMessages() {
    const messages = [];
    const assistantElements = document.querySelectorAll('div.font-claude-response');

    assistantElements.forEach((el, index) => {
      if (!el.id) {
        el.id = `chat-nav-claude-assistant-${index}`;
      }

      const payload = this.extractMessagePayload(el, [
        '.standard-markdown',
        '.progressive-markdown',
        '.font-claude-response-body'
      ]);

      if (!payload.text) return;

      messages.push({
        id: el.id,
        text: payload.text,
        html: payload.html,
        element: el
      });
    });

    return messages;
  }

  extractMessagePayload(element, preferredSelectors = []) {
    for (const selector of preferredSelectors) {
      if (!element || typeof element.querySelector !== 'function') break;
      const node = element.querySelector(selector);
      if (!node) continue;

      const payload = this.extractVisiblePayload(node);
      if (payload.text) return payload;
    }

    return this.extractVisiblePayload(element);
  }

  extractVisiblePayload(node) {
    if (!node) {
      return { text: '', html: '' };
    }

    const text = String(node.innerText || node.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      text,
      html: node.innerHTML || ''
    };
  }

  observeMutations(callback) {
    if (this.observer) this.observer.disconnect();

    this.observer = new MutationObserver(() => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(callback, 800);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return this.observer;
  }
}

window.ClaudeAdapter = ClaudeAdapter;
