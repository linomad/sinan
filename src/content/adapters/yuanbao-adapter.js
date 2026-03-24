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
      const text = this.normalizeMessageText(contentEl ? contentEl.innerText : "");

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
      const contentEl = this.getAssistantContentElement(el);
      const text = this.normalizeMessageText(contentEl ? (contentEl.innerText || contentEl.textContent || '') : '');
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
        element: contentEl || el
      });
    });

    return messages;
  }

  getAssistantContentElement(assistantElement) {
    if (!assistantElement || typeof assistantElement.querySelector !== 'function') {
      return null;
    }

    const selectors = [
      '.hyc-component-reasoner__text .hyc-common-markdown',
      '.agent-chat__speech-text--box .hyc-common-markdown',
      '.hyc-content-md .hyc-common-markdown',
      '.hyc-content-text'
    ];

    for (const selector of selectors) {
      const candidate = assistantElement.querySelector(selector);
      if (!candidate) continue;

      const text = this.normalizeMessageText(candidate.innerText || candidate.textContent || '');
      if (!text) continue;

      return candidate;
    }

    return null;
  }

  normalizeMessageText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  observeMutations(callback) {
    if (this.observer) this.observer.disconnect();
    
    this.observer = new MutationObserver(() => {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(callback, 800);
    });

    const target = document.querySelector('#chat-content')
      || document.querySelector('.agent-dialogue__content--common__content')
      || document.querySelector('.agent-chat__list__content')
      || document.body;
    this.observer.observe(target, { 
        childList: true, 
        subtree: true 
    });

    return this.observer;
  }
}

window.YuanbaoAdapter = YuanbaoAdapter;
