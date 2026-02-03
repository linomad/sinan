/**
 * Adapter specifically for Doubao (doubao.com).
 */
class DoubaoAdapter extends BaseAdapter {
  constructor() {
    super();
    this.observer = null;
    this.debounceTimer = null;
    console.log("DoubaoAdapter initialized");
  }

  get domain() {
    return "doubao.com";
  }

  getScrollContainer() {
    // Priority 1: The container explicitly marked as scroll view or message list
    const candidates = [
        '[data-testid="scroll_view"]',
        '[data-testid="message-list"]',
        '.scroll-view',
        '.scrollable'
    ];

    for (const selector of candidates) {
        const el = document.querySelector(selector);
        if (el) return el;
    }
    
    // Priority 2: Generic scrollable div check
    const scrollableDiv = document.querySelector('div[class*="overflow-y-auto"], div[class*="scroll"]');
    if (scrollableDiv && scrollableDiv.scrollHeight > window.innerHeight) {
        return scrollableDiv;
    }

    return document.documentElement;
  }

  getUserMessages() {
    const messages = [];
    // User provided selector
    const userElements = document.querySelectorAll('[data-testid="send_message"]');

    userElements.forEach((el, index) => {
      if (!el.id) {
        el.id = `chat-nav-user-msg-${index}`;
      }

      // Try to find the specific text content div for cleaner extraction
      const textEl = el.querySelector('[data-testid="message_text_content"]');
      
      let text = textEl ? textEl.innerText : el.innerText;
      text = (text || "").trim().replace(/\n+/g, " ");

      if (text) {
        messages.push({
          id: el.id,
          text: text,
          element: el
        });
      }
    });

    return messages;
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
  }
}

window.DoubaoAdapter = DoubaoAdapter;
