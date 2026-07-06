/* ============================================================
   core/projects.js — 대형 프로젝트 술어 (game.js 모놀리스 분해 Tier 3)
   ------------------------------------------------------------
   프로젝트 가용(when 게이트)/진행 레코드/완공/현장 단계 판정 + 구역→대표지역 매핑. 순수 상태 술어(렌더 무관·RNG 없음).
   자재 투입(investProject, UI 결합)과 3D 현장 렌더는 game.js 잔류.
   의존: state/season/shelter/expedition(core, districtOf) · projects(data).
   ============================================================ */
import { state } from './state.js';
import { seasonOf } from './season.js';
import { hasMod } from './shelter.js';
import { districtOf } from './expedition.js';
import { PROJECTS } from '../data/projects.js';

// 구역 → 대표 지역 (도심=상업/슬럼, 외곽/초원=주거, 숲=공업, 해안=슬럼). 메모 성격·프로젝트 district 게이트용.
export function districtRegionOf(shelterId) {
  const d = districtOf(shelterId);
  const map = { city: 'commercial', outskirts: 'residential', meadow: 'residential', forest: 'industrial', coast: 'slum' };
  return map[d] || 'residential';
}
// 프로젝트 가용 여부 (when 스키마 게이트: 셸터/구역/계절/최소일/개조/플래그).
export function projectAvailable(id) {
  const p = PROJECTS[id];
  if (!p) return false;
  const w = p.when;
  if (w) {
    if (w.shelters && !w.shelters.includes(state.current)) return false;
    if (w.districts && !w.districts.includes(districtRegionOf(state.current))) return false;
    if (w.seasons && !w.seasons.includes(seasonOf().id)) return false;
    if (w.minDay != null && state.day < w.minDay) return false;
    if (w.needsMod && !hasMod(w.needsMod)) return false;
    if (w.needsFlag && !state[w.needsFlag]) return false; // state 불리언 게이트 (예: bunkerBackdoor)
  }
  return true;
}
// 진행 레코드 (없으면 미착수 기본값). 완공 판정은 stage >= stages.length.
export function projectRec(id) {
  return state.projects?.[id] || { stage: 0, invested: 0 };
}
export function projectDone(id) {
  const p = PROJECTS[id]; if (!p) return false;
  return projectRec(id).stage >= p.stages.length;
}
// 현재 현장 오브젝트 단계 (SHELTER 3D 표현이 읽는다). 완공=doneSiteStage, 진행중=현 stage.siteStage, 미착수=0.
export function projectSiteStage(id) {
  const p = PROJECTS[id]; if (!p) return 0;
  const rec = projectRec(id);
  if (rec.stage >= p.stages.length) return p.doneSiteStage;
  const st = p.stages[rec.stage];
  return st ? st.siteStage : 0;
}
