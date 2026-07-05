/* ============================================================
   lore.js — Nine Winters 서사 텍스트 테이블 (콘텐츠 데이터 분리 Phase 1)
   ------------------------------------------------------------
   목적: 세계관 메모/유서/라디오 방송/밤하늘 스케치 등 "순수 서사 데이터"를
         game.js에서 분리한다. 로직(수집·드랍·표시)은 game.js에 그대로 둔다.
   원칙: 이 파일은 의존성 0의 순수 데이터다 (import 금지 — 순환 방지).
         모든 표시 문자열은 ko/en 페어(name/nameEn·desc/descEn)로 보관하며
         언어 전환은 game.js의 LN/LD 헬퍼가 렌더 시점에 해석한다.
   출처: game.js MEMOS/WILLS/BROADCASTS/SKETCHES 및 파생 그룹 (원본 그대로 이동).
   ============================================================ */

export const MEMOS = {
  // ── 주거 (residential) 8: 일상의 붕괴 ──
  res1: { region: 'residential', name: '냉장고 쪽지', nameEn: 'Fridge Note', desc: '우유 사올 것. 애들 학원비. 다음 주 부모님 생신.\n적어둔 목록은 그대로인데, 마트는 열흘째 문을 닫았다.', descEn: 'Buy milk. Kids’ tuition. Mom’s birthday next week.\nThe list is still here. The store has been shut ten days.' },
  res2: { region: 'residential', name: '현관의 신발', nameEn: 'Shoes at the Door', desc: '아이 운동화가 문 앞에 그대로 있다. 사이즈가 작아 새로 사주기로 했었다.\n결국 못 사줬다.', descEn: 'A child’s sneakers, still by the door. Too small — we meant to buy new ones.\nWe never did.' },
  res3: { region: 'residential', name: '봉쇄 첫날 일기', nameEn: 'Lockdown Day One', desc: '봉쇄 첫날. 다들 며칠이면 끝난다고 했다.\n베란다에서 옆 동 사람과 손을 흔들었다. 그게 마지막 인사였다.', descEn: 'First day of lockdown. Everyone said a few days, that’s all.\nWaved to a neighbor across the way. That was the last hello.' },
  res4: { region: 'residential', name: '아파트 방송문', nameEn: 'Building Announcement', desc: '주민 여러분께. 엘리베이터 운행을 중단합니다. 물은 하루 두 시간만 나옵니다.\n관리사무소는 오늘부로 비웁니다. 부디 몸조심하십시오.', descEn: 'To all residents. The elevator is stopped. Water runs two hours a day.\nThe office closes today. Please, take care of yourselves.' },
  res5: { region: 'residential', name: '벽에 그은 키', nameEn: 'Height Marks', desc: '문틀에 연필로 그은 키 눈금. 작년 봄까지는 촘촘하다.\n그 위로는 없다.', descEn: 'Pencil height marks on the door frame, close together — until last spring.\nNothing above them.' },
  res6: { region: 'residential', name: '반쯤 싼 이민 가방', nameEn: 'Half-Packed Suitcase', desc: '옷 몇 벌, 사진첩, 여권. 떠날 준비를 하다 멈춘 가방.\n어디로 가려 했는지는 적혀 있지 않다.', descEn: 'A few clothes, a photo album, passports. A bag packed halfway, then abandoned.\nWhere they meant to go isn’t written anywhere.' },
  res7: { region: 'residential', name: '식탁 위 편지', nameEn: 'Letter on the Table', desc: '먼저 간다. 물자 받으러 갔다가 자리가 나면 연락할게.\n식탁 위에 그대로 놓여 있다. 답장은 없다.', descEn: 'Going ahead. I’ll send word once I find us a spot at the supply line.\nStill on the table. No reply ever came.' },
  res8: { region: 'residential', name: '마지막 배달 영수증', nameEn: 'Last Delivery Slip', desc: '쌀 10kg, 생수 두 박스, 통조림. 배달 완료.\n영수증 날짜 이후로 이 집에서 나간 사람은 없다.', descEn: '10kg rice, two cases of water, canned goods. Delivered.\nAfter this date, no one left this house.' },

  // ── 상업 (commercial) 8: 사재기와 폭동 ──
  com1: { region: 'commercial', name: '텅 빈 진열대 팻말', nameEn: 'Empty Shelf Sign', desc: '1인 1개. 새치기 신고 즉시 퇴장.\n팻말만 남고 진열대는 사흘 만에 뼈대뿐이었다.', descEn: 'One per customer. Cutting the line means removal.\nThe sign stayed. The shelves were bones in three days.' },
  com2: { region: 'commercial', name: '점장의 메모', nameEn: 'Manager’s Memo', desc: '직원들에게. 오늘 문을 닫는다. 남은 물건은 각자 가져가라.\n너희를 지켜주지 못해 미안하다.', descEn: 'To my staff. We close today. Take what’s left, split it fairly.\nI’m sorry I couldn’t keep you safe.' },
  com3: { region: 'commercial', name: '깨진 쇼윈도 낙서', nameEn: 'Graffiti on Broken Glass', desc: '깨진 유리 위에 스프레이로 적혔다. "여긴 이미 털렸다. 헛수고 마라."\n그 아래 누군가 덧썼다. "그래도 확인했다."', descEn: 'Sprayed across shattered glass: "Already cleaned out. Don’t bother."\nBelow it someone added: "Checked anyway."' },
  com4: { region: 'commercial', name: '현금은 안 받습니다', nameEn: 'No Cash Accepted', desc: '종이에 매직으로. 현금 안 받음. 물, 약, 연료만 교환.\n돈이 종이가 되는 데 일주일이 걸렸다.', descEn: 'Marker on cardboard: No cash. Trade only — water, meds, fuel.\nIt took a week for money to become paper.' },
  com5: { region: 'commercial', name: '약국 셔터의 호소', nameEn: 'Plea on the Pharmacy Shutter', desc: '약이 필요하면 문을 두드리지 말고 목록을 적어 넣으세요. 있으면 내놓겠습니다.\n마지막 줄: 이제 아무것도 없습니다.', descEn: 'Need meds? Don’t knock — slip a list under the door. If we have it, it’s yours.\nLast line: We have nothing left now.' },
  com6: { region: 'commercial', name: '폭동의 밤 전단', nameEn: 'Riot Night Flyer', desc: '오늘 밤 배급소 앞으로. 더는 순서를 기다리지 않는다.\n전단은 젖어 뭉개졌고, 배급소는 그 밤 이후 불탔다.', descEn: 'Tonight, at the ration depot. We wait our turn no longer.\nThe flyer is pulped with rain. The depot burned that night.' },
  com7: { region: 'commercial', name: 'ATM 화면', nameEn: 'ATM Screen', desc: '거래를 완료할 수 없습니다. 잠시 후 다시 시도해 주십시오.\n같은 문장이 몇 달째 켜져 있다.', descEn: 'Transaction cannot be completed. Please try again later.\nThe same line, lit for months now.' },
  com8: { region: 'commercial', name: '백화점 안내방송 대본', nameEn: 'Department Store Script', desc: '고객 여러분, 영업을 종료합니다. 침착하게 가까운 출구로.\n대본 여백에 손글씨. "3번 출구 막힘. 통제 불가."', descEn: 'Dear customers, we are closing. Calmly proceed to the nearest exit.\nHandwritten in the margin: "Exit 3 blocked. No control."' },

  // ── 공업 (industrial) 7: 폐쇄 명령·마지막 교대 ──
  ind1: { region: 'industrial', name: '공장 폐쇄 명령서', nameEn: 'Plant Shutdown Order', desc: '본 공장은 정부 명령에 따라 조업을 전면 중단한다. 설비 전원을 내리고 즉시 귀가하라.\n도장이 찍힌 날 이후, 라인은 멈춘 채다.', descEn: 'By government order, all operations cease. Power down and go home at once.\nSince the stamp on this page, the line has not moved.' },
  ind2: { region: 'industrial', name: '마지막 교대 일지', nameEn: 'Last Shift Log', desc: '야간조 3명 출근. 주간조 인수인계 없음 — 아무도 오지 않음.\n마지막 줄: 문 잠그고 나감. 불은 켜둔다.', descEn: 'Night shift: 3 in. No day-shift handover — no one came.\nLast line: Locking up. Leaving a light on.' },
  ind3: { region: 'industrial', name: '안전모의 이름표', nameEn: 'Name on a Hard Hat', desc: '먼지 앉은 안전모 안쪽에 이름과 사번. 그 아래 작게. "27년 근속. 이제 집에 간다."\n걸이엔 아직 열두 개가 그대로다.', descEn: 'Name and badge number inside a dusty hard hat. Below, small: "27 years. Going home now."\nTwelve more still hang on the pegs.' },
  ind4: { region: 'industrial', name: '급여 미지급 공고', nameEn: 'Unpaid Wages Notice', desc: '이번 달 급여 지급이 불가함을 알린다. 회사가 존속하는 한 반드시 정산하겠다.\n회사는 존속하지 않았다.', descEn: 'This month’s wages cannot be paid. So long as the company stands, you will be made whole.\nThe company did not stand.' },
  ind5: { region: 'industrial', name: '보일러실 낙서', nameEn: 'Boiler Room Scrawl', desc: '배관공이 파이프에 분필로. "밸브 잠갔음. 여기 온기는 내가 마지막까지 지켰다."\n온기는 오래전에 식었다.', descEn: 'Chalked on a pipe by the fitter: "Valves shut. I kept this heat going till the end."\nThe warmth went cold long ago.' },
  ind6: { region: 'industrial', name: '출근 카드 뭉치', nameEn: 'Stack of Time Cards', desc: '타임카드가 한 날짜에서 멈췄다. 그날 이후로 찍힌 카드가 없다.\n기계는 아직 자정을 가리키고 있다.', descEn: 'The time cards all stop on one date. None punched after.\nThe clock still points to midnight.' },
  ind7: { region: 'industrial', name: '창고 재고표', nameEn: 'Warehouse Inventory', desc: '연료 드럼 40 → 6. 부품 상자 전량 반출.\n표 맨 아래: "가져갈 수 있는 건 다 가져갔다. 미안."', descEn: 'Fuel drums 40 → 6. Parts crates all removed.\nBottom of the sheet: "Took everything we could carry. Sorry."' },

  // ── 슬럼 (slum) 7: 버려진 사람들 ──
  slum1: { region: 'slum', name: '배급 명단', nameEn: 'Ration List', desc: '이름 옆에 체크. 절반쯤에서 펜이 멈췄다. 그 아래는 줄만 그어져 있다.\n명단에 없는 사람은 받지 못했다.', descEn: 'Checkmarks beside names. The pen stops halfway. Below, only ruled lines.\nThose not on the list got nothing.' },
  slum2: { region: 'slum', name: '판자벽 낙서', nameEn: 'Scrawl on the Plank Wall', desc: '"우리는 명단에 없었다."\n페인트가 흘러내린 채 굳었다.', descEn: '"We were not on the list."\nThe paint ran and set that way.' },
  slum3: { region: 'slum', name: '가짜 배급표', nameEn: 'Forged Ration Coupon', desc: '진짜와 똑같이 인쇄된 배급표. 뒷면에 손글씨. "이거 열 장에 물 한 통. 속는 셈 치고."\n결국 아무 데서도 통하지 않았다.', descEn: 'A ration coupon printed to look real. On the back: "Ten of these for a jug of water. Worth a shot."\nIn the end they were good nowhere.' },
  slum4: { region: 'slum', name: '아이의 그림', nameEn: 'A Child’s Drawing', desc: '크레용으로 그린 집과 사람 넷. 그 위에 회색으로 온통 덧칠했다.\n한 귀퉁이에 삐뚤빼뚤. "우리 집."', descEn: 'A house and four people in crayon, painted over all in grey.\nIn one corner, uneven letters: "Our home."' },
  slum5: { region: 'slum', name: '대피령 벽보', nameEn: 'Evacuation Notice', desc: '해당 구역은 지원 대상에서 제외되었습니다. 자력으로 이동하십시오.\n어디로 가라는 말은 없었다.', descEn: 'This zone is excluded from assistance. Relocate by your own means.\nIt never said where to go.' },
  slum6: { region: 'slum', name: '공동 우물의 규칙', nameEn: 'Rules of the Shared Well', desc: '한 집에 하루 한 통. 순서 지킬 것. 싸우지 말 것.\n맨 아래 다른 글씨. "우물 말랐음. 미안."', descEn: 'One jug per household a day. Keep the order. No fighting.\nIn a different hand at the bottom: "Well’s dry. Sorry."' },
  slum7: { region: 'slum', name: '남겨진 담요', nameEn: 'The Left-Behind Blanket', desc: '골목 끝에 개켜진 담요 한 장과 빈 그릇. 누군가 여기 오래 앉아 있었다.\n일어나 어디로 갔는지는 아무도 모른다.', descEn: 'A folded blanket and an empty bowl at the alley’s end. Someone sat here a long while.\nWhere they rose and went, no one knows.' },

  // ── 특수 (bunker) 1: 하강 계단에서만 발견 (#55, 1.4 비밀 진입로 복선) ──
  stair1: { region: 'bunker', name: '계단참의 낙서', nameEn: 'Scrawl on the Landing', desc: '이 통로는 어디로 이어질까. 군화 자국은 아래로만 나 있다.', descEn: 'Where does this passage lead? The boot prints go only downward.' },

  // ── 지하 (subway) 5: 판데믹 초기 지하 대피 서사의 본진 (대피 행렬→봉쇄→핵겨울로 이어지는 결) ──
  //   지하철 셸터 거주 중 탐험에서만 드랍(district=city, subway 풀 우선). 1인칭 발견 문법·기존 36종 문체 유지.
  sub1: { region: 'subway', name: '승강장 안내 방송문', nameEn: 'Platform Announcement', desc: '열차 운행이 전면 중단되었습니다. 승강장에서 대기하지 마시고 지상 대피소로 이동하십시오.\n같은 방송이 반복되다, 어느 순간 뚝 끊겼다.', descEn: 'All train service has stopped. Do not wait on the platform — proceed to a surface shelter.\nThe same message looped, then cut off mid-sentence.' },
  sub2: { region: 'subway', name: '셔터 앞의 줄', nameEn: 'The Line at the Shutter', desc: '개찰구 셔터 앞에 분필로 그은 줄, 번호가 삼백을 넘는다.\n맨 끝 번호 옆에 작게. "여기까지. 안은 다 찼다."', descEn: 'Chalk numbers queued before the gate shutter, past three hundred.\nBy the last number, small: "This far. Inside is full."' },
  sub3: { region: 'subway', name: '궤도 위의 유모차', nameEn: 'A Pram on the Tracks', desc: '선로 자갈 위에 빈 유모차 하나가 모로 넘어져 있다. 담요는 아직 개켜진 채다.\n왜 여기 두고 갔는지는, 아무도 적어두지 않았다.', descEn: 'An empty pram lies on its side in the track gravel. The blanket is still folded.\nWhy it was left here, no one wrote down.' },
  sub4: { region: 'subway', name: '마지막 열차 시각표', nameEn: 'Last Train Timetable', desc: '벽에 붙은 시각표에 누군가 빨간 펜으로 한 줄만 크게 동그라미 쳤다. 막차 23:40.\n그 밑에. "이걸 놓치면 걸어서 내려와라."', descEn: 'On the wall timetable, one line is circled hard in red pen: last train, 23:40.\nBeneath it: "Miss this and walk down."' },
  sub5: { region: 'subway', name: '터널로 이어진 발자국', nameEn: 'Footprints into the Tunnel', desc: '먼지 앉은 승강장 끝, 발자국이 어둠 속 터널로 줄지어 이어진다. 돌아 나온 자국은 없다.\n그들이 지하에서 무엇을 찾으려 했는지, 나는 이제 조금 알 것 같다.', descEn: 'At the dusty platform’s end, footprints file into the dark of the tunnel. None come back.\nWhat they hoped to find underground — I think I’m beginning to understand.' },

  // ── 1.3 리조트 폐허 (resort) 8: 마지막 휴가객들 (봉쇄 전 산정에서 겨울을 보낸 사람들의 결) ──
  //   스키 로지 거주 중 리조트 탐험에서 우선 드랍. 1인칭 발견 문법·기존 문체 유지.
  rst1: { region: 'resort', name: '프런트의 마지막 예약', nameEn: 'The Last Booking', desc: '데스크 컴퓨터 화면이 아직 켜져 있다. 마지막 예약: 2박, 스위트, 두 사람.\n체크아웃란은 비어 있다. 그들은 끝내 내려가지 않았다.', descEn: 'The front-desk screen still glows. Last booking: two nights, a suite, for two.\nThe check-out field is blank. They never went back down.' },
  rst2: { region: 'resort', name: '눈에 묻힌 스키', nameEn: 'Skis Under the Snow', desc: '거치대에 스키 여남은 켤레가 그대로 꽂혀 있다. 이름표가 달린 것도 있다.\n마지막으로 슬로프를 탄 사람이 누구였는지, 이제 알 길이 없다.', descEn: 'A dozen pairs of skis still stand in the rack, some with name tags.\nWho last rode the slope, there’s no way to know now.' },
  rst3: { region: 'resort', name: '라운지의 방명록', nameEn: 'The Lounge Guestbook', desc: '난롯가 방명록에 적힌 인사들. "다시 오겠습니다." "잊지 못할 겨울."\n마지막 장엔 다른 필체. "여기 갇혔다. 그래도 따뜻하다."', descEn: 'Greetings in the guestbook by the hearth. "We’ll be back." "An unforgettable winter."\nThe last page, another hand: "Snowed in. Still — it’s warm here."' },
  rst4: { region: 'resort', name: '케이블카 운행 중지 안내', nameEn: 'Cable Car Suspended', desc: '승강장에 붙은 안내문. 폭설로 케이블카 운행을 중단합니다. 복구 시 재개.\n복구는 오지 않았다. 산은 그대로 사람들을 품었다.', descEn: 'A notice at the platform: Cable car suspended due to heavy snow. Service resumes when restored.\nRestoration never came. The mountain kept its people as they were.' },
  rst5: { region: 'resort', name: '객실의 크리스마스 트리', nameEn: 'A Room’s Christmas Tree', desc: '작은 트리 하나가 창가에 서 있다. 전구는 꺼졌지만 장식은 그대로다.\n선물 하나가 아직 안 뜯긴 채, 그 아래 놓여 있다.', descEn: 'A small tree stands by the window. The bulbs are dark, the ornaments intact.\nOne gift, still unopened, waits beneath it.' },
  rst6: { region: 'resort', name: '스키 강사의 수첩', nameEn: 'The Ski Instructor’s Notebook', desc: '오전반 다섯 명, 오후반 취소. 눈이 너무 많이 온다.\n마지막 줄: 손님들을 라운지로 모았다. 내려갈 길이 막혔다. 겁주지 말자.', descEn: 'Morning class of five, afternoon cancelled. Too much snow.\nLast line: Gathered the guests in the lounge. The way down is closed. Don’t frighten them.' },
  rst7: { region: 'resort', name: '온천 옆 수건 바구니', nameEn: 'Towel Basket by the Spring', desc: '노천탕 옆에 개켜진 수건이 아직 쌓여 있다. 김은 오래전에 걷혔다.\n누군가는 여기서, 세상이 끝나는 걸 따뜻한 물속에서 지켜봤을 것이다.', descEn: 'Folded towels still stack beside the open-air bath. The steam lifted long ago.\nSomeone, maybe, watched the world end from the warm water here.' },
  rst8: { region: 'resort', name: '전망대의 망원경', nameEn: 'The Overlook Telescope', desc: '동전 넣는 유료 망원경이 계곡을 향해 있다. 마지막으로 넣은 동전이 아직 걸려 있다.\n무엇을 보려 했을까. 아래 도시엔 이제 불빛이 없다.', descEn: 'A coin-op telescope points down the valley, the last coin still lodged in it.\nWhat did they hope to see? There are no lights in the city below now.' },

  // ── 1.4 금지 구역 (research) 12: 세계관의 답 — 판데믹→봉쇄→핵겨울→그리고 왜. 최종장. ──
  //   검문소/연구동 탐험에서 우선 드랍. 극적 폭로가 아니라 조용한 발견의 톤. 기존 memo 문법·1인칭 발견.
  //   서사 순서: 검문소(격리 초기 기록) → 연구동(원인·결정·관측 프로그램·박사). 12종 다 모으면 최종장 페이지.
  rsc1: { region: 'research', name: '검문소 통제 일지', nameEn: 'Checkpoint Control Log', desc: '차단봉 옆 철제 캐비닛에서 나온 일지. 첫 장: 감염 의심자 격리, 통행 전면 차단. 마지막 장은 며칠 뒤다.\n"우리도 안에 갇혔다. 밖에서 문을 잠갔다."', descEn: 'A logbook from the steel cabinet by the barrier. First page: isolate suspected cases, seal all passage. The last page is days later.\n"We are shut in too. They locked the door from outside."' },
  rsc2: { region: 'research', name: '방호 지침 게시물', nameEn: 'Protective Protocol Notice', desc: '벽에 붙은 코팅된 지침. 방호복 없이 이 선을 넘지 말 것. 노출 시 되돌릴 수 없음.\n누군가 아래에 유성펜으로 적었다. "그래도 넘어야 할 사람이 있다."', descEn: 'A laminated notice on the wall. Do not cross this line without a suit. Exposure cannot be undone.\nBeneath it, in marker: "Even so, someone has to cross."' },
  rsc3: { region: 'research', name: '초기 역학 보고 조각', nameEn: 'Early Epidemiology Fragment', desc: '찢긴 보고서 한 장. 전파 속도가 모형을 앞질렀다. 도시 봉쇄로는 늦었다는 판단.\n표 여백에 흐린 글씨. "봉쇄가 사람을 살리려는 것이었는지, 가두려는 것이었는지 이제 모르겠다."', descEn: 'A torn report page. Spread outran the models. Lockdown, it concludes, came too late.\nIn the margin, faint: "I no longer know if the cordon was to save people, or to hold them in."' },
  rsc4: { region: 'research', name: '봉쇄선 지도', nameEn: 'The Cordon Map', desc: '벽 한 면을 채운 지도. 도시들이 동심원으로 그어져 있고, 가장 안쪽 원에 굵은 빨간 표시.\n범례에 적힌 한 단어를 오래 들여다봤다. "소각(燒却)."', descEn: 'A map filling one wall. Cities ringed in concentric circles, the innermost marked thick in red.\nI stared a long time at the one word in the legend: "Incineration."' },
  rsc5: { region: 'research', name: '결정 회의록', nameEn: 'Minutes of the Decision', desc: '회의록. 확산을 멈출 방법은 하나뿐이라는 데 다수가 동의. 반대 세 명의 이름은 지워졌다.\n마지막 줄: "겨울을 앞당기더라도. 남은 이들이 버틸 수 있도록."', descEn: 'Meeting minutes. A majority agreed there was only one way to stop the spread. The names of the three who dissented are struck out.\nLast line: "Even if it brings winter early. So that those who remain might endure."' },
  rsc6: { region: 'research', name: '기상 예측 부록', nameEn: 'Climate Forecast Annex', desc: '두꺼운 부록의 접힌 페이지. 대규모 소각 이후 대기 그을음이 햇빛을 가려 수년간 겨울이 이어질 것이라는 예측.\n"인류가 스스로 부른 겨울. 우리는 그것을 알고도 눌렀다."', descEn: 'A folded page in a thick annex. It predicts that soot from mass incineration would veil the sun, and winter would last years.\n"A winter mankind called down upon itself. We knew, and we pressed it anyway."' },
  rsc7: { region: 'research', name: '연구소 출입 기록', nameEn: 'Lab Access Log', desc: '지하 연구동 출입 단말의 마지막 기록들. 대부분 퇴근 표시가 없다. 한 사람만 며칠 더 드나든다.\n식별번호 뒤 직함: 관측 프로그램 책임. 이름 자리엔 이니셜 하나뿐이다.', descEn: 'The last entries from the undercroft lab’s access terminal. Most have no clock-out. One person keeps coming and going for days more.\nAfter the ID, a title: Head, Observation Program. Where the name should be, a single initial.' },
  rsc8: { region: 'research', name: '관측 프로그램 개요', nameEn: 'Observation Program Brief', desc: '표지에 도장. 소각 이후 지상에 남은 생존 신호를 위성으로 관측·기록하는 계획.\n"우리는 내려갈 수 없다. 그러니 위에서 지켜본다. 버티는 불빛이 있는 한, 이건 실패가 아니다."', descEn: 'A stamped cover sheet. A plan to track and log surviving signals on the ground by satellite, after the burning.\n"We cannot come down. So we watch from above. As long as a light holds out, this is not a failure."' },
  rsc9: { region: 'research', name: '박사의 개인 노트', nameEn: 'The Doctor’s Personal Note', desc: '연구용 노트 사이에 끼워진 사적인 쪽지. "나는 이 결정에 서명한 세 사람 중 하나였다. 반대편에.\n그래서 나는 여기 남아, 내가 막지 못한 겨울을 끝까지 지켜보기로 했다."', descEn: 'A private note tucked among the research pads. "I was one of the three who signed against this.\nSo I chose to stay here, and watch to the end the winter I could not stop."' },
  rsc10: { region: 'research', name: '위성 교신 로그', nameEn: 'Satellite Uplink Log', desc: '단말 화면을 옮겨 적은 종이. 궤도 관측소와의 정기 교신 기록. 대부분 "지상 신호 없음".\n맨 아래 한 줄만 다르다. "신호 하나 감지. 좌표 기록. — 계속 지켜본다."', descEn: 'A page transcribed from a terminal. Logs of regular contact with the orbital station. Most read "no surface signal."\nOnly the bottom line differs: "One signal detected. Coordinates logged. — Keep watching."' },
  rsc11: { region: 'research', name: '무전 기지 설계도', nameEn: 'Radio Base Schematic', desc: '접힌 청사진. 지상에서 궤도 관측소로 신호를 되쏘는 송신 기지의 도면이다. 안테나·송신기·전원 계통이 나뉘어 있다.\n여백에 손글씨. "누군가 이걸 다시 세운다면, 위에서 응답할 것이다."', descEn: 'A folded blueprint. Plans for a ground station that beams a signal back up to the orbital post. Antenna, transmitter, power — each drawn apart.\nIn the margin, by hand: "If someone raises this again, there will be an answer from above."' },
  rsc12: { region: 'research', name: '마지막 기록', nameEn: 'The Last Entry', desc: '노트의 마지막 장. "아홉 번의 겨울이면 대기가 가라앉는다. 나는 거기까진 못 본다.\n하지만 그때까지 버틴 불빛이 하나라도 있다면, 부디 이 기지를 다시 켜다오. 그게 내가 남길 수 있는 전부다. — Dr. ___"', descEn: 'The notebook’s last page. "Nine winters, and the air will settle. I won’t see that far.\nBut if even one light lasts that long — please, switch this station back on. It is all I can leave. — Dr. ___"' },
};
// 유서 6종 — 지역 무관 별도 풀, 극저확률 (REQ-LORE-01)
export const WILLS = {
  will1: { will: true, name: '창턱의 유서', nameEn: 'Note on the Sill', desc: '더는 기다릴 힘이 없다. 창밖에 봄이 오면 누군가 이 방을 쓰길.\n미워하지 마라. 나는 오래 버텼다.', descEn: 'No strength left to wait. When spring comes to that window, may someone use this room.\nDon’t hate me. I held on a long time.' },
  will2: { will: true, name: '아버지의 마지막 말', nameEn: 'Father’s Last Words', desc: '아들아, 연료는 다락에 숨겨뒀다. 봄까지만 아끼면 산다.\n나는 너 몫까지 먹지 않으려 한다. 부디 살아라.', descEn: 'Son, the fuel is hid in the attic. Ration it to spring and you’ll live.\nI won’t eat your share. Please — live.' },
  will3: { will: true, name: '두 사람의 편지', nameEn: 'Letter for Two', desc: '우린 함께 가기로 했다. 따로 남는 것보다 낫다고.\n이 집을 찾은 당신은, 부디 혼자가 아니길.', descEn: 'We chose to go together. Better than being left apart.\nWhoever finds this house — may you not be alone.' },
  will4: { will: true, name: '간호사의 수첩', nameEn: 'The Nurse’s Notebook', desc: '마지막 환자까지 곁을 지켰다. 약은 진작 떨어졌고, 손을 잡아주는 것밖엔 없었다.\n이제 내 차례다. 두렵지 않다면 거짓말이다.', descEn: 'I stayed to the last patient. The medicine ran out long ago; all I had left was a held hand.\nNow it’s my turn. I’d be lying if I said I wasn’t afraid.' },
  will5: { will: true, name: '개에게 남긴 말', nameEn: 'A Word for the Dog', desc: '문은 열어뒀다. 너는 나보다 오래 살아라.\n누구든 이 녀석을 보거든, 착한 개다. 겁이 많을 뿐이다.', descEn: 'I left the door open. Outlive me.\nWhoever meets this one — he’s a good dog. Just easily frightened.' },
  will6: { will: true, name: '전하지 못한 답장', nameEn: 'The Reply Never Sent', desc: '네 편지 잘 받았다. 나도 보고 싶었다고, 그 말을 꼭 하고 싶었다.\n부칠 곳이 이제 없구나.', descEn: 'I got your letter. I wanted to say I missed you too — I needed to say it.\nThere’s nowhere left to send this now.' },
};
export const MEMO_REGIONS = ['residential', 'commercial', 'industrial', 'slum'];
// 지역별 메모 id 목록 (미리 그룹핑)
export const MEMOS_BY_REGION = MEMO_REGIONS.reduce((o, rg) => { o[rg] = Object.keys(MEMOS).filter(id => MEMOS[id].region === rg); return o; }, {});
// 1.2 지하(subway) 메모 풀 — 지하철 셸터 거주 중 탐험에서 우선 드랍(판데믹 지하 대피 서사).
export const MEMOS_SUBWAY = Object.keys(MEMOS).filter(id => MEMOS[id].region === 'subway');
// 1.3 리조트(resort) 메모 풀 — 리조트 탐험에서 우선 드랍(마지막 휴가객들).
export const MEMOS_RESORT = Object.keys(MEMOS).filter(id => MEMOS[id].region === 'resort');
// 1.4 금지 구역(research) 기밀 문서 풀 — 검문소/연구동 탐험에서 우선 드랍(세계관의 답 · 최종장).
export const MEMOS_RESEARCH = Object.keys(MEMOS).filter(id => MEMOS[id].region === 'research');

