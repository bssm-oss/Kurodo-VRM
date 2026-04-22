import { VRMLoader } from "./vrm-loader.js";

const statusDot   = document.getElementById("status-dot");
const statusText  = document.getElementById("status-text");
const bubble      = document.getElementById("speech-bubble");
const modelInput  = document.getElementById("model-input");
const modelName   = document.getElementById("model-name");
const avatarCanvas = document.getElementById("avatar-canvas");
const vrmViewport  = document.getElementById("vrm-viewport");

// Canvas 기본 아바타 초기화 (avatar.js IIFE가 전역에 AvatarCanvas 노출)
window.AvatarCanvas.init(avatarCanvas);

// 현재 활성 아바타 레이어 ("canvas" | "vrm")
let activeAvatar = "canvas";

function useAvatarAPI(method, ...args) {
  if (activeAvatar === "vrm") {
    VRMLoader[method]?.(...args);
  } else {
    window.AvatarCanvas[method]?.(...args);
  }
}

document.querySelectorAll(".emo-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".emo-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    useAvatarAPI("setEmotion", btn.dataset.emotion);
  });
});

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
    useAvatarAPI("setEmotion", emotion);
    useAvatarAPI("startTalking");
    setStatus("talking");

    document.querySelectorAll(".emo-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.emotion === emotion);
    });

    showBubble(fullText.slice(0, 60) + (fullText.length > 60 ? "..." : ""));
  }

  if (message.type === "AVATAR_STOP_TALKING") {
    useAvatarAPI("stopTalking");
    setStatus("idle");
  }
});

modelInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  modelName.textContent = "로딩 중...";
  const url = URL.createObjectURL(file);

  try {
    await VRMLoader.load(url, vrmViewport);

    // VRM 로드 성공 → Canvas 숨기고 VRM 뷰포트 표시
    avatarCanvas.classList.add("hidden");
    vrmViewport.classList.remove("hidden");
    activeAvatar = "vrm";
    modelName.textContent = file.name;
  } catch (err) {
    console.error("VRM 로드 실패:", err);
    modelName.textContent = "로드 실패 — 다시 시도하세요";
    URL.revokeObjectURL(url);
  }
});
