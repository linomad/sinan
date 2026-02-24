(function() {
  console.log("Chat Navigator: Content script started.");

  const adapters = [
    new window.ChatGPTAdapter(),
    new window.DoubaoAdapter(),
    new window.GeminiAdapter(),
    new window.QwenAdapter(),
    new window.PerplexityAdapter(),
    //new window.KimiAdapter(),
    new window.YuanbaoAdapter()
  ];

  let activeAdapter = null;
  let ui = null;

  function handleRuntimeMessage(request) {
    if (request.action === "TOGGLE_SIDEBAR" && ui) {
      ui.toggleVisibility();
    }
  }

  function init() {
    activeAdapter = adapters.find(adapter => adapter.isCompatible());

    if (activeAdapter) {
      console.log(`Chat Navigator: Activated ${activeAdapter.constructor.name}`);
      
      if (ui) {
        ui.destroy();
      }

      // Initialize UI
      ui = new window.SidebarUI(activeAdapter);
      ui.mount();

      // Register only once to avoid duplicate handlers across SPA route switches.
      const hasListener = chrome.runtime.onMessage.hasListener
        && chrome.runtime.onMessage.hasListener(handleRuntimeMessage);
      if (!hasListener) {
        chrome.runtime.onMessage.addListener(handleRuntimeMessage);
      }

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
      if (ui) {
          ui.destroy();
          ui = null;
      }
      activeAdapter = null;
      init();
    }
  }).observe(document, {subtree: true, childList: true});

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
