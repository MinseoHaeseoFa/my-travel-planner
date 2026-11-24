/**
 * my-travel-planner · Google Sheets SSOT sync (Google Apps Script · v4 주인장 PIN 잠금)
 *
 *  1) 새 스프레드시트 > 확장 프로그램 > Apps Script 에 이 코드를 붙여넣습니다.
 *  2) 아래 OWNER_PIN 한 줄을 원하는 숫자로 바꿉니다. (예: const OWNER_PIN = "1024";)
 *  3) 배포 > 새 배포(또는 배포 관리 > 수정 > 새 버전) / 실행 계정: 나 / 액세스: 모든 사용자 로 배포합니다.
 *  4) 나온 웹 앱 URL을 여행 플래너의 [동기화 / 백업]에 붙여넣습니다.
 *
 *  - 🔒 저장(doPost)은 주인장 PIN을 통과해야만 됩니다. 불러오기(doGet)는 지금처럼 누구나 가능합니다.
 *  - 저장할 때마다 Trips 시트를 비우고 현재 여행 전체로 다시 씁니다(SSOT 초기화 후 교체).
 *  - 티켓 사진처럼 긴 데이터는 45,000자 단위로 나눠 여러 셀에 저장합니다.
 */

// ==========================================
// 🔒 주인장 PIN — 이 한 줄만 바꾸세요 (예: "1024")
// ==========================================
var OWNER_PIN = "여기에_원하는_PIN_입력";
var OWNER_PIN_PLACEHOLDER_MARK = '여기에_원하는_PIN_입력';

var SHEET_NAME = 'Trips';
var CHUNK = 45000;

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'load';
  if (action === 'ping') return out_({ ok: true, action: 'ping', time: new Date().toISOString() });
  if (action === 'load') return out_(loadAll_());
  return out_({ ok: false, error: 'unknown action: ' + action });
}

function doPost(e) {
  var raw = (e && e.postData && e.postData.contents) || '';
  var body = {};
  var parsed = false;
  if (raw) {
    try {
      body = JSON.parse(raw) || {};
      parsed = (typeof body === 'object');
    } catch (err) {
      body = {};
      parsed = false;   // form-urlencoded 본문은 e.parameter 로 읽습니다
    }
  }

  // 🔒 1) 주인장 PIN 검증 — 통과하지 못하면 아무것도 쓰지 않습니다.
  var auth = checkOwnerPin_(extractPin_(e, body));
  if (!auth.ok) return out_(auth.response);

  if (!parsed) return out_({ ok: false, error: 'invalid json' });

  if (body.action === 'save') return out_(saveAll_(body.state || {}));
  if (body.action === 'ping') return out_({ ok: true, action: 'ping', time: new Date().toISOString() });
  return out_({ ok: false, error: 'unknown action' });
}

// ==========================================
// 🔒 주인장 PIN 검증 (v4)
//   · JSON 본문(text/plain)과 form-urlencoded(e.parameter) 모두에서 pin을 읽습니다.
//   · body.pin / body.state.pin / e.parameter.pin 어느 쪽이든 인식합니다.
// ==========================================
function extractPin_(e, body) {
  var candidates = [];
  if (e && e.parameter && e.parameter.pin !== undefined) candidates.push(e.parameter.pin);
  if (body && body.pin !== undefined) candidates.push(body.pin);
  if (body && body.state && body.state.pin !== undefined) candidates.push(body.state.pin);
  if (body && body.data && typeof body.data === 'object' && body.data.pin !== undefined) candidates.push(body.data.pin);
  for (var i = 0; i < candidates.length; i++) {
    var v = candidates[i];
    if (v !== undefined && v !== null && String(v) !== '') return String(v).trim();
  }
  return '';
}

function isOwnerPinConfigured_() {
  var p = String(OWNER_PIN || '').trim();
  if (!p) return false;
  if (p === OWNER_PIN_PLACEHOLDER_MARK) return false;
  if (p.indexOf('여기에') > -1) return false;
  return true;
}

function checkOwnerPin_(pin) {
  if (!isOwnerPinConfigured_()) {
    return {
      ok: false,
      response: {
        ok: false, status: 'error', code: 'PIN_NOT_CONFIGURED', error: 'PIN_NOT_CONFIGURED',
        message: '서버의 OWNER_PIN이 아직 설정되지 않았습니다. Apps Script 맨 위의 OWNER_PIN 값을 바꾼 뒤 [배포 > 새 버전]으로 올려 주세요.'
      }
    };
  }
  if (!pin) {
    return {
      ok: false,
      response: {
        ok: false, status: 'error', code: 'UNAUTHORIZED', error: 'UNAUTHORIZED',
        message: '주인장 PIN이 필요합니다.'
      }
    };
  }
  if (String(pin).trim() !== String(OWNER_PIN).trim()) {
    return {
      ok: false,
      response: {
        ok: false, status: 'error', code: 'UNAUTHORIZED', error: 'UNAUTHORIZED',
        message: '주인장 PIN이 일치하지 않습니다.'
      }
    };
  }
  return { ok: true };
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  return sh;
}

function loadAll_() {
  var sh = sheet_();
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: true, state: null, updatedAt: null, count: 0 };
  var trips = [];
  var updatedAt = null;
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (!row[0]) continue;
    var parts = [];
    for (var c = 7; c < row.length; c++) { if (row[c]) parts.push(String(row[c])); }
    var payload = parts.join('');
    if (!payload) continue;
    try { trips.push(JSON.parse(payload)); } catch (err) { continue; }
    var stamp = row[6] ? String(row[6]) : '';
    if (stamp && (updatedAt === null || stamp > updatedAt)) updatedAt = stamp;
  }
  var activeId = PropertiesService.getScriptProperties().getProperty('activeId') || (trips.length ? trips[0].id : null);
  return { ok: true, state: { trips: trips, activeId: activeId, updatedAt: updatedAt }, updatedAt: updatedAt, count: trips.length };
}

function saveAll_(state) {
  var sh = sheet_();
  var trips = Array.isArray(state.trips) ? state.trips : [];
  var now = new Date().toISOString();
  var rows = [];
  var maxChunks = 1;
  var payloads = [];
  for (var i = 0; i < trips.length; i++) {
    var json = JSON.stringify(trips[i]);
    var chunks = [];
    for (var j = 0; j < json.length; j += CHUNK) chunks.push(json.slice(j, j + CHUNK));
    if (!chunks.length) chunks.push('');
    if (chunks.length > maxChunks) maxChunks = chunks.length;
    payloads.push(chunks);
  }
  var header = ['id', 'title', 'country', 'cities', 'start', 'end', 'updatedAt'];
  for (var k = 0; k < maxChunks; k++) header.push('payload' + (k + 1));
  rows.push(header);
  for (var t = 0; t < trips.length; t++) {
    var trip = trips[t];
    var line = [trip.id || '', trip.title || '', trip.country || '', (trip.cities || []).join(', '), trip.start || '', trip.end || '', trip.updatedAt || now];
    for (var p = 0; p < maxChunks; p++) line.push(payloads[t][p] || '');
    rows.push(line);
  }
  sh.clear();
  if (rows.length) {
    sh.getRange(1, 1, rows.length, header.length).setValues(rows);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#EFE7D6');
    sh.setFrozenRows(1);
  }
  PropertiesService.getScriptProperties().setProperty('activeId', state.activeId || '');
  return { ok: true, count: trips.length, updatedAt: now, savedAt: now };
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
