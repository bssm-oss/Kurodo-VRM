# VRM Buddy

AI 답변 옆에 VRM 캐릭터를 붙여주는 크롬 익스텐션

## 현재 구현된 것

- 크롬 사이드패널에 캐릭터 표시
- Claude.ai / ChatGPT / Gemini 응답 감지
- 응답 중 입 벙긋 (립싱크 흉내)
- 키워드 기반 감정 감지 → 표정 자동 변경
- 수동 감정 버튼
- 마우스 따라 고개/눈동자 움직임

## 설치 방법

1. 이 레포 클론 또는 ZIP 다운로드
2. `chrome://extensions` 접속
3. 우측 상단 **개발자 모드** 활성화
4. **압축 해제된 확장 프로그램 로드** 클릭
5. 이 폴더 선택

## 사용 방법

1. Claude.ai / ChatGPT / Gemini 접속
2. 툴바의 VRM Buddy 아이콘 클릭 → 사이드패널 열림
3. AI에게 질문하면 캐릭터가 반응

## 로드맵

- [ ] Three.js + @pixiv/three-vrm VRM 모델 로드
- [ ] VRM 블렌드쉐이프 기반 정밀 표정/립싱크
- [ ] Web Speech API TTS 연동
- [ ] ElevenLabs TTS 연동 (API 키 설정)
- [ ] 모델 파일 로컬 저장 (chrome.storage)
- [ ] 배경 커스텀

## 파일 구조

```
vrm-buddy/
├── manifest.json
├── background/
│   └── service_worker.js   # 사이드패널 제어, 메시지 라우팅
├── content/
│   └── observer.js         # AI 응답 텍스트 감지
├── sidepanel/
│   ├── index.html
│   ├── style.css
│   ├── avatar.js           # Canvas 기본 아바타 (VRM fallback)
│   └── panel.js            # 패널 메인 로직
└── assets/
    └── (아이콘 파일들)
```

## 라이선스

MIT
