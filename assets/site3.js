(() => {
  const API = 'https://mailito-api.webhunter.workers.dev';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('sk-SK').replace(/[   ]/g, ' ');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // cenník – rovnaký výpočet je v portal.js a engine/sync.py
  const cena = n => { let p = 0, od = 0; for (const [d, c] of [[1000, .149], [3000, .10], [10000, .08], [Infinity, .06]]) { if (n > od) p += (Math.min(n, d) - od) * c; od = d; } return Math.round(p / 10) * 10 - 1; };
  const src = () => { const q = new URLSearchParams(location.search); return q.get('utm_source') || q.get('k') || document.referrer || 'web'; };
  const post = async body => {
    const r = await fetch(API + '/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json(); if (!j.ok) throw new Error(j.chyba || 'Chyba'); return j;
  };
  const errText = e => e.message && e.message !== 'Failed to fetch' ? e.message : 'Nepodarilo sa odoslať. Napíšte nám na info@mailito.eu.';

  // navigácia
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('#burger'), menu = $('#menu');
  const closeMenu = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = ''; };
  burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; });
  $$('a', menu).forEach(a => a.addEventListener('click', closeMenu));

  // odhalenie pri scrollovaní
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => io.observe(el));

  // živý prúd záujemcov v ukážke portálu (ilustračné firmy)
  const LEADY = [
    ['Kovo Záhorie a.s.', 'Senica', 'Hľadáme dodávateľa od januára, pošlite ponuku.'],
    ['Plasty Nitra s.r.o.', 'Nitra', 'Pošlite cenník, máme dve haly po 1 500 m².'],
    ['Drevotech Považie s.r.o.', 'Púchov', 'Zavolajte v stredu po 10:00.'],
    ['Logistika Váh s.r.o.', 'Hlohovec', 'Pošlite cenu za 2 000 m² mesačne.'],
    ['Agro Podunajsko s.r.o.', 'Galanta', 'Zmluva nám končí v januári, porovnáme ponuky.'],
  ];
  const feed = $('#heroFeed');
  let i = 0, z = 86, o = 9874;
  const addLead = first => {
    const [f, m, t] = LEADY[i++ % LEADY.length];
    const li = document.createElement('li'); li.className = 'fi';
    li.innerHTML = `<span class="fi-av">${f.split(' ').map(w => w[0]).slice(0, 2).join('')}</span><p class="fi-h">${f}<small>${first ? i * 7 + ' min' : 'teraz'}</small></p><p class="fi-t">${m} · ${t}</p>`;
    feed.prepend(li);
    while (feed.children.length > 4) feed.lastElementChild.remove();
    if (!first) { z++; o += 9 + (Math.random() * 12 | 0); $('#aZ').textContent = z; $('#aO').textContent = fmt(o); }
  };
  for (let k = 0; k < 4; k++) addLead(true);
  if (!reduce) setInterval(() => { if (!document.hidden) addLead(false); }, 4200);

  // ===== v11: kroky – postup obálky a rozsvecovanie =====
  const stepsEl = $('#steps'), stepEls = $$('.step', stepsEl);
  const mailEl = $('#typeMail'); let typed = false;
  const typeMail = () => {
    if (typed || reduce) return; typed = true;
    const t = mailEl.dataset.t; let k = 0;
    const st = () => { k += 2; mailEl.innerHTML = t.slice(0, k) + (k < t.length ? '<span class="caret"></span>' : ''); if (k < t.length) setTimeout(st, 22); };
    mailEl.innerHTML = '<span class="caret"></span>'; setTimeout(st, 300);
  };
  const stepTick = () => {
    const r = stepsEl.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * .78 - r.top) / (r.height * .9)));
    stepsEl.style.setProperty('--p', p.toFixed(3));
    stepEls.forEach((el, k) => el.classList.toggle('on', p >= [0, .42, .85][k]));
    if (p >= .42) typeMail();
  };
  addEventListener('scroll', () => requestAnimationFrame(stepTick), { passive: true }); stepTick();

  // ===== v11: počítadlá vo výsledkoch =====
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.count), suf = el.dataset.suf || '', dec = String(el.dataset.count).includes('.');
    if (reduce) return;
    const t0 = performance.now();
    const st = now => { const q = Math.min(1, (now - t0) / 1400), v = to * (1 - Math.pow(1 - q, 3));
      el.innerHTML = (dec ? v.toFixed(1).replace('.', ',') : Math.round(v)) + suf; if (q < 1) requestAnimationFrame(st); };
    requestAnimationFrame(st);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // úvodný formulár: odvetvie → odhad, odoslanie
  const qSeg = $('#qSeg'), qMsg = $('#quickMsg'), q0 = qMsg.innerHTML;
  fetch('data/trh.json?v=6a3b9c45').then(r => r.json()).then(d => {
    qSeg.innerHTML = '<option value="">Vyberte odvetvie</option>' + d.segmenty.filter(x => x !== 'Ostatné').map(x => `<option>${x}</option>`).join('');
    qSeg.addEventListener('change', () => {
      const v = qSeg.value; qMsg.className = 'hero-note';
      if (!v) { qMsg.innerHTML = q0; return; }
      const n = Object.values(d.matica[v] || {}).reduce((a, b) => a + b, 0), base = Math.min(n, 3500);
      qMsg.innerHTML = `<b>${fmt(n)} firiem</b> z odvetvia ${v.toLowerCase()} na Slovensku · prvá kampaň ≈ <b>${Math.max(1, Math.round(base * .003 * .2))}–${Math.max(2, Math.round(base * .012 * .2))} nových zákaziek</b>`;
    });
  }).catch(() => {});
  const qf = $('#quickForm');
  qf.addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(qf));
    if (!f.ponuka || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email || '')) { qMsg.className = 'hero-note err'; qMsg.textContent = 'Napíšte, čo predávate, a platný e-mail.'; return; }
    const btn = $('button', qf); btn.disabled = true; btn.textContent = 'Odosielam…';
    try {
      await post({ ...f, segmenty: f.segment ? [f.segment] : [], balik: 'neviem', zdroj: 'hero:' + src() });
      qf.reset(); qMsg.className = 'hero-note ok'; qMsg.textContent = 'Ďakujeme! Do 2 pracovných dní vám pošleme plán nových zákaziek.';
    } catch (err) { qMsg.className = 'hero-note err'; qMsg.textContent = errText(err); }
    finally { btn.disabled = false; btn.textContent = 'Chcem zákazky'; }
  });

  // kalkulačka ceny a zákaziek
  const range = $('#cfgRange'), val = $('#roiVal'), fPocet = $('#fPocet');
  let opt = ''; for (let n = 1000; n <= 20000; n += 500) opt += `<option value="${n}">${fmt(n)} firiem · ${fmt(cena(n))} €</option>`;
  fPocet.innerHTML = opt + '<option value="neviem">Ešte neviem</option>';
  const calc = () => {
    const n = +range.value, p = cena(n), v = Math.max(0, +val.value || 0);
    range.style.setProperty('--p', ((n - range.min) / (range.max - range.min) * 100) + '%');
    const lo = Math.max(1, Math.round(n * .003)), hi = Math.max(2, Math.round(n * .012));
    const dl = Math.max(1, Math.round(lo * .2)), dh = Math.max(1, Math.round(hi * .2));
    $('#cfgN').textContent = fmt(n); $('#cfgPrice').textContent = fmt(p);
    const pr = $('.c-price'); pr.classList.add('bump'); clearTimeout(calc.t); calc.t = setTimeout(() => pr.classList.remove('bump'), 160);
    $('#cfgPer').textContent = (p / n).toLocaleString('sk-SK', { maximumFractionDigits: 3 }) + ' €';
    $('#cfgLeads').textContent = `${fmt(lo)} – ${fmt(hi)}`;
    $('#cfgDeals').textContent = dl === dh ? fmt(dl) : `${fmt(dl)} – ${fmt(dh)}`;
    $('#cfgRev').textContent = v ? `${fmt(dl * v)} – ${fmt(dh * v)} €` : '–';
    $('#cfgX').innerHTML = v ? `Kampaň za ${fmt(p)} € sa vám vráti <b>${(dl * v / p).toFixed(1).replace('.', ',')}× až ${Math.round(dh * v / p)}×</b>.` : '';
    $$('.c-quick [data-n]').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
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
    const btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Odosielam…';
    try {
      await post({ ...f, zdroj: src() });
      form.reset(); calc();
      msg.className = 'form-msg ok'; msg.textContent = 'Ďakujeme! Do 2 pracovných dní vám pošleme plán nových zákaziek.';
    } catch (err) { msg.className = 'form-msg err'; msg.textContent = errText(err); }
    finally { btn.disabled = false; btn.textContent = 'Chcem plán zadarmo'; }
  });

  // mobilné lepkavé tlačidlo (mimo úvodu a formulára)
  const mcta = $('#mcta'); let inHero = true, inForm = false;
  const upd = () => mcta.classList.toggle('on', !inHero && !inForm);
  new IntersectionObserver(es => { inHero = es[0].isIntersecting; upd(); }).observe($('.hero'));
  new IntersectionObserver(es => { inForm = es[0].isIntersecting; upd(); }).observe($('#zadanie'));
})();
