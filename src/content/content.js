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
      // In Phase 3, we will pass this adapter to the UI Manager
      // const ui = new SidebarUI(activeAdapter);
      // ui.mount();
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