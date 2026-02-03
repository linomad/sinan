console.log("Background service worker loaded.");

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Send a message to the content script in the active tab
    chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_SIDEBAR" }).catch((err) => {
      console.warn("Could not send message to tab (maybe content script not loaded?):", err);
    });
  }
});