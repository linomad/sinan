/**
 * Adapter specifically for ChatGPT.
 */
class ChatGPTAdapter extends BaseAdapter {
  constructor() {
    super();
    console.log("ChatGPTAdapter initialized");
  }

  get domain() {
    return "chatgpt.com";
  }

  getScrollContainer() {
    // ChatGPT usually scrolls a specific internal div, not the whole body.
    // We will refine this in Phase 2. For now, try to find the main scroll area.
    // Often it's 'main' or a div with overflow-y-auto.
    const potentialScrolls = document.querySelectorAll('[class*="overflow-y-auto"]');
    if (potentialScrolls.length > 0) {
      // Heuristic: The largest scrollable area is usually the chat
      return potentialScrolls[potentialScrolls.length - 1]; 
    }
    return document.documentElement;
  }

  getUserMessages() {
    // Placeholder for Phase 2
    console.log("ChatGPTAdapter: Fetching messages (mock)");
    return [];
  }
}

window.ChatGPTAdapter = ChatGPTAdapter;
