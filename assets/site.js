(() => {
  const API = 'https://mailito-api.webhunter.workers.dev';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('sk-SK').replace(/[\u00a0\u202f ]/g, '\u00a0');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav
  const nav = $('#nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('#burger'), menu = $('#menu');
  if (burger) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = '';
    }));
  }

  // reveal + counters
  const countUp = el => {
    const target = +el.dataset.count; if (!target || reduce) return;
    const t0 = performance.now(), dur = 1600;
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(countUp);
    if (e.target.matches('[data-count]')) countUp(e.target);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -10% 0px' });
  $$('.rv').forEach(el => io.observe(el));

  // inbox – ilustračné odpovede
  const MSGS = [
    ['Kovo Záhorie a.s.', 'Dobrý deň, pošlite nám prosím cenník na kartónové obaly, mesačne cca 4 000 ks.', 'Záujem', '#2447D1'],
    ['Drevotech Orava s.r.o.', 'Zaujíma nás to. Môžete sa ozvať v stredu po 10:00? Nákup – Ing. Šimková.', 'Chce hovor', '#178A55'],
    ['Agro Podunajsko s.r.o.', 'Máme dodávateľa, ale zmluva končí v januári. Pošlite ponuku, porovnáme.', 'Záujem', '#D68A12'],
    ['Plasty Turiec s.r.o.', 'Aké máte termíny dodania na Martin? Potrebovali by sme vzorky.', 'Záujem', '#E5432A'],
    ['TechPark Košice s.r.o.', 'Ďakujeme, pošlite prosím PDF s referenciami, prediskutujeme to na porade.', 'Záujem', '#13182A'],
    ['Strojárne Pohronie a.s.', 'Dobrý deň, aká je minimálna objednávka? Radi by sme sa stretli.', 'Stretnutie', '#2447D1'],
  ];
  const list = $('#inboxList');
  if (list) {
    let i = 0, mins = 2;
    const add = () => {
      const [f, t, tag, c] = MSGS[i % MSGS.length]; i++;
      const li = document.createElement('li');
      li.className = 'msg';
      li.innerHTML = `<span class="msg-av" style="--c:${c}">${f.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
        <span class="msg-from">${f}</span><span class="msg-time">pred ${mins} min</span>
        <span class="msg-text">${t}</span><span class="msg-tag ${tag !== 'Záujem' ? 'hot' : ''}">● ${tag}</span>`;
      list.prepend(li);
      $$('.msg', list).forEach((m, k) => m.classList.toggle('old', k > 0));
      while (list.children.length > 3) list.lastElementChild.remove();
      mins = Math.max(1, mins + Math.round(Math.random() * 6) - 2);
    };
    add(); add(); add();
    if (!reduce) setInterval(() => { if (!document.hidden) add(); }, 3200);
  }

  // ako to funguje – aktívny krok
  const steps = $$('.step'), hvs = $$('.hv');
  const setStep = n => {
    steps.forEach(s => s.classList.toggle('on', s.dataset.step === n));
    hvs.forEach(h => h.classList.toggle('on', h.dataset.step === n));
  };
  if (steps.length) {
    setStep('1');
    const so = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setStep(e.target.dataset.step)), { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => so.observe(s));
  }

  // kalkulačka trhu
  const AREAS = { 'Bratislavský': 'ba', 'Trnavský': 'tt', 'Trenčiansky': 'tn', 'Nitriansky': 'nr', 'Žilinský': 'za', 'Banskobystrický': 'bb', 'Prešovský': 'po', 'Košický': 'ke' };
  const chipsEl = $('#segChips'), mapEl = $('#map');
  let D = null;
  const selSeg = new Set(['Výroba a priemysel', 'Logistika a doprava']);
  const selKraj = new Set(['Trnavský', 'Nitriansky', 'Trenčiansky']);
  const count = (segs, kraje) => {
    let n = 0;
    for (const s of segs) for (const k of kraje) n += (D.matica[s] || {})[k] || 0;
    return n;
  };
  const render = () => {
    if (!D) return;
    const segs = selSeg.size ? [...selSeg] : D.segmenty;
    $$('.chip', chipsEl).forEach(c => {
      c.setAttribute('aria-pressed', selSeg.has(c.dataset.s));
      $('small', c).textContent = fmt(count([c.dataset.s], selKraj.size ? [...selKraj] : D.kraje));
    });
    $$('.kraj', mapEl).forEach(k => {
      k.setAttribute('aria-pressed', selKraj.has(k.dataset.k));
      $('small', k).textContent = fmt(count(segs, [k.dataset.k])) + ' firiem';
    });
    const kraje = selKraj.size ? [...selKraj] : [];
    const n = selSeg.size && kraje.length ? count([...selSeg], kraje) : 0;
    animateNum($('#crNum'), n);
    $('#crSub').textContent = !selSeg.size ? 'Vyberte aspoň jedno odvetvie' : !kraje.length ? 'Vyberte aspoň jeden kraj'
      : `${[...selSeg].join(', ')} · ${kraje.length === 8 ? 'celé Slovensko' : kraje.join(', ')}`;
    const base = Math.min(n, 1000);
    $('#crLeads').textContent = n ? `${Math.max(1, Math.round(base * .003))} – ${Math.max(2, Math.round(base * .012))}` : '–';
    $('#crLeadsAll').textContent = n ? `${fmt(Math.max(1, n * .003))} – ${fmt(Math.max(2, n * .012))}` : '–';
    window.mailitoTrh && window.mailitoTrh(n);
    const v = $('#fVyber');
    if (v) v.value = n ? `${[...selSeg].join(', ')} | ${kraje.length === 8 ? 'celé Slovensko' : kraje.join(', ')} | ${fmt(n)} firiem` : '';
  };
  let numRaf;
  function animateNum(el, to) {
    const from = +(el.dataset.v || 0); el.dataset.v = to;
    cancelAnimationFrame(numRaf);
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const st = t => { const p = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) numRaf = requestAnimationFrame(st); };
    numRaf = requestAnimationFrame(st);
  }
  if (chipsEl && mapEl) {
    fetch('data/trh.json?v=b2ef5b1e').then(r => r.json()).then(d => {
      D = d;
      chipsEl.innerHTML = d.segmenty.map(s => `<button type="button" class="chip" data-s="${s}" aria-pressed="false">${s} <small></small></button>`).join('');
      mapEl.innerHTML = d.kraje.map(k => `<button type="button" class="kraj" data-k="${k}" style="grid-area:${AREAS[k]}" aria-pressed="false"><span class="kraj-in"><b>${k}</b><small></small></span></button>`).join('');
      chipsEl.addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; selSeg.has(c.dataset.s) ? selSeg.delete(c.dataset.s) : selSeg.add(c.dataset.s); render(); });
      mapEl.addEventListener('click', e => { const c = e.target.closest('.kraj'); if (!c) return; selKraj.has(c.dataset.k) ? selKraj.delete(c.dataset.k) : selKraj.add(c.dataset.k); render(); });
      $('#allKraje').onclick = () => { d.kraje.forEach(k => selKraj.add(k)); render(); };
      $('#noKraje').onclick = () => { selKraj.clear(); render(); };
      render();
    }).catch(() => { $('#crSub').textContent = 'Dáta sa nepodarilo načítať.'; });
  }

  // cenník podľa počtu firiem – pásma: 1. tisíc 0,149 €, do 3 000 0,10 €, do 10 000 0,08 €, nad 0,06 €
  const cena = n => {
    const pasma = [[1000, .149], [3000, .10], [10000, .08], [Infinity, .06]];
    let p = 0, od = 0;
    for (const [do_, c] of pasma) { if (n > od) p += (Math.min(n, do_) - od) * c; od = do_; }
    return Math.round(p / 10) * 10 - 1;
  };
  window.mailitoCena = cena;
  const range = $('#cfgRange');
  const fPocet = $('#fPocet');
  if (fPocet) {
    const opts = [];
    for (let n = 1000; n <= 20000; n += 500) opts.push(`<option value="${n}">${fmt(n)} firiem · ${fmt(cena(n))} €</option>`);
    fPocet.innerHTML = opts.join('') + '<option value="neviem">Ešte neviem</option>';
  }
  let trhN = 0;
  const cfgRender = () => {
    if (!range) return;
    const n = +range.value, p = cena(n);
    range.style.setProperty('--p', ((n - range.min) / (range.max - range.min) * 100) + '%');
    $('#cfgN').textContent = fmt(n);
    $('#cfgPrice').textContent = fmt(p);
    $('#cfgPer').textContent = (p / n).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' €';
    const lo = Math.max(1, Math.round(n * .003)), hi = Math.max(2, Math.round(n * .012));
    $('#cfgLeads').textContent = `${fmt(lo)} – ${fmt(hi)}`;
    $('#cfgCpl').textContent = `${fmt(p / hi)} – ${fmt(p / lo)} €`;
    $('#cfgCta').firstChild.textContent = `Objednať ${fmt(n)} firiem `;
    $$('.cfg-quick [data-n]').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
    $('#cfgTrh').classList.toggle('on', trhN && n === Math.min(20000, Math.max(1000, Math.round(trhN / 500) * 500)));
    const t = $$('.tiers div');
    t.forEach((d, i) => d.classList.toggle('on', i === (n <= 1000 ? 0 : n <= 3000 ? 1 : n <= 10000 ? 2 : 3)));
    $('#cfgHint').innerHTML = trhN && n > trhN
      ? `Vo vašom výbere v kalkulačke je <b>${fmt(trhN)}</b> firiem – rozšírte odvetvia alebo kraje, alebo znížte počet.`
      : trhN ? `Z vášho výberu (${fmt(trhN)} firiem) oslovíme ${fmt(n)}.` : '';
    if (fPocet && fPocet.querySelector(`option[value="${n}"]`)) fPocet.value = n;
  };
  if (range) {
    range.addEventListener('input', cfgRender);
    $$('.cfg-quick [data-n]').forEach(b => b.addEventListener('click', () => { range.value = b.dataset.n; cfgRender(); }));
    $('#cfgTrh').addEventListener('click', () => { range.value = Math.min(20000, Math.max(1000, Math.round(trhN / 500) * 500)); cfgRender(); });
    $('#cfgCta').addEventListener('click', () => { if (fPocet) fPocet.value = range.value; });
    cfgRender();
  }
  // kalkulačka trhu → konfigurátor
  window.mailitoTrh = n => {
    trhN = n;
    const b = $('#cfgTrh'); if (b) { b.hidden = !n; b.textContent = `Celý môj výber · ${fmt(Math.min(20000, n))}`; }
    cfgRender();
  };
  $('#calcCta')?.addEventListener('click', () => {
    if (!range || !trhN) return;
    range.value = Math.min(+range.value, Math.max(1000, Math.floor(trhN / 500) * 500)); cfgRender();
  });

  // formulár zadania
  const form = $('#briefForm');
  if (form) {
    const msg = $('#formMsg');
    const p = new URLSearchParams(location.search);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      msg.className = 'form-msg'; msg.textContent = '';
      const f = Object.fromEntries(new FormData(form));
      if (!f.meno || !f.email || !f.ponuka) { msg.className = 'form-msg err'; msg.textContent = 'Vyplňte meno, e-mail a čo predávate.'; return; }
      if (!form.suhlas.checked) { msg.className = 'form-msg err'; msg.textContent = 'Potvrďte, prosím, súhlas so spracovaním údajov.'; return; }
      const btn = $('button[type=submit]', form); btn.disabled = true; btn.firstChild.textContent = 'Odosielam… ';
      const odhad = D && selSeg.size && selKraj.size ? count([...selSeg], [...selKraj]) : null;
      try {
        const r = await fetch(API + '/api/brief', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...f, segmenty: [...selSeg], kraje: [...selKraj], odhad, poznamka: f.vyber || null, zdroj: p.get('utm_source') || p.get('k') || document.referrer || 'web' }),
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.chyba || 'Chyba');
        form.reset();
        msg.className = 'form-msg ok';
        msg.textContent = 'Ďakujeme! Zadanie máme. Do 2 pracovných dní vám pošleme počet firiem a návrh e-mailu.';
      } catch (err) {
        msg.className = 'form-msg err';
        msg.textContent = (err.message && err.message !== 'Failed to fetch') ? err.message : 'Nepodarilo sa odoslať. Napíšte nám na info@mailito.eu.';
      } finally { btn.disabled = false; btn.firstChild.textContent = 'Poslať zadanie '; }
    });
  }
})();
