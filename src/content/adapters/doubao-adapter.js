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

  get excludedPathPrefixes() {
    return ["/chat/settings"];
  }

  getScrollContainer() {
    // Priority 1: Doubao's main chat scroll container (uses flow-scrollbar + overflow-y-auto)
    // Note: Doubao removed all data-testid attributes, so we use class-based selectors
    const flowScrollbar = document.querySelector('div.flow-scrollbar[class*="overflow-y-auto"]');
    if (flowScrollbar && flowScrollbar.scrollHeight > window.innerHeight) {
        return flowScrollbar;
    }

    // Priority 2: Generic scrollable div check
    const scrollableDiv = document.querySelector('div[class*="overflow-y-auto"]');
    if (scrollableDiv && scrollableDiv.scrollHeight > window.innerHeight) {
        return scrollableDiv;
    }

    return document.documentElement;
  }

  getUserMessages() {
    const messages = [];
    // Doubao removed data-testid attributes. User messages have data-message-id
    // and their own class includes 'justify-end' (right-aligned bubbles).
    const userElements = document.querySelectorAll('[data-message-id][class*="justify-end"]');

    userElements.forEach((el, index) => {
      const stableId = el.getAttribute('data-message-id');

      // Construct a unique ID.
      // If we have a stable ID, use it (e.g. "chat-nav-uid-37123...").
      // Otherwise fallback to index (e.g. "chat-nav-idx-0").
      const navId = stableId ? `chat-nav-uid-${stableId}` : `chat-nav-idx-${index}`;

      // CRITICAL: Enforce this ID on the DOM element.
      // Because virtual lists/React might recycle elements or re-render them,
      // we must ensure the DOM node has the ID we expect every time we parse it.
      if (el.id !== navId) {
        el.id = navId;
      }

      let text = (el.innerText || "").trim().replace(/\n+/g, " ");

      if (text) {
        messages.push({
          id: navId,
          text: text,
          element: el
        });
      }
    });

    return messages;
  }

  getAssistantMessages() {
    const messages = [];
    // Doubao removed data-testid attributes. Assistant messages have data-message-id
    // but do NOT have 'justify-end' in their class (they are left-aligned).
    const allMsgElements = document.querySelectorAll('[data-message-id]');
    const assistantElements = Array.from(allMsgElements).filter(
      el => !el.className.includes('justify-end')
    );

    assistantElements.forEach((el, index) => {
      const stableId = el.getAttribute('data-message-id');
      const navId = stableId ? `chat-nav-assistant-uid-${stableId}` : `chat-nav-assistant-idx-${index}`;

      if (el.id !== navId) {
        el.id = navId;
      }

      let text = (el.innerText || "").trim().replace(/\n+/g, " ");

      if (text) {
        messages.push({
          id: navId,
          text,
          html: el.innerHTML || '',
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

    return this.observer;
  }
}

window.DoubaoAdapter = DoubaoAdapter;
