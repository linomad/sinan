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
        // This is risky, so we stick to 1 & 2 for now. 
        // If 1 & 2 fail, we might return empty and log a warning.
        console.warn("GeminiAdapter: No user messages found with standard selectors.");
    }

    userElements.forEach((el, index) => {
      // Gemini usually puts the text in a <p> or within the element text
      // We need to be careful not to grab the "Edit" button text
      
      if (!el.id) {
        // Use a stable ID if possible? Gemini might not have one easily accessible on the query wrapper.
        // We'll use index for now, but if we find a unique ID (like data-id), use it.
        el.id = `chat-nav-user-msg-${index}`;
      }

      // Extract text
      // Often in: .query-text or just the text content excluding buttons
      let text = "";
      const textContainer = el.querySelector('.query-text') || el.querySelector('p');
      
      if (textContainer) {
          text = textContainer.innerText;
      } else {
          // Fallback: Clone and remove known junk (buttons)
          const clone = el.cloneNode(true);
          const junk = clone.querySelectorAll('button, mat-icon');
          junk.forEach(j => j.remove());
          text = clone.innerText;
      }

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
        this.debounceTimer = setTimeout(callback, 1000); // 1s debounce for Gemini (slower animation)
    });

    this.observer.observe(document.body, { 
        childList: true, 
        subtree: true 
    });
  }
}

window.GeminiAdapter = GeminiAdapter;
