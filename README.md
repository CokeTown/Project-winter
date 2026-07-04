# ❄️ Nine Winters

> **세상이 끝난 뒤에도, 집은 가꿔야 하니까.**
> 눈 내리는 폐허에서 셸터를 꾸미고, 탐험을 보내고, 고양이 밥을 챙기는 **방치형 코지 생존 게임**.
> 모니터 한켠에 켜두면 게임이 알아서 살아갑니다.

**현재 버전: v0.9.1 Beta** · 웹/PC(Windows)/Android

## 🎮 플레이하기

| 플랫폼 | 링크 |
|---|---|
| 🌐 웹 (설치 없음) | https://project-winter-survival.github.io/Project-winter-Rep/ |
| 💻 Windows / 📱 Android APK | [최신 릴리즈 다운로드](https://github.com/Project-winter-survival/Project-winter-Rep/releases/latest) |

## 📚 문서

| 문서 | 내용 |
|---|---|
| [패치 로그](docs/PATCHNOTES.md) | 전 버전 변경 이력 (사람이 읽는 톤) |
| [프로젝트 문서](docs/PROJECT.md) | 게임 정체성 · 기술 구조 · 코드 지도 · 에셋 파이프라인 · 개발 운영 방식 |
| [홍보 전략](docs/MARKETING.md) | 포지셔닝 · Steam 계획 · 트레일러 샷리스트 · 스토어 카피 |
| [서드파티 고지](THIRD-PARTY.md) | 폰트/라이브러리 라이선스 |

## ✨ 특징

- **셸터 9종** — 컨테이너부터 등대까지, 각자 다른 생활 방식과 약점
- **살아있는 날씨** — OST 36곡이 날씨·계절·시간을 따라 흐르고, 비에 벽이 젖고, 겨울엔 창에 서리가 낀다
- **고양이** — 어느 날 찾아오는 단 한 번의 만남. 테이블 위로 폴짝 올라간다
- **데스크톱 위젯 모드** — 투명도를 조절해 바탕화면에 박아두기 (Windows)
- **자동 진행** — Day 10부터는 게임이 스스로 탐험하고 살림한다
- **한국어 / English**

## 🛠️ 개발

```bash
npm run dev          # 개발 서버 (localhost:8420)
npm run build        # 웹 빌드
npm run build:exe    # Windows 설치본/포터블
```

기술: Three.js + Vite + Electron + Capacitor. 상세 구조는 [docs/PROJECT.md](docs/PROJECT.md) 참고.

---

핵심 철학: **"꾸민 셸터는 예쁜 배경이 아니라, 플레이어를 살리는 생명 유지 장치다."**
