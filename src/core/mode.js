/* ============================================================
   core/mode.js — 난이도 모드 예측자 (game.js 모놀리스 분해 Phase 1)
   ------------------------------------------------------------
   state.mode를 읽는 순수 술어 함수. 렌더·경제·세이브 등 전역에서 참조하므로 코어에 둔다.
   난이도: normal / hard / hardcore / zen(무한) / wallpaper(배경화면).
   ============================================================ */
import { state } from './state.js';

// 하드코어는 하드 밸런스를 그대로 쓴다(구제만 없음) — isHard가 하드코어를 포함해야
//   전리품/게이지/한파 강화가 하드코어에도 적용된다(배치 D 밸런스 불가침, 하드 값 재사용).
export const isHard = () => state.mode === 'hard' || state.mode === 'hardcore';
export const isHardcore = () => state.mode === 'hardcore'; // 폐허는 두 번 묻지 않는다 — 구제 없음
export const isZen = () => state.mode === 'zen'; // 무한: 자동 진행 첫날 해금 + 겨울 카운터 분모 없음
export const isWallpaper = () => state.mode === 'wallpaper'; // 배경화면: 압박 전부 off, 자원 무한, 셸터 전 해금
// 구제 대상 모드: 노말/하드만(무한·배경화면은 무력 미적용, 하드코어는 구제 없음)
export const rescueEligible = () => state.mode === 'normal' || state.mode === 'hard';
