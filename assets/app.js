(function () {
'use strict';
const $ = s => document.querySelector(s), app = $('#app');
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
let lang = LS.get('quiz_lang') || 'uz'; if (!window.I18N[lang]) lang = 'uz';
const t = (k, p) => { let s = (I18N[lang][k] != null ? I18N[lang][k] : I18N.uz[k] || k); for (const x in (p || {})) s = s.replace('{' + x + '}', p[x]); return s; };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const L4 = 'ABCD';
let S = null;           // faol sessiya
let view = 'welcome', result = null, filter = 'all', welcomeErr = '', welcomeInfo = '';
let timerId = null, saveTimer = null, lastSave = 0, online = true, saveState = 'saved', submitting = false, tabs = 0, onlyBlank = false;

/* ---------- API ---------- */
async function api(body, tries) {
  tries = tries || 1; let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(CONFIG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), keepalive: !!body.keepalive });
      const j = await r.json(); online = true; return j;
    } catch (e) { last = e; online = false; await new Promise(r => setTimeout(r, 700 * Math.pow(2, i))); }
  }
  return { error: 'NET' };
}
const errText = c => t('e_' + c) === 'e_' + c ? t('e_SERVER_ERROR') : t('e_' + c);

/* ---------- Til ---------- */
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));
  document.querySelectorAll('#lang button').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
}
$('#lang').addEventListener('click', e => { const l = e.target.dataset.l; if (!l) return; lang = l; LS.set('quiz_lang', l); applyLang(); render(); });

