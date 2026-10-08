(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('sk-SK').replace(/[\s  ]/g, ' ');
  const BASE = new URL('../', (document.currentScript || {}).src || location.href).href;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // cenník – rovnaký výpočet je v portal.js a engine/sync.py
  const cena = n => { let p = 0, od = 0; for (const [d, c] of [[1000, .149], [3000, .10], [10000, .08], [Infinity, .06]]) { if (n > od) p += (Math.min(n, d) - od) * c; od = d; } return Math.round(p / 10) * 10 - 1; };
  const OBJ = BASE + 'objednat/';
  // odhad (Rafael 8. 10.: optimisticky) – rovnako v objednat/objednat.js
  const LO = .02, HI = .04, KONV = .33;
  const once = (el, fn, threshold = .45) => { if (!el) return; const o = new IntersectionObserver(es => { if (es[0].isIntersecting) { o.disconnect(); fn(); } }, { threshold }); o.observe(el); };
  const tween = (el, to, ms = 900, f = fmt, suf = '') => {
    const from = parseFloat(el.dataset.v || 0); el.dataset.v = to;
    if (reduce) { el.textContent = f(to) + suf; return; }
    const t0 = performance.now();
    const st = now => { const q = Math.min(1, (now - t0) / ms), v = from + (to - from) * (1 - Math.pow(1 - q, 3)); el.textContent = f(v) + suf; if (q < 1) requestAnimationFrame(st); };
    requestAnimationFrame(st);
  };

  // navigácia
  const nav = $('#nav');
  if (nav) { const onScroll = () => nav.classList.toggle('scrolled', scrollY > 10); addEventListener('scroll', onScroll, { passive: true }); onScroll(); }
  const burger = $('#burger'), menu = $('#menu');
  if (burger && menu) {
    const closeMenu = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = ''; };
    burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; });
    $$('a', menu).forEach(a => a.addEventListener('click', closeMenu));
  }

  // jemné odhalenie
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.sec-head, .feat, .fact, .fun, .rep, .meta, .cmp, .qt, .calc, .faq-list, .end-txt, .step-card, .teaser, .pot-card, .vs, .risk-l, .teaser-r, .replies, .pf-l, .mails, .tl, .pp').forEach((el, i) => { el.classList.add('rv'); if (el.classList.contains('fact')) el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });

  // návštevník z nášho e-mailu: „práve ste to zažili“
  const qp = new URLSearchParams(location.search), fm = $('#fromMail');
  if (fm && (qp.get('z') === 'mail' || /mail/i.test(qp.get('utm_medium') || ''))) {
    let zav = false; try { zav = sessionStorage.getItem('fmX') === '1'; } catch (e) {}
    if (!zav) { fm.hidden = false; $('#fromMailX').addEventListener('click', () => { fm.hidden = true; try { sessionStorage.setItem('fmX', '1'); } catch (e) {} }); }
  }

  // ===== ukážka portálu: prichádzajú noví záujemcovia =====
  const NOVI = [
    ['KO', 30, 'Kartonáž Orava s.r.o.', 'Dolný Kubín', 'Žilinský kraj', 'Sklad 3&nbsp;000&nbsp;m², 2× týždenne', 'hot', 'Chcú pravidelné upratovanie skladu 3&nbsp;000&nbsp;m² dvakrát týždenne. Žiadajú cenu na mesiac.', 'Mgr. Jana Hudecová', 'prevádzková riaditeľka', 'Dobrý deň, máme sklad 3&nbsp;000&nbsp;m² a hľadáme firmu na pravidelné upratovanie. Pošlite prosím cenu na mesiac.', 'j.hudecova'],
    ['MV', 120, 'Mlyny Vráble s.r.o.', 'Vráble', 'Nitriansky kraj', 'Upratovanie po rekonštrukcii', 'hot', 'V novembri končia rekonštrukciu haly a potrebujú jednorazové upratovanie. Pýtajú termín a cenu.', 'Ing. Tomáš Bielik', 'konateľ', 'Dobrý deň, v novembri končíme rekonštrukciu haly. Viete prísť na jednorazové upratovanie? Aká by bola cena?', 't.bielik'],
    ['AT', 345, 'Autodiely Tatry s.r.o.', 'Poprad', 'Prešovský kraj', 'Porovnať ponuku od 1. 1.', 'warm', 'Súčasná zmluva im končí v decembri. Ponuku chcú porovnať s terajším dodávateľom.', 'Marek Gajdoš', 'vedúci prevádzky', 'Dobrý deň, zmluvu máme do decembra. Pošlite ponuku, radi porovnáme.', 'm.gajdos'],
    ['KZ', 152, 'Kovo Záhorie a.s.', 'Senica', 'Trnavský kraj', 'Dodávateľa od januára, 2 haly', 'hot', 'Hľadajú nového dodávateľa upratovania od januára. Dve výrobné haly, ponuku chcú do piatku.', 'Ing. Peter Kováč', 'konateľ', 'Dobrý deň, ďakujem za správu. Od januára hľadáme nového dodávateľa, máme dve haly. Pošlite nám prosím ponuku do piatku.', 'p.kovac'],
  ];
  const rows = $('#aRows'), det = $('.a-det');
  if (rows) {
  let ni = 0, cZ = 296, cN = 14, cO = 9874;
  const tagH = t => t === 'hot' ? '<em class="tag t-hot">Horúci</em>' : '<em class="tag t-warm">Teplý</em>';
  const pridaj = () => {
    const [ini, h, firma, mesto, kraj, co, t, ai, osoba, rola, txt, mail] = NOVI[ni++ % NOVI.length];
    $$('.tr', rows).forEach(r => { r.classList.remove('sel', 'new'); if ($('b', r)?.textContent === firma) r.remove(); });
    const r = document.createElement('div'); r.className = 'tr sel new';
    r.innerHTML = `<span class="t-firm"><i class="av" style="--h:${h}">${ini}</i><b>${firma}</b><small>${mesto}</small></span><span class="t-what">${co}</span><span>${tagH(t)}</span><span><em class="st st-new">Nový</em></span><span class="r t-mut">–</span>`;
    rows.prepend(r); while (rows.children.length > 7) rows.lastElementChild.remove();
    cZ++; cN++; cO += 8 + (Math.random() * 14 | 0);
    $('#aZ').textContent = $('#aAll').textContent = cZ; $('#aNew').textContent = cN; $('#aBadge').textContent = cN;
    $('#aO').textContent = $('#aO2').textContent = fmt(cO);
    if (det && getComputedStyle(det).display !== 'none') {
      det.classList.add('swap');
      setTimeout(() => {
        $('.d-head', det).innerHTML = `<i class="av av-lg" style="--h:${h}">${ini}</i><div><p class="d-firm">${firma}</p><p class="d-meta">${mesto} · ${kraj}</p></div>`;
        $('.d-ai p:last-child', det).innerHTML = ai;
        $('.d-mail .d-l', det).textContent = 'Odpoveď · práve teraz';
        $('.d-from', det).innerHTML = `<b>${osoba}</b> · ${rola}`;
        $('.d-txt', det).innerHTML = txt;
        $('.d-props div:nth-child(2) dd', det).textContent = mail + '@••••••.sk';
        det.classList.remove('swap');
      }, 350);
    }
  };
  let heroOn = true;
  new IntersectionObserver(es => { heroOn = es[0].isIntersecting; }).observe($('.win'));
  if (!reduce) setInterval(() => { if (heroOn && !document.hidden) pridaj(); }, 5200);
  }

  // ===== produkt: aktívny krok v ľavom menu =====
  const pLinks = $$('.prod-nav a');
  const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) pLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
  $$('.feat').forEach(f => spy.observe(f));

  // ===== cielenie so skutočnými počtami =====
  const qSeg = $('#qSeg'), qMsg = $('#quickMsg'), q0 = qMsg ? qMsg.innerHTML : '';
  if (qSeg || $('#audSeg')) fetch(BASE + 'data/trh.json?v=b4c759c0').then(r => r.json()).then(d => {
    const segs = d.segmenty.filter(x => x !== 'Ostatné');
    // úvodný formulár
    if (qSeg) {
    qSeg.innerHTML = '<option value="">Komu? Odvetvie</option>' + segs.map(x => `<option>${x}</option>`).join('');
    qSeg.addEventListener('change', () => {
      const v = qSeg.value; qSeg.classList.toggle('has', !!v); qMsg.className = 'hero-note';
      if (!v) { qMsg.innerHTML = q0; return; }
      const n = Object.values(d.matica[v] || {}).reduce((a, b) => a + b, 0), base = Math.min(n, 3500);
      qMsg.innerHTML = `<b>${fmt(n)} firiem</b> z odvetvia ${v.toLowerCase()} · prvá kampaň ≈ <b>${Math.max(1, Math.round(base * LO * KONV))} – ${Math.max(2, Math.round(base * HI * KONV))} nových zákaziek</b>`;
    });
    }
    // výber cieľovej skupiny
    const selS = new Set(['Výroba a priemysel']), selK = new Set();
    const KR = { 'Bratislavský': 'Bratislava', 'Trnavský': 'Trnava', 'Trenčiansky': 'Trenčín', 'Nitriansky': 'Nitra', 'Žilinský': 'Žilina', 'Banskobystrický': 'Banská Bystrica', 'Prešovský': 'Prešov', 'Košický': 'Košice' };
    const kr = d.kraje, sum = (s, ks) => (ks.size ? [...ks] : kr).reduce((a, k) => a + ((d.matica[s] || {})[k] || 0), 0);
    const boxS = $('#audSeg'), boxK = $('#audKraj');
    if (!boxS || !boxK) return;
    const draw = () => {
      boxS.innerHTML = segs.map(s => `<button type="button" class="chip${selS.has(s) ? ' on' : ''}" data-s="${s}">${s}<small>${fmt(sum(s, selK))}</small></button>`).join('');
      boxK.innerHTML = `<button type="button" class="chip${selK.size ? '' : ' on'}" data-k="">Celé Slovensko</button>` + kr.map(k => `<button type="button" class="chip${selK.has(k) ? ' on' : ''}" data-k="${k}">${KR[k] || k}</button>`).join('');
      const n = [...selS].reduce((a, s) => a + sum(s, selK), 0);
      tween($('#audN'), n, 700);
      $('#audL').textContent = `${fmt(Math.max(1, n * LO))} – ${fmt(Math.max(2, n * HI))}`;
      $('#audP').textContent = fmt(cena(Math.max(1000, n))) + ' €';
    };
    boxS.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; const s = b.dataset.s; if (selS.has(s)) { if (selS.size > 1) selS.delete(s); } else selS.add(s); draw(); });
    boxK.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; if (!k) selK.clear(); else if (selK.has(k)) selK.delete(k); else selK.add(k); if (selK.size === kr.length) selK.clear(); draw(); });
    draw();
  }).catch(() => {});

  // ===== odpovede: AI triedi =====
  once($('#inbox'), () => {
    $$('.ib').forEach((r, k) => {
      const hot = $('.t-hot', r), dim = $('.t-grey', r);
      if (reduce) { r.classList.add('done', hot ? 'hot' : dim ? 'dim' : 'x'); return; }
      setTimeout(() => r.classList.add('scan'), k * 650);
      setTimeout(() => { r.classList.remove('scan'); r.classList.add('done'); if (hot) r.classList.add('hot'); if (dim) r.classList.add('dim'); }, k * 650 + 420);
    });
  });

  // ===== zákazky: priebeh obchodu =====
  once($('#deal'), () => {
    const pipe = $('.pipe'), li = pipe ? $$('li', pipe) : [], v = $('#dealV');
    if (!pipe || !v) return;
    v.textContent = '0 €';
    li.forEach((l, k) => setTimeout(() => { l.classList.add('on'); pipe.style.setProperty('--pp', k / 3); if (k === 3) tween(v, 4800, 1000, fmt, ' €'); }, reduce ? 0 : 300 + k * 550));
  }, .5);

  // ===== počítadlá =====
  $$('[data-count]').forEach(el => once(el, () => {
    const to = parseFloat(el.dataset.count), suf = el.dataset.suf || '', dec = el.dataset.count.includes('.');
    tween(el, to, 1300, v => dec ? v.toFixed(1).replace('.', ',') : fmt(v), suf);
  }, .6));

  // úvodný formulár → objednávka (jedno pole: web alebo popis)
  const qf = $('#quickForm');
  if (qf) qf.addEventListener('submit', e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(qf));
    if (f.web_url) return;
    const v = (f.ponuka || '').trim();
    if (v.length < 3) { qMsg.className = 'hero-note err'; qMsg.textContent = 'Napíšte adresu webu alebo pár slov o tom, čo predávate.'; qf.ponuka.focus(); return; }
    const q = new URLSearchParams();
    if (/^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(v) && !/\s/.test(v)) q.set('web', v); else q.set('ponuka', v);
    if (f.segment) q.set('segment', f.segment);
    location.href = OBJ + '?' + q.toString();
  });

  // ===== potenciál trhu (domov) =====
  const potSeg = $('#potSeg');
  if (potSeg) fetch(BASE + 'data/trh.json?v=b4c759c0').then(r => r.json()).then(d => {
    const segs = d.segmenty.filter(x => x !== 'Ostatné'), kr = d.kraje;
    const KR = { 'Bratislavský': 'Bratislava', 'Trnavský': 'Trnava', 'Trenčiansky': 'Trenčín', 'Nitriansky': 'Nitra', 'Žilinský': 'Žilina', 'Banskobystrický': 'B. Bystrica', 'Prešovský': 'Prešov', 'Košický': 'Košice' };
    const JA = window.MAILITO_JA;
    const selS = new Set(JA?.ciel?.length ? JA.ciel : ['Výroba a priemysel', 'Logistika a doprava']), selK = new Set(JA?.kraj ? [JA.kraj] : []);
    const sum = (s, ks) => (ks.size ? [...ks] : kr).reduce((a, k) => a + ((d.matica[s] || {})[k] || 0), 0);
    const boxK = $('#potKraj'), vIn = $('#potV');
    const rng = (a, b, suf = '') => (a === b ? fmt(a) : fmt(a) + ' – ' + fmt(b)) + suf;
    const draw = () => {
      potSeg.innerHTML = segs.map(s => `<button type="button" class="chip${selS.has(s) ? ' on' : ''}" data-s="${s}" aria-pressed="${selS.has(s)}">${s}<small>${fmt(sum(s, selK))}</small></button>`).join('');
      boxK.innerHTML = `<button type="button" class="chip${selK.size ? '' : ' on'}" data-k="">Celé Slovensko</button>` + kr.map(k => `<button type="button" class="chip${selK.has(k) ? ' on' : ''}" data-k="${k}">${KR[k] || k}</button>`).join('');
      calc();
    };
    let rep = 2;
    const calc = () => {
      const n = [...selS].reduce((a, s) => a + sum(s, selK), 0);
      const pocet = Math.max(1000, Math.min(3000, Math.floor((n - 100) / 100) * 100)), oslov = pocet + 100, p = cena(pocet);
      const lo = Math.max(1, Math.round(oslov * LO)), hi = Math.max(2, Math.round(oslov * HI));
      const dl = Math.max(1, Math.round(lo * KONV)), dh = Math.max(1, Math.round(hi * KONV)), v = +vIn.value;
      const rok = Math.min(n, oslov * 12), yl = Math.max(dl, Math.round(rok * LO * KONV)), yh = Math.max(dh, Math.round(rok * HI * KONV));
      tween($('#potBig'), yh * v * rep, 800);
      $('#potN').textContent = fmt(n);
      $('#potP').textContent = fmt(pocet); $('#potC').textContent = fmt(p) + '\u00a0€';
      $('#potL').textContent = rng(lo, hi); $('#potD').textContent = rng(dl, dh);
      $('#potY').innerHTML = `<b>${rng(yl, yh)} zákazníkov</b>`;
      $('#potVv').textContent = fmt(v) + '\u00a0€';
      vIn.style.setProperty('--p', ((v - vIn.min) / (vIn.max - vIn.min) * 100) + '%');
      const x1 = dl * v / p;
      $('#potX').textContent = x1 < 1 ? 'pri väčšej zákazke' : `viac ako ${fmt(x1)}×`;
      const q = new URLSearchParams({ pocet }); q.set('segment', [...selS].join(', ')); if (selK.size) q.set('kraje', [...selK].join(', '));
      $('#potCta').href = OBJ + '?' + q.toString();
      $('#potCta').firstChild.textContent = `Osloviť ${fmt(oslov)} firiem `;
    };
    $('#potRep').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; rep = +b.dataset.r; $$('#potRep .chip').forEach(c => c.classList.toggle('on', c === b)); calc(); });
    potSeg.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; const s = b.dataset.s; if (selS.has(s)) { if (selS.size > 1) selS.delete(s); } else selS.add(s); draw(); });
    boxK.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; if (!k) selK.clear(); else if (selK.has(k)) selK.delete(k); else selK.add(k); if (selK.size === kr.length) selK.clear(); draw(); });
    vIn.addEventListener('input', calc);
    draw();
  }).catch(() => {});

  // ===== AI asistent ukážka (domov) =====
  const aid = $('#aiDemo');
  if (aid) once(aid, () => aid.classList.add('play'), .35);

  // kalkulačka ceny a zákaziek
  const range = $('#cfgRange'), val = $('#roiVal'), tiers = $$('.tier'), cta = $('#cfgCta');
  if (range && val) {
  const calc = () => {
    const n = +range.value, p = cena(n), v = Math.max(0, +val.value || 0);
    range.style.setProperty('--p', ((n - range.min) / (range.max - range.min) * 100) + '%');
    const lo = Math.max(1, Math.round(n * LO)), hi = Math.max(2, Math.round(n * HI));
    const dl = Math.max(1, Math.round(lo * KONV)), dh = Math.max(1, Math.round(hi * KONV));
    $('#cfgN').textContent = fmt(n); $('#cfgTot').textContent = fmt(n + 100); $('#cfgPrice').textContent = fmt(p);
    const pr = $('.c-price'); pr.classList.add('bump'); clearTimeout(calc.t); calc.t = setTimeout(() => pr.classList.remove('bump'), 160);
    $('#cfgPer').textContent = (p / n).toLocaleString('sk-SK', { maximumFractionDigits: 3 }) + '\u00a0€';
    $('#cfgLeads').textContent = `${fmt(lo)} – ${fmt(hi)}`;
    $('#cfgDeals').textContent = dl === dh ? fmt(dl) : `${fmt(dl)} – ${fmt(dh)}`;
    $('#cfgRev').textContent = v ? `${fmt(dl * v)} – ${fmt(dh * v)}\u00a0€` : '–';
    if ($('#cfgYear')) $('#cfgYear').textContent = v ? `${fmt(dl * v * 2)} – ${fmt(dh * v * 2)}\u00a0€` : '–';
    $('#cfgX').innerHTML = v ? `Kampaň za ${fmt(p)}&nbsp;€ sa vám vráti <b>viac ako ${fmt(dl * v / p)}×</b>.` : '';
    $$('.c-quick [data-n]').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
    tiers.forEach((t, k) => { const od = +t.dataset.od, nx = tiers[k + 1] ? +tiers[k + 1].dataset.od : Infinity; t.classList.toggle('used', n > od); t.classList.toggle('on', n > od && n <= nx); });
    if (cta) cta.href = OBJ + '?pocet=' + n;
  };
  range.addEventListener('input', calc); val.addEventListener('input', calc);
  $$('.c-quick [data-n]').forEach(b => b.addEventListener('click', () => { range.value = b.dataset.n; calc(); }));
  const qn = +new URLSearchParams(location.search).get('pocet'); if (qn >= 1000 && qn <= 20000) range.value = Math.round(qn / 500) * 500;
  calc();
  }

  // mobilné lepkavé tlačidlo (mimo úvodu a formulára)
  const mcta = $('#mcta'), topEl = $('.hero, .phero'), endEl = $('#zadanie');
  if (mcta) {
    let inHero = !!topEl, inForm = false;
    const upd = () => mcta.classList.toggle('on', !inHero && !inForm);
    if (topEl) new IntersectionObserver(es => { inHero = es[0].isIntersecting; upd(); }).observe(topEl);
    if (endEl) new IntersectionObserver(es => { inForm = es[0].isIntersecting; upd(); }).observe(endEl);
    upd();
  }
})();
