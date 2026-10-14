// Mailito v6 (14. 10. 2026) – B2B outreach na míru, balíčky podle počtu e-mailů: jazyk, navigace, odhalení, osobní odkaz z e-mailu, poptávka, živé ukázky.
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
  const fmt = n => n.toLocaleString(SK ? 'sk-SK' : 'cs-CZ').replace(/\s/g, ' ');
  const T = SK ? {
    posielam: 'Odosielam…', chyba: 'Nepodarilo sa odoslať. Skúste to znova alebo napíšte na info.webhunter@email.cz.',
    meno: 'Napíšte, prosím, svoje meno.', email: 'Zadajte platný e-mail.', ponuka: 'Napíšte, čo predávate.', zeme: 'Vyberte, kde chcete oslovovať.',
    pre: 'Pre vás', ahoj: f => `Dobrý deň, <b>${f}</b> · mapa trhu zadarmo`,
  } : {
    posielam: 'Odesílám…', chyba: 'Nepodařilo se odeslat. Zkuste to znovu nebo napište na info.webhunter@email.cz.',
    meno: 'Napište prosím své jméno.', email: 'Zadejte platný e-mail.', ponuka: 'Napište, co prodáváte.', zeme: 'Vyberte, kde chcete oslovovat.',
    pre: 'Pro vás', ahoj: f => `Dobrý den, <b>${f}</b> · mapa trhu zdarma`,
  };

  // ===== jazyk: návštěvník ze SK (nebo z naší SK kampaně) na české úvodní stránce → slovenská verze =====
  $$('[data-lang]').forEach(a => a.addEventListener('click', () => store.set('mailito_jazyk', a.dataset.lang)));
  if (!SK && location.pathname.replace(BASE.pathname, '') === '' && !store.get('mailito_jazyk')) {
    const sk = (navigator.languages || [navigator.language || '']).some(l => /^sk\b/i.test(l)) || (qp.get('z') === 'mail' && qp.get('j') !== 'cs');
    if (sk) { location.replace(new URL('sk/', BASE).pathname + location.search + location.hash); return; }
  }

  // ===== navigace =====
  const nav = $('#nav');
  if (nav) { const on = () => nav.classList.toggle('scrolled', scrollY > 10); addEventListener('scroll', on, { passive: true }); on(); }
  const burger = $('#burger'), menu = $('#menu');
  if (burger && menu) {
    const zavri = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); document.body.style.overflow = ''; };
    burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; });
    $$('a', menu).forEach(a => a.addEventListener('click', zavri));
  }

  // ===== jemné odhalení =====
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.sec-h, .way, .tl li, .you > div, .why li, .mailw, .reply, .stk, .pk, .pk-more, .gar, .app, .ctrl-l li, .fit > div, .faq-l, .inq-l, .inq-f, .proof-g > div').forEach(el => {
      el.classList.add('rv');
      const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
      if (el.matches('.way, .tl li, .pk, .ctrl-l li, .why li, .proof-g > div, .you > div, .fit > div')) el.style.transitionDelay = (sib % 4) * 90 + 'ms';
      io.observe(el);
    });
  }

  // ===== návštěvník z našeho e-mailu =====
  const fm = $('#fromMail');
  if (fm && (qp.get('z') === 'mail' || /mail/i.test(qp.get('utm_medium') || ''))) {
    let zav = false; try { zav = sessionStorage.getItem('fmX') === '1'; } catch {}
    if (!zav) { fm.hidden = false; $('#fromMailX').addEventListener('click', () => { fm.hidden = true; try { sessionStorage.setItem('fmX', '1'); } catch {} }); }
  }
  // osobní odkaz ?p=base64url("firma|kraj|segment|web") → pozdrav a předvyplněná poptávka
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
  if (ja?.firma && pill) pill.innerHTML = `<span class="pill-new">${T.pre}</span>${T.ahoj(esc(ja.firma.replace(/,?\s*(s\.\s?r\.\s?o\.|a\.\s?s\.|spol\..*)$/i, '')))}<svg><use href="#i-arr"/></svg>`;

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
    if (ja) { if (ja.firma && !f.firma.value) f.firma.value = ja.firma; if (ja.web && !f.web.value) f.web.value = ja.web; }
    // tlačítko balíčku → předvybere balíček ve formuláři
    $$('[data-balik]').forEach(a => a.addEventListener('click', () => {
      const r = $$('[name=balik]', f).find(x => x.value.startsWith(a.dataset.balik));
      if (r) r.checked = true;
      else if (a.dataset.balik && !f.poznamka.value) f.poznamka.value = (SK ? 'Balíček na mieru: ' : 'Balíček na míru: ');
    }));
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
        zeme, objem: ($('[name=balik]:checked', f) || {}).value || '', jazyk: SK ? 'sk' : 'cs',
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

  // ===== živé ukázky: zájemci přicházejí =====
  const NOVI = SK ? [
    ['ST', 330, 'Stavby Trnava s.r.o.', 'Horúci', 't-hot', '„Pošlite cenovú ponuku, riešime to ešte tento mesiac.“', 'Ponuka do konca mesiaca', 'Trnavský'],
    ['LZ', 95, 'Logistika Žilina a.s.', 'Stretnutie', 't-hot', '„Môžeme sa stretnúť budúci utorok? Máme dva sklady.“', 'Stretnutie v utorok', 'Žilinský'],
    ['PN', 180, 'Plasty Nitra s.r.o.', 'Teplý', 't-warm', '„Teraz máme dodávateľa, ale pošlite cenník na porovnanie.“', 'Cenník na porovnanie', 'Nitriansky'],
    ['EK', 260, 'Elektro Košice s.r.o.', 'Horúci', 't-hot', '„Áno, máme záujem. Kedy by ste vedeli začať?“', 'Chcú začať hneď', 'Košický'],
  ] : [
    ['SB', 330, 'Stavby Brno s.r.o.', 'Horký', 't-hot', '„Pošlete prosím cenovou nabídku, řešíme to ještě tento měsíc.“', 'Nabídka do konce měsíce', 'Jihomoravský'],
    ['LK', 95, 'Logistika Kolín a.s.', 'Schůzka', 't-hot', '„Můžeme se potkat příští úterý? Máme dva sklady.“', 'Schůzka v úterý', 'Středočeský'],
    ['PZ', 180, 'Plasty Zlín s.r.o.', 'Teplý', 't-warm', '„Teď máme dodavatele, ale pošlete ceník pro srovnání.“', 'Ceník pro srovnání', 'Zlínský'],
    ['EO', 260, 'Elektro Ostrava s.r.o.', 'Horký', 't-hot', '„Ano, máme zájem. Kdy byste mohli začít?“', 'Chtějí začít hned', 'Moravskoslezský'],
  ];
  const vidim = el => { let v = false; if (el) new IntersectionObserver(es => { v = es[0].isIntersecting; }).observe(el); return () => v && !document.hidden; };
  const ib = $('#ibList');
  if (ib && !reduce) {
    const vid = vidim($('.inbox')); let i = 0, o = 2418, r = 96, z = 37;
    setInterval(() => {
      if (!vid()) return;
      const [ini, h, firma, tag, cls, txt] = NOVI[i++ % NOVI.length];
      const m = document.createElement('div'); m.className = 'ib-m enter';
      m.innerHTML = `<i class="av" style="--h:${h}">${ini}</i><b>${firma}</b><em class="tag ${cls}">${tag}</em><p>${txt}</p>`;
      ib.prepend(m); while (ib.children.length > 3) ib.lastElementChild.remove();
      o += 40 + (Math.random() * 30 | 0); r += 2; z += 1;
      $('#kO').textContent = fmt(o); $('#kR').textContent = r; $('#kZ').textContent = z;
    }, 4200);
  }
  const rows = $('#aRows');
  if (rows && !reduce) {
    const vid = vidim($('.app')); let i = 1, o = 5580, z = 74, c = 12;
    setInterval(() => {
      if (!vid()) return;
      const [ini, h, firma, tag, cls, , co, kraj] = NOVI[i++ % NOVI.length];
      $$('.tr.new', rows).forEach(x => x.classList.remove('new'));
      const tr = document.createElement('div'); tr.className = 'tr new';
      tr.innerHTML = `<span class="firm"><i class="av" style="--h:${h}">${ini}</i><b>${firma.replace(/ (s\.r\.o\.|a\.s\.)$/, '')}</b></span><span class="what">${co}</span><span><em class="tag ${cls}">${tag}</em></span><span>${kraj}</span>`;
      rows.children[0].after(tr); while (rows.children.length > 5) rows.lastElementChild.remove();
      o += 30 + (Math.random() * 20 | 0); z += 1; c += 1;
      $('#aO').textContent = fmt(o); $('#aZ').textContent = z; $('#aCnt').textContent = c;
    }, 5200);
  }
})();
