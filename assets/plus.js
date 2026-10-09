// Mailito – personalizácia z cold e-mailu, ukážka AI e-mailu na úvode a AI asistent na každej stránke.
(() => {
  const API = 'https://mailito-api.webhunter.workers.dev';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('sk-SK').replace(/[\s  ]/g, ' ');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ss = { get: k => { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const BASE = new URL('../', (document.currentScript || {}).src || location.href).href;
  const ev = n => { try { window.mailitoEv?.(n); } catch {} };

  async function job(typ, vstup, maxS = 40) {
    const r = await fetch(API + '/api/ai/job', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ typ, vstup }) });
    const j = await r.json(); if (!j.ok) throw new Error(j.chyba || 'Chyba');
    const t0 = Date.now();
    while (Date.now() - t0 < maxS * 1000) {
      await new Promise(res => setTimeout(res, 1200));
      const s = await (await fetch(API + '/api/ai/job/' + j.id)).json().catch(() => ({}));
      if (s.stav === 'hotovo') return s.vystup;
      if (s.stav === 'chyba') throw new Error(s.chyba || 'AI sa nepodarilo dokončiť.');
    }
    throw new Error('timeout');
  }

  // ===== 1) personalizácia: ?p= base64url("firma|kraj|segment|web") z nášho e-mailu =====
  const KR = { 'Bratislavský': 'Bratislavskom', 'Trnavský': 'Trnavskom', 'Trenčiansky': 'Trenčianskom', 'Nitriansky': 'Nitrianskom', 'Žilinský': 'Žilinskom', 'Banskobystrický': 'Banskobystrickom', 'Prešovský': 'Prešovskom', 'Košický': 'Košickom' };
  const CIEL = {
    'Výroba a priemysel': ['Výroba a priemysel', 'Veľkoobchod a distribúcia', 'Stavebníctvo a remeslá'],
    'Služby pre firmy': ['Výroba a priemysel', 'Obchod a e-shopy', 'IT, marketing a médiá'],
    'Stavebníctvo a remeslá': ['Výroba a priemysel', 'Reality', 'Verejný sektor a neziskovky'],
    'IT, marketing a médiá': ['Služby pre firmy', 'Obchod a e-shopy', 'Výroba a priemysel'],
    'Obchod a e-shopy': ['Gastro a ubytovanie', 'Služby pre firmy', 'Zdravie a krása'],
    'Verejný sektor a neziskovky': ['Služby pre firmy', 'Výroba a priemysel'],
    'Zdravie a krása': ['Služby pre firmy', 'IT, marketing a médiá'],
    'Voľný čas, kultúra a školy': ['Služby pre firmy', 'IT, marketing a médiá', 'Výroba a priemysel'],
    'Gastro a ubytovanie': ['Služby pre firmy', 'IT, marketing a médiá', 'Verejný sektor a neziskovky'],
    'Auto-moto': ['Logistika a doprava', 'Stavebníctvo a remeslá', 'Služby pre firmy'],
    'Veľkoobchod a distribúcia': ['Obchod a e-shopy', 'Gastro a ubytovanie', 'Výroba a priemysel'],
    'Logistika a doprava': ['Výroba a priemysel', 'Veľkoobchod a distribúcia', 'Obchod a e-shopy'],
    'Reality': ['Služby pre firmy', 'Stavebníctvo a remeslá', 'IT, marketing a médiá'],
  };
  const qp = new URLSearchParams(location.search);
  let ja = ss.get('mailito_ja');
  if (qp.get('p')) {
    try {
      const b = qp.get('p').replace(/-/g, '+').replace(/_/g, '/');
      const raw = decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4))));
      const [firma, kraj, segment, web] = raw.split('|').map(x => (x || '').trim().slice(0, 80));
      if (firma) { ja = { firma, kraj: KR[kraj] ? kraj : '', segment: CIEL[segment] ? segment : '', web: /^[\w.-]+\.[a-z]{2,}$/i.test(web.replace(/^https?:\/\//, '').replace(/\/.*$/, '')) ? web.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '' }; ss.set('mailito_ja', ja); ev('personalizacia'); }
    } catch {}
  }
  if (ja) {
    ja.ciel = CIEL[ja.segment] || ['Služby pre firmy', 'Výroba a priemysel'];
    window.MAILITO_JA = ja; // site4.js podľa toho nastaví kalkulačku
    const hn = $('#quickMsg'), qi = $('#quickForm input[name=ponuka]');
    if (qi && ja.web) qi.value = ja.web;
    const pill = $('.hero .pill');
    if (pill) pill.innerHTML = `<span class="pill-new">+100</span>Dobrý deň, ${esc(ja.firma)}. Pripravili sme to pre vás<svg><use href="#i-arr"/></svg>`;
    if (pill) pill.setAttribute('href', '#potencial');
    if (hn) fetch(BASE + 'data/trh.json').then(r => r.json()).then(d => {
      const kr = ja.kraj ? [ja.kraj] : d.kraje;
      const n = ja.ciel.reduce((a, s) => a + kr.reduce((b, k) => b + ((d.matica[s] || {})[k] || 0), 0), 0);
      hn.innerHTML = `<b>${esc(ja.firma)}</b>: ${ja.kraj ? 'v ' + KR[ja.kraj] + ' kraji' : 'na Slovensku'} je <b>${fmt(n)} firiem</b>, ktorým môžete predávať. ${ja.web ? 'Váš web už máme vložený, stačí kliknúť.' : 'Napíšte, čo predávate, a uvidíte ich.'}`;
      hn.classList.add('hero-ja');
    }).catch(() => {});
    const mt = $('.mcta-t'); if (mt) mt.innerHTML = `Kampaň pre <b>${esc(ja.firma)}</b>`;
  }

  // ===== 2) ukážka: AI napíše prvý e-mail =====
  const tf = $('#tryForm');
  if (tf) {
    const out = $('#tryOut'), body = $('#tryBody'), subj = $('#trySubj'), st = $('#trySteps'), foot = $('#tryFoot'), btn = $('button', tf), inp = $('input', tf);
    if (ja?.web && !inp.value) inp.value = ja.web;
    const PRIJ = ['Kovo Záhorie', 'Logistika Váh', 'Drevotech Považie', 'Agro Podunajsko'];
    const sablona = p => ({ predmet: 'Krátka otázka k ' + p.toLowerCase().split(/[,.]/)[0].slice(0, 40), text: `Dobrý deň,\n\npre firmu {firma} by sme vedeli zabezpečiť ${p.toLowerCase()} – spoľahlivo, v dohodnutom termíne a bez starostí na Vašej strane. Prispôsobíme sa Vašej prevádzke a cenu dostanete vopred.\n\nMôžem Vám poslať krátku nezáväznú ponuku?` });
    const pis = async (el, txt) => {
      el.textContent = '';
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const html = esc(txt).replace(/\{firma\}/g, `<mark>${PRIJ[0]}</mark>`).replace(/\n/g, '<br>');
      if (reduce) { el.innerHTML = html; return; }
      const parts = html.split(/(<[^>]+>)/);
      let acc = '';
      for (const part of parts) {
        if (part.startsWith('<')) { acc += part; el.innerHTML = acc; continue; }
        for (let i = 0; i < part.length; i += 3) { el.innerHTML = acc + part.slice(0, i + 3); await new Promise(r => setTimeout(r, 12)); }
        acc += part;
      }
      el.innerHTML = acc;
    };
    const kroky = ['Čítam, čo predávate…', 'Hľadám firmy, ktoré to potrebujú…', 'Píšem e-mail vaším menom…'];
    $$('[data-try]').forEach(b => b.addEventListener('click', () => { inp.value = b.dataset.try; tf.requestSubmit(); }));
    tf.addEventListener('submit', async e => {
      e.preventDefault();
      const v = inp.value.trim(); if (v.length < 3) { inp.focus(); return; }
      ev('ukazka_emailu');
      const jeWeb = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v) && !/\s/.test(v);
      btn.disabled = true; out.classList.add('busy'); out.classList.remove('done'); foot.hidden = true; subj.textContent = '…'; body.innerHTML = '';
      let k = 0; st.textContent = kroky[0]; const ti = setInterval(() => { k = Math.min(kroky.length - 1, k + 1); st.textContent = kroky[k]; }, 4500);
      let r;
      try { r = await job('ukazka', jeWeb ? { web: v } : { popis: v }, 45); }
      catch { r = sablona(jeWeb ? 'služby pre Vašu firmu' : v); }
      clearInterval(ti); out.classList.remove('busy'); st.textContent = 'Hotovo. Takto môže vyzerať váš prvý e-mail:';
      subj.textContent = r.predmet || 'Krátka otázka';
      await pis(body, r.text || '');
      out.classList.add('done');
      const seg = (r.segmenty || []).join(', '), n = r.pocet || 0;
      const q = new URLSearchParams(jeWeb ? { web: v } : { ponuka: v }); if (seg) q.set('segment', seg);
      $('#tryCta').href = BASE + 'objednat/?' + q.toString();
      $('#tryN').innerHTML = n ? `Takýto e-mail pošleme až <b>${fmt(n)} firmám</b>, ktoré to potrebujú. Pri teste 1&nbsp;100 firiem počítame s <b>22 – 44 záujemcami</b>.` : `Takýto e-mail pošleme stovkám firiem, ktoré to potrebujú. Pri teste 1&nbsp;100 firiem počítame s <b>22 – 44 záujemcami</b>.`;
      foot.hidden = false; btn.disabled = false;
    });
  }

  // ===== 4) AI asistent na každej stránke =====
  if (document.body.dataset.noAsistent === undefined && !location.pathname.includes('/objednat') && !location.pathname.includes('/portal')) {
    const FAQ = [
      [/spam|legál|zákon|gdpr|povol/i, 'Nie je to spam. Každý e-mail je osobný, podpísaný vaším menom, s identifikáciou firmy a odhlásením jedným slovom. Slovenský zákon (§ 116 ods. 15 z. 452/2021) oslovenie firemných adries povoľuje.'],
      [/dom[eé]n|schr[aá]nk|spam.*(n[aá]s|moj)/i, 'Vaša doména je v bezpečí. Posielame z našich vlastných zahriatych schránok, nie z vašej pošty. Odpovede čítame my a záujemcov vám pošleme do portálu.'],
      [/cen[aau]|stoj|koľko.*(€|eur|plat)|platb|faktúr/i, 'Test 1 000 firiem stojí 149 € jednorazovo a 100 firiem dostanete zadarmo navyše. Čím viac firiem, tým nižšia cena za firmu, až 0,06 €. Žiadne mesačné poplatky ani viazanosť.'],
      [/zákaz|záujem|výsled|koľko.*(firiem|zákazn)|návrat|zarob/i, 'Počítame s tým, že 2 – 4 % oslovených firiem prejaví záujem a každý tretí z nich sa stane vaším zákazníkom. Pri kampani pre 3 500 firiem je to 24 – 48 nových zákazníkov. Presne pre vaše odvetvie si to spočítate na úvodnej stránke v kalkulačke.'],
      [/rýchl|kedy|spust|ako dlho|termín/i, 'Kampaň si s AI nastavíte za 5 minút. Po objednaní pošleme faktúru e-mailom a odosielanie spustíme do 3 pracovných dní. Prvé odpovede zvyčajne prídu ešte v ten deň.'],
      [/nikto|záruk|garanc|riziko/i, 'Pri prvej kampani platí záruka: ak z prvých 1 000 firiem nepríde ani jeden záujemca, ďalších 1 000 oslovíme zadarmo. Riziko nesieme my.'],
      [/web|prezent|nemám/i, 'Stačí vložiť váš web alebo nahrať prezentáciu. Ak web nemáte, napíšte pár viet o tom, čo predávate. AI z toho pripraví cieľovku aj e-maily.'],
    ];
    const NAVRHY = ['Koľko zákaziek získam?', 'Koľko to stojí?', 'Nie je to spam?', 'Ako rýchlo to spustíte?'];
    const w = document.createElement('div'); w.className = 'asi'; w.innerHTML = `
      <button type="button" class="asi-fab" aria-expanded="false" aria-controls="asiPanel"><span class="asi-ic"><svg><use href="#i-spark"/></svg></span><span class="asi-l">Opýtajte sa AI</span></button>
      <div class="asi-panel" id="asiPanel" role="dialog" aria-label="Mailito asistent" hidden>
        <div class="asi-h"><span class="asi-ic"><svg><use href="#i-spark"/></svg></span><div><b>Mailito asistent</b><small><i class="dot dot-live"></i>Odpovie hneď</small></div><button type="button" class="asi-x" aria-label="Zavrieť">×</button></div>
        <div class="asi-log" aria-live="polite"></div>
        <div class="asi-chips"></div>
        <form class="asi-f"><input name="q" autocomplete="off" placeholder="Napíšte otázku…" aria-label="Vaša otázka"><button class="btn btn-sm" type="submit" aria-label="Odoslať"><svg><use href="#i-arr"/></svg></button></form>
      </div>`;
    document.body.appendChild(w);
    // mobil: AI tlačidlo je súčasťou spodnej lišty (žiadna plávajúca bublina cez obsah)
    const mc = $('#mcta');
    if (mc) { const bar = document.createElement('div'); bar.className = 'mbar'; mc.parentNode.insertBefore(bar, mc); const ai = document.createElement('button'); ai.type = 'button'; ai.className = 'mbar-ai'; ai.setAttribute('aria-label', 'Opýtať sa AI asistenta'); ai.innerHTML = '<svg><use href="#i-spark"/></svg>AI'; bar.append(ai, mc); ai.addEventListener('click', () => otvor(true)); }
    const fab = $('.asi-fab', w), pan = $('.asi-panel', w), log = $('.asi-log', w), chips = $('.asi-chips', w), f = $('.asi-f', w);
    let hist = ss.get('mailito_asi') || [];
    const add = (kto, text, cta) => {
      const m = document.createElement('div'); m.className = 'asi-m ' + (kto === 'ja' ? 'asi-ja' : 'asi-ai');
      m.innerHTML = esc(text).replace(/\n/g, '<br>') + (cta ? `<a class="asi-cta" href="${BASE}objednat/">Pripraviť kampaň zadarmo →</a>` : '');
      log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
    };
    const uloz = () => ss.set('mailito_asi', hist.slice(-16));
    const uvod = () => {
      log.innerHTML = '';
      add('ai', ja ? `Dobrý deň, ${ja.firma}! Pomôžem vám zistiť, koľko nových zákaziek vám Mailito prinesie. Na čo sa chcete opýtať?` : 'Dobrý deň! Pomôžem vám zistiť, koľko nových zákaziek vám Mailito prinesie. Na čo sa chcete opýtať?');
      hist.forEach(m => add(m.kto, m.text, m.cta));
      chips.innerHTML = NAVRHY.map(n => `<button type="button" class="chip">${n}</button>`).join('');
    };
    const otvor = o => { pan.hidden = !o; fab.setAttribute('aria-expanded', o); w.classList.toggle('open', o); if (o) { uvod(); $('input', f).focus(); ev('asistent_otvoreny'); } };
    fab.addEventListener('click', () => otvor(pan.hidden));
    $('.asi-x', w).addEventListener('click', () => otvor(false));
    addEventListener('keydown', e => { if (e.key === 'Escape' && !pan.hidden) otvor(false); });
    chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { $('input', f).value = b.textContent; f.requestSubmit(); } });
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const q = $('input', f).value.trim(); if (!q) return; $('input', f).value = '';
      add('ja', q); hist.push({ kto: 'ja', text: q }); chips.innerHTML = '';
      const hit = FAQ.find(([re]) => re.test(q));
      if (hit) { setTimeout(() => { add('ai', hit[1], true); hist.push({ kto: 'ai', text: hit[1], cta: true }); uloz(); }, 350); return; }
      const t = add('ai', '…'); t.classList.add('asi-typing');
      try {
        const r = await job('chat', { otazka: q, stranka: document.title, historia: hist.slice(-8) }, 45);
        const txt = (r.text || '').replace(/\*\*/g, ''); t.remove(); add('ai', txt, true); hist.push({ kto: 'ai', text: txt, cta: true });
      } catch { t.remove(); const txt = 'Na toto vám radi odpovieme e-mailom na info.webhunter@email.cz. Medzitým si môžete zadarmo pozrieť, koho AI osloví a čo im napíše.'; add('ai', txt, true); hist.push({ kto: 'ai', text: txt, cta: true }); }
      uloz();
    });
  }

  // ===== remeslo: svetlo pod kurzorom a magnetické tlačidlá (len myš) =====
  if (matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('.tl-i, .proj-c, .promise li, .pp-c, .pot-card, .teaser-r, .kpis li, .step-card, .try-mail, .faq-ask, .mail, .vs, .faq-g').forEach(el => el.classList.add('spot'));
    document.addEventListener('pointermove', e => {
      const s = e.target.closest?.('.spot'); if (!s) return;
      const r = s.getBoundingClientRect(); s.style.setProperty('--mx', (e.clientX - r.left) + 'px'); s.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
    $$('.btn-lg, .btn-lime, .shot-live, .nav-r .btn').forEach(b => {
      b.classList.add('mag');
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(), x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height; b.style.transform = `translate(${x * 8}px, ${y * 6}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  // ===== ponuka pri odchode (desktop, raz za návštevu, nie v objednávke a portáli) =====
  if (matchMedia('(pointer: fine)').matches && !/\/(objednat|portal)/.test(location.pathname) && !ss.get('mailito_exit')) {
    const t0 = Date.now();
    const ukaz = () => {
      if (ss.get('mailito_exit') || Date.now() - t0 < 7000) return;
      ss.set('mailito_exit', 1); ev('exit_ponuka');
      const d = document.createElement('div'); d.className = 'exit'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Ponuka');
      d.innerHTML = `<div class="exit-c"><button type="button" class="exit-x" aria-label="Zavrieť">×</button>
        <span class="pill-new">+100 firiem zadarmo</span>
        <h3>Skôr než odídete: <em>pozrite sa zadarmo, koľko firiem vás potrebuje.</em></h3>
        <p>Vložte web alebo napíšte, čo predávate. AI vám za pár minút ukáže cieľovku aj e-maily. Bez registrácie a bez platby.</p>
        <form class="exit-f"><input name="v" placeholder="Váš web alebo čo predávate" aria-label="Váš web alebo čo predávate" autocomplete="off"><button class="btn btn-lime" type="submit">Ukázať zadarmo<svg><use href="#i-arr"/></svg></button></form>
        <p class="exit-n">Platíte, až keď sa rozhodnete objednať. Záruka prvej kampane.</p></div>`;
      document.body.appendChild(d);
      const zavri = () => d.remove();
      d.addEventListener('click', e => { if (e.target === d || e.target.closest('.exit-x')) zavri(); });
      addEventListener('keydown', e => { if (e.key === 'Escape') zavri(); }, { once: true });
      $('input', d).focus();
      $('form', d).addEventListener('submit', e => {
        e.preventDefault(); const v = $('input', d).value.trim(); if (v.length < 3) { $('input', d).focus(); return; }
        ev('exit_odoslane');
        const web = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v) && !/\s/.test(v);
        location.href = BASE + 'objednat/?' + new URLSearchParams(web ? { web: v } : { ponuka: v });
      });
    };
    document.addEventListener('mouseout', e => { if (!e.relatedTarget && e.clientY <= 4) ukaz(); });
  }
})();
