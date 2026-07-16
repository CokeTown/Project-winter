# 아이콘 도트 작업 워크리스트 (디렉터 제작용)

> 2026-07-16 확정: 신규 AI 생성 금지, 아이콘은 디렉터 직접 도트. 이 문서가 전체 목록 정본.
> 게임은 결손 아이콘을 이모지로 폴백하므로 **P1부터 순서대로, 되는 만큼** 넣으면 그때그때 게임에 반영됩니다.

## 공통 규격

- **캔버스 32×32** (도트 여유가 필요한 셸터·가구도 동일 — 세트 통일이 최우선)
- 투명 배경(PNG), 오브젝트가 캔버스의 **85~90%를 채우게** (24px로 축소돼도 읽히는 크기)
- 라인: 1px 다크 아웃라인(순검정 대신 어두운 웜 톤), 광원 **좌상단** 고정
- 팔레트: 자유 — 단 세트 전체에서 같은 색 계열 재사용(무채색 종말 + 웜 앰버 액센트). 참고용 현행 공용 64색 스와치: `assets-src/art/dot/_palette.png`
- 배경 UI가 어두우므로(차콜/그린 LCD) **어두운 배경 위에서 검수**

## 납품 절차

1. 완성본을 `assets-src/art/dot/` 에 `<파일명(ID)>.png` 그대로 저장 (32×32 원본)
2. 나에게 "도트 n장 넣었어" 한마디 — 내가 ×8 업스케일 + public 반영 + 인게임 캡처 검수까지 자동 처리
3. 부분 납품 OK — 파일 단위로 즉시 반영 가능

## 우선순위 요약 (총 172장)

| 구간 | 내용 | 수량 |
|---|---|---|
| P1 | HUD·시계 상시 노출 (게이지·컨디션·행동·시간·날씨·계절·지역·셸터) | 55 |
| P2 | PDA 앱·모달 행 (자원·부상·탐험 지역·장비) | 44 |
| P3 | 도감·정산 (가구 45·시스템·기록·전리품) | 59 |
| P4 | 신규 보조 (쾌적 상세 10·지식 갈래 4) | 14 |

- "재제작(도트화본 있음)" = 현재 임시 도트화본이 들어가 있어 급하지 않음. "결손(이모지 폴백)" = 현재 이모지가 노출 중 — 같은 구간에선 이것부터.
- 복장(OUTFITS)은 행에 색 스와치가 이미 있어 아이콘 불요. 토스트 문구 속 이모지는 텍스트 채널이라 별도 트랙(추후 코드 개조).
 폭풍 |||||||||||||||||||||||| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_g_hunger` | 허기 게이지 | HUD 게이지 카드 | 재제작(도트화본 있음) |
| `icon_g_thirst` | 갈증 게이지 | HUD 게이지 카드 | 재제작(도트화본 있음) |
| `icon_g_energy` | 기력 게이지 | HUD 게이지 카드 | 재제작(도트화본 있음) |
| `icon_g_clean` | 청결(경고용) | HUD 게이지 카드 | 재제작(도트화본 있음) |
| `icon_cond_warn` | 경고 표시 | HUD 컨디션 스트립 | 재제작(도트화본 있음) |
| `icon_cond_comfort` | 쾌적 표시 | HUD 컨디션 스트립 | 재제작(도트화본 있음) |
| `icon_cond_buff` | 버프 표시 | HUD 컨디션 스트립 | 재제작(도트화본 있음) |
| `icon_act_explore` | 탐험(배낭) | HUD 행동 버튼 24px | 재제작(도트화본 있음) |
| `icon_act_move` | 이주(집) | HUD 행동 버튼 24px | 재제작(도트화본 있음) |
| `icon_act_craft` | 제작(공구) | HUD 행동 버튼 24px | 재제작(도트화본 있음) |
| `icon_act_sleep` | 취침(침대) | HUD 행동 버튼 24px | 재제작(도트화본 있음) |
| `icon_act_clean` | 청소(빗자루) | HUD 행동 버튼 24px | 재제작(도트화본 있음) |
| `icon_act_journal` | 일지(수첩) | HUD 행동 버튼 24px | 재제작(도트화본 있음) |
| `icon_act_help` | 도움(지도) | HUD 행동 버튼 24px | 재제작(도트화본 있음) |

### P1-b 시간·날씨 (시계 상시)

| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_time_night` | 밤 | 시계 lcd-sub | 재제작(도트화본 있음) |
| `icon_time_dawn` | 새벽 | 시계 lcd-sub | 재제작(도트화본 있음) |
| `icon_time_day` | 낮 | 시계 lcd-sub | 재제작(도트화본 있음) |
| `icon_time_dusk` | 황혼 | 시계 lcd-sub | 재제작(도트화본 있음) |
| `icon_weather_clear` |  날씨 아이콘: 맑음 | 시계·PDA·탐험 준비 | 재제작(도트화본 있음) |
| `icon_weather_snow` |  날씨 아이콘: 눈 | 시계·PDA·탐험 준비 | 재제작(도트화본 있음) |
| `icon_weather_rain` |  날씨 아이콘: 비 | 시계·PDA·탐험 준비 | 재제작(도트화본 있음) |
| `icon_weather_ash` |  날씨 아이콘: 재 | 시계·PDA·탐험 준비 | 재제작(도트화본 있음) |
| `icon_weather_storm` |  날씨 아이콘: 폭우 | 시계·PDA·탐험 준비 | 재제작(도트화본 있음) |
| `icon_season_spring` | 🌸 봄 | 시계 상단 — 신규 | 결손(이모지 폴백) |
| `icon_season_summer` | ☀️ 여름 | 시계 상단 — 신규 | 결손(이모지 폴백) |
| `icon_season_autumn` | 🍂 가을 | 시계 상단 — 신규 | 결손(이모지 폴백) |
| `icon_season_winter` | ❄️ 겨울 | 시계 상단 — 신규 | 결손(이모지 폴백) |

