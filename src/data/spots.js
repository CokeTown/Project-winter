/* ============================================================
   spots.js — #164 「떠오른 자리」 한시 특수 스팟 데이터 (디렉터 2026-07-10)
   ------------------------------------------------------------
   기존 파밍 지역 안에 1~2일짜리 특수 스팟이 떠오른다 — 아침 보고 한 줄 +
   지도 📍 배지. 그 지역 탐험 성공/부분성공이 스팟을 회수(보상)하고,
   기한을 넘기면 조용히 사라진다(놓침 = 갈증). 순수 데이터 — 의존성 0.
   loot: res(자원 가산) · paint(도료 n — 지역 시그니처 계열 가중 롤)
         · bp(도면 확률 — 그 지역 미보유 도면 중) · mood([양, 일수])
   name/note는 로케일 키: spot.<id> / spot.<id>.note (ko+en 4파일)
   ============================================================ */
export const FIELD_SPOTS = {
  // 슬럼 — 디렉터 예시의 그 첫 스팟
  pawnshop:    { region: 'slum',        icon: '🏚️', loot: { paint: 2, res: { parts: 1 }, mood: [2, 2] } },
  nightmarket: { region: 'slum',        icon: '🏮', loot: { paint: 1, res: { canned: 2, salt: 1 } } },
  // 거주
  movinghouse: { region: 'residential', icon: '📦', loot: { bp: 0.5, res: { cloth: 2, material: 1 }, mood: [2, 2] } },
  pharmacy:    { region: 'residential', icon: '💊', loot: { res: { bandage: 2, antiseptic: 1, painkiller: 1 } } },
  // 공업
  container:   { region: 'industrial',  icon: '🧰', loot: { res: { material: 3, parts: 2 } } },
  generator:   { region: 'industrial',  icon: '🔋', loot: { res: { battery: 2, fuel: 2 } } },
  // 상업
  deptfloor:   { region: 'commercial',  icon: '🏬', loot: { paint: 1, bp: 0.35, res: { canned: 2 } } },
  vendingroom: { region: 'commercial',  icon: '🥤', loot: { res: { water: 3, canned: 2 } } },
  // 항구 (1.1 확장 지역)
  coldstore:   { region: 'harborYard',  icon: '🧊', loot: { res: { food: 3, salt: 2 } } },
  saltshed:    { region: 'fishMarket',  icon: '🧂', loot: { res: { salt: 3, food: 2 } } },
  // 고원 (1.3)
  skirental:   { region: 'resort',      icon: '🎿', loot: { res: { cloth: 3 }, mood: [2, 2] } },
  // 도심 중심지 (2.0 — 낙진 시계의 땅, 그만큼 달다)
  studio:      { region: 'citycore',    icon: '📺', loot: { paint: 2, res: { battery: 2 }, bp: 0.3 } },
};
