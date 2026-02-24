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
    // .layout-content-main seems to be the scrollable area based on structure
    return document.querySelector('.layout-content-main') || document.querySelector('#chat-container') || document.documentElement;
  }

  scrollToElement(element) {
    if (!element) return;
    // Kimi seems to have issues with smooth scrolling or finding the target sometimes.
    // We try 'center' block alignment.
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Extracts user messages.
   */
  getUserMessages() {
    const messages = [];
    const userElements = document.querySelectorAll('.chat-content-item-user');

    userElements.forEach((el) => {
      // The text content is inside .user-content based on the provided HTML
      const contentEl = el.querySelector('.user-content');
      let text = contentEl ? contentEl.innerText : "";
      text = text.trim().replace(/\n+/g, " ");

      if (!text) return;

      // Use text hash for stable ID, preventing issues when DOM updates
      const hash = window.ChatNavUtils.hashCode(text);
      const navId = `chat-nav-kimi-${hash}`;

      if (el.id !== navId) {
        el.id = navId;
      }

      messages.push({
        id: navId,
        text: text, // Raw text, UI will handle truncation
        element: el
      });
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

    return this.observer;
  }
}

window.KimiAdapter = KimiAdapter;
