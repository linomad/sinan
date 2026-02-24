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

  scrollToElement(element) {
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Extracts user messages.
   */
  getUserMessages() {
    const messages = [];
    // User query selector: .agent-chat__list__item--human
    const userElements = document.querySelectorAll('.agent-chat__list__item--human');

    userElements.forEach((el) => {
      // Text content selector: .hyc-content-text
      const contentEl = el.querySelector('.hyc-content-text');
      let text = contentEl ? contentEl.innerText : "";
      text = text.trim().replace(/\n+/g, " ");

      if (!text) return;

      // Use text hash for stable ID
      const hash = window.ChatNavUtils.hashCode(text);
      const navId = `chat-nav-yuanbao-${hash}`;

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

  getAssistantMessages() {
    const messages = [];
    const assistantElements = document.querySelectorAll('.agent-chat__list__item--ai, .agent-chat__list__item--bot');

    assistantElements.forEach((el) => {
      const contentEl = el.querySelector('.hyc-content-text');
      let text = contentEl ? contentEl.innerText : "";
      text = text.trim().replace(/\n+/g, " ");
      if (!text) return;

      const hash = window.ChatNavUtils.hashCode(text);
      const navId = `chat-nav-yuanbao-assistant-${hash}`;

      if (el.id !== navId) {
        el.id = navId;
      }

      messages.push({
        id: navId,
        text,
        html: contentEl ? (contentEl.innerHTML || '') : '',
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

    const target = document.querySelector('.agent-chat__list__content') || document.body;
    this.observer.observe(target, { 
        childList: true, 
        subtree: true 
    });

    return this.observer;
  }
}

window.YuanbaoAdapter = YuanbaoAdapter;
