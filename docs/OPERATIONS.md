# OPERATIONS — Fable 부재 시 운영 정본 (하위 모델용 플레이북)

> 목적: Fable(CTO 세션)이 없어도 **어느 모델이든** 이 문서만 따라 프로젝트를 안전하게 굴릴 수 있게 한다.
> 원칙: **모르면 하지 말고 기록하라.** 게이트 없이 커밋 금지, 검증 없이 완료 선언 금지, 디렉터 결정 영역 침범 금지.

## 0. 세션 시동 절차 (순서 고정)

1. `docs/WORKLINE.md` — 작업 번호 원장(진행/대기/디렉터 몫). **여기서 다음 작업을 고른다.**
2. `docs/HANDOFF.md` + `docs/MILESTONES.md` — 현재 좌표와 크리티컬 패스.
3. 해당 작업의 스펙 문서(WORKLINE에 포인터 있음. 예: 이음매 수정 → `docs/reports/SEAM-AUDIT-2026-07-16.md`).
4. 작업 후 종료 루틴: **일지**(`docs/worklog/YYYY-MM-DD-요일.md`, 별도 커밋) → **WORKLINE 갱신** → 프로세스 스윕(§6) → push.

## 1. 불변 규칙 (어기면 롤백 대상)

- **검증 명령은 단 하나**: `npm run test:build` (vite 빌드+Electron 하네스). `node tests/core.test.cjs` 직접 호출은 **크래시한다** — electron 전용.
- **파이프라인 exit 코드 함정**: `cmd | grep X | tail`은 tail이 항상 0 — `&&` 체인으로 성공 판정하지 마라. RESULT 라인을 **눈으로** 확인.
- **커밋 전 3종 세트**: `npm run test:build` RESULT ALL GREEN + `node tools/check-i18n.mjs` 무결 + (시각 변경 시) 골든/하네스 캡처.
- **해시 핀 실패 시**: 의도한 데이터 변경이면 핀을 새 값으로 재핀하고 **주석에 사유**를 쓴다. 의도 밖이면 변경을 되돌린다. 절대 게이트를 끄지 마라.
- **신규 문자열 = ko+en+ja 3언어** × `src/locales`+`public/locales` 6파일. `{josa}`는 ko 전용. ja 규약은 `docs/design/L10N-JA.md`.
- **push**: gd-2.0·demo-vertical-slice는 디렉터가 GitHub 열람하므로 작업 완결 시 push (일지·WORKLINE 포함). 강제 push 금지.
- **아트/씬 변경은 실렌더 검증 필수**: 오프스크린 하네스로 캡처해 눈으로 본다(§4). "코드상 맞을 것"은 검증이 아니다.
- **게임 구동 배치 후 스윕**(§6) — 백그라운드 소리 신고의 재발 방지.

## 2. 검증 도구 일람

| 도구 | 명령 | 언제 |
|---|---|---|
| 코어 배터리 | `npm run test:build` | 모든 코드 변경 후 (89+ 게이트) |
| i18n 게이트 | `node tools/check-i18n.mjs` | 문자열 변경 후 |
| 하드코드 게이트 | `node tools/check-hardcode.mjs` | 신규 UI 문자열 후 (베이스라인 25) |
| 골든 픽셀 19장 | `npm run golden` / `golden:update` | 씬·라이팅 변경 후. 재핀 시 2연속 안정 확인 |
| 모달 DOM 골든 | (tests/grounding/modal-golden) | 모달 마크업 변경 후 |
| 장주행 soak | `tools/soak-memory.cjs` | 렌더 루프·리소스 변경 후 |
| 오프스크린 캡처 | §4 템플릿 | 시각 검증 전부 |

## 3. 릴리스 파이프라인 (상시 규칙: 버전 수정 완결 = exe+setup+APK 3종 GitHub 릴리스)

```powershell
# 0) 트렁크 gd-2.0에서 모든 수정 완결·그린 확인 후
cd G:\pw-demo                       # 데모 워크트리 (demo-vertical-slice)
git merge gd-2.0 --no-edit          # 재수렴 — §3-1 함정 필독
# 1) 버전 범프: package.json version (1.9.x)
# 2) 데모 배터리: npm run test:build → RESULT ALL GREEN
# 3) 빌드 (반드시 이 스크립트로 — dist 누출 방지 복원 내장):
powershell -ExecutionPolicy Bypass -File tools\build-demo.ps1        # exe 2종
powershell -ExecutionPolicy Bypass -File tools\build-demo-apk.ps1    # APK (JDK21 주입 내장)
# 4) 발행 (pwsh에서 직접 & 호출 — 중첩 powershell -Command는 개행 이스케이프가 깨진다):
& G:\pw-demo\tools\publish-beta.ps1 -Tag 'v1.9.X-demo' -Files '...exe','...Setup...exe','...apk' -Notes $notes
# 5) push 양 브랜치 + 일지·WORKLINE 갱신
```

