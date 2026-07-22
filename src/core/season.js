/* ============================================================
   core/season.js — 계절 달력 (game.js 모놀리스 분해 Phase 1)
   ------------------------------------------------------------
   day → 계절 매핑의 순수 함수. 렌더 틴트·밸런스·서사(Nine Winters 겨울 카운터)가 전역 참조.
   한 계절 = SEASON_DAYS일, 4계절 순환. (겨울 스냅샷/memoir 로직은 게임 상태 변이라 game.js 잔류.)
   ============================================================ */
import { state } from './state.js';
import { BAL } from '../data/balance.js';

export const SEASONS = [
  { id: 'spring', name: '봄',   nameEn: 'Spring', icon: '', tint: [1.03, 1.05, 1.0],  desc: '만물이 깨어난다', descEn: 'all things awaken' },
  { id: 'summer', name: '여름', nameEn: 'Summer', icon: '', tint: [0.97, 1.04, 0.94], desc: '풀이 무성하다', descEn: 'the grass grows thick' },
  { id: 'autumn', name: '가을', nameEn: 'Autumn', icon: '', tint: [1.1, 1.0, 0.86],   desc: '세상이 물든다', descEn: 'the world takes on color' },
  { id: 'winter', name: '겨울', nameEn: 'Winter', icon: '', tint: [1.0, 1.02, 1.1],   desc: '혹독한 계절', descEn: 'a harsh season' },
];
export const SEASON_DAYS = BAL.seasons.daysPerSeason;
export function seasonOf(day = state.day) { return SEASONS[Math.floor((day - 1) / SEASON_DAYS) % 4]; }
export function seasonDay(day = state.day) { return ((day - 1) % SEASON_DAYS) + 1; }
// 계절 절대 인덱스 (겨울 카운터 리셋 기준) — 0부터 계절마다 +1
export function seasonIndex(day = state.day) { return Math.floor((day - 1) / SEASON_DAYS); }

// 셸터 날씨 풀을 계절로 보정 (rollWeather가 소비). 눈은 겨울만(초봄 꽃샘추위 1~4일차는 절반 확률로 잔설).
//   여름=맑음 가중, 겨울=눈 가중. Math.random은 초봄 눈/비 판정(시드 시뮬 시퀀스 내 결정적).
export function seasonAdjustPool(pool) {
  const s = seasonOf().id;
  const earlySpring = s === 'spring' && seasonDay() <= 4;
  return pool.map(w => {
    if (s === 'winter' && w === 'rain') return 'snow';
    if (earlySpring && w === 'snow') return Math.random() < 0.5 ? 'rain' : 'snow';
    if (s !== 'winter' && !earlySpring && w === 'snow') return 'rain'; // 눈은 겨울에만 (초봄 제외)
    return w;
  }).concat(s === 'winter' ? ['snow'] : s === 'summer' ? ['clear'] : []);
}
