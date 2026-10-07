(() => {
  const API = 'https://mailito-api.webhunter.workers.dev';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('sk-SK').replace(/[   ]/g, ' ');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // cenník – rovnaký výpočet je v portal.js a engine/sync.py
  const cena = n => { let p = 0, od = 0; for (const [d, c] of [[1000, .149], [3000, .10], [10000, .08], [Infinity, .06]]) { if (n > od) p += (Math.min(n, d) - od) * c; od = d; } return Math.round(p / 10) * 10 - 1; };

  // navigácia
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('#burger'), menu = $('#menu');
  burger?.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => { menu.classList.remove('open'); burger?.setAttribute('aria-expanded', false); document.body.style.overflow = ''; }));

  // odhalenie pri scrollovaní + počítadlá
  const countUp = el => {
    const t = +el.dataset.count; if (!t || reduce) return;
    const t0 = performance.now();
    const st = now => { const q = Math.min(1, (now - t0) / 1500); el.textContent = fmt(t * (1 - Math.pow(1 - q, 3))); if (q < 1) requestAnimationFrame(st); };
    requestAnimationFrame(st);
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); $$('[data-count]', e.target).forEach(countUp); io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => io.observe(el));

  // živý prúd záujemcov v ukážke portálu (ilustračné firmy)
  const LEADY = [
    ['Kovo Záhorie a.s.', 'Senica', 'Hľadáme dodávateľa od januára, pošlite ponuku.'],
    ['Plasty Nitra s.r.o.', 'Nitra', 'Pošlite cenník, máme dve haly po 1 500 m².'],
    ['Drevotech Považie s.r.o.', 'Púchov', 'Zavolajte v stredu po 10:00, nákup – Ing. Šimková.'],
    ['Logistika Váh s.r.o.', 'Hlohovec', 'Pošlite cenu za 2 000 m² mesačne.'],
    ['Agro Podunajsko s.r.o.', 'Galanta', 'Zmluva nám končí v januári, porovnáme ponuky.'],
    ['Sklad Trnava s.r.o.', 'Trnava', 'Aké máte termíny? Radi by sme sa stretli.'],
  ];
  const feed = $('#heroFeed');
  if (feed) {
    let i = 0, z = 19, o = 1874, r = 71;
    const add = (first) => {
      const [f, m, t] = LEADY[i++ % LEADY.length];
      const li = document.createElement('li'); li.className = 'fi';
      li.innerHTML = `<span class="fi-av">${f.split(' ').map(w => w[0]).slice(0, 2).join('')}</span><p class="fi-h">${f}<small>${first ? (i * 7) + ' min' : 'teraz'}</small></p><p class="fi-t">${m} · ${t}</p>`;
      feed.prepend(li);
      while (feed.children.length > 4) feed.lastElementChild.remove();
      if (!first) { z++; r++; o += 9 + (Math.random() * 12 | 0); $('#aZ').textContent = z; $('#aR').textContent = r; $('#aO').textContent = fmt(o); }
    };
    for (let k = 0; k < 4; k++) add(true);
    if (!reduce) setInterval(() => { if (!document.hidden) add(false); }, 4200);
  }

  // kalkulačka trhu s mapou
  const chipsEl = $('#segChips'), mapEl = $('#map'), krajEl = $('#krajChips');
  let D = null, M = null;
  const selSeg = new Set(['Výroba a priemysel', 'Logistika a doprava']);
  const selKraj = new Set(['Trnavský', 'Nitriansky', 'Trenčiansky']);
  const count = (segs, kraje) => { let n = 0; for (const s of segs) for (const k of kraje) n += (D.matica[s] || {})[k] || 0; return n; };
  let numRaf;
  const animateNum = (el, to) => {
    const from = +(el.dataset.v || 0); el.dataset.v = to; cancelAnimationFrame(numRaf);
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const st = t => { const q = Math.min(1, (t - t0) / 550); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - q, 3))); if (q < 1) numRaf = requestAnimationFrame(st); };
    numRaf = requestAnimationFrame(st);
  };
  const render = () => {
    if (!D) return;
    const segs = selSeg.size ? [...selSeg] : D.segmenty, kraje = [...selKraj];
    $$('.chip', chipsEl).forEach(c => { c.setAttribute('aria-pressed', selSeg.has(c.dataset.s)); $('small', c).textContent = fmt(count([c.dataset.s], kraje.length ? kraje : D.kraje)); });
    $$('.kraj-b[data-k]', krajEl).forEach(c => { c.setAttribute('aria-pressed', selKraj.has(c.dataset.k)); $('small', c).textContent = fmt(count(segs, [c.dataset.k])); });
    $('[data-all]', krajEl)?.setAttribute('aria-pressed', selKraj.size === 8);
    if (M) $$('.m-dot', M).forEach(c => c.classList.toggle('on', selKraj.has(D.kraje[c.dataset.k])));
    const n = selSeg.size && kraje.length ? count([...selSeg], kraje) : 0;
    animateNum($('#crNum'), n);
    $('#crSub').textContent = !selSeg.size ? 'Vyberte aspoň jedno odvetvie' : !kraje.length ? 'Vyberte aspoň jeden kraj'
      : `${[...selSeg].join(', ')} · ${kraje.length === 8 ? 'celé Slovensko' : kraje.join(', ')}`;
    const base = Math.min(n, 1000);
    $('#crLeads').textContent = n ? `${Math.max(1, Math.round(base * .003))} – ${Math.max(2, Math.round(base * .012))} záujemcov` : '–';
    $('#crLeadsAll').textContent = n ? `${fmt(Math.max(1, n * .003))} – ${fmt(Math.max(2, n * .012))} záujemcov` : '–';
    const v = $('#fVyber'); if (v) v.value = n ? `${[...selSeg].join(', ')} | ${kraje.length === 8 ? 'celé Slovensko' : kraje.join(', ')} | ${fmt(n)} firiem` : '';
    setTrh(n);
  };
  if (chipsEl) {
    Promise.all([fetch('data/trh.json?v=fb974448').then(r => r.json()), fetch('data/sk_mapa.json?v=fb974448').then(r => r.json())]).then(([d, m]) => {
      D = d;
      chipsEl.innerHTML = d.segmenty.map(s => `<button type="button" class="chip" data-s="${s}" aria-pressed="false">${s}<small></small></button>`).join('');
      krajEl.innerHTML = d.kraje.map(k => `<button type="button" class="kraj-b" data-k="${k}" aria-pressed="false">${k}<small></small></button>`).join('')
        + `<button type="button" class="kraj-b" data-all>Celé Slovensko</button>`;
      mapEl.innerHTML = `<svg viewBox="-10 -10 ${m.w + 20} ${m.h + 20}" role="img" aria-label="Mapa Slovenska podľa krajov">${m.dots.map(([x, y, k]) => `<circle class="m-dot" cx="${x}" cy="${y}" r="${m.r * 1.15}" data-k="${k}"/>`).join('')}</svg>`;
      M = mapEl.querySelector('svg');
      // poradie krajov v mape = poradie v trh.json
      if (m.kraje.join() !== d.kraje.join()) $$('.m-dot', M).forEach(c => c.dataset.k = d.kraje.indexOf(m.kraje[c.dataset.k]));
      const toggle = k => { selKraj.has(k) ? selKraj.delete(k) : selKraj.add(k); render(); };
      M.addEventListener('click', e => { const c = e.target.closest('.m-dot'); if (c) toggle(d.kraje[c.dataset.k]); });
      M.addEventListener('mousemove', e => { const c = e.target.closest('.m-dot'); const k = c ? c.dataset.k : null; $$('.m-dot', M).forEach(x => x.classList.toggle('hov', x.dataset.k === k)); });
      M.addEventListener('mouseleave', () => $$('.m-dot.hov', M).forEach(x => x.classList.remove('hov')));
      chipsEl.addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; selSeg.has(c.dataset.s) ? selSeg.delete(c.dataset.s) : selSeg.add(c.dataset.s); render(); });
      krajEl.addEventListener('click', e => { const c = e.target.closest('.kraj-b'); if (!c) return; if ('all' in c.dataset) { const all = selKraj.size === 8; d.kraje.forEach(k => all ? selKraj.delete(k) : selKraj.add(k)); render(); } else toggle(c.dataset.k); });
      render();
    }).catch(() => { $('#crSub').textContent = 'Dáta sa nepodarilo načítať.'; });
  }

  // konfigurátor ceny
  const range = $('#cfgRange'), fPocet = $('#fPocet');
  if (fPocet) {
    let o = ''; for (let n = 1000; n <= 20000; n += 500) o += `<option value="${n}">${fmt(n)} firiem · ${fmt(cena(n))} €</option>`;
    fPocet.innerHTML = o + '<option value="neviem">Ešte neviem</option>';
  }
  let trhN = 0;
  const snap = n => Math.min(20000, Math.max(1000, Math.round(n / 500) * 500));
  const cfgRender = () => {
    if (!range) return;
    const n = +range.value, p = cena(n);
    range.style.setProperty('--p', ((n - range.min) / (range.max - range.min) * 100) + '%');
    $('#cfgN').textContent = fmt(n); $('#cfgPrice').textContent = fmt(p);
    $('#cfgPer').textContent = (p / n).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' €';
    const lo = Math.max(1, Math.round(n * .003)), hi = Math.max(2, Math.round(n * .012));
    $('#cfgLeads').textContent = `${fmt(lo)} – ${fmt(hi)}`; $('#cfgCpl').textContent = `${fmt(p / hi)} – ${fmt(p / lo)} €`;
    $('#cfgCta').textContent = `Objednať ${fmt(n)} firiem`;
    $$('.cfg-quick [data-n]').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
    $('#cfgTrh').classList.toggle('on', !!trhN && n === snap(trhN));
    $$('.tiers div').forEach((d, i) => d.classList.toggle('on', i === (n <= 1000 ? 0 : n <= 3000 ? 1 : n <= 10000 ? 2 : 3)));
    $('#cfgHint').innerHTML = trhN && n > trhN ? `Vo vašom výbere je len <b>${fmt(trhN)}</b> firiem – pridajte odvetvia alebo kraje.` : trhN ? `Z vášho výberu (${fmt(trhN)} firiem) oslovíme ${fmt(n)}.` : '';
    if (fPocet?.querySelector(`option[value="${n}"]`)) fPocet.value = n;
  };
  function setTrh(n) {
    trhN = n; const b = $('#cfgTrh');
    if (b) { b.hidden = !n; b.textContent = `Celý môj výber · ${fmt(Math.min(20000, n))}`; }
    cfgRender();
  }
  if (range) {
    range.addEventListener('input', cfgRender);
    $$('.cfg-quick [data-n]').forEach(b => b.addEventListener('click', () => { range.value = b.dataset.n; cfgRender(); }));
    $('#cfgTrh').addEventListener('click', () => { range.value = snap(trhN); cfgRender(); });
    $('#calcCta')?.addEventListener('click', () => { if (trhN && +range.value > trhN) { range.value = Math.max(1000, Math.floor(trhN / 500) * 500); cfgRender(); } });
    cfgRender();
  }

  // formulár zadania
  const form = $('#briefForm');
  if (form) {
    const msg = $('#formMsg'), q = new URLSearchParams(location.search);
    form.addEventListener('submit', async e => {
      e.preventDefault(); msg.className = 'form-msg'; msg.textContent = '';
      const f = Object.fromEntries(new FormData(form));
      if (!f.meno || !f.email || !f.ponuka) { msg.className = 'form-msg err'; msg.textContent = 'Vyplňte meno, e-mail a čo predávate.'; return; }
      if (!form.suhlas.checked) { msg.className = 'form-msg err'; msg.textContent = 'Potvrďte, prosím, súhlas so spracovaním údajov.'; return; }
      const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Odosielam…';
      try {
        const odhad = D && selSeg.size && selKraj.size ? count([...selSeg], [...selKraj]) : null;
        const r = await fetch(API + '/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...f, segmenty: [...selSeg], kraje: [...selKraj], odhad, poznamka: f.vyber || null, zdroj: q.get('utm_source') || q.get('k') || document.referrer || 'web' }) });
        const j = await r.json(); if (!j.ok) throw new Error(j.chyba || 'Chyba');
        form.reset(); cfgRender();
        msg.className = 'form-msg ok'; msg.textContent = 'Ďakujeme! Zadanie máme. Do 2 pracovných dní vám pošleme počet firiem a návrh e-mailu.';
      } catch (err) {
        msg.className = 'form-msg err'; msg.textContent = err.message && err.message !== 'Failed to fetch' ? err.message : 'Nepodarilo sa odoslať. Napíšte nám na info@mailito.eu.';
      } finally { btn.disabled = false; btn.textContent = 'Poslať zadanie'; }
    });
  }
})();
