(function() {
  console.log("Chat Navigator: Content script started.");

  const adapters = [
    new window.ChatGPTAdapter()
    // Future: new window.GeminiAdapter(),
    // Future: new window.DoubaoAdapter()
  ];

  let activeAdapter = null;

  function init() {
    // specific check for chatgpt
    if (window.location.hostname.includes('chatgpt.com')) {
      // It is chatgpt, let's look for the adapter
      activeAdapter = adapters.find(a => a.domain === 'chatgpt.com');
    } else {
       // Generic check
       activeAdapter = adapters.find(adapter => adapter.isCompatible());
    }

    if (activeAdapter) {
      console.log(`Chat Navigator: Activated ${activeAdapter.constructor.name}`);
      
      // Temporary Verification for Phase 2:
      // Check for messages every 3 seconds and log them
      setInterval(() => {
          const msgs = activeAdapter.getUserMessages();
          console.log(`[ChatNav Debug] Found ${msgs.length} user messages:`, msgs.map(m => m.text.substring(0, 20) + '...'));
      }, 3000);

      // Start observing (Phase 2 requirement)
      activeAdapter.observeMutations(() => {
          console.log("[ChatNav Debug] DOM changed, ready to update UI.");
      });

    } else {
      console.log("Chat Navigator: No compatible adapter found for this site.");
    }
  }

  // Wait for page to be reasonably loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();