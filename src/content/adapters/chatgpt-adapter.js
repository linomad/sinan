/**
 * Adapter specifically for ChatGPT.
 */
class ChatGPTAdapter extends BaseAdapter {
  constructor() {
    super();
    this.observer = null;
    this.debounceTimer = null;
    console.log("ChatGPTAdapter initialized");
  }

  get domain() {
    return "chatgpt.com";
  }

  getScrollContainer() {
    // Strategy 1: Look for the specific scrollable container in ChatGPT
    // Usually it has classes like 'h-full', 'overflow-y-auto'
    const scrollableDiv = document.querySelector('div[class*="overflow-y-auto"]');
    if (scrollableDiv && scrollableDiv.scrollHeight > window.innerHeight) {
        return scrollableDiv;
    }
    
    // Strategy 2: Fallback to html/body
    return document.documentElement;
  }

  /**
   * Main logic to find user messages.
   * Returns: Array of objects { id, text, element }
   */
  getUserMessages() {
    const messages = [];
    
    // Selector strategy:
    // ChatGPT usually identifies message roles with data attributes.
    // We look for any element that claims to be a user message.
    const userElements = document.querySelectorAll('[data-message-author-role="user"]');

    userElements.forEach((el, index) => {
      // Create a unique ID for this element if it doesn't have one
      if (!el.id) {
        el.id = `chat-nav-user-msg-${index}`;
      }

      // Extract text:
      // The text is usually within a specific child div, but innerText of the whole block 
      // is a good safe default, filtered for empty strings.
      let text = el.innerText || "";
      
      // Clean up text (remove potential artifacts like "You said:" if they exist in hidden headers)
      text = text.trim();

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

  /**
   * Monitor for new messages being added to the DOM.
   * Uses debouncing to avoid performance hits during streaming responses.
   */
  observeMutations(callback) {
    if (this.observer) {
      this.observer.disconnect();
    }

    const handleMutation = (mutations) => {
        // Simple optimization: check if any added nodes are related to messages
        // or just brute-force debounce the update.
        // Given ChatGPT streams text, brute-force debounce is safer to avoid UI flickering.
        
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        
        this.debounceTimer = setTimeout(() => {
            callback();
        }, 1000); // Wait 1 second after last change (end of streaming) to update UI
    };

    this.observer = new MutationObserver(handleMutation);
    
    // We observe the body because React might replace large chunks of the tree
    this.observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        characterData: false // We don't need to trigger on every character typed during generation
    });
  }
}

window.ChatGPTAdapter = ChatGPTAdapter;