### 3-1. 재수렴(merge) 함정 — 매번 전부 점검
1. **로케일 충돌**: ko/en/ja × src/public — `{...데모본, ...트렁크본}` 유니온(공유 키=트렁크 우선, 데모 전용 보존). 병합 후 **데모 전용 키의 ja 번역** 추가 여부 확인.
2. **conflict 마커 전수 확인**: `grep -c "^<<<<<<<" src/game.js` — **0 확인 전에 커밋 금지** (헝크는 3개 이상일 수 있다).
3. **add-vs-add 헝크**: 데모 게이트(setRegionsDemo·DEMO_CRAFT_FURN 등)와 트렁크 신설이 같은 줄대에 오면 **둘 다 보존**(유니온).
4. **중복 키 함정**: 병합 후 `balance/items/furniture/world.js`에서 `^  키: {` 중복 스캔 — 자동머지가 블록을 복제할 수 있다(뒤 키가 조용히 덮음).

## 4. 오프스크린 하네스 템플릿 (시각 검증의 유일한 정본)

`scratchpad/deck-verify.cjs`·`candle-hunt.cjs` 참조. 골자:
- `new BrowserWindow({ show:false, webPreferences:{ offscreen:true, partition:'이름-'+pid } })` — partition으로 깨끗한 프로필.
- **`win.webContents.setAudioMuted(true)` 필수** (스피커 유출 신고 이력).
- `console-message` 리스너로 에러 채집 + `window.addEventListener('error')` 스택 주입.
- capturePage→BGRA→RGBA 스왑→pngjs. 캡처는 반드시 **Read로 열어 눈으로** 검수.
- 종료: watchdog `setTimeout(app.exit, ...)` + 실행 후 §6 스윕.
- 실행: `./node_modules/electron/dist/electron.exe <script.cjs>` (트렁크 node_modules 공용).

## 5. 결정 경계 — 하위 모델이 손대면 안 되는 것

**디렉터 전용 (제안만 가능, 실행 금지)**: 가격·SKU·스토어 제출·컨셉/세계관 변경·폐기된 설계 재도입(돔 연속셸, 캐리오버, push 설계, revisitDecay, 자유입력 전파망 — HISTORY.md §4 총람)·업적 기준 변경·텔레메트리 방식.

**Fable 급 세션 권장 (하위 모델은 착수 금지, 대기 표기만)**:
- game.js 대형 리팩터(SHELTERS 빌더 분리 등 #73 후속)
- 신규 복셀 아트 제작(#192 클로즈업 로스터, 2.0 셸터) — 아트 감식안 필요
- 밸런스 수치 변경(경제 밴드 핀과 얽힘)
- 2.0-α 이상 신규 시스템 설계

**하위 모델이 안전하게 할 수 있는 것**:
- SEAM-AUDIT 잔여(#195 P2 16건) — 근거 파일:줄이 박혀 있는 수정
- 문자열/번역 작업(3언어 규칙 + import-l10n.mjs 게이트)
- 문서 현행화·일지·WORKLINE 갱신
- 재현 하네스 작성·버그 리포트 정리(수정은 규모 보고 판단)
- 릴리스 파이프라인 실행(§3 그대로)

## 6. 세션 마감 루틴

```powershell
# 게임 구동(하네스·빌드) 후 잔류 프로세스 스윕 — 상시 프로토콜
Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'electron|node|java') -and $_.CommandLine -match 'Project_winter|pw-demo|gradle' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```
+ 일지 커밋(별도) + WORKLINE 갱신 + push.

## 7. 현재 작업 큐 (2026-07-17 기준 — WORKLINE이 항상 최신)

1. **1.9.2 릴리스**: #194 완결분+#196 티어+#197 크래시+인트로 원복 → 재수렴 → 3종 발행 (진행 중)
2. **#195** P2 16건 (하위 모델 가능 — SEAM-AUDIT 근거 완비)
3. **#192** 클로즈업 로스터 7+1종 (Fable 급)
4. **2.0-α** cityOf 그라운드워크 → 세관 관문 (Fable 급, GD-2.0 §9.8.12 순서)
5. 디렉터 대기: 스토어 제출·업적 2종 등록·VDF 업로드·텔레메트리 결정·ja 픽셀 폰트

## 8. 트러블슈팅 즉답

- **배터리가 로드 즉시 크래시** → node로 직접 돌렸다. `npm run test:build`로.
- **APK 빌드 JVM 오류** → build-demo-apk.ps1가 JDK21을 주입한다(수정 완료). 워크트리 local.properties도 자동 미러.
- **publish-beta credential 오류** → 중첩 셸 때문. pwsh에서 `&`로 직접 호출.
- **골든 첫 재핀 후 flap** → 한 번 더 돌려 2연속 안정 확인 후 판정.
- **"오류가 났지만 세이브는 무사하다" 토스트** → 전역 에러 핸들러. 하네스에 error 리스너 달아 스택 채집(§4)이 정석.
- **Bash에서 node -e 템플릿 리터럴** → `${}`·백틱이 깨진다. .cjs 파일로 쓰거나 Edit 도구 사용.
