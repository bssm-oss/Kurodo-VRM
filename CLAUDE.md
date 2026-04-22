---
# VRM for AI — CLAUDE.md

AI 답변 옆에 VRM 캐릭터를 붙여주는 크롬 익스텐션.
Claude Code가 이 프로젝트를 작업할 때 참고하는 문서다.
---

## 프로젝트 개요

- **타입**: Chrome Extension (Manifest V3)
- **목적**: Claude.ai / ChatGPT / Gemini 사용 시 사이드패널에 VRM 아바타를 띄워 AI 답변에 반응하게 함
- **배포 대상**: Chrome Web Store + GitHub 오픈소스 (MIT)
- **빌드 도구**: 없음 — 순수 vanilla JS, 번들러 없이 크롬에 직접 로드
- **언어**: JavaScript (ES2022+), HTML, CSS

---

## 파일 구조

```
vrm_for_ai/
├── CLAUDE.md                        ← 이 파일
├── README.md
├── manifest.json                    ← MV3 선언, 권한, 진입점
│
├── background/
│   └── service_worker.js            ← 사이드패널 제어, 메시지 라우팅
│
├── content/
│   └── observer.js                  ← AI 사이트 DOM 감지 (MutationObserver)
│
├── sidepanel/
│   ├── index.html                   ← 사이드패널 UI
│   ├── style.css                    ← 다크 테마 스타일
│   ├── avatar.js                    ← Canvas 기본 아바타 (VRM 없을 때 fallback)
│   └── panel.js                     ← 패널 메인 로직, 메시지 수신
│
└── assets/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 아키텍처

```
[AI 사이트 페이지]
  content/observer.js
    MutationObserver로 AI 응답 텍스트 감지
    감정 키워드 분석
    chrome.runtime.sendMessage("AI_RESPONSE_CHUNK" | "AI_RESPONSE_DONE")
          │
          ▼
[background/service_worker.js]
    메시지 수신 후 사이드패널로 포워딩
    chrome.runtime.sendMessage("AVATAR_UPDATE" | "AVATAR_STOP_TALKING")
          │
          ▼
[sidepanel/panel.js]
    메시지 수신
    AvatarCanvas.setEmotion() / startTalking() / stopTalking() 호출
    말풍선 텍스트 업데이트
          │
          ▼
[sidepanel/avatar.js — AvatarCanvas]
    Canvas 2D 렌더링 루프 (requestAnimationFrame)
    표정 파라미터, 립싱크, 눈 깜빡임, 고개 움직임