/* ── 라디오 방송 12종 (REQ-RADIO-01) ──
   예보 3(계절)/행상 예고 1/과거 정부 안내 2/정체불명 음악 1/생존자 사연 2/기계 자동 방송 1/박사 일지 조각 2.
   박사 조각(doctor:true) 2종 모두 수집 시 9겨울 doctor_radio 문안에 한 줄 추가된다.
   v1.4.2(디렉터 오더): air/airEn = 전파를 실제로 타는 단파 단문(초록 자막 전용) — 끊긴 문장,
   명사형 종결, 교신 관례어(응답 바람/반복한다/끝). desc는 수첩 기록용 서술(수신자 시점) 유지. */
export const BROADCASTS = {
  fc_spring: { kind: 'forecast', name: '봄 기상 안내', nameEn: 'Spring Weather Notice',
    air: '…기온 오름. 해빙, 길 질척임. 파종 서두를 것. …반복한다. 파종—', airEn: '…temps rising. Thaw, mud roads. Sow early. …repeat. Sow—',
    desc: '…낮 기온 오름. 남은 눈 녹아 길 질척임. 이른 풀 돋음. 파종을 서두르라는 옛 방송의 잔향뿐이다.', descEn: '…daytime warming. What snow remains melts to mud. Early grass. Only the echo of an old broadcast urging you to sow.' },
  fc_summer: { kind: 'forecast', name: '여름 기상 안내', nameEn: 'Summer Weather Notice',
    air: '…폭염 지속. 식수 아낄 것. 신선식 금방 상함. 통조림 아껴라. …이상.', airEn: '…heat holding. Ration water. Fresh spoils fast. Save the cans. …out.',
    desc: '…연일 무더위. 식수 관리 각별히. 신선한 것은 곧 상함. 통조림을 아끼라던 목소리가 지직거린다.', descEn: '…relentless heat, days on end. Guard your water. Fresh food spoils fast. A voice crackles: save the cans.' },
  fc_winter: { kind: 'forecast', name: '겨울 기상 안내', nameEn: 'Winter Weather Notice',
    air: '…한파 주의보. 연료·단열 점검할 것. 반복한다. 한파 주의보—', airEn: '…cold-snap warning. Check fuel, insulation. Repeat. Cold-snap warning—',
    desc: '…한파 주의보. 연료와 단열을 점검하라. 이 방송이 언제 녹음됐는지는 아무도 모른다.', descEn: '…cold-snap warning. Check your fuel and insulation. No one knows when this was recorded.' },
  merchant_ad: { kind: 'merchant', name: '행상 예고', nameEn: 'Peddler’s Notice',
    air: '…장수요. 물건 바꿉니다. 겨울 전 연료 비쌈. 가을에 챙길 것. …끝.', airEn: '…trader here. I swap goods. Fuel runs dear come winter. Stock up. …out.',
    desc: '…돌아다니는 장수요. 있는 것과 없는 것을 바꿉니다. 겨울 전엔 연료가 비싸요. 가을에 챙겨두쇼.', descEn: '…a traveling trader here. I swap what I have for what I don’t. Fuel runs dear before winter. Stock up in autumn.' },
  gov_curfew: { kind: 'gov', name: '통행 제한 안내 (반복)', nameEn: 'Curfew Notice (looped)',
    air: '…해당 구역 통행 제한. 지정 대피소로 이동. …반복한다. 통행 제한—', airEn: '…zone under curfew. Proceed to shelter. …repeat. Under curfew—',
    desc: '…해당 구역은 통행이 제한됩니다. 지정된 대피소로 이동하십시오. …구역은 통행이 제한됩니다. 이동하십시오. …제한됩니다…', descEn: '…this zone is under curfew. Proceed to a designated shelter. …zone is under curfew. Proceed. …under curfew…' },
  gov_ration: { kind: 'gov', name: '배급 안내 (반복)', nameEn: 'Ration Notice (looped)',
    air: '…배급표 지참. 1인 1일 1통. 질서 유지. …배급표 지참. 1인—', airEn: '…coupon required. One jug per person. Keep order. …coupon required—',
    desc: '…배급표를 지참하십시오. 한 사람당 하루 한 통. 질서를 지켜주십시오. 같은 문장이 끝없이 되풀이된다.', descEn: '…bring your ration coupon. One jug per person a day. Please keep order. The same lines loop without end.' },
  music_unknown: { kind: 'music', name: '정체불명의 음악', nameEn: 'Music from Nowhere',
    air: '…♪ …가사 없는 낡은 곡… ♪…', airEn: '…♪ …an old tune, no words… ♪…',
    desc: '가사 없는 낡은 곡이 흐른다. 누가, 왜 아직도 이걸 송출하는지 알 수 없다. 그래도 잠시, 혼자가 아닌 것 같다.', descEn: 'An old tune, no words, drifting through. Who plays it, and why, no one can say. Still — for a moment, you feel less alone.' },
  survivor1: { kind: 'survivor', name: '생존자 사연 · 등대', nameEn: 'Survivor’s Story · Lighthouse',
    air: '…바닷가요. 밤마다 불 켭니다. 지나는 배 있으면— 혼자 아니라고. …응답 바람.', airEn: '…by the sea. Light burns each night. If you pass— you’re not alone. …do you copy.',
    desc: '"바닷가에 있어요. 밤마다 불을 켜둡니다. 지나는 배가 있으면… 혼자가 아니라고 말해주고 싶어서."', descEn: '"I’m by the sea. I keep a light burning each night. If a ship passes… I just want to say — you’re not alone."' },
  survivor2: { kind: 'survivor', name: '생존자 사연 · 아이', nameEn: 'Survivor’s Story · The Child',
    air: '…딸이 라디오를 좋아했어요. 계속 틀어둡니다. …듣고 있으면, 응답해줘.', airEn: '…my daughter loved the radio. I keep it on. …if you hear this, answer.',
    desc: '"딸이 라디오를 좋아했어요. 그래서 계속 틀어둡니다. 언젠가 이 소릴 듣고 찾아올지도 모르니까요."', descEn: '"My daughter loved the radio. So I keep it on. Maybe one day she hears it and finds her way back."' },
  auto_beacon: { kind: 'machine', name: '자동 관측 신호', nameEn: 'Automated Beacon',
    air: '…관측소 자동 송신. 좌표 기록 중. 신호 감지 시 보고. …자동 송신—', airEn: '…observatory auto-transmit. Logging coordinates. Report on signal. …auto-transmit—',
    desc: '…관측소 자동 송신. 좌표 기록 중. 지상 신호 감지 시 보고. 사람의 목소리는 한 마디도 섞이지 않는다.', descEn: '…observatory auto-transmit. Logging coordinates. Report on surface-signal detection. Not one human word in it.' },
  doctor1: { kind: 'doctor', doctor: true, name: '박사의 일지 · 조각 하나', nameEn: 'Doctor’s Log · Fragment One',
    air: '…겨울 아홉 번이면 대기가 가라앉는다. 그때까지 버틴 신호는— 우연이 아니다. 계속 관측한다. 끝.', airEn: '…nine winters, and the air settles. A signal that holds that long— no accident. Still watching. Out.',
    desc: '"…겨울이 아홉 번 지나면, 대기가 가라앉는다고 계산했다. 그 전까지 버틴 신호가 있다면, 그건 우연이 아니다. — 계속 관측한다."', descEn: '"…by my count, after nine winters the air settles. If a signal holds out that long, it is no accident. — I keep watching."' },
  doctor2: { kind: 'doctor', doctor: true, name: '박사의 일지 · 조각 둘', nameEn: 'Doctor’s Log · Fragment Two',
    air: '…위성은 아직 돈다. 불빛 하나가 아홉 해를 버티면— 내려갈 이유가 된다. …기다린다. 끝.', airEn: '…the satellite still turns. One light, nine years— reason enough to come down. …I wait. Out.',
    desc: '"관측 위성은 아직 돈다. 지상에 불빛 하나가 아홉 해를 버티면, 우리는 내려갈 이유를 얻는다. 그 하나를 기다린다."', descEn: '"The satellite still turns. If one light on the ground lasts nine years, we are given a reason to come down. I wait for that one."' },
};