/* ---------- Kod ranglash ---------- */
function hl(code) {
  const e = esc(code).replace(/&quot;/g, '"');
  return e.replace(/(#.*$)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|\b(def|return|if|elif|else|for|while|in|not|and|or|import|from|class|break|continue|pass|lambda|try|finally|global|nonlocal|is|with|as|match|case|yield|None|True|False)\b|\b(\d+\.?\d*)\b/gm,
    (m, c, s, k, n) => c ? '<span class="c">' + c + '</span>' : s ? '<span class="s">' + s + '</span>' : k ? '<span class="k">' + k + '</span>' : '<span class="n">' + n + '</span>');
}

/* ---------- Render ---------- */
function render() {
  applyLang();
  const timer = $('#timer'), st = $('#student');
  const inTest = view === 'test' && S;
  timer.classList.toggle('hidden', !inTest);
  st.classList.toggle('hidden', !(S && (view === 'test' || view === 'result' || view === 'review')));
  if (S) { $('#sName').textContent = S.fio; $('#sGroup').textContent = S.group + ' · ' + t('attempt') + ' ' + S.attempt; $('#ava').textContent = S.fio.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
  ({ welcome: rWelcome, loading: rLoading, test: rTest, result: rResult, review: rReview })[view]();
}
function rLoading(msg) { app.innerHTML = '<div class="card center"><div class="spin"></div><p>' + esc(msg || t('loading')) + '</p></div>'; }

function rWelcome() {
  const v = id => ($('#' + id) ? $('#' + id).value : '');
  const keep = { fio: v('fio'), group: v('group'), pw: v('pw') };
  app.innerHTML = `
  <div class="welcome">
    <section class="hero">
      <span class="lg"><img src="assets/logo.png" alt="AIFU"></span>
      <h1>${esc(t('subject'))}</h1><p>${esc(t('topic'))}</p>
      <ul>
        <li>${esc(t('r_q'))}</li><li>${esc(t('r_time'))}</li><li>${esc(t('r_score'))}</li><li>${esc(t('r_pass'))}</li><li>${esc(t('r_once'))}</li><li>${esc(t('r_skip'))}</li>
      </ul>
      <p class="note">${esc(t('lang_note'))}</p>
    </section>
    <section class="card form">
      <h2>${esc(t('online_test'))}</h2><p class="sub">${esc(t('rules'))}</p>
      ${welcomeErr ? '<div class="alert" role="alert">' + esc(welcomeErr) + '</div>' : ''}${welcomeInfo ? '<div class="alert info">' + esc(welcomeInfo) + '</div>' : ''}
      <form id="f" novalidate autocomplete="off">
        <div class="field"><label for="fio">${esc(t('fio'))}</label><input class="inp" id="fio" placeholder="${esc(t('fio_ph'))}" maxlength="60" autocomplete="name" value="${esc(keep.fio)}"><div class="msg" id="mFio"></div></div>
        <div class="field"><label for="group">${esc(t('group'))}</label><input class="inp" id="group" placeholder="${esc(t('group_ph'))}" maxlength="15" value="${esc(keep.group)}"><div class="msg" id="mGroup"></div></div>
        <div class="field"><label for="pw">${esc(t('pass'))}</label><div class="pw"><input class="inp" id="pw" type="password" placeholder="${esc(t('pass_ph'))}" autocomplete="new-password" value="${esc(keep.pw)}"><button type="button" id="eye">${esc(t('show'))}</button></div><div class="msg" id="mPw"></div></div>
        <button class="btn pri full" id="go" type="submit">${esc(t('start'))}</button>
      </form>
    </section>
  </div>`;
  $('#eye').onclick = () => { const p = $('#pw'), s = p.type === 'password'; p.type = s ? 'text' : 'password'; $('#eye').textContent = t(s ? 'hide' : 'show'); };
  $('#group').oninput = e => { const p = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); try { e.target.setSelectionRange(p, p); } catch (x) {} };
  $('#f').onsubmit = onStart;
}
async function onStart(e) {
  e.preventDefault(); welcomeErr = ''; welcomeInfo = '';
  const fio = Validate.cleanFio($('#fio').value), group = $('#group').value.trim().toUpperCase(), pw = $('#pw').value;
  let bad = false;
  [['fio', Validate.validFio(fio), 'err_name', 'mFio'], ['group', Validate.validGroup(group), 'err_group', 'mGroup'], ['pw', !!pw, 'err_pass_empty', 'mPw']].forEach(([id, ok, key, m]) => { $('#' + id).classList.toggle('err', !ok); $('#' + m).textContent = ok ? '' : t(key); if (!ok) bad = true; });
  if (bad) { const f = document.querySelector('.inp.err'); if (f) f.focus(); return; }
  const pretty = Validate.prettyFio(fio);
  $('#go').disabled = true; $('#go').textContent = t('loading');
  const r = await api({ action: 'start', fio: pretty, group: group, password: pw, lang: lang, ua: navigator.userAgent }, 3);
  if (r.error) {
    $('#go').disabled = false; welcomeErr = r.error === 'NET' ? t('e_net') : errText(r.error).replace('{score}', r.score).replace('{total}', r.total);
    if (r.error === 'ALREADY_TAKEN' || r.error === 'RETAKE_AVAILABLE') welcomeErr = t('e_' + r.error, { score: r.score, total: r.total });
    const f = $('#fio').value, g = $('#group').value; render(); $('#fio').value = f; $('#group').value = g; return;
  }
  beginSession(r);
}

/* ---------- Test ---------- */
function beginSession(r) {
  const saved = JSON.parse(LS.get('quiz_ans_' + r.sessionId) || 'null');
  S = { id: r.sessionId, fio: r.fio, group: r.group, attempt: r.attempt, endsAt: r.endsAt, offset: r.serverNow - Date.now(), qs: r.questions, ans: Object.assign({}, saved && saved.ans, r.answers), flag: (saved && saved.flag) || {}, idx: 0 };
  const first = S.qs.findIndex(q => S.ans[q.id] === undefined); S.idx = first < 0 ? 0 : first;
  LS.set('quiz_session', S.id); persist(); view = 'test'; submitting = false; tabs = 0;
  startTimer(); render(); window.scrollTo(0, 0);
}
const persist = () => S && LS.set('quiz_ans_' + S.id, JSON.stringify({ ans: S.ans, flag: S.flag }));
const answered = () => S.qs.filter(q => S.ans[q.id] !== undefined).length;
const remaining = () => S.endsAt - (Date.now() + S.offset);
function fmt(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function startTimer() {
  clearInterval(timerId);
  const tick = () => {
    if (!S || view !== 'test') return; const ms = remaining(), el = $('#timer');
    el.textContent = fmt(ms); el.classList.toggle('warn', ms <= 300000 && ms > 60000); el.classList.toggle('crit', ms <= 60000);
    el.setAttribute('aria-label', t('time_left') + ' ' + fmt(ms));
    if (ms <= 0 && !submitting) { submit(true); }
  };
  tick(); timerId = setInterval(tick, 1000);
  clearInterval(saveTimer); saveTimer = setInterval(() => { if (S && view === 'test') flush(); }, 30000);
}
let debounce = null;
function scheduleSave() { saveState = 'saving'; updStatus(); clearTimeout(debounce); debounce = setTimeout(flush, 6000); }
async function flush(keep) {
  if (!S || submitting) return; clearTimeout(debounce);
  const r = await api({ action: 'save', sessionId: S.id, answers: S.ans, tabSwitches: tabs, keepalive: !!keep });
  saveState = r && r.ok ? 'saved' : (r.error === 'NET' ? 'offline' : 'saved'); updStatus();
  if (r.error === 'TIME_UP' || r.error === 'NOT_ACTIVE') submit(true);
}
function updStatus() { const el = $('#st'); if (!el) return; el.className = 'status' + (saveState === 'offline' ? ' off' : ''); el.textContent = t(saveState === 'saving' ? 'saving' : saveState === 'offline' ? 'offline' : 'saved'); }
function codeBlock(c) { return c ? '<pre class="code"><code>' + hl(c) + '</code></pre>' : ''; }

function rTest() {
  const q = S.qs[S.idx], n = S.qs.length, a = S.ans[q.id], done = answered();
  const cells = S.qs.map((x, i) => (!onlyBlank || S.ans[x.id] === undefined) ? `<button class="cell${S.ans[x.id] !== undefined ? ' done' : ''}${i === S.idx ? ' cur' : ''}${S.flag[x.id] ? ' flag' : ''}" data-go="${i}" aria-label="${t('question')} ${i + 1}">${i + 1}</button>` : '').join('');
  app.innerHTML = `
  <div class="test">
    <section class="card">
      <div class="meta"><span>${t('answered')}: <b>${done}</b> / ${n}</span><span class="status" id="st"></span></div>
      <div class="progress"><i style="width:${done * 100 / n}%"></i></div>
      <div class="qno">${t('question')} ${S.idx + 1} ${t('of')} ${n}</div>
      <h2 class="qtext">${esc(q.q)}</h2>
      ${codeBlock(q.code)}
      <div class="opts" role="radiogroup" aria-label="${t('question')} ${S.idx + 1}">
        ${q.o.map((o, i) => `<button class="opt${a === i ? ' sel' : ''}" role="radio" aria-checked="${a === i}" data-o="${i}"><span class="l">${L4[i]}</span><span class="t">${esc(o)}</span></button>`).join('')}
      </div>
      <div class="acts">
        <button class="btn ghost" id="prev" ${S.idx === 0 ? 'disabled' : ''}>${t('prev')}</button>
        <button class="btn ghost" id="clear" ${a === undefined ? 'disabled' : ''}>${t('clear')}</button>
        <button class="btn ghost" id="flag">${t(S.flag[q.id] ? 'unflag' : 'flag')}</button>
        <span class="sp"></span>
        ${S.idx < n - 1 ? `<button class="btn ghost" id="skip">${t('skip')}</button><button class="btn nav" id="next">${t('next')}</button>` : `<button class="btn pri" id="finish2">${t('finish')}</button>`}
      </div>
    </section>
    <aside class="card side">
      <h3>${t('question')} 1–${n}</h3>
      <label class="chk"><input type="checkbox" id="ob" ${onlyBlank ? 'checked' : ''}> ${t('only_blank')}</label>
      <div class="grid">${cells}</div>
      <div class="legend"><span><i class="d"></i>${t('answered')}</span><span><i></i>${t('blank')}</span><span>⚑ ${t('flag').replace('⚑ ', '')}</span></div>
      <button class="btn pri full" id="finish">${t('finish')}</button>
    </aside>
  </div>`;
  updStatus();
  app.querySelectorAll('[data-o]').forEach(b => b.onclick = () => choose(+b.dataset.o));
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(+b.dataset.go));
  $('#prev').onclick = () => go(S.idx - 1); $('#clear').onclick = () => { delete S.ans[q.id]; persist(); scheduleSave(); render(); };
  $('#flag').onclick = () => { S.flag[q.id] = !S.flag[q.id]; if (!S.flag[q.id]) delete S.flag[q.id]; persist(); render(); };
  if ($('#next')) { $('#next').onclick = () => go(S.idx + 1); $('#skip').onclick = () => go(S.idx + 1); }
  if ($('#finish2')) $('#finish2').onclick = confirmFinish; $('#finish').onclick = confirmFinish;
  $('#ob').onchange = e => { onlyBlank = e.target.checked; render(); };
}
function go(i) { if (i < 0 || i >= S.qs.length) return; S.idx = i; render(); window.scrollTo({ top: 0 }); }
function choose(i) { const q = S.qs[S.idx]; S.ans[q.id] = i; persist(); scheduleSave(); render(); }

function confirmFinish() {
  const blanks = S.qs.map((q, i) => S.ans[q.id] === undefined ? i : -1).filter(i => i >= 0);
  const m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog');
  m.innerHTML = `<div class="card"><h3>${t('confirm_title')}</h3>${blanks.length ? `<p>${t('confirm_unanswered', { n: blanks.length })}</p><div class="links">${blanks.map(i => `<a href="#" data-q="${i}">${i + 1}</a>`).join('')}</div>` : `<p>${t('confirm_all')}</p>`}
  <div class="row"><button class="btn ghost" id="mc">${t('cancel')}</button><button class="btn pri" id="my">${t('yes_finish')}</button></div></div>`;
  document.body.appendChild(m);
  m.querySelectorAll('[data-q]').forEach(a => a.onclick = ev => { ev.preventDefault(); m.remove(); go(+a.dataset.q); });
  m.querySelector('#mc').onclick = () => m.remove(); m.querySelector('#my').onclick = () => { m.remove(); submit(false); };
}
async function submit(timeUp) {
  if (submitting) return; submitting = true; clearInterval(timerId); clearInterval(saveTimer); clearTimeout(debounce);
  document.querySelectorAll('.modal').forEach(m => m.remove());
  view = 'loading'; $('#timer').classList.add('hidden'); rLoading(timeUp ? t('timeup') + '. ' + t('sending') : t('sending'));
  const r = await api({ action: 'submit', sessionId: S.id, answers: S.ans, tabSwitches: tabs }, 5);
  if (r.error) {
    if (r.error === 'NET') { rLoading(t('e_net')); const b = document.createElement('button'); b.className = 'btn pri'; b.textContent = t('loading').replace('…', '') + ' ↻'; b.onclick = () => { submitting = false; submit(timeUp); }; app.querySelector('.card').appendChild(b); return; }
    view = 'welcome'; welcomeErr = errText(r.error); LS.del('quiz_session'); S = null; render(); return;
  }
  finish(r);
}
function finish(r) {
  result = r; LS.set('quiz_result', JSON.stringify({ r: r, s: { fio: S.fio, group: S.group, attempt: S.attempt } })); LS.del('quiz_session'); if (S) LS.del('quiz_ans_' + S.id);
  view = 'result'; render(); window.scrollTo(0, 0);
}

/* ---------- Natija ---------- */
function rResult() {
  const r = result, C = 2 * Math.PI * 90, ok = r.review.filter(x => x.ok).length, blank = r.review.filter(x => x.your === null).length, wrong = r.total - ok - blank;
  app.innerHTML = `
  <div class="card res">
    <div class="studentline">${esc(S.fio)} · ${esc(S.group)}</div>
    <div class="badge ${r.passed ? 'ok' : 'no'}">${r.passed ? '✅ ' + t('passed') : '❌ ' + t('failed')}</div>
    <div class="ring"><svg width="220" height="220" viewBox="0 0 220 220"><circle cx="110" cy="110" r="90" fill="none" stroke="var(--line)" stroke-width="16"/><circle cx="110" cy="110" r="90" fill="none" stroke="${r.passed ? 'var(--ok)' : 'var(--pink)'}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - r.score / r.total)}"/></svg><div class="v"><b>${r.score}</b><span>/ ${r.total} · ${r.percent}%</span></div></div>
    <div class="stats"><div><b style="color:var(--ok)">${ok}</b><small>${t('correct')}</small></div><div><b style="color:var(--bad)">${wrong}</b><small>${t('wrong')}</small></div><div><b style="color:var(--warn)">${blank}</b><small>${t('blank')}</small></div><div><b>${r.spentMin}</b><small>${t('spent')}, ${t('min')}</small></div></div>
    ${r.canRetake ? `<div class="alert info">${t('retake_note')}</div>` : ''}
    <div class="row"><button class="btn nav" id="rv">${t('view_review')}</button><button class="btn ghost" id="lo">${t('logout')}</button></div>
  </div>`;
  $('#rv').onclick = () => { view = 'review'; filter = 'all'; render(); window.scrollTo(0, 0); };
  $('#lo').onclick = () => { if (confirm(t('confirm_logout'))) { ['quiz_result', 'quiz_session'].forEach(LS.del); S = null; result = null; view = 'welcome'; welcomeErr = ''; render(); } };
}
function rReview() {
  const r = result, strong = r.review.filter(x => x.ok), weak = r.review.filter(x => !x.ok);
  const list = r.review.filter(x => filter === 'all' || (filter === 'wrong' && !x.ok && x.your !== null) || (filter === 'blank' && x.your === null));
  const tn = x => r.topics[x.t - 1];
  app.innerHTML = `
  <div class="card">
    <div class="acts"><button class="btn ghost" id="bk">${t('back')}</button><span class="sp"></span><button class="btn ghost" id="pr">${t('print')}</button></div>
    <h2>${t('review')} — ${r.score}/${r.total}</h2>
    <div class="tp"><div><h4>${t('strong')} (${strong.length})</h4><ul>${strong.map(x => '<li>' + esc(tn(x)) + '</li>').join('') || '<li>' + t('none') + '</li>'}</ul></div><div><h4>${t('weak')} (${weak.length})</h4><ul>${weak.map(x => '<li>' + esc(tn(x)) + '</li>').join('') || '<li>' + t('none') + '</li>'}</ul></div></div>
    <div class="filters">${[['all', t('all')], ['wrong', t('only_wrong')], ['blank', t('blank')]].map(([k, l]) => `<button class="chip${filter === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
    ${list.map(x => `<article class="rq ${x.ok ? 'good' : x.your === null ? 'blank' : 'bad'}">
      <div class="qno">${t('question')} ${x.n} · ${esc(tn(x))}</div><h3 class="qtext" style="user-select:text">${esc(x.q)}</h3>${codeBlock(x.code)}
      ${x.o.map((o, i) => `<div class="ro${i === x.correct ? ' right' : i === x.your ? ' mine' : ''}"><b>${L4[i]})</b><span class="t">${esc(o)}</span>${i === x.correct ? '<b style="margin-left:auto">✓ ' + t('right_answer') + '</b>' : i === x.your ? '<b style="margin-left:auto">✗ ' + t('your_answer') + '</b>' : ''}</div>`).join('')}
      ${x.your === null ? `<div class="ex">${t('no_answer')}</div>` : ''}${x.ex ? `<div class="ex"><b>${t('explanation')}:</b> ${esc(x.ex)}</div>` : ''}</article>`).join('')}
  </div>`;
  $('#bk').onclick = () => { view = 'result'; render(); }; $('#pr').onclick = () => window.print();
  app.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; render(); });
}

/* ---------- Hodisalar ---------- */
document.addEventListener('keydown', e => {
  if (view !== 'test' || !S || /INPUT|TEXTAREA/.test((e.target.tagName || '')) || document.querySelector('.modal')) return;
  const k = e.key.toUpperCase(), i = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : L4.indexOf(k);
  if (i >= 0 && k.length === 1) { choose(i); } else if (e.key === 'ArrowRight') go(S.idx + 1); else if (e.key === 'ArrowLeft') go(S.idx - 1);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && view === 'test') tabs++; });
window.addEventListener('beforeunload', e => { if (view === 'test' && S) { flush(true); e.preventDefault(); e.returnValue = t('leave'); } });
window.addEventListener('online', () => { if (S && view === 'test') flush(); });
window.addEventListener('offline', () => { saveState = 'offline'; updStatus(); });
document.addEventListener('contextmenu', e => { if (view === 'test' && e.target.closest('.qtext,pre.code')) e.preventDefault(); });

/* ---------- Boshlanish ---------- */
(async function init() {
  applyLang();
  const sr = LS.get('quiz_result');
  if (sr) { try { const o = JSON.parse(sr); result = o.r; S = Object.assign({ id: '', ans: {}, qs: [] }, o.s); view = 'result'; render(); return; } catch (e) { LS.del('quiz_result'); } }
  const sid = LS.get('quiz_session');
  if (sid) {
    view = 'loading'; rLoading(t('resume_note'));
    const r = await api({ action: 'resume', sessionId: sid }, 3);
    if (r && r.questions) { beginSession(r); return; }
    if (r && r.finished) { S = { id: sid, fio: r.result.fio, group: r.result.group, attempt: r.result.attempt, ans: {}, qs: [] }; finish(r.result); return; }
    LS.del('quiz_session');
  }
  view = 'welcome'; render();
})();
})();
