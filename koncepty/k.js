/* Spoločné prvky konceptov: cena, formát čísel, bodková mapa SK, prúd odpovedí, konfigurátor ceny. */
window.K = (() => {
  const fmt = n => Math.round(n).toLocaleString('sk-SK').replace(/[   ]/g, ' ');
  const cena = n => { let p = 0, od = 0; for (const [d, c] of [[1000, .149], [3000, .10], [10000, .08], [Infinity, .06]]) { if (n > od) p += (Math.min(n, d) - od) * c; od = d; } return Math.round(p / 10) * 10 - 1; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LEADY = [
    ['Plasty Nitra s.r.o.', 'Nitra', 'Pošlite cenník, mesačne cca 4 000 ks.', 'záujem'],
    ['Drevotech Považie s.r.o.', 'Púchov', 'Zavolajte v stredu po 10:00, nákup – Ing. Šimková.', 'chce hovor'],
    ['Kovo Záhorie a.s.', 'Senica', 'Hľadáme dodávateľa od januára, pošlite ponuku.', 'záujem'],
    ['Logistika Váh s.r.o.', 'Piešťany', 'Aké máte termíny? Radi by sme sa stretli.', 'stretnutie'],
    ['TechPark Košice s.r.o.', 'Košice', 'Pošlite PDF s referenciami, prejdeme to na porade.', 'záujem'],
    ['Agro Podunajsko s.r.o.', 'Dunajská Streda', 'Zmluva nám končí v januári, porovnáme ponuky.', 'neskôr'],
    ['Strojárne Pohronie a.s.', 'Zvolen', 'Aká je minimálna objednávka?', 'záujem'],
    ['Tatra Sklad s.r.o.', 'Poprad', 'Máme 3 haly, pošlite orientačnú cenu.', 'záujem'],
    ['Elektro Šariš s.r.o.', 'Prešov', 'Zaujíma nás to, ozvite sa prosím zajtra.', 'chce hovor'],
    ['Stavby Kysuce s.r.o.', 'Žilina', 'Pošlite referencie z podobných zákaziek.', 'záujem'],
  ];

  async function mapa(el, o = {}) {
    const d = await fetch(o.src || '../../data/sk_mapa.json').then(r => r.json());
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `-20 -20 ${d.w + 40} ${d.h + 40}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Mapa Slovenska s firmami, ktoré vieme osloviť');
    const r = o.r || d.r;
    let html = o.outline ? `<polygon points="${d.outline}" class="m-out"/>` : '';
    html += d.dots.map(([x, y, k]) => `<circle cx="${x}" cy="${y}" r="${r}" class="m-dot" data-k="${k}"/>`).join('');
    html += `<g class="m-pings"></g>`;
    svg.innerHTML = html;
    el.appendChild(svg);
    const pings = svg.querySelector('.m-pings');
    const city = n => d.cities.find(c => c[0] === n);
    const ping = (name, label) => {
      const c = city(name); if (!c) return;
      const g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 'm-ping');
      g.innerHTML = `<circle cx="${c[1]}" cy="${c[2]}" r="${r * 2.2}" class="m-p1"/><circle cx="${c[1]}" cy="${c[2]}" r="${r * 1.6}" class="m-p2"/>` +
        (label ? `<text x="${c[1]}" y="${c[2] - r * 4}" class="m-lab" text-anchor="middle">${label}</text>` : '');
      pings.appendChild(g);
      setTimeout(() => g.remove(), o.pingLife || 4200);
    };
    const kraj = k => svg.querySelectorAll('.m-dot').forEach(c => c.classList.toggle('on', k == null ? false : +c.dataset.k === k));
    return { svg, ping, kraj, d };
  }

  function prud(o) {
    // o.list, o.render(lead) → element, o.max, o.interval, o.onLead(lead)
    let i = 0;
    const add = () => {
      const l = LEADY[i++ % LEADY.length];
      const el = o.render(l, i);
      o.list.prepend(el);
      while (o.list.children.length > (o.max || 4)) o.list.lastElementChild.remove();
      o.onLead && o.onLead(l);
    };
    for (let k = 0; k < (o.start || 3); k++) add();
    if (!reduce) setInterval(() => { if (!document.hidden) add(); }, o.interval || 3000);
  }

  function konfigurator(root) {
    const range = root.querySelector('input[type=range]');
    const set = (sel, v) => root.querySelectorAll(sel).forEach(e => e.textContent = v);
    const draw = () => {
      const n = +range.value, p = cena(n);
      range.style.setProperty('--p', ((n - range.min) / (range.max - range.min) * 100) + '%');
      const lo = Math.max(1, Math.round(n * .003)), hi = Math.max(2, Math.round(n * .012));
      set('[data-o=n]', fmt(n)); set('[data-o=cena]', fmt(p));
      set('[data-o=per]', (p / n).toLocaleString('sk-SK', { maximumFractionDigits: 3 }) + ' €');
      set('[data-o=leady]', `${fmt(lo)} – ${fmt(hi)}`); set('[data-o=cpl]', `${fmt(p / hi)} – ${fmt(p / lo)} €`);
      root.querySelectorAll('[data-n]').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
    };
    range.addEventListener('input', draw);
    root.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => { range.value = b.dataset.n; draw(); }));
    draw();
  }

  function pocitadla(root = document) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const t = +e.target.dataset.count; if (reduce) return;
      const t0 = performance.now();
      const st = now => { const q = Math.min(1, (now - t0) / 1400); e.target.textContent = fmt(t * (1 - Math.pow(1 - q, 3))); if (q < 1) requestAnimationFrame(st); };
      requestAnimationFrame(st);
    }));
    root.querySelectorAll('[data-count]').forEach(el => io.observe(el));
  }

  return { fmt, cena, mapa, prud, konfigurator, pocitadla, LEADY, reduce };
})();
