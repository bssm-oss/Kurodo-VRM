---
# Kurodo-VRM — CLAUDE.md

AI 답변 옆에 VRM 캐릭터를 붙여주는 크롬 익스텐션.
Claude Code가 이 프로젝트를 작업할 때 참고하는 문서다.
---

## 프로젝트 개요

- **타입**: Chrome Extension (Manifest V3)
- **목적**: Claude.ai / ChatGPT / Gemini 사용 시 사이드패널에 VRM 아바타를 띄워 AI 답변에 반응하게 함
- **배포 대상**: Chrome Web Store + GitHub 오픈소스 (MIT)
- **빌드 도구**: 없음 — 순수 vanilla JS, 번들러 없이 크롬에 직접 로드
- **언어**: JavaScript (ES2022+, ES Modules), HTML, CSS

---

## 파일 구조

```
vrm_for_ai/
├── CLAUDE.md                        ← 이 파일
├── README.md
├── manifest.json                    ← MV3 선언, 권한, CSP, 진입점
│
├── background/
│   └── service_worker.js            ← 사이드패널 제어, 메시지 라우팅
│
├── content/
│   └── observer.js                  ← AI 사이트 DOM 감지 (MutationObserver)
│
├── sidepanel/
│   ├── index.html                   ← 사이드패널 UI (importmap 포함)
│   ├── style.css                    ← 다크 테마 스타일
│   ├── vrm-loader.js                ← VRM 로드 + 모션 시스템 (ES Module)
│   └── panel.js                     ← 패널 메인 로직, 메시지 수신 (ES Module)
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
    VRMLoader.setEmotion() / startTalking() / stopTalking() 호출
    말풍선 텍스트 업데이트
          │
          ▼
[sidepanel/vrm-loader.js — VRMLoader]
    Three.js WebGLRenderer 렌더 루프 (requestAnimationFrame)
    VRM 모델 로드 (@pixiv/three-vrm)
    모션 슬롯 시스템:
      - 사용자 VRMA 있음 → AnimationMixer로 재생
      - 사용자 VRMA 없음 → 절차적 기본 모션 (bone rotation 직접 조작)
    표정: expressionManager로 블렌드쉐이프 제어
    립싱크: VRMA talking 없을 때 사인파로 'aa' 블렌드쉐이프 구동
```

### 메시지 타입 정의

| 타입                  | 방향                   | payload                        |
| --------------------- | ---------------------- | ------------------------------ |
| `AI_RESPONSE_CHUNK`   | content → background   | `{ chunk, emotion, fullText }` |
| `AI_RESPONSE_DONE`    | content → background   | 없음                           |
| `AVATAR_UPDATE`       | background → sidepanel | `{ chunk, emotion, fullText }` |
| `AVATAR_STOP_TALKING` | background → sidepanel | 없음                           |

### 모션 슬롯 정의

| 슬롯        | 재생 조건                        | 기본 절차 모션           |
| ----------- | -------------------------------- | ------------------------ |
| `idle`      | 평상시 (기본)                    | 호흡 + 고개 흔들기       |
| `talking`   | AI 답변 중 (`startTalking`)      | 끄덕임 + 사인파 립싱크   |
| `happy`     | happy 감정 감지                  | 몸통·팔 흔들기           |
| `surprised` | surprised 감정 감지              | 뒤로 젖히기 + 미세 떨림  |
| `shy`       | shy 감정 감지                    | 고개 숙이기 + 기울임     |

---

## 각 파일 역할 및 수정 가이드

### `manifest.json`

- 권한 추가 시 `permissions` / `host_permissions` 수정
- 새 AI 사이트 지원 시 `host_permissions`와 `content_scripts.matches`에 URL 패턴 추가
- CDN 도메인 추가 시 `content_security_policy.extension_pages`에 출처 추가
  - 현재: `script-src 'self' https://cdn.jsdelivr.net`

### `content/observer.js`

- `SITE_SELECTORS` 객체에 사이트별 CSS 셀렉터 정의
- AI 사이트가 DOM 구조를 바꾸면 이 셀렉터를 업데이트해야 함
- `detectEmotion(text)` 함수에서 감정 키워드 추가/수정
- 새 사이트 추가 방법:
  ```js
  SITE_SELECTORS["newsite.com"] = {
    streamingContainer: "...",
    responseContainer: "...",
  };
  ```
  `manifest.json`의 `host_permissions`, `content_scripts.matches`에도 추가

### `background/service_worker.js`

- 메시지 라우팅만 담당, 로직 최소화 유지
- 새 메시지 타입 추가 시 여기에 핸들러 추가

### `sidepanel/vrm-loader.js`

ES Module. 공개 API:

| 메서드 | 설명 |
|---|---|
| `load(url, container)` | VRM 파일 로드, Three.js 씬 초기화 |
| `loadMotion(slot, url)` | 슬롯에 VRMA 모션 등록 |
| `setEmotion(emotion)` | 표정 + 모션 슬롯 전환 |
| `startTalking()` | talking 슬롯으로 전환 |
| `stopTalking()` | 현재 상태(감정/idle)로 복귀 |
| `isLoaded` (getter) | VRM 로드 여부 |

