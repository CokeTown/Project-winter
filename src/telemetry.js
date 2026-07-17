/* ============================================================
   telemetry.js — #168 데모 퍼널 텔레메트리 (익명 · 기본 no-op)
   ------------------------------------------------------------
   수집 원칙: 계정·기기·개인 정보 0 — 설치 단위 랜덤 id + 퍼널 이벤트
   이름 + CTA variant 뿐. 이벤트는 로컬 큐(localStorage)에 먼저 쌓이고,
   엔드포인트가 설정된 빌드에서만 발송된다.
   기본 상태 = EP 빈 값 → 네트워크 요청 0(완전 no-op). 〔D〕 게이트:
   GA4 Measurement Protocol 키를 EP에 채우는 순간부터 발송 — 옵트아웃
   설정 토글(신규 문자열 3언어)도 그 결재에 동봉한다(수집 없는 지금
   토글만 먼저 노출하면 빈 스위치).
   퍼널(기획 §DESIGN-REVIEW): demo_start → demo_complete(15일 컷) →
   credits_reached → wishlist_click. D2 CTA A/B(결핍 vs 희망)의 계측
   필드(variant)를 모든 이벤트에 싣는다 — 희망 카피 결재 시 노출 분기
   스위치만 올리면 A/B가 선다.
   ============================================================ */
import { opts } from './core/state.js';

const EP = { measurementId: '', apiSecret: '' }; // 〔D〕 GA4 MP 키 — 빈 값 = 발송 안 함
export const STEAM_STORE_URL = ''; // 〔D〕 스토어 페이지 확정 시 기입 — 빈 값 = 위시리스트 버튼 숨김
const QKEY = 'demo-tq', CKEY = 'demo-tcid', SKEY = 'demo-tsent';

function cid() {
  let v = localStorage.getItem(CKEY);
  if (!v) {
    v = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + '-' + Date.now());
    localStorage.setItem(CKEY, v);
  }
  return v;
}
// D2 CTA A/B 배정 — cid 해시 짝홀(설치 단위 고정). 현재 카피는 결핍(lack) 1종이라 노출은 동일,
// variant는 계측 필드로만 실린다(희망 카피 결재 후 노출 분기 활성).
export function ctaVariant() {
  const s = cid(); let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h & 1) ? 'hope' : 'lack';
}
function readQ() { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch (e) { return []; } }

/* 퍼널 이벤트 기록. once=true(기본)면 설치 단위 1회 — 재플레이·세이브 슬롯과 무관(퍼널 정의). */
export function track(name, once = true) {
  try {
    if (opts.telemetry === false) return; // 옵트아웃 예약 필드 — 토글 UI는 EP 결재와 동봉
    const sent = JSON.parse(localStorage.getItem(SKEY) || '{}');
    if (once && sent[name]) return;
    sent[name] = 1; localStorage.setItem(SKEY, JSON.stringify(sent));
    const arr = readQ();
    arr.push({ name, variant: ctaVariant(), at: Date.now() });
    while (arr.length > 100) arr.shift();
    localStorage.setItem(QKEY, JSON.stringify(arr));
    flush();
  } catch (e) { /* 계측은 게임을 깨지 않는다 — 어떤 실패도 삼킨다 */ }
}

/* 큐 발송 — EP 미설정이면 아무것도 하지 않는다(큐는 로컬에 남는다). 실패 시 큐 유지, 다음 track/부팅에 재시도. */
export function flush() {
  if (!EP.measurementId || !EP.apiSecret) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const arr = readQ(); if (!arr.length) return;
  const url = 'https://www.google-analytics.com/mp/collect?measurement_id=' + encodeURIComponent(EP.measurementId) + '&api_secret=' + encodeURIComponent(EP.apiSecret);
  const batch = arr.slice(0, 25);
  const body = JSON.stringify({ client_id: cid(), events: batch.map(e => ({ name: e.name, params: { variant: e.variant } })) });
  try {
    fetch(url, { method: 'POST', body, keepalive: true })
      .then(r => { if (r.ok) localStorage.setItem(QKEY, JSON.stringify(readQ().slice(batch.length))); })
      .catch(() => {});
  } catch (e) {}
}

export const telemetryQueue = readQ; // QA/하네스 검증용 조회
