/**
 * Adapter specifically for ChatGPT.
 * Uses confirmed selector: [data-message-author-role="user"]
 */
class ChatGPTAdapter extends BaseAdapter {
  constructor() {
    super();
    this.observer = null;
    this.debounceTimer = null;
  }

  get domain() {
    return "chatgpt.com";
  }

  getScrollContainer() {
    const scrollableDiv = document.querySelector('div[class*="overflow-y-auto"]');
    return scrollableDiv || document.documentElement;
  }

  /**
   * Extracts user messages.
   * Truncates text for navigation preview.
   */
  getUserMessages() {
    const messages = [];
    const userElements = document.querySelectorAll('[data-message-author-role="user"]');

    userElements.forEach((el, index) => {
      if (!el.id) {
        el.id = `chat-nav-user-msg-${index}`;
      }

      // Extract and clean text
      let text = el.innerText || "";
      text = text.trim().replace(/\n+/g, " ");

      if (text) {
        messages.push({
          id: el.id,
          text: text, // Raw text for now, UI will handle truncation
          element: el
        });
      }
    });

    return messages;
  }

  getAssistantMessages() {
    const messages = [];
    const assistantElements = document.querySelectorAll('[data-message-author-role="assistant"]');

    assistantElements.forEach((el, index) => {
      if (!el.id) {
        el.id = `chat-nav-assistant-msg-${index}`;
      }

      const contentEl = el.querySelector('.markdown, [data-message-content], [class*="prose"]') || el;
      let text = contentEl.innerText || "";
      text = text.trim().replace(/\n+/g, " ");

      if (text) {
        messages.push({
          id: el.id,
          text,
          html: contentEl.innerHTML || '',
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

window.ChatGPTAdapter = ChatGPTAdapter;
