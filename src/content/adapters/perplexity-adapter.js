/**
 * Adapter specifically for Perplexity (www.perplexity.ai).
 */
class PerplexityAdapter extends BaseAdapter {
  constructor() {
    super();
    this.observer = null;
    this.debounceTimer = null;
    console.log("PerplexityAdapter initialized");
  }

  get domain() {
    return "perplexity.ai";
  }

  getScrollContainer() {
    // Perplexity usually scrolls the main document or a specific inner wrapper.
    // Try to find the main scroll container.
    const main = document.querySelector('main');
    if (main && (main.scrollHeight > window.innerHeight || getComputedStyle(main).overflowY === 'auto')) {
        return main;
    }
    return document.documentElement;
  }

  getUserMessages() {
    const messages = [];
    const userElements = document.querySelectorAll('[class*="group/query"]');

    userElements.forEach((el) => {
      // Extract text first
      let text = el.innerText || "";
      text = text.trim().replace(/\n+/g, " ");
      
      if (!text) return;

      // Strategy: Use text content hash as stable ID.
      // Perplexity doesn't expose a stable message-id in the DOM easily.
      // Since user queries are unique in context usually, a hash of the text works well.
      const hash = window.ChatNavUtils.hashCode(text);
      const navId = `chat-nav-pplx-${hash}`;

      // Enforce this ID on the DOM element for the Scroll Spy to work
      if (el.id !== navId) {
        el.id = navId;
      }

      messages.push({
        id: navId,
        text: text,
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

    this.observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
  }
}

window.PerplexityAdapter = PerplexityAdapter;