```

### 메시지 타입 정의

| 타입                  | 방향                   | payload                        |
| --------------------- | ---------------------- | ------------------------------ |
| `AI_RESPONSE_CHUNK`   | content → background   | `{ chunk, emotion, fullText }` |
| `AI_RESPONSE_DONE`    | content → background   | 없음                           |
| `AVATAR_UPDATE`       | background → sidepanel | `{ chunk, emotion, fullText }` |
| `AVATAR_STOP_TALKING` | background → sidepanel | 없음                           |

---

## 각 파일 역할 및 수정 가이드

### `manifest.json`

- 권한 추가 시 여기서 `permissions` / `host_permissions` 수정
- 새 AI 사이트 지원 추가 시 `host_permissions`와 `content_scripts.matches`에 URL 패턴 추가

### `content/observer.js`

- `SITE_SELECTORS` 객체에 사이트별 CSS 셀렉터 정의
- AI 사이트가 DOM 구조를 바꾸면 이 셀렉터를 업데이트해야 함
- `detectEmotion(text)` 함수에서 감정 키워드 추가/수정
- 새 사이트 추가 방법:

  ```js
  SITE_SELECTORS["newsite.com"] = {
    streamingContainer: "...", // 스트리밍 중임을 나타내는 요소
    responseContainer: "...", // 실제 텍스트가 담긴 요소
  };
  ```

  - `manifest.json`의 `host_permissions`, `content_scripts.matches`에도 추가

### `background/service_worker.js`

- 메시지 라우팅만 담당, 로직 최소화 유지
- 새 메시지 타입 추가 시 여기에 핸들러 추가

### `sidepanel/avatar.js`

- `AvatarCanvas` 모듈 (IIFE 패턴)
- 공개 API: `init(canvasEl)`, `setEmotion(emotion)`, `startTalking()`, `stopTalking()`
- 감정 파라미터는 `EMOTIONS` 객체에서 수정:
  ```js
  const EMOTIONS = {
    normal: { eyebrow: 0, cheek: 0, eyeSquint: 0, smile: 0 },
    happy: { eyebrow: -3, cheek: 0.7, eyeSquint: 0.2, smile: 3 },
    surprised: { eyebrow: 6, cheek: 0, eyeSquint: 0, smile: 0 },
    shy: { eyebrow: -2, cheek: 0.9, eyeSquint: 0.15, smile: 2 },
  };
  ```
- VRM 로더 추가 시 이 파일에 `VRMLoader` 모듈을 병행 구현하고 `init()`에서 분기 처리

### `sidepanel/panel.js`

- UI 이벤트 바인딩과 메시지 수신 담당
- TTS 추가 시 `chrome.runtime.onMessage` 핸들러 안에 TTS 호출 추가
- VRM 파일 로드 로직의 TODO 주석 위치에 구현

### `sidepanel/style.css`

- CSS 변수로 테마 관리, 변수는 `:root`에 정의
- 다크 테마 고정 (라이트 테마 추가 시 `prefers-color-scheme` 미디어쿼리 사용)

---

## 로드맵 (우선순위 순)

### Phase 1 — VRM 모델 로드 (다음 작업)

`sidepanel/vrm-loader.js` 추가:

- `three` + `@pixiv/three-vrm` CDN 로드 (사이드패널은 일반 웹페이지이므로 script 태그로 로드 가능)
- `panel.js`의 `modelInput` 이벤트에서 VRM 파일 URL 생성 후 로더 호출
- Canvas 아바타와 병행: VRM 로드 성공 시 Canvas 숨기고 Three.js renderer 표시
- VRM 블렌드쉐이프로 표정 제어:
  - `happy` → `HAPPY` 블렌드쉐이프
  - `surprised` → `SURPRISED`
  - `shy` → `RELAXED` (또는 커스텀)
  - 립싱크 → `A`, `I`, `U`, `E`, `O` 블렌드쉐이프를 Web Audio API 음량으로 구동

### Phase 2 — TTS 연동

`sidepanel/tts.js` 추가:

- Step 1: `window.speechSynthesis` (Web Speech API) — 무료, 바로 됨
- Step 2: ElevenLabs API — `sidepanel/index.html`에 API 키 입력 UI 추가, `chrome.storage.local`에 저장
- TTS 재생 중 Web Audio API `AnalyserNode`로 음량 추출 → 립싱크에 연결

### Phase 3 — 설정 UI

- `sidepanel/settings.js` + 설정 패널 토글
- 모델 파일 `chrome.storage.local`에 blob 저장 (재시작 후에도 유지)
- TTS 제공자 선택 (Off / Web Speech / ElevenLabs)
- 감정 감지 언어 설정 (한국어 / 영어 / 일본어)

### Phase 4 — 배포 준비

- `assets/` 아이콘 파일 제작 (16×16, 48×48, 128×128 PNG)
- Chrome Web Store 심사용 privacy policy 작성
- GitHub Actions로 ZIP 자동 패키징

---

## 개발 시 주의사항

### Chrome Extension MV3 제약

- `service_worker.js`는 이벤트 없을 때 자동 종료됨 → 상태를 service worker에 저장하지 말 것, `chrome.storage`에 저장할 것
- `content_scripts`에서는 `fetch`로 외부 API 직접 호출 불가 → background를 경유하거나 사이드패널에서 호출
- CSP 때문에 `eval`, `new Function()` 사용 불가
- 사이드패널은 일반 웹페이지처럼 동작 — `chrome.*` API 전부 사용 가능

### Three.js + VRM CDN 로드

사이드패널에서 스크립트 로드:

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@2/lib/three-vrm.js"></script>
```

번들러 없이 UMD 글로벌 `THREE`, `THREE_VRM` 사용

### DOM 셀렉터 깨짐 대응

AI 사이트들은 DOM 구조를 자주 바꿈. `observer.js`의 셀렉터가 작동 안 할 때:

1. 해당 사이트에서 개발자 도구 열기
2. AI 답변 텍스트 요소 우클릭 → "검사"
3. 고유한 클래스나 data 속성 찾아서 `SITE_SELECTORS` 업데이트

### 테스트 방법

번들러가 없으므로 직접 로드 테스트:

1. `chrome://extensions` → 개발자 모드 ON
2. "압축 해제된 확장 프로그램 로드" → `vrm_for_ai/` 폴더 선택
3. 수정 후 `chrome://extensions`에서 새로고침 버튼 클릭
4. 사이드패널: F12로 개발자 도구 열기 가능 (별도 DevTools 창)
5. content script 디버깅: 해당 AI 사이트 페이지의 DevTools → Sources → Content Scripts

---

## 코드 컨벤션

- **들여쓰기**: 스페이스 2칸
- **따옴표**: 큰따옴표(`"`)
- **세미콜론**: 항상 붙임
- **모듈 패턴**: IIFE (`(() => { ... })()`) — 번들러 없으므로 전역 오염 방지
- **주석**: 한국어로 작성
- **TODO 형식**: `// TODO: 설명` — 미구현 기능 위치 표시

---

## 자주 쓰는 커맨드

```bash
# 익스텐션 ZIP 패키징 (배포용)
zip -r vrm_for_ai.zip vrm_for_ai/ --exclude "*.DS_Store" --exclude "*/.git/*"

# 파일 구조 확인
find vrm_for_ai/ -type f | sort
```
