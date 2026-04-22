chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AI_RESPONSE_CHUNK") {
    chrome.runtime.sendMessage({
      type: "AVATAR_UPDATE",
      payload: message.payload
    }).catch(() => {});
  }

  if (message.type === "AI_RESPONSE_DONE") {
    chrome.runtime.sendMessage({
      type: "AVATAR_STOP_TALKING",
    }).catch(() => {});
  }
});
