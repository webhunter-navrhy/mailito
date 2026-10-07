(() => {
  const API = 'https://mailito-api.webhunter.workers.dev';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('sk-SK').replace(/[\s  ]/g, ' ');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // cenník – rovnaký výpočet je v portal.js a engine/sync.py
  const cena = n => { let p = 0, od = 0; for (const [d, c] of [[1000, .149], [3000, .10], [10000, .08], [Infinity, .06]]) { if (n > od) p += (Math.min(n, d) - od) * c; od = d; } return Math.round(p / 10) * 10 - 1; };
  const src = () => { const q = new URLSearchParams(location.search); return q.get('utm_source') || q.get('k') || document.referrer || 'web'; };
  const post = async body => {
    const r = await fetch(API + '/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json(); if (!j.ok) throw new Error(j.chyba || 'Chyba'); return j;
  };
  const errText = e => e.message && e.message !== 'Failed to fetch' ? e.message : 'Nepodarilo sa odoslať. Napíšte nám na info@mailito.eu.';
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
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 10);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('#burger'), menu = $('#menu');
  const closeMenu = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = ''; };
  burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; });
  $$('a', menu).forEach(a => a.addEventListener('click', closeMenu));

  // jemné odhalenie
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.sec-head, .feat, .fact, .fun, .rep, .meta, .cmp, .qt, .calc, .faq-list, .end-txt, .form').forEach((el, i) => { el.classList.add('rv'); if (el.classList.contains('fact')) el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });

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
  let ni = 0, cZ = 86, cN = 6, cO = 9874;
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

  // ===== produkt: aktívny krok v ľavom menu =====
  const pLinks = $$('.prod-nav a');
  const spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) pLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
  $$('.feat').forEach(f => spy.observe(f));

  // ===== cielenie so skutočnými počtami =====
  const qSeg = $('#qSeg'), qMsg = $('#quickMsg'), q0 = qMsg.innerHTML;
  fetch('data/trh.json?v=6a3b9c45').then(r => r.json()).then(d => {
    const segs = d.segmenty.filter(x => x !== 'Ostatné');
    // úvodný formulár
    qSeg.innerHTML = '<option value="">Komu? Odvetvie</option>' + segs.map(x => `<option>${x}</option>`).join('');
    qSeg.addEventListener('change', () => {
      const v = qSeg.value; qSeg.classList.toggle('has', !!v); qMsg.className = 'hero-note';
      if (!v) { qMsg.innerHTML = q0; return; }
      const n = Object.values(d.matica[v] || {}).reduce((a, b) => a + b, 0), base = Math.min(n, 3500);
      qMsg.innerHTML = `<b>${fmt(n)} firiem</b> z odvetvia ${v.toLowerCase()} · prvá kampaň ≈ <b>${Math.max(1, Math.round(base * .003 * .2))} – ${Math.max(2, Math.round(base * .012 * .2))} nových zákaziek</b>`;
    });
    // výber cieľovej skupiny
    const selS = new Set(['Výroba a priemysel']), selK = new Set();
    const KR = { 'Bratislavský': 'Bratislava', 'Trnavský': 'Trnava', 'Trenčiansky': 'Trenčín', 'Nitriansky': 'Nitra', 'Žilinský': 'Žilina', 'Banskobystrický': 'Banská Bystrica', 'Prešovský': 'Prešov', 'Košický': 'Košice' };
    const kr = d.kraje, sum = (s, ks) => (ks.size ? [...ks] : kr).reduce((a, k) => a + ((d.matica[s] || {})[k] || 0), 0);
    const boxS = $('#audSeg'), boxK = $('#audKraj');
    const draw = () => {
      boxS.innerHTML = segs.map(s => `<button type="button" class="chip${selS.has(s) ? ' on' : ''}" data-s="${s}">${s}<small>${fmt(sum(s, selK))}</small></button>`).join('');
      boxK.innerHTML = `<button type="button" class="chip${selK.size ? '' : ' on'}" data-k="">Celé Slovensko</button>` + kr.map(k => `<button type="button" class="chip${selK.has(k) ? ' on' : ''}" data-k="${k}">${KR[k] || k}</button>`).join('');
      const n = [...selS].reduce((a, s) => a + sum(s, selK), 0);
      tween($('#audN'), n, 700);
      $('#audL').textContent = `${fmt(Math.max(1, n * .003))} – ${fmt(Math.max(2, n * .012))}`;
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
    const pipe = $('.pipe'), li = $$('li', pipe), v = $('#dealV');
    v.textContent = '0 €';
    li.forEach((l, k) => setTimeout(() => { l.classList.add('on'); pipe.style.setProperty('--pp', k / 3); if (k === 3) tween(v, 4800, 1000, fmt, ' €'); }, reduce ? 0 : 300 + k * 550));
  }, .5);

  // ===== počítadlá =====
  $$('[data-count]').forEach(el => once(el, () => {
    const to = parseFloat(el.dataset.count), suf = el.dataset.suf || '', dec = el.dataset.count.includes('.');
    tween(el, to, 1300, v => dec ? v.toFixed(1).replace('.', ',') : fmt(v), suf);
  }, .6));

  // úvodný formulár
  const qf = $('#quickForm');
  qf.addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(qf));
    if (!f.ponuka || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email || '')) { qMsg.className = 'hero-note err'; qMsg.textContent = 'Napíšte, čo predávate, a platný e-mail.'; return; }
    const btn = $('button', qf), bt = btn.innerHTML; btn.disabled = true; btn.textContent = 'Odosielam…';
    try {
      await post({ ...f, segmenty: f.segment ? [f.segment] : [], balik: 'neviem', zdroj: 'hero:' + src() });
      qf.reset(); qSeg.classList.remove('has'); qMsg.className = 'hero-note ok'; qMsg.textContent = 'Ďakujeme! Do 2 pracovných dní vám pošleme plán nových zákaziek.';
    } catch (err) { qMsg.className = 'hero-note err'; qMsg.textContent = errText(err); }
    finally { btn.disabled = false; btn.innerHTML = bt; }
  });

  // kalkulačka ceny a zákaziek
  const range = $('#cfgRange'), val = $('#roiVal'), fPocet = $('#fPocet'), tiers = $$('.tier');
  let opt = ''; for (let n = 1000; n <= 20000; n += 500) opt += `<option value="${n}">${fmt(n)} + 100 zadarmo · ${fmt(cena(n))} €</option>`;
  fPocet.innerHTML = opt + '<option value="neviem">Ešte neviem</option>';
  const calc = () => {
    const n = +range.value, p = cena(n), v = Math.max(0, +val.value || 0);
    range.style.setProperty('--p', ((n - range.min) / (range.max - range.min) * 100) + '%');
    const lo = Math.max(1, Math.round(n * .003)), hi = Math.max(2, Math.round(n * .012));
    const dl = Math.max(1, Math.round(lo * .2)), dh = Math.max(1, Math.round(hi * .2));
    $('#cfgN').textContent = fmt(n); $('#cfgTot').textContent = fmt(n + 100); $('#cfgPrice').textContent = fmt(p);
    const pr = $('.c-price'); pr.classList.add('bump'); clearTimeout(calc.t); calc.t = setTimeout(() => pr.classList.remove('bump'), 160);
    $('#cfgPer').textContent = (p / n).toLocaleString('sk-SK', { maximumFractionDigits: 3 }) + ' €';
    $('#cfgLeads').textContent = `${fmt(lo)} – ${fmt(hi)}`;
    $('#cfgDeals').textContent = dl === dh ? fmt(dl) : `${fmt(dl)} – ${fmt(dh)}`;
    $('#cfgRev').textContent = v ? `${fmt(dl * v)} – ${fmt(dh * v)} €` : '–';
    $('#cfgX').innerHTML = v ? `Kampaň za ${fmt(p)}&nbsp;€ sa vám vráti <b>${(dl * v / p).toFixed(1).replace('.', ',')}× až ${Math.round(dh * v / p)}×</b>.` : '';
    $$('.c-quick [data-n]').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
    tiers.forEach((t, k) => { const od = +t.dataset.od, nx = tiers[k + 1] ? +tiers[k + 1].dataset.od : Infinity; t.classList.toggle('used', n > od); t.classList.toggle('on', n > od && n <= nx); });
    fPocet.value = n;
  };
  range.addEventListener('input', calc); val.addEventListener('input', calc);
  $$('.c-quick [data-n]').forEach(b => b.addEventListener('click', () => { range.value = b.dataset.n; calc(); }));
  calc();

  // záverečný formulár
  const form = $('#briefForm'), msg = $('#formMsg');
  form.addEventListener('submit', async e => {
    e.preventDefault(); msg.className = 'form-msg'; msg.textContent = '';
    const f = Object.fromEntries(new FormData(form));
    if (!f.meno || !f.email || !f.ponuka) { msg.className = 'form-msg err'; msg.textContent = 'Vyplňte meno, e-mail a čo predávate.'; return; }
    if (!form.suhlas.checked) { msg.className = 'form-msg err'; msg.textContent = 'Potvrďte, prosím, súhlas so spracovaním údajov.'; return; }
    const btn = $('button[type=submit]', form), bt = btn.innerHTML; btn.disabled = true; btn.textContent = 'Odosielam…';
    try {
      await post({ ...f, zdroj: src() });
      form.reset(); calc();
      msg.className = 'form-msg ok'; msg.textContent = 'Ďakujeme! Do 2 pracovných dní vám pošleme plán nových zákaziek.';
    } catch (err) { msg.className = 'form-msg err'; msg.textContent = errText(err); }
    finally { btn.disabled = false; btn.innerHTML = bt; }
  });

  // mobilné lepkavé tlačidlo (mimo úvodu a formulára)
  const mcta = $('#mcta'); let inHero = true, inForm = false;
  const upd = () => mcta.classList.toggle('on', !inHero && !inForm);
  new IntersectionObserver(es => { inHero = es[0].isIntersecting; upd(); }).observe($('.hero'));
  new IntersectionObserver(es => { inForm = es[0].isIntersecting; upd(); }).observe($('#zadanie'));
})();
