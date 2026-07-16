// data/eventcams.js — #201 라이브 카드 스냅샷 카메라 프리셋.
//   이벤트 카드가 열리는 순간, 현재 셸터의 실시간 씬을 이 앵글로 1프레임 렌더해 카드 일러로 쓴다.
//   좌표는 셸터 원점 기준 상대값(#200 스펙 테이블 55종 실캡처로 검증된 패밀리) — [px,py,pz, lx,ly,lz, fov].
//   풀셸(지붕/천장 포함) 렌더 전제: EXT/YARD는 닫힌 집 외경, INT는 방 안(천장 보임).
//   여기 없는 id는 라이브 스냅샷 생략 → 기존 PNG → 텍스트 카드 폴백 체인.

// 패밀리 (#200 검증 좌표. EXT는 지붕선이 담기도록 y·시선 소폭 상향)
const EXT = [11, 4.2, 12.5, 0, 1.9, 0, 40];      // 외부 와이드 — 닫힌 집 전경
const EXT_W = [14, 5.2, 15.5, 0, 2.4, 0, 38];    // 더 넓게 — 폭풍/등대/대형 셸터
const YARD = [7, 2.8, 8, 0, 1.2, 0, 42];         // 마당 미들 — 동물/생활 반경
const INT = [2.6, 1.5, 2.2, 0.9, 0.8, -1.3, 46]; // 실내 — 라디오/구조(천장 포함 아늑함)

// 방문자 10종은 제외: 도착 팬+콤팩트 카드가 라이브 연출 정본이고, 클래식 카드 폴백은
// '사람이 서 있는' 연출 스냅샷(PNG)이 실시간 빈 마당보다 서사에 맞는다.
export const EVENT_CARD_CAMS = {
  // 고양이 (클로즈업은 연출 소관 — 카드는 마당/실내 무드로)
  cat: YARD, cat_dream: INT, cat_gift: YARD,
  // 동물 — 카드가 뜰 때 스폰 개체가 마당 반경에 있다
  dog: YARD, frozen_sparrow: YARD, geese_south: EXT, returning_birds: YARD,
  greenhouse_birds: YARD, bee_swarm: YARD, spider_web: YARD,
  firefly_field: EXT, cicada_evening: EXT, mosquito_net: INT,
  // 자연/날씨 — 계절·날씨는 라이브 씬이 이미 입고 있다
  blizzard_warning: EXT, clear_winter_night: EXT, first_frost: EXT, first_sprout: YARD,
  storm: EXT_W, sudden_shower: EXT, heat_haze: EXT, leaf_drift: EXT,
  thaw_stream: YARD, melt_reveal: YARD, icicle_row: YARD, snow_prints: YARD,
  wild_berries: YARD, acorn_cache: YARD,
  // 구조/생활 — 집 몸체가 주인공
  leaky_roof: INT, frozen_pipe: INT, broken: INT, rebuilding: EXT,
  doorstep_bundle: YARD, looted_cache: YARD, stripped_district: EXT_W,
  mud_tracks: YARD, thief: YARD, barren_traps: YARD,
  // 라디오/신호 — 실내, 천장 아래
  radio_sig: INT, doctor_call: INT, doctor_radio: INT, doctor_radio_regular: INT,
  silent_frequency: INT, radio_ghost: INT, distant_light: EXT, lighthouse_ship: EXT_W,
};
