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
}

// Make it available globally so other scripts can extend it
window.BaseAdapter = BaseAdapter;
