# Kurodo-VRM

> AI랑 대화할 때 옆에서 같이 반응해주는 VRM 캐릭터 크롬 익스텐션

Claude.ai, ChatGPT, Gemini 사이드패널에 내 VRM 아바타를 띄워보세요.  
AI가 답변하는 동안 캐릭터가 움직이고, 내용에 따라 표정도 바뀝니다.

---

## 뭐가 되냐면요

- **VRM 파일 로드** — 내 `.vrm` 모델을 바로 불러와서 3D로 표시
- **기본 모션 내장** — `.vrma` 파일 없어도 대기·말하기·감정별 움직임이 자동으로 나옴
- **커스텀 모션 업로드** — 슬롯별로 `.vrma` 파일을 올리면 기본 모션 대신 재생
- **실시간 립싱크** — AI가 답변하는 동안 입 움직임
- **감정 감지** — AI 응답 텍스트에서 키워드를 읽고 표정·모션 자동 전환

지원 사이트: `claude.ai` / `chatgpt.com` / `gemini.google.com`

---

## 준비물

- `.vrm` 파일 하나 (필수)
- `.vrma` 모션 파일들 (선택 — 없으면 기본 모션으로 동작)

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
2. 툴바에서 Kurodo-VRM 아이콘 클릭 → 사이드패널 열림
3. **모델 파일 (.vrm)** 에서 VRM 파일 불러오기 → 캐릭터 등장
4. AI한테 뭐든 물어보면 캐릭터가 반응
5. (선택) **모션 파일 (.vrma)** 슬롯에 커스텀 모션 업로드

### 모션 슬롯

| 슬롯 | 재생 타이밍 | 기본 모션 |
|---|---|---|
| 대기 | 평상시 루프 | 미세 호흡 + 고개 흔들기 |
| 말하기 | AI 답변 중 | 끄덕임 + 립싱크 |
| 기쁨 | 기쁜 키워드 감지 | 몸통·팔 흔들기 |
| 놀람 | 놀란 키워드 감지 | 뒤로 젖히기 |
| 수줍음 | 수줍은 키워드 감지 | 고개 숙이기 |

> 슬롯에 `.vrma`를 올리면 해당 슬롯만 커스텀 모션으로 교체됩니다.

---

## 로드맵

- [x] VRM 파일 로드 (Three.js + @pixiv/three-vrm)
- [x] 블렌드쉐이프 기반 표정 제어
- [x] 기본 절차 모션 내장 (대기 / 말하기 / 감정별)
- [x] 슬롯별 커스텀 VRMA 모션 업로드
- [ ] Web Speech API TTS 연동
- [ ] ElevenLabs TTS + 정밀 립싱크 (Web Audio API)
- [ ] 모델·모션 파일 로컬 저장 (재시작해도 유지)
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
│   ├── vrm-loader.js         # Three.js VRM 로더 + 모션 시스템
│   └── panel.js              # 패널 메인 로직
└── assets/
    └── (아이콘 파일들)
```

---

## 라이선스

MIT
