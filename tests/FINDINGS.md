# 회귀 테스트 그물 — 발견 사항 & 리팩토링 백로그

> 2026-07-06 착수. `game.js` 11,481줄 모놀리스(전역 `state.` 참조 919개) + 자동화 테스트 0개 상태에서
> **안전하게 리팩토링하려면 회귀 그물이 먼저**라는 원칙으로, 코드 이동 전 현재 동작을 핀으로 박았다.
> 실행: `npm test`(빌드된 dist 대상) / `npm run test:build`(빌드 후). 오프스크린 Electron 하네스, Python 불요.

## 그물이 즉시 검거한 것 (착수 당일)

### F1. 시뮬(`simDays`)이 비-헤르메틱 — 밸런스 오라클의 재현성 결함 ✅ 해결(2026-07-07, 디렉터 감독)
- 증상: 같은 dist·시드·config인데 **호출 하네스/순번에 따라 중반 수치가 흔들림**(노말 Day30 105 vs 126, ±20).
- **조사 프로토콜**(재현→RNG 호출 계수 계측→인과사슬)로 **근본 4원인** 확정:
  1. `simReset`이 모듈 `weather.type` 미리셋 → 시작 날씨가 sim에 샘(Day30 clear 544 vs storm 435 총자원).
  2. `Object.assign(state, DEFAULT_STATE)` 얕은 병합 → 이전 run이 추가한 비-DEFAULT 키(`catTeaserDone` 등) 잔존.
  3. **주범(9600)**: `tipOnce`→`showTipNote`→`applyPaperBg`가 절차적 종이 텍스처를 `Math.random` **~9600회** 소비 +
     첫-run 모듈 캐시 → 첫 sim run만 시드 시퀀스가 9600 desync(첫 run 544, 이후 480). RNG 계수로 정확히 짚음.
  4. wildlife `_forceNightPrints`(발자국 렌더)도 RNG 소비.
- **FIX**: ① `simReset` 완전 리셋(키 전부 delete 후 DEFAULT 딥클론 재구성 + `weather.type`/전이필드 정본화) ②
  렌더 부수효과(`tipOnce`·wildlife 발자국)를 `_simRunning` 가드(헤드리스 sim서 시각 연출 금지). 실게임 무영향.
- **검증**: 연속 3회·시작날씨 3종(clear/storm/rain) Day30/432 **완전 동일**. 그물 **45/45**(헤르메틱 가드 2 신설:
  연속 재호출 동일 + 날씨 무관 동일). → 밸런스를 **정밀값**으로 측정 가능. (밴드→near 조임은 튜닝 여지 남겨 보류.)

### F2. #76 신규 세이브 필드 마이그레이션 — 안전 확인(진짜 버그 아님) ✅
- `book`/`bookProgress`/`demoEnded`를 마이그레이션 테스트 없이 추가했던 것 → 그물로 검증.
- 현대 세이브(`ver:3`, #76 필드만 없음)에서: 구필드(day/winters/canned) 무손실 + `res.book`은 RESOURCES 루프로
  안전 기본값(0) + `demoEnded`는 DEFAULT_STATE에서 정의됨. **유실 없음.**
- 부수 학습: `ver` 없는(pre-v3) 세이브는 v2→v3 마이그레이션이 `res`/`day`를 리셋한다(구 rooftop 이전 로직). 정상 동작.

## 다음(리팩토링 순서)
1. **순수 로직 추출** — 경제/게이지/탐험 정산/세이브 스키마를 렌더에서 분리 → 플레인 Node 유닛테스트(빠름).
   추출할 때마다 이 그물로 동작 보존 확인.
2. ✅ F1 헤르메틱 fix 완료(2026-07-07). 남은 선택: 시뮬 핀을 밴드→정밀 near로 조이기(밸런스 튜닝 여지와 트레이드오프).
3. 세이브 스키마 **버전 번호 + 마이그레이션 함수**로 — 손수 가드 84개 대체.
4. 그물 확장: comfortDetail 결정론, 탐험 정산, 전 셸터 로드, 데모 게이트 등.
