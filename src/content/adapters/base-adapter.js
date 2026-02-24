/**
 * Base class for all chat adapters.
 * Interface ensuring all site adapters behave consistently.
 */
class BaseAdapter {
  constructor() {
    if (this.constructor === BaseAdapter) {
      throw new Error("Abstract classes can't be instantiated.");
    }
  }

  /**
   * Returns the domain/hostname this adapter supports.
   * @returns {string} e.g., "chatgpt.com"
   */
  get domain() {
    throw new Error("Method 'domain' must be implemented.");
  }

  /**
   * Checks if the current page is compatible with this adapter.
   * @returns {boolean}
   */
  isCompatible() {
    return window.location.hostname.includes(this.domain);
  }

  /**
   * Finds and returns the scrollable container element.
   * @returns {HTMLElement}
   */
  getScrollContainer() {
    return document.documentElement; // Default to window/body
  }

  /**
   * Extracts user messages from the DOM.
   * @returns {Array<{id: string, text: string, element: HTMLElement}>}
   */
  getUserMessages() {
    throw new Error("Method 'getUserMessages' must be implemented.");
  }

  /**
   * Extracts assistant messages from the DOM.
   * @returns {Array<{id: string, text: string, element: HTMLElement}>}
   */
  getAssistantMessages() {
    return [];
  }

  /**
   * Returns conversation turns where each user message is paired with
   * assistant message(s) until the next user message appears.
   * @returns {Array<{id: string, user: Object, assistant: Object|null, assistantSegments: Array<Object>, assistantText: string}>}
   */
  getConversationTurns() {
    const userMessages = this.getUserMessages();
    const assistantMessages = this.getAssistantMessages();
    return BaseAdapter.pairMessagesByOrder(userMessages, assistantMessages);
  }

  /**
   * Sets up an observer to detect new messages.
   * @param {Function} callback - Called when DOM changes
   */
  observeMutations(callback) {
    // Default implementation (optional override)
    const observer = new MutationObserver((mutations) => {
      callback(mutations);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }

  /**
   * Scrolls the element into view.
   * Adapters can override this to handle specific scrolling quirks (e.g. fixed headers, virtual scrolling).
   * @param {HTMLElement} element 
   */
  scrollToElement(element) {
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Pairs user and assistant messages in timeline order.
   * Prefers DOM order comparison and falls back to index pairing when
   * ordering information is not available.
   * @param {Array<Object>} userMessages
   * @param {Array<Object>} assistantMessages
   * @returns {Array<{id: string, user: Object, assistant: Object|null, assistantSegments: Array<Object>, assistantText: string}>}
   */
  static pairMessagesByOrder(userMessages, assistantMessages) {
    const users = Array.isArray(userMessages) ? userMessages.filter(Boolean) : [];
    const assistants = Array.isArray(assistantMessages) ? assistantMessages.filter(Boolean) : [];

    if (users.length === 0) return [];

    if (!BaseAdapter.canUseOrderPairing(users, assistants)) {
      return users.map((user, index) => {
        const assistant = assistants[index];
        const segments = assistant ? [assistant] : [];
        return BaseAdapter.buildTurn(user, segments);
      });
    }

    const turns = [];
    let assistantCursor = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const nextUser = users[i + 1] || null;
      const segments = [];

      while (assistantCursor < assistants.length) {
        const candidate = assistants[assistantCursor];

        // Skip assistant nodes that appear before the current user turn.
        if (!BaseAdapter.isMessageBefore(user, candidate)) {
          assistantCursor += 1;
          continue;
        }

        // Once we reach the next user message, this turn is complete.
        if (nextUser && !BaseAdapter.isMessageBefore(candidate, nextUser)) {
          break;
        }

        segments.push(candidate);
        assistantCursor += 1;
      }

      turns.push(BaseAdapter.buildTurn(user, segments));
    }

    return turns;
  }

  static buildTurn(userMessage, assistantSegments) {
    const user = BaseAdapter.normalizeMessage(userMessage);
    const segments = (assistantSegments || []).map(BaseAdapter.normalizeMessage);
    const assistantText = segments
      .map(segment => segment.text)
      .filter(Boolean)
      .join('\n\n');

    return {
      id: user.id,
      user,
      assistant: segments[0] || null,
      assistantSegments: segments,
      assistantText
    };
  }

  static normalizeMessage(message) {
    if (!message) return { id: '', text: '', element: null };
    return {
      ...message,
      text: BaseAdapter.normalizeText(message.text)
    };
  }

  static normalizeText(text) {
    return (text || '').trim().replace(/\n+/g, '\n');
  }

  static canUseOrderPairing(users, assistants) {
    if (assistants.length === 0) return true;
    return users.every(BaseAdapter.hasComparableAnchor) && assistants.every(BaseAdapter.hasComparableAnchor);
  }

  static hasComparableAnchor(message) {
    if (!message) return false;
    if (typeof message.order === 'number') return true;
    return !!(message.element && typeof message.element.compareDocumentPosition === 'function');
  }

  static isMessageBefore(left, right) {
    if (!left || !right) return false;

    if (typeof left.order === 'number' && typeof right.order === 'number') {
      return left.order < right.order;
    }

    if (!left.element || !right.element || typeof left.element.compareDocumentPosition !== 'function') {
      return false;
    }

    const nodeType = typeof Node !== 'undefined'
      ? Node
      : (typeof window !== 'undefined' ? window.Node : null);
    const followingMask = nodeType ? nodeType.DOCUMENT_POSITION_FOLLOWING : 4;
    return !!(left.element.compareDocumentPosition(right.element) & followingMask);
  }
}

// Make it available globally so other scripts can extend it
window.BaseAdapter = BaseAdapter;
