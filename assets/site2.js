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
    let i = 0, z = 86, o = 9874;
    const add = (first) => {
      const [f, m, t] = LEADY[i++ % LEADY.length];
      const li = document.createElement('li'); li.className = 'fi';
      li.innerHTML = `<span class="fi-av">${f.split(' ').map(w => w[0]).slice(0, 2).join('')}</span><p class="fi-h">${f}<small>${first ? (i * 7) + ' min' : 'teraz'}</small></p><p class="fi-t">${m} · ${t}</p>`;
      feed.prepend(li);
      while (feed.children.length > 4) feed.lastElementChild.remove();
      if (!first) { z++; o += 9 + (Math.random() * 12 | 0); $('#aZ').textContent = z; $('#aO').textContent = fmt(o); }
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
    Promise.all([fetch('data/trh.json?v=a3db8d53').then(r => r.json()), fetch('data/sk_mapa.json?v=a3db8d53').then(r => r.json())]).then(([d, m]) => {
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

  // ===== v4: lievik na 1 000 firiem (canvas, natívny scroll) =====
  const fun = $('#lievik'), cv = $('#funCanvas');
  if (fun && cv) {
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dots = [], cols = 0, rows = 0;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const order = [...Array(1000).keys()].sort(() => rnd() - .5);
    const replies = new Set(order.slice(0, 38)), leads = new Set(order.slice(0, 9)), deals = new Set(order.slice(0, 2));
    const sentOrder = [...Array(1000).keys()].sort(() => rnd() - .5); const sentRank = new Map(sentOrder.map((v, i) => [v, i]));
    const layout = () => {
      const r = cv.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pad = 26; cols = Math.round(Math.sqrt(1000 * (W - pad * 2) / (H - pad * 2))); rows = Math.ceil(1000 / cols);
      const gx = (W - pad * 2) / cols, gy = (H - pad * 2 - 40) / rows;
      dots = [...Array(1000).keys()].map(i => ({ x: pad + gx * (i % cols + .5), y: pad + gy * (Math.floor(i / cols) + .5), r: Math.min(gx, gy) * .3 }));
      draw();
    };
    const steps = $$('#funSteps li'), pop = $('#funPop'), num = $('#funNum'), lbl = $('#funLbl');
    const LBL = ['firiem', 'odoslaných e-mailov', 'odpovedí', 'záujemcov', 'zákaziek · ≈ 27 000 €'];
    let last = -1;
    const draw = () => {
      const r = fun.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      const B = [0, .17, .37, .57, .77, .95];
      let st = 0; while (st < 4 && p >= B[st + 1]) st++;
      const t = Math.min(1, (p - B[st]) / (B[st + 1] - B[st]));
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 1000; i++) {
        const d = dots[i]; if (!d) continue;
        let c = '#D9DBDF', rad = d.r, a = 1;
        if (st === 0) { const v = Math.min(1, Math.max(0, (t * 1.2 - i / 1000) * 6)); a = v; }
        else if (st === 1) { c = sentRank.get(i) / 1000 < t ? '#1A1C20' : '#D9DBDF'; }
        else if (st === 2) { if (replies.has(i)) { c = '#3E63DD'; rad = d.r * (1 + .5 * t); } else { c = t > .05 ? `rgba(26,28,32,${Math.max(.12, 1 - t * .9)})` : '#1A1C20'; } }
        else if (st === 3) { if (leads.has(i)) { c = '#1E8455'; rad = d.r * (1.5 + .6 * t); ctx.fillStyle = 'rgba(30,132,85,.16)'; ctx.beginPath(); ctx.arc(d.x, d.y, rad * 2.4 * t, 0, 7); ctx.fill(); }
                else if (replies.has(i)) { c = `rgba(62,99,221,${1 - t * .75})`; rad = d.r * 1.5; } else c = 'rgba(26,28,32,.12)'; }
        else { if (deals.has(i)) { c = '#C08A1E'; rad = d.r * (2.1 + 1.2 * t); ctx.fillStyle = 'rgba(192,138,30,.18)'; ctx.beginPath(); ctx.arc(d.x, d.y, rad * 2.2, 0, 7); ctx.fill(); }
               else if (leads.has(i)) { c = '#1E8455'; rad = d.r * 2.1; } else c = 'rgba(26,28,32,.10)'; }
        ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(d.x, d.y, rad, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const n = st === 0 ? 10000 * Math.min(1, t * 1.2) : st === 1 ? 10000 * t : st === 2 ? 380 * t : st === 3 ? 90 * t : 18 * t;
      num.textContent = fmt(st === 0 && t >= .83 ? 10000 : n); lbl.textContent = LBL[st];
      if (st !== last) { steps.forEach((li, k) => { li.classList.toggle('on', k === st); li.classList.toggle('done', k < st); }); last = st; }
      pop.classList.toggle('on', st === 3 && t > .45);
      fun.classList.toggle('deal', st === 4);
    };
    let ticking = false, vis = false;
    new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) draw(); }).observe(fun);
    addEventListener('scroll', () => { if (!vis || ticking) return; ticking = true; requestAnimationFrame(() => { draw(); ticking = false; }); }, { passive: true });
    addEventListener('resize', layout);
    layout();
  }

  // ===== v4: odvetvia =====
  const IND = [
    { s: 'Výroba a priemysel', t: 'Predávate výrobným firmám?', p: 'Servis strojov, materiál, BOZP, upratovanie hál, logistika alebo softvér pre výrobu. Oslovíme strojárov, kovovýrobu, plasty aj potravinárov.',
      who: ['Strojárstvo', 'Kovovýroba', 'Plasty', 'Potravinárstvo', 'Drevovýroba'], sub: 'Servis CNC strojov do 48 hodín', body: 'Dobrý deň, staráme sa o CNC stroje vo firmách na západnom Slovensku. Pri poruche prídeme do 48 hodín, pravidelný servis plánujeme mimo zmien. Mám Vám poslať cenník servisnej zmluvy?',
      rf: 'Kovo Záhorie a.s.', rt: 'Máme 6 strojov, pošlite cenník servisnej zmluvy.' },
    { s: 'Služby pre firmy', t: 'Predávate služby iným firmám?', p: 'Softvér, školenia, poistenie, firemné darčeky alebo personalistika. Oslovíme účtovníkov, poradcov, agentúry a kancelárie.',
      who: ['Účtovníctvo', 'Poradenstvo', 'Personalistika', 'Upratovanie', 'Školenia'], sub: 'Firemné darčeky s logom do Vianoc', body: 'Dobrý deň, pripravujeme vianočné balíčky s logom pre klientov a zamestnancov, od 20 kusov, s doručením po celom Slovensku. Mám Vám poslať katalóg a ceny?',
      rf: 'Ekonomik Poradca s.r.o.', rt: 'Potrebujeme 40 balíčkov, pošlite katalóg.' },
    { s: 'IT, marketing a médiá', t: 'Predávate IT firmám a agentúram?', p: 'Hardvér, nábor, coworking, účtovníctvo alebo právne služby. Oslovíme vývojárov, web štúdiá, agentúry a médiá.',
      who: ['Vývoj softvéru', 'Web štúdiá', 'Reklamné agentúry', 'IT služby', 'Tlač'], sub: 'Nábor vývojárov bez platby vopred', body: 'Dobrý deň, hľadáme vývojárov pre IT firmy na Slovensku a platíte až za nástup. Ak teraz niekoho hľadáte, pošlem Vám 3 overených kandidátov do týždňa. Môžem?',
      rf: 'WebSoft s.r.o.', rt: 'Hľadáme 2 Java vývojárov, zavolajte mi.' },
    { s: 'Stavebníctvo a remeslá', t: 'Predávate stavebným firmám?', p: 'Materiál, požičovňa techniky, lešenia, BOZP, poistenie alebo účtovníctvo. Oslovíme stavebné firmy, remeselníkov aj projektantov.',
      who: ['Stavebné firmy', 'Projektanti', 'Elektroinštalácie', 'Strechy', 'Inštalatéri'], sub: 'Lešenie s dovozom do 24 hodín', body: 'Dobrý deň, prenajímame fasádne lešenie s montážou a dovozom do 24 hodín v celom Žilinskom kraji. Mám Vám poslať cenu na Vašu najbližšiu stavbu?',
      rf: 'Stavby Kysuce s.r.o.', rt: 'Potrebujeme 300 m² na november, pošlite cenu.' },
    { s: 'Logistika a doprava', t: 'Predávate dopravcom a skladom?', p: 'Pneuservis, GPS monitoring, palivové karty, poistenie flotily alebo skladové systémy. Oslovíme dopravcov, špeditérov a sklady.',
      who: ['Nákladná doprava', 'Špedícia', 'Sklady', 'Kuriéri', 'Medzinárodná preprava'], sub: 'GPS monitoring vozidiel, 3 mesiace zdarma', body: 'Dobrý deň, montujeme GPS jednotky do nákladných áut s knihou jázd a hlásením spotreby. Prvé 3 mesiace sú zdarma. Mám Vám poslať ponuku pre Vašu flotilu?',
      rf: 'Trans Váh s.r.o.', rt: 'Máme 18 kamiónov, pošlite ponuku.' },
  ];
  const indTabs = $('#indTabs'), indPanel = $('#indPanel');
  if (indTabs) {
    let T = null;
    fetch('data/trh.json?v=a3db8d53').then(r => r.json()).then(d => { T = d; show(0); }).catch(() => show(0));
    indTabs.innerHTML = IND.map((x, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-i="${i}">${x.s}</button>`).join('');
    const show = i => {
      const x = IND[i];
      const n = T ? Object.values(T.matica[x.s] || {}).reduce((a, b) => a + b, 0) : 0;
      $$('button', indTabs).forEach(b => b.setAttribute('aria-selected', +b.dataset.i === i));
      indPanel.innerHTML = `<div class="ind-l"><p class="eyebrow">${x.s}</p><h3>${x.t}</h3><p>${x.p}</p>
        <div class="ind-nums"><div><b>${n ? fmt(n) : '–'}</b><span>firiem s firemným e-mailom</span></div><div><b>${n ? fmt(n * .003) + '–' + fmt(n * .012) : '–'}</b><span>očakávaných záujemcov z celého odvetvia</span></div></div>
        <div class="ind-who">${x.who.map(w => `<span>${w}</span>`).join('')}</div></div>
        <div class="ind-r"><div class="ind-mail"><div class="card-h"><p>Ukážka e-mailu</p><span class="pill">Ilustračný príklad</span></div><p class="mail-s"><span>Predmet</span>${x.sub}</p><p class="mail-b">${x.body}</p></div>
        <div class="ind-reply"><b><span class="g-dot"></span>${x.rf}</b>„${x.rt}“</div></div>`;
      indPanel.classList.remove('swap'); void indPanel.offsetWidth; indPanel.classList.add('swap');
    };
    indTabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(+b.dataset.i); });
  }

  // ===== v4: živý portál v rámčeku – zmenšenie na šírku =====
  const brBody = $('#brBody');
  if (brBody) {
    const ifr = $('iframe', brBody);
    const fit = () => { const w = brBody.clientWidth, mob = w < 700; ifr.style.width = (mob ? w : 1280) + 'px'; brBody.style.setProperty('--s', mob ? 1 : Math.min(1, w / 1280).toFixed(4)); };
    fit(); addEventListener('resize', fit);
  }

  // ===== v8: personalizovaný odhad v hero =====
  const qSeg = $('#qSeg'), qLive = $('#qLive');
  if (qSeg) {
    fetch('data/trh.json?v=a3db8d53').then(r => r.json()).then(d => {
      qSeg.innerHTML = '<option value="">Vyberte odvetvie</option>' + d.segmenty.filter(x => x !== 'Ostatné').map(x => `<option>${x}</option>`).join('');
      const upd = () => {
        const v = qSeg.value; if (!v) { qLive.classList.remove('on'); return; }
        const n = Object.values(d.matica[v] || {}).reduce((a, b) => a + b, 0);
        const lo = Math.max(1, Math.round(Math.min(n, 3500) * .0075 * .2)), hi = Math.max(2, Math.round(Math.min(n, 3500) * .012 * .25));
        qLive.innerHTML = `<span class="g-dot"></span><b>${fmt(n)} firiem</b> z odvetvia ${v.toLowerCase()} čaká na Slovensku · prvá kampaň ≈ <b>${lo}–${hi} nových zákaziek</b>`;
        qLive.classList.add('on');
      };
      qSeg.addEventListener('change', upd);
    }).catch(() => {});
  }

  // ===== v5: rýchly formulár v hero =====
  const qf = $('#quickForm');
  if (qf) {
    const qm = $('#quickMsg'), q0 = qm.innerHTML, qs = new URLSearchParams(location.search);
    qf.addEventListener('submit', async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(qf));
      if (!f.ponuka || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email || '')) { qm.className = 'quick-note err'; qm.textContent = 'Napíšte, čo predávate, a platný e-mail.'; return; }
      const btn = $('button', qf); btn.disabled = true; btn.textContent = 'Odosielam…';
      try {
        const r = await fetch(API + '/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...f, segmenty: f.segment ? [f.segment] : [], balik: 'neviem', zdroj: 'hero:' + (qs.get('utm_source') || qs.get('k') || document.referrer || 'web') }) });
        const j = await r.json(); if (!j.ok) throw new Error(j.chyba || 'Chyba');
        qf.reset(); qm.className = 'quick-note ok'; qm.textContent = 'Ďakujeme! Do 2 pracovných dní vám pošleme počet firiem vo vašom odbore a návrh e-mailu.';
      } catch (err) { qm.className = 'quick-note err'; qm.textContent = err.message && err.message !== 'Failed to fetch' ? err.message : 'Nepodarilo sa odoslať. Napíšte nám na info@mailito.eu.'; }
      finally { btn.disabled = false; btn.textContent = 'Chcem zákazky'; }
    });
  }

  // ===== v5: návratnosť (ROI) =====
  const roiVal = $('#roiVal'), roiConv = $('#roiConv');
  const roi = () => {
    if (!roiVal || !range) return;
    const n = +range.value, p = cena(n), v = Math.max(0, +roiVal.value || 0), c = Math.min(100, Math.max(0, +roiConv.value || 0)) / 100;
    const lo = Math.max(1, Math.round(n * .003)), hi = Math.max(2, Math.round(n * .012));
    const rl = lo * c * v, rh = hi * c * v;
    $('#roiRev').textContent = v && c ? `${fmt(rl)} – ${fmt(rh)} €` : '–';
    $('#roiX').textContent = v && c ? (rl >= p ? `Kampaň za ${fmt(p)} € sa vám vráti ${(rl / p).toFixed(1).replace('.', ',')}× až ${(rh / p).toFixed(0)}×.` : `Kampaň sa vráti už pri ${Math.ceil(p / (c * v))} záujemcoch.`) : '';
  };
  roiVal?.addEventListener('input', roi); roiConv?.addEventListener('input', roi); range?.addEventListener('input', roi);
  $$('.cfg-quick button').forEach(b => b.addEventListener('click', () => setTimeout(roi)));
  roi();

  // ===== v5: mobilné lepkavé tlačidlo =====
  const mcta = $('#mcta'), heroEl = $('.hero'), briefEl = $('#zadanie');
  if (mcta) {
    let inHero = true, inBrief = false;
    const upd = () => mcta.classList.toggle('on', !inHero && !inBrief);
    new IntersectionObserver(es => { inHero = es[0].isIntersecting; upd(); }).observe(heroEl);
    new IntersectionObserver(es => { inBrief = es[0].isIntersecting; upd(); }).observe(briefEl);
  }

  // ===== v7: plán rastu =====
  const plR = $('#plRange'), plV = $('#plVal'), plC = $('#plChart');
  if (plR) {
    const LEAD = .0075, CONV = .2;
    plC.innerHTML = Array.from({ length: 12 }, (_, i) => `<i data-m="M${i + 1}"></i>`).join('');
    const bars = $$('i', plC);
    const plan = () => {
      const d = +plR.value, v = Math.max(0, +plV.value || 0);
      plR.style.setProperty('--p', ((d - plR.min) / (plR.max - plR.min) * 100) + '%');
      const firms = Math.min(20000, Math.max(1000, Math.ceil(d / (LEAD * CONV) / 500) * 500));
      const mesacne = cena(firms), rok = d * 12, obrat = rok * v;
      $('#plN').textContent = d;
      $('#plYear').textContent = `${fmt(rok)} zákaziek`;
      $('#plRev').textContent = v ? `${fmt(obrat)} €` : '–';
      bars.forEach((b, i) => { const val = d * (i + 1) * v; b.style.setProperty('--h', ((i + 1) / 12 * 100) + '%'); b.style.setProperty('--o', ((i + 1) / 12 * .55).toFixed(2)); b.dataset.v = v ? fmt(val) + ' €' : ''; });
      $('#plHow').innerHTML = `Každý mesiac oslovíme <b>${fmt(firms)} firiem</b> z vášho odboru za <b>${fmt(mesacne)} €</b>. ` +
        (v ? `Ročne investujete ${fmt(mesacne * 12)} € a získate zákazky za ${fmt(obrat)} € – <b>${(obrat / (mesacne * 12)).toFixed(0)}× viac</b>, než stoja.` : '') +
        ` Odhad: 0,75&nbsp;% oslovených firiem má záujem, 20&nbsp;% z nich sa stane zákazkou.`;
    };
    plR.addEventListener('input', plan); plV.addEventListener('input', plan); plan();
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
