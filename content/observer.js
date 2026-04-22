const SITE_SELECTORS = {
  "claude.ai": {
    streamingContainer: '[data-is-streaming="true"]',
    responseContainer: '.font-claude-message',
  },
  "chatgpt.com": {
    streamingContainer: '[data-message-author-role="assistant"]',
    responseContainer: '[data-message-author-role="assistant"] .markdown',
  },
  "gemini.google.com": {
    streamingContainer: "model-response",
    responseContainer: "model-response .markdown",
  },
};

function getSiteKey() {
  const host = location.hostname;
  return Object.keys(SITE_SELECTORS).find((k) => host.includes(k));
}

function detectEmotion(text) {
  const lower = text.toLowerCase();
  if (/오류|에러|실패|불가|없|모르/.test(lower)) return "surprised";
  if (/죄송|미안|안타깝/.test(lower)) return "shy";
  if (/좋|완벽|훌륭|맞|정확|재미|신기/.test(lower)) return "happy";
  return "normal";
}

let lastText = "";
let talkingTimer = null;

function onMutation(mutations) {
  const siteKey = getSiteKey();
  if (!siteKey) return;

  const sel = SITE_SELECTORS[siteKey];
  const streamingEl = document.querySelector(sel.streamingContainer);
  if (!streamingEl) return;

  const allResponses = document.querySelectorAll(sel.responseContainer);
  if (!allResponses.length) return;

  const latest = allResponses[allResponses.length - 1];
  const text = latest?.innerText || "";

  if (text === lastText) return;
  lastText = text;

  const newChunk = text.slice(lastText.length);
  const emotion = detectEmotion(text);

  chrome.runtime.sendMessage({
    type: "AI_RESPONSE_CHUNK",
    payload: { chunk: newChunk, emotion, fullText: text },
  });

  clearTimeout(talkingTimer);
  talkingTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ type: "AI_RESPONSE_DONE" });
    lastText = "";
  }, 1200);
}

const observer = new MutationObserver(onMutation);

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});
