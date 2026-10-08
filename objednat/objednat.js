(() => {
  const API = 'https://mailito-api.webhunter.workers.dev';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('sk-SK').replace(/[\s  ]/g, ' ');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // cenník – rovnaký výpočet je na webe, v portal.js, api a engine/sync.py
  const cena = n => { let p = 0, od = 0; for (const [d, c] of [[1000, .149], [3000, .10], [10000, .08], [Infinity, .06]]) { if (n > od) p += (Math.min(n, d) - od) * c; od = d; } return Math.round(p / 10) * 10 - 1; };
  const BONUS = 100, KEY = 'mailito_obj_v1', TK = 'mailito_token';
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const KR = { 'Bratislavský': 'Bratislava', 'Trnavský': 'Trnava', 'Trenčiansky': 'Trenčín', 'Nitriansky': 'Nitra', 'Žilinský': 'Žilina', 'Banskobystrický': 'Banská Bystrica', 'Prešovský': 'Prešov', 'Košický': 'Košice' };
  const KRAJE = Object.keys(KR);
  let SEGS = ['Výroba a priemysel', 'Služby pre firmy', 'Stavebníctvo a remeslá', 'IT, marketing a médiá', 'Obchod a e-shopy', 'Verejný sektor a neziskovky', 'Zdravie a krása', 'Voľný čas, kultúra a školy', 'Gastro a ubytovanie', 'Auto-moto', 'Veľkoobchod a distribúcia', 'Logistika a doprava', 'Reality'];

  // ---------- stav ----------
  const S0 = { step: 0, max: 0, web: '', popis: '', dok: '', subor: '', profil: {}, dovod: '', nazov: '', segmenty: [], aiSeg: [], kraje: [], obory: [], aiOb: [], obory_moznosti: [], vylucit: [],
    texty: [], odhad: null, pocet: 3500, hodnota: 1500, odos: {}, ucet: {}, fakt: {}, chat: [], ai: false };
  let S = { ...S0 };
  try { S = { ...S0, ...JSON.parse(store.get(KEY) || '{}') }; } catch {}
  const save = () => { const { ...c } = S; store.set(KEY, JSON.stringify(c)); };
  const q = new URLSearchParams(location.search);
  if (q.get('ponuka')) S.popis = q.get('ponuka');
  if (q.get('email')) S.ucet.email = q.get('email');
  if (q.get('pocet')) S.pocet = Math.max(1000, +q.get('pocet') || 3500);
  if (q.get('segment')) { const qs = q.get('segment').split(/\s*,\s*/).filter(s => SEGS.includes(s)); if (qs.length) { S.chceSeg = qs; if (!S.segmenty.length) S.segmenty = qs; } }
  if (q.get('kraje')) S.chceKraje = q.get('kraje').split(/\s*,\s*/);
  if (q.get('web')) S.web = q.get('web');
  // prišiel z nášho osobného odkazu (assets/plus.js uloží firmu do sessionStorage)
  try { const ja = JSON.parse(sessionStorage.getItem('mailito_ja') || 'null'); if (ja) { if (!S.web && !S.popis && ja.web) S.web = ja.web; if (!S.odos?.firma && ja.firma) S.odos = { ...(S.odos || {}), firma: ja.firma }; } } catch {}

  // ---------- AI úlohy (spracuje engine cez Claude) ----------
  async function job(typ, vstup, maxS = 200) {
    const r = await fetch(API + '/api/ai/job', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typ, vstup }) });
    const j = await r.json(); if (!j.ok) throw new Error(j.chyba || 'Chyba');
    const t0 = Date.now();
    while (Date.now() - t0 < maxS * 1000) {
      await new Promise(res => setTimeout(res, typ === 'odhad' ? 700 : 1500));
      const s = await (await fetch(API + '/api/ai/job/' + j.id)).json().catch(() => ({}));
      if (s.stav === 'hotovo') return s.vystup;
      if (s.stav === 'chyba') throw new Error(s.chyba || 'AI sa nepodarilo dokončiť.');
    }
    throw new Error('AI teraz odpovedá pomaly. Skúste to prosím o chvíľu znova.');
  }

  // ---------- kroky ----------
  const stepsNav = $$('#steps li');
  function go(step, opts = {}) {
    if (!opts.force && typeof step === 'number' && step > S.step && !valid(S.step)) return;
    S.step = step; if (typeof step === 'number') S.max = Math.max(S.max, step);
    $$('.wz-step').forEach(s => s.classList.toggle('on', s.dataset.step === String(step)));
    stepsNav.forEach(li => { const n = +li.dataset.s; li.classList.toggle('on', n === step || (step === 'ai' && n === 0)); li.classList.toggle('past', typeof step === 'number' && n < S.max && n !== step || step === 'done'); });
    if (step === 1) renderAud(); if (step === 2) renderMails(); if (step === 3) renderRange(); if (step === 4) renderOrder();
    if (typeof step === 'number' || step === 'done') assistStep(step);
    if (typeof step === 'number') window.mailitoEv?.('wizard_krok_' + step);
    save(); scrollTo({ top: 0, behavior: 'smooth' });
  }
  stepsNav.forEach(li => li.addEventListener('click', () => { const n = +li.dataset.s; if (n <= S.max && S.step !== 'done' && S.step !== 'ai') go(n, { force: n < S.step }); }));
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(+b.dataset.go, { force: +b.dataset.go < S.step }); });

  function valid(step) {
    const bad = (el, msg) => { if (el) { el.classList.add('bad'); el.focus(); setTimeout(() => el.classList.remove('bad'), 2500); } say(msg); return false; };
    if (step === 1) { if (!S.segmenty.length) return bad(null, 'Vyberte aspoň jedno odvetvie, ktorému chcete predávať.'); }
    if (step === 2) {
      readMails();
      if (!S.texty[0]?.predmet?.[0] || !S.texty[0]?.text) return bad(null, 'Prvý e-mail potrebuje predmet aj text.');
      if (!$('#oMeno').value.trim()) return bad($('#oMeno'), 'Napíšte meno, ktorým budú e-maily podpísané.');
      if (!$('#oFirma').value.trim()) return bad($('#oFirma'), 'Doplňte názov firmy odosielateľa.');
    }
    if (step === 3) { if ((S.odhad?.pocet ?? 99999) < 1000) return bad(null, 'Cieľová skupina má menej ako 1 000 firiem. Vráťte sa ku kroku Komu a pridajte kraje alebo odvetvia.'); }
    return true;
  }

  // ---------- 0: podklady ----------
  const fWeb = $('#fWeb'), fPopis = $('#fPopis');
  fWeb.value = S.web || ''; fPopis.value = S.popis || '';
  fWeb.addEventListener('input', () => { S.web = fWeb.value.trim(); save(); });
  fPopis.addEventListener('input', () => { S.popis = fPopis.value; save(); });
  const drop = $('#drop'), fFile = $('#fFile'), chip = $('#fileChip');
  const showFile = () => { chip.hidden = !S.subor; chip.innerHTML = S.subor ? `<svg width="14" height="14"><use href="#i-ok"/></svg><span><b>${esc(S.subor)}</b> · ${fmt(S.dok.length)} znakov textu</span><button type="button" aria-label="Odstrániť">✕</button>` : ''; };
  chip.addEventListener('click', e => { if (e.target.closest('button')) { S.subor = ''; S.dok = ''; showFile(); save(); } });
  showFile();
  drop.addEventListener('click', () => fFile.click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fFile.click(); } });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => e.dataTransfer.files[0] && readFile(e.dataTransfer.files[0]));
  fFile.addEventListener('change', () => fFile.files[0] && readFile(fFile.files[0]));
  const lib = (src, glob) => window[glob] ? Promise.resolve(window[glob]) : new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(window[glob]); s.onerror = no; document.head.appendChild(s); });
  async function readFile(f) {
    chip.hidden = false; chip.textContent = 'Čítam ' + f.name + '…';
    try {
      const ext = f.name.split('.').pop().toLowerCase(); let t = '';
      if (ext === 'pdf') {
        const pdfjs = await lib('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib');
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
        for (let i = 1; i <= Math.min(doc.numPages, 40) && t.length < 25000; i++) t += (await (await doc.getPage(i)).getTextContent()).items.map(x => x.str).join(' ') + '\n';
      } else if (ext === 'docx' || ext === 'pptx') {
        const JSZip = await lib('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip');
        const z = await JSZip.loadAsync(f);
        const files = Object.keys(z.files).filter(n => ext === 'docx' ? n === 'word/document.xml' : /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => (+a.match(/\d+/)?.[0] || 0) - (+b.match(/\d+/)?.[0] || 0));
        for (const n of files) t += (await z.file(n).async('string')).replace(/<\/(w:p|a:p)>/g, '\n').replace(/<[^>]+>/g, '') + '\n';
      } else t = await f.text();
      t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      if (t.length < 40) throw new Error('V súbore sme nenašli text (možno je to len obrázok).');
      S.dok = t.slice(0, 25000); S.subor = f.name; save(); showFile();
      say(`Prečítal som ${f.name}. Výborne – z prezentácie zistím viac než z webu.`);
    } catch (e) { S.dok = ''; S.subor = ''; save(); chip.hidden = false; chip.textContent = e.message || 'Súbor sa nepodarilo prečítať. Skúste PDF.'; }
  }

  $('#goAI').addEventListener('click', async () => {
    S.web = fWeb.value.trim(); S.popis = fPopis.value.trim();
    if (!S.web && !S.popis && !S.dok) { fWeb.classList.add('bad'); fWeb.focus(); setTimeout(() => fWeb.classList.remove('bad'), 2500); say('Zadajte prosím web, nahrajte prezentáciu alebo napíšte pár viet o tom, čo predávate.'); return; }
    go('ai', { force: true }); work(true);
    say(S.web ? `Idem si prečítať ${S.web}…` : 'Pozerám sa na vaše podklady…');
    try {
      const r = await job('kampan', { web: S.web, popis: S.popis, dokument: S.dok, subor: S.subor, chce_segmenty: S.chceSeg || [], chce_kraje: S.chceKraje || [] }, 240);
      if (r.zakazane) { work(false); go(0, { force: true }); say(r.dovod || 'Túto ponuku bohužiaľ nevieme kampaňou podporiť.'); return; }
      Object.assign(S, { ai: true, profil: r.profil || {}, dovod: r.dovod || '', nazov: r.nazov || '', segmenty: r.segmenty || [], aiSeg: r.segmenty || [], kraje: r.kraje || [], obory: r.obory || [], aiOb: r.obory || [],
        obory_moznosti: r.obory_moznosti || [], vylucit: r.vylucit || [], texty: norm(r.texty), odhad: r.odhad || null });
      S.hodnota = Math.max(100, Math.round(+S.profil.hodnota_zakazky_eur || S.hodnota));
      S.odos = { meno: S.odos.meno || '', poz: S.odos.poz || '', firma: S.profil.firma || S.odos.firma || '', web: S.profil.web || S.web || '' };
      const n = S.odhad?.pocet || 0;
      S.pocet = Math.max(1000, Math.min(S.pocet || 3500, Math.floor((n - BONUS) / 100) * 100 || 1000));
      work(false, true);
      setTimeout(() => go(1, { force: true }), 700);
    } catch (e) { work(false); go(0, { force: true }); say((e.message || 'Niečo sa pokazilo.') + ' Ak problém pretrváva, môžete pokračovať bez AI.'); }
  });
  $('#goManual').addEventListener('click', () => {
    S.ai = false; if (!S.texty.length) S.texty = norm([{ predmet: ['', ''], text: 'Dobrý deň,\n\n' }, { po_dnoch: 4, text: 'Dobrý deň,\n\n' }, { po_dnoch: 9, text: 'Dobrý deň,\n\n' }]);
    go(1, { force: true }); say('Dobre, nastavíme to spolu ručne. Vyberte odvetvia a kraje – počet firiem vám hneď spočítam.');
  });
  const norm = t => (t || []).slice(0, 3).map((x, i) => ({ predmet: i ? null : (Array.isArray(x.predmet) ? x.predmet : [x.predmet || '', '']).concat('', '').slice(0, 2), text: x.text || '', po_dnoch: i ? (x.po_dnoch || [0, 4, 9][i]) : 0 }));

  let workT;
  function work(on, ok) {
    const li = $$('#workList li'), bar = $('#workBar'), tip = $('#workTip');
    clearInterval(workT);
    if (!on) { if (ok) { li.forEach(l => { l.classList.remove('on'); l.classList.add('ok'); }); bar.style.width = '100%'; } return; }
    const t0 = Date.now(), at = [0, 9, 22, 38];
    const TIPS = ['Zvyčajne to trvá 40 – 90 sekúnd.', 'Hľadáme len firmy so zverejnenou firemnou adresou.', 'Konkurenciu z oslovenia vylúčime.', 'E-maily píšeme krátko a ľudsky, bez reklamných fráz.', 'Všetko budete môcť upraviť.'];
    li.forEach(l => l.classList.remove('on', 'ok'));
    workT = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      li.forEach((l, i) => { l.classList.toggle('ok', s >= (at[i + 1] ?? 1e9)); l.classList.toggle('on', s >= at[i] && s < (at[i + 1] ?? 1e9)); });
      bar.style.width = Math.min(94, 100 * (1 - Math.exp(-s / 32))) + '%';
      tip.textContent = TIPS[Math.floor(s / 9) % TIPS.length];
    }, 400);
  }

  // ---------- 1: komu ----------
  function renderAud() {
    $('#pCo').textContent = S.profil.co_predava || (S.popis || 'Napíšte, čo predávate');
    $('#pKomu').textContent = S.profil.pre_koho || 'Napíšte, kto je váš ideálny zákazník';
    $('#pVyh').innerHTML = (S.profil.vyhody || []).map(v => `<li>${esc(v)}</li>`).join('');
    $('#cSeg').innerHTML = SEGS.map(s => `<button type="button" class="chip${S.segmenty.includes(s) ? ' on' : ''}${S.aiSeg.includes(s) ? ' is-ai' : ''}" data-seg="${esc(s)}">${esc(s)}</button>`).join('');
    $('#cKr').innerHTML = `<button type="button" class="chip${S.kraje.length ? '' : ' on'}" data-kr="">Celé Slovensko</button>` + KRAJE.map(k => `<button type="button" class="chip${S.kraje.includes(k) ? ' on' : ''}" data-kr="${k}">${KR[k]}</button>`).join('');
    $('#cOb').innerHTML = S.obory.length ? S.obory.map(o => `<button type="button" class="chip on x${S.aiOb.includes(o) ? ' is-ai' : ''}" data-ob="${esc(o)}">${esc(o)}<svg><use href="#i-x"/></svg></button>`).join('') : '<span class="wz-note" style="margin:0">Bez upresnenia – oslovíme celé vybrané odvetvia.</span>';
    $('#obAdd').innerHTML = '<option value="">+ pridať obor</option>' + S.obory_moznosti.filter(o => !S.obory.includes(o)).map(o => `<option>${esc(o)}</option>`).join('');
    $('#obAdd').parentElement.hidden = !S.obory_moznosti.length;
    $('#cVyl').innerHTML = S.vylucit.map((v, i) => `<span class="tag-x">${esc(v)}<button type="button" data-vyl="${i}" aria-label="Odstrániť">✕</button></span>`).join('') + '<input id="vylIn" placeholder="slovo + Enter">';
    if (S.odhad) showCount(S.odhad); else recount();
  }
  $('#pCo').addEventListener('input', e => { S.profil.co_predava = e.target.textContent; save(); });
  $('#pKomu').addEventListener('input', e => { S.profil.pre_koho = e.target.textContent; save(); });
  $('#cSeg').addEventListener('click', e => { const b = e.target.closest('[data-seg]'); if (!b) return; const s = b.dataset.seg; S.segmenty = S.segmenty.includes(s) ? S.segmenty.filter(x => x !== s) : [...S.segmenty, s]; b.classList.toggle('on'); recount(); });
  $('#cKr').addEventListener('click', e => { const b = e.target.closest('[data-kr]'); if (!b) return; const k = b.dataset.kr; S.kraje = !k ? [] : S.kraje.includes(k) ? S.kraje.filter(x => x !== k) : [...S.kraje, k]; if (S.kraje.length === KRAJE.length) S.kraje = []; renderAud(); recount(); });
  $('#cOb').addEventListener('click', e => { const b = e.target.closest('[data-ob]'); if (!b) return; S.obory = S.obory.filter(o => o !== b.dataset.ob); renderAud(); recount(); });
  $('#obAdd').addEventListener('change', e => { if (e.target.value) { S.obory.push(e.target.value); renderAud(); recount(); } });
  $('#cVyl').addEventListener('click', e => { const b = e.target.closest('[data-vyl]'); if (b) { S.vylucit.splice(+b.dataset.vyl, 1); renderAud(); recount(); } });
  $('#cVyl').addEventListener('keydown', e => { if (e.target.id === 'vylIn' && e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (v) { S.vylucit.push(v); renderAud(); recount(); $('#vylIn').focus(); } } });
  let rcT, rcN = 0;
  function recount() {
    save(); clearTimeout(rcT);
    if (!S.segmenty.length) { showCount({ pocet: 0, kraje: {} }); return; }
    $('#aBusy').hidden = false;
    rcT = setTimeout(async () => {
      const my = ++rcN;
      try { const r = await job('odhad', { segmenty: S.segmenty, kraje: S.kraje, obory: S.obory, vylucit: S.vylucit }, 40); if (my === rcN) { S.odhad = r; save(); showCount(r); } }
      catch { if (my === rcN) $('#aBusy').textContent = 'prepočet nedostupný'; }
    }, 500);
  }
  function tween(el, to) {
    const from = +(el.dataset.v || 0); el.dataset.v = to; const t0 = performance.now();
    const st = now => { const k = Math.min(1, (now - t0) / 600), v = from + (to - from) * (1 - Math.pow(1 - k, 3)); el.textContent = fmt(v); if (k < 1) requestAnimationFrame(st); };
    requestAnimationFrame(st);
  }
  function showCount(r) {
    $('#aBusy').hidden = true; $('#aBusy').textContent = 'prepočítavam…';
    tween($('#aN'), r.pocet || 0);
    $('#aL').textContent = r.pocet ? `odhad záujemcov ${fmt(Math.max(1, r.pocet * .02))} – ${fmt(Math.max(2, r.pocet * .04))}` : 'vyberte odvetvie';
    const e = Object.entries(r.kraje || {}).sort((a, b) => b[1] - a[1]).slice(0, 8), mx = Math.max(1, ...e.map(x => x[1]));
    $('#aKr').innerHTML = e.map(([k, n]) => `<div class="kr"><span>${KR[k] || k}</span><i style="--w:${(n / mx * 100).toFixed(0)}%"></i><b>${fmt(n)}</b></div>`).join('') || '<div class="kr"><span>–</span><i></i><b></b></div>';
  }

  // ---------- 2: e-maily ----------
  const UKAZKA = 'Kovo Záhorie';
  function renderMails() {
    if (!S.texty.length) S.texty = norm([{ predmet: ['', ''], text: '' }, { text: '' }, { text: '' }]);
    $('#mails').innerHTML = S.texty.map((t, i) => `
      <div class="mail-c" data-i="${i}">
        <div class="mail-h"><b>${i + 1}. e-mail</b><span>${i ? `po ${t.po_dnoch} dňoch, ak neodpíšu` : 'odíde hneď'}</span><button type="button" class="tgl">Ukážka</button></div>
        ${i ? '' : `<div class="mail-s"><label>Predmet A</label><input data-k="pA" value="${esc(t.predmet?.[0])}" placeholder="Krátky predmet"></div><div class="mail-s"><label>Predmet B</label><input data-k="pB" value="${esc(t.predmet?.[1])}" placeholder="Druhý variant pre A/B test (nepovinné)"></div>`}
        <textarea data-k="text" rows="8">${esc(t.text)}</textarea>
        <div class="mail-pv"></div>
      </div>`).join('');
    $$('.mail-c textarea').forEach(fit);
    const o = S.odos || {};
    $('#oMeno').value = o.meno || S.ucet.meno || ''; $('#oPoz').value = o.poz || ''; $('#oFirma').value = o.firma || S.profil.firma || ''; $('#oWeb').value = o.web || S.web || '';
  }
  function fit(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 4 + 'px'; }
  function readMails() {
    $$('.mail-c').forEach(c => { const i = +c.dataset.i, t = S.texty[i]; if (!t) return; t.text = $('textarea', c).value; if (!i) t.predmet = [$('[data-k=pA]', c).value.trim(), $('[data-k=pB]', c).value.trim()]; });
    S.odos = { meno: $('#oMeno').value.trim(), poz: $('#oPoz').value.trim(), firma: $('#oFirma').value.trim(), web: $('#oWeb').value.trim() }; save();
  }
  $('#mails').addEventListener('input', e => { if (e.target.tagName === 'TEXTAREA') fit(e.target); readMails(); });
  ['#oMeno', '#oPoz', '#oFirma', '#oWeb'].forEach(s => $(s).addEventListener('input', readMails));
  $('#mails').addEventListener('click', e => {
    const b = e.target.closest('.tgl'); if (!b) return; const c = b.closest('.mail-c'); readMails();
    const on = c.classList.toggle('pv'); b.textContent = on ? 'Upraviť' : 'Ukážka';
    const podpis = [S.odos.meno, S.odos.poz, S.odos.firma, S.odos.web].filter(Boolean).join('\n');
    $('.mail-pv', c).innerHTML = esc($('textarea', c).value).replace(/\{firma\}/g, `<mark>${UKAZKA}</mark>`).replace(/\{mesto\}/g, '<mark>Senica</mark>') + (podpis ? '\n\n' + esc(podpis) : '');
  });
  async function rewrite(pokyn) {
    readMails(); const box = $('.rew'), m = $('#rewMsg');
    box.classList.add('busy'); m.hidden = false; m.textContent = 'AI prepisuje e-maily…'; $$('.mail-c').forEach(c => c.classList.add('busy'));
    try {
      const r = await job('texty', { profil: S.profil, segmenty: S.segmenty, texty: S.texty, pokyn }, 200);
      S.texty = norm(r.texty); save(); renderMails(); m.textContent = r.poznamka || 'Hotovo, e-maily sú prepísané.';
      say(r.poznamka ? `Hotovo: ${r.poznamka}` : 'Hotovo, prepísal som e-maily.');
    } catch (e) { m.textContent = e.message; $$('.mail-c').forEach(c => c.classList.remove('busy')); }
    finally { box.classList.remove('busy'); }
  }
  $$('.rew-b button').forEach(b => b.addEventListener('click', () => rewrite(b.dataset.pokyn)));
  $('#rewF').addEventListener('submit', e => { e.preventDefault(); const v = $('#rewIn').value.trim(); if (v) { $('#rewIn').value = ''; rewrite(v); } });

  // ---------- 3: rozsah ----------
  const rg = $('#rRange'), rVal = $('#rVal');
  function maxPocet() { const n = S.odhad?.pocet ?? 50000; return Math.max(1000, Math.min(50000, Math.floor((n - BONUS) / 100) * 100)); }
  function renderRange() {
    const mx = maxPocet(); rg.max = mx; S.pocet = Math.min(Math.max(1000, S.pocet), mx); rg.value = S.pocet; rVal.value = S.hodnota;
    $('#rMax').textContent = fmt(mx);
    const n = S.odhad?.pocet ?? 0, w = $('#rWarn');
    w.hidden = n >= 1100; w.textContent = n < 1000 ? `Vaša cieľová skupina má len ${fmt(n)} firiem a minimálna kampaň je 1 000. Vráťte sa ku kroku Komu a pridajte kraje alebo odvetvia.` : `Cieľová skupina má ${fmt(n)} firiem, oslovíme všetky.`;
    calc();
  }
  function calc() {
    const n = +rg.value, p = cena(n), v = Math.max(0, +rVal.value || 0);
    S.pocet = n; S.hodnota = v; save();
    rg.style.setProperty('--p', ((n - rg.min) / Math.max(1, rg.max - rg.min) * 100) + '%');
    $('#rN').textContent = fmt(n); $('#rP').textContent = fmt(p) + ' €'; $('#rPer').textContent = (p / n).toLocaleString('sk-SK', { maximumFractionDigits: 3 }) + ' € za firmu · bez DPH';
    const tot = Math.min(n + BONUS, S.odhad?.pocet ?? n + BONUS); $('#rTot').textContent = fmt(tot);
    const lo = Math.max(1, Math.round(tot * .02)), hi = Math.max(2, Math.round(tot * .04)); $('#rL').textContent = `${fmt(lo)} – ${fmt(hi)}`;
    const dl = Math.max(1, Math.round(lo * .33)), dh = Math.max(1, Math.round(hi * .33));
    $('#rRoi').innerHTML = v ? `Pri zákazke za ${fmt(v)} € je to <b>${dl === dh ? dl : dl + ' – ' + dh} nových zákazníkov</b> v hodnote <b>${fmt(dl * v)} – ${fmt(dh * v)} €</b>. Kampaň sa vám vráti <b>až ${Math.round(dh * v / p)}×</b>.` : '';
  }
  rg.addEventListener('input', calc); rVal.addEventListener('input', calc);

  // ---------- 4: objednávka ----------
  let me = null;
  async function loadMe() {
    const t = store.get(TK); if (!t) return null;
    try { const j = await (await fetch(API + '/api/me', { headers: { Authorization: 'Bearer ' + t } })).json(); return j.ok ? j.klient : null; } catch { return null; }
  }
  const F = { uMail: 'email', uMeno: 'meno', uTel: 'telefon' }, B = { bIco: 'ico', bFirma: 'firma', bUlica: 'ulica', bPsc: 'psc', bMesto: 'mesto', bDic: 'dic', bIcdph: 'icdph', bMail: 'email_faktura' };
  async function renderOrder() {
    Object.entries(F).forEach(([id, k]) => { if (S.ucet[k] != null) $('#' + id).value = S.ucet[k]; });
    if (!S.ucet.meno && S.odos.meno) $('#uMeno').value = S.odos.meno;
    Object.entries(B).forEach(([id, k]) => { if (S.fakt[k] != null) $('#' + id).value = S.fakt[k]; });
    if (!S.fakt.firma && S.odos.firma) $('#bFirma').value = S.odos.firma;
    $('#oNotif').value = S.odos.notif || '';
    summary();
    me = me || await loadMe();
    $('#accCard').hidden = !!me; $('#accIn').hidden = !me;
    if (me) { $('#accIn').innerHTML = `Objednávate ako <b>${esc(me.email)}</b>. Kampaň pribudne do vášho portálu.`; $('#wzLogin').hidden = true; }
  }
  $('#ordF').addEventListener('input', () => {
    Object.entries(F).forEach(([id, k]) => S.ucet[k] = $('#' + id).value.trim());
    Object.entries(B).forEach(([id, k]) => S.fakt[k] = $('#' + id).value.trim());
    S.odos.notif = $('#oNotif').value.trim(); save();
  });
  $('#pwT').addEventListener('click', () => { const i = $('#uPass'); i.type = i.type === 'password' ? 'text' : 'password'; $('#pwT').textContent = i.type === 'password' ? 'ukázať' : 'skryť'; });
  $('#icoGo').addEventListener('click', async () => {
    const m = $('#icoMsg'), ico = $('#bIco').value.replace(/\D/g, ''); m.hidden = false; m.className = 'ico-msg'; m.textContent = 'Hľadám v registri…';
    try {
      const j = await (await fetch(API + '/api/ico?ico=' + ico)).json();
      if (!j.ok) throw new Error(j.chyba);
      $('#bFirma').value = j.firma; $('#bUlica').value = j.ulica; $('#bPsc').value = j.psc; $('#bMesto').value = j.mesto; $('#bIco').value = j.ico;
      $('#ordF').dispatchEvent(new Event('input')); m.textContent = '✓ Doplnené z Registra právnických osôb.'; summary();
    } catch (e) { m.className = 'ico-msg err'; m.textContent = e.message || 'Register teraz neodpovedá, vyplňte údaje ručne.'; }
  });
  function summary() {
    const p = cena(S.pocet), tot = Math.min(S.pocet + BONUS, S.odhad?.pocet ?? S.pocet + BONUS);
    $('#sum').innerHTML = `<h3>Súhrn objednávky</h3><dl>
      <div><dt>Kampaň</dt><dd>${esc(S.nazov || S.profil.co_predava || 'Mailito kampaň')}</dd></div>
      <div><dt>Komu</dt><dd>${esc(S.segmenty.join(', ') || '–')}<br><small>${S.kraje.length ? esc(S.kraje.map(k => KR[k]).join(', ')) : 'celé Slovensko'}</small></dd></div>
      <div><dt>E-maily</dt><dd>${S.texty.filter(t => t.text.trim()).length} v sérii · podpis ${esc(S.odos.meno || '–')}</dd></div>
      <div><dt>Oslovené firmy</dt><dd>${fmt(S.pocet)} + ${BONUS} zadarmo = ${fmt(tot)}</dd></div>
      <div class="tot"><dt>Cena bez DPH</dt><dd>${fmt(p)} €</dd></div></dl>
      <p>Faktúru pošleme e-mailom, splatnosť 7 dní. Kampaň spustíme hneď po úhrade. Záruka: ak z prvých 1 000 firiem nepríde ani jeden záujemca, ďalších 1 000 oslovíme zadarmo.</p>`;
    $('#ordGo').textContent = `Záväzne objednať za ${fmt(p)} € bez DPH`;
  }
  $('#ordF').addEventListener('submit', async e => {
    e.preventDefault(); const m = $('#ordMsg'); m.className = 'form-msg'; m.textContent = '';
    readMailsSafe();
    const need = me ? ['bFirma', 'bUlica', 'bMesto'] : ['uMail', 'uPass', 'bFirma', 'bUlica', 'bMesto'];
    for (const id of need) { const el = $('#' + id); if (!el.value.trim() || (id === 'uPass' && el.value.length < 8) || (id === 'uMail' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value))) { el.classList.add('bad'); el.focus(); setTimeout(() => el.classList.remove('bad'), 2500); m.className = 'form-msg err'; m.textContent = id === 'uPass' ? 'Heslo musí mať aspoň 8 znakov.' : 'Doplňte prosím zvýraznené pole.'; return; } }
    if (!$('#ok').checked) { m.className = 'form-msg err'; m.textContent = 'Potvrďte prosím obchodné podmienky.'; return; }
    const btn = $('#ordGo'), bt = btn.textContent; btn.disabled = true; btn.textContent = 'Objednávam…';
    try {
      const body = {
        web_url: $('#hp').value, suhlas: true, zdroj: (q.get('utm_source') || q.get('k') || document.referrer || 'web').slice(0, 200),
        ucet: { email: $('#uMail').value.trim(), heslo: $('#uPass').value, meno: $('#uMeno').value.trim(), telefon: $('#uTel').value.trim() },
        firma: { firma: $('#bFirma').value.trim(), ico: $('#bIco').value.trim(), dic: $('#bDic').value.trim(), icdph: $('#bIcdph').value.trim(), ulica: $('#bUlica').value.trim(), psc: $('#bPsc').value.trim(), mesto: $('#bMesto').value.trim(), email_faktura: $('#bMail').value.trim() || (me?.email || $('#uMail').value.trim()) },
        kampan: { pocet: S.pocet, segmenty: S.segmenty, kraje: S.kraje, obory: S.obory, vylucit: S.vylucit, nazov: S.nazov, ciel: S.profil.pre_koho, profil: S.profil,
          texty: S.texty.map(t => ({ predmet: t.predmet ? t.predmet.filter(Boolean) : null, text: t.text, po_dnoch: t.po_dnoch })),
          odosielatel: { meno: S.odos.meno, pozicia: S.odos.poz, firma: S.odos.firma, web: S.odos.web, notif: $('#oNotif').value.trim() || (me?.email || $('#uMail').value.trim()) } },
      };
      const h = { 'Content-Type': 'application/json' }; const t = store.get(TK); if (me && t) h.Authorization = 'Bearer ' + t;
      const j = await (await fetch(API + '/api/order', { method: 'POST', headers: h, body: JSON.stringify(body) })).json();
      if (!j.ok) throw new Error(j.chyba || 'Objednávku sa nepodarilo odoslať.');
      if (j.token) store.set(TK, j.token);
      $('#doneTxt').textContent = `Objednali ste ${fmt(S.pocet)} + ${BONUS} firiem za ${fmt(j.cena_eur)} € bez DPH. Kampaň aj e-maily nájdete v portáli.`;
      $('#doneMail').textContent = body.firma.email_faktura;
      window.mailitoEv?.('objednavka_odoslana');
      store.set(KEY, null); S = { ...S0, chat: [] }; go('done', { force: true });
    } catch (err) { m.className = 'form-msg err'; m.textContent = err.message === 'Failed to fetch' ? 'Spojenie zlyhalo. Skúste to znova alebo napíšte na info@mailito.eu.' : err.message; }
    finally { btn.disabled = false; if (S.step !== 'done') btn.textContent = bt; }
  });
  const readMailsSafe = () => { if ($('.mail-c')) readMails(); };

  // ---------- asistent ----------
  const log = $('#aiLog'), sug = $('#aiSug'), ai = $('#ai'), fab = $('#aiFab');
  function bubble(text, kto = 'bot') { const d = document.createElement('div'); d.className = 'msg ' + kto; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function say(text) { S.chat.push({ kto: 'bot', text }); S.chat = S.chat.slice(-30); save(); bubble(text); if (!ai.classList.contains('open') && getComputedStyle(fab).display !== 'none') fab.classList.add('ping'); }
  function chips(list) { sug.innerHTML = list.map(t => `<button type="button">${esc(t)}</button>`).join(''); }
  sug.addEventListener('click', e => { const b = e.target.closest('button'); if (b) ask(b.textContent); });
  function assistStep(step) {
    const n = S.odhad?.pocet;
    const M = {
      0: ['Dobrý deň! Som Mailito asistent. Stačí mi adresa vášho webu alebo prezentácia – zistím, čo predávate, a pripravím celú kampaň. Vy to len skontrolujete.', ['Čo presne dostanem?', 'Koľko to stojí?', 'Nemám web, čo s tým?']],
      1: [S.ai ? `Navrhujem osloviť ${n ? fmt(n) + ' firiem' : 'tieto firmy'}: ${S.segmenty.join(', ')}${S.kraje.length ? ' v kraji ' + S.kraje.map(k => KR[k]).join(', ') : ' na celom Slovensku'}. ${S.dovod}` : 'Vyberte odvetvia a kraje, počet firiem prepočítam hneď.', ['Prečo práve tieto firmy?', 'Je to dosť firiem?', 'Môžem osloviť len môj kraj?']],
      2: ['Toto sú e-maily, ktoré pošleme vaším menom. Kliknite na „Ukážka“, ako to uvidí zákazník. Ak chcete inak, napíšte mi, čo zmeniť, napríklad „spomeň víkendy“.', ['Je to dosť osobné?', 'Prečo bez odkazov a príloh?', 'Z akej adresy to pôjde?']],
      3: [`Odporúčam začať s ${fmt(Math.min(maxPocet(), 3500))} firmami – je to dosť na desiatky rozhovorov a cena za firmu už klesá. 100 firiem navyše máte zadarmo.`, ['Čo ak nikto neodpovie?', 'Kedy prídu prví záujemcovia?', 'Môžem neskôr pridať ďalšie?']],
      4: ['Posledný krok. Zadajte IČO a fakturačné údaje doplním z registra. Faktúru pošleme e-mailom a kampaň spustíme hneď po úhrade.', ['Ako sa platí?', 'Môžem kampaň zrušiť?', 'Kde uvidím záujemcov?']],
      done: ['Ďakujem za objednávku! V portáli vidíte stav kampane a keď niekto odpíše so záujmom, dám vám vedieť e-mailom.', []],
    }[step];
    if (!M) return;
    const last = S.chat[S.chat.length - 1]; if (!last || last.text !== M[0]) say(M[0]);
    chips(M[1]);
  }
  const REW = /(prepí|prepis|zmeň|zmen|kratš|dlhš|formál|neformál|tón|pridaj|doplň|odstráň|vynechaj|nepíš|spomeň|napíš to|zdôrazni|tykať|vykať)/i;
  async function ask(text) {
    text = text.trim(); if (!text) return;
    S.chat.push({ kto: 'ja', text }); save(); bubble(text, 'me');
    if (S.step === 2 && REW.test(text)) { say('Rozumiem, prepíšem e-maily podľa toho…'); return rewrite(text); }
    const t = document.createElement('div'); t.className = 'msg bot typing'; t.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(t); log.scrollTop = log.scrollHeight;
    try {
      const r = await job('chat', { otazka: text, krok: ['Podklady', 'Komu', 'E-maily', 'Rozsah', 'Objednávka'][S.step] || S.step, historia: S.chat.slice(-8),
        stav: { segmenty: S.segmenty, kraje: S.kraje, firmy: S.odhad?.pocet, pocet: S.pocet, cena: cena(S.pocet), profil: S.profil } }, 120);
      t.remove(); say((r.text || '').replace(/\*\*/g, ''));
    } catch (e) { t.remove(); say('Teraz neviem odpovedať. Skúste to o chvíľu, alebo napíšte na info@mailito.eu.'); }
  }
  $('#aiF').addEventListener('submit', e => { e.preventDefault(); const i = $('#aiIn'); const v = i.value; i.value = ''; ask(v); });
  fab.addEventListener('click', () => { window.mailitoEv?.('asistent_otvoreny'); ai.classList.add('open'); fab.classList.remove('ping'); $('#aiIn').focus(); });
  $('#aiX').addEventListener('click', () => ai.classList.remove('open'));

  // ---------- štart ----------
  fetch('../data/trh.json').then(r => r.json()).then(d => { if (d.segmenty) SEGS = d.segmenty.filter(x => x !== 'Ostatné'); if (S.step === 1) renderAud(); }).catch(() => {});
  S.chat.forEach(m => bubble(m.text, m.kto));
  const start = S.step === 'ai' || S.step === 'done' ? 0 : S.step;
  go(start, { force: true });
  loadMe().then(k => { me = k; if (k) $('#wzLogin').hidden = true; });
})();
