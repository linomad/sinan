/**
 * Adapter specifically for Yuanbao (Tencent).
 * URL: https://yuanbao.tencent.com/
 */
class YuanbaoAdapter extends BaseAdapter {
  constructor() {
    super();
    this.observer = null;
    this.debounceTimer = null;
  }

  get domain() {
    return "yuanbao.tencent.com";
  }

  getScrollContainer() {
    return document.querySelector('.agent-chat__list__content') || document.documentElement;
  }

  /**
   * Extracts user messages.
   */
  getUserMessages() {
    const messages = [];
    // User query selector: .agent-chat__list__item--human
    const userElements = document.querySelectorAll('.agent-chat__list__item--human');

    userElements.forEach((el, index) => {
      if (!el.id) {
        el.id = `chat-nav-user-msg-${index}`;
      }

      // Text content selector: .hyc-content-text
      const contentEl = el.querySelector('.hyc-content-text');
      let text = contentEl ? contentEl.innerText : "";
      
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

    const target = document.querySelector('.agent-chat__list__content') || document.body;
    this.observer.observe(target, { 
        childList: true, 
        subtree: true 
    });
  }
}

window.YuanbaoAdapter = YuanbaoAdapter;