**기본 모션 수정**: `DEFAULT_MOTIONS` 객체에서 각 슬롯 함수 수정
```js
const DEFAULT_MOTIONS = {
  idle: (vrm, t) => { /* bone rotation 조작 */ },
  talking: (vrm, t) => { ... },
  happy: (vrm, t) => { ... },
  // ...
};
```

**새 감정 슬롯 추가**:
1. `EMOTION_SLOT` 객체에 `{ newEmotion: "slotName" }` 추가
2. `DEFAULT_MOTIONS`에 `slotName` 함수 추가
3. `EMOTION_EXPRESSIONS`에 블렌드쉐이프 매핑 추가
4. `panel.js`의 감정 버튼 UI에 버튼 추가

**새 CDN 패키지 추가**: `index.html`의 `importmap`에 추가 후 이 파일에서 import

### `sidepanel/panel.js`

ES Module. UI 이벤트 바인딩과 메시지 수신 담당.

- TTS 추가 시 `chrome.runtime.onMessage` 핸들러 안에 TTS 호출 추가
- 새 모션 슬롯 UI 추가 시 `index.html`에 `data-slot="..."` div 추가 → `panel.js`의 `.motion-slot` querySelectorAll이 자동으로 처리함

### `sidepanel/index.html`

- CDN 패키지 추가 시 `<script type="importmap">` 블록에 항목 추가
- 현재 importmap:
  ```json
  {
    "three": "cdn.../three.module.js",
    "three/addons/": "cdn.../examples/jsm/",
    "@pixiv/three-vrm": "cdn.../three-vrm.module.js",
    "@pixiv/three-vrm-animation": "cdn.../three-vrm-animation.module.js"
  }
  ```

### `sidepanel/style.css`

- CSS 변수로 테마 관리, 변수는 `:root`에 정의
- 다크 테마 고정 (라이트 테마 추가 시 `prefers-color-scheme` 미디어쿼리 사용)

---

## 로드맵

### 완료

- [x] VRM 파일 로드 (Three.js + @pixiv/three-vrm)
- [x] 블렌드쉐이프 기반 표정 제어 (VRM0/VRM1 모두 지원)
- [x] 기본 절차 모션 내장 (VRMA 없어도 즉시 동작)
- [x] 슬롯별 커스텀 VRMA 모션 업로드 + AnimationMixer 크로스페이드

### Phase 2 — TTS 연동

`sidepanel/tts.js` 추가:

- Step 1: `window.speechSynthesis` (Web Speech API) — 무료, 바로 됨
- Step 2: ElevenLabs API — API 키 입력 UI 추가, `chrome.storage.local`에 저장
- TTS 재생 중 Web Audio API `AnalyserNode`로 음량 추출 → `aa`~`oh` 블렌드쉐이프 구동

### Phase 3 — 설정 UI + 영속화

- 모델·모션 파일 `chrome.storage.local`에 blob 저장 (재시작 후에도 유지)
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
- CDN 스크립트 로드는 `manifest.json`의 `content_security_policy.extension_pages`에 출처를 명시해야 함

### ES Module + importmap

사이드패널은 `type="importmap"` + `type="module"` 방식으로 CDN 패키지를 로드함.
번들러 없이 브라우저 네이티브 ESM 사용.

- `vrm-loader.js`, `panel.js`는 ES Module (`import`/`export` 사용)
- importmap은 `index.html` 내 `<script type="importmap">` 블록에 정의
- 새 CDN 패키지 추가 시 importmap에 먼저 등록 후 import

### DOM 셀렉터 깨짐 대응

AI 사이트들은 DOM 구조를 자주 바꿈. `observer.js`의 셀렉터가 작동 안 할 때:

1. 해당 사이트에서 개발자 도구 열기
2. AI 답변 텍스트 요소 우클릭 → "검사"
3. 고유한 클래스나 data 속성 찾아서 `SITE_SELECTORS` 업데이트

### 테스트 방법

1. `chrome://extensions` → 개발자 모드 ON
2. "압축 해제된 확장 프로그램 로드" → `vrm_for_ai/` 폴더 선택
3. 수정 후 `chrome://extensions`에서 새로고침 버튼 클릭
4. 사이드패널: F12로 개발자 도구 열기 가능 (별도 DevTools 창)
5. content script 디버깅: 해당 AI 사이트 DevTools → Sources → Content Scripts

---

## 코드 컨벤션

- **들여쓰기**: 스페이스 2칸
- **따옴표**: 큰따옴표(`"`)
- **세미콜론**: 항상 붙임
- **모듈**: ES Module (`import`/`export`) — `vrm-loader.js`, `panel.js`
- **주석**: 한국어로 작성
- **TODO 형식**: `// TODO: 설명` — 미구현 기능 위치 표시

---

## 자주 쓰는 커맨드

```bash
# 익스텐션 ZIP 패키징 (배포용)
zip -r kurodo-vrm.zip vrm_for_ai/ --exclude "*.DS_Store" --exclude "*/.git/*"

# 파일 구조 확인
find vrm_for_ai/ -type f | sort
```
