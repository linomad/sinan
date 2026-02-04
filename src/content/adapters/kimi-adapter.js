/**
 * Adapter specifically for Kimi (Moonshot AI).
 * URL: https://www.kimi.com
 */
class KimiAdapter extends BaseAdapter {
  constructor() {
    super();
    this.observer = null;
    this.debounceTimer = null;
  }

  get domain() {
    return "kimi.com";
  }

  isCompatible() {
    return window.location.hostname.includes("kimi.com") || window.location.hostname.includes("kimi.moonshot.cn");
  }

  getScrollContainer() {
    // Based on the HTML structure provided, the chat container seems to be #chat-container or .chat-content-container
    // We'll try to find the scrollable area.
    return document.querySelector('#chat-container') || document.documentElement;
  }

  /**
   * Extracts user messages.
   */
  getUserMessages() {
    const messages = [];
    const userElements = document.querySelectorAll('.chat-content-item-user');

    userElements.forEach((el, index) => {
      if (!el.id) {
        el.id = `chat-nav-user-msg-${index}`;
      }

      // The text content is inside .user-content based on the provided HTML
      const contentEl = el.querySelector('.user-content');
      let text = contentEl ? contentEl.innerText : "";
      text = text.trim().replace(/\n+/g, " ");

      if (text) {
        messages.push({
          id: el.id,
          text: text, // Raw text, UI will handle truncation
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

    // Observe changes in the chat list or body
    const target = document.querySelector('#chat-container') || document.body;
    this.observer.observe(target, { 
        childList: true, 
        subtree: true 
    });
  }
}

window.KimiAdapter = KimiAdapter;