### P1-c 지역(구역) 12 (거점 라인·지도)

| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_district_outskirts` | 🏜️ 잿빛 외곽 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_city` | 🏙️ 무너진 도심 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_meadow` | 🌾 초원 구릉지 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_forest` | 🌲 숲과 산기슭 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_coast` | 🌊 잿빛 해안 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_harbor` | ⚓ 얼어붙은 항구 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_highland` | 🏔️ 고요한 고원 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_research` | ☢️ 금지 구역 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_eastgate` | 🛃 동부 관문 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_eastbridge` | 🌉 다리 어귀 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_eaststation` | 🚉 중앙역 일대 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |
| `icon_district_eastcore` | 🏙️ 마천루 심부 | HUD 거점 라인·PDA 지도 | 재제작(도트화본 있음) |

### P1-d 셸터 16 (거점 라인·이주·지도 핀)

| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_shelter_container` | 📦 버려진 컨테이너 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_bunker` | 🛖 돔 벙커 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_rooftop` | 🏙️ 도시 옥탑방 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_cabin` | 🏡 숲속 오두막 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_bus` | 🚌 버려진 스쿨버스 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_subway` | 🚇 지하철 역사 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_greenhouse` | 🌿 온실 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_ship` | 🚢 여객선 선실 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_lighthouse` | 🗼 등대 등탑 거실 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_tugboat` | 🛥️ 요트 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_controltower` | 🗼 항만 관제탑 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_lodge` | 🏔️ 스키 로지 | 거점 라인·이주 앱·지도 | 재제작(도트화본 있음) |
| `icon_shelter_customs` | 🛃 세관 | 거점 라인·이주 앱·지도 | 결손(이모지 폴백) |
| `icon_shelter_bridgehouse` | 🌉 다리 관리소 | 거점 라인·이주 앱·지도 | 결손(이모지 폴백) |
| `icon_shelter_terminal` | 🚉 역 대합실 | 거점 라인·이주 앱·지도 | 결손(이모지 폴백) |
| `icon_shelter_penthouse` | 🏙️ 펜트하우스 | 거점 라인·이주 앱·지도 | 결손(이모지 폴백) |

### P2-a 자원 14 (제작·자원창·정산)

| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_res_food` | 🍎 신선식품 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_canned` | 🥫 통조림 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_water` | 💧 깨끗한 물 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_cloth` | 🧵 천 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_bandage` | 🩹 붕대 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_antiseptic` | 🧴 소독약 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_painkiller` | 💊 진통제 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_candle` | 🕯️ 양초 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_battery` | 🔋 배터리 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_fuel` | ⛽ 연료 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_parts` | ⚙️ 부품 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_material` | 🧱 건축재 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_salt` | 🧂 소금 | 제작 앱 행·PDA 자원 탭 | 재제작(도트화본 있음) |
| `icon_res_book` | 📕 책 | 제작 앱 행·PDA 자원 탭 | 결손(이모지 폴백) |

