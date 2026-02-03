(function() {
  console.log("Chat Navigator: Content script started.");

  const adapters = [
    new window.ChatGPTAdapter(),
    new window.DoubaoAdapter()
  ];

  let activeAdapter = null;
  let ui = null;

  function init() {
    activeAdapter = adapters.find(adapter => adapter.isCompatible());

    if (activeAdapter) {
      console.log(`Chat Navigator: Activated ${activeAdapter.constructor.name}`);
      
      // Initialize UI
      ui = new window.SidebarUI(activeAdapter);
      ui.mount();

      // Listen for toggle commands from the extension icon
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "TOGGLE_SIDEBAR" && ui) {
          ui.toggleVisibility();
        }
      });

    } else {
      console.log("Chat Navigator: No compatible adapter found for this site.");
    }
  }

  // Use a more robust check for single-page app (SPA) navigation
  // ChatGPT might change URLs without a full reload
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log("Chat Navigator: URL changed, re-initializing...");
      if (ui && ui.container) {
          ui.container.remove();
      }
      init();
    }
  }).observe(document, {subtree: true, childList: true});

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
