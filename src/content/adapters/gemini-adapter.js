/**
 * Adapter specifically for Google Gemini (gemini.google.com).
 */
class GeminiAdapter extends BaseAdapter {
  constructor() {
    super();
    this.observer = null;
    this.debounceTimer = null;
    console.log("GeminiAdapter initialized");
  }

  get domain() {
    return "gemini.google.com";
  }

  getScrollContainer() {
    // Gemini often uses 'main' or 'infinite-scroller'
    const scroller = document.querySelector('infinite-scroller') || document.querySelector('main');
    return scroller || document.documentElement;
  }

  getUserMessages() {
    const messages = [];
    
    // Strategy 1: Look for the specific <user-query> tag
    let userElements = document.querySelectorAll('user-query');
    
    // Strategy 2: Look for data-test-id="user-query"
    if (userElements.length === 0) {
        userElements = document.querySelectorAll('[data-test-id="user-query"]');
    }

    // Strategy 3: Heuristic based on message containers without model actions
    // (Fallback if specific tags change)
    if (userElements.length === 0) {
        // Just return empty, no need to warn as it happens on new chats
        return [];
    }

    userElements.forEach((el, index) => {
      // Gemini usually puts the text in a <p> or within the element text
      // We need to be careful not to grab the "Edit" button text
      
      if (!el.id) {
        // Use a stable ID if possible? Gemini might not have one easily accessible on the query wrapper.
        // We'll use index for now, but if we find a unique ID (like data-id), use it.
        el.id = `chat-nav-user-msg-${index}`;
      }

      const payload = this.extractMessagePayload(el, ['.query-text', 'p']);
      const text = payload.text;

      if (text) {
        messages.push({
          id: el.id,
          text: text,
          html: payload.html,
          element: el
        });
      }
    });

    return messages;
  }

  getAssistantMessages() {
    const messages = [];

    let assistantElements = document.querySelectorAll('model-response');
    if (assistantElements.length === 0) {
      assistantElements = document.querySelectorAll('[data-test-id="model-response"]');
    }

    assistantElements.forEach((el, index) => {
      if (!el.id) {
        el.id = `chat-nav-assistant-msg-${index}`;
      }

      const payload = this.extractMessagePayload(el, ['.markdown', '.response-content', 'p']);
      const text = payload.text;
      if (text) {
        messages.push({
          id: el.id,
          text,
          html: payload.html,
          element: el
        });
      }
    });

    return messages;
  }

  extractMessagePayload(element, preferredSelectors = []) {
    for (const selector of preferredSelectors) {
      const match = element.querySelector(selector);
      if (!match) continue;

      const payload = this.extractVisiblePayload(match);
      if (payload.text) {
        return payload;
      }
    }

    return this.extractVisiblePayload(element);
  }

  extractVisiblePayload(node) {
    if (!node) {
      return { text: '', html: '' };
    }

    const clone = typeof node.cloneNode === 'function' ? node.cloneNode(true) : node;
    this.removeNonContentNodes(clone);
    return {
      text: this.normalizeMessageText(clone.innerText || clone.textContent || ''),
      html: clone.innerHTML || ''
    };
  }

  removeNonContentNodes(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;

    const removableSelectors = [
      'button',
      'mat-icon',
      '[hidden]',
      '[aria-hidden="true"]',
      '.cdk-visually-hidden',
      '.visually-hidden',
      '.sr-only',
      '.screen-reader-only'
    ];

    const removableNodes = root.querySelectorAll(removableSelectors.join(','));
    removableNodes.forEach((node) => {
      if (node && typeof node.remove === 'function') {
        node.remove();
      }
    });
  }

  normalizeMessageText(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  observeMutations(callback) {
    if (this.observer) this.observer.disconnect();
    
    this.observer = new MutationObserver(() => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(callback, 1000); // 1s debounce for Gemini (slower animation)
    });

    this.observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });

    return this.observer;
  }
}

window.GeminiAdapter = GeminiAdapter;
