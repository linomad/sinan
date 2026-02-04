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
    // User provided selector: "group/query"
    // Since "/" is a special character in CSS selectors, we use attribute selector for safety
    // or exact class match if we are sure.
    // The class is likely part of a list, e.g. "relative group/query ..."
    const userElements = document.querySelectorAll('[class*="group/query"]');

    userElements.forEach((el, index) => {
      if (!el.id) {
        el.id = `chat-nav-user-msg-${index}`;
      }

      // Extract text. 
      // Perplexity queries are usually concise.
      let text = el.innerText || "";
      text = text.trim().replace(/\n+/g, " ");

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

window.PerplexityAdapter = PerplexityAdapter;
