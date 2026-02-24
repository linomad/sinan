/**
 * Adapter specifically for Qwen (chat.qwen.ai).
 */
class QwenAdapter extends BaseAdapter {
  constructor() {
    super();
    this.observer = null;
    this.debounceTimer = null;
    console.log("QwenAdapter initialized");
  }

  get domain() {
    return "chat.qwen.ai";
  }

  getScrollContainer() {
    // ID from screenshot: chat-messages-scroll-container
    const scrollableDiv = document.getElementById('chat-messages-scroll-container');
    if (scrollableDiv) {
        return scrollableDiv;
    }
    
    // Fallback: search for overflow-auto
    const scrollableCandidates = document.querySelectorAll('div[class*="overflow-y-auto"], div[class*="overflow-auto"]');
    if (scrollableCandidates.length > 0) {
        return scrollableCandidates[0]; // Usually the main one
    }

    return document.documentElement;
  }

  getUserMessages() {
    const messages = [];
    // Class from screenshot: qwen-chat-message-user
    const userElements = document.querySelectorAll('.qwen-chat-message-user');

    userElements.forEach((el, index) => {
      // Qwen elements have IDs like "qwen-chat-message-user-xxxxx". Use them if available.
      if (!el.id) {
        el.id = `chat-nav-user-msg-${index}`;
      }

      // Extract text. 
      // Qwen might wrap text in specific inner divs, but innerText is a good start.
      // We should filter out any "edit" buttons if they exist in the future.
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

  getAssistantMessages() {
    const messages = [];
    const assistantElements = document.querySelectorAll(
      '.qwen-chat-message-assistant, .qwen-chat-message-bot, [class*="qwen-chat-message-assistant"]'
    );

    assistantElements.forEach((el, index) => {
      if (!el.id) {
        el.id = `chat-nav-assistant-msg-${index}`;
      }

      let text = el.innerText || "";
      text = text.trim().replace(/\n+/g, " ");

      if (text) {
        messages.push({
          id: el.id,
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

window.QwenAdapter = QwenAdapter;
