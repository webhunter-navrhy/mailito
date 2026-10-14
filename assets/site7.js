// Mailito v7 (14. 10. 2026) – „old money × futuristic“: atmosféra (prach ve světle), jazyk, navigace, odhalení, osobní odkaz z e-mailu, poptávka, živý zájemce.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const API = 'https://mailito-api.webhunter.workers.dev';
  const BASE = new URL('../', (document.currentScript || {}).src || location.href);
  const SK = document.documentElement.lang === 'sk';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qp = new URLSearchParams(location.search);
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = SK ? {
    posielam: 'Odosielam…', chyba: 'Nepodarilo sa odoslať. Skúste to znova alebo napíšte na info.webhunter@email.cz.',
    meno: 'Napíšte, prosím, svoje meno.', email: 'Zadajte platný e-mail.', ponuka: 'Napíšte, čo predávate.',
    ahoj: f => `${f}, nájdeme firmy, ktoré od vás môžu kúpiť, a odovzdáme vám len záujemcov.`,
    novy: 'Nový záujemca',
    toasty: [['Stavby Trnava s.r.o.', '„Pošlite ponuku, riešime to ešte tento mesiac.“'], ['Logistika Žilina a.s.', '„Môžeme sa stretnúť v utorok?“'], ['Plasty Nitra s.r.o.', '„Áno, pošlite cenník.“']],
  } : {
    posielam: 'Odesílám…', chyba: 'Nepodařilo se odeslat. Zkuste to znovu nebo napište na info.webhunter@email.cz.',
    meno: 'Napište prosím své jméno.', email: 'Zadejte platný e-mail.', ponuka: 'Napište, co prodáváte.',
    ahoj: f => `${f}, najdeme firmy, které od vás můžou koupit, a předáme vám jen zájemce.`,
    novy: 'Nový zájemce',
    toasty: [['Stavby Brno s.r.o.', '„Pošlete prosím nabídku, řešíme to ještě tento měsíc.“'], ['Logistika Kolín a.s.', '„Můžeme se potkat v úterý?“'], ['Plasty Zlín s.r.o.', '„Ano, pošlete ceník.“']],
  };

  // ===== jazyk =====
  $$('[data-lang]').forEach(a => a.addEventListener('click', () => store.set('mailito_jazyk', a.dataset.lang)));
  if (!SK && location.pathname.replace(BASE.pathname, '') === '' && !store.get('mailito_jazyk')) {
    const sk = (navigator.languages || [navigator.language || '']).some(l => /^sk\b/i.test(l)) || (qp.get('z') === 'mail' && qp.get('j') !== 'cs');
    if (sk) { location.replace(new URL('sk/', BASE).pathname + location.search + location.hash); return; }
  }

  // ===== navigace =====
  const nav = $('#nav');
  if (nav) { const on = () => nav.classList.toggle('scrolled', scrollY > 20); addEventListener('scroll', on, { passive: true }); on(); }
  const burger = $('#burger'), menu = $('#menu');
  if (burger && menu) {
    const zavri = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = ''; };
    burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; });
    $$('a', menu).forEach(a => a.addEventListener('click', zavri));
  }

  // ===== odhalení =====
  const rv = $$('.rv');
  if (reduce || !('IntersectionObserver' in window)) rv.forEach(e => e.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
    rv.forEach(el => {
      const sib = [...el.parentElement.children].filter(x => x.classList.contains('rv')).indexOf(el);
      el.style.transitionDelay = Math.min(sib, 5) * 110 + 'ms';
      io.observe(el);
    });
  }

  // ===== atmosféra: prach ve světle =====
  const cv = $('#dust');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let W, H, P = [];
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const init = () => {
      W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
      const n = Math.round(Math.min(90, innerWidth / 16));
      P = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.3 + .3) * dpr, v: (Math.random() * .25 + .05) * dpr, a: Math.random() * .5 + .15, t: Math.random() * 6.28 }));
    };
    init(); addEventListener('resize', init);
    const tick = () => {
      if (!document.hidden) {
        ctx.clearRect(0, 0, W, H);
        for (const p of P) {
          p.y -= p.v; p.t += .01; p.x += Math.sin(p.t) * .25 * dpr;
          if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
          ctx.fillStyle = `rgba(226,200,146,${p.a * (.6 + .4 * Math.sin(p.t * 2))})`; ctx.fill();
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ===== živý zájemce v úvodu =====
  const toast = $('#toast');
  if (toast && !reduce) {
    let i = 0;
    const ukaz = () => {
      const [f, t] = T.toasty[i++ % T.toasty.length];
      toast.innerHTML = `<small><i></i>${T.novy}</small><b>${f}</b><p>${t}</p>`;
      toast.classList.add('on');
      setTimeout(() => toast.classList.remove('on'), 4200);
    };
    setTimeout(() => { ukaz(); setInterval(ukaz, 6500); }, 2200);
  }

  // ===== návštěvník z našeho e-mailu =====
  const fm = $('#fromMail');
  if (fm && (qp.get('z') === 'mail' || /mail/i.test(qp.get('utm_medium') || ''))) {
    let zav = false; try { zav = sessionStorage.getItem('fmX') === '1'; } catch {}
    if (!zav) { fm.hidden = false; $('#fromMailX').addEventListener('click', () => { fm.hidden = true; try { sessionStorage.setItem('fmX', '1'); } catch {} }); }
  }
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
  const sub = $('#heroSub');
  if (ja?.firma && sub) sub.innerHTML = T.ahoj(`<b style="color:var(--brass2);font-weight:400">${esc(ja.firma.replace(/,?\s*(s\.\s?r\.\s?o\.|a\.\s?s\.|spol\..*)$/i, ''))}</b>`);

  // ===== plovoucí výzva (mobil) =====
  const mcta = $('#mcta'), hero = $('.hero'), inq = $('#poptavka');
  if (mcta) {
    let vHero = !!hero, vInq = false;
    const upd = () => mcta.classList.toggle('on', !vHero && !vInq);
    if (hero) new IntersectionObserver(es => { vHero = es[0].isIntersecting; upd(); }).observe(hero);
    if (inq) new IntersectionObserver(es => { vInq = es[0].isIntersecting; upd(); }).observe(inq);
    upd();
  }

  // ===== poptávka =====
  const f = $('#inqForm');
  if (f) {
    $$('[data-balik]').forEach(a => a.addEventListener('click', () => {
      const r = $$('[name=balik]', f).find(x => x.value.startsWith(a.dataset.balik));
      if (r) r.checked = true;
    }));
    const msg = $('#inqMsg');
    const zly = (el, t) => { el.classList.add('bad'); el.focus(); msg.className = 'form-msg err'; msg.textContent = t; return false; };
    f.addEventListener('input', e => e.target.classList.remove('bad'));
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (f.web_url.value) return;
      if (!f.meno.value.trim()) return zly(f.meno, T.meno);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())) return zly(f.email, T.email);
      if (!f.ponuka.value.trim()) return zly(f.ponuka, T.ponuka);
      const btn = $('button[type=submit]', f); btn.disabled = true;
      msg.className = 'form-msg'; msg.textContent = T.posielam;
      const d = {
        meno: f.meno.value.trim(), firma: ja?.firma || '', email: f.email.value.trim(), web: ja?.web || '',
        ponuka: f.ponuka.value.trim(), zeme: [f.zeme.value], objem: ($('[name=balik]:checked', f) || {}).value || '', jazyk: SK ? 'sk' : 'cs',
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
      } catch (err) {
        msg.className = 'form-msg err'; msg.textContent = err.message && err.message !== 'Failed to fetch' ? err.message : T.chyba;
        btn.disabled = false;
      }
    });
  }
})();
