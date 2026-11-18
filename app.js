/* ==========================================================================
   여행 플래너 · 오프라인 여행 지갑
   순수 HTML/CSS/JS · 빌드 없음 · localStorage SSOT
   - 7탭: 전체 · 일정 · 티켓 · 준비 · 예산 · 맛집 · 정보
   - 국가(대한민국) → 네이버 지도 / 그 외 → 구글 맵 자동 분기
   - 오프라인 PWA + JSON 백업 + 구글 시트(Apps Script) 동기화
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- constants ---------- */
  var STORE_KEY = 'mtp.state.v1';
  var ONBOARD_KEY = 'mtp.onboarded.v1';

  var SVG_HEAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
  var ICONS = {
    compass: SVG_HEAD + '<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.3 5.3-5.3 2.3 2.3-5.3z"/></svg>',
    calendar: SVG_HEAD + '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h2M14 14h2M8 17h2M14 17h2"/></svg>',
    ticket: SVG_HEAD + '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v1.7a2 2 0 0 0 0 3.6v1.7A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5v-1.7a2 2 0 0 0 0-3.6z"/><path d="M14 6.5v11" stroke-dasharray="2 3"/></svg>',
    check: SVG_HEAD + '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H17a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7.5A2.5 2.5 0 0 1 5 18.5z"/><path d="M9 12l2.4 2.4L16 9"/></svg>',
    wallet: SVG_HEAD + '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18"/><circle cx="17" cy="15" r="1.1" fill="currentColor" stroke="none"/></svg>',
    food: SVG_HEAD + '<path d="M6.5 3v7.5a2 2 0 0 0 2 2V21"/><path d="M9.5 3v6M6.5 3v6M17.5 3c-1.5 1.4-2 3.8-2 6 0 1.6.9 2.4 2 2.7V21"/></svg>',
    info: SVG_HEAD + '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none"/></svg>',
    plus: SVG_HEAD + '<path d="M12 5v14M5 12h14"/></svg>',
    refresh: SVG_HEAD + '<path d="M20 11a8 8 0 1 0-2.4 6.4"/><path d="M20 4.5V11h-6.5"/></svg>',
    edit: SVG_HEAD + '<path d="M4 20h4.5L20 8.5a2.5 2.5 0 0 0-3.5-3.5L5 16.5z"/><path d="M14.5 6.5L17.5 9.5"/></svg>',
    trash: SVG_HEAD + '<path d="M4 7h16"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12"/></svg>',
    arrow: SVG_HEAD + '<path d="M5 12h13"/><path d="M12.5 5.5L19 12l-6.5 6.5"/></svg>'
  };

  var TABS = [
    { id: 'all', label: '전체', icon: 'compass' },
    { id: 'plan', label: '일정', icon: 'calendar' },
    { id: 'ticket', label: '티켓', icon: 'ticket' },
    { id: 'ready', label: '준비', icon: 'check' },
    { id: 'budget', label: '예산', icon: 'wallet' },
    { id: 'food', label: '맛집', icon: 'food' },
    { id: 'info', label: '정보', icon: 'info' }
  ];

  var CATS = {
    '핵심': { cls: 'c-core', emoji: '📍', color: '#C8562F' },
    '이동': { cls: 'c-move', emoji: '🚇', color: '#2A5FA8' },
    '식사': { cls: 'c-meal', emoji: '🍽', color: '#B87A16' },
    '카페': { cls: 'c-cafe', emoji: '☕', color: '#8A5A3B' },
    '체험': { cls: 'c-exp', emoji: '🎟', color: '#6B4BA8' },
    '숙박': { cls: 'c-stay', emoji: '🛏', color: '#2F6F66' }
  };

  /* 숙소 체크인·체크아웃 기본 시각 */
  var STAY_DEFAULT_IN = '15:00';
  var STAY_DEFAULT_OUT = '11:00';

  var CHECK_GROUPS = ['필수 서류', '전자기기', '의류·세면', '건강·상비약', '기타'];
  var BUDGET_CATS = ['교통', '숙박', '식비', '관광', '쇼핑', '기타'];
  var TICKET_TYPES = ['항공 E-티켓', '렌터카 확인서', '숙소 바우처', '패스 · 입장권', '기타'];

  /* 출발·귀환 교통수단 / 도시·국가 간 이동 수단 */
  var LEG_MODES = ['항공', 'KTX·기차', '자차', '고속버스', '선박', '기타'];
  var MOVE_MODES = ['항공', 'KTX·기차', '신칸센', '렌터카', '자차', '고속버스', '버스', '페리·선박', '지하철', '도보', '기타'];
  var MODE_EMOJI = {
    '항공': '✈️', 'KTX·기차': '🚄', '신칸센': '🚄', '렌터카': '🚗', '자차': '🚗',
    '고속버스': '🚌', '버스': '🚌', '페리·선박': '⛴️', '선박': '⛴️',
    '지하철': '🚇', '도보': '🚶', '기타': '🚏'
  };
  var CURATION = window.TRAVEL_CURATION || {};
  var CURATION_META = window.TRAVEL_CURATION_META || {};

  var COUNTRIES = [
    '대한민국', '일본', '중국', '대만', '홍콩', '태국', '베트남', '싱가포르', '말레이시아', '필리핀',
    '인도네시아', '인도', '미국', '캐나다', '멕시코', '영국', '프랑스', '독일', '이탈리아', '스페인',
    '포르투갈', '네덜란드', '벨기에', '스위스', '오스트리아', '그리스', '튀르키예', '체코', '헝가리',
    '크로아티아', '노르웨이', '스웨덴', '핀란드', '덴마크', '아이슬란드', '러시아', '호주', '뉴질랜드',
    '이집트', '모로코', '남아프리카공화국', '아랍에미리트', '브라질', '아르헨티나', '페루', '칠레', '기타'
  ];

  var CODES = {
    '대한민국': 'KR', '일본': 'JP', '중국': 'CN', '대만': 'TW', '홍콩': 'HK', '태국': 'TH',
    '베트남': 'VN', '싱가포르': 'SG', '말레이시아': 'MY', '필리핀': 'PH', '인도네시아': 'ID',
    '인도': 'IN', '미국': 'US', '캐나다': 'CA', '멕시코': 'MX', '영국': 'GB', '프랑스': 'FR',
    '독일': 'DE', '이탈리아': 'IT', '스페인': 'ES', '포르투갈': 'PT', '네덜란드': 'NL',
    '벨기에': 'BE', '스위스': 'CH', '오스트리아': 'AT', '그리스': 'GR', '튀르키예': 'TR',
    '체코': 'CZ', '헝가리': 'HU', '크로아티아': 'HR', '노르웨이': 'NO', '스웨덴': 'SE',
    '핀란드': 'FI', '덴마크': 'DK', '아이슬란드': 'IS', '러시아': 'RU', '호주': 'AU',
    '뉴질랜드': 'NZ', '이집트': 'EG', '모로코': 'MA', '남아프리카공화국': 'ZA',
    '아랍에미리트': 'AE', '브라질': 'BR', '아르헨티나': 'AR', '페루': 'PE', '칠레': 'CL'
  };

  var FLAGS = {
    '대한민국': '🇰🇷', '일본': '🇯🇵', '중국': '🇨🇳', '대만': '🇹🇼', '홍콩': '🇭🇰', '태국': '🇹🇭',
    '베트남': '🇻🇳', '싱가포르': '🇸🇬', '말레이시아': '🇲🇾', '필리핀': '🇵🇭', '인도네시아': '🇮🇩',
    '인도': '🇮🇳', '미국': '🇺🇸', '캐나다': '🇨🇦', '멕시코': '🇲🇽', '영국': '🇬🇧', '프랑스': '🇫🇷',
    '독일': '🇩🇪', '이탈리아': '🇮🇹', '스페인': '🇪🇸', '포르투갈': '🇵🇹', '네덜란드': '🇳🇱',
    '벨기에': '🇧🇪', '스위스': '🇨🇭', '오스트리아': '🇦🇹', '그리스': '🇬🇷', '튀르키예': '🇹🇷',
    '체코': '🇨🇿', '헝가리': '🇭🇺', '크로아티아': '🇭🇷', '노르웨이': '🇳🇴', '스웨덴': '🇸🇪',
    '핀란드': '🇫🇮', '덴마크': '🇩🇰', '아이슬란드': '🇮🇸', '러시아': '🇷🇺', '호주': '🇦🇺',
    '뉴질랜드': '🇳🇿', '이집트': '🇪🇬', '모로코': '🇲🇦', '남아프리카공화국': '🇿🇦',
    '아랍에미리트': '🇦🇪', '브라질': '🇧🇷', '아르헨티나': '🇦🇷', '페루': '🇵🇪', '칠레': '🇨🇱'
  };

  var EMERGENCY = {
    '대한민국': [['경찰', '112'], ['화재 · 구급', '119'], ['관광 통역 안내', '1330'], ['응급의료 상담', '1339']],
    '일본': [['경찰', '110'], ['화재 · 구급', '119'], ['일본 관광 안내(JNTO)', '050-3816-2787']],
    '중국': [['경찰', '110'], ['화재', '119'], ['구급', '120']],
    '대만': [['경찰', '110'], ['화재 · 구급', '119']],
    '홍콩': [['긴급', '999']],
    '태국': [['관광경찰', '1155'], ['경찰', '191'], ['구급', '1669']],
    '베트남': [['경찰', '113'], ['화재', '114'], ['구급', '115']],
    '싱가포르': [['경찰', '999'], ['구급 · 화재', '995']],
    '말레이시아': [['긴급', '999']],
    '필리핀': [['긴급', '911']],
    '인도네시아': [['긴급', '112']],
    '인도': [['긴급', '112'], ['경찰', '100']],
    '미국': [['긴급', '911']],
    '캐나다': [['긴급', '911']],
    '멕시코': [['긴급', '911']],
    '영국': [['긴급', '999'], ['비응급 의료 상담', '111']],
    '프랑스': [['긴급(유럽 통합)', '112'], ['경찰', '17'], ['구급', '15']],
    '독일': [['긴급', '112'], ['경찰', '110']],
    '이탈리아': [['긴급', '112']],
    '스페인': [['긴급', '112']],
    '포르투갈': [['긴급', '112']],
    '네덜란드': [['긴급', '112']],
    '벨기에': [['긴급', '112']],
    '스위스': [['긴급', '112'], ['경찰', '117']],
    '오스트리아': [['긴급', '112']],
    '그리스': [['긴급', '112']],
    '튀르키예': [['긴급', '112']],
    '체코': [['긴급', '112']],
    '헝가리': [['긴급', '112']],
    '크로아티아': [['긴급', '112']],
    '노르웨이': [['경찰', '112'], ['구급', '113']],
    '스웨덴': [['긴급', '112']],
    '핀란드': [['긴급', '112']],
    '덴마크': [['긴급', '112']],
    '아이슬란드': [['긴급', '112']],
    '러시아': [['긴급', '112']],
    '호주': [['긴급', '000']],
    '뉴질랜드': [['긴급', '111']],
    '이집트': [['경찰', '122'], ['구급', '123']],
    '모로코': [['경찰', '19'], ['구급', '15']],
    '남아프리카공화국': [['긴급', '10111']],
    '아랍에미리트': [['경찰', '999'], ['구급', '998']],
    '브라질': [['경찰', '190'], ['구급', '192']],
    '아르헨티나': [['긴급', '911']],
    '페루': [['경찰', '105'], ['구급', '106']],
    '칠레': [['긴급', '133']]
  };
  var CONSULATE = ['영사콜센터(24시간, 해외)', '+82-2-3210-0404'];

  var CUR = {
    KRW: { symbol: '₩', name: '원' }, JPY: { symbol: '¥', name: '엔' }, USD: { symbol: '$', name: '달러' },
    EUR: { symbol: '€', name: '유로' }, CNY: { symbol: '¥', name: '위안' }, THB: { symbol: '฿', name: '바트' },
    GBP: { symbol: '£', name: '파운드' }, TWD: { symbol: 'NT$', name: '대만달러' }, VND: { symbol: '₫', name: '동' },
    AUD: { symbol: 'A$', name: '호주달러' }, SGD: { symbol: 'S$', name: '싱가포르달러' },
    CAD: { symbol: 'C$', name: '캐나다달러' }, HKD: { symbol: 'HK$', name: '홍콩달러' }
  };
  var DEFAULT_RATES = {
    KRW: 1, JPY: 9.3, USD: 1380, EUR: 1490, CNY: 190, THB: 39, GBP: 1750, TWD: 43,
    VND: 0.055, AUD: 900, SGD: 1020, CAD: 1000, HKD: 176
  };

  var GS_CODE = [
    '/** my-travel-planner · Google Sheets SSOT sync (Google Apps Script)',
    ' *  1) 새 스프레드시트 > 확장 프로그램 > Apps Script 에 이 코드를 붙여넣습니다.',
    ' *  2) 배포 > 새 배포 > 웹 앱 / 실행 계정: 나 / 액세스: 모든 사용자 로 배포합니다.',
    " *  3) 나온 웹 앱 URL을 여행 플래너의 [동기화 / 백업]에 붙여넣습니다.",
    ' *  - 저장할 때마다 Trips 시트를 비우고 현재 여행 전체로 다시 씁니다(SSOT 초기화 후 교체).',
    ' *  - 티켓 사진처럼 긴 데이터는 45,000자 단위로 나눠 여러 셀에 저장합니다.',
    ' */',
    "var SHEET_NAME = 'Trips';",
    'var CHUNK = 45000;',
    '',
    'function doGet(e) {',
    "  var action = (e && e.parameter && e.parameter.action) || 'load';",
    "  if (action === 'ping') return out_({ ok: true, action: 'ping', time: new Date().toISOString() });",
    "  if (action === 'load') return out_(loadAll_());",
    "  return out_({ ok: false, error: 'unknown action: ' + action });",
    '}',
    '',
    'function doPost(e) {',
    '  var body = {};',
    '  try {',
    "    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');",
    '  } catch (err) {',
    "    return out_({ ok: false, error: 'invalid json' });",
    '  }',
    "  if (body.action === 'save') return out_(saveAll_(body.state || {}));",
    "  if (body.action === 'ping') return out_({ ok: true, action: 'ping', time: new Date().toISOString() });",
    "  return out_({ ok: false, error: 'unknown action' });",
    '}',
    '',
    'function sheet_() {',
    '  var ss = SpreadsheetApp.getActiveSpreadsheet();',
    '  var sh = ss.getSheetByName(SHEET_NAME);',
    '  if (!sh) sh = ss.insertSheet(SHEET_NAME);',
    '  return sh;',
    '}',
    '',
    'function loadAll_() {',
    '  var sh = sheet_();',
    '  var values = sh.getDataRange().getValues();',
    '  if (values.length < 2) return { ok: true, state: null, updatedAt: null, count: 0 };',
    '  var trips = [];',
    '  var updatedAt = null;',
    '  for (var r = 1; r < values.length; r++) {',
    '    var row = values[r];',
    '    if (!row[0]) continue;',
    '    var parts = [];',
    '    for (var c = 7; c < row.length; c++) { if (row[c]) parts.push(String(row[c])); }',
    "    var payload = parts.join('');",
    '    if (!payload) continue;',
    '    try { trips.push(JSON.parse(payload)); } catch (err) { continue; }',
    "    var stamp = row[6] ? String(row[6]) : '';",
    '    if (stamp && (updatedAt === null || stamp > updatedAt)) updatedAt = stamp;',
    '  }',
    "  var activeId = PropertiesService.getScriptProperties().getProperty('activeId') || (trips.length ? trips[0].id : null);",
    '  return { ok: true, state: { trips: trips, activeId: activeId, updatedAt: updatedAt }, updatedAt: updatedAt, count: trips.length };',
    '}',
    '',
    'function saveAll_(state) {',
    '  var sh = sheet_();',
    '  var trips = Array.isArray(state.trips) ? state.trips : [];',
    '  var now = new Date().toISOString();',
    '  var rows = [];',
    '  var maxChunks = 1;',
    '  var payloads = [];',
    '  for (var i = 0; i < trips.length; i++) {',
    '    var json = JSON.stringify(trips[i]);',
    '    var chunks = [];',
    '    for (var j = 0; j < json.length; j += CHUNK) chunks.push(json.slice(j, j + CHUNK));',
    "    if (!chunks.length) chunks.push('');",
    '    if (chunks.length > maxChunks) maxChunks = chunks.length;',
    '    payloads.push(chunks);',
    '  }',
    "  var header = ['id', 'title', 'country', 'cities', 'start', 'end', 'updatedAt'];",
    "  for (var k = 0; k < maxChunks; k++) header.push('payload' + (k + 1));",
    '  rows.push(header);',
    '  for (var t = 0; t < trips.length; t++) {',
    '    var trip = trips[t];',
    "    var line = [trip.id || '', trip.title || '', trip.country || '', (trip.cities || []).join(', '), trip.start || '', trip.end || '', trip.updatedAt || now];",
    "    for (var p = 0; p < maxChunks; p++) line.push(payloads[t][p] || '');",
    '    rows.push(line);',
    '  }',
    '  sh.clear();',
    '  if (rows.length) {',
    '    sh.getRange(1, 1, rows.length, header.length).setValues(rows);',
    "    sh.getRange(1, 1, 1, header.length).setFontWeight('bold').setBackground('#EFE7D6');",
    '    sh.setFrozenRows(1);',
    '  }',
    "  PropertiesService.getScriptProperties().setProperty('activeId', state.activeId || '');",
    '  return { ok: true, count: trips.length, updatedAt: now, savedAt: now };',
    '}',
    '',
    'function out_(obj) {',
    '  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);',
    '}'
  ].join('\n');

  /* ---------- tiny utils ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function uid(prefix) { return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function nowISO() { return new Date().toISOString(); }
  function list(arr) { return Array.isArray(arr) ? arr : []; }

  function isoOf(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayISO() { return isoOf(new Date()); }
  function parseISO(s) {
    var p = String(s || '').split('-').map(Number);
    if (!p[0] || !p[1] || !p[2]) return null;
    var d = new Date(p[0], p[1] - 1, p[2]);
    return isNaN(d.getTime()) ? null : d;
  }
  function addDaysISO(s, n) {
    var d = parseISO(s);
    if (!d) return s;
    d.setDate(d.getDate() + n);
    return isoOf(d);
  }
  function dayCount(start, end) {
    var a = parseISO(start), b = parseISO(end);
    if (!a || !b) return 1;
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function dateLabel(iso) {
    var d = parseISO(iso);
    if (!d) return esc(iso || '');
    return (d.getMonth() + 1) + '.' + pad2(d.getDate()) + ' (' + WD[d.getDay()] + ')';
  }
  function fullDateLabel(iso) {
    var d = parseISO(iso);
    if (!d) return '';
    return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate()) + ' (' + WD[d.getDay()] + ')';
  }
  function fmtDateRange(s, e) {
    var a = parseISO(s), b = parseISO(e);
    if (!a || !b) return '';
    if (s === e) return fullDateLabel(s);
    if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
      return a.getFullYear() + '.' + pad2(a.getMonth() + 1) + '.' + pad2(a.getDate()) + ' ~ ' + pad2(b.getDate()) + ' (' + WD[a.getDay()] + '~' + WD[b.getDay()] + ')';
    }
    return fullDateLabel(s) + ' ~ ' + fullDateLabel(e);
  }
  function parseTime(v) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim());
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }
  function fmtTime(min) {
    var v = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)));
    return pad2(Math.floor(v / 60)) + ':' + pad2(v % 60);
  }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function fmtNum(v) {
    try { return new Intl.NumberFormat('ko-KR').format(num(v)); } catch (e) { return String(num(v)); }
  }
  function fmtStamp(s) {
    var d = new Date(s);
    if (!s || isNaN(d.getTime())) return String(s || '').slice(0, 16).replace('T', ' ');
    return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function compactKRW(v) {
    try { return new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(num(v)); }
    catch (e) { return fmtNum(v); }
  }
  function curSymbol(c) { return (CUR[c] && CUR[c].symbol) || ''; }
  function sortByTime(a, b) { return String(a.time || '').localeCompare(String(b.time || '')); }

  function normCountry(v) {
    var c = String(v || '').trim();
    var low = c.toLowerCase().replace(/\s+/g, '');
    if (['한국', '대한민국', '남한', 'korea', 'southkorea', 'kr', 'kor'].indexOf(low) >= 0) return '대한민국';
    return c;
  }
  function isKorea(country) { return normCountry(country) === '대한민국'; }
  function flagOf(country) { return FLAGS[normCountry(country)] || '🌏'; }
  function codeOf(country) { return CODES[normCountry(country)] || 'TRIP'; }
  function flagBadge(country) { return '<span class="flag-badge" aria-hidden="true">' + codeOf(country) + '</span>'; }

  /* ---------- state ---------- */
  var state;
  var ui = { tab: 'all', day: 1, allDays: false };
  var editingTripId = null;
  var tripDraft = null;
  var pendingConfirm = null;
  var dateShrinkAck = false;
  var toastTimer = null;
  var autoTimer = null;

  function freshState() {
    return {
      version: 1,
      activeId: null,
      updatedAt: nowISO(),
      settings: { sheetUrl: '', autoSync: false, lastSyncAt: '' },
      trips: []
    };
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var time = String(raw.time || '09:00');
    if (parseTime(time) === null) time = '09:00';
    var leg = (raw.leg === 'outbound' || raw.leg === 'inbound' || raw.leg === 'segment') ? raw.leg : '';
    return {
      id: raw.id || uid('it'),
      time: time,
      title: String(raw.title || '일정'),
      category: CATS[raw.category] ? raw.category : '핵심',
      city: String(raw.city || ''),
      place: String(raw.place || ''),
      memo: String(raw.memo || ''),
      country: String(raw.country || ''),
      from: String(raw.from || ''),
      to: String(raw.to || ''),
      fromCountry: String(raw.fromCountry || ''),
      toCountry: String(raw.toCountry || ''),
      mode: String(raw.mode || ''),
      arr: String(raw.arr || ''),
      leg: leg,
      lat: raw.lat === 0 || raw.lat ? raw.lat : '',
      lon: raw.lon === 0 || raw.lon ? raw.lon : '',
      src: String(raw.src || ''),
      autoKind: (raw.autoKind === 'stay-checkin' || raw.autoKind === 'stay-checkout') ? raw.autoKind : '',
      staySegId: String(raw.staySegId || '')
    };
  }

  function normLeg(raw) {
    var r = (raw && typeof raw === 'object') ? raw : {};
    return {
      from: String(r.from || ''),
      to: String(r.to || ''),
      mode: LEG_MODES.indexOf(r.mode) >= 0 ? r.mode : '',
      dep: String(r.dep || ''),
      arr: String(r.arr || '')
    };
  }

  function defaultLegMode(country) { return isKorea(country) ? 'KTX·기차' : '항공'; }

  function resolveLeg(leg, fallbackCity, fallbackMode) {
    leg = leg || {};
    return {
      from: String(leg.from || '').trim(),
      to: String(leg.to || '').trim() || String(fallbackCity || ''),
      mode: LEG_MODES.indexOf(leg.mode) >= 0 ? leg.mode : fallbackMode,
      dep: parseTime(leg.dep) === null ? '' : leg.dep,
      arr: parseTime(leg.arr) === null ? '' : leg.arr
    };
  }

  /* 출발·귀환 설정을 DAY 1 / 마지막 DAY 이동 카드에 반영 (중복 생성 없이 갱신) */
  function syncTripLegs(t) {
    if (!t || !t.days.length) return;
    applyLegItem(t, 'outbound', t.outbound, t.days[0]);
    applyLegItem(t, 'inbound', t.inbound, t.days[t.days.length - 1]);
  }

  function applyLegItem(t, kind, leg, day) {
    if (!day) return;
    var found = null;
    t.days.forEach(function (d) {
      d.items = d.items.filter(function (x) {
        if (x.leg !== kind) return true;
        if (!found) { found = x; return false; }
        return false;
      });
    });
    if (!leg || !leg.from || !leg.to) return;
    var fallbackDep = kind === 'outbound' ? '08:30' : '17:00';
    var time = parseTime(leg.dep) === null ? fallbackDep : leg.dep;
    var arr = parseTime(leg.arr) === null ? '' : leg.arr;
    var homeCountry = isKorea(t.country) ? t.country : '대한민국';
    var fromCountry = kind === 'outbound' ? homeCountry : t.country;
    var toCountry = kind === 'outbound' ? t.country : homeCountry;
    var item = Object.assign(found || { id: uid('it') }, {
      time: time,
      title: leg.from + ' → ' + leg.to,
      category: '이동',
      city: kind === 'outbound' ? leg.to : leg.from,
      place: '',
      memo: '',
      country: fromCountry,
      from: leg.from,
      to: leg.to,
      fromCountry: fromCountry,
      toCountry: toCountry,
      mode: leg.mode || '',
      arr: arr,
      leg: kind,
      src: 'trip-leg'
    });
    day.items.push(item);
    day.items.sort(sortByTime);
  }

  function normalizeTrip(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var start = raw.start || todayISO();
    var end = raw.end || addDaysISO(start, 2);
    if (end < start) end = start;
    var cities = list(raw.cities).map(String).filter(Boolean);
    if (!cities.length) cities = ['미정'];
    var t = {
      id: raw.id || uid('trip'),
      title: String(raw.title || '나의 여행'),
      country: normCountry(raw.country || '대한민국') || '대한민국',
      cities: cities,
      start: start,
      end: end,
      sample: !!raw.sample,
      createdAt: raw.createdAt || nowISO(),
      updatedAt: raw.updatedAt || nowISO(),
      days: [],
      tickets: [],
      checklist: [],
      budget: { items: [], rates: {} },
      food: [],
      info: { lodging: [], emergency: [], memo: '' },
      outbound: normLeg(raw.outbound),
      inbound: normLeg(raw.inbound)
    };
    var total = dayCount(start, end);
    var rawDays = list(raw.days);
    t.days = [];
    for (var i = 0; i < total; i++) {
      var src = rawDays[i] || {};
      var items = list(src.items).map(normalizeItem).filter(Boolean);
      items.sort(sortByTime);
      var city = src.city ? String(src.city) : defaultCityFor(t.cities, i, total);
      t.days.push({ n: i + 1, date: addDaysISO(start, i), city: city, items: items });
    }
    t.tickets = list(raw.tickets).map(function (k) {
      return {
        id: k.id || uid('tk'),
        type: TICKET_TYPES.indexOf(k.type) >= 0 ? k.type : '기타',
        title: String(k.title || '예약 확인서'),
        ref: String(k.ref || ''),
        when: String(k.when || ''),
        note: String(k.note || ''),
        image: typeof k.image === 'string' ? k.image : '',
        imageInfo: k.imageInfo || null
      };
    });
    var checks = list(raw.checklist).map(function (c) {
      return {
        id: c.id || uid('ck'),
        label: String(c.label || ''),
        group: CHECK_GROUPS.indexOf(c.group) >= 0 ? c.group : '기타',
        done: !!c.done
      };
    }).filter(function (c) { return c.label; });
    t.checklist = checks.length ? checks : defaultChecklist(t.country);
    var b = raw.budget || {};
    t.budget.items = list(b.items).map(function (x) {
      return {
        id: x.id || uid('bg'),
        label: String(x.label || '지출'),
        amount: num(x.amount),
        currency: CUR[x.currency] ? x.currency : 'KRW',
        category: BUDGET_CATS.indexOf(x.category) >= 0 ? x.category : '기타'
      };
    });
    t.budget.rates = Object.assign({}, b.rates || {});
    t.food = list(raw.food).map(function (f) {
      return {
        id: f.id || uid('fd'),
        name: String(f.name || ''),
        type: String(f.type || '기타'),
        hours: String(f.hours || ''),
        memo: String(f.memo || ''),
        city: String(f.city || '')
      };
    }).filter(function (f) { return f.name; });
    var info = raw.info || {};
    t.info.lodging = list(info.lodging).map(function (l) {
      return {
        id: l.id || uid('lg'),
        name: String(l.name || ''),
        address: String(l.address || ''),
        checkin: parseTime(l.checkin) === null ? '' : String(l.checkin),
        checkout: parseTime(l.checkout) === null ? '' : String(l.checkout),
        phone: String(l.phone || ''),
        city: String(l.city || ''),
        zone: String(l.zone || ''),
        memo: String(l.memo || ''),
        lat: l.lat === 0 || l.lat ? l.lat : '',
        lon: l.lon === 0 || l.lon ? l.lon : '',
        src: String(l.src || '')
      };
    }).filter(function (l) { return l.name; });
    /* 숙박 구간(숙소별 체크인~체크아웃). 체크인/체크아웃이 모두 있는 구간만 유지 */
    t.info.stayPlan = list(info.stayPlan).map(function (s) {
      if (!s || typeof s !== 'object') return null;
      var ci = String(s.checkinDate || ''), co = String(s.checkoutDate || '');
      if (!parseISO(ci) || !parseISO(co) || co <= ci) return null;
      return {
        id: s.id || uid('sp'),
        lodgingId: String(s.lodgingId || ''),
        name: String(s.name || ''),
        city: String(s.city || ''),
        checkinDate: ci,
        checkinTime: parseTime(s.checkinTime) === null ? STAY_DEFAULT_IN : String(s.checkinTime),
        checkoutDate: co,
        checkoutTime: parseTime(s.checkoutTime) === null ? STAY_DEFAULT_OUT : String(s.checkoutTime),
        hideCheckin: !!s.hideCheckin,
        hideCheckout: !!s.hideCheckout
      };
    }).filter(Boolean);
    t.info.emergency = list(info.emergency).map(function (e) {
      return { id: e.id || uid('em'), name: String(e.name || ''), number: String(e.number || '') };
    }).filter(function (e) { return e.name && e.number; });
    t.info.memo = String(info.memo || '');
    return t;
  }

  function normalizeState(raw) {
    var st = (raw && typeof raw === 'object') ? raw : {};
    var out = freshState();
    out.settings = Object.assign({}, out.settings, st.settings || {});
    out.trips = list(st.trips).map(normalizeTrip).filter(Boolean);
    out.activeId = (st.activeId && out.trips.some(function (t) { return t.id === st.activeId; }))
      ? st.activeId
      : (out.trips[0] ? out.trips[0].id : null);
    out.updatedAt = st.updatedAt || nowISO();
    return out;
  }

  function defaultCityFor(cities, index, total) {
    if (!cities.length) return '';
    var i = Math.min(cities.length - 1, Math.floor(index * cities.length / Math.max(1, total)));
    return cities[i];
  }

  function defaultChecklist(country) {
    var kr = isKorea(country);
    var base = kr ? [
      ['필수 서류', '신분증'], ['필수 서류', '교통 예매 내역'], ['필수 서류', '숙소 바우처'],
      ['전자기기', '휴대폰 충전기'], ['전자기기', '보조배터리'],
      ['의류·세면', '편한 운동화'], ['의류·세면', '세면도구'],
      ['건강·상비약', '상비약'], ['기타', '우산']
    ] : [
      ['필수 서류', '여권'], ['필수 서류', '항공 E-티켓'], ['필수 서류', '숙소 바우처'],
      ['전자기기', '휴대폰 충전기'], ['전자기기', '보조배터리'], ['전자기기', '유심 · eSIM'],
      ['의류·세면', '편한 운동화'], ['건강·상비약', '상비약'], ['기타', '현지 통화 · 카드']
    ];
    return base.map(function (row) {
      return { id: uid('ck'), group: row[0], label: row[1], done: false };
    });
  }

  function applyDays(trip, total) {
    var old = list(trip.days);
    var days = [];
    for (var i = 0; i < total; i++) {
      var o = old[i];
      days.push({
        n: i + 1,
        date: addDaysISO(trip.start, i),
        city: (o && o.city) || defaultCityFor(trip.cities, i, total),
        items: (o && list(o.items)) || []
      });
    }
    trip.days = days;
  }

  function blankTrip(opts) {
    var t = {
      id: uid('trip'),
      title: opts.title,
      country: opts.country,
      cities: opts.cities.slice(),
      start: opts.start,
      end: opts.end,
      sample: !!opts.sample,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      days: [],
      tickets: [],
      checklist: defaultChecklist(opts.country),
      budget: { items: [], rates: {} },
      food: [],
      info: { lodging: [], emergency: [], memo: '' },
      outbound: { from: '', to: '', mode: '', dep: '08:30', arr: '' },
      inbound: { from: '', to: '', mode: '', dep: '17:00', arr: '' }
    };
    applyDays(t, dayCount(t.start, t.end));
    return t;
  }

  /* ---------- sample trips ---------- */
  function mkItem(time, title, category, place, memo) {
    return { id: uid('it'), time: time, title: title, category: category, place: place || '', memo: memo || '', city: '', country: '' };
  }

  function buildSamples() {
    var base = todayISO();
    var gStart = addDaysISO(base, 21);
    var tStart = addDaysISO(base, 52);
    var out = [];

    /* ① 국내 샘플 — 경주 · 부산 2박 3일 */
    var g = blankTrip({
      title: '경주 · 부산 2박 3일', country: '대한민국',
      cities: ['경주', '부산'], start: gStart, end: addDaysISO(gStart, 2)
    });
    g.sample = true;
    g.days = [
      { n: 1, date: gStart, city: '경주', items: [
        mkItem('08:30', '서울역 → 신경주 KTX', '이동', '신경주역', '약 2시간 10분 · 좌석 미지정'),
        mkItem('11:00', '불국사', '핵심', '불국사', '관람 1시간 30분 · 편한 신발'),
        mkItem('13:00', '남산 아래 한정식', '식사', '경주 남산', '예약 권장'),
        mkItem('15:00', '첨성대 · 동궁과 월지', '핵심', '동궁과 월지', '야간 개장 시간 확인'),
        mkItem('18:30', '황리단길 한옥 카페', '카페', '황리단길', '주차 어려움 · 도보 이동'),
        mkItem('20:00', '한옥스테이 체크인', '핵심', '경주 한옥스테이', '조용한 골목 안쪽')
      ] },
      { n: 2, date: addDaysISO(gStart, 1), city: '부산', items: [
        mkItem('09:30', '경주 → 부산 시외버스', '이동', '부산시외버스터미널', '약 1시간'),
        mkItem('11:30', '감천문화마을', '핵심', '감천문화마을', '오르막길 · 사진 명소'),
        mkItem('13:00', '서면 돼지국밥', '식사', '부산 서면', '점심 시간대 붐빔'),
        mkItem('15:30', '흰여울문화마을', '체험', '흰여울문화마을', '해안 산책로'),
        mkItem('18:30', '광안리 해변 산책', '핵심', '광안리해수욕장'),
        mkItem('20:00', '광안대교 야경 카페', '카페', '광안리', '야경 명소')
      ] },
      { n: 3, date: addDaysISO(gStart, 2), city: '부산', items: [
        mkItem('09:30', '해운대 해수욕장', '핵심', '해운대해수욕장'),
        mkItem('11:00', '블루라인파크 해변열차', '체험', '블루라인파크 미포정거장', '예약 시간 30분 전 도착'),
        mkItem('13:00', '해운대 밀면', '식사', '해운대'),
        mkItem('15:00', '부산역 → 서울역 KTX', '이동', '부산역', '약 2시간 40분')
      ] }
    ];
    g.tickets = [
      { id: uid('tk'), type: '숙소 바우처', title: '경주 한옥스테이 (샘플)', ref: 'SAMPLE-KJ-1021', when: '1일차 20:00 체크인 · 2일차 11:00 체크아웃', note: '샘플 데이터입니다. 실제 예약이 아닙니다.', image: '', imageInfo: null },
      { id: uid('tk'), type: '패스 · 입장권', title: '블루라인파크 해변열차 (샘플)', ref: 'SAMPLE-BLUE-778', when: '3일차 11:00 탑승', note: '샘플 데이터입니다.', image: '', imageInfo: null },
      { id: uid('tk'), type: '기타', title: 'KTX 예매 내역 (샘플)', ref: 'SAMPLE-KTX-0042', when: '1일차 08:30 서울역 출발', note: '샘플 데이터입니다.', image: '', imageInfo: null }
    ];
    g.checklist = defaultChecklist('대한민국').map(function (c) {
      if (c.label === '신분증' || c.label === '교통 예매 내역' || c.label === '편한 운동화') c.done = true;
      return c;
    });
    g.budget.items = [
      { id: uid('bg'), label: 'KTX 왕복', amount: 118000, currency: 'KRW', category: '교통' },
      { id: uid('bg'), label: '숙소 2박', amount: 180000, currency: 'KRW', category: '숙박' },
      { id: uid('bg'), label: '식비', amount: 90000, currency: 'KRW', category: '식비' },
      { id: uid('bg'), label: '시내 교통', amount: 30000, currency: 'KRW', category: '교통' },
      { id: uid('bg'), label: '입장 · 체험', amount: 32000, currency: 'KRW', category: '관광' }
    ];
    g.food = [
      { id: uid('fd'), name: '황리단길 한옥 카페', type: '카페', hours: '10:00 - 21:00', memo: '경주 시내 도보권', city: '경주' },
      { id: uid('fd'), name: '서면 돼지국밥', type: '한식', hours: '09:00 - 22:00', memo: '아침 겸 점심으로', city: '부산' },
      { id: uid('fd'), name: '해운대 밀면', type: '한식', hours: '11:00 - 20:00', memo: '해운대역 도보 5분', city: '부산' },
      { id: uid('fd'), name: '광안리 야경 카페', type: '카페', hours: '12:00 - 23:00', memo: '광안대교 뷰', city: '부산' }
    ];
    g.info.lodging = [
      { id: uid('lg'), name: '경주 한옥스테이', address: '경주시 황리단길 인근', checkin: '20:00', checkout: '11:00', phone: '', city: '경주' },
      { id: uid('lg'), name: '해운대 오션뷰 호텔', address: '부산 해운대구 해운대해변로', checkin: '15:00', checkout: '11:00', phone: '', city: '부산' }
    ];
    g.info.memo = '경주는 도보 이동이 많아 편한 신발이 필수. 부산 2일차는 비가 오면 감천 대신 실내 위주로 변경.';
    out.push(g);

    /* ② 해외 샘플 — 도쿄 · 교토 3박 4일 */
    var j = blankTrip({
      title: '도쿄 · 교토 3박 4일', country: '일본',
      cities: ['도쿄', '교토'], start: tStart, end: addDaysISO(tStart, 3)
    });
    j.sample = true;
    j.days = [
      { n: 1, date: tStart, city: '도쿄', items: [
        mkItem('10:30', '인천 → 나리타', '이동', '나리타국제공항', '샘플 항공편 · 약 2시간 20분'),
        mkItem('14:00', '스카이라이너 → 우에노', '이동', '게이세이우에노역', '약 45분'),
        mkItem('15:30', '호텔 체크인', '핵심', '도쿄 우에노 호텔'),
        mkItem('18:30', '시부야 스크램블 교차로', '핵심', '시부야 스크램블 교차로'),
        mkItem('20:00', '시부야 이자카야 저녁', '식사', '시부야')
      ] },
      { n: 2, date: addDaysISO(tStart, 1), city: '도쿄', items: [
        mkItem('08:30', '쓰키지 장외시장 아침', '식사', '쓰키지 장외시장', '오전 일찍 붐빕니다'),
        mkItem('11:00', '센소지 · 아사쿠사', '핵심', '센소지'),
        mkItem('14:00', '아사쿠사 카페', '카페', '아사쿠사', '디저트 맛집 골목'),
        mkItem('16:00', '아키하바라', '체험', '아키하바라'),
        mkItem('19:00', '도쿄타워 전망', '핵심', '도쿄타워', '전망대 사전 예약 가능')
      ] },
      { n: 3, date: addDaysISO(tStart, 2), city: '교토', items: [
        mkItem('08:00', '신칸센 도쿄 → 교토', '이동', '도쿄역', '노조미 약 2시간 15분'),
        mkItem('11:00', '기요미즈데라', '핵심', '기요미즈데라', '이쓰쓰지역 하차 · 오르막'),
        mkItem('13:00', '니시키시장 점심', '식사', '니시키시장'),
        mkItem('15:30', '후시미 이나리 다이샤', '핵심', '후시미 이나리 다이샤', '토리이 터널 · 저녁 무렵 한산'),
        mkItem('19:00', '폰토초 저녁', '식사', '폰토초')
      ] },
      { n: 4, date: addDaysISO(tStart, 3), city: '교토', items: [
        mkItem('09:00', '아라시야마 대나무숲', '핵심', '아라시야마 대나무숲', '이른 시간이 한적'),
        mkItem('11:00', '도게츠교 카페', '카페', '도게츠교'),
        mkItem('13:00', '간사이공항으로 이동', '이동', '간사이국제공항', '하루카 약 1시간 20분'),
        mkItem('16:30', '간사이 → 인천', '이동', '간사이국제공항', '샘플 항공편')
      ] }
    ];
    j.tickets = [
      { id: uid('tk'), type: '항공 E-티켓', title: '인천 ↔ 나리타 (샘플)', ref: 'SAMPLE-AIR-703', when: '1일차 10:30 출발 · 4일차 16:30 귀국', note: '샘플 데이터입니다. 실제 예약이 아닙니다.', image: '', imageInfo: null },
      { id: uid('tk'), type: '패스 · 입장권', title: 'JR 패스 교환권 (샘플)', ref: 'SAMPLE-JR-2210', when: '3일차 신칸센부터 사용', note: '샘플 데이터입니다.', image: '', imageInfo: null },
      { id: uid('tk'), type: '숙소 바우처', title: '도쿄 · 교토 숙소 (샘플)', ref: 'SAMPLE-STAY-88', when: '1일차 15:30 체크인', note: '샘플 데이터입니다.', image: '', imageInfo: null }
    ];
    j.checklist = defaultChecklist('일본').map(function (c) {
      if (c.label === '여권' || c.label === '항공 E-티켓' || c.label === '보조배터리') c.done = true;
      return c;
    });
    j.budget.items = [
      { id: uid('bg'), label: '왕복 항공', amount: 420000, currency: 'KRW', category: '교통' },
      { id: uid('bg'), label: '숙소 3박', amount: 48000, currency: 'JPY', category: '숙박' },
      { id: uid('bg'), label: '식비', amount: 32000, currency: 'JPY', category: '식비' },
      { id: uid('bg'), label: '교통 · 신칸센', amount: 28000, currency: 'JPY', category: '교통' },
      { id: uid('bg'), label: '입장 · 체험', amount: 6000, currency: 'JPY', category: '관광' },
      { id: uid('bg'), label: '쇼핑', amount: 30000, currency: 'JPY', category: '쇼핑' }
    ];
    j.food = [
      { id: uid('fd'), name: '쓰키지 장외시장 스시', type: '일식', hours: '06:00 - 14:00', memo: '오전 방문 권장', city: '도쿄' },
      { id: uid('fd'), name: '아사쿠사 라멘', type: '일식', hours: '11:00 - 22:00', memo: '센소지 근처', city: '도쿄' },
      { id: uid('fd'), name: '니시키시장 군고구마 · 간식', type: '디저트', hours: '09:00 - 17:00', memo: '시장 안', city: '교토' },
      { id: uid('fd'), name: '폰토초 이자카야', type: '일식', hours: '17:00 - 24:00', memo: '예약 권장', city: '교토' }
    ];
    j.info.lodging = [
      { id: uid('lg'), name: '도쿄 우에노 호텔', address: '도쿄도 다이토구 우에노', checkin: '15:00', checkout: '11:00', phone: '', city: '도쿄' },
      { id: uid('lg'), name: '교토 시조 머치 호텔', address: '교토시 시모교구 시조', checkin: '15:00', checkout: '10:00', phone: '', city: '교토' }
    ];
    j.info.memo = '스이카 카드 잔액 확인. 4일차는 공항 이동 시간을 넉넉히 3시간 전 도착으로 계산.';
    out.push(j);

    return out;
  }

  /* ---------- persistence ---------- */
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (err) {
      toast('저장 공간이 부족해요. 티켓 사진을 줄이거나 백업 후 정리해 주세요.');
    }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      return normalizeState(JSON.parse(raw));
    } catch (err) {
      return null;
    }
  }

  function getTrip(id) {
    return state.trips.filter(function (t) { return t.id === id; })[0] || null;
  }
  function activeTrip() {
    var t = state.activeId ? getTrip(state.activeId) : null;
    if (t) return t;
    if (state.trips.length) {
      state.activeId = state.trips[0].id;
      return state.trips[0];
    }
    return null;
  }
  function touchTrip(t) { if (t) t.updatedAt = nowISO(); }

  /* ---------- map helpers ---------- */
  function itemMapContext(t, day, item) {
    var same = !item.country || normCountry(item.country) === normCountry((t && t.country) || '');
    return {
      country: item.country || (t && t.country) || '',
      city: item.city || (same ? ((day && day.city) || '') : ''),
      place: item.place || item.title || ''
    };
  }
  function mapInfo(t, o) {
    o = o || {};
    var country = o.country || (t && t.country) || '';
    var sameCountry = !o.country || normCountry(o.country) === normCountry((t && t.country) || '');
    var city = o.city || (sameCountry ? ((t && t.cities && t.cities[0]) || '') : '');
    var place = o.place || '';
    var q = [city, place].filter(Boolean).join(' ');
    var korea = isKorea(country);
    return {
      korea: korea,
      q: q,
      badge: korea ? '네이버 지도' : '구글 맵',
      cls: korea ? 'naver' : 'google',
      url: (korea ? 'https://map.naver.com/p/search/' : 'https://www.google.com/maps/search/?api=1&query=') + encodeURIComponent(q)
    };
  }
  function mapAnchor(t, o, label) {
    var m = mapInfo(t, o);
    return '<a class="map-btn ' + m.cls + '" href="' + esc(m.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' +
      esc((o.place || o.name || o.title || '장소') + ' — ' + m.badge + '에서 열기') + '">↗ ' + esc(label || '길찾기') +
      ' <span class="map-badge">' + m.badge + '</span></a>';
  }
  function placeLink(t, o) {
    var m = mapInfo(t, o);
    var name = o.place || o.name || o.title || '';
    return '<a class="place-link" href="' + esc(m.url) + '" target="_blank" rel="noopener noreferrer">📍 ' + esc(name) + '</a>';
  }

  /* ---------- 숙소 계획 (비교·선택 → 체크인/체크아웃 일정 자동 반영) ---------- */
  function lodgingById(t, id) {
    if (!t || !id) return null;
    return list(t.info.lodging).filter(function (l) { return l.id === id; })[0] || null;
  }

  /* 숙박일(밤) 목록 — DAY 1 밤 ~ 마지막 전날 밤 */
  function stayNights(t) {
    var days = list(t && t.days), out = [];
    for (var i = 0; i < days.length - 1; i++) {
      out.push({ n: i + 1, dayN: days[i].n, date: days[i].date, city: days[i].city || '' });
    }
    return out;
  }

  function stayDayByDate(t, iso) {
    return list(t && t.days).filter(function (d) { return d.date === iso; })[0] || null;
  }

  /* 날짜(밤) → 그 밤을 담당하는 숙박 구간 */
  function stayNightSegmentMap(t) {
    var map = {};
    list(t && t.info && t.info.stayPlan).forEach(function (seg) {
      var d = seg.checkinDate, guard = 0;
      while (d && d < seg.checkoutDate && guard < 400) {
        map[d] = seg;
        d = addDaysISO(d, 1);
        guard++;
      }
    });
    return map;
  }

  function staySegNights(seg) {
    return Math.max(1, dayCount(seg.checkinDate, seg.checkoutDate) - 1);
  }

  function stayAssignedNights(t) {
    var map = stayNightSegmentMap(t);
    return stayNights(t).filter(function (n) { return !!map[n.date]; }).length;
  }

  /* 밤별 숙소 id 맵 → 연속된 같은 숙소를 하나의 체크인~체크아웃 구간으로 재구성 */
  function rebuildStayPlan(t, nightIds) {
    var prev = list(t.info.stayPlan).slice();
    var out = [];
    var cur = null;
    stayNights(t).forEach(function (nt) {
      var lid = nightIds[nt.date] || '';
      if (!lid) { cur = null; return; }
      var lod = lodgingById(t, lid);
      if (!lod) { cur = null; return; }
      if (cur && cur.lodgingId === lid) { cur.checkoutDate = addDaysISO(nt.date, 1); return; }
      var sameDay = prev.filter(function (p) { return p.checkinDate === nt.date; })[0];
      var anySame = prev.filter(function (p) { return p.lodgingId === lid; })[0];
      cur = {
        id: sameDay ? sameDay.id : uid('sp'),
        lodgingId: lid,
        name: lod.name,
        city: lod.city || nt.city,
        checkinDate: nt.date,
        checkinTime: sameDay ? sameDay.checkinTime
          : (anySame ? anySame.checkinTime : (parseTime(lod.checkin) === null ? STAY_DEFAULT_IN : lod.checkin)),
        checkoutDate: addDaysISO(nt.date, 1),
        checkoutTime: anySame ? anySame.checkoutTime
          : (parseTime(lod.checkout) === null ? STAY_DEFAULT_OUT : lod.checkout),
        hideCheckin: sameDay ? !!sameDay.hideCheckin : false,
        hideCheckout: false
      };
      out.push(cur);
    });
    /* 같은 숙소로 다시 합쳐졌을 때 사용자가 고친 체크아웃 시각 유지 */
    out.forEach(function (seg) {
      var hit = prev.filter(function (p) {
        return p.lodgingId === seg.lodgingId && p.checkoutDate === seg.checkoutDate;
      })[0];
      if (!hit) return;
      if (parseTime(hit.checkoutTime) !== null) seg.checkoutTime = hit.checkoutTime;
      seg.hideCheckout = !!hit.hideCheckout;
    });
    t.info.stayPlan = out;
    return out;
  }

  function assignStayNight(t, date, lodgingId) {
    var map = stayNightSegmentMap(t);
    var ids = {};
    stayNights(t).forEach(function (n) { ids[n.date] = map[n.date] ? map[n.date].lodgingId : ''; });
    if (!(date in ids)) return false;
    ids[date] = String(lodgingId || '');
    rebuildStayPlan(t, ids);
    return true;
  }

  function assignAllStayNights(t, lodgingId) {
    var ids = {};
    stayNights(t).forEach(function (n) { ids[n.date] = String(lodgingId || ''); });
    rebuildStayPlan(t, ids);
  }

  function clearStaySegment(t, seg) {
    if (!t || !seg) return;
    var map = stayNightSegmentMap(t), ids = {};
    stayNights(t).forEach(function (n) {
      ids[n.date] = (map[n.date] && map[n.date].id === seg.id) ? '' : (map[n.date] ? map[n.date].lodgingId : '');
    });
    rebuildStayPlan(t, ids);
  }

  /* 구간의 체크인/체크아웃 날짜 변경 — 밤 배정을 다시 계산해 한 곳(밤 맵)에서만 관리 */
  function setStaySegmentDate(t, seg, kind, value) {
    if (!t || !seg || !value) return false;
    var map = stayNightSegmentMap(t), ids = {};
    stayNights(t).forEach(function (n) { ids[n.date] = map[n.date] ? map[n.date].lodgingId : ''; });
    var d, guard = 0;
    if (kind === 'checkin') {
      var end = seg.checkoutDate > value ? seg.checkoutDate : addDaysISO(value, 1);
      Object.keys(map).forEach(function (date) {
        if (map[date].id === seg.id && date < value) ids[date] = '';
      });
      d = value;
      while (d < end && guard++ < 400) {
        if (d in ids) ids[d] = seg.lodgingId;
        d = addDaysISO(d, 1);
      }
    } else {
      if (value <= seg.checkinDate) return false;
      Object.keys(map).forEach(function (date) {
        if (map[date].id === seg.id && date >= value) ids[date] = '';
      });
      d = seg.checkinDate;
      while (d < value && guard++ < 400) {
        if (d in ids) ids[d] = seg.lodgingId;
        d = addDaysISO(d, 1);
      }
    }
    rebuildStayPlan(t, ids);
    return true;
  }

  function stayItemFor(t, seg, kind, day) {
    var lod = lodgingById(t, seg.lodgingId);
    var name = (lod && lod.name) || seg.name || '숙소';
    var isIn = kind === 'stay-checkin';
    var bits = [];
    if (isIn) bits.push(staySegNights(seg) + '박');
    if (lod && lod.address) bits.push(lod.address);
    if (lod && lod.phone) bits.push('☎ ' + lod.phone);
    return {
      id: uid('it'),
      time: isIn ? seg.checkinTime : seg.checkoutTime,
      title: name + (isIn ? ' 체크인' : ' 체크아웃'),
      category: '숙박',
      city: (lod && lod.city) || seg.city || (day && day.city) || '',
      place: name,
      memo: bits.join(' · '),
      country: '',
      from: '', to: '', fromCountry: '', toCountry: '', mode: '', arr: '', leg: '',
      lat: lod && lod.lat !== '' && lod.lat !== undefined ? lod.lat : '',
      lon: lod && lod.lon !== '' && lod.lon !== undefined ? lod.lon : '',
      src: 'stay-plan',
      autoKind: kind,
      staySegId: seg.id
    };
  }

  /* 자동 생성 숙소 일정만 지우고 다시 만든다(중복 생성 없음) */
  function syncStayItems(t) {
    if (!t || !list(t.days).length) return { removed: 0, added: 0 };
    var removed = 0;
    t.days.forEach(function (d) {
      d.items = d.items.filter(function (x) {
        if (x.autoKind === 'stay-checkin' || x.autoKind === 'stay-checkout') { removed++; return false; }
        return true;
      });
    });
    var added = 0;
    list(t.info.stayPlan).forEach(function (seg) {
      if (!seg.hideCheckin) {
        var d1 = stayDayByDate(t, seg.checkinDate);
        if (d1) { d1.items.push(stayItemFor(t, seg, 'stay-checkin', d1)); added++; }
      }
      if (!seg.hideCheckout) {
        var d2 = stayDayByDate(t, seg.checkoutDate);
        if (d2) { d2.items.push(stayItemFor(t, seg, 'stay-checkout', d2)); added++; }
      }
    });
    t.days.forEach(function (d) { d.items.sort(sortByTime); });
    return { removed: removed, added: added };
  }

  function commitStay(t, msg) {
    var r = syncStayItems(t);
    touchTrip(t);
    save();
    render();
    if (msg) toast(msg + (r.added ? ' · 일정 ' + r.added + '건 반영' : ''));
  }

  /* 여행 기간이 바뀌거나 동기화로 데이터가 들어왔을 때 구간을 여행 범위에 맞춘다 */
  function reconcileStay(t) {
    if (!t) return;
    var dates = {};
    list(t.days).forEach(function (d) { dates[d.date] = 1; });
    t.info.stayPlan = list(t.info.stayPlan).filter(function (seg) {
      return dates[seg.checkinDate] && stayDayByDate(t, seg.checkoutDate) && lodgingById(t, seg.lodgingId);
    });
    syncStayItems(t);
  }

  function reconcileStayPlans() {
    list(state && state.trips).forEach(reconcileStay);
  }

  /* ---------- budget ---------- */
  function budgetSummary(t) {
    var totals = {};
    var rates = Object.assign({}, DEFAULT_RATES, (t.budget && t.budget.rates) || {});
    list(t.budget && t.budget.items).forEach(function (b) {
      var c = b.currency || 'KRW';
      totals[c] = (totals[c] || 0) + num(b.amount);
    });
    var krw = 0;
    Object.keys(totals).forEach(function (c) {
      krw += totals[c] * num(rates[c]);
    });
    return { totals: totals, rates: rates, krw: Math.round(krw) };
  }
  function ddayLabel(t) {
    var s = parseISO(t.start), e = parseISO(t.end);
    if (!s || !e) return '';
    var n = new Date();
    var today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    if (today < s) return 'D-' + Math.round((s - today) / 86400000);
    if (today > e) return '여행 완료';
    return '여행 중 D+' + (Math.round((today - s) / 86400000) + 1);
  }
  function nextUp(t) {
    if (!t || !t.days.length) return null;
    var n = new Date();
    var today = isoOf(n);
    var minutes = n.getHours() * 60 + n.getMinutes();
    var pool = t.days.filter(function (d) { return d.date >= today; });
    if (!pool.length) pool = t.days;
    for (var i = 0; i < pool.length; i++) {
      var d = pool[i];
      var items = list(d.items).slice().sort(sortByTime);
      for (var k = 0; k < items.length; k++) {
        var at = parseTime(items[k].time);
        if (d.date > today || at === null || at >= minutes) return { day: d, item: items[k] };
      }
    }
    if (t.days[0] && t.days[0].items.length) {
      return { day: t.days[0], item: t.days[0].items.slice().sort(sortByTime)[0] };
    }
    return null;
  }

  /* ---------- render: shell ---------- */
  function render() {
    var t = activeTrip();
    renderTopBar(t);
    renderTabs();
    var view = $('#view');
    if (!t) {
      view.innerHTML = noTripHTML();
      renderBottomNav();
      return;
    }
    if (!t.days.length) applyDays(t, dayCount(t.start, t.end));
    if (ui.day > t.days.length) ui.day = t.days.length;
    if (ui.day < 1) ui.day = 1;

    if (ui.tab === 'all') view.innerHTML = viewAll(t);
    else if (ui.tab === 'plan') view.innerHTML = viewPlan(t);
    else if (ui.tab === 'ticket') view.innerHTML = viewTickets(t);
    else if (ui.tab === 'ready') view.innerHTML = viewReady(t);
    else if (ui.tab === 'budget') view.innerHTML = viewBudget(t);
    else if (ui.tab === 'food') view.innerHTML = viewFood(t);
    else view.innerHTML = viewInfo(t);

    renderBottomNav();
  }

  function renderTopBar(t) {
    var flag = $('#tripFlag'), title = $('#tripPickTitle'), meta = $('#tripPickMeta');
    if (!t) {
      flag.textContent = 'TRIP';
      title.textContent = '여행이 없습니다';
      meta.textContent = '+ 새 여행으로 시작하세요';
      return;
    }
    flag.textContent = codeOf(t.country);
    title.textContent = t.title;
    meta.textContent = t.country + ' · ' + t.cities.join(' · ') + ' · ' + Math.max(0, t.days.length - 1) + '박 ' + t.days.length + '일';
  }

  function renderTabs() {
    $('#tabBar').innerHTML = TABS.map(function (tab) {
      var on = ui.tab === tab.id;
      return '<button type="button" class="tab" role="tab" id="tab-' + tab.id + '" data-action="tab" data-tab="' + tab.id +
        '" aria-selected="' + (on ? 'true' : 'false') + '" aria-controls="view"' +
        (on ? '' : ' tabindex="-1"') + '><span class="t-ico" aria-hidden="true">' + (ICONS[tab.icon] || '') + '</span><span>' + tab.label + '</span></button>';
    }).join('');
  }

  function renderBottomNav() {
    var i = TABS.reduce(function (acc, tab, idx) { return tab.id === ui.tab ? idx : acc; }, 0);
    $('#bottomNav').innerHTML =
      '<button type="button" class="bn-btn" data-action="prev-tab" aria-label="이전 탭"' + (i === 0 ? ' disabled' : '') + '>◀ 이전</button>' +
      '<div class="bn-center"><strong>' + TABS[i].label + '</strong><span>' + (i + 1) + ' / ' + TABS.length + '</span>' +
      '<div class="bn-dots" aria-hidden="true">' + TABS.map(function (x, idx) {
        return '<i class="' + (idx === i ? 'on' : '') + '"></i>';
      }).join('') + '</div></div>' +
      '<button type="button" class="bn-btn" data-action="next-tab" aria-label="다음 탭"' + (i === TABS.length - 1 ? ' disabled' : '') + '>다음 ▶</button>';
  }

  function noTripHTML() {
    return '<section class="hero"><div class="hero-top"><span class="hero-flag">🌏</span><span>새 여행</span></div>' +
      '<h2 class="hero-title">어디로 떠나시나요?</h2>' +
      '<p class="hero-dates">국가와 도시를 먼저 알려주시면 DAY 일정표와 지도 링크를 바로 만들어 드려요.</p></section>' +
      '<div class="empty-card"><span class="em">🧳</span><h3>아직 여행이 없어요</h3>' +
      '<p>새 여행을 만들면 7개 탭에 일정·티켓·준비물·예산·맛집·정보를<br>한 곳에서 관리할 수 있어요.</p>' +
      '<button type="button" class="btn btn-primary" data-action="new-trip">+ 새 여행 만들기</button></div>';
  }

  /* ---------- view: 전체 ---------- */
  function viewAll(t) {
    var days = t.days.length;
    var nights = Math.max(0, days - 1);
    var itemCount = t.days.reduce(function (n, d) { return n + d.items.length; }, 0);
    var doneCount = list(t.checklist).filter(function (c) { return c.done; }).length;
    var bs = budgetSummary(t);
    var next = nextUp(t);
    var ticketCount = t.tickets.length;

    return '' +
      '<section class="hero">' +
        '<div class="hero-top">' + flagBadge(t.country) + '<span>' + esc(t.country) + '</span>' +
          (t.sample ? '<span class="hero-sample">샘플 여행</span>' : '') +
          '<span class="hero-dday">' + esc(ddayLabel(t)) + '</span></div>' +
        '<h2 class="hero-title">' + esc(t.title) + '</h2>' +
        '<p class="hero-dates">' + esc(fmtDateRange(t.start, t.end)) + ' · ' + nights + '박 ' + days + '일</p>' +
        '<div class="hero-cities">' + t.cities.map(function (c) {
          return '<span class="city-chip">' + esc(c) + '</span>';
        }).join('') + '</div>' +
        '<div class="hero-stats">' +
          '<div><b>' + days + '</b><span>DAY</span></div>' +
          '<div><b>' + itemCount + '</b><span>일정</span></div>' +
          '<div><b>' + doneCount + '/' + list(t.checklist).length + '</b><span>준비</span></div>' +
          '<div><b>' + (bs.krw ? '₩' + compactKRW(bs.krw) : '—') + '</b><span>예산</span></div>' +
        '</div>' +
      '</section>' +
      legSummaryHTML(t) +
      (next ? (function () {
        var nctx = itemMapContext(t, next.day, next.item);
        return '<section class="next-card">' +
          '<div class="next-label">다음 일정 · DAY ' + next.day.n + ' ' + esc(next.day.city) + '</div>' +
          '<div class="next-main">' +
            '<strong class="next-time">' + esc(next.item.time) + '</strong>' +
            '<div class="next-body"><h3>' + esc(next.item.title) + '</h3>' +
              (next.item.place ? '<p>' + esc(next.item.place) + (next.item.memo ? ' · ' + esc(next.item.memo) : '') + '</p>'
                : (next.item.memo ? '<p>' + esc(next.item.memo) + '</p>' : '')) +
            '</div>' +
          '</div>' +
          '<div class="tl-links">' + mapAnchor(t, nctx, '길찾기') + '</div></section>';
      })() : '') +
      '<div class="quick-row">' +
        '<button type="button" class="quick" data-action="add-item"><span class="q-ico" aria-hidden="true">' + ICONS.plus + '</span>일정 추가</button>' +
        '<button type="button" class="quick" data-action="tab" data-tab="ticket"><span class="q-ico" aria-hidden="true">' + ICONS.ticket + '</span>티켓 ' + ticketCount + '</button>' +
        '<button type="button" class="quick" data-action="tab" data-tab="ready"><span class="q-ico" aria-hidden="true">' + ICONS.check + '</span>준비물</button>' +
        '<button type="button" class="quick" data-action="tab" data-tab="budget"><span class="q-ico" aria-hidden="true">' + ICONS.wallet + '</span>예산</button>' +
      '</div>' +
      '<div class="action-strip">' +
        '<button type="button" class="btn btn-primary" data-action="open-curation">✨ 동선 추천 채우기</button>' +
        '<button type="button" class="btn btn-ghost" data-action="add-leg">🚆 도시·국가 이동 추가</button>' +
      '</div>' +
      '<section class="panel">' +
        '<div class="section-head"><div><h2>DAY 한눈에</h2><p>탭하면 그날 일정으로 이동합니다</p></div>' +
          '<button type="button" class="link-btn" data-action="trip-edit">여행 정보 수정</button></div>' +
        '<div class="day-list">' + t.days.map(function (d) { return dayRow(d); }).join('') + '</div>' +
      '</section>';
  }

  function legSummaryHTML(t) {
    var rows = [];
    if (t.outbound && t.outbound.from) rows.push(['첫날 출발', t.outbound]);
    if (t.inbound && t.inbound.from) rows.push(['마지막 날 귀환', t.inbound]);
    if (!rows.length) return '';
    return '<section class="panel leg-panel">' +
      '<div class="section-head"><div><h2>출발 · 귀환</h2><p>설정한 이동이 DAY 1과 마지막 DAY에 들어 있습니다</p></div>' +
        '<button type="button" class="link-btn" data-action="jump-day" data-day="1">일정 보기</button></div>' +
      rows.map(function (r) {
        var l = r[1];
        return '<div class="leg-sum-row">' +
          '<span class="leg-tag">' + esc(r[0]) + '</span>' +
          '<span class="leg-sum-route">' + esc(l.from) + ' → ' + esc(l.to) + '</span>' +
          '<span class="leg-sum-meta">' + esc([MODE_EMOJI[l.mode] || '', l.mode, l.dep ? l.dep + (l.arr ? '–' + l.arr : '') : ''].filter(Boolean).join(' ')) + '</span>' +
        '</div>';
      }).join('') + '</section>';
  }

  function dayRow(d) {
    var preview = d.items.length
      ? d.items.slice(0, 2).map(function (i) { return i.title; }).join(' · ')
      : '일정 없음';
    return '<button type="button" class="day-row" data-action="jump-day" data-day="' + d.n + '">' +
      '<span class="dr-day">DAY ' + d.n + '</span>' +
      '<span class="dr-mid"><strong>' + esc(d.city) + '</strong><small>' + esc(dateLabel(d.date)) + ' · ' + esc(preview) + '</small></span>' +
      '<span class="dr-count">' + d.items.length + '</span></button>';
  }

  /* ---------- view: 일정 ---------- */
  function viewPlan(t) {
    var day = t.days.filter(function (d) { return d.n === ui.day; })[0] || t.days[0] || null;
    return '' +
      '<div class="section-head">' +
        '<div><h2>일정</h2><p>' + esc(t.cities.join(' · ')) + ' · ' + t.days.length + '일</p></div>' +
        '<div class="head-actions">' +
          '<button type="button" class="btn btn-primary btn-sm" data-action="add-item">＋ 일정</button>' +
          '<button type="button" class="btn btn-soft btn-sm" data-action="add-leg" aria-label="도시·국가 이동 추가">🚆 도시·국가 이동</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="open-curation" aria-label="동선 추천 채우기">✨ 동선 추천</button>' +
        '</div>' +
      '</div>' +
      '<div class="day-strip" role="tablist" aria-label="DAY 선택">' + t.days.map(function (d) {
        return '<button type="button" class="day-pill' + (d.n === ui.day && !ui.allDays ? ' active' : '') +
          '" data-action="select-day" data-day="' + d.n + '"><b>DAY ' + d.n + '</b><small>' + esc(d.city) + '</small></button>';
      }).join('') + '</div>' +
      '<div class="strip-tools"><button type="button" class="link-btn" data-action="toggle-all-days">' +
        (ui.allDays ? '선택한 날짜만 보기' : '전체 DAY 펼쳐 보기') + '</button></div>' +
      (ui.allDays
        ? t.days.map(function (d) { return daySection(t, d); }).join('')
        : (day ? daySection(t, day) : ''));
  }

  function daySection(t, d) {
    var opts = t.cities.slice();
    if (opts.indexOf(d.city) < 0) opts.unshift(d.city);
    return '<section class="day-block" data-day-block="' + d.n + '">' +
      '<div class="day-head">' +
        '<div class="dh-left">' +
          '<span class="dh-day">DAY ' + d.n + '</span>' +
          '<span class="dh-date">' + esc(dateLabel(d.date)) + '</span>' +
          '<select class="mini-select" data-change="day-city" data-day="' + d.n + '" aria-label="DAY ' + d.n + ' 도시">' +
            opts.map(function (c) {
              return '<option value="' + esc(c) + '"' + (c === d.city ? ' selected' : '') + '>' + esc(c) + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<button type="button" class="btn btn-soft btn-sm" data-action="shift-day" data-day="' + d.n + '">＋1시간 순연</button>' +
      '</div>' +
      (d.items.length
        ? '<div class="timeline">' + d.items.slice().sort(sortByTime).map(function (it) { return itemCard(t, d, it); }).join('') + '</div>'
        : '<div class="empty-card" style="margin-top:10px"><span class="em">🗓</span><h3>이 날은 아직 비어 있어요</h3><p>일정을 추가하면 시간 순서대로 타임라인에 쌓입니다.</p>' +
          '<button type="button" class="btn btn-primary" data-action="add-item" data-day="' + d.n + '">+ 일정 추가</button></div>') +
      '</section>';
  }

  function itemCard(t, d, it) {
    var cat = CATS[it.category] || CATS['핵심'];
    var ctx = itemMapContext(t, d, it);
    var noMap = it.src === 'skeleton';
    if (it.from && it.to) return moveCard(t, d, it);
    return '<article class="tl-item" data-item="' + it.id + '">' +
      '<div class="tl-time"><strong>' + esc(it.time) + '</strong></div>' +
      '<div class="tl-rail"><span class="dot" style="background:' + cat.color + '"></span></div>' +
      '<div class="tl-card">' +
        '<div class="tl-top">' +
          '<span class="cat ' + cat.cls + '">' + cat.emoji + ' ' + esc(it.category) + '</span>' +
          '<span class="city-badge">' + esc(it.city || d.city) + '</span>' +
          '<span class="tl-actions">' +
            '<button type="button" class="icon-btn shift-btn" data-action="shift-item" data-id="' + it.id + '" title="이 일정부터 1시간 순연" aria-label="이 일정부터 1시간 순연">＋1h</button>' +
            '<button type="button" class="icon-btn" data-action="edit-item" data-id="' + it.id + '" aria-label="일정 수정">' + ICONS.edit + '</button>' +
            '<button type="button" class="icon-btn danger" data-action="del-item" data-id="' + it.id + '" aria-label="일정 삭제">' + ICONS.trash + '</button>' +
          '</span>' +
        '</div>' +
        '<h3>' + esc(it.title) + '</h3>' +
        ((it.place && !noMap) ? placeLink(t, ctx) : '') +
        (it.memo ? '<p class="memo">' + esc(it.memo) + '</p>' : '') +
        '<div class="tl-links">' +
          (noMap ? '<span class="city-badge">추천 DB에 없는 도시 · 장소명을 직접 입력하세요</span>' : mapAnchor(t, ctx, '길찾기')) +
          (it.country ? '<span class="city-badge">' + esc(it.country) + ' 기준</span>' : '') +
        '</div>' +
      '</div></article>';
  }

  /* 출발·귀환·구간 이동 카드 — 출발지/도착지 지도가 각각 열립니다 */
  function legMapAnchor(country, token, label) {
    var korea = isKorea(country);
    var url = (korea ? 'https://map.naver.com/p/search/' : 'https://www.google.com/maps/search/?api=1&query=') + encodeURIComponent(token);
    var badge = korea ? '네이버' : '구글';
    var full = korea ? '네이버 지도' : '구글 맵';
    return '<a class="map-btn ' + (korea ? 'naver' : 'google') + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="' +
      esc(token + ' — ' + full + '에서 열기') + '">↗ ' + esc(label) +
      ' <span class="map-badge">' + badge + '</span></a>';
  }

  function moveCard(t, d, it) {
    var mode = it.mode || '';
    var emoji = MODE_EMOJI[mode] || '🚏';
    var kindTag = it.leg === 'outbound' ? '출발' : it.leg === 'inbound' ? '귀환' : '구간 이동';
    var fromMap = legMapAnchor(it.fromCountry, it.from, '출발지');
    var toMap = legMapAnchor(it.toCountry, it.to, '도착지');
    return '<article class="tl-item" data-item="' + it.id + '" data-leg="' + esc(it.leg || '') + '">' +
      '<div class="tl-time"><strong>' + esc(it.time) + '</strong></div>' +
      '<div class="tl-rail"><span class="dot" style="background:#2A5FA8"></span></div>' +
      '<div class="tl-card leg-card">' +
        '<div class="tl-top">' +
          '<span class="cat c-move">' + emoji + ' 이동</span>' +
          (mode ? '<span class="mode-badge">' + emoji + ' ' + esc(mode) + '</span>' : '') +
          '<span class="leg-kind">' + esc(kindTag) + '</span>' +
          '<span class="tl-actions">' +
            '<button type="button" class="icon-btn" data-action="edit-item" data-id="' + it.id + '" aria-label="이동 수정">' + ICONS.edit + '</button>' +
            '<button type="button" class="icon-btn danger" data-action="del-item" data-id="' + it.id + '" aria-label="이동 삭제">' + ICONS.trash + '</button>' +
          '</span>' +
        '</div>' +
        '<div class="leg-route">' +
          '<span class="leg-stop"><b>' + esc(it.from) + '</b><small>' + esc(it.fromCountry || '') + '</small></span>' +
          '<span class="leg-arrow" aria-hidden="true">→</span>' +
          '<span class="leg-stop"><b>' + esc(it.to) + '</b><small>' + esc(it.toCountry || '') + '</small></span>' +
        '</div>' +
        '<p class="leg-meta">' + esc(it.time) + ' 출발' + (it.arr ? ' · ' + esc(it.arr) + ' 도착' : '') +
          (it.memo ? ' · ' + esc(it.memo) : '') + '</p>' +
        '<div class="tl-links">' + fromMap + toMap + '</div>' +
      '</div></article>';
  }

  /* ---------- view: 티켓 ---------- */
  function viewTickets(t) {
    return '' +
      '<div class="section-head"><div><h2>티켓 지갑</h2><p>사진을 등록하면 비행기 모드에서도 원본을 열 수 있어요</p></div>' +
        '<button type="button" class="btn btn-primary" data-action="add-ticket">+ 티켓</button></div>' +
      (t.tickets.length
        ? '<div class="ticket-grid">' + t.tickets.map(function (k) { return ticketCard(k); }).join('') + '</div>'
        : '<div class="empty-card"><span class="em">🎫</span><h3>등록된 티켓이 없어요</h3><p>항공 E-티켓, 렌터카 확인서, 숙소 바우처, 패스 · 입장권을<br>사진까지 함께 보관해 두세요.</p></div>') +
      '<button type="button" class="add-tile" data-action="add-ticket">＋ 티켓 · 예약 확인서 추가</button>';
  }

  function ticketCard(k) {
    return '<article class="ticket-card" data-ticket="' + k.id + '">' +
      '<div class="ticket-head"><span class="ticket-type">' + esc(k.type) + '</span>' +
        '<span class="offline-tag' + (k.image ? ' on' : '') + '">' + (k.image ? '● 오프라인 저장됨' : '○ 사진 미등록') + '</span></div>' +
      '<h3>' + esc(k.title) + '</h3>' +
      (k.ref ? '<p class="ticket-ref">예약번호 <b>' + esc(k.ref) + '</b></p>' : '') +
      (k.when ? '<p class="ticket-when">' + esc(k.when) + '</p>' : '') +
      '<div class="ticket-thumb">' + (k.image
        ? '<img src="' + esc(k.image) + '" alt="' + esc(k.title) + ' 원본 미리보기" loading="lazy">'
        : '<span>🎫 사진을 등록하면 오프라인에서도 원본을 볼 수 있어요</span>') + '</div>' +
      '<div class="ticket-actions">' +
        '<button type="button" class="btn btn-dark" data-action="view-ticket" data-id="' + k.id + '">🎫 원본 보기</button>' +
        '<button type="button" class="icon-btn" data-action="edit-ticket" data-id="' + k.id + '" aria-label="티켓 수정">' + ICONS.edit + '</button>' +
        '<button type="button" class="icon-btn danger" data-action="del-ticket" data-id="' + k.id + '" aria-label="티켓 삭제">' + ICONS.trash + '</button>' +
      '</div></article>';
  }

  /* ---------- view: 준비 ---------- */
  function viewReady(t) {
    var checks = list(t.checklist);
    var done = checks.filter(function (c) { return c.done; }).length;
    var pct = checks.length ? Math.round(done / checks.length * 100) : 0;
    var groups = CHECK_GROUPS.map(function (g) {
      return { name: g, items: checks.filter(function (c) { return c.group === g; }) };
    }).filter(function (g) { return g.items.length; });

    return '' +
      '<div class="section-head"><div><h2>준비물</h2><p>체크하면 이 기기에 바로 저장됩니다</p></div>' +
        '<span class="pct-badge">' + pct + '%</span></div>' +
      '<div class="progress-card">' +
        '<div class="progress-top"><span>완료 <b>' + done + '</b> / ' + checks.length + '</span>' +
        '<span>' + (checks.length - done) + '개 남음</span></div>' +
        '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '</div>' +
      groups.map(function (g) {
        var gd = g.items.filter(function (c) { return c.done; }).length;
        return '<div class="check-group"><div class="cg-head"><h3>' + esc(g.name) + '</h3><span>' + gd + '/' + g.items.length + '</span></div>' +
          g.items.map(function (c) {
            return '<div class="check-item' + (c.done ? ' done' : '') + '">' +
              '<input type="checkbox" id="ck-' + c.id + '" data-check="' + c.id + '"' + (c.done ? ' checked' : '') + '>' +
              '<label for="ck-' + c.id + '">' + esc(c.label) + '</label>' +
              '<button type="button" class="icon-btn" data-action="edit-check" data-id="' + c.id + '" aria-label="' + esc(c.label) + ' 수정">' + ICONS.edit + '</button>' +
              '<button type="button" class="icon-btn danger" data-action="del-check" data-id="' + c.id + '" aria-label="' + esc(c.label) + ' 삭제">' + ICONS.trash + '</button>' +
            '</div>';
          }).join('') + '</div>';
      }).join('') +
      '<form class="inline-form" data-form="check">' +
        '<input type="text" name="label" placeholder="준비물 추가 (예: 유심, 여권 사본)" maxlength="60" required aria-label="준비물 이름">' +
        '<select name="group" aria-label="준비물 분류">' + CHECK_GROUPS.map(function (g) {
          return '<option value="' + esc(g) + '">' + esc(g) + '</option>';
        }).join('') + '</select>' +
        '<button type="submit" class="btn btn-primary">추가</button>' +
      '</form>';
  }

  /* ---------- view: 예산 ---------- */
  function refreshCheckStats(t) {
    var checks = list(t.checklist);
    var total = checks.length;
    var done = checks.filter(function (c) { return c.done; }).length;
    var pct = total ? Math.round(done / total * 100) : 0;
    var b = $('.progress-top b');
    if (b) b.textContent = done;
    var left = $('.progress-top span:last-child');
    if (left) left.textContent = (total - done) + '개 남음';
    var bar = $('.bar i');
    if (bar) bar.style.width = pct + '%';
    var prog = $('.bar');
    if (prog) prog.setAttribute('aria-valuenow', String(pct));
    var badge = $('.pct-badge');
    if (badge) badge.textContent = pct + '%';
    Array.prototype.forEach.call(document.querySelectorAll('.check-group'), function (g) {
      var head = g.querySelector('h3');
      if (!head) return;
      var name = head.textContent;
      var items = checks.filter(function (c) { return c.group === name; });
      var gd = items.filter(function (c) { return c.done; }).length;
      var sp = g.querySelector('.cg-head span');
      if (sp) sp.textContent = gd + '/' + items.length;
    });
  }

  function viewBudget(t) {
    var bs = budgetSummary(t);
    var curs = Object.keys(bs.totals);
    var used = curs.length ? curs : ['KRW'];
    return '' +
      '<div class="section-head"><div><h2>예산</h2><p>통화별 지출과 원화 환산 총액을 함께 계산합니다</p></div>' +
        '<button type="button" class="btn btn-primary" data-action="add-budget">+ 지출</button></div>' +
      '<div class="money-grid">' +
        (curs.length ? curs.map(function (c) {
          return '<div class="money-card"><span class="mc-cur">' + esc(c) + ' · ' + esc((CUR[c] && CUR[c].name) || '') + '</span>' +
            '<strong class="mc-val">' + curSymbol(c) + fmtNum(bs.totals[c]) + '</strong></div>';
        }).join('') : '<div class="money-card"><span class="mc-cur">지출 없음</span><strong class="mc-val">₩0</strong></div>') +
        '<div class="money-card total"><span class="mc-cur">총액 · 원화 환산</span><strong class="mc-val">₩' + fmtNum(bs.krw) + '</strong>' +
          '<small>아래 참고 환율 기준</small></div>' +
      '</div>' +
      (list(t.budget.items).length
        ? '<div class="budget-list">' + t.budget.items.map(function (b) { return budgetRow(b); }).join('') + '</div>'
        : '<div class="empty-card"><span class="em">₩</span><h3>지출 내역이 없어요</h3><p>교통 · 숙박 · 식비를 입력하면 통화별 합계와<br>원화 환산 총액이 자동으로 계산됩니다.</p></div>') +
      '<details class="rates"><summary>참고 환율 설정 (1 단위 = ? 원)</summary>' +
        '<p class="hint">원화 환산에만 쓰는 참고 값입니다. 여행 전 실제 환율로 고쳐 두세요.</p>' +
        Object.keys(CUR).filter(function (c) { return c !== 'KRW'; }).map(function (c) {
          return '<div class="rate-row"><span>1 ' + c + '</span>' +
            '<input type="number" inputmode="decimal" step="0.001" min="0" value="' + esc(bs.rates[c] !== undefined ? bs.rates[c] : DEFAULT_RATES[c]) + '" data-rate="' + c + '" aria-label="' + c + ' 환율">' +
            '<span>원</span></div>';
        }).join('') +
      '</details>';
  }

  function budgetRow(b) {
    return '<div class="b-row" data-budget="' + b.id + '">' +
      '<span class="b-cat">' + esc(b.category) + '</span>' +
      '<span class="b-label">' + esc(b.label) + '</span>' +
      '<strong class="b-amt">' + curSymbol(b.currency) + fmtNum(b.amount) + '</strong>' +
      '<span class="b-tools">' +
        '<button type="button" class="icon-btn" data-action="edit-budget" data-id="' + b.id + '" aria-label="지출 수정">' + ICONS.edit + '</button>' +
        '<button type="button" class="icon-btn danger" data-action="del-budget" data-id="' + b.id + '" aria-label="지출 삭제">' + ICONS.trash + '</button>' +
      '</span></div>';
  }

  /* ---------- view: 맛집 ---------- */
  function viewFood(t) {
    return '' +
      '<div class="section-head"><div><h2>맛집</h2><p>장소를 누르면 지도에서 바로 열립니다</p></div>' +
        '<button type="button" class="btn btn-primary" data-action="add-food">+ 맛집</button></div>' +
      (t.food.length
        ? '<div class="place-grid">' + t.food.map(function (f) {
          return '<article class="place-card" data-food="' + f.id + '">' +
            '<div class="place-head"><span class="type-badge">' + esc(f.type) + '</span>' +
              '<span class="city-badge">' + esc(f.city || t.cities[0]) + '</span></div>' +
            '<h3>' + esc(f.name) + '</h3>' +
            (f.hours ? '<p class="place-meta">🕒 ' + esc(f.hours) + '</p>' : '') +
            (f.memo ? '<p class="place-meta muted">' + esc(f.memo) + '</p>' : '') +
            '<div class="place-actions">' +
              mapAnchor(t, { city: f.city || (t.cities[0] || ''), place: f.name, country: t.country }, '길찾기') +
              '<button type="button" class="icon-btn" data-action="edit-food" data-id="' + f.id + '" aria-label="맛집 수정">' + ICONS.edit + '</button>' +
              '<button type="button" class="icon-btn danger" data-action="del-food" data-id="' + f.id + '" aria-label="맛집 삭제">' + ICONS.trash + '</button>' +
            '</div></article>';
        }).join('') + '</div>'
        : '<div class="empty-card"><span class="em">🍜</span><h3>맛집 목록이 비어 있어요</h3><p>가고 싶은 식당과 카페를 미리 담아두면<br>여행지에서 지도로 바로 길을 찾을 수 있어요.</p></div>') +
      '<button type="button" class="add-tile" data-action="add-food">＋ 맛집 추가</button>';
  }

  /* ---------- view: 정보 ---------- */
  function stayCityGroups(t) {
    var groups = [];
    list(t.info.lodging).forEach(function (l) {
      var c = l.city || (t.cities[0] || '');
      var g = groups.filter(function (x) { return x.city === c; })[0];
      if (!g) { g = { city: c, items: [] }; groups.push(g); }
      g.items.push(l);
    });
    var order = t.cities.slice();
    groups.sort(function (a, b) {
      var ia = order.indexOf(a.city), ib = order.indexOf(b.city);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return groups;
  }

  function stayOptionsHtml(t, curId, cityFirst, alwaysCity) {
    var groups = stayCityGroups(t);
    if (cityFirst) {
      groups = groups.slice().sort(function (a, b) {
        return (a.city === cityFirst ? 0 : 1) - (b.city === cityFirst ? 0 : 1);
      });
    }
    return groups.map(function (g) {
      return '<optgroup label="' + esc(g.city || '기타') + '">' + g.items.map(function (l) {
        var showCity = alwaysCity || (cityFirst && g.city !== cityFirst);
        return '<option value="' + esc(l.id) + '"' + (l.id === curId ? ' selected' : '') + '>' + esc(l.name) +
          (showCity && g.city ? ' · ' + esc(g.city) : '') + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }

  function stayCardHtml(t, l, nights, segMap) {
    var mine = nights.filter(function (n) {
      var s = segMap[n.date];
      return s && s.lodgingId === l.id;
    });
    var chips = nights.map(function (n) {
      var s = segMap[n.date];
      var on = !!(s && s.lodgingId === l.id);
      return '<button type="button" class="sn-chip' + (on ? ' on' : '') + '" data-action="stay-night-toggle" data-date="' + esc(n.date) +
        '" data-lodging="' + esc(l.id) + '" aria-pressed="' + (on ? 'true' : 'false') + '" title="' +
        esc('DAY ' + n.dayN + ' 밤 · ' + fullDateLabel(n.date) + ' · ' + n.city) + '">DAY ' + n.dayN + '</button>';
    }).join('');
    var sub = [l.city, l.zone].filter(Boolean).join(' · ');
    return '<article class="sc-card' + (mine.length ? ' on' : '') + '">' +
      '<div class="sc-top"><h4>' + esc(l.name) + '</h4>' +
        (mine.length ? '<span class="sc-count">' + mine.length + '박</span>' : '') + '</div>' +
      (sub ? '<p class="sc-sub">' + esc(sub) + '</p>' : '') +
      (l.memo ? '<p class="sc-memo">' + esc(l.memo) + '</p>' : '') +
      (l.address ? '<p class="sc-meta">' + esc(l.address) + '</p>' : '') +
      (l.phone ? '<p class="sc-meta muted">☎ ' + esc(l.phone) + '</p>' : '') +
      '<div class="sc-nights"><span class="sc-nlb">박 지정</span>' + chips + '</div>' +
      '<div class="sc-actions">' +
        mapAnchor(t, { city: l.city || (t.cities[0] || ''), place: l.address || l.name, country: t.country }, '지도') +
        '<button type="button" class="icon-btn" data-action="edit-lodging" data-id="' + l.id + '" aria-label="숙소 수정">' + ICONS.edit + '</button>' +
        '<button type="button" class="icon-btn danger" data-action="del-lodging" data-id="' + l.id + '" aria-label="숙소 삭제">' + ICONS.trash + '</button>' +
      '</div></article>';
  }

  function stayNightRowsHtml(t, nights, segMap) {
    return '<div class="stay-nights">' +
      '<div class="sn-title"><b>박별 숙소 배정</b><span>체크인 날짜 기준</span></div>' +
      nights.map(function (n) {
        var s = segMap[n.date];
        var cur = s ? s.lodgingId : '';
        return '<div class="sn-row">' +
          '<div class="sn-day"><b>DAY ' + n.dayN + ' 밤</b><small>' + esc(dateLabel(n.date)) + ' · ' + esc(n.city) + '</small></div>' +
          '<select class="sn-select" data-change="stay-night" data-date="' + esc(n.date) + '" aria-label="DAY ' + n.dayN + ' 밤 숙소 선택">' +
            '<option value=""' + (cur ? '' : ' selected') + '>미배정</option>' + stayOptionsHtml(t, cur, n.city) +
          '</select>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function staySegmentsHtml(t, nights) {
    var segs = list(t.info.stayPlan).slice().sort(function (a, b) {
      return a.checkinDate < b.checkinDate ? -1 : a.checkinDate > b.checkinDate ? 1 : 0;
    });
    var head = '<div class="sp-title"><b>체크인 · 체크아웃 일정</b><span>' + segs.length + '개 구간</span></div>';
    if (!segs.length) {
      return '<div class="stay-plan">' + head +
        '<p class="hint">위에서 밤마다 숙소를 고르면 여기에 체크인·체크아웃 시간이 만들어지고, <b>일정</b> 탭에 자동으로 들어갑니다.</p></div>';
    }
    var dayOpts = function (cur) {
      return t.days.map(function (d) {
        return '<option value="' + esc(d.date) + '"' + (d.date === cur ? ' selected' : '') + '>DAY ' + d.n + ' · ' + esc(dateLabel(d.date)) + '</option>';
      }).join('');
    };
    var cards = segs.map(function (seg) {
      var lod = lodgingById(t, seg.lodgingId);
      var nm = (lod && lod.name) || seg.name;
      return '<article class="sp-card" data-seg="' + esc(seg.id) + '">' +
        '<div class="sp-top"><b>' + esc(nm) + '</b>' +
          '<span class="sp-badge">' + staySegNights(seg) + '박</span>' +
          (lod && lod.city ? '<span class="city-badge">' + esc(lod.city) + '</span>' : '') + '</div>' +
        '<div class="sp-fields">' +
          '<label class="sp-field"><span>체크인</span>' +
            '<select data-change="stay-seg-date" data-seg="' + esc(seg.id) + '" data-kind="checkin" aria-label="체크인 날짜">' + dayOpts(seg.checkinDate) + '</select>' +
            '<input type="time" value="' + esc(seg.checkinTime) + '" data-change="stay-seg-time" data-seg="' + esc(seg.id) + '" data-kind="checkin" aria-label="체크인 시간">' +
          '</label>' +
          '<label class="sp-field"><span>체크아웃</span>' +
            '<select data-change="stay-seg-date" data-seg="' + esc(seg.id) + '" data-kind="checkout" aria-label="체크아웃 날짜">' + dayOpts(seg.checkoutDate) + '</select>' +
            '<input type="time" value="' + esc(seg.checkoutTime) + '" data-change="stay-seg-time" data-seg="' + esc(seg.id) + '" data-kind="checkout" aria-label="체크아웃 시간">' +
          '</label>' +
        '</div>' +
        '<div class="sp-actions">' +
          mapAnchor(t, { city: (lod && lod.city) || seg.city, place: (lod && lod.address) || nm, country: t.country }, '지도') +
          (seg.hideCheckin ? '<button type="button" class="btn btn-ghost btn-sm" data-action="stay-unhide" data-seg="' + esc(seg.id) + '" data-kind="checkin">체크인 다시 넣기</button>' : '') +
          (seg.hideCheckout ? '<button type="button" class="btn btn-ghost btn-sm" data-action="stay-unhide" data-seg="' + esc(seg.id) + '" data-kind="checkout">체크아웃 다시 넣기</button>' : '') +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="stay-seg-del" data-seg="' + esc(seg.id) + '">구간 해제</button>' +
        '</div>' +
      '</article>';
    }).join('');
    return '<div class="stay-plan">' + head + cards +
      '<p class="hint">저장하면 <b>일정</b> 탭의 체크인·체크아웃 카드가 시간순으로 다시 정렬됩니다. 같은 숙소로 이어지면 중복 없이 한 구간으로 합쳐집니다.</p></div>';
  }

  function staySectionHtml(t) {
    var nights = stayNights(t);
    var segMap = stayNightSegmentMap(t);
    var lodging = list(t.info.lodging);
    var assigned = stayAssignedNights(t);
    var head = '<div class="section-head"><div><h2>숙소 비교 · 선택</h2><p>추천 숙소를 비교해 밤마다 고르면 체크인·체크아웃이 일정에 자동 반영됩니다</p></div>' +
      '<div class="head-actions">' +
        '<button type="button" class="btn btn-soft btn-sm" data-action="stay-recommend">✨ 추천 숙소</button>' +
        '<button type="button" class="btn btn-soft btn-sm" data-action="add-lodging">+ 숙소</button>' +
      '</div></div>';

    if (!nights.length) {
      return '<section class="panel stay-panel">' + head +
        '<div class="empty-card" style="margin-top:8px"><span class="em">🛏</span><h3>1박 이상 여행에서 숙소를 고를 수 있어요</h3>' +
        '<p>여행 기간을 늘리면 DAY별로 숙소를 배정하고<br>체크인·체크아웃을 일정에 넣을 수 있습니다.</p></div>' +
      '</section>';
    }

    var summary = '<div class="stay-sum">' +
      '<span class="ss-item"><b>' + nights.length + '박 ' + t.days.length + '일</b><small>숙박 일정</small></span>' +
      '<span class="ss-item"><b>' + assigned + ' / ' + nights.length + '박</b><small>숙소 배정</small></span>' +
      '<span class="ss-item"><b>' + list(t.info.stayPlan).length + '</b><small>체크인 구간</small></span>' +
    '</div>';

    if (!lodging.length) {
      return '<section class="panel stay-panel">' + head + summary +
        '<div class="empty-card" style="margin-top:10px"><span class="em">🛏</span><h3>비교할 숙소가 없어요</h3>' +
        '<p>여행 도시의 추천 숙소를 한 번에 담아 비교하거나,<br>직접 예약한 숙소를 추가해 보세요.</p>' +
        '<div class="empty-actions">' +
          '<button type="button" class="btn btn-primary" data-action="stay-recommend">✨ 추천 숙소 불러오기</button>' +
          '<button type="button" class="btn btn-soft" data-action="add-lodging">+ 숙소 직접 추가</button>' +
        '</div></div></section>';
    }

    var unfilled = nights.length - assigned;
    var body =
      (unfilled > 0
        ? '<p class="stay-alert">' + unfilled + '박이 아직 비어 있어요 · 아래에서 숙소를 골라 주세요</p>'
        : '<p class="stay-alert ok">모든 박에 숙소가 배정됐어요</p>') +
      '<div class="stay-quick"><label for="stayAll"><span>전 일정 같은 숙소</span>' +
        '<select id="stayAll" data-change="stay-all"><option value="">선택 안 함</option>' + stayOptionsHtml(t, '', '', true) + '</select>' +
      '</label></div>' +
      stayNightRowsHtml(t, nights, segMap) +
      '<div class="stay-cmp"><div class="sc-head"><b>후보 비교</b><span>' + lodging.length + '곳 · 박 버튼을 누르면 바로 배정</span></div>' +
        stayCityGroups(t).map(function (g) {
          return '<div class="sc-city"><h3>' + esc(g.city || '기타') + ' <small>' + g.items.length + '</small></h3>' +
            '<div class="sc-grid">' + g.items.map(function (l) { return stayCardHtml(t, l, nights, segMap); }).join('') + '</div></div>';
        }).join('') +
      '</div>' +
      staySegmentsHtml(t, nights);

    return '<section class="panel stay-panel">' + head + summary + body + '</section>';
  }

  function viewInfo(t) {
    var auto = EMERGENCY[normCountry(t.country)] || [];
    var overseas = !isKorea(t.country);
    return '' +
      staySectionHtml(t) +
      '<section class="panel"><div class="section-head"><div><h2>긴급 연락처</h2><p>' + esc(t.country) + ' 기준 자동 안내</p></div></div>' +
        '<div class="info-block">' +
          auto.map(function (row) {
            return '<div class="emergency-row"><span>' + esc(row[0]) + '</span>' +
              '<a href="tel:' + esc(String(row[1]).replace(/[^0-9+]/g, '')) + '">' + esc(row[1]) + '</a></div>';
          }).join('') +
          (overseas ? '<div class="emergency-row"><span>' + esc(CONSULATE[0]) + '</span>' +
            '<a href="tel:' + CONSULATE[1].replace(/[^0-9+]/g, '') + '">' + esc(CONSULATE[1]) + '</a></div>' : '') +
          t.info.emergency.map(function (e) {
            return '<div class="emergency-row"><span>' + esc(e.name) + '</span>' +
              '<a href="tel:' + esc(e.number.replace(/[^0-9+]/g, '')) + '">' + esc(e.number) + '</a>' +
              '<button type="button" class="icon-btn danger" data-action="del-emergency" data-id="' + e.id + '" aria-label="연락처 삭제">' + ICONS.trash + '</button></div>';
          }).join('') +
        '</div>' +
        '<p class="hint">해외에서는 국가번호를 붙여 걸어 주세요. 긴급번호는 여행 전 현지 공식 안내로 한 번 더 확인하세요.</p>' +
        '<form class="inline-form" data-form="emergency">' +
          '<input type="text" name="name" placeholder="연락처 이름 (예: 숙소 프런트)" maxlength="40" required aria-label="연락처 이름">' +
          '<input type="tel" name="number" placeholder="전화번호" maxlength="30" required aria-label="전화번호">' +
          '<button type="submit" class="btn btn-primary">추가</button>' +
        '</form>' +
      '</section>' +
      '<section class="panel"><div class="section-head"><div><h2>여행 메모</h2><p>입력하면 자동으로 저장됩니다</p></div></div>' +
        '<textarea class="memo-input" data-memo="info" placeholder="예약 번호, 현지 교통 팁, 가고 싶은 곳 등" aria-label="여행 메모">' + esc(t.info.memo) + '</textarea>' +
        '<p class="hint" id="memoState">이 기기에 자동 저장됩니다.</p>' +
      '</section>';
  }

  /* ---------- modal helpers ---------- */
  function openModal(html, wide) {
    $('#modalRoot').innerHTML = '<div class="modal-backdrop" data-action="close-modal"></div>' +
      '<div class="modal' + (wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    var first = $('#modalRoot .modal input:not([type="hidden"]):not([type="date"]):not([type="time"]), #modalRoot .modal textarea');
    if (first) {
      setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { } }, 60);
    }
  }
  function closeModal() {
    $('#modalRoot').innerHTML = '';
  }

  function modalHead(title, subtitle) {
    return '<div class="modal-head"><div><h2>' + esc(title) + '</h2>' +
      (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div>' +
      '<button type="button" class="icon-btn" data-action="close-modal" aria-label="닫기">✕</button></div>';
  }

  function toast(msg) {
    var root = $('#toastRoot');
    root.innerHTML = '<div class="toast">' + esc(msg) + '</div>';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { root.innerHTML = ''; }, 2800);
  }

  function formError(form, msg) {
    var p = form.querySelector('[data-error]');
    if (p) {
      p.textContent = msg;
      p.hidden = false;
      try { p.scrollIntoView({ block: 'nearest' }); } catch (e) { }
    } else {
      toast(msg);
    }
  }

  function fieldHTML(f, value) {
    if (f.type === 'hidden') {
      var hv = (value === undefined || value === null) ? (f.value === undefined || f.value === null ? '' : f.value) : value;
      return '<input type="hidden" name="' + f.name + '" value="' + esc(hv) + '">';
    }
    var v = value === undefined || value === null ? (f.value || '') : value;
    var label = '<span>' + esc(f.label) + (f.optional ? ' <small>선택</small>' : '') + '</span>';
    var control = '';
    if (f.type === 'select') {
      control = '<select name="' + f.name + '"' + (f.required ? ' required' : '') + '>' + (f.options || []).map(function (o) {
        var val = typeof o === 'object' ? o.value : o;
        var lab = typeof o === 'object' ? o.label : o;
        return '<option value="' + esc(val) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(lab) + '</option>';
      }).join('') + '</select>';
    } else if (f.type === 'textarea') {
      control = '<textarea name="' + f.name + '" rows="' + (f.rows || 3) + '" placeholder="' + esc(f.placeholder || '') + '"' + (f.required ? ' required' : '') + '>' + esc(v) + '</textarea>';
    } else if (f.type === 'datalist') {
      control = '<input type="text" name="' + f.name + '" list="dl-' + f.name + '" value="' + esc(v) + '" placeholder="' + esc(f.placeholder || '') + '" autocomplete="off">' +
        '<datalist id="dl-' + f.name + '">' + (f.options || []).map(function (o) {
          return '<option value="' + esc(o) + '"></option>';
        }).join('') + '</datalist>';
    } else {
      control = '<input type="' + (f.type || 'text') + '" name="' + f.name + '" value="' + esc(v) + '" placeholder="' + esc(f.placeholder || '') + '"' +
        (f.required ? ' required' : '') +
        (f.min !== undefined ? ' min="' + esc(f.min) + '"' : '') +
        (f.step ? ' step="' + esc(f.step) + '"' : '') +
        (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') +
        (f.inputmode ? ' inputmode="' + esc(f.inputmode) + '"' : '') + '>';
    }
    return '<label class="field' + (f.span === 2 ? ' span-2' : '') + '">' + label + control +
      (f.hint ? '<small class="hint">' + esc(f.hint) + '</small>' : '') + '</label>';
  }

  function recordModal(opts) {
    var fields = opts.fields || [];
    var values = opts.values || {};
    openModal(
      modalHead(opts.title, opts.subtitle) +
      '<form class="modal-body" data-form="' + opts.form + '" novalidate>' +
        '<div class="form-grid">' + fields.map(function (f) { return fieldHTML(f, values[f.name]); }).join('') + '</div>' +
        '<p class="form-error" data-error hidden></p>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost" data-action="close-modal">취소</button>' +
          '<button type="submit" class="btn btn-primary">' + esc(opts.submitLabel || '저장') + '</button>' +
        '</div>' +
      '</form>',
      opts.wide
    );
  }

  /* ---------- trip modal ---------- */
  function openTripModal(trip, firstRun) {
    editingTripId = trip ? trip.id : null;
    dateShrinkAck = false;
    var start = trip ? trip.start : addDaysISO(todayISO(), 21);
    var end = trip ? trip.end : addDaysISO(todayISO(), 23);
    tripDraft = {
      title: trip ? trip.title : '',
      country: trip ? normCountry(trip.country) : '대한민국',
      countryCustom: '',
      cities: trip ? trip.cities.slice() : [],
      start: start,
      end: end,
      legs: {
        out: trip ? normLeg(trip.outbound) : { from: '', to: '', mode: '', dep: '08:30', arr: '' },
        in: trip ? normLeg(trip.inbound) : { from: '', to: '', mode: '', dep: '17:00', arr: '' }
      },
      firstRun: !!firstRun
    };
    if (COUNTRIES.indexOf(tripDraft.country) < 0 && tripDraft.country) {
      tripDraft.countryCustom = tripDraft.country;
      tripDraft.country = '기타';
    }
    paintTripModal();
  }

  function paintTripModal() {
    var d = tripDraft;
    var total = dayCount(d.start, d.end);
    var editing = !!editingTripId;
    var countries = COUNTRIES.map(function (c) { return c; });
    openModal(
      modalHead('어디로 떠나시나요?', editing ? '여행 정보를 수정합니다. 기간을 바꾸면 DAY도 다시 계산됩니다.'
        : '여행 제목과 기간, 국가와 도시를 알려주시면 DAY 일정표를 바로 만들어 드려요.') +
      '<form class="modal-body" data-form="trip" id="tripForm" novalidate>' +
        '<label class="field"><span>여행 제목 <small>비우면 자동 생성</small></span>' +
          '<input type="text" name="title" value="' + esc(d.title) + '" placeholder="예: 도쿄 · 교토 3박 4일" maxlength="60"></label>' +
        '<div class="field-row">' +
          '<label class="field"><span>국가</span>' +
            '<select name="country">' + countries.map(function (c) {
              return '<option value="' + esc(c) + '"' + (c === d.country ? ' selected' : '') + '>' + esc(c) + '</option>';
            }).join('') + '</select>' +
            '<small class="hint">대한민국 → 네이버 지도, 그 외 → 구글 맵</small></label>' +
          '<label class="field"><span>도시 <small>복수 · 순서 변경</small></span>' +
            '<div class="city-editor">' +
              (d.cities.length ? d.cities.map(function (c, i) {
                return '<div class="city-row"><span class="city-idx">' + (i + 1) + '</span><span class="city-name">' + esc(c) + '</span>' +
                  '<span class="city-tools">' +
                    '<button type="button" class="icon-btn" data-action="city-up" data-i="' + i + '" aria-label="' + esc(c) + ' 위로">↑</button>' +
                    '<button type="button" class="icon-btn" data-action="city-down" data-i="' + i + '" aria-label="' + esc(c) + ' 아래로">↓</button>' +
                    '<button type="button" class="icon-btn danger" data-action="city-del" data-i="' + i + '" aria-label="' + esc(c) + ' 삭제">✕</button>' +
                  '</span></div>';
              }).join('') : '<p class="hint">아직 도시가 없어요. 아래에서 추가해 주세요. (예: 경주, 부산)</p>') +
              '<div class="city-add"><input type="text" id="cityInput" placeholder="도시 이름 (예: 교토)" maxlength="30" aria-label="도시 이름">' +
                '<button type="button" class="btn btn-soft" data-action="city-add">추가</button></div>' +
            '</div></label>' +
        '</div>' +
        '<input type="hidden" name="countryCustom" value="' + esc(d.countryCustom) + '">' +
        (d.country === '기타'
          ? '<label class="field"><span>국가 이름 직접 입력</span><input type="text" name="countryCustomInput" value="' + esc(d.countryCustom) + '" placeholder="예: 포르투갈" maxlength="30"></label>'
          : '') +
        '<div class="field-row">' +
          '<label class="field"><span>시작일</span><input type="date" name="start" value="' + esc(d.start) + '"></label>' +
          '<label class="field"><span>종료일</span><input type="date" name="end" value="' + esc(d.end) + '"></label>' +
        '</div>' +
        '<p class="day-preview" id="dayPreview">' + esc(dayPreviewText(d.start, d.end)) + '</p>' +
        paintLegSection(d) +
        '<p class="form-error" data-error hidden></p>' +
        '<div class="modal-actions">' +
          (editing
            ? '<button type="button" class="btn btn-ghost" data-action="close-modal">취소</button>'
            : '<button type="button" class="btn btn-ghost" data-action="dismiss-onboarding">샘플 여행 둘러보기</button>') +
          '<button type="submit" class="btn btn-primary">' + (editing ? '저장' : '여행 만들기') + '</button>' +
        '</div>' +
      '</form>'
    );
  }

  function paintLegSection(d) {
    var outTo = d.legs.out.to || d.cities[0] || '';
    var inFrom = d.legs.in.from || (d.cities.length ? d.cities[d.cities.length - 1] : '');
    var mode = d.legs.out.mode || defaultLegMode(d.country === '기타' ? (d.countryCustom || '기타') : d.country);
    var inMode = d.legs.in.mode || mode;
    var modeOptions = LEG_MODES.map(function (m) {
      return '<option value="' + esc(m) + '"' + (m === mode ? ' selected' : '') + '>' + esc(m) + '</option>';
    }).join('');
    var inModeOptions = LEG_MODES.map(function (m) {
      return '<option value="' + esc(m) + '"' + (m === inMode ? ' selected' : '') + '>' + esc(m) + '</option>';
    }).join('');
    return '<div class="leg-block">' +
      '<div class="leg-block-head"><h3>🚆 출발 · 귀환 교통 설정</h3>' +
        '<p>입력하면 첫날 첫 일정과 마지막 날 마지막 일정에 이동 카드가 자동 생성됩니다. 비워 두면 만들지 않습니다.</p></div>' +
      '<div class="leg-group">' +
        '<div class="leg-title"><span class="leg-tag">첫날 출발</span><span class="leg-hint">DAY 1 · 출발지 → 첫 도시</span></div>' +
        '<div class="field-row">' +
          '<label class="field"><span>출발지</span><input type="text" name="legOutFrom" value="' + esc(d.legs.out.from) + '" placeholder="예: 서울역, 인천공항, 자택" maxlength="40"></label>' +
          '<label class="field"><span>도착지</span><input type="text" name="legOutTo" value="' + esc(outTo) + '" placeholder="첫 도시" maxlength="40"></label>' +
        '</div>' +
        '<label class="field"><span>교통수단</span><select name="legOutMode">' + modeOptions + '</select></label>' +
        '<div class="field-row">' +
          '<label class="field"><span>출발 시각</span><input type="time" name="legOutDep" value="' + esc(d.legs.out.dep) + '"></label>' +
          '<label class="field"><span>도착 시각 <small>선택</small></span><input type="time" name="legOutArr" value="' + esc(d.legs.out.arr) + '"></label>' +
        '</div>'+
      '</div>' +
      '<div class="leg-group">' +
        '<div class="leg-title"><span class="leg-tag">마지막 날 귀환</span><span class="leg-hint">마지막 DAY · 마지막 도시 → 도착지</span></div>' +
        '<div class="field-row">' +
          '<label class="field"><span>출발지</span><input type="text" name="legInFrom" value="' + esc(inFrom) + '" placeholder="마지막 도시" maxlength="40"></label>' +
          '<label class="field"><span>도착지</span><input type="text" name="legInTo" value="' + esc(d.legs.in.to) + '" placeholder="예: 서울역, 인천공항, 자택" maxlength="40"></label>' +
        '</div>' +
        '<label class="field"><span>교통수단</span><select name="legInMode">' + inModeOptions + '</select></label>' +
        '<div class="field-row">' +
          '<label class="field"><span>출발 시각</span><input type="time" name="legInDep" value="' + esc(d.legs.in.dep) + '"></label>' +
          '<label class="field"><span>도착 시각 <small>선택</small></span><input type="time" name="legInArr" value="' + esc(d.legs.in.arr) + '"></label>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function syncLegCityDefaults(prevCities) {
    if (!tripDraft || !tripDraft.legs) return;
    var cities = tripDraft.cities;
    var first = cities[0] || '';
    var last = cities[cities.length - 1] || '';
    var prevFirst = prevCities && prevCities.length ? prevCities[0] : '';
    var prevLast = prevCities && prevCities.length ? prevCities[prevCities.length - 1] : '';
    if (!tripDraft.legs.out.to || tripDraft.legs.out.to === prevFirst) tripDraft.legs.out.to = first;
    if (!tripDraft.legs.in.from || tripDraft.legs.in.from === prevLast) tripDraft.legs.in.from = last;
  }

  function dayPreviewText(start, end) {
    var n = dayCount(start, end);
    if (!start || !end || end < start) return '기간을 확인해 주세요';
    return (n - 1) + '박 ' + n + '일 · DAY ' + n + '까지 자동 생성';
  }

  function fieldValue(form, name) {
    var el = form.elements ? form.elements[name] : form.querySelector('[name="' + name + '"]');
    return el ? el.value : undefined;
  }

  function captureTripForm() {
    var f = $('#tripForm');
    if (!f || !tripDraft) return;
    var d = tripDraft;
    var title = fieldValue(f, 'title');
    var country = fieldValue(f, 'country');
    var custom = fieldValue(f, 'countryCustomInput');
    var start = fieldValue(f, 'start');
    var end = fieldValue(f, 'end');
    if (title !== undefined) d.title = String(title).trim();
    if (country !== undefined) d.country = country;
    if (custom !== undefined) d.countryCustom = String(custom).trim();
    if (start !== undefined) d.start = start;
    if (end !== undefined) d.end = end;
    d.legs = d.legs || { out: {}, in: {} };
    ['out', 'in'].forEach(function (key) {
      var prefix = key === 'out' ? 'legOut' : 'legIn';
      d.legs[key] = d.legs[key] || {};
      ['From', 'To', 'Mode', 'Dep', 'Arr'].forEach(function (suffix) {
        var el = f.elements ? f.elements[prefix + suffix] : null;
        if (el) d.legs[key][suffix.toLowerCase()] = String(el.value || '');
      });
    });
  }

  function addCityFromInput() {
    captureTripForm();
    var input = $('#cityInput');
    if (!input) return;
    var name = input.value.trim();
    if (!name) { input.focus(); return; }
    if (tripDraft.cities.indexOf(name) >= 0) { toast('이미 추가된 도시예요'); input.value = ''; return; }
    var prev = tripDraft.cities.slice();
    tripDraft.cities.push(name);
    syncLegCityDefaults(prev);
    paintTripModal();
  }

  function saveTripForm(form) {
    captureTripForm();
    var d = tripDraft;
    var country = d.country === '기타' ? (d.countryCustom || '기타') : d.country;
    if (!country) country = '대한민국';
    if (!d.cities.length) { formError(form, '도시를 1개 이상 추가해 주세요. (예: 도쿄, 교토)'); return; }
    if (!d.start || !d.end) { formError(form, '여행 기간을 입력해 주세요.'); return; }
    if (d.end < d.start) { formError(form, '종료일이 시작일보다 빠릅니다.'); return; }

    var total = dayCount(d.start, d.end);
    var existing = editingTripId ? getTrip(editingTripId) : null;

    if (existing) {
      var removed = existing.days.slice(total).reduce(function (n, x) { return n + x.items.length; }, 0);
      if (removed > 0 && !dateShrinkAck) {
        dateShrinkAck = true;
        formError(form, '기간이 ' + total + '일로 줄어 ' + (existing.days.length - total) + '일치 일정 ' + removed + '개가 삭제됩니다. 한 번 더 누르면 저장합니다.');
        return;
      }
    }

    var autoTitle = d.cities.join(' · ') + ' ' + (total - 1) + '박 ' + total + '일';
    var title = d.title || autoTitle;
    var target = null;

    if (existing) {
      existing.title = title;
      existing.country = country;
      existing.cities = d.cities.slice();
      existing.start = d.start;
      existing.end = d.end;
      existing.updatedAt = nowISO();
      applyDays(existing, total);
      state.activeId = existing.id;
      target = existing;
    } else {
      var trip = blankTrip({ title: title, country: country, cities: d.cities, start: d.start, end: d.end });
      state.trips.push(trip);
      state.activeId = trip.id;
      ui.tab = 'plan';
      ui.allDays = false;
      ui.day = 1;
      target = trip;
    }

    target.outbound = resolveLeg(d.legs.out, d.cities[0], defaultLegMode(country));
    target.inbound = resolveLeg(d.legs.in, '', defaultLegMode(country));
    syncTripLegs(target);
    reconcileStay(target);
    markOnboarded();
    save();
    closeModal();
    render();
    toast(existing ? '여행 정보를 저장했어요' : '새 여행을 만들었어요 · DAY ' + total + '까지 준비했어요');
  }

  function markOnboarded() {
    try { localStorage.setItem(ONBOARD_KEY, '1'); } catch (e) { }
  }

  /* ---------- trip switch ---------- */
  function openTripSwitch() {
    var rows = state.trips.map(function (t) {
      var cur = t.id === state.activeId;
      return '<div class="trip-item' + (cur ? ' current' : '') + '">' +
        '<span class="ti-flag flag-badge light" aria-hidden="true">' + codeOf(t.country) + '</span>' +
        '<span class="ti-main">' +
          '<strong>' + esc(t.title) + '</strong>' +
          '<small>' + esc(t.country) + ' · ' + esc(t.cities.join(' · ')) + ' · ' + esc(fmtDateRange(t.start, t.end)) + '</small>' +
        '</span>' +
        (t.sample ? '<span class="ti-badge">샘플</span>' : '') +
        '<span class="ti-tools">' +
          (cur ? '' : '<button type="button" class="icon-btn" data-action="trip-switch" data-id="' + t.id + '" aria-label="' + esc(t.title) + '로 이동">' + ICONS.arrow + '</button>') +
          '<button type="button" class="icon-btn" data-action="trip-edit" data-id="' + t.id + '" aria-label="' + esc(t.title) + ' 수정">' + ICONS.edit + '</button>' +
          '<button type="button" class="icon-btn danger" data-action="trip-delete" data-id="' + t.id + '" aria-label="' + esc(t.title) + ' 삭제">' + ICONS.trash + '</button>' +
        '</span></div>';
    }).join('');

    openModal(
      modalHead('여행 선택', '여행을 바꾸거나 새로 만들 수 있어요') +
      '<div class="modal-body">' +
        (state.trips.length ? '<div class="trip-list">' + rows + '</div>'
          : '<div class="empty-card"><span class="em">🧳</span><h3>여행이 없어요</h3><p>새 여행을 만들어 보세요.</p></div>') +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost" data-action="close-modal">닫기</button>' +
          '<button type="button" class="btn btn-primary" data-action="new-trip">+ 새 여행</button>' +
        '</div>' +
      '</div>'
    );
  }

  function openConfirm(title, message, label, fn) {
    pendingConfirm = fn;
    openModal(
      modalHead(title) +
      '<div class="modal-body">' +
        '<p class="confirm-text">' + message + '</p>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost" data-action="close-modal">취소</button>' +
          '<button type="button" class="btn btn-danger" data-action="confirm-yes">' + esc(label || '삭제') + '</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ---------- 도시 · 국가 간 이동(구간) ---------- */
  function openLegModal(id) {
    var t = activeTrip();
    if (!t) return;
    var found = id ? findItem(id) : null;
    var it = found ? found.item : null;
    var dayN = found ? found.day.n : (ui.day || 1);
    var dayOptions = t.days.map(function (d) {
      return { value: String(d.n), label: 'DAY ' + d.n + ' · ' + d.city };
    });
    var countries = COUNTRIES.filter(function (c) { return c !== '기타'; });
    recordModal({
      title: it ? '구간 이동 수정' : '도시 · 국가 이동 추가',
      subtitle: '비행기·기차·렌터카로 도시나 국가를 옮기는 구간을 타임라인에 등록합니다.',
      form: 'leg',
      submitLabel: it ? '저장' : '추가',
      wide: true,
      fields: [
        { name: 'id', type: 'hidden', value: it ? it.id : '' },
        { name: 'day', label: '어느 DAY', type: 'select', options: dayOptions, value: String(dayN) },
        { name: 'mode', label: '교통수단', type: 'select', options: MOVE_MODES, value: it && it.mode ? it.mode : '신칸센' },
        { name: 'fromCountry', label: '출발 국가', type: 'select', options: countries, value: (it && it.fromCountry) || t.country },
        { name: 'fromCity', label: '출발 도시·역·터미널', type: 'text', required: true, maxlength: 50, value: it ? it.from : '', placeholder: '예: 도쿄역, 인천공항', span: 2 },
        { name: 'toCountry', label: '도착 국가', type: 'select', options: countries, value: (it && it.toCountry) || t.country },
        { name: 'toCity', label: '도착 도시·역·터미널', type: 'text', required: true, maxlength: 50, value: it ? it.to : '', placeholder: '예: 교토역, 간사이공항', span: 2 },
        { name: 'dep', label: '출발 시간', type: 'time', value: it ? it.time : '09:00' },
        { name: 'arr', label: '도착 시간', type: 'time', optional: true, value: it ? it.arr : '' },
        { name: 'terminal', label: '터미널 · 역 · 메모', type: 'textarea', optional: true, rows: 2, value: it ? it.memo : '', placeholder: '예: 도쿄역 18번 승강장 · 좌석 지정', span: 2 }
      ]
    });
  }

  function saveLegForm(form) {
    var t = activeTrip();
    if (!t) return;
    var v = Object.fromEntries(new FormData(form).entries());
    var from = String(v.fromCity || '').trim();
    var to = String(v.toCity || '').trim();
    if (!from) { formError(form, '출발 도시·역을 입력해 주세요.'); return; }
    if (!to) { formError(form, '도착 도시·역을 입력해 주세요.'); return; }
    var dayN = Number(v.day) || 1;
    var target = t.days.filter(function (d) { return d.n === dayN; })[0];
    if (!target) { formError(form, 'DAY를 선택해 주세요.'); return; }
    var item = null;
    if (v.id) {
      for (var i = 0; i < t.days.length; i++) {
        var arr = t.days[i].items;
        for (var k = 0; k < arr.length; k++) {
          if (arr[k].id === v.id) { item = arr.splice(k, 1)[0]; break; }
        }
        if (item) break;
      }
    }
    var dep = parseTime(v.dep) === null ? '09:00' : v.dep;
    var arrTime = parseTime(v.arr) === null ? '' : v.arr;
    item = Object.assign(item || { id: uid('it') }, {
      time: dep,
      title: from + ' → ' + to,
      category: '이동',
      city: from,
      place: '',
      memo: String(v.terminal || '').trim(),
      country: v.fromCountry || t.country,
      from: from,
      to: to,
      fromCountry: v.fromCountry || t.country,
      toCountry: v.toCountry || t.country,
      mode: MOVE_MODES.indexOf(v.mode) >= 0 ? v.mode : '기타',
      arr: arrTime,
      leg: 'segment',
      src: 'segment'
    });
    target.items.push(item);
    target.items.sort(sortByTime);
    if (t.cities.indexOf(to) >= 0) target.city = to;
    touchTrip(t);
    save();
    closeModal();
    ui.day = dayN;
    ui.allDays = false;
    render();
    toast(v.id ? '구간 이동을 수정했어요' : '구간 이동을 추가했어요');
  }

  /* ---------- 동선 추천 (큐레이션 DB · 권역/체류시간/시간대 기반 스케줄러) ---------- */
  var CUR_KIND_ORDER = ['landmark', 'exp', 'meal', 'cafe', 'stay'];
  var CUR_KIND_LABEL = { landmark: '🏛 랜드마크', exp: '🎟 체험', meal: '🍽 맛집', cafe: '☕ 카페', stay: '🛏 숙박 호텔' };
  var CUR_SLOT_LABEL = { morning: '아침', lunch: '점심', afternoon: '오후', sunset: '선셋·야경', dinner: '저녁', night: '야간' };
  var CUR_SLOT_START = { morning: 540, lunch: 720, afternoon: 840, sunset: 1050, dinner: 1140, night: 1230 };
  var CUR_SLOT_END = { morning: 690, lunch: 870, afternoon: 1050, sunset: 1170, dinner: 1260, night: 1350 };
  var CUR_SLOT_ORDER = { morning: 0, lunch: 1, afternoon: 2, sunset: 3, dinner: 4, night: 5 };
  var CUR_BUF_SAME = 15;
  var CUR_BUF_DIFF = 30;
  var CUR_DAY_LIMIT = 7;
  var CUR_SKELETON = [
    ['오전 명소 (자리표시자)', 'landmark', '중심', 90, 'morning', '추천 DB에 없는 도시 · 실제 장소명으로 수정하세요'],
    ['점심 맛집 (자리표시자)', 'meal', '중심', 60, 'lunch', '추천 DB에 없는 도시 · 실제 식당명으로 수정하세요'],
    ['오후 명소 (자리표시자)', 'landmark', '중심', 90, 'afternoon', '추천 DB에 없는 도시 · 실제 장소명으로 수정하세요'],
    ['카페 (자리표시자)', 'cafe', '중심', 60, 'afternoon', '추천 DB에 없는 도시 · 실제 카페명으로 수정하세요'],
    ['저녁 식사 (자리표시자)', 'meal', '중심', 60, 'dinner', '추천 DB에 없는 도시 · 실제 식당명으로 수정하세요'],
    ['숙소 (자리표시자)', 'stay', '중심', 0, 'night', '추천 DB에 없는 도시 · 실제 숙소명으로 수정하세요']
  ];

  function curationFor(city) {
    var rec = CURATION[city];
    if (rec && rec.items && rec.items.length) {
      return {
        country: rec.c || '',
        fallback: false,
        list: rec.items.map(function (x) {
          return {
            name: x[0],
            kind: x[1],
            zone: x[2] || '중심',
            dur: Number(x[3]) || (x[1] === 'stay' ? 0 : 60),
            slot: CUR_SLOT_LABEL[x[4]] ? x[4] : 'afternoon',
            memo: x[5] || ''
          };
        })
      };
    }
    return {
      country: '',
      fallback: true,
      list: CUR_SKELETON.map(function (x) {
        return { name: x[0], kind: x[1], zone: x[2], dur: x[3], slot: x[4], memo: x[5] };
      })
    };
  }

  function curationZoneSummary(list) {
    var order = [], count = {};
    list.forEach(function (x) {
      if (x.kind === 'stay') return;
      if (!count[x.zone]) { count[x.zone] = 0; order.push(x.zone); }
      count[x.zone]++;
    });
    return order.map(function (z) { return z + ' ' + count[z]; }).join(' · ');
  }

  /* ---------- 온라인 실시간 검색 (OpenStreetMap Nominatim + Overpass) ---------- */
  var CUR_NET = { mode: 'idle', city: '', msg: '기본 큐레이션 32개 도시' };
  var CUR_ONLINE = {};   // city -> { status: 'loading'|'done'|'error', items, center, radius, at, msg }
  var OSM_NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  var OSM_OVERPASS = [
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.osm.ch/api/interpreter'
  ];

  function fetchTimeout(url, opts, ms) {
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 12000);
    var o = Object.assign({}, opts || {});
    if (ctrl) o.signal = ctrl.signal;
    return fetch(url, o).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }, function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  function haversineKm(aLat, aLon, bLat, bLon) {
    var R = 6371, toRad = Math.PI / 180;
    var dLat = (bLat - aLat) * toRad, dLon = (bLon - aLon) * toRad;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  /* 좌표가 있으면 실제 거리로 이동 시간 추정 (도심 평균 20km/h + 대기) */
  function travelMin(km) {
    return Math.max(8, Math.min(60, Math.round(km / 0.33) + 5));
  }

  function sectorOf(lat, lon, cLat, cLon) {
    var km = haversineKm(cLat, cLon, lat, lon);
    if (km < 1.2) return '중심';
    var dLat = lat - cLat;
    var dLon = (lon - cLon) * Math.cos(cLat * Math.PI / 180);
    var deg = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;
    var names = ['북부', '북동부', '동부', '남동부', '남부', '남서부', '서부', '북서부'];
    return names[Math.round(deg / 45) % 8];
  }

  function geocodeCity(city) {
    var url = OSM_NOMINATIM + '?format=json&limit=5&accept-language=ko,en&addressdetails=1&q=' + encodeURIComponent(city);
    return fetchTimeout(url, { headers: { 'Accept': 'application/json' } }, 12000).then(function (arr) {
      if (!arr || !arr.length) throw new Error('도시 좌표를 찾지 못했습니다');
      var cities = arr.filter(function (x) {
        var t = String(x.addresstype || x.type || '');
        return ['city', 'town', 'administrative', 'municipality', 'county', 'village'].indexOf(t) >= 0;
      });
      var pool = cities.length ? cities : arr;
      var hit = pool.reduce(function (best, cur) {
        var bb = cur.boundingbox || [];
        var size = bb.length === 4 ? Math.abs(Number(bb[1]) - Number(bb[0])) * Math.abs(Number(bb[3]) - Number(bb[2])) : 0;
        var bestBb = best.boundingbox || [];
        var bestSize = bestBb.length === 4 ? Math.abs(Number(bestBb[1]) - Number(bestBb[0])) * Math.abs(Number(bestBb[3]) - Number(bestBb[2])) : 0;
        return size > bestSize ? cur : best;
      }, pool[0]);
      var box = hit.boundingbox || [];
      var lat = Number(hit.lat), lon = Number(hit.lon);
      var radius = 4000;
      if (box.length === 4) {
        var dLatKm = Math.abs(Number(box[1]) - Number(box[0])) * 111;
        var dLonKm = Math.abs(Number(box[3]) - Number(box[2])) * 111 * Math.cos(lat * Math.PI / 180);
        radius = Math.max(2200, Math.min(4500, Math.round(Math.max(dLatKm, dLonKm) * 380)));
      }
      var shortLabel = String(hit.display_name || city).split(',')[0].trim() || city;
      return { lat: lat, lon: lon, radius: radius, label: shortLabel };
    });
  }

  var OSM_KIND_QUERIES = [
    ['landmark', 'nwr["tourism"~"^(attraction|viewpoint)$"]["name"]'],
    ['exp', 'nwr["tourism"~"^(museum|gallery|zoo|theme_park)$"]["name"]'],
    ['meal', 'nwr["amenity"="restaurant"]["name"]'],
    ['cafe', 'nwr["amenity"="cafe"]["name"]'],
    ['stay', 'nwr["tourism"~"^(hotel|guest_house)$"]["name"]']
  ];

  function osmQueries(center, radius) {
    return OSM_KIND_QUERIES.map(function (pair) {
      return '[out:json][timeout:25];' + pair[1] +
        '(around:' + radius + ',' + center.lat + ',' + center.lon + ');out center 60;';
    });
  }

  function overpassGet(url, query, ms) {
    return fetchTimeout(url + '?data=' + encodeURIComponent(query), {
      method: 'GET', headers: { 'Accept': 'application/json' }
    }, ms || 12000);
  }

  /* 엔드포인트를 바꿔가며 종류별 질의를 병렬로 실행 */
  function fetchOsmPlaces(center, radius) {
    var queries = osmQueries(center, radius);
    var i = 0;
    function attempt() {
      if (i >= OSM_OVERPASS.length) return Promise.reject(new Error('Overpass 응답 없음'));
      var url = OSM_OVERPASS[i++];
      return Promise.all(queries.map(function (q) { return overpassGet(url, q); }))
        .then(function (results) {
          var els = [];
          results.forEach(function (r) {
            if (!r || !r.elements) throw new Error('응답 형식 오류');
            els = els.concat(r.elements);
          });
          if (!els.length) throw new Error('빈 응답');
          return els;
        })
        .catch(function () { return attempt(); });
    }
    return attempt();
  }

  function pickOsmName(t) {
    return t['name:ko'] || t['name:en'] || t.name || '';
  }

  function osmKind(t) {
    if (t.tourism === 'hotel' || t.tourism === 'guest_house') return 'stay';
    if (t.tourism === 'museum' || t.tourism === 'gallery') return 'exp';
    if (t.tourism === 'attraction' || t.tourism === 'viewpoint') return 'landmark';
    if (t.amenity === 'restaurant') return 'meal';
    if (t.amenity === 'cafe') return 'cafe';
    return '';
  }

  function osmMemo(t, kind, zone, km) {
    var bits = [];
    if (kind === 'meal' && t.cuisine) bits.push('요리: ' + String(t.cuisine).replace(/;/g, '·'));
    if (kind === 'cafe' && t.cuisine) bits.push('메뉴: ' + String(t.cuisine).replace(/;/g, '·'));
    if (kind === 'stay') bits.push(t.tourism === 'guest_house' ? '게스트하우스' : '호텔');
    if (t['addr:street']) bits.push(t['addr:street'] + (t['addr:housenumber'] ? ' ' + t['addr:housenumber'] : ''));
    if (t.opening_hours) bits.push('영업 ' + t.opening_hours);
    if (t.website || t['contact:website']) bits.push('웹사이트 있음');
    bits.push('중심에서 ' + (km < 1 ? (Math.round(km * 1000) + 'm') : km.toFixed(1) + 'km'));
    bits.push('OSM 실시간 데이터');
    return bits.join(' · ');
  }

  function buildOnlineItems(elements, center, radius) {
    var seen = {};
    var groups = { landmark: [], exp: [], meal: [], cafe: [], stay: [] };
    elements.forEach(function (el) {
      var t = el.tags || {};
      var name = pickOsmName(t).trim();
      if (!name) return;
      var kind = osmKind(t);
      if (!kind) return;
      var lat = Number(el.lat || (el.center && el.center.lat));
      var lon = Number(el.lon || (el.center && el.center.lon));
      if (!lat || !lon) return;
      var key = kind + '|' + name;
      if (seen[key]) return;
      seen[key] = 1;
      var km = haversineKm(center.lat, center.lon, lat, lon);
      if (km > radius / 1000) return;
      var zone = t['addr:suburb'] || t['addr:neighbourhood'] || t['addr:quarter'] ||
        t['addr:district'] || t['addr:city_district'] || t['addr:village'] || sectorOf(lat, lon, center.lat, center.lon);
      groups[kind].push({
        name: name,
        kind: kind,
        zone: String(zone),
        dur: kind === 'stay' ? 0 : kind === 'exp' ? 120 : kind === 'landmark' ? 90 : kind === 'meal' ? 60 : 50,
        slot: kind === 'stay' ? 'night' : kind === 'cafe' ? 'afternoon' :
          kind === 'meal' ? (groups.meal.length % 2 ? 'dinner' : 'lunch') :
            (t.tourism === 'viewpoint' ? 'sunset' : kind === 'exp' ? 'afternoon' : 'morning'),
        memo: osmMemo(t, kind, zone, km),
        lat: lat,
        lon: lon,
        km: km
      });
    });
    var limits = { landmark: 10, exp: 6, meal: 12, cafe: 8, stay: 8 };
    var out = [];
    ['landmark', 'exp', 'meal', 'cafe', 'stay'].forEach(function (k) {
      groups[k].sort(function (a, b) { return a.km - b.km; });
      out = out.concat(groups[k].slice(0, limits[k]));
    });
    return out;
  }

  /* Nominatim 카테고리 검색: 빠르고 전 세계 커버. 이름·좌표·주소 확보 */
  function fetchNominatimPlaces(center, radius) {
    var dLat = (radius / 111000) * 1.1;
    var dLon = (radius / (111000 * Math.max(0.2, Math.cos(center.lat * Math.PI / 180)))) * 1.1;
    var box = [center.lon - dLon, center.lat + dLat, center.lon + dLon, center.lat - dLat].join(',');
    var terms = [
      ['attraction', 'landmark'], ['museum', 'exp'],
      ['restaurant', 'meal'], ['cafe', 'cafe'], ['hotel', 'stay']
    ];
    return Promise.all(terms.map(function (pair) {
      var params = '?q=' + encodeURIComponent(pair[0]) +
        '&format=json&limit=25&bounded=1&viewbox=' + box +
        '&accept-language=ko,en&namedetails=1&extratags=1&addressdetails=1';
      return fetchTimeout(OSM_NOMINATIM + params, { headers: { 'Accept': 'application/json' } }, 14000)
        .then(function (arr) { return { kind: pair[1], arr: arr || [] }; })
        .catch(function () { return { kind: pair[1], arr: [] }; });
    })).then(function (sets) {
      var out = [];
      sets.forEach(function (set) {
        set.arr.forEach(function (hit) {
          var nm = hit.namedetails || {};
          var name = String(nm['name:ko'] || nm['name:en'] || hit.name || (hit.display_name || '').split(',')[0] || '').trim();
          if (!name) return;
          var lat = Number(hit.lat), lon = Number(hit.lon);
          if (!lat || !lon) return;
          var ad = hit.address || {};
          var zone = ad.city_district || ad.borough || ad.suburb || ad.town || ad.village ||
            sectorOf(lat, lon, center.lat, center.lon);
          var lname = name.toLowerCase();
          if (lname.length < 2) return;
          if (/photo|print|vending|toilet|parking|atm|bank|shop|coin|\d+f\)|\d+층|kiosk/i.test(name)) return;
          if (/^(restaurants?|cafes?|hotels?|attractions?|museum|store|storefront|food court)$/i.test(name)) return;
          var type = String(hit.type || '');
          var kind = set.kind;
          var slot = kind === 'stay' ? 'night' : kind === 'cafe' ? 'afternoon' :
            kind === 'meal' ? 'lunch' : (type === 'artwork' || type === 'viewpoint' ? 'sunset' : kind === 'exp' ? 'afternoon' : 'morning');
          var bits = [];
          if (hit.extratags && hit.extratags.cuisine) bits.push('요리: ' + String(hit.extratags.cuisine).replace(/;/g, '·'));
          if (hit.extratags && hit.extratags.opening_hours) bits.push('영업 ' + hit.extratags.opening_hours);
          bits.push('OSM Nominatim · ' + (hit.type || 'place'));
          var km = haversineKm(center.lat, center.lon, lat, lon);
          bits.push('중심 ' + (km < 1 ? Math.round(km * 1000) + 'm' : km.toFixed(1) + 'km'));
          out.push({
            name: name, kind: kind, zone: String(zone),
            dur: kind === 'stay' ? 0 : kind === 'exp' ? 120 : kind === 'landmark' ? 90 : kind === 'meal' ? 60 : 50,
            slot: slot,
            memo: bits.join(' · '), lat: lat, lon: lon, km: km
          });
        });
      });
      var seen = {};
      var kept = [];
      out.forEach(function (x) {
        var k = x.kind + '|' + x.name.toLowerCase().replace(/\s+/g, '');
        if (seen[k]) return;
        var nearDup = kept.some(function (y) {
          if (y.kind !== x.kind) return false;
          var km = haversineKm(y.lat, y.lon, x.lat, x.lon);
          if (km > 0.09) return false;
          var a = y.name.toLowerCase().replace(/\s+/g, '');
          var b = x.name.toLowerCase().replace(/\s+/g, '');
          return a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
        });
        if (nearDup) return;
        seen[k] = 1;
        kept.push(x);
      });
      return kept;
    });
  }

  function mergeOnlineItems(a, b) {
    var seen = {}, out = [];
    a.concat(b).forEach(function (x) {
      var k = x.kind + '|' + x.name;
      if (seen[k]) return;
      seen[k] = 1;
      out.push(x);
    });
    var limits = { landmark: 14, exp: 8, meal: 16, cafe: 10, stay: 10 };
    var groups = { landmark: [], exp: [], meal: [], cafe: [], stay: [] };
    out.forEach(function (x) { if (groups[x.kind]) groups[x.kind].push(x); });
    var result = [];
    var preselect = { landmark: 6, exp: 3, meal: 6, cafe: 3, stay: 2 };
    ['landmark', 'exp', 'meal', 'cafe', 'stay'].forEach(function (k) {
      groups[k].slice(0, limits[k]).forEach(function (x, idx) {
        x.pick = idx < preselect[k];
        result.push(x);
      });
    });
    return result;
  }

  /* 2단계: Nominatim 즉시 → Overpass 도착하면 보강 */
  function onlineCuration(city, onPartial) {
    if (typeof fetch !== 'function') return Promise.reject(new Error('이 브라우저는 실시간 검색을 지원하지 않습니다'));
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.reject(new Error('오프라인 상태입니다'));
    return geocodeCity(city).then(function (center) {
      var ovpItems = [];
      var ovpDone = false;
      var ovp = fetchOsmPlaces(center, center.radius).then(function (els) {
        ovpItems = buildOnlineItems(els, center, center.radius);
        ovpDone = true;
        return ovpItems;
      }).catch(function () { ovpDone = true; return []; });
      return fetchNominatimPlaces(center, center.radius).then(function (nom) {
        if (!nom.length && !ovpItems.length) {
          return ovp.then(function (extra) {
            var merged0 = mergeOnlineItems(nom, extra);
            if (!merged0.length) throw new Error('주변 장소를 찾지 못했습니다');
            return { items: merged0, center: center, radius: center.radius, osm: extra.length };
          });
        }
        var first = mergeOnlineItems(nom, ovpItems);
        if (onPartial && first.length) onPartial({ items: first, center: center, radius: center.radius, partial: true });
        return ovp.then(function (extra) {
          var merged = mergeOnlineItems(nom, extra);
          return { items: merged, center: center, radius: center.radius, osm: extra.length };
        });
      });
    });
  }

  function curBadge() {
    var map = {
      idle: ['📦 기본 큐레이션', 'off'],
      loading: ['⏳ 실시간 검색 중…', 'load'],
      done: ['🌐 온라인 실시간 검색', 'on'],
      error: ['📦 기본 큐레이션 · 온라인 실패', 'err']
    };
    var v = map[CUR_NET.mode] || map.idle;
    return '<span class="cur-net ' + v[1] + '" id="curNet">' + v[0] + '</span>';
  }

  function curSectionHtml(city, t) {
    var online = CUR_ONLINE[city];
    var useOnline = online && online.status === 'done';
    var base = curationFor(city);
    var info = useOnline
      ? { country: base.country, fallback: false, list: online.items }
      : base;
    var kinds = CUR_KIND_ORDER.filter(function (k) {
      return info.list.some(function (x) { return x.kind === k; });
    });
    var zoneCount = Object.keys(info.list.reduce(function (m, x) { if (x.kind !== 'stay') m[x.zone] = 1; return m; }, {})).length;
    var head = '<div class="cur-city-head">' +
      '<span class="cur-flag">' + codeOf(info.country || t.country) + '</span>' +
      '<strong>' + esc(city) + '</strong>' +
      '<span class="cur-route">' + info.list.length + '곳 · 권역 ' + zoneCount + '</span>' +
    '</div>' +
    '<div class="cur-city-tools">' +
      (useOnline
        ? '<span class="cur-src on">🌐 실시간 · ' + esc((online.center && online.center.label || '').split(',').slice(0, 2).join(',')) + '</span>' +
          '<button type="button" class="cur-mini" data-action="cur-online" data-city="' + esc(city) + '">🔄 새로고침</button>' +
          '<button type="button" class="cur-mini" data-action="cur-static" data-city="' + esc(city) + '">📦 기본 큐레이션</button>'
        : (online && online.status === 'loading'
          ? '<span class="cur-src load">⏳ Nominatim·Overpass 조회 중…</span>'
          : '<button type="button" class="cur-mini cur-mini-main" data-action="cur-online" data-city="' + esc(city) + '">🌐 실시간 전 세계 검색</button>' +
            (online && online.status === 'error' ? '<span class="cur-src err">' + esc(online.msg || '검색 실패') + '</span>' : ''))) +
    '</div>';

    var note = '';
    if (useOnline) {
      note = '<p class="cur-note ok">OpenStreetMap 실시간 조회 결과입니다. 좌표가 있어 실제 거리로 이동 시간을 계산합니다. 평점·최신 리뷰는 🤖 김비서 패널로 보강하세요.</p>';
    } else if (base.fallback) {
      note = '<p class="cur-note">기본 DB에 없는 도시입니다. <b>🌐 실시간 전 세계 검색</b>을 누르면 OSM에서 실제 장소를 즉시 가져옵니다(오프라인일 때만 자리표시자).</p>';
    }

    return '<section class="cur-city" data-curcity="' + esc(city) + '">' + head + note +
      '<div class="cur-zones"><b>권역</b><span>' + esc(curationZoneSummary(info.list)) + '</span></div>' +
      kinds.map(function (kind) {
        var items = info.list.filter(function (x) { return x.kind === kind; });
        return '<div class="cur-group" data-city="' + esc(city) + '" data-kind="' + kind + '">' +
          '<div class="cur-group-head"><h3>' + CUR_KIND_LABEL[kind] + ' <small>' + items.length + '</small></h3>' +
            '<button type="button" class="cur-mini" data-action="cur-cat" data-city="' + esc(city) + '" data-kind="' + kind + '" aria-label="' + esc(city) + ' ' + esc(CUR_KIND_LABEL[kind]) + ' 전체 선택">카테고리 전체</button></div>' +
          items.map(function (it, i) {
            var isStay = it.kind === 'stay';
            var meta = isStay
              ? '숙박 · ' + it.zone + ' 권역'
              : it.zone + ' · 예상 ' + it.dur + '분 · ' + (CUR_SLOT_LABEL[it.slot] || '오후') + ' 추천';
            return '<label class="cur-item">' +
              '<input type="checkbox" data-cur="' + esc(city + '||' + kind + '||' + i) + '" data-city="' + esc(city) + '" data-kind="' + kind + '" data-name="' + esc(it.name) + '" data-memo="' + esc(it.memo) + '" data-zone="' + esc(it.zone) + '" data-dur="' + it.dur + '" data-slot="' + esc(it.slot) + '" data-country="' + esc(info.country) + '" data-lat="' + (it.lat || '') + '" data-lon="' + (it.lon || '') + '"' + (info.fallback ? ' data-fallback="1"' : '') + ((useOnline && it.pick === false) ? '' : ' checked') + '>' +
              '<span class="cur-name">' + esc(it.name) + '</span>' +
              '<span class="cur-meta">' + esc(meta) + '</span>' +
              '<span class="cur-memo">' + esc(it.memo) + '</span>' +
            '</label>';
          }).join('') +
        '</div>';
      }).join('') +
    '</section>';
  }

  function bridgePanelHtml(t) {
    return '<details class="cur-bridge">' +
      '<summary>🤖 김비서에게 최신 리뷰 맞춤 추천 받기</summary>' +
      '<p class="cur-bridge-note">정적 앱은 실시간 리뷰·평점을 직접 읽지 못합니다. 요청문을 복사해 김비서에게 보내면, 김비서가 최신 리뷰를 검색해 아래 형식의 JSON으로 돌려줍니다. 붙여넣고 적용하면 같은 스케줄러가 동선·시간을 계산해 일정에 넣습니다.</p>' +
      '<div class="cur-bridge-row">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="cur-copy-request">📋 요청문 복사</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-action="cur-copy-schema">🧩 JSON 형식 복사</button>' +
      '</div>' +
      '<label class="cur-bridge-field"><span>김비서가 준 JSON 붙여넣기</span>' +
        '<textarea id="curJson" rows="4" placeholder=\'{"cities":{"도쿄":[{"name":"스시 잔마이 본점","kind":"meal","zone":"아사쿠사","durationMin":60,"bestSlot":"lunch","memo":"리뷰 4.4 · 3천엔대","lat":35.71,"lon":139.79}]}}\'></textarea>' +
      '</label>' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="cur-import">JSON 적용</button>' +
    '</details>';
  }

  function openCuration() {
    var t = activeTrip();
    if (!t) return;
    if (!t.cities.length) { toast('여행 도시를 먼저 등록해 주세요'); return; }
    var body = t.cities.map(function (city) { return curSectionHtml(city, t); }).join('');

    openModal(
      modalHead('✨ 동선 추천 채우기', '기본은 온라인입니다. 여행지를 고르면 OSM 실시간 조회로 실제 장소·좌표를 가져오고, 좌표 거리로 이동 시간을 계산해 시작 시각이 겹치지 않게 배치합니다.') +
      '<div class="modal-body">' +
        '<div class="cur-bar">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="cur-all">모두 선택</button>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-action="cur-none">모두 해제</button>' +
          '<span class="cur-count" id="curCount"></span>' +
        '</div>' +
        '<div class="cur-netbar">' + curBadge() + '<span class="cur-netmsg" id="curNetMsg">' + esc(CUR_NET.msg) + '</span></div>' +
        bridgePanelHtml(t) +
        body +
        '<p class="hint">' + esc(CURATION_META.note || '실존 장소·권역 기준 추천입니다. 영업시간은 방문 전 지도에서 확인하세요.') + '</p>' +
        '<p class="hint">숙박 호텔은 일정이 아니라 <b>정보 탭 숙소 카드</b>에 등록되고, 박 수에 맞춰 순서대로 배분됩니다.</p>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost" data-action="close-modal">취소</button>' +
          '<button type="button" class="btn btn-primary" data-action="cur-apply">선택 항목으로 일정 세팅하기</button>' +
        '</div>' +
      '</div>',
      true
    );
    updateCurCount();
    if (CUR_NET.mode !== 'loading') autoOnlineCities(t);
  }

  /* 열자마자 DB에 없는 도시는 실시간으로 채운다(온라인일 때만) */
  function autoOnlineCities(t) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    var missing = t.cities.filter(function (c) { return !CURATION[c] && !CUR_ONLINE[c]; });
    if (missing.length) loadOnlineCity(missing[0]);
  }

  function refreshCurCity(city) {
    var t = activeTrip();
    if (!t) return;
    var node = document.querySelector('[data-curcity="' + String(city).replace(/"/g, '\\"') + '"]');
    if (!node) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = curSectionHtml(city, t);
    var fresh = wrap.firstElementChild;
    node.parentNode.replaceChild(fresh, node);
    var badge = $('#curNet');
    if (badge) {
      var tmp = document.createElement('div');
      tmp.innerHTML = curBadge();
      badge.parentNode.replaceChild(tmp.firstElementChild, badge);
    }
    var msg = $('#curNetMsg');
    if (msg) msg.textContent = CUR_NET.msg;
    updateCurCount();
  }

  function loadOnlineCity(city) {
    if (!city) return;
    CUR_ONLINE[city] = { status: 'loading' };
    CUR_NET.mode = 'loading';
    CUR_NET.city = city;
    CUR_NET.msg = city + ' 실시간 조회 중 · Nominatim → Overpass';
    refreshCurCity(city);
    onlineCuration(city, function (part) {
      CUR_ONLINE[city] = { status: 'done', items: part.items, center: part.center, radius: part.radius, at: Date.now(), partial: true };
      CUR_NET.mode = 'loading';
      CUR_NET.msg = city + ' · 기본 결과 ' + part.items.length + '곳 · 추가 검색 중…';
      refreshCurCity(city);
    }).then(function (res) {
      CUR_ONLINE[city] = {
        status: 'done', items: res.items, center: res.center, radius: res.radius, at: Date.now()
      };
      CUR_NET.mode = 'done';
      CUR_NET.msg = city + ' · 실시간 ' + res.items.length + '곳 (반경 ' + Math.round(res.radius / 1000 * 10) / 10 + 'km)';
      refreshCurCity(city);
      toast(city + ' 실시간 검색 완료 · ' + res.items.length + '곳');
    }).catch(function (e) {
      CUR_ONLINE[city] = { status: 'error', msg: String((e && e.message) || e) };
      CUR_NET.mode = 'error';
      CUR_NET.msg = city + ' 실시간 검색 실패 · 기본 큐레이션 유지';
      refreshCurCity(city);
      toast('실시간 검색 실패 · 기본 큐레이션 사용 (' + ((e && e.message) || '네트워크') + ')');
    });
  }

  function curRequestText(t) {
    var legs = [];
    if (t.outbound && t.outbound.from) {
      legs.push('출발 ' + t.outbound.from + ' → ' + t.outbound.to + ' · ' + (t.outbound.mode || '') + ' · ' + (t.outbound.dep || '') + '~' + (t.outbound.arr || ''));
    }
    if (t.inbound && t.inbound.from) {
      legs.push('귀환 ' + t.inbound.from + ' → ' + t.inbound.to + ' · ' + (t.inbound.mode || '') + ' · ' + (t.inbound.dep || '') + '~' + (t.inbound.arr || ''));
    }
    var lines = [
      '[여행 플래너 동선 추천 요청]',
      '여행: ' + t.title,
      '국가: ' + t.country + ' / 도시: ' + t.cities.join(', '),
      '기간: ' + fullDateLabel(t.start) + ' ~ ' + fullDateLabel(t.end) + ' (' + t.days.length + '일)',
      legs.join('\n'),
      '스타일: 미식·카페·핵심 명소 균형 (호캉스·혼여행이면 조정)',
      '',
      '요청: 도시별로 랜드마크 6~8, 맛집 5~6, 카페 4~5, 호텔 3~4를 최신 리뷰 기준 실존 상호로 추천해줘. 추상 명칭(무슨 거리·무슨 시장·권역 호텔) 금지, 실제 상호만. 결과는 아래 JSON 하나로만 답해줘.',
      '{"cities":{"도시명":[{"name":"실제 상호","kind":"landmark|exp|meal|cafe|stay","zone":"권역","durationMin":90,"bestSlot":"morning|lunch|afternoon|sunset|dinner|night","memo":"한 줄 리뷰 포인트·가격대","lat":35.0,"lon":139.0}]}}'
    ];
    return lines.filter(Boolean).join('\n');
  }

  function curSchemaText() {
    return JSON.stringify({
      cities: {
        '도쿄': [
          { name: '스시 잔마이 본점', kind: 'meal', zone: '아사쿠사', durationMin: 60, bestSlot: 'lunch', memo: '리뷰 4.4 · 해산물 스시 3천엔대', lat: 35.7107, lon: 139.7965 },
          { name: '호텔 그레이서리 신주쿠', kind: 'stay', zone: '신주쿠', durationMin: 0, bestSlot: 'night', memo: '신주쿠역 인접 4성', lat: 35.6938, lon: 139.6993 }
        ]
      }
    }, null, 2);
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? okMsg : '복사하지 못했습니다 · 길게 눌러 직접 복사해 주세요');
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } else {
      fallback();
    }
  }

  function normImportKind(k) {
    var v = String(k || '').toLowerCase();
    if (v === 'attraction' || v === 'landmark' || v === 'sight' || v === '명소') return 'landmark';
    if (v === 'exp' || v === 'experience' || v === 'museum' || v === '체험') return 'exp';
    if (v === 'meal' || v === 'restaurant' || v === 'food' || v === '맛집') return 'meal';
    if (v === 'cafe' || v === '카페') return 'cafe';
    if (v === 'stay' || v === 'hotel' || v === '숙소' || v === '호텔') return 'stay';
    return '';
  }

  function importCurationJSON(text) {
    var t = activeTrip();
    if (!t) return;
    var data;
    try { data = JSON.parse(String(text || '').trim()); }
    catch (e) { toast('JSON 형식이 아닙니다 · 김비서가 준 JSON을 그대로 붙여넣어 주세요'); return; }

    var entries = [];
    function push(city, it) {
      if (!city || !it) return;
      var kind = normImportKind(it.kind || it.type);
      var name = String(it.name || it.title || '').trim();
      if (!name || !kind) return;
      var dur = Number(it.durationMin != null ? it.durationMin : it.dur);
      entries.push({
        city: String(city),
        name: name,
        kind: kind,
        zone: String(it.zone || it.area || '중심'),
        dur: isFinite(dur) && dur > 0 ? dur : (kind === 'stay' ? 0 : 60),
        slot: CUR_SLOT_LABEL[it.bestSlot] ? it.bestSlot : (CUR_SLOT_LABEL[it.slot] ? it.slot : (kind === 'stay' ? 'night' : 'afternoon')),
        memo: String(it.memo || it.note || '김비서 추천'),
        lat: Number(it.lat || (it.coords && it.coords.lat) || 0) || 0,
        lon: Number(it.lon || it.lng || (it.coords && it.coords.lon) || 0) || 0,
        country: String(it.country || t.country),
        fallback: false
      });
    }

    if (data && data.cities && typeof data.cities === 'object' && !Array.isArray(data.cities)) {
      Object.keys(data.cities).forEach(function (city) {
        var arr = data.cities[city];
        if (Array.isArray(arr)) arr.forEach(function (it) { push(city, it); });
      });
    }
    if (Array.isArray(data)) {
      data.forEach(function (it) { push(it.city || it['도시'] || (t.cities[0] || ''), it); });
    }
    if (data && Array.isArray(data.items)) {
      data.items.forEach(function (it) { push(it.city || (t.cities[0] || ''), it); });
    }
    if (!entries.length) { toast('적용할 항목이 없습니다 · name·kind를 확인해 주세요'); return; }

    var stats = { plan: 0, food: 0, lodging: 0, skip: 0, zones: 0 };
    applyEntries(t, entries, stats);
    CUR_NET.mode = 'done';
    CUR_NET.msg = '김비서 JSON ' + entries.length + '항목 반영';
    commitCuration(t, stats, '김비서 JSON');
  }

  function applyEntries(t, entries, stats) {
    var cities = [];
    entries.forEach(function (p) { if (cities.indexOf(p.city) < 0) cities.push(p.city); });
    cities.forEach(function (city) {
      fillCityCuration(t, city, entries.filter(function (p) { return p.city === city; }), stats);
    });
  }

  function commitCuration(t, stats, label) {
    if (!stats.plan && !stats.food && !stats.lodging) {
      closeModal();
      toast('선택한 항목이 이미 모두 채워져 있어요');
      return;
    }
    var firstDay = t.days.filter(function (d) {
      return d.items.some(function (x) { return x.src === 'curation'; });
    })[0];
    touchTrip(t);
    save();
    closeModal();
    ui.tab = 'plan';
    ui.allDays = false;
    if (firstDay) ui.day = firstDay.n;
    render();
    window.scrollTo(0, 0);
    toast((label ? label + ' · ' : '') + '일정 ' + stats.plan + ' · 맛집 ' + stats.food + ' · 숙소 ' + stats.lodging + '개 배치' +
      (stats.zones ? ' · 권역 ' + stats.zones + '개 묶음' : '') +
      (stats.skip ? ' (중복·시간초과 ' + stats.skip + '개 제외)' : ''));
  }

  function updateCurCount() {
    var boxes = document.querySelectorAll('#modalRoot [data-cur]');
    var on = 0;
    Array.prototype.forEach.call(boxes, function (b) { if (b.checked) on++; });
    var el = $('#curCount');
    if (el) el.textContent = on + ' / ' + boxes.length + '개 선택';
  }

  function setCurBoxes(checked, city, kind) {
    Array.prototype.forEach.call(document.querySelectorAll('#modalRoot [data-cur]'), function (b) {
      if (city && b.dataset.city !== city) return;
      if (kind && b.dataset.kind !== kind) return;
      b.checked = checked;
    });
    updateCurCount();
  }

  function applyCuration() {
    var t = activeTrip();
    if (!t) return;
    var picked = [];
    Array.prototype.forEach.call(document.querySelectorAll('#modalRoot [data-cur]'), function (b) {
      if (!b.checked) return;
      picked.push({
        city: b.dataset.city,
        kind: b.dataset.kind,
        name: b.dataset.name,
        memo: b.dataset.memo,
        zone: b.dataset.zone || '중심',
        dur: Number(b.dataset.dur) || (b.dataset.kind === 'stay' ? 0 : 60),
        slot: b.dataset.slot || 'afternoon',
        country: b.dataset.country,
        lat: Number(b.dataset.lat) || 0,
        lon: Number(b.dataset.lon) || 0,
        fallback: b.dataset.fallback === '1'
      });
    });
    if (!picked.length) { toast('채울 항목을 1개 이상 선택해 주세요'); return; }

    var stats = { plan: 0, food: 0, lodging: 0, skip: 0, zones: 0 };
    applyEntries(t, picked, stats);
    commitCuration(t, stats, CUR_NET.mode === 'done' ? '실시간 검색' : '');
  }

  /* 여행 첫날 도착·마지막날 출발 시각을 반영한 하루 가용 시간 창 */
  function curationDayWindow(t, day) {
    var start = 9 * 60;
    var end = 21 * 60 + 30;
    var first = t.days[0];
    var last = t.days[t.days.length - 1];
    if (first && day.n === first.n) {
      var arr = t.outbound ? parseTime(t.outbound.arr) : null;
      if (arr !== null && arr > 0) start = Math.max(8 * 60, arr + (isKorea(t.country) ? 45 : 90));
    }
    if (last && day.n === last.n) {
      var dep = t.inbound ? parseTime(t.inbound.dep) : null;
      if (dep !== null && dep > 0) {
        end = Math.min(end, dep - (isKorea(t.country) ? 60 : 150));
      }
    }
    if (end - start < 240) end = Math.min(23 * 60, start + 240);
    return [start, end];
  }

  function fillCityCuration(t, city, entries, stats) {
    var days = t.days.filter(function (d) { return d.city === city; });
    if (!days.length) {
      var idx = t.cities.indexOf(city);
      var guess = idx >= 0
        ? t.days[Math.min(t.days.length - 1, Math.round(idx * t.days.length / t.cities.length))]
        : t.days[t.days.length - 1];
      if (guess) days = [guess];
    }
    if (!days.length) return;

    var country = (entries[0] && entries[0].country) || t.country;
    var stays = entries.filter(function (e) { return e.kind === 'stay'; });
    var acts = entries.filter(function (e) { return e.kind !== 'stay'; });

    if (stays.length) addCurationLodging(t, city, stays, stats);
    if (!acts.length) { touchTrip(t); return; }

    acts = acts.filter(function (e) {
      var dup = t.days.some(function (d) {
        return d.items.some(function (x) { return x.title === e.name; });
      });
      if (dup) { stats.skip++; return false; }
      return true;
    });
    if (!acts.length) return;

    var windows = {};
    var occupied = {};
    days.forEach(function (d) {
      windows[d.n] = curationDayWindow(t, d);
      occupied[d.n] = dayBusyRanges(d);
    });

    function overlaps(ranges, s, e) {
      return ranges.some(function (r) { return s < r[1] && e > r[0]; });
    }
    function tryPlace(d, e, from, anySlot) {
      var win = windows[d.n];
      var slotMin = CUR_SLOT_START[e.slot] == null ? win[0] : CUR_SLOT_START[e.slot];
      var slotMax = CUR_SLOT_END[e.slot] == null ? win[1] : CUR_SLOT_END[e.slot];
      var limit = anySlot ? Math.min(win[1], slotMax + 150) : Math.min(win[1], slotMax);
      var start = Math.max(from, Math.max(anySlot ? Math.max(win[0], slotMin - 60) : slotMin, win[0]));
      start = Math.ceil(start / 5) * 5;
      var need = Math.max(20, e.dur);
      for (var k = 0; k < 60; k++) {
        var end = start + need;
        if (end > limit) return null;
        var clashEnd = null;
        occupied[d.n].forEach(function (r) {
          if (start < r[1] && end > r[0]) {
            if (clashEnd === null || r[1] < clashEnd) clashEnd = r[1];
          }
        });
        if (clashEnd === null) return start;
        start = Math.ceil(clashEnd / 5) * 5;
      }
      return null;
    }

    /* 1) 권역 클러스터링 — 같은 zone은 같은 날에 통째로 배정 */
    var zoneOrder = [];
    var zoneMap = {};
    acts.forEach(function (e) {
      var z = e.zone || '중심';
      if (!zoneMap[z]) { zoneMap[z] = []; zoneOrder.push(z); }
      zoneMap[z].push(e);
    });
    function zoneLoad(arr) {
      return arr.reduce(function (s, e) { return s + Math.max(30, e.dur) + CUR_BUF_SAME; }, 0);
    }
    zoneOrder.sort(function (a, b) {
      return zoneLoad(zoneMap[b]) - zoneLoad(zoneMap[a]) || String(a).localeCompare(String(b));
    });

    var load = {};
    days.forEach(function (d) {
      load[d.n] = { zones: [], used: 0, cap: Math.max(240, windows[d.n][1] - windows[d.n][0]) };
    });
    var maxZonesPerDay = Math.max(1, Math.ceil(zoneOrder.length / Math.max(1, days.length)));
    zoneOrder.forEach(function (z) {
      var need = zoneLoad(zoneMap[z]);
      var pick = null, best = -Infinity;
      days.forEach(function (d) {
        var L = load[d.n];
        if (L.zones.length >= maxZonesPerDay) return;
        var remain = L.cap - L.used - (L.zones.length ? 150 : 0);
        if (remain >= need && remain > best) { best = remain; pick = d; }
      });
      if (!pick) {
        best = -Infinity;
        days.forEach(function (d) {
          var remain = load[d.n].cap - load[d.n].used;
          if (remain > best) { best = remain; pick = d; }
        });
      }
      if (!pick) pick = days[0];
      load[pick.n].zones.push(z);
      load[pick.n].used += need;
      stats.zones = (stats.zones || 0) + 1;
    });

    /* 2) 하루 안에서 시간대 순서로 배치 + 이동 버퍼 계산 */
    var overflow = [];
    var dayPlaced = {};
    days.forEach(function (d) {
      var L = load[d.n];
      if (!L.zones.length) return;
      var pool = [];
      L.zones.forEach(function (z) { pool = pool.concat(zoneMap[z]); });
      var zoneRank = {};
      L.zones.forEach(function (z, zi) { zoneRank[z] = zi; });
      pool.sort(function (a, b) {
        var sa = CUR_SLOT_ORDER[a.slot] == null ? 2 : CUR_SLOT_ORDER[a.slot];
        var sb = CUR_SLOT_ORDER[b.slot] == null ? 2 : CUR_SLOT_ORDER[b.slot];
        return sa - sb || (zoneRank[a.zone] || 0) - (zoneRank[b.zone] || 0) || b.dur - a.dur;
      });
      var cursor = windows[d.n][0];
      var prevZone = '';
      var prevItem = null;
      var placedCount = 0;
      pool.forEach(function (e) {
        if (placedCount >= CUR_DAY_LIMIT) { overflow.push(e); return; }
        var buffer = 0;
        if (prevZone) {
          if (prevItem && prevItem.lat && prevItem.lon && e.lat && e.lon) {
            buffer = travelMin(haversineKm(Number(prevItem.lat), Number(prevItem.lon), Number(e.lat), Number(e.lon)));
          } else {
            buffer = prevZone === e.zone ? CUR_BUF_SAME : CUR_BUF_DIFF;
          }
        }
        var placed = tryPlace(d, e, cursor + buffer);
        if (placed === null) { overflow.push(e); return; }
        occupied[d.n].push([placed, placed + Math.max(20, e.dur)]);
        pushCurationItem(t, d, e, placed, city, country);
        cursor = Math.max(cursor, placed + Math.max(20, e.dur));
        prevZone = e.zone;
        prevItem = e;
        placedCount++;
        dayPlaced[d.n] = (dayPlaced[d.n] || 0) + 1;
        stats.plan++;
        if (e.kind === 'meal' || e.kind === 'cafe') addCurationFood(t, city, e, country, stats);
      });
    });

    /* 3) 넘친 항목은 다른 날 빈 시간에 재배치 */
    overflow.forEach(function (e) {
      var ordered = days.slice().sort(function (a, b) {
        var za = load[a.n].zones.indexOf(e.zone) >= 0 ? 0 : 1;
        var zb = load[b.n].zones.indexOf(e.zone) >= 0 ? 0 : 1;
        return za - zb || a.n - b.n;
      });
      for (var i = 0; i < ordered.length; i++) {
        var d = ordered[i];
        if ((dayPlaced[d.n] || 0) >= CUR_DAY_LIMIT) continue;
        if (load[d.n].zones.length >= Math.max(3, maxZonesPerDay + 1) && load[d.n].zones.indexOf(e.zone) < 0) continue;
        var placed = tryPlace(d, e, windows[d.n][0], true);
        if (placed !== null) {
          occupied[d.n].push([placed, placed + Math.max(20, e.dur)]);
          if (load[d.n].zones.indexOf(e.zone) < 0) load[d.n].zones.push(e.zone);
          pushCurationItem(t, d, e, placed, city, country);
          dayPlaced[d.n] = (dayPlaced[d.n] || 0) + 1;
          stats.plan++;
          if (e.kind === 'meal' || e.kind === 'cafe') addCurationFood(t, city, e, country, stats);
          return;
        }
      }
      stats.skip++;
    });
    touchTrip(t);
  }

  function pushCurationItem(t, d, e, startMin, city, country) {
    var category = e.kind === 'meal' ? '식사' : e.kind === 'cafe' ? '카페' : (e.kind === 'exp' ? '체험' : '핵심');
    var memo = '[' + (e.zone || '중심') + '] ' + (e.memo || '') + ' · 예상 ' + e.dur + '분';
    d.items.push({
      id: uid('it'),
      time: fmtTime(startMin),
      title: e.name,
      category: category,
      city: city,
      place: e.fallback ? '' : e.name,
      memo: memo,
      country: country,
      lat: e.lat || '', lon: e.lon || '',
      from: '', to: '', fromCountry: '', toCountry: '', mode: '', arr: '', leg: '',
      src: e.fallback ? 'skeleton' : 'curation'
    });
    d.items.sort(sortByTime);
  }

  function dayBusyRanges(d) {
    var ranges = [];
    list(d.items).forEach(function (x) {
      var s = parseTime(x.time);
      if (s === null) return;
      var e = s + 75;
      var arr = x.arr ? parseTime(x.arr) : null;
      if (arr !== null && arr > s) e = Math.max(e, arr + 30);
      if (x.leg === 'inbound') e = 24 * 60;
      ranges.push([Math.min(s, 24 * 60), Math.min(e, 24 * 60)]);
    });
    return ranges;
  }

  function foodTypeFor(country, kind) {
    if (kind === 'cafe') return '카페';
    var c = normCountry(country);
    if (c === '대한민국') return '한식';
    if (c === '일본') return '일식';
    if (c === '중국') return '중식';
    if (['베트남', '태국', '싱가포르', '대만', '홍콩', '말레이시아', '필리핀', '인도네시아', '인도'].indexOf(c) >= 0) return '아시안';
    return '양식';
  }

  function addCurationFood(t, city, e, country, stats) {
    if (t.food.some(function (f) { return f.name === e.name; })) return;
    t.food.push({
      id: uid('fd'),
      name: e.name,
      type: foodTypeFor(country, e.kind),
      hours: '',
      memo: '[' + (e.zone || '중심') + '] ' + (e.memo || '') + ' · 예상 ' + e.dur + '분',
      city: city
    });
    stats.food++;
  }

  function addCurationLodging(t, city, stays, stats) {
    var cityDays = t.days.filter(function (d) { return d.city === city; }).length;
    var nights = Math.max(1, (cityDays || t.days.length) - 1);
    var per = Math.max(1, Math.floor(nights / Math.max(1, stays.length)));
    stays.forEach(function (e, i) {
      if (t.info.lodging.some(function (l) { return l.name === e.name; })) { stats.skip++; return; }
      t.info.lodging.push({
        id: uid('lg'), name: e.name, address: '', checkin: STAY_DEFAULT_IN, checkout: STAY_DEFAULT_OUT,
        phone: '', city: city, zone: e.zone || '', memo: e.memo || '',
        lat: e.lat || '', lon: e.lon || '', src: 'curation'
      });
      var from = i * per + 1;
      var to = i === stays.length - 1 ? nights : Math.min(nights, (i + 1) * per);
      var nightLabel = nights >= stays.length ? (stays.length === 1 ? nights + '박' : from + '~' + to + '박차')
        : '후보 ' + (i + 1);
      var line = '숙소 · ' + city + ': ' + e.name + (e.memo ? ' (' + e.memo + ')' : '') +
        ' · ' + nightLabel + ' · 체크인 ' + STAY_DEFAULT_IN + ' · 체크아웃 ' + STAY_DEFAULT_OUT;
      if (t.info.memo.indexOf(e.name) < 0) t.info.memo = (t.info.memo ? t.info.memo + '\n' : '') + line;
      stats.lodging++;
    });
  }

  /* 여행 도시의 추천 숙소(기본 큐레이션 DB)를 비교 후보로 한 번에 담기 */
  function recommendStays() {
    var t = activeTrip();
    if (!t) return;
    var added = 0, missing = [], had = 0;
    t.cities.forEach(function (city) {
      var base = curationFor(city);
      var stays = list(base.list).filter(function (x) { return x.kind === 'stay' && !base.fallback; });
      var online = CUR_ONLINE[city];
      if (!stays.length && online && online.status === 'done') {
        stays = list(online.items).filter(function (x) { return x.kind === 'stay'; });
      }
      if (!stays.length) { missing.push(city); return; }
      stays.forEach(function (e) {
        var dup = t.info.lodging.some(function (l) {
          return l.name === e.name && ((l.city || '') === city || !l.city);
        });
        if (dup) { had++; return; }
        t.info.lodging.push({
          id: uid('lg'), name: e.name, address: '', checkin: STAY_DEFAULT_IN, checkout: STAY_DEFAULT_OUT,
          phone: '', city: city, zone: e.zone || '', memo: e.memo || '',
          lat: e.lat || '', lon: e.lon || '', src: 'curation'
        });
        added++;
      });
    });
    if (!added) {
      if (missing.length && !had) toast(missing.join(' · ') + ' 추천 숙소가 없어요 · 동선 추천의 🌐 실시간 검색을 먼저 하거나 숙소를 직접 추가해 주세요');
      else toast('이미 추천 숙소가 모두 담겨 있어요');
      return;
    }
    touchTrip(t);
    save();
    render();
    toast('추천 숙소 ' + added + '곳을 비교 목록에 담았어요' +
      (missing.length ? ' · ' + missing.join('·') + '은(는) 직접 추가' : ''));
  }

  /* ---------- schedule item modal ---------- */
  function findItem(id) {
    var t = activeTrip();
    if (!t) return null;
    for (var i = 0; i < t.days.length; i++) {
      var d = t.days[i];
      for (var k = 0; k < d.items.length; k++) {
        if (d.items[k].id === id) return { trip: t, day: d, item: d.items[k] };
      }
    }
    return null;
  }

  function openItemModal(id) {
    var t = activeTrip();
    if (!t) return;
    var found = id ? findItem(id) : null;
    var item = found ? found.item : null;
    var dayN = found ? found.day.n : (ui.day || 1);
    var dayOptions = t.days.map(function (d) {
      return { value: String(d.n), label: 'DAY ' + d.n + ' · ' + d.city };
    });
    recordModal({
      title: item ? '일정 수정' : '일정 추가',
      subtitle: item ? '시간과 장소를 고치면 타임라인이 다시 정렬됩니다.' : '시간과 장소를 입력하면 그날 타임라인에 쌓입니다.',
      form: 'item',
      submitLabel: item ? '저장' : '추가',
      fields: [
        { name: 'id', type: 'hidden', value: item ? item.id : '' },
        { name: 'day', label: 'DAY', type: 'select', options: dayOptions, value: String(dayN) },
        { name: 'time', label: '시간', type: 'time', value: item ? item.time : '09:00' },
        { name: 'title', label: '일정 이름', type: 'text', value: item ? item.title : '', placeholder: '예: 불국사 관람', required: true, maxlength: 60, span: 2 },
        { name: 'category', label: '카테고리', type: 'select', options: Object.keys(CATS), value: item ? item.category : '핵심' },
        { name: 'city', label: '도시', type: 'datalist', options: t.cities, value: item ? item.city : '', placeholder: '비우면 그날 도시 · 예: 오사카' },
        { name: 'place', label: '장소명', type: 'text', optional: true, value: item ? item.place : '', placeholder: '지도 검색에 사용됩니다', span: 2 },
        { name: 'memo', label: '메모', type: 'textarea', optional: true, rows: 2, value: item ? item.memo : '', placeholder: '예약 시간, 준비물, 주의사항', span: 2 },
        { name: 'country', label: '지도 국가', type: 'select', optional: true,
          options: [{ value: '__trip__', label: '여행 국가 따르기 (' + t.country + ')' }].concat(COUNTRIES.filter(function (c) { return c !== '기타'; })),
          value: item && item.country ? item.country : '__trip__',
          hint: '한 여행에 국내·해외가 섞여 있으면 항목별로 지정하세요.', span: 2 }
      ]
    });
  }

  function saveItemForm(form) {
    var t = activeTrip();
    if (!t) return;
    var v = Object.fromEntries(new FormData(form).entries());
    var title = String(v.title || '').trim();
    if (!title) { formError(form, '일정 이름을 입력해 주세요.'); return; }
    var dayN = Number(v.day) || 1;
    var target = t.days.filter(function (d) { return d.n === dayN; })[0];
    if (!target) { formError(form, 'DAY를 선택해 주세요.'); return; }

    var item = null;
    if (v.id) {
      for (var i = 0; i < t.days.length; i++) {
        var arr = t.days[i].items;
        for (var k = 0; k < arr.length; k++) {
          if (arr[k].id === v.id) { item = arr.splice(k, 1)[0]; break; }
        }
        if (item) break;
      }
    }
    item = Object.assign(item || { id: uid('it') }, {
      time: v.time || '09:00',
      title: title,
      category: CATS[v.category] ? v.category : '핵심',
      city: String(v.city || '').trim(),
      place: String(v.place || '').trim(),
      memo: String(v.memo || '').trim(),
      country: v.country && v.country !== '__trip__' ? v.country : ''
    });
    /* 숙소 자동 일정을 고치면 정보 탭 숙소 계획(구간)에도 시간·날짜를 반영 */
    if (item.autoKind && item.staySegId) {
      var seg = list(t.info.stayPlan).filter(function (s) { return s.id === item.staySegId; })[0];
      if (seg) {
        if (item.autoKind === 'stay-checkin') {
          seg.checkinDate = target.date;
          seg.checkinTime = item.time;
          if (seg.checkoutDate <= seg.checkinDate) seg.checkoutDate = addDaysISO(seg.checkinDate, 1);
        } else {
          seg.checkoutDate = target.date;
          seg.checkoutTime = item.time;
          if (seg.checkoutDate <= seg.checkinDate) seg.checkinDate = addDaysISO(seg.checkoutDate, -1);
        }
      }
    }
    target.items.push(item);
    target.items.sort(sortByTime);
    touchTrip(t);
    save();
    closeModal();
    ui.day = dayN;
    ui.allDays = false;
    render();
    toast(v.id ? '일정을 수정했어요' : '일정을 추가했어요');
  }

  function shiftItems(day, fromId) {
    var startIdx = 0;
    var sorted = day.items.slice().sort(sortByTime);
    if (fromId) {
      var idx = sorted.findIndex(function (x) { return x.id === fromId; });
      if (idx >= 0) startIdx = idx;
    }
    var clamped = false;
    var moved = 0;
    for (var i = startIdx; i < sorted.length; i++) {
      var at = parseTime(sorted[i].time);
      if (at === null) continue;
      var next = at + 60;
      if (next > 23 * 60 + 59) { next = 23 * 60 + 59; clamped = true; }
      sorted[i].time = fmtTime(next);
      moved++;
    }
    day.items = sorted;
    return { moved: moved, clamped: clamped };
  }

  /* ---------- ticket modal / viewer ---------- */
  function openTicketModal(id) {
    var t = activeTrip();
    if (!t) return;
    var k = id ? t.tickets.filter(function (x) { return x.id === id; })[0] : null;
    recordModal({
      title: k ? '티켓 수정' : '티켓 추가',
      subtitle: '항공 · 렌터카 · 숙소 · 패스 확인서를 한곳에 보관합니다.',
      form: 'ticket',
      submitLabel: k ? '저장' : '추가',
      fields: [
        { name: 'id', type: 'hidden', value: k ? k.id : '' },
        { name: 'type', label: '종류', type: 'select', options: TICKET_TYPES, value: k ? k.type : '항공 E-티켓', span: 2 },
        { name: 'title', label: '이름', type: 'text', required: true, maxlength: 70, value: k ? k.title : '', placeholder: '예: 인천 → 나리타 왕복', span: 2 },
        { name: 'ref', label: '예약번호', type: 'text', optional: true, maxlength: 40, value: k ? k.ref : '', placeholder: '예: ABC123' },
        { name: 'when', label: '일시', type: 'text', optional: true, maxlength: 60, value: k ? k.when : '', placeholder: '예: 1일차 10:30 출발' },
        { name: 'note', label: '메모', type: 'textarea', optional: true, rows: 2, value: k ? k.note : '', placeholder: '좌석, 수하물, 체크인 안내', span: 2 }
      ]
    });
  }

  function saveTicketForm(form) {
    var t = activeTrip();
    if (!t) return;
    var v = Object.fromEntries(new FormData(form).entries());
    var title = String(v.title || '').trim();
    if (!title) { formError(form, '티켓 이름을 입력해 주세요.'); return; }
    var k;
    if (v.id) {
      k = t.tickets.filter(function (x) { return x.id === v.id; })[0];
    }
    if (!k) {
      k = { id: uid('tk'), image: '', imageInfo: null };
      t.tickets.push(k);
    }
    k.type = TICKET_TYPES.indexOf(v.type) >= 0 ? v.type : '기타';
    k.title = title;
    k.ref = String(v.ref || '').trim();
    k.when = String(v.when || '').trim();
    k.note = String(v.note || '').trim();
    touchTrip(t);
    save();
    closeModal();
    render();
    toast(v.id ? '티켓을 수정했어요' : '티켓을 추가했어요');
    if (!v.id) openTicketViewer(k.id);
  }

  function openTicketViewer(id) {
    var t = activeTrip();
    var k = t && t.tickets.filter(function (x) { return x.id === id; })[0];
    if (!k) return;
    var size = k.imageInfo && k.imageInfo.bytes ? Math.round(k.imageInfo.bytes / 1024) + 'KB · ' + k.imageInfo.w + '×' + k.imageInfo.h : '';
    openModal(
      '<div class="modal-head"><div><span class="ticket-type">' + esc(k.type) + '</span>' +
        '<h2 style="margin-top:6px">' + esc(k.title) + '</h2></div>' +
        '<button type="button" class="icon-btn" data-action="close-modal" aria-label="닫기">✕</button></div>' +
      '<div class="modal-body">' +
        '<div class="viewer">' + (k.image
          ? '<img src="' + esc(k.image) + '" alt="' + esc(k.title) + ' 원본">'
          : '<div class="viewer-empty"><span class="em">🎫</span>등록된 원본 사진이 없어요.<br>아래 [사진 등록]으로 예약 화면을 찍어 두면<br>비행기 모드에서도 이 창으로 바로 열립니다.</div>') +
        '</div>' +
        '<dl class="kv">' +
          (k.ref ? '<div class="kv-row"><dt>예약번호</dt><dd>' + esc(k.ref) + '</dd></div>' : '') +
          (k.when ? '<div class="kv-row"><dt>일시</dt><dd>' + esc(k.when) + '</dd></div>' : '') +
          (k.note ? '<div class="kv-row"><dt>메모</dt><dd>' + esc(k.note) + '</dd></div>' : '') +
          '<div class="kv-row"><dt>저장 방식</dt><dd>' + (k.image ? '기기 저장 · ' + esc(size) : '기기 저장 (사진 미등록)') + '</dd></div>' +
        '</dl>' +
        '<p class="hint">📶 이 화면은 기기(localStorage)에 저장되어 비행기 모드에서도 열립니다. PC·모바일 동기화를 쓰면 사진도 시트에 함께 저장됩니다.</p>' +
        '<div class="modal-actions">' +
          '<label class="btn btn-soft" style="flex:1 1 auto">📷 사진 ' + (k.image ? '교체' : '등록') +
            '<input type="file" accept="image/*" class="visually-hidden" data-upload="ticket" data-id="' + k.id + '"></label>' +
          '<button type="button" class="btn btn-ghost" data-action="edit-ticket" data-id="' + k.id + '">정보 수정</button>' +
          '<button type="button" class="btn btn-danger" data-action="del-ticket" data-id="' + k.id + '">삭제</button>' +
        '</div>' +
      '</div>'
    );
  }

  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('read failed')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('image failed')); };
        img.onload = function () {
          try {
            var maxDim = 1400;
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            var scale = Math.min(1, maxDim / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale));
            var ch = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, cw, ch);
            ctx.drawImage(img, 0, 0, cw, ch);
            var dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve({
              dataUrl: dataUrl,
              width: cw,
              height: ch,
              bytes: Math.round(dataUrl.length * 0.75)
            });
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function handleUpload(input) {
    var file = input.files && input.files[0];
    var ticketId = input.dataset.id;
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('이미지 파일만 등록할 수 있어요.'); input.value = ''; return; }
    if (file.size > 15 * 1024 * 1024) { toast('15MB 이하 사진을 선택해 주세요.'); input.value = ''; return; }
    toast('사진을 압축해서 저장하는 중…');
    compressImage(file).then(function (img) {
      var t = activeTrip();
      var k = t && t.tickets.filter(function (x) { return x.id === ticketId; })[0];
      if (!k) return;
      k.image = img.dataUrl;
      k.imageInfo = { w: img.width, h: img.height, bytes: img.bytes };
      touchTrip(t);
      save();
      openTicketViewer(ticketId);
      toast('원본 사진을 저장했어요 · 오프라인에서도 열립니다');
    }).catch(function () {
      toast('사진을 저장하지 못했어요. 다른 사진으로 시도해 주세요.');
    }).then(function () {
      input.value = '';
    });
  }

  /* ---------- budget / food / lodging / checklist modals ---------- */
  function openBudgetModal(id) {
    var t = activeTrip();
    if (!t) return;
    var b = id ? t.budget.items.filter(function (x) { return x.id === id; })[0] : null;
    recordModal({
      title: b ? '지출 수정' : '지출 추가',
      subtitle: '통화를 고르면 통화별 합계와 원화 환산이 자동 계산됩니다.',
      form: 'budget',
      submitLabel: b ? '저장' : '추가',
      fields: [
        { name: 'id', type: 'hidden', value: b ? b.id : '' },
        { name: 'label', label: '항목', type: 'text', required: true, maxlength: 50, value: b ? b.label : '', placeholder: '예: 숙소 2박', span: 2 },
        { name: 'amount', label: '금액', type: 'number', inputmode: 'decimal', min: 0, step: '1', required: true, value: b ? b.amount : '', placeholder: '0' },
        { name: 'currency', label: '통화', type: 'select', options: Object.keys(CUR), value: b ? b.currency : 'KRW' },
        { name: 'category', label: '분류', type: 'select', options: BUDGET_CATS, value: b ? b.category : '식비', span: 2 }
      ]
    });
  }

  function saveBudgetForm(form) {
    var t = activeTrip();
    if (!t) return;
    var v = Object.fromEntries(new FormData(form).entries());
    var label = String(v.label || '').trim();
    var amount = num(v.amount);
    if (!label) { formError(form, '항목 이름을 입력해 주세요.'); return; }
    if (!(amount > 0)) { formError(form, '금액을 0보다 크게 입력해 주세요.'); return; }
    var b = v.id ? t.budget.items.filter(function (x) { return x.id === v.id; })[0] : null;
    if (!b) { b = { id: uid('bg') }; t.budget.items.push(b); }
    b.label = label;
    b.amount = amount;
    b.currency = CUR[v.currency] ? v.currency : 'KRW';
    b.category = BUDGET_CATS.indexOf(v.category) >= 0 ? v.category : '기타';
    touchTrip(t);
    save();
    closeModal();
    render();
    toast(v.id ? '지출을 수정했어요' : '지출을 추가했어요');
  }

  function openFoodModal(id) {
    var t = activeTrip();
    if (!t) return;
    var f = id ? t.food.filter(function (x) { return x.id === id; })[0] : null;
    recordModal({
      title: f ? '맛집 수정' : '맛집 추가',
      subtitle: '장소명을 지도 검색어로 사용합니다.',
      form: 'food',
      submitLabel: f ? '저장' : '추가',
      fields: [
        { name: 'id', type: 'hidden', value: f ? f.id : '' },
        { name: 'name', label: '장소명', type: 'text', required: true, maxlength: 60, value: f ? f.name : '', placeholder: '예: 황리단길 한옥 카페', span: 2 },
        { name: 'type', label: '종류', type: 'select', options: ['한식', '일식', '양식', '중식', '아시안', '카페', '디저트', '기타'], value: f ? f.type : '한식' },
        { name: 'city', label: '도시', type: 'datalist', options: t.cities, value: f ? f.city : (t.cities[0] || ''), placeholder: '예: 경주' },
        { name: 'hours', label: '영업시간', type: 'text', optional: true, maxlength: 40, value: f ? f.hours : '', placeholder: '예: 10:00 - 21:00', span: 2 },
        { name: 'memo', label: '메모', type: 'textarea', optional: true, rows: 2, value: f ? f.memo : '', placeholder: '예약 여부, 대표 메뉴', span: 2 }
      ]
    });
  }

  function saveFoodForm(form) {
    var t = activeTrip();
    if (!t) return;
    var v = Object.fromEntries(new FormData(form).entries());
    var name = String(v.name || '').trim();
    if (!name) { formError(form, '장소명을 입력해 주세요.'); return; }
    var f = v.id ? t.food.filter(function (x) { return x.id === v.id; })[0] : null;
    if (!f) { f = { id: uid('fd') }; t.food.push(f); }
    f.name = name;
    f.type = String(v.type || '기타');
    f.city = String(v.city || '').trim();
    f.hours = String(v.hours || '').trim();
    f.memo = String(v.memo || '').trim();
    touchTrip(t);
    save();
    closeModal();
    render();
    toast(v.id ? '맛집을 수정했어요' : '맛집을 추가했어요');
  }

  function openLodgingModal(id) {
    var t = activeTrip();
    if (!t) return;
    var l = id ? t.info.lodging.filter(function (x) { return x.id === id; })[0] : null;
    recordModal({
      title: l ? '숙소 수정' : '숙소 추가',
      subtitle: '체크인 시간·주소·특징을 적어 두면 비교 카드와 일정에 그대로 쓰입니다.',
      form: 'lodging',
      submitLabel: l ? '저장' : '추가',
      fields: [
        { name: 'id', type: 'hidden', value: l ? l.id : '' },
        { name: 'name', label: '숙소 이름', type: 'text', required: true, maxlength: 60, value: l ? l.name : '', placeholder: '예: 라한셀렉트 경주', span: 2 },
        { name: 'city', label: '도시', type: 'datalist', options: t.cities, value: l ? l.city : (t.cities[0] || '') },
        { name: 'zone', label: '권역', type: 'text', optional: true, maxlength: 40, value: l ? l.zone : '', placeholder: '예: 보문 · 해운대' },
        { name: 'address', label: '주소', type: 'text', optional: true, maxlength: 90, value: l ? l.address : '', placeholder: '지도 검색에 사용됩니다', span: 2 },
        { name: 'phone', label: '전화', type: 'tel', optional: true, maxlength: 30, value: l ? l.phone : '', placeholder: '예: +81-3-0000-0000' },
        { name: 'checkin', label: '기본 체크인', type: 'text', optional: true, maxlength: 5, value: l ? (l.checkin || STAY_DEFAULT_IN) : STAY_DEFAULT_IN, placeholder: '15:00' },
        { name: 'checkout', label: '기본 체크아웃', type: 'text', optional: true, maxlength: 5, value: l ? (l.checkout || STAY_DEFAULT_OUT) : STAY_DEFAULT_OUT, placeholder: '11:00' },
        { name: 'memo', label: '특징 · 가격대', type: 'textarea', optional: true, rows: 2, value: l ? l.memo : '', placeholder: '예: 4성 · 보문호 레이크뷰 · 1박 18만원대', span: 2 }
      ]
    });
  }

  function saveLodgingForm(form) {
    var t = activeTrip();
    if (!t) return;
    var v = Object.fromEntries(new FormData(form).entries());
    var name = String(v.name || '').trim();
    if (!name) { formError(form, '숙소 이름을 입력해 주세요.'); return; }
    var l = v.id ? t.info.lodging.filter(function (x) { return x.id === v.id; })[0] : null;
    if (!l) { l = { id: uid('lg'), src: 'manual' }; t.info.lodging.push(l); }
    l.name = name;
    l.address = String(v.address || '').trim();
    l.city = String(v.city || '').trim();
    l.zone = String(v.zone || '').trim();
    l.phone = String(v.phone || '').trim();
    l.checkin = parseTime(v.checkin) === null ? STAY_DEFAULT_IN : String(v.checkin).trim();
    l.checkout = parseTime(v.checkout) === null ? STAY_DEFAULT_OUT : String(v.checkout).trim();
    l.memo = String(v.memo || '').trim();
    if (l.lat === undefined) l.lat = '';
    if (l.lon === undefined) l.lon = '';
    /* 이미 잡아 둔 숙박 구간에도 이름·도시 변경을 반영 */
    list(t.info.stayPlan).forEach(function (seg) {
      if (seg.lodgingId !== l.id) return;
      seg.name = l.name;
      if (l.city) seg.city = l.city;
    });
    closeModal();
    commitStay(t, v.id ? '숙소를 수정했어요' : '숙소를 추가했어요');
  }

  function openCheckModal(id) {
    var t = activeTrip();
    if (!t) return;
    var c = id ? t.checklist.filter(function (x) { return x.id === id; })[0] : null;
    recordModal({
      title: '준비물 수정',
      form: 'check-edit',
      submitLabel: '저장',
      fields: [
        { name: 'id', type: 'hidden', value: c ? c.id : '' },
        { name: 'label', label: '준비물', type: 'text', required: true, maxlength: 60, value: c ? c.label : '', span: 2 },
        { name: 'group', label: '분류', type: 'select', options: CHECK_GROUPS, value: c ? c.group : '기타', span: 2 }
      ]
    });
  }

  function saveCheckEditForm(form) {
    var t = activeTrip();
    if (!t) return;
    var v = Object.fromEntries(new FormData(form).entries());
    var c = t.checklist.filter(function (x) { return x.id === v.id; })[0];
    if (!c) return;
    var label = String(v.label || '').trim();
    if (!label) { formError(form, '준비물 이름을 입력해 주세요.'); return; }
    c.label = label;
    c.group = CHECK_GROUPS.indexOf(v.group) >= 0 ? v.group : '기타';
    touchTrip(t);
    save();
    closeModal();
    render();
    toast('준비물을 수정했어요');
  }

  /* ---------- sync modal ---------- */
  function openSyncModal(status, statusKind) {
    var s = state.settings || {};
    var last = s.lastSyncAt ? new Date(s.lastSyncAt) : null;
    var lastText = last && !isNaN(last.getTime())
      ? last.getFullYear() + '.' + pad2(last.getMonth() + 1) + '.' + pad2(last.getDate()) + ' ' + pad2(last.getHours()) + ':' + pad2(last.getMinutes())
      : '아직 없음';
    openModal(
      modalHead('동기화 / 백업', '기기 백업과 PC ↔ 모바일 실시간 연동을 함께 관리합니다.') +
      '<div class="modal-body">' +
        '<div class="sync-status' + (statusKind ? ' ' + statusKind : '') + '" id="syncStatus">' +
          esc(status || ('마지막 동기화: ' + lastText + '\n여행 ' + state.trips.length + '개 · 기기 저장소 사용 중')) + '</div>' +

        '<div class="sync-block">' +
          '<h3>구글 시트 실시간 동기화 (SSOT)</h3>' +
          '<p>Apps Script 웹앱 URL을 붙여넣으면, 저장할 때마다 시트를 비우고 현재 여행 전체로 교체합니다. 다른 기기에서는 [불러오기]로 같은 내용을 받습니다.</p>' +
          '<label class="field"><span>Apps Script 웹앱 URL</span>' +
            '<input type="url" id="sheetUrl" value="' + esc(s.sheetUrl || '') + '" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false"></label>' +
          '<div class="sync-row">' +
            '<button type="button" class="btn btn-ghost" data-action="sync-test">🔗 연결 테스트</button>' +
            '<button type="button" class="btn btn-soft" data-action="sync-load">⬇ 불러오기</button>' +
            '<button type="button" class="btn btn-primary" data-action="sync-save">⬆ 저장하기</button>' +
          '</div>' +
          '<div class="toggle-row"><span>1분마다 자동으로 불러오기</span>' +
            '<input type="checkbox" id="autoSync" ' + (s.autoSync ? 'checked' : '') + ' aria-label="자동 동기화"></div>' +
          '<p class="hint">처음 한 번은 아래 Apps Script 코드를 스프레드시트에 붙여넣고 웹앱으로 배포해야 합니다. 배포 액세스는 [모든 사용자]로 두어야 앱에서 연결됩니다.</p>' +
          '<details class="gs-details"><summary>▸ Apps Script 코드 보기 · 복사</summary>' +
            '<pre class="gs-code" id="gsCode">' + esc(GS_CODE) + '</pre>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="copy-gs">📋 코드 복사</button>' +
          '</details>' +
        '</div>' +

        '<div class="sync-block">' +
          '<h3>JSON 파일 백업</h3>' +
          '<p>티켓 사진까지 한 파일에 담깁니다. 기기를 바꾸거나 초기화하기 전에 내려받아 두세요.</p>' +
          '<div class="sync-row">' +
            '<button type="button" class="btn btn-ghost" data-action="export-json">📤 JSON 내보내기</button>' +
            '<label class="btn btn-ghost" style="flex:1 1 auto">📥 JSON 불러오기' +
              '<input type="file" accept="application/json,.json" class="visually-hidden" data-import="json"></label>' +
          '</div>' +
        '</div>' +

        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost" data-action="close-modal">닫기</button>' +
        '</div>' +
      '</div>',
      true
    );
    updateAutoSyncTimer();
  }

  function setSyncStatus(msg, kind) {
    var el = $('#syncStatus');
    if (!el) { toast(msg); return; }
    el.textContent = msg;
    el.className = 'sync-status' + (kind ? ' ' + kind : '');
  }

  function readSheetUrl() {
    var input = $('#sheetUrl');
    return input ? input.value.trim() : (state.settings.sheetUrl || '');
  }

  function sheetEndpoint(url, action) {
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'action=' + action + '&t=' + Date.now();
  }

  function syncTest() {
    var url = readSheetUrl();
    if (!url) { setSyncStatus('Apps Script 웹앱 URL을 먼저 입력해 주세요.', 'err'); return; }
    state.settings.sheetUrl = url;
    save();
    setSyncStatus('연결을 확인하는 중…');
    fetch(sheetEndpoint(url, 'ping'), { method: 'GET' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok) setSyncStatus('연결됐습니다. ' + (data.time ? '서버 시각 ' + data.time : ''), 'ok');
        else setSyncStatus('서버 응답이 올바르지 않습니다: ' + ((data && data.error) || '알 수 없는 오류'), 'err');
      })
      .catch(function (err) {
        setSyncStatus('연결하지 못했습니다. 배포 액세스가 [모든 사용자]인지, URL이 /exec로 끝나는지 확인해 주세요.\n(' + err.message + ')', 'err');
      });
  }

  function syncLoad() {
    var url = readSheetUrl();
    if (!url) { setSyncStatus('Apps Script 웹앱 URL을 먼저 입력해 주세요.', 'err'); return; }
    state.settings.sheetUrl = url;
    save();
    setSyncStatus('시트에서 불러오는 중…');
    fetch(sheetEndpoint(url, 'load'), { method: 'GET' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.error) || '서버 응답 오류');
        if (!data.state || !Array.isArray(data.state.trips) || !data.state.trips.length) {
          setSyncStatus('시트에 저장된 여행이 없습니다. 먼저 이 기기에서 [저장하기]를 눌러 주세요.', 'err');
          return;
        }
        var incoming = data.state;
        var when = incoming.updatedAt ? fmtStamp(incoming.updatedAt) : '알 수 없음';
        setSyncStatus('시트에서 여행 ' + incoming.trips.length + '개를 찾았습니다. 최근 저장 ' + when + '.\n현재 기기 데이터를 시트 내용으로 교체합니다.', 'ok');
        pendingConfirm = function () {
          applyIncoming(incoming);
          openSyncModal('시트의 여행 ' + incoming.trips.length + '개로 교체했습니다.', 'ok');
        };
        var actions = $('.modal .modal-actions');
        if (actions) {
          actions.innerHTML = '<button type="button" class="btn btn-ghost" data-action="close-modal">취소</button>' +
            '<button type="button" class="btn btn-primary" data-action="confirm-yes">시트 내용으로 교체</button>';
        }
      })
      .catch(function (err) {
        setSyncStatus('불러오지 못했습니다.\n(' + err.message + ')\n배포 액세스가 [모든 사용자]인지 확인해 주세요.', 'err');
      });
  }

  function syncSave() {
    var url = readSheetUrl();
    if (!url) { setSyncStatus('Apps Script 웹앱 URL을 먼저 입력해 주세요.', 'err'); return; }
    state.settings.sheetUrl = url;
    save();
    setSyncStatus('시트에 저장하는 중… (기존 내용을 지우고 교체합니다)');
    var payload = {
      action: 'save',
      state: { version: 1, activeId: state.activeId, updatedAt: state.updatedAt, trips: state.trips }
    };
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { throw new Error('응답을 해석할 수 없습니다. 배포 액세스를 확인해 주세요.'); }
        if (!data.ok) throw new Error(data.error || '저장 실패');
        state.settings.lastSyncAt = nowISO();
        save();
        setSyncStatus('저장했습니다. 시트에 여행 ' + (data.count || 0) + '개를 기록했습니다.\n다른 기기에서 [불러오기]를 누르면 같은 내용을 받습니다.', 'ok');
        getTrip(state.activeId);
      })
      .catch(function (err) {
        setSyncStatus('저장하지 못했습니다.\n(' + err.message + ')\n배포 액세스 [모든 사용자]와 URL을 확인해 주세요.', 'err');
      });
  }

  function applyIncoming(incoming) {
    var next = normalizeState({
      trips: incoming.trips,
      activeId: incoming.activeId,
      updatedAt: nowISO(),
      settings: state.settings
    });
    state = next;
    reconcileStayPlans();
    ui.tab = 'all';
    ui.day = 1;
    ui.allDays = false;
    save();
    render();
    toast('여행 데이터를 교체했어요');
  }

  function pullQuiet() {
    var url = state.settings && state.settings.sheetUrl;
    if (!url || !navigator.onLine) return;
    fetch(sheetEndpoint(url, 'load'), { method: 'GET' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !data.state || !data.state.trips || !data.state.trips.length) return;
        if (data.updatedAt && data.updatedAt > (state.updatedAt || '')) {
          applyIncoming(data.state);
          toast('시트에서 최신 내용을 받았어요');
        }
      })
      .catch(function () { });
  }

  function updateAutoSyncTimer() {
    clearInterval(autoTimer);
    autoTimer = null;
    if (state.settings && state.settings.autoSync && state.settings.sheetUrl) {
      autoTimer = setInterval(pullQuiet, 60000);
    }
  }

  function downloadJSON() {
    var payload = {
      app: 'my-travel-planner',
      version: 1,
      exportedAt: nowISO(),
      activeId: state.activeId,
      trips: state.trips
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'my-travel-planner-' + todayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast('JSON 파일로 내보냈어요');
  }

  function importJSON(file) {
    file.text().then(function (text) {
      var data;
      try { data = JSON.parse(text); } catch (e) { toast('JSON 파일을 읽을 수 없어요.'); return; }
      var trips = Array.isArray(data && data.trips) ? data.trips : (Array.isArray(data) ? data : null);
      if (!trips || !trips.length) { toast('여행 데이터가 들어 있지 않아요.'); return; }
      openConfirm('JSON 불러오기',
        '파일에 담긴 여행 <b>' + trips.length + '개</b>로 현재 데이터를 교체합니다. 지금 기기의 여행 목록은 사라집니다.',
        '교체', function () {
          applyIncoming({ trips: trips, activeId: data && data.activeId });
        });
    });
  }

  /* ---------- events ---------- */
  var CLICK = {
    'tab': function (el) { ui.tab = el.dataset.tab; ui.allDays = false; render(); window.scrollTo(0, 0); },
    'prev-tab': function () {
      var i = TABS.reduce(function (a, t, idx) { return t.id === ui.tab ? idx : a; }, 0);
      if (i > 0) { ui.tab = TABS[i - 1].id; ui.allDays = false; render(); window.scrollTo(0, 0); }
    },
    'next-tab': function () {
      var i = TABS.reduce(function (a, t, idx) { return t.id === ui.tab ? idx : a; }, 0);
      if (i < TABS.length - 1) { ui.tab = TABS[i + 1].id; ui.allDays = false; render(); window.scrollTo(0, 0); }
    },
    'select-day': function (el) {
      ui.day = Number(el.dataset.day) || 1;
      ui.allDays = false;
      render();
    },
    'jump-day': function (el) {
      ui.tab = 'plan';
      ui.day = Number(el.dataset.day) || 1;
      ui.allDays = false;
      render();
      window.scrollTo(0, 0);
    },
    'toggle-all-days': function () { ui.allDays = !ui.allDays; render(); },

    'open-trip-switch': function () { openTripSwitch(); },
    'new-trip': function () { openTripModal(null, false); },
    'dismiss-onboarding': function () { markOnboarded(); closeModal(); toast('샘플 여행 2개로 둘러보세요'); },
    'trip-switch': function (el) {
      var id = el.dataset.id;
      if (!getTrip(id)) return;
      state.activeId = id;
      ui.tab = 'all'; ui.day = 1; ui.allDays = false;
      save(); closeModal(); render();
      toast('여행을 바꿨어요');
    },
    'trip-edit': function (el) {
      var id = el.dataset.id || state.activeId;
      var t = getTrip(id);
      if (t) openTripModal(t, false);
    },
    'trip-delete': function (el) {
      var t = getTrip(el.dataset.id);
      if (!t) return;
      openConfirm('여행 삭제', "'" + esc(t.title) + "' 여행을 삭제합니다. 일정·티켓·준비물이 함께 사라지고 되돌릴 수 없습니다.",
        '삭제', function () {
          state.trips = state.trips.filter(function (x) { return x.id !== t.id; });
          if (state.activeId === t.id) state.activeId = state.trips[0] ? state.trips[0].id : null;
          ui.tab = 'all'; ui.day = 1;
          save(); closeModal(); render();
          toast('여행을 삭제했어요');
        });
    },

    'city-add': function () { addCityFromInput(); },
    'city-del': function (el) {
      captureTripForm();
      var prev = tripDraft.cities.slice();
      tripDraft.cities.splice(Number(el.dataset.i), 1);
      syncLegCityDefaults(prev);
      paintTripModal();
    },
    'city-up': function (el) {
      captureTripForm();
      var prev = tripDraft.cities.slice();
      var i = Number(el.dataset.i);
      if (i > 0) {
        var tmp = tripDraft.cities[i - 1];
        tripDraft.cities[i - 1] = tripDraft.cities[i];
        tripDraft.cities[i] = tmp;
      }
      syncLegCityDefaults(prev);
      paintTripModal();
    },
    'city-down': function (el) {
      captureTripForm();
      var prev = tripDraft.cities.slice();
      var i = Number(el.dataset.i);
      if (i < tripDraft.cities.length - 1) {
        var tmp = tripDraft.cities[i + 1];
        tripDraft.cities[i + 1] = tripDraft.cities[i];
        tripDraft.cities[i] = tmp;
      }
      syncLegCityDefaults(prev);
      paintTripModal();
    },

    'add-item': function (el) {
      if (el.dataset.day) ui.day = Number(el.dataset.day);
      ui.allDays = false;
      openItemModal(null);
    },
    'edit-item': function (el) {
      var foundItem = findItem(el.dataset.id);
      if (foundItem && foundItem.item.leg === 'segment') { openLegModal(foundItem.item.id); return; }
      openItemModal(el.dataset.id);
    },
    'add-leg': function () { openLegModal(null); },
    'open-curation': function () { openCuration(); },
    'cur-all': function () { setCurBoxes(true); },
    'cur-none': function () { setCurBoxes(false); },
    'cur-cat': function (el) {
      var group = document.querySelector('#modalRoot .cur-group[data-city="' + el.dataset.city + '"][data-kind="' + el.dataset.kind + '"]');
      if (!group) return;
      var boxes = group.querySelectorAll('[data-cur]');
      var all = Array.prototype.every.call(boxes, function (b) { return b.checked; });
      setCurBoxes(!all, el.dataset.city, el.dataset.kind);
    },
    'cur-apply': function () { applyCuration(); },
    'cur-online': function (el) { loadOnlineCity(el.dataset.city); },
    'cur-static': function (el) {
      delete CUR_ONLINE[el.dataset.city];
      CUR_NET.mode = 'idle';
      CUR_NET.msg = '기본 큐레이션으로 전환 · ' + el.dataset.city;
      refreshCurCity(el.dataset.city);
    },
    'cur-copy-request': function () {
      var t = activeTrip();
      if (t) copyText(curRequestText(t), '요청문을 복사했어요 · 김비서에게 붙여넣기');
    },
    'cur-copy-schema': function () {
      copyText(curSchemaText(), 'JSON 형식을 복사했어요');
    },
    'cur-import': function () {
      var ta = document.getElementById('curJson');
      importCurationJSON(ta ? ta.value : '');
    },
    'del-item': function (el) {
      var found = findItem(el.dataset.id);
      if (!found) return;
      var isAutoStay = found.item.autoKind === 'stay-checkin' || found.item.autoKind === 'stay-checkout';
      openConfirm('일정 삭제', "'" + esc(found.item.title) + "' 일정을 삭제할까요?" +
        (isAutoStay ? ' 숙소 계획의 체크인·체크아웃에서만 빼 두고, 정보 탭 숙소 계획에서 언제든 다시 넣을 수 있습니다.' : ''),
        '삭제', function () {
          if (isAutoStay) {
            var seg = list(found.trip.info.stayPlan).filter(function (s) { return s.id === found.item.staySegId; })[0];
            if (seg) {
              if (found.item.autoKind === 'stay-checkin') seg.hideCheckin = true;
              else seg.hideCheckout = true;
            }
          }
          found.day.items = found.day.items.filter(function (x) { return x.id !== found.item.id; });
          touchTrip(found.trip);
          save(); closeModal(); render();
          toast(isAutoStay ? '숙소 일정을 뺐어요 · 정보 탭에서 다시 넣을 수 있어요' : '일정을 삭제했어요');
        });
    },
    'shift-item': function (el) {
      var found = findItem(el.dataset.id);
      if (!found) return;
      var r = shiftItems(found.day, found.item.id);
      touchTrip(found.trip);
      save(); render();
      toast(r.moved + '개 일정을 1시간 늦췄어요' + (r.clamped ? ' (자정을 넘어 23:59로 조정)' : ''));
    },
    'shift-day': function (el) {
      var t = activeTrip();
      if (!t) return;
      var day = t.days.filter(function (d) { return d.n === Number(el.dataset.day); })[0];
      if (!day || !day.items.length) { toast('이 날은 일정이 없어요'); return; }
      var r = shiftItems(day, null);
      touchTrip(t);
      save(); render();
      toast('DAY ' + day.n + ' 일정 ' + r.moved + '개를 1시간 늦췄어요' + (r.clamped ? ' (자정을 넘어 23:59로 조정)' : ''));
    },

    'add-ticket': function () { openTicketModal(null); },
    'edit-ticket': function (el) { openTicketModal(el.dataset.id); },
    'view-ticket': function (el) { openTicketViewer(el.dataset.id); },
    'del-ticket': function (el) {
      var t = activeTrip();
      var k = t && t.tickets.filter(function (x) { return x.id === el.dataset.id; })[0];
      if (!k) return;
      openConfirm('티켓 삭제', "'" + esc(k.title) + "' 티켓과 저장된 사진을 삭제할까요?", '삭제', function () {
        t.tickets = t.tickets.filter(function (x) { return x.id !== k.id; });
        touchTrip(t);
        save(); closeModal(); render();
        toast('티켓을 삭제했어요');
      });
    },

    'add-budget': function () { openBudgetModal(null); },
    'edit-budget': function (el) { openBudgetModal(el.dataset.id); },
    'del-budget': function (el) {
      var t = activeTrip();
      var b = t && t.budget.items.filter(function (x) { return x.id === el.dataset.id; })[0];
      if (!b) return;
      openConfirm('지출 삭제', "'" + esc(b.label) + "' 지출을 삭제할까요?", '삭제', function () {
        t.budget.items = t.budget.items.filter(function (x) { return x.id !== b.id; });
        touchTrip(t);
        save(); closeModal(); render();
        toast('지출을 삭제했어요');
      });
    },

    'add-food': function () { openFoodModal(null); },
    'edit-food': function (el) { openFoodModal(el.dataset.id); },
    'del-food': function (el) {
      var t = activeTrip();
      var f = t && t.food.filter(function (x) { return x.id === el.dataset.id; })[0];
      if (!f) return;
      openConfirm('맛집 삭제', "'" + esc(f.name) + "' 맛집을 삭제할까요?", '삭제', function () {
        t.food = t.food.filter(function (x) { return x.id !== f.id; });
        touchTrip(t);
        save(); closeModal(); render();
        toast('맛집을 삭제했어요');
      });
    },

    'add-lodging': function () { openLodgingModal(null); },
    'edit-lodging': function (el) { openLodgingModal(el.dataset.id); },
    'stay-recommend': function () { recommendStays(); },
    'stay-night-toggle': function (el) {
      var t = activeTrip();
      if (!t) return;
      var date = el.dataset.date, lid = el.dataset.lodging;
      var map = stayNightSegmentMap(t);
      var cur = map[date] ? map[date].lodgingId : '';
      var next = cur === lid ? '' : lid;
      if (!assignStayNight(t, date, next)) return;
      var day = stayDayByDate(t, date);
      var lod = lodgingById(t, lid);
      commitStay(t, next
        ? 'DAY ' + (day ? day.n : '') + ' 밤 · ' + (lod ? lod.name : '숙소') + ' 배정'
        : 'DAY ' + (day ? day.n : '') + ' 밤 배정을 해제했어요');
    },
    'stay-seg-del': function (el) {
      var t = activeTrip();
      if (!t) return;
      var seg = list(t.info.stayPlan).filter(function (x) { return x.id === el.dataset.seg; })[0];
      if (!seg) return;
      openConfirm('숙소 구간 해제', "'" + esc(seg.name) + "' 구간의 체크인·체크아웃 일정을 뺄까요? 숙소 후보는 그대로 남습니다.",
        '해제', function () {
          clearStaySegment(t, seg);
          commitStay(t, '숙소 구간을 해제했어요');
        });
    },
    'stay-unhide': function (el) {
      var t = activeTrip();
      if (!t) return;
      var seg = list(t.info.stayPlan).filter(function (x) { return x.id === el.dataset.seg; })[0];
      if (!seg) return;
      if (el.dataset.kind === 'checkin') seg.hideCheckin = false;
      else seg.hideCheckout = false;
      commitStay(t, (el.dataset.kind === 'checkin' ? '체크인' : '체크아웃') + ' 일정을 다시 넣었어요');
    },
    'del-lodging': function (el) {
      var t = activeTrip();
      var l = t && t.info.lodging.filter(function (x) { return x.id === el.dataset.id; })[0];
      if (!l) return;
      var used = list(t.info.stayPlan).filter(function (s) { return s.lodgingId === l.id; }).length;
      openConfirm('숙소 삭제', "'" + esc(l.name) + "' 숙소를 삭제할까요?" +
        (used ? ' 이 숙소로 잡은 ' + used + '개 구간과 체크인·체크아웃 일정도 함께 빠집니다.' : ''),
        '삭제', function () {
          t.info.lodging = t.info.lodging.filter(function (x) { return x.id !== l.id; });
          t.info.stayPlan = list(t.info.stayPlan).filter(function (s) { return s.lodgingId !== l.id; });
          commitStay(t, '숙소를 삭제했어요');
        });
    },

    'edit-check': function (el) { openCheckModal(el.dataset.id); },
    'del-check': function (el) {
      var t = activeTrip();
      var c = t && t.checklist.filter(function (x) { return x.id === el.dataset.id; })[0];
      if (!c) return;
      t.checklist = t.checklist.filter(function (x) { return x.id !== c.id; });
      touchTrip(t);
      save(); render();
      toast('준비물을 삭제했어요');
    },
    'del-emergency': function (el) {
      var t = activeTrip();
      if (!t) return;
      t.info.emergency = t.info.emergency.filter(function (x) { return x.id !== el.dataset.id; });
      touchTrip(t);
      save(); render();
      toast('연락처를 삭제했어요');
    },

    'open-sync': function () { openSyncModal(); },
    'sync-test': function () { syncTest(); },
    'sync-load': function () { syncLoad(); },
    'sync-save': function () { syncSave(); },
    'export-json': function () { downloadJSON(); },
    'copy-gs': function () {
      var code = GS_CODE;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () { toast('Apps Script 코드를 복사했어요'); })
          .catch(function () { toast('복사하지 못했어요. 코드를 길게 눌러 선택해 주세요.'); });
      } else {
        toast('복사하지 못했어요. 코드를 길게 눌러 선택해 주세요.');
      }
    },
    'close-modal': function () { closeModal(); },
    'confirm-yes': function () {
      var fn = pendingConfirm;
      pendingConfirm = null;
      closeModal();
      if (typeof fn === 'function') fn();
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var fn = CLICK[el.dataset.action];
    if (!fn) return;
    e.preventDefault();
    fn(el, e);
  });

  document.addEventListener('change', function (e) {
    var el = e.target;

    if (el.matches('[data-cur]')) { updateCurCount(); return; }

    if (el.matches('[data-check]')) {
      var t = activeTrip();
      if (!t) return;
      var c = t.checklist.filter(function (x) { return x.id === el.dataset.check; })[0];
      if (!c) return;
      c.done = !!el.checked;
      touchTrip(t);
      save();
      var row = el.closest('.check-item');
      if (row) row.classList.toggle('done', c.done);
      refreshCheckStats(t);
      return;
    }

    if (el.matches('[data-change="stay-night"]')) {
      var st = activeTrip();
      if (!st) return;
      if (!assignStayNight(st, el.dataset.date, el.value)) return;
      commitStay(st, el.value ? '숙소 배정을 저장했어요' : '숙소 배정을 해제했어요');
      return;
    }

    if (el.matches('[data-change="stay-all"]')) {
      var sa = activeTrip();
      if (!sa) return;
      assignAllStayNights(sa, el.value);
      commitStay(sa, el.value ? '전 일정 숙소를 같게 맞췄어요' : '숙소 배정을 모두 해제했어요');
      return;
    }

    if (el.matches('[data-change="stay-seg-time"]')) {
      var stt = activeTrip();
      if (!stt) return;
      var segT = list(stt.info.stayPlan).filter(function (x) { return x.id === el.dataset.seg; })[0];
      if (!segT) return;
      var tv = String(el.value || '').trim();
      if (parseTime(tv) === null) { toast('시간을 다시 골라 주세요'); render(); return; }
      if (el.dataset.kind === 'checkin') segT.checkinTime = tv;
      else segT.checkoutTime = tv;
      commitStay(stt, (el.dataset.kind === 'checkin' ? '체크인 ' : '체크아웃 ') + tv + ' 반영');
      return;
    }

    if (el.matches('[data-change="stay-seg-date"]')) {
      var sdt = activeTrip();
      if (!sdt) return;
      var segD = list(sdt.info.stayPlan).filter(function (x) { return x.id === el.dataset.seg; })[0];
      if (!segD) return;
      if (!setStaySegmentDate(sdt, segD, el.dataset.kind, el.value)) {
        toast('체크아웃은 체크인 다음 날 이후로 정해 주세요');
        render();
        return;
      }
      commitStay(sdt, (el.dataset.kind === 'checkin' ? '체크인' : '체크아웃') + ' 날짜를 옮겼어요');
      return;
    }

    if (el.matches('[data-change="day-city"]')) {
      var trip = activeTrip();
      if (!trip) return;
      var day = trip.days.filter(function (d) { return d.n === Number(el.dataset.day); })[0];
      if (!day) return;
      day.city = el.value;
      touchTrip(trip);
      save();
      render();
      return;
    }

    if (el.matches('[data-upload="ticket"]')) { handleUpload(el); return; }
    if (el.matches('[data-import="json"]')) {
      var file = el.files && el.files[0];
      if (file) importJSON(file);
      el.value = '';
      return;
    }

    if (el.matches('[data-rate]')) {
      var tr = activeTrip();
      if (!tr) return;
      var v = Number(el.value);
      if (!isFinite(v) || v <= 0) return;
      tr.budget.rates = tr.budget.rates || {};
      tr.budget.rates[el.dataset.rate] = v;
      touchTrip(tr);
      save();
      render();
      return;
    }

    if (el.id === 'autoSync') {
      state.settings.autoSync = !!el.checked;
      save();
      updateAutoSyncTimer();
      return;
    }

    if (el.id === 'sheetUrl') {
      state.settings.sheetUrl = el.value.trim();
      save();
      return;
    }

    if (el.closest('#tripForm')) {
      var form = $('#tripForm');
      if (!form) return;
      if (el.name === 'country') {
        captureTripForm();
        if (tripDraft && tripDraft.legs) {
          tripDraft.legs.out.mode = '';
          tripDraft.legs.in.mode = '';
        }
        paintTripModal();
        return;
      }
      if (el.name === 'start' || el.name === 'end') {
        captureTripForm();
        dateShrinkAck = false;
        var preview = $('#dayPreview');
        if (preview) {
          var n = dayCount(tripDraft.start, tripDraft.end);
          preview.textContent = (tripDraft.end < tripDraft.start) ? '종료일이 시작일보다 빠릅니다' : ((n - 1) + '박 ' + n + '일 · DAY ' + n + '까지 자동 생성');
        }
        return;
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $('#modalRoot').innerHTML) { closeModal(); return; }
    if (e.key === 'Enter' && e.target && e.target.id === 'cityInput') {
      e.preventDefault();
      addCityFromInput();
      return;
    }
    if (e.target && e.target.id === 'cityInput' && e.key === 'Enter') return;
    if ($('#modalRoot').innerHTML) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      var i = TABS.reduce(function (a, t, idx) { return t.id === ui.tab ? idx : a; }, 0);
      var next = e.key === 'ArrowRight' ? i + 1 : i - 1;
      if (next >= 0 && next < TABS.length) {
        ui.tab = TABS[next].id;
        render();
      }
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'sheetUrl') {
      state.settings.sheetUrl = e.target.value.trim();
      return;
    }
    if (e.target && e.target.dataset && e.target.dataset.memo === 'info') {
      var t = activeTrip();
      if (!t) return;
      t.info.memo = e.target.value;
      clearTimeout(e.target._saveTimer);
      e.target._saveTimer = setTimeout(function () {
        touchTrip(t);
        save();
        var st = $('#memoState');
        if (st) st.textContent = '저장됨 · ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      }, 400);
    }
  });

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    var kind = form.dataset.form;

    if (kind === 'trip') return saveTripForm(form);
    if (kind === 'item') return saveItemForm(form);
    if (kind === 'leg') return saveLegForm(form);
    if (kind === 'ticket') return saveTicketForm(form);
    if (kind === 'budget') return saveBudgetForm(form);
    if (kind === 'food') return saveFoodForm(form);
    if (kind === 'lodging') return saveLodgingForm(form);
    if (kind === 'check-edit') return saveCheckEditForm(form);

    if (kind === 'check') {
      var t = activeTrip();
      if (!t) return;
      var v = Object.fromEntries(new FormData(form).entries());
      var label = String(v.label || '').trim();
      if (!label) return;
      t.checklist.push({ id: uid('ck'), label: label, group: CHECK_GROUPS.indexOf(v.group) >= 0 ? v.group : '기타', done: false });
      touchTrip(t);
      save();
      render();
      toast('준비물을 추가했어요');
      return;
    }

    if (kind === 'emergency') {
      var trip = activeTrip();
      if (!trip) return;
      var d = Object.fromEntries(new FormData(form).entries());
      var name = String(d.name || '').trim();
      var number = String(d.number || '').trim();
      if (!name || !number) return;
      trip.info.emergency.push({ id: uid('em'), name: name, number: number });
      touchTrip(trip);
      save();
      render();
      toast('연락처를 추가했어요');
      return;
    }
  });

  /* ---------- network ---------- */
  function updateNet() {
    var badge = $('#netBadge'), text = $('#netText');
    if (!badge) return;
    var on = navigator.onLine;
    badge.classList.toggle('online', on);
    badge.classList.toggle('offline', !on);
    text.textContent = on ? '온라인' : '오프라인';
    badge.title = on ? '온라인 · 시트 동기화를 쓸 수 있어요' : '오프라인 · 기기에 저장된 데이터로 작동 중';
  }

  /* ---------- boot ---------- */
  function boot() {
    state = loadState();
    if (!state) {
      state = freshState();
      state.trips = buildSamples();
      state.activeId = state.trips[0].id;
      save();
    }
    if (!state.trips.length) {
      /* keep empty; user can create or re-add samples */
    }
    reconcileStayPlans();
    save();
    updateNet();
    window.addEventListener('online', updateNet);
    window.addEventListener('offline', updateNet);

    ui.tab = 'all';
    ui.day = 1;
    render();
    updateAutoSyncTimer();

    var seen = false;
    try { seen = !!localStorage.getItem(ONBOARD_KEY); } catch (e) { seen = true; }
    if (!seen) {
      setTimeout(function () { openTripModal(null, true); }, 220);
    }

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
