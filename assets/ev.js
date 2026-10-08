// Mailito – anonymné meranie bez cookies. Posiela len: stránku, názov udalosti a zdroj (doména refereru / ?z= / utm_source).
// Žiadne ID, cookies ani localStorage. Pri Do Not Track / Global Privacy Control sa neposiela nič.
(() => {
  const API = 'https://mailito-api.webhunter.workers.dev/api/ev';
  const me = document.currentScript;
  const off = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true || /^(localhost|127\.)/.test(location.hostname) && !/[?&]ev=1/.test(location.search);
  const base = me ? new URL('../', me.src).pathname : '/';
  const path = '/' + (location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname.replace(/^\//, ''));
  const qs = new URLSearchParams(location.search);
  const z = qs.get('z') || qs.get('utm_source') || '';
  const send = d => {
    if (off) return;
    const b = JSON.stringify({ ...d, p: path, z });
    try { if (navigator.sendBeacon && navigator.sendBeacon(API, new Blob([b], { type: 'text/plain' }))) return; } catch (e) {}
    fetch(API, { method: 'POST', body: b, keepalive: true, mode: 'no-cors' }).catch(() => {});
  };
  const sent = new Set();
  const ev = (n, once) => { n = String(n).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40); if (!n || (once && sent.has(n))) return; sent.add(n); send({ t: 'ev', n }); };
  window.mailitoEv = n => ev(n);

  send({ t: 'pv', r: document.referrer || '' });
  if (me && me.hasAttribute('data-pv-only')) return;

  // kliky: [data-ev] a všetky odkazy do objednávky (s menom sekcie, odkiaľ prišli)
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-ev], a[href]');
    if (!el) return;
    if (el.dataset.ev) return ev(el.dataset.ev, el.hasAttribute('data-ev-once'));
    const href = el.getAttribute('href') || '';
    if (/objednat\//.test(href) && !/\/objednat\/$/.test(path)) {
      const sec = el.id === 'mcta' ? 'mcta' : (el.closest('section[id], header, nav, footer')?.id || el.closest('nav, header, footer')?.tagName || 'iny');
      ev('cta_objednat_' + sec);
    } else if (/portal\/\?demo/.test(href)) ev('demo_portal');
  }, true);

  // úvodný formulár a kalkulačka
  document.addEventListener('submit', e => { if (e.target.id === 'quickForm') ev('hero_formular'); }, true);
  const pot = document.getElementById('potencial');
  if (pot) ['input', 'click'].forEach(t => pot.addEventListener(t, e => { if (e.target.closest('.chip, input')) ev('kalkulacka', true); }, true));
})();
