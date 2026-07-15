# Steam Depot 업로드 파이프라인 (#75)

> 도구: `tools/steam/push-steam.ps1` · ID 관리: `tools/steam/steam-ids.json`
> 원칙: depot에는 **NSIS 설치본이 아니라 언팩 디렉터리(win-unpacked)** 를 올린다.
> 스팀이 자체적으로 다운로드·배치·업데이트(델타)하므로 설치기는 불필요하다.

## 1회 준비 (디렉터)

1. **steamcmd 설치**: <https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip> 을 받아
   `tools/steam/steamcmd/` 에 압축 해제(폴더는 gitignore 됨). 또는 아무 곳에 두고 `STEAMCMD_PATH` 환경변수로 지정.
2. **데모 앱 생성**: Steamworks → 본편 앱(4950160) 스토어 페이지 → "Add a demo".
   생성된 데모 AppID/DepotID(보통 AppID+1)를 `tools/steam/steam-ids.json` 의 `demo` 에 기입.
3. **Steamworks 콘솔 설정** (앱마다 1회):
   - **Installation → General**: 실행 파일 = `Nine Winters.exe` (데모는 `Nine Winters Demo.exe`), OS = Windows 64bit.
   - **SteamPipe → Depots**: depot 생성 확인(언어/OS 필터 없음 — 단일 depot).
   - **Steam Cloud (#179)**: Auto-Cloud 경로 `WinAppDataRoaming/Nine Winters/steamcloud/*.json`
     (데모는 `Nine Winters Demo`) — STORE-SUBMIT.md 지원기능 절 참조.

## 업로드 절차

```powershell
# 1) 빌드 (기존 파이프라인 그대로)
#    본편: npm run build && npx electron-builder --win  → release\win-unpacked
#    데모: G:\pw-demo 에서 tools\build-demo.ps1        → release-demo\win-unpacked

# 2) 드라이런 — vdf 생성 + 콘텐츠 검증만 (로그인 불필요, 아무 때나 안전)
powershell -ExecutionPolicy Bypass -File tools\steam\push-steam.ps1 -App demo -DryRun

# 3) 실제 업로드 (실터미널에서 — 비밀번호·Steam Guard 대화식)
powershell -ExecutionPolicy Bypass -File tools\steam\push-steam.ps1 `
  -App demo -Desc "demo 1.9.0 lighting" -Username <스팀로그인ID>
```

- 업로드된 빌드는 **비공개 상태로 도착**한다(`SetLive` 기본 공란). 공개는 Steamworks →
  SteamPipe → Builds 에서 해당 빌드를 `default`(또는 `beta`) 브랜치로 승격 — 오발행 방지의 이중 잠금.
- `-SetLive beta` 를 주면 업로드와 동시에 beta 브랜치 반영(비공개 브랜치 한정 권장).
- 제외 파일: `*.log`, `builder-debug.yml`, `*.pdb` 는 vdf에서 자동 제외.

## 검증 체크리스트 (업로드 후)

- [ ] Steamworks Builds 페이지에 빌드 도착 + 파일 수/용량이 드라이런 출력과 일치
- [ ] beta 브랜치 승격 → Steam 클라이언트로 설치 → 부팅 확인
- [ ] **#34 실기 스모크**: Steam 클라이언트 언어를 English로 → 게임 첫 실행이 EN으로 부팅
  (steamworks.js가 Steam 컨텍스트에서 init → `nineSteam.lang` 채워지는지의 유일한 실기 검증)
- [ ] **#179 실기 스모크**: 세이브 후 종료 → 다른 PC(또는 클라우드 삭제 후) 재설치 → 세이브 복원
- [ ] **#117 실기 스모크**: 업적 1개 달성 → Steam 오버레이/프로필에 반영

## 현재 상태 (2026-07-16)

| 항목 | 상태 |
|---|---|
| push-steam.ps1 + steam-ids.json | ✅ 작성·드라이런 검증 |
| 본편 IDs (4950160/4950161) | ✅ 기입 |
| 데모 앱 생성 + IDs 기입 | ⬜ 디렉터 (스토어 페이지 제출 후 가능) |
| steamcmd 설치 | ⬜ 디렉터 (로그인 필요) |
| 실기 스모크 3종 (#34·#179·#117) | ⬜ 첫 업로드 후 |