/* ── 1.3 밤하늘 스케치 6종 (관측소 완공 후, 맑은 밤 이벤트로 수집) ──
   감상 보상. 각 스케치는 그날 본 하늘의 1인칭 기록 — "나는 오래 서서 하늘을 봤다"의 결. 지시조 금지.
   맨 끝(satellite)은 1.4 복선: "저건 별이 아니다". 기록 탭에서 종이 스케치처럼 열람. */
export const SKETCHES = {
  meteor:    { name: '유성우 스케치', nameEn: 'Meteor Shower Sketch', desc: '몇 개나 셌는지 모르겠다. 세다가 그만두고, 그냥 오래 서서 하늘을 봤다.\n떨어지는 것들에게도 소원을 빌 사람이 필요했을 텐데.', descEn: 'I lost count of how many. I stopped counting and just stood a long while, watching.\nEven the falling ones must have wanted someone to wish on them.' },
  aurora:    { name: '오로라 스케치', nameEn: 'Aurora Sketch', desc: '초록 커튼이 산등성이 위로 천천히 흘렀다. 소리는 없었다.\n이렇게 조용한 것이 이렇게 넓을 수 있다는 게, 오늘은 위로가 됐다.', descEn: 'A green curtain drifted slow above the ridgeline. There was no sound.\nThat something so quiet could be so vast — tonight, that was a comfort.' },
  milkyway:  { name: '은하수 스케치', nameEn: 'Milky Way Sketch', desc: '도시가 살아 있을 땐 이런 하늘을 본 적이 없다. 폐허가 준 것 중에 이건 나쁘지 않다.\n먼지 너머로, 강처럼 흐르는 별.', descEn: 'When the city still lived I never saw a sky like this. Of what the ruin gave, this one isn’t bad.\nBeyond the dust, stars flowing like a river.' },
  moonhalo:  { name: '달무리 스케치', nameEn: 'Moon Halo Sketch', desc: '달 둘레에 흐린 고리가 걸렸다. 내일 눈이 온다는 뜻이라고, 누가 그랬던 것 같다.\n예보는 이제 하늘밖에 없다.', descEn: 'A faint ring hung round the moon. Someone once said it means snow tomorrow.\nThe sky is the only forecast left now.' },
  comet:     { name: '혜성 스케치', nameEn: 'Comet Sketch', desc: '꼬리를 끌고 서쪽으로 낮게 지났다. 다음에 돌아올 땐 내가 없을 것이다.\n그래도 오늘 밤 그것을 본 사람이 하나는 있었다고, 적어둔다.', descEn: 'It passed low to the west, dragging its tail. When it swings back, I won’t be here.\nStill — I write it down: tonight, at least one person saw it.' },
  satellite: { name: '궤도의 불빛 스케치', nameEn: 'Orbiting Light Sketch', desc: '별들 사이로 한 점이 일정한 속도로 미끄러졌다. 깜빡이지도, 떨어지지도 않았다.\n저건 별이 아니다. 누군가 아직 저 위에서 돌고 있다.', descEn: 'A single point slid between the stars at a steady pace. It did not blink, and it did not fall.\nThat is no star. Someone up there is still going round.' },
};
