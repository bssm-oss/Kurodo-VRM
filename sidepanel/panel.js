import { VRMLoader } from "./vrm-loader.js";

const statusDot  = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const bubble     = document.getElementById("speech-bubble");
const modelInput = document.getElementById("model-input");
const modelName  = document.getElementById("model-name");
const noAvatar   = document.getElementById("no-avatar");
const vrmViewport = document.getElementById("vrm-viewport");

let bubbleTimer = null;

function showBubble(text) {
  bubble.textContent = text;
  bubble.classList.remove("hidden");
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.add("hidden"), 4000);
}

function setStatus(mode) {
  if (mode === "talking") {
    statusDot.classList.add("talking");
    statusText.textContent = "답변 중";
  } else {
    statusDot.classList.remove("talking");
    statusText.textContent = "대기 중";
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "AVATAR_UPDATE") {
    const { emotion, fullText } = message.payload;
    if (VRMLoader.isLoaded) {
      VRMLoader.setEmotion(emotion);
      VRMLoader.startTalking();
    }
    setStatus("talking");
    showBubble(fullText.slice(0, 60) + (fullText.length > 60 ? "..." : ""));
  }

  if (message.type === "AVATAR_STOP_TALKING") {
    if (VRMLoader.isLoaded) VRMLoader.stopTalking();
    setStatus("idle");
  }
});

document.querySelectorAll(".motion-slot").forEach((slotEl) => {
  const slot     = slotEl.dataset.slot;
  const input    = slotEl.querySelector(".motion-input");
  const filename = slotEl.querySelector(".slot-filename");

  input.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!VRMLoader.isLoaded) {
      filename.textContent = "VRM을 먼저 로드하세요";
      input.value = "";
      return;
    }

    filename.textContent = "로딩 중...";
    const url = URL.createObjectURL(file);

    try {
      await VRMLoader.loadMotion(slot, url);
      filename.textContent = file.name;
    } catch (err) {
      console.error(`모션 로드 실패 [${slot}]:`, err);
      filename.textContent = "로드 실패";
      URL.revokeObjectURL(url);
    }
  });
});

modelInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  modelName.textContent = "로딩 중...";
  const url = URL.createObjectURL(file);

  try {
    await VRMLoader.load(url, vrmViewport);
    noAvatar.classList.add("hidden");
    vrmViewport.classList.remove("hidden");
    modelName.textContent = file.name;
  } catch (err) {
    console.error("VRM 로드 실패:", err);
    modelName.textContent = "로드 실패 — 다시 시도하세요";
    URL.revokeObjectURL(url);
  }
});
