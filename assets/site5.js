// Mailito v40 – web služby na mieru (CZ/SK): navigácia, odhalenie, jazyk, osobný odkaz z e-mailu, dopyt, ukážka portálu.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const API = 'https://mailito-api.webhunter.workers.dev';
  const BASE = new URL('../', (document.currentScript || {}).src || location.href);
  const SK = document.documentElement.lang === 'sk';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qp = new URLSearchParams(location.search);
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const T = SK ? {
    posielam: 'Odosielam…', chyba: 'Nepodarilo sa odoslať. Skúste to znova alebo napíšte na info.webhunter@email.cz.',
    meno: 'Napíšte, prosím, svoje meno.', email: 'Zadajte platný e-mail.', ponuka: 'Napíšte, čo predávate.', zeme: 'Vyberte, kde chcete oslovovať.',
    ahoj: f => `Dobrý deň, <b>${f}</b>`,
  } : {
    posielam: 'Odesílám…', chyba: 'Nepodařilo se odeslat. Zkuste to znovu nebo napište na info.webhunter@email.cz.',
    meno: 'Napište prosím své jméno.', email: 'Zadejte platný e-mail.', ponuka: 'Napište, co prodáváte.', zeme: 'Vyberte, kde chcete oslovovat.',
    ahoj: f => `Dobrý den, <b>${f}</b>`,
  };

  // ===== jazyk =====
  // návštevník zo SK (alebo z našej SK kampane) na českej úvodnej stránke → slovenská verzia; voľbu si pamätáme
  $$('[data-lang]').forEach(a => a.addEventListener('click', () => store.set('mailito_jazyk', a.dataset.lang)));
  if (!SK && location.pathname.replace(BASE.pathname, '') === '' && !store.get('mailito_jazyk')) {
    const sk = (navigator.languages || [navigator.language || '']).some(l => /^sk\b/i.test(l)) || (qp.get('z') === 'mail' && qp.get('j') !== 'cs');
    if (sk) { location.replace(new URL('sk/', BASE).pathname + location.search + location.hash); return; }
  }

  // ===== navigácia =====
  const nav = $('#nav');
  if (nav) { const on = () => nav.classList.toggle('scrolled', scrollY > 10); addEventListener('scroll', on, { passive: true }); on(); }
  const burger = $('#burger'), menu = $('#menu');
  if (burger && menu) {
    const zavri = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = ''; };
    burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; });
    $$('a', menu).forEach(a => a.addEventListener('click', zavri));
  }

  // ===== jemné odhalenie =====
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.sec-head, .chs-h, .ch-t, .ch-v, .steps li, .ctrl-h, .ctrl-g li, .vc, .faq-list, .inq-l, .inq-f').forEach((el, i) => {
    el.classList.add('rv');
    if (el.matches('.steps li, .ctrl-g li, .vc')) el.style.transitionDelay = (i % 5) * 70 + 'ms';
    io.observe(el);
  });

  // ===== návštevník z nášho e-mailu =====
  const fm = $('#fromMail');
  if (fm && (qp.get('z') === 'mail' || /mail/i.test(qp.get('utm_medium') || ''))) {
    let zav = false; try { zav = sessionStorage.getItem('fmX') === '1'; } catch {}
    if (!zav) { fm.hidden = false; $('#fromMailX').addEventListener('click', () => { fm.hidden = true; try { sessionStorage.setItem('fmX', '1'); } catch {} }); }
  }
  // osobný odkaz ?p=base64url("firma|kraj|segment|web") → pozdrav a predvyplnený dopyt
  let ja = null;
  try {
    const p = qp.get('p');
    if (p) {
      const raw = decodeURIComponent(escape(atob(p.replace(/-/g, '+').replace(/_/g, '/'))));
      const [firma, kraj, segment, web] = raw.split('|');
      ja = { firma: (firma || '').trim(), kraj, segment, web: (web || '').trim() };
      sessionStorage.setItem('mailito_ja', JSON.stringify(ja));
    } else ja = JSON.parse(sessionStorage.getItem('mailito_ja') || 'null');
  } catch {}
  const pill = $('#heroPill');
  if (ja?.firma && pill) {
    const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    pill.innerHTML = `<span class="pill-new">${SK ? 'Pre vás' : 'Pro vás'}</span>${T.ahoj(esc(ja.firma.replace(/,?\s*(s\.\s?r\.\s?o\.|a\.\s?s\.|spol\..*)$/i, '')))}<svg><use href="#i-arr"/></svg>`;
  }

  // ===== plávajúca výzva (mobil) =====
  const mcta = $('#mcta'), hero = $('.hero'), inq = $('#poptavka');
  if (mcta) {
    let vHero = !!hero, vInq = false;
    const upd = () => mcta.classList.toggle('on', !vHero && !vInq);
    if (hero) new IntersectionObserver(es => { vHero = es[0].isIntersecting; upd(); }).observe(hero);
    if (inq) new IntersectionObserver(es => { vInq = es[0].isIntersecting; upd(); }).observe(inq);
    upd();
  }

  // ===== dopyt =====
  const f = $('#inqForm');
  if (f) {
    if (ja) { if (ja.firma && !f.firma.value) f.firma.value = ja.firma; if (ja.web && !f.web.value) f.web.value = ja.web; }
    // rýchly formulár v úvode → prenesie text do dopytu
    const q = $('#quickForm');
    if (q) q.addEventListener('submit', e => {
      e.preventDefault();
      const v = q.ponuka.value.trim();
      if (v && !f.ponuka.value.trim()) f.ponuka.value = v;
      inq.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(() => (f.meno.value ? (f.ponuka.value ? f.email : f.ponuka) : f.meno).focus({ preventScroll: true }), reduce ? 0 : 700);
    });
    const msg = $('#inqMsg');
    const zly = (el, t) => { el.classList.add('bad'); el.focus(); msg.className = 'form-msg err'; msg.textContent = t; return false; };
    f.addEventListener('input', e => e.target.classList.remove('bad'));
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (f.web_url.value) return;
      $$('.bad', f).forEach(x => x.classList.remove('bad'));
      const zeme = $$('[name=zeme]:checked', f).map(x => x.value);
      if (!f.meno.value.trim()) return zly(f.meno, T.meno);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())) return zly(f.email, T.email);
      if (!f.ponuka.value.trim()) return zly(f.ponuka, T.ponuka);
      if (!zeme.length) { msg.className = 'form-msg err'; msg.textContent = T.zeme; return; }
      const btn = $('button[type=submit]', f); btn.disabled = true;
      msg.className = 'form-msg'; msg.textContent = T.posielam;
      const d = {
        meno: f.meno.value.trim(), firma: f.firma.value.trim(), email: f.email.value.trim(), web: f.web.value.trim(),
        ponuka: f.ponuka.value.trim(), zakaznik: f.zakaznik.value.trim(), poznamka: f.poznamka.value.trim(),
        zeme, objem: ($('[name=objem]:checked', f) || {}).value || '', jazyk: SK ? 'sk' : 'cs',
        zdroj: [location.pathname, qp.get('z') && 'z=' + qp.get('z'), qp.get('utm_source') && 'utm=' + qp.get('utm_source'), ja?.firma && 'odkaz:' + ja.firma,
          document.referrer && !document.referrer.includes(location.host) && 'ref=' + new URL(document.referrer).hostname].filter(Boolean).join(' · ').slice(0, 200),
      };
      try {
        const r = await fetch(API + '/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
        const j = await r.json().catch(() => ({}));
        if (!j.ok) throw new Error(j.chyba || T.chyba);
        window.mailitoEv?.('poptavka_odeslana');
        $('#inqMail').textContent = d.email;
        f.hidden = true; $('#inqDone').hidden = false;
        $('#inqDone').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      } catch (err) {
        msg.className = 'form-msg err'; msg.textContent = err.message && err.message !== 'Failed to fetch' ? err.message : T.chyba;
        btn.disabled = false;
      }
    });
  }

  // ===== ukážka portálu: prichádzajú noví záujemcovia =====
  const rows = $('#aRows'), det = $('.a-det');
  if (rows && !reduce) {
    const NOVI = SK ? [
      ['KO', 30, 'Kartonáž Orava s.r.o.', 'Dolný Kubín', 'Žilinský kraj', 'Ponuka správy 25 PC', 'hot', 'Chcú ponuku správy 25 počítačov a zálohovania od decembra.', 'Mgr. Jana Hudecová', 'prevádzková riaditeľka', 'Dobrý deň, aktuálne riešime nového dodávateľa IT. Máme 25 počítačov a server. Pošlite prosím ponuku.', 'j.hudecova'],
      ['MV', 120, 'Mlyny Vráble s.r.o.', 'Vráble', 'Nitriansky kraj', 'Stretnutie vo štvrtok', 'hot', 'Chcú stretnutie vo štvrtok, riešia výpadky siete v hale.', 'Ing. Tomáš Bielik', 'konateľ', 'Dobrý deň, sieť v hale nám vypadáva každý týždeň. Viete prísť vo štvrtok?', 't.bielik'],
      ['AT', 345, 'Autodiely Tatry s.r.o.', 'Poprad', 'Prešovský kraj', 'Porovnať ponuku od 1. 1.', 'warm', 'Zmluva so súčasným dodávateľom im končí v decembri, chcú porovnať.', 'Marek Gajdoš', 'vedúci prevádzky', 'Dobrý deň, zmluvu máme do decembra. Pošlite ponuku, radi porovnáme.', 'm.gajdos'],
    ] : [
      ['KO', 30, 'Kartonáž Opava s.r.o.', 'Opava', 'Moravskoslezský kraj', 'Nabídka správy 25 PC', 'hot', 'Chtějí nabídku správy 25 počítačů a zálohování od prosince.', 'Mgr. Jana Hudcová', 'provozní ředitelka', 'Dobrý den, aktuálně řešíme nového dodavatele IT. Máme 25 počítačů a server. Pošlete prosím nabídku.', 'j.hudcova'],
      ['MV', 120, 'Mlýny Vyškov s.r.o.', 'Vyškov', 'Jihomoravský kraj', 'Schůzka ve čtvrtek', 'hot', 'Chtějí schůzku ve čtvrtek, řeší výpadky sítě v hale.', 'Ing. Tomáš Bílek', 'jednatel', 'Dobrý den, síť v hale nám vypadává každý týden. Můžete přijet ve čtvrtek?', 't.bilek'],
      ['AT', 345, 'Autodíly Třinec s.r.o.', 'Třinec', 'Moravskoslezský kraj', 'Porovnat nabídku od 1. 1.', 'warm', 'Smlouva se současným dodavatelem jim končí v prosinci, chtějí porovnat.', 'Marek Gajdoš', 'vedoucí provozu', 'Dobrý den, smlouvu máme do prosince. Pošlete nabídku, rádi porovnáme.', 'm.gajdos'],
    ];
    const L = SK ? { hot: 'Horúci', warm: 'Teplý', nov: 'Nový', prave: 'Odpoveď · práve teraz', tld: '.sk' } : { hot: 'Horký', warm: 'Teplý', nov: 'Nový', prave: 'Odpověď · právě teď', tld: '.cz' };
    const fmt = n => n.toLocaleString(SK ? 'sk-SK' : 'cs-CZ').replace(/\s/g, ' ');
    let ni = 0, cZ = 74, cN = 9, cO = 3214, vid = false;
    const pridaj = () => {
      const [ini, h, firma, mesto, kraj, co, t, ai, osoba, rola, txt, mail] = NOVI[ni++ % NOVI.length];
      $$('.tr', rows).forEach(r => { r.classList.remove('sel', 'new'); if ($('b', r)?.textContent === firma) r.remove(); });
      const r = document.createElement('div'); r.className = 'tr sel new';
      r.innerHTML = `<span class="t-firm"><i class="av" style="--h:${h}">${ini}</i><b>${firma}</b><small>${mesto}</small></span><span class="t-what">${co}</span><span><em class="tag ${t === 'hot' ? 't-hot' : 't-warm'}">${L[t]}</em></span><span><em class="st st-new">${L.nov}</em></span><span class="r t-mut">–</span>`;
      rows.prepend(r); while (rows.children.length > 7) rows.lastElementChild.remove();
      cZ++; cN++; cO += 8 + (Math.random() * 14 | 0);
      $('#aZ').textContent = $('#aAll').textContent = cZ; $('#aNew').textContent = $('#aBadge').textContent = cN;
      $('#aO').textContent = $('#aO2').textContent = fmt(cO);
      if (det && getComputedStyle(det).display !== 'none') {
        det.classList.add('swap');
        setTimeout(() => {
          $('.d-head', det).innerHTML = `<i class="av av-lg" style="--h:${h}">${ini}</i><div><p class="d-firm">${firma}</p><p class="d-meta">${mesto} · ${kraj}</p></div>`;
          $('.d-ai p:last-child', det).textContent = ai;
          $('.d-mail .d-l', det).textContent = L.prave;
          $('.d-from', det).innerHTML = `<b>${osoba}</b> · ${rola}`;
          $('.d-txt', det).textContent = txt;
          $('.d-props div:nth-child(2) dd', det).textContent = mail + '@••••••' + L.tld;
          det.classList.remove('swap');
        }, 350);
      }
    };
    new IntersectionObserver(es => { vid = es[0].isIntersecting; }).observe($('.win'));
    setInterval(() => { if (vid && !document.hidden) pridaj(); }, 5200);
  }
})();
