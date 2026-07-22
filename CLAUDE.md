## 세션 시동 (이 프로젝트 전용 — 최우선)

아래 `@` 임포트로 **인계 정본이 매 세션 자동 로드된다**(읽을지 말지 고르는 게 아니라 이미 컨텍스트에 있다).
이 폴더를 처음 여는 세션도 예외 없이 현재 좌표·직전 세션 인계를 갖고 시작한다.

@docs/MASTER.md

**세션 마감 (필수)**: 일지(`docs/worklog/YYYY-MM-DD-요일.md`) → `docs/WORKLINE.md` 갱신 → **위 MASTER의 §1 좌표 갱신 + §2 인계 로그 맨 위에 블록 추가** → 프로세스 스윕 → push.
이 갱신을 빼먹으면 다음 세션의 자동 로드가 낡은 좌표를 실어 나른다 — 마감 루틴에서 가장 중요한 한 줄이다.

<!-- FABLIZE:BEGIN — run Opus like Fable (always-on router). Verified procedures only. Source: github.com/fivetaku/fablize (setup/fablize-block.md). Plugin at C:/Users/mhdmj/.fablize/plugin. NOTE: this machine has no real Python (python3 is the MS Store stub), so the plugin's Python hooks + goals.py ledger are NOT wired — the discipline below runs as self-enforced context rules. -->
## Operating mode (always on — auto-route by task signal)

Apply what the task signals; with no signal, baseline only. Read each pack only when needed. Routing: smallest matching discipline only, overlap only when genuinely multi-category, mimic observable behavior only.

- **[always]** Lead with the outcome · stay within the requested scope (no incidental refactors) · ground completion claims in this session's tool results · confirm before destructive or hard-to-reverse actions.
- **[2+ sequential stories]** Decompose into sequential stories; complete one at a time, producing concrete evidence per story; do not claim completion without a verification step (a command run this session + its observed result). Track the stories in the task list. (The plugin's `goals.py` ledger + Stop/PostToolUse enforcement hooks need Python, absent here — so this is self-enforced discipline, not a hard gate.)
- **[debugging / test failure / unknown cause / review]** Follow `C:/Users/mhdmj/.fablize/plugin/packs/investigation-protocol.txt`: reproduce first → 3+ competing hypotheses → evidence per hypothesis → full causal chain (removing the symptom is not removing the defect) → verify before/after → report rejected hypotheses.
- **[render/executable artifact: HTML, SVG, game, UI, chart]** Follow `C:/Users/mhdmj/.fablize/plugin/packs/verification-grounding-pack.txt` grounding loop: run it in the real renderer → observe the actual output → fix what you see → re-run. A static check is not observation. (This project's grounding tool is the offscreen Electron dist harness — see project memory.)
- **[hard or ambiguous task]** Adaptive thinking scales with difficulty automatically. To go higher, recommend `/effort xhigh` to the user. Depth (capability) cannot be raised: if stuck 2+ times or out-of-spec discovery is needed, report the limit honestly and escalate.
<!-- FABLIZE:END -->
