# VRM Buddy

> AI랑 대화할 때 옆에서 같이 반응해주는 VRM 캐릭터 크롬 익스텐션

Claude.ai, ChatGPT, Gemini 사이드패널에 내 VRM 아바타를 띄워보세요.  
AI가 답변하는 동안 캐릭터가 입을 벙긋대고, 내용에 따라 표정도 바뀝니다.

---

## 뭐가 되냐면요

- **실시간 립싱크** — AI가 타이핑하는 동안 캐릭터 입이 움직임
- **감정 감지** — "기쁘다", "놀랍다", "귀엽다" 같은 키워드를 읽고 표정 자동 변경
- **마우스 트래킹** — 커서 따라 고개랑 눈동자가 자연스럽게 따라옴
- **VRM 파일 로드** — 내 VRM 모델 파일을 직접 불러올 수 있음 (Three.js + @pixiv/three-vrm)
- **Canvas 기본 아바타** — VRM 없어도 귀여운 기본 캐릭터로 대기 중

지원 사이트: `claude.ai` / `chatgpt.com` / `gemini.google.com`

---

## 설치

1. 이 레포 클론 또는 ZIP 다운로드
2. `chrome://extensions` 접속
3. 우측 상단 **개발자 모드** ON
4. **압축 해제된 확장 프로그램 로드** → 이 폴더 선택
5. 완료

---

## 사용법

1. Claude / ChatGPT / Gemini 접속
2. 툴바에서 VRM Buddy 아이콘 클릭 → 사이드패널 열림
3. AI한테 뭐든 물어보면 캐릭터가 반응
4. 내 VRM 파일이 있으면 하단 **모델 파일 (.vrm)** 에서 불러오기

---

## 로드맵

- [x] Canvas 기본 아바타 (립싱크, 감정, 눈 추적)
- [x] VRM 파일 로드 (Three.js + @pixiv/three-vrm)
- [ ] Web Speech API TTS 연동
- [ ] ElevenLabs TTS + 정밀 립싱크 (Web Audio API)
- [ ] 모델 파일 로컬 저장 (재시작해도 유지)
- [ ] 배경 커스텀 / 설정 UI
- [ ] Chrome Web Store 출시

---

## 파일 구조

```
vrm_for_ai/
├── manifest.json
├── background/
│   └── service_worker.js     # 사이드패널 제어, 메시지 라우팅
├── content/
│   └── observer.js           # AI 응답 텍스트 감지 (MutationObserver)
├── sidepanel/
│   ├── index.html
│   ├── style.css
│   ├── avatar.js             # Canvas 기본 아바타
│   ├── vrm-loader.js         # Three.js VRM 로더
│   └── panel.js              # 패널 메인 로직
└── assets/
    └── (아이콘 파일들)
```

---

## 라이선스

MIT
