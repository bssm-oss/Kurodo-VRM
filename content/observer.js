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
  const t = text.toLowerCase();

  // 기쁨 / 긍정
  if (/좋아|좋은|완벽|훌륭|맞아|정확|재미|신기|대단|축하|잘했|훈훈|사랑|행복|기쁘|즐거|최고|짱/.test(t)) return "happy";
  if (/great|perfect|excellent|awesome|wonderful|amazing|love|happy|joy|congrat|well done|good job|correct|right/.test(t)) return "happy";

  // 놀람 / 오류 / 부정
  if (/오류|에러|실패|불가|없어|모르|이상|안돼|불행|슬프|어렵|힘들|문제|걱정/.test(t)) return "surprised";
  if (/error|fail|issue|problem|sorry|unfortunately|unable|cannot|can't|don't know|unsure|strange|weird/.test(t)) return "surprised";

  // 수줍음 / 사과 / 조심스러움
  if (/죄송|미안|안타깝|조심|혹시|실은|사실|그런데|아마/.test(t)) return "shy";
  if (/sorry|excuse|pardon|perhaps|maybe|actually|by the way|however|though/.test(t)) return "shy";

  return "normal";
}

let lastText = "";
let talkingTimer = null;
const siteKey = getSiteKey();

function onMutation() {
  if (!siteKey) return;

  const sel = SITE_SELECTORS[siteKey];

  // streamingContainer가 있으면 스트리밍 중일 때만 처리, 없으면 항상 처리
  const isStreaming = !sel.streamingContainer || !!document.querySelector(sel.streamingContainer);
  if (!isStreaming) return;

  const allResponses = document.querySelectorAll(sel.responseContainer);
  if (!allResponses.length) return;

  const latest = allResponses[allResponses.length - 1];
  const text = latest?.innerText?.trim() || "";
  if (!text || text === lastText) return;

  const prevText = lastText;
  lastText = text;

  const chunk = text.slice(prevText.length);
  const emotion = detectEmotion(text);

  chrome.runtime.sendMessage({
    type: "AI_RESPONSE_CHUNK",
    payload: { chunk, emotion, fullText: text },
  });

  clearTimeout(talkingTimer);
  talkingTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ type: "AI_RESPONSE_DONE" });
    lastText = "";
  }, 1200);
}

if (siteKey) {
  new MutationObserver(onMutation).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
