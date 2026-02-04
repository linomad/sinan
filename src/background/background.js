console.log("Background service worker loaded.");

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id || !tab.url) return;

  // List of supported domains (must match manifest content_scripts matches)
  const supportedDomains = [
    'chatgpt.com',
    'gemini.google.com',
    'doubao.com',
    'chat.qwen.ai',
    'perplexity.ai'
  ];

  const isSupported = supportedDomains.some(domain => tab.url.includes(domain));

  if (isSupported) {
    chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_SIDEBAR" }).catch((err) => {
      // It's normal for this to fail if the content script isn't loaded yet 
      // or if the tab is just loading. We suppress the noise.
      console.log("Sinan: Could not toggle sidebar. Content script might not be ready.", err);
    });
  } else {
    console.log("Sinan: Current tab is not a supported AI chat interface.");
    // Optional: You could set a badge text here to indicate unsupported
    // chrome.action.setBadgeText({ tabId: tab.id, text: "OFF" });
  }
});