### P2-b 부상 5 (시계·부상 카드)

| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_inj_minor` | 🩹 가벼운 부상 | 시계·부상 카드·상태 탭 | 재제작(도트화본 있음) |
| `icon_inj_deep` | 🩸 깊은 상처 | 시계·부상 카드·상태 탭 | 결손(이모지 폴백) |
| `icon_inj_sprain` | 🦵 염좌 | 시계·부상 카드·상태 탭 | 재제작(도트화본 있음) |
| `icon_inj_infection` | 🤒 감염 위험 | 시계·부상 카드·상태 탭 | 재제작(도트화본 있음) |
| `icon_inj_critical` | 🚑 중상 | 시계·부상 카드·상태 탭 | 재제작(도트화본 있음) |

### P2-c 탐험 지역(세부) 19 (지도 핀)

| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_region_residential` | 🏘️ 주거지역 | 탐험 지도 핀 | 재제작(도트화본 있음) |
| `icon_region_commercial` | 🏬 상업지구 | 탐험 지도 핀 | 재제작(도트화본 있음) |
| `icon_region_industrial` | 🏭 공업지대 | 탐험 지도 핀 | 재제작(도트화본 있음) |
| `icon_region_slum` | 🏚️ 슬럼가 | 탐험 지도 핀 | 결손(이모지 폴백) |
| `icon_region_slumdeep` | 🕳️ 뒷골목 심부 | 탐험 지도 핀 | 결손(이모지 폴백) |
| `icon_region_harborYard` | 🚢 항만 야적장 | 탐험 지도 핀 | 재제작(도트화본 있음) |
| `icon_region_fishMarket` | 🐟 수산시장 폐허 | 탐험 지도 핀 | 재제작(도트화본 있음) |
| `icon_region_resort` | 🏨 리조트 폐허 | 탐험 지도 핀 | 재제작(도트화본 있음) |
| `icon_region_checkpoint` | 🚧 격리 검문소 | 탐험 지도 핀 | 재제작(도트화본 있음) |
| `icon_region_lab` | 🧪 지하 연구동 | 탐험 지도 핀 | 재제작(도트화본 있음) |
| `icon_region_citycore` | 🏛️ 도심 중심지 | 탐험 지도 핀 | 결손(이모지 폴백) |
| `icon_region_customsyard` | 📦 세관 압류창고 | 탐험 지도 핀 | 결손(이모지 폴백) |
| `icon_region_containerport` | 🏗️ 컨테이너항 | 탐험 지도 핀 | 결손(이모지 폴백) |
| `icon_region_interchange` | 🛣️ 인터체인지 | 탐험 지도 핀 | 결손(이모지 폴백) |
| `icon_region_uptown` | 🏡 고급 주거단지 | 탐험 지도 핀 | 결손(이모지 폴백) |
| `icon_region_grandplatform` | 🚂 대승강장 | 탐험 지도 핀 | 결손(이모지 폴백) |
| `icon_region_outpost` | 🪖 군사 아웃포스트 | 탐험 지도 핀 | 결손(이모지 폴백) |
| `icon_region_megamall` | 🛍️ 거대상가 | 탐험 지도 핀 | 결손(이모지 폴백) |
| `icon_region_deptstore` | 🏛️ 백화점 | 탐험 지도 핀 | 결손(이모지 폴백) |

### P2-d 탐험 장비 6 (준비 모달 — 전량 신규)

| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_prep_bottle` | 🥤 물병 | 탐험 준비 행 | 결손(이모지 폴백) |
| `icon_prep_canned` | 🥫 통조림 | 탐험 준비 행 | 결손(이모지 폴백) |
| `icon_prep_flashlight` | 🔦 손전등 | 탐험 준비 행 | 결손(이모지 폴백) |
| `icon_prep_gloves` | 🧤 장갑 | 탐험 준비 행 | 결손(이모지 폴백) |
| `icon_prep_raincoat` | 🧥 우의 | 탐험 준비 행 | 결손(이모지 폴백) |
| `icon_prep_firstaid` | ⛑️ 응급키트 | 탐험 준비 행 | 결손(이모지 폴백) |

### P3-a 가구 45 (도감·제작·편집 카드)

| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_furn_bed` | 🛏️ 침대 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_sofa` | 🛋️ 소파 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_chair` | 🪑 의자 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_table` | 🪵 테이블 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_dresser` | 🗄️ 서랍장 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_bookshelf` | 📚 책장 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_supplyshelf` | 🥫 보급 선반 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_cratestack` | 📦 보급 상자 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_fuelpile` | 🪵 장작 더미 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_noticeboard` | 📋 상황판 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_jugcluster` | 🛢️ 물·연료 비축 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_rug` | 🧶 러그 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_lamp` | 💡 스탠드 조명 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_plant` | 🪴 화분 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_crate` | 📦 나무상자 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_radio` | 📻 라디오 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_candle` | 🕯️ 캔들 스툴 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_fridge` | 🧊 냉장고 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_purifier` | 🚰 정수기 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_generator` | ⚡ 발전기 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_stove` | 🔥 장작 난로 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_cushion` | 🧘 방석 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_teatable` | 🍵 찻상 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_bookstack` | 📖 책 더미 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_clock` | 🕰️ 괘종시계 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_lantern` | 🏮 걸이 랜턴 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_heater` | ♨️ 온풍기 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_autopurifier` | ⛲ 자동 급수기 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_frame` | 🖼️ 액자 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_curtain` | 🪟 커튼 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_desklamp` | 🔦 책상 램프 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_ledbar` | 💠 LED 라이트 바 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_firstaidbox` | 🧰 구급상자 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_mirror` | 🪞 전신 거울 | 꾸미기 도감·편집 카드 | 재제작(도트화본 있음) |
| `icon_furn_globe` | 🌐 골동품 지구본 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_phonograph` | 🎶 축음기 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_candelabra` | 🕎 촛대 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_barrelfire` | 🛢️ 드럼통 화로 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_graffiti` | 🎨 그래피티 패널 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_skis` | 🎿 스키 한 쌍 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_skipoles` | ⛷️ 스키 폴대 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_snowboard` | 🏂 스노우보드 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_neonvip` | 🍸 네온 사인 · VIP ZONE | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_neonair` | 🎙️ 네온 사인 · ON AIR | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |
| `icon_furn_suit` | 👔 양복 랙 | 꾸미기 도감·편집 카드 | 결손(이모지 폴백) |

### P3-b 시스템·기록·전리품

| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_sys_edit` |  시스템 버튼 아이콘: icon_sys_edit | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_sys_pause` |  시스템 버튼 아이콘: icon_sys_pause | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_sys_play` |  시스템 버튼 아이콘: icon_sys_play | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_sys_auto` |  시스템 버튼 아이콘: icon_sys_auto | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_sys_settings` |  시스템 버튼 아이콘: icon_sys_settings | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_sys_quest` |  시스템 버튼 아이콘: icon_sys_quest | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_sys_check` |  시스템 버튼 아이콘: icon_sys_check | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_sys_collect` |  시스템 아이콘: 전체 수거 | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_loot_paint` |  UI 아이콘: 전리품 도료 | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_loot_blueprint` |  UI 아이콘: 전리품 도면 | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_rec_memo` |  UI 아이콘: 기록 메모 | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_rec_radio` |  UI 아이콘: 라디오 방송 | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_rec_sketch` |  UI 아이콘: 밤하늘 스케치 | 정산·일지·티저 | 재제작(도트화본 있음) |
| `icon_sys_locked` |  UI 아이콘: 잠금 | 정산·일지·티저 | 재제작(도트화본 있음) |

### P4 신규 — 컴포트 로그(쾌적 상세)·지식 갈래

| 파일명(ID) | 대상 | 노출 위치 | 현황 |
|---|---|---|---|
| `icon_comfort_heater` | ♨️ 난방 보너스 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_comfort_cat` | 🐈 고양이 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_comfort_coldsnap` | 🥶 대한파 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_comfort_cold` | ❄️ 한기 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_comfort_base` | 🏠 기본 안정감 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_comfort_settled` | 🪺 정착 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_comfort_bunker` | 🛖 벙커 지붕 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_comfort_moodup` | 🫧 좋은 기분 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_comfort_mooddown` | 💭 우울 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_comfort_dark` | 🌑 어둠 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_know_survival` | 🏕️ 지식 갈래: 생존 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_know_build` | 🔨 지식 갈래: 건축 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_know_farm` | 🌱 지식 갈래: 재배 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |
| `icon_know_science` | 🔬 지식 갈래: 과학 | 쾌적 상세·지식 앱 — 신규 | 결손(이모지 폴백) |