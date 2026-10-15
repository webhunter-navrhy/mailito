// Mailito v10 (15. 10. 2026): kalkulačka trhu (data/trh9.json = počty firem obor × kraj z DB CZ+SK), živý portál v ukázce, střídání odpovědí v úvodu.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = $('#d9');
  if (!el) return;
  const D = JSON.parse(el.textContent);
  const C = D.calc, L = D.lang;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BASE = new URL('../', (document.currentScript || {}).src || location.href);
  const fmt = n => L === 'en' ? n.toLocaleString('en-GB') : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const krajNazev = k => {
    if (L === 'en') return k + (k === 'Praha' ? '' : ' Region');
    if (k === 'Praha' || k === 'Vysočina') return k;
    return `${k} kraj`;
  };

  // ===== kalkulačka =====
  const N = $('#cN');
  if (N) {
    let trh = null, cil = 0, akt = 0, raf = 0;
    const vybrane = () => $$('#cObory .cc.on').map(b => b.dataset.k);
    const zeme = () => ($('#cZeme .cc.on') || {}).dataset?.z || 'CZ+SK';
    const sel = $('#cKraj');
    const naplnKraje = () => {
      const zs = zeme().split('+'), v = sel.value;
      sel.innerHTML = `<option value="">${esc(C.vse)}</option>` + zs.flatMap(z => Object.keys(trh?.[z] || {}).sort((a, b) => a.localeCompare(b, 'cs')).map(k => `<option value="${z}|${esc(k)}">${esc(krajNazev(k))}${zs.length > 1 ? ' · ' + z : ''}</option>`)).join('');
      if ([...sel.options].some(o => o.value === v)) sel.value = v;
    };
    const spocitej = () => {
      if (!trh) return 0;
      const ks = vybrane(); if (!ks.length) return 0;
      const [kz, kk] = sel.value ? sel.value.split('|') : [null, null];
      let n = 0;
      for (const z of zeme().split('+')) for (const [kraj, c] of Object.entries(trh[z] || {})) {
        if (kk && (z !== kz || kraj !== kk)) continue;
        n += Math.min(c._any || 0, ks.reduce((a, k) => a + (c[k] || 0), 0));
      }
      return n;
    };
    const anim = () => {
      cancelAnimationFrame(raf);
      const od = akt, t0 = performance.now(), dur = reduce ? 0 : 600;
      const krok = t => {
        const p = dur ? Math.min(1, (t - t0) / dur) : 1;
        akt = Math.round(od + (cil - od) * (1 - Math.pow(1 - p, 3)));
        N.textContent = fmt(akt);
        if (p < 1) raf = requestAnimationFrame(krok);
      };
      raf = requestAnimationFrame(krok);
    };
    const prepocet = () => {
      cil = spocitej(); anim();
      const ks = vybrane();
      const bi = cil < 1500 ? 0 : cil < 6000 ? 1 : 2;
      const [bn, bc, bf] = C.bal[bi];
      const f = Math.min(cil, bf);
      $('#cBal').textContent = ks.length ? bn : '–';
      $('#cCena').textContent = ks.length ? bc : '';
      $('#cZaj').textContent = ks.length && f ? `${fmt(Math.max(1, Math.round(f * 0.02)))}–${fmt(Math.max(2, Math.round(f * 0.04)))}` : '–';
      $('#cBar').style.width = cil ? Math.max(4, Math.round(f / cil * 100)) + '%' : '0';
      $('#cPozn').textContent = ks.length ? C.pozn : C.vyber;
      $('#cCta').dataset.balik = bn;
    };
    const prepni = (b, jeden) => {
      if (jeden) $$('.cc', b.parentElement).forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
      const on = jeden ? true : !b.classList.contains('on');
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    };
    $$('#cObory .cc').forEach(b => b.addEventListener('click', () => { prepni(b, false); prepocet(); window.mailitoEv?.('kalkulacka'); }));
    $$('#cZeme .cc').forEach(b => b.addEventListener('click', () => { prepni(b, true); naplnKraje(); prepocet(); }));
    sel.addEventListener('change', prepocet);
    // tlačítko → předvyplnit formulář
    $('#cCta').addEventListener('click', () => {
      const f = $('#inqForm'); if (!f) return;
      const o = vybrane().map(k => D.obory[k]).join(', ');
      const r = sel.value ? sel.options[sel.selectedIndex].text : ($('#cZeme .cc.on') || {}).textContent || '';
      if (f.ponuka && !f.ponuka.value.trim()) { f.ponuka.value = C.prefill.replace('{o}', o).replace('{r}', r); f.ponuka.dispatchEvent(new Event('input')); }
      const radio = $$('[name=balik]', f).find(x => x.value.startsWith($('#cCta').dataset.balik));
      if (radio) radio.checked = true;
      const z = zeme(); const zr = $$('[name=zeme]', f).find(x => x.value === z); if (zr) zr.checked = true;
    });
    fetch(new URL('data/trh9.json', BASE)).then(r => r.json()).then(j => { trh = j; naplnKraje(); prepocet(); }).catch(() => {});
  }

  // ===== živý portál v ukázce =====
  const dpL = $('#dpL'), dpN = $('#dpN');
  if (dpL && !reduce) {
    let i = 0, n = +dpN.textContent || 3, bezi = false;
    const pridej = () => {
      if (document.hidden) return;
      const [f, w] = D.portal.dalsi[i++ % D.portal.dalsi.length];
      $$('li.nw', dpL).forEach(x => x.classList.remove('nw')); $$('li em', dpL).forEach(x => x.remove());
      const li = document.createElement('li'); li.className = 'nw';
      li.innerHTML = `<span class="av">${esc(f[0])}</span><div><b>${esc(f)}</b><small>${esc(w)}</small></div><time>${esc(D.portal.ted)}</time><em>${esc(D.portal.novy)}</em>`;
      dpL.prepend(li);
      while (dpL.children.length > 4) dpL.lastElementChild.remove();
      dpN.textContent = ++n;
    };
    new IntersectionObserver(es => { if (es[0].isIntersecting && !bezi) { bezi = true; setTimeout(pridej, 1200); setInterval(pridej, 4800); } }, { threshold: .4 }).observe(dpL);
  }

  // ===== úvod: střídání odpovědí, růst grafu =====
  const rep = $('.g-reply');
  if (rep && !reduce && D.odpovedi?.length) {
    let k = 0;
    setInterval(() => {
      if (document.hidden) return;
      const [f, t] = D.odpovedi[++k % D.odpovedi.length];
      rep.classList.add('sw');
      setTimeout(() => { $('.av', rep).textContent = f[0]; $('b', rep).textContent = f; $('p', rep).textContent = t; rep.classList.remove('sw'); }, 380);
    }, 4200);
  }
  $$('.bars i').forEach((b, i) => { b.style.setProperty('--d', i * 70 + 'ms'); });
  document.documentElement.classList.add('js9');
})();
