## 세션 시동 (이 프로젝트 전용 — 최우선)

**모든 세션은 `docs/MASTER.md`를 가장 먼저 읽는다.** 거기 §1 현재 좌표 + §2 최신 인계 블록에 "지금 어디이고 다음이 무엇인지"가 있다.
그다음 `docs/WORKLINE.md`(작업 원장)에서 다음 작업을 고르고, 규칙이 헷갈리면 `docs/OPERATIONS.md`를 본다.

**세션 마감**: 일지(`docs/worklog/YYYY-MM-DD-요일.md`) → WORKLINE 갱신 → **MASTER §1 좌표 갱신 + §2 인계 블록 추가** → 프로세스 스윕 → push.
문서 지도(어디에 뭐가 있나)는 MASTER §3. 로드맵 정본은 `docs/MILESTONES.md` 하나다.

<!-- FABLIZE:BEGIN — run Opus like Fable (always-on router). Verified procedures only. Source: github.com/fivetaku/fablize (setup/fablize-block.md). Plugin at C:/Users/mhdmj/.fablize/plugin. NOTE: this machine has no real Python (python3 is the MS Store stub), so the plugin's Python hooks + goals.py ledger are NOT wired — the discipline below runs as self-enforced context rules. -->
## Operating mode (always on — auto-route by task signal)

Apply what the task signals; with no signal, baseline only. Read each pack only when needed. Routing: smallest matching discipline only, overlap only when genuinely multi-category, mimic observable behavior only.

- **[always]** Lead with the outcome · stay within the requested scope (no incidental refactors) · ground completion claims in this session's tool results · confirm before destructive or hard-to-reverse actions.
- **[2+ sequential stories]** Decompose into sequential stories; complete one at a time, producing concrete evidence per story; do not claim completion without a verification step (a command run this session + its observed result). Track the stories in the task list. (The plugin's `goals.py` ledger + Stop/PostToolUse enforcement hooks need Python, absent here — so this is self-enforced discipline, not a hard gate.)
- **[debugging / test failure / unknown cause / review]** Follow `C:/Users/mhdmj/.fablize/plugin/packs/investigation-protocol.txt`: reproduce first → 3+ competing hypotheses → evidence per hypothesis → full causal chain (removing the symptom is not removing the defect) → verify before/after → report rejected hypotheses.
- **[render/executable artifact: HTML, SVG, game, UI, chart]** Follow `C:/Users/mhdmj/.fablize/plugin/packs/verification-grounding-pack.txt` grounding loop: run it in the real renderer → observe the actual output → fix what you see → re-run. A static check is not observation. (This project's grounding tool is the offscreen Electron dist harness — see project memory.)
- **[hard or ambiguous task]** Adaptive thinking scales with difficulty automatically. To go higher, recommend `/effort xhigh` to the user. Depth (capability) cannot be raised: if stuck 2+ times or out-of-spec discovery is needed, report the limit honestly and escalate.
<!-- FABLIZE:END -->
