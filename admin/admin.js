// Mailito – administrácia pre nás. Dáta z API /api/adm/*, zmeny kampaní idú cez príkazy, ktoré vykoná engine (sync.py).
(() => {
  const API = 'https://mailito-api.webhunter.workers.dev';
  const TK = 'mailito_adm';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => n == null || n === '' ? '–' : Math.round(+n).toLocaleString('sk-SK').replace(/[\s  ]/g, ' ');
  const eur = n => n == null ? '–' : fmt(n) + ' €';
  const dt = s => { if (!s) return '–'; const d = new Date(String(s).includes('T') ? s : s.replace(' ', 'T') + 'Z'); return isNaN(d) ? s : d.toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const ago = s => { if (!s) return null; const d = new Date(String(s).includes('T') ? s : s.replace(' ', 'T') + 'Z'); return (Date.now() - d) / 60000; };
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const toast = t => { const e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (e.hidden = true), 3200); };

  async function api(path, data) {
    const r = await fetch(API + path, { method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (store.get(TK) || '') }, body: data ? JSON.stringify(data) : undefined });
    if (r.status === 401) { store.set(TK, null); showLogin(); throw new Error('Prihláste sa znova.'); }
    const j = await r.json(); if (!j.ok) throw new Error(j.chyba || 'Chyba'); return j;
  }

  const STAV = { objednana: ['Objednaná', 'st-warn'], priprava: ['Príprava', ''], na_schvalenie: ['Na schválenie', 'st-blue'], schvalena: ['Schválená', 'st-blue'], bezi: ['Beží', 'st-run'], pauza: ['Pozastavená', 'st-warn'], hotova: ['Dokončená', 'st-ok'], ukoncena: ['Ukončená', ''] };
  const PLATBA = { caka: ['Čaká na faktúru', 'st-warn'], faktura: ['Faktúra vystavená', 'st-blue'], zaplatene: ['Zaplatené', 'st-ok'] };
  const FSTAV = { pripravena: ['Pripravená', 'st-warn'], odoslana: ['Odoslaná', 'st-blue'], zaplatena: ['Zaplatená', 'st-ok'], storno: ['Storno', 'st-bad'] };
  const AKCIA = { spustit: 'Spustiť', pauza: 'Pozastaviť', pokracovat: 'Pokračovať', ukoncit: 'Ukončiť', texty: 'Zmena textov', limit: 'Denný limit', schranky: 'Schránky kampane', schranka: 'Nová/upravená schránka', schranka_stav: 'Zapnutie/vypnutie schránky', ostro: 'Ostré odosielanie' };
  const st = (m, k) => { const [t, c] = m[k] || [k || '–', '']; return `<span class="st ${c}">${esc(t)}</span>`; };
  const tag = t => t === 'horuci' ? '<span class="st st-bad">Horúci</span>' : t === 'teply' ? '<span class="st st-warn">Teplý</span>' : `<span class="st">${esc(t || '–')}</span>`;

  // ---------- prihlásenie ----------
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; }
  $('#loginF').addEventListener('submit', async e => {
    e.preventDefault(); $('#loginMsg').textContent = '';
    try {
      const r = await fetch(API + '/api/adm/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ heslo: e.target.heslo.value }) });
      const j = await r.json(); if (!j.ok) throw new Error(j.chyba);
      store.set(TK, j.token); start();
    } catch (er) { $('#loginMsg').textContent = er.message || 'Prihlásenie zlyhalo.'; }
  });
  $('#logout').addEventListener('click', () => { store.set(TK, null); showLogin(); });

  // ---------- modál ----------
  const modal = html => { $('#modalC').innerHTML = html; $('#modal').hidden = false; return $('#modalC'); };
  const zavri = () => { $('#modal').hidden = true; };
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-zavri]')) zavri(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') zavri(); });

  // ---------- smerovanie ----------
  const R = { prehlad: vPrehlad, objednavky: vObjednavky, kampane: vKampane, kampan: vKampan, klienti: vKlienti, klient: vKlient, faktury: vFaktury, leady: vLeady, rozosielka: vRozosielka, databaza: vDatabaza, ai: vAi, web: vWeb };
  async function route() {
    const [v, id] = (location.hash.slice(1) || 'prehlad').split('/');
    $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === v || (v === 'kampan' && a.dataset.r === 'kampane') || (v === 'klient' && a.dataset.r === 'klienti')));
    const m = $('#main'); m.innerHTML = '<p class="load">Načítavam…</p>';
    try { m.innerHTML = await (R[v] || vPrehlad)(id); bind(m, v, id); } catch (e) { m.innerHTML = `<p class="note">${esc(e.message)}</p>`; }
    scrollTo(0, 0);
  }
  addEventListener('hashchange', route);

  let ENGINE = null;
  function engineStav(e) {
    ENGINE = e;
    const a = e ? ago(e._ts) : null, on = a != null && a < 15;
    const el = $('#engineStav');
    el.className = 'eng ' + (on ? 'on' : 'off');
    el.innerHTML = `<i></i><span>${on ? 'Engine beží' : e ? 'Engine neodpovedá' : 'Engine sa ešte neozval'}${e ? `<br>${a < 1 ? 'práve teraz' : 'pred ' + Math.round(a) + ' min'} · ${e.ostro ? '<b style="color:#1E7A43">ostro</b>' : 'nanečisto'}` : ''}</span>`;
    return on;
  }

  // ---------- prehľad ----------
  async function vPrehlad() {
    const d = await api('/api/adm/prehlad');
    const on = engineStav(d.engine);
    const pl = Object.fromEntries(d.platby.map(x => [x.platba, x]));
    const cakaN = (pl.caka?.n || 0) + (pl.faktura?.n || 0), cakaS = (pl.caka?.s || 0) + (pl.faktura?.s || 0);
    $('#nObj').textContent = cakaN || '';
    const ks = Object.fromEntries(d.kampane.map(x => [x.stav, x.n]));
    const web = k => d.web.filter(x => x.nazov === k || (k === 'pv' && x.typ === 'pv')).reduce((a, x) => a + x.n, 0);
    const e = d.engine || {};
    return `<div class="ph"><div><h1>Prehľad</h1><p>Všetko podstatné na jednom mieste.</p></div><a class="btn" href="../" target="_blank">Otvoriť web ↗</a></div>
      <div class="grid g4">
        <div class="card kpi ${cakaN ? 'warn' : ''}"><small>Čaká na platbu</small><b>${cakaN}</b><span>${eur(cakaS)} bez DPH</span></div>
        <div class="card kpi dark"><small>Zaplatené tržby</small><b>${eur(pl.zaplatene?.s || 0)}</b><span>${pl.zaplatene?.n || 0} objednávok</span></div>
        <div class="card kpi"><small>Bežiace kampane</small><b>${ks.bezi || 0}</b><span>${ks.pauza || 0} pozastavených · ${ks.hotova || 0} dokončených</span></div>
        <div class="card kpi"><small>Záujemcovia</small><b>${fmt(d.leady)}</b><span>${d.leady7} za 7 dní · ${d.klienti} klientov</span></div>
      </div>
      <div class="grid g3" style="margin-top:12px">
        <div class="card"><h2>Systém</h2><dl class="dl">
          <dt>Engine</dt><dd>${on ? '<span class="st st-ok">beží</span>' : '<span class="st st-bad">neodpovedá</span>'} ${d.engine ? 'naposledy ' + dt(d.engine._ts) : ''}</dd>
          <dt>Odosielanie</dt><dd>${e.ostro ? '<span class="st st-ok">ostro</span>' : '<span class="st st-warn">nanečisto</span>'}</dd>
          <dt>Schránky</dt><dd>${(e.schranky || []).filter(s => s.aktivna && s.ucel !== 'notif').length} aktívnych odosielacích · ${(e.schranky || []).some(s => s.ucel === 'notif') ? 'notifikačná OK' : '<span class="st st-warn">chýba notifikačná</span>'}</dd>
          <dt>AI</dt><dd>${d.ai_cloud ? '<span class="st st-ok">v cloude</span>' : '<span class="st st-warn">cez Mac</span>'} · ${d.ai.reduce((a, x) => a + x.n, 0)} úloh za 24 h${d.ai.filter(x => x.stav === 'chyba').reduce((a, x) => a + x.n, 0) ? ` · <span class="st st-bad">${d.ai.filter(x => x.stav === 'chyba').reduce((a, x) => a + x.n, 0)} chýb</span>` : ''}</dd>
          <dt>Príkazy</dt><dd>${d.prikazy_cakaju ? d.prikazy_cakaju + ' čaká na engine' : 'nič nečaká'}</dd></dl></div>
        <div class="card"><h2>Web za 7 dní <a class="btn btn-s" href="#web">Detail</a></h2><dl class="dl">
          <dt>Zobrazenia stránok</dt><dd>${fmt(web('pv'))}</dd><dt>Ukážky AI e-mailu</dt><dd>${fmt(web('ukazka_emailu'))}</dd>
          <dt>Začaté objednávky</dt><dd>${fmt(web('wizard_krok_1'))}</dd><dt>Odoslané objednávky</dt><dd>${fmt(web('objednavka_odoslana'))}</dd></dl></div>
        <div class="card"><h2>Faktúry <a class="btn btn-s" href="#faktury">Všetky</a></h2><dl class="dl">${d.faktury.length ? d.faktury.map(f => `<dt>${st(FSTAV, f.stav)}</dt><dd>${f.n} · ${eur(f.s)}</dd>`).join('') : '<dt>Zatiaľ žiadne</dt><dd></dd>'}</dl></div>
      </div>
      <div class="grid g2" style="margin-top:12px">
        <div class="card"><h2>Posledné objednávky <a class="btn btn-s" href="#objednavky">Všetky</a></h2>${d.objednavky.length ? `<table><tbody>${d.objednavky.map(o => `<tr class="cl" data-href="#kampan/${o.id}"><td>${esc(o.firma || o.email)}<br><span class="mut">${esc(o.nazov || '')}</span></td><td class="nw">${eur(o.cena_eur)}</td><td>${st(PLATBA, o.platba)}</td><td class="mut nw">${dt(o.vytvorene)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">Zatiaľ žiadne objednávky.</p>'}</div>
        <div class="card"><h2>Noví záujemcovia <a class="btn btn-s" href="#leady">Všetci</a></h2>${d.nove_leady.length ? `<table><tbody>${d.nove_leady.map(l => `<tr><td>${esc(l.firma)}<br><span class="mut">${esc(l.zhrnutie || '')}</span></td><td>${tag(l.teplota)}</td><td class="mut">${esc(l.klient || '')}</td><td class="mut nw">${dt(l.vytvorene)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">Zatiaľ žiadni.</p>'}</div>
      </div>`;
  }

  // ---------- objednávky ----------
  let KAMPANE = [];
  async function vObjednavky() {
    KAMPANE = (await api('/api/adm/kampane')).kampane;
    const o = KAMPANE.filter(k => k.cena_eur != null);
    return `<div class="ph"><div><h1>Objednávky</h1><p>Objednávky z webu. Faktúru nahrajte, po úhrade označte „Zaplatené“ a kampaň sa spustí.</p></div><button class="btn btn-p" data-a="nova-faktura">Nahrať faktúru</button></div>
      ${o.length ? `<div class="tw"><table><thead><tr><th>Dátum</th><th>Klient</th><th>Kampaň</th><th class="r">Firiem</th><th class="r">Cena</th><th>Platba</th><th>Stav</th><th></th></tr></thead><tbody>
      ${o.map(k => `<tr><td class="nw mut">${dt(k.vytvorene)}</td><td><a href="#klient/${k.client_id}">${esc(k.klient_firma || k.klient_email)}</a></td><td><a href="#kampan/${k.id}">${esc(k.nazov || k.id)}</a>${k.faktura?.cislo ? `<br><span class="mut">faktúra ${esc(k.faktura.cislo)}</span>` : ''}</td>
        <td class="r">${fmt(k.pocet_firiem)}</td><td class="r nw">${eur(k.cena_eur)}</td><td>${st(PLATBA, k.platba)}</td><td>${st(STAV, k.stav)}</td>
        <td><div class="acts"><button class="btn btn-s" data-a="fakt-udaje" data-id="${k.client_id}">Fakturačné údaje</button>${k.faktura?.cislo ? '' : `<button class="btn btn-s" data-a="nova-faktura" data-klient="${k.client_id}" data-kampan="${k.id}" data-suma="${k.cena_eur}">Faktúra</button>`}${k.platba !== 'zaplatene' ? `<button class="btn btn-s btn-l" data-a="zaplatene" data-id="${k.id}">Zaplatené</button>` : ''}</div></td></tr>`).join('')}
      </tbody></table></div>` : '<div class="card empty">Zatiaľ žiadne objednávky z webu.</div>'}`;
  }

  // ---------- kampane ----------
  async function vKampane() {
    KAMPANE = (await api('/api/adm/kampane')).kampane;
    return `<div class="ph"><div><h1>Kampane</h1><p>Všetky kampane všetkých klientov. Kliknite pre správu.</p></div></div>
      <div class="filters"><input id="fQ" placeholder="Hľadať klienta alebo kampaň"><select id="fS"><option value="">Všetky stavy</option>${Object.entries(STAV).map(([k, [t]]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
      <div class="tw"><table><thead><tr><th>Kampaň</th><th>Klient</th><th>Stav</th><th>Priebeh</th><th class="r">Odpovede</th><th class="r">Záujemcovia</th><th>Platba</th></tr></thead><tbody id="kRows">${kRows(KAMPANE)}</tbody></table></div>`;
  }
  const kRows = l => l.length ? l.map(k => {
    const pct = k.pocet_firiem ? Math.min(100, Math.round(k.odoslane / k.pocet_firiem * 100)) : 0;
    return `<tr class="cl" data-href="#kampan/${k.id}"><td><b>${esc(k.nazov || k.id)}</b><br><span class="mut mono">${k.id}</span></td><td>${esc(k.klient_firma || k.klient_email || '')}</td><td>${st(STAV, k.stav)}</td>
      <td style="min-width:150px"><div class="bar"><i style="width:${pct}%"></i></div><span class="mut">${fmt(k.odoslane)} / ${fmt(k.pocet_firiem)}</span></td><td class="r">${fmt(k.odpovede)}</td><td class="r"><b>${fmt(k.zaujemcovia)}</b></td><td>${k.cena_eur != null ? st(PLATBA, k.platba) : '<span class="mut">–</span>'}</td></tr>`;
  }).join('') : '<tr><td colspan="7" class="empty">Žiadne kampane.</td></tr>';

  async function vKampan(id) {
    const d = await api('/api/adm/kampan?id=' + encodeURIComponent(id));
    const k = d.kampan, o = k.objednavka || {}, ek = d.engine_kampan || {};
    const sch = (ENGINE?.schranky || []).filter(s => s.ucel !== 'notif');
    const pct = k.pocet_firiem ? Math.min(100, Math.round(k.odoslane / k.pocet_firiem * 100)) : 0;
    // skutočné texty z enginu (v D1 je verzia pre klienta s [názov firmy])
    const zdroj = ek.texty?.length ? ek.texty : null;
    const texty = (zdroj || []).map((t, i) => `<div class="card" style="padding:14px"><p class="mut" style="margin-bottom:8px">${i ? `Pripomienka po ${t.po_dnoch || (i === 1 ? 4 : 9)} dňoch` : 'Prvý e-mail'}</p>
      ${i === 0 ? `<label>Predmet (varianty oddeľte |)<input data-t="predmet" data-i="${i}" value="${esc(Array.isArray(t.predmet) ? t.predmet.join(' | ') : t.predmet || '')}"></label>` : ''}
      <label style="margin-top:8px">Text<textarea data-t="text" data-i="${i}" data-dni="${t.po_dnoch || 0}">${esc(t.text || '')}</textarea></label></div>`).join('');
    const prik = d.prikazy.map(p => `<tr><td class="mut nw">${dt(p.vytvorene)}</td><td>${esc(AKCIA[p.akcia] || p.akcia)}</td><td>${p.stav === 'hotovo' ? '<span class="st st-ok">vykonané</span>' : p.stav === 'chyba' ? '<span class="st st-bad">chyba</span>' : '<span class="st st-warn">čaká na engine</span>'}</td><td class="mut">${esc(p.vysledok || '')}</td></tr>`).join('');
    return `<a class="back" href="#kampane">← Kampane</a>
      <div class="ph"><div><h1>${esc(k.nazov || k.id)}</h1><p><a href="#klient/${k.client_id}">${esc(k.klient_firma || k.klient_email)}</a> · ${st(STAV, k.stav)} ${k.cena_eur != null ? '· ' + st(PLATBA, k.platba) + ' · ' + eur(k.cena_eur) : ''}</p></div>
        <div class="acts">
          ${['objednana', 'schvalena', 'priprava', 'na_schvalenie'].includes(k.stav) ? `<button class="btn btn-p" data-a="prikaz" data-akcia="spustit">Spustiť</button>` : ''}
          ${k.stav === 'bezi' ? `<button class="btn" data-a="prikaz" data-akcia="pauza">Pozastaviť</button>` : ''}
          ${k.stav === 'pauza' ? `<button class="btn btn-p" data-a="prikaz" data-akcia="pokracovat">Pokračovať</button>` : ''}
          ${!['hotova', 'ukoncena'].includes(k.stav) ? `<button class="btn btn-d" data-a="prikaz" data-akcia="ukoncit">Ukončiť</button>` : ''}
          ${k.cena_eur != null && k.platba !== 'zaplatene' ? `<button class="btn btn-l" data-a="zaplatene" data-id="${k.id}">Zaplatené</button>` : ''}
          <button class="btn" data-a="nova-faktura" data-klient="${k.client_id}" data-kampan="${k.id}" data-suma="${k.cena_eur ?? ''}">Faktúra</button>
          <button class="btn" data-a="portal" data-id="${k.client_id}">Portál klienta ↗</button>
        </div></div>
      ${k.stav === 'objednana' && k.platba !== 'zaplatene' ? '<p class="note" style="margin-bottom:12px">Kampaň čaká na úhradu. Po označení „Zaplatené“ ju engine sám spustí (ak sú aktívne odosielacie schránky).</p>' : ''}
      <div class="grid g4">
        <div class="card kpi"><small>Firiem v kampani</small><b>${fmt(k.pocet_firiem)}</b><span>${o.pocet ? fmt(o.pocet) + ' + 100 zadarmo' : ''}</span></div>
        <div class="card kpi"><small>Oslovené</small><b>${fmt(k.odoslane)}</b><span><span class="bar" style="display:block;margin-top:6px"><i style="width:${pct}%"></i></span></span></div>
        <div class="card kpi"><small>Odpovede</small><b>${fmt(k.odpovede)}</b><span>${fmt(k.odhlasenia)} odhlásení</span></div>
        <div class="card kpi dark"><small>Záujemcovia</small><b>${fmt(k.zaujemcovia)}</b><span>${d.leady.filter(l => l.stav === 'obchod').length} obchodov</span></div>
      </div>
      <div class="grid g2" style="margin-top:12px">
        <div class="card"><h2>Cieľovka a nastavenia</h2><dl class="dl">
          <dt>Odvetvia</dt><dd>${esc((k.segmenty || []).join(', ') || '–')}</dd><dt>Kraje</dt><dd>${esc((k.kraje || []).join(', ') || 'celé Slovensko')}</dd>
          ${o.obory?.length ? `<dt>Obory</dt><dd>${esc(o.obory.join(', '))}</dd>` : ''}${o.vylucit?.length ? `<dt>Vylúčiť</dt><dd>${esc(o.vylucit.join(', '))}</dd>` : ''}
          ${o.odosielatel ? `<dt>Odosielateľ</dt><dd>${esc([o.odosielatel.meno, o.odosielatel.firma].filter(Boolean).join(', '))}</dd>` : ''}
          <dt>Engine</dt><dd>${ek.stav ? esc(ek.stav) + ' · ' + Object.entries(ek.prijemcovia || {}).map(([s, n]) => `${s} ${n}`).join(', ') : '<span class="mut">bez údajov z enginu</span>'}</dd>
          <dt>Schránky</dt><dd>${esc((ek.schranky || []).join(', ') || '–')}</dd><dt>Nových denne</dt><dd>${ek.novych_den ?? '–'}</dd></dl>
          <div class="acts" style="margin-top:14px"><button class="btn btn-s" data-a="limit" data-v="${ek.novych_den ?? 120}">Zmeniť denný limit</button><button class="btn btn-s" data-a="schranky-k" data-v="${esc(JSON.stringify(ek.schranky || []))}" data-all="${esc(JSON.stringify(sch.map(s => s.email)))}">Priradiť schránky</button></div></div>
        <div class="card"><h2>Príkazy pre engine</h2>${prik ? `<table><tbody>${prik}</tbody></table>` : '<p class="mut">Zatiaľ žiadne. Akcie hore sa vykonajú pri najbližšej synchronizácii (do 5 minút).</p>'}</div>
      </div>
      <div class="card" style="margin-top:12px"><h2>E-maily <button class="btn btn-s btn-p" data-a="ulozit-texty">Uložiť zmeny textov</button></h2><div class="grid">${texty || (k.texty?.length ? '<p class="note">Texty sa načítajú z enginu pri najbližšej synchronizácii (do 5 minút).</p>' : '<p class="mut">Kampaň zatiaľ nemá texty.</p>')}</div><p class="mut" style="margin-top:8px">Premenná {firma} = názov oslovenej firmy. Zmena sa prejaví pri ďalších e-mailoch.</p></div>
      <div class="card" style="margin-top:12px"><h2>Záujemcovia (${d.leady.length})</h2>${leadTab(d.leady, false)}</div>
      <div class="card" style="margin-top:12px"><h2>Udalosti</h2><table><tbody>${d.udalosti.map(u => `<tr><td class="mut nw">${dt(u.ts)}</td><td>${esc(u.text)}</td></tr>`).join('') || '<tr><td class="mut">Žiadne.</td></tr>'}</tbody></table></div>`;
  }
  const leadTab = (l, klient = true) => l.length ? `<div style="overflow-x:auto"><table><thead><tr><th>Firma</th><th>Čo chce</th><th>Teplota</th><th>Stav</th>${klient ? '<th>Klient</th>' : ''}<th>Kontakt</th><th>Dátum</th></tr></thead><tbody>
    ${l.map(x => `<tr><td><b>${esc(x.firma || '')}</b><br><span class="mut">${esc([x.mesto, x.kraj].filter(Boolean).join(', '))}</span></td><td style="max-width:360px">${esc(x.zhrnutie || x.odpoved || '')}</td><td>${tag(x.teplota)}</td><td><span class="st">${esc(x.stav)}</span></td>${klient ? `<td>${esc(x.klient_firma || '')}</td>` : ''}<td class="mono">${esc(x.email || '')}</td><td class="mut nw">${dt(x.vytvorene)}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="empty">Zatiaľ žiadni záujemcovia.</p>';

  // ---------- klienti ----------
  let KLIENTI = [];
  async function vKlienti() {
    KLIENTI = (await api('/api/adm/klienti')).klienti;
    return `<div class="ph"><div><h1>Klienti</h1><p>${KLIENTI.length} účtov</p></div></div><div class="filters"><input id="fK" placeholder="Hľadať meno, firmu, e-mail, IČO"></div>
      <div class="tw"><table><thead><tr><th>Firma</th><th>Kontakt</th><th>IČO</th><th class="r">Kampaní</th><th class="r">Obrat</th><th class="r">Zaplatené</th><th class="r">Záujemcov</th><th>Od</th></tr></thead><tbody id="klRows">${klRows(KLIENTI)}</tbody></table></div>`;
  }
  const klRows = l => l.length ? l.map(k => `<tr class="cl" data-href="#klient/${k.id}"><td><b>${esc(k.firma || '–')}</b>${k.stav !== 'aktivny' ? ' <span class="st st-bad">' + esc(k.stav) + '</span>' : ''}</td><td>${esc(k.meno || '')}<br><span class="mut">${esc(k.email)}</span></td><td class="mono">${esc(k.ico || '')}</td><td class="r">${k.kampani}</td><td class="r">${eur(k.obrat || 0)}</td><td class="r">${eur(k.zaplatene || 0)}</td><td class="r">${k.leadov}</td><td class="mut nw">${dt(k.vytvorene)}</td></tr>`).join('') : '<tr><td colspan="8" class="empty">Žiadni klienti.</td></tr>';

  let KLIENT = null;
  async function vKlient(id) {
    const d = await api('/api/adm/klient?id=' + encodeURIComponent(id)); KLIENT = d;
    const k = d.klient, f = k.fakturacne || {};
    return `<a class="back" href="#klienti">← Klienti</a>
      <div class="ph"><div><h1>${esc(k.firma || k.email)}</h1><p>${esc(k.meno || '')} · ${esc(k.email)} ${k.telefon ? '· ' + esc(k.telefon) : ''}</p></div>
        <div class="acts"><button class="btn" data-a="klient-uprava">Upraviť údaje</button><button class="btn" data-a="heslo" data-id="${k.id}">Nové heslo</button><button class="btn" data-a="portal" data-id="${k.id}">Portál klienta ↗</button><button class="btn btn-p" data-a="nova-faktura" data-klient="${k.id}">Nahrať faktúru</button></div></div>
      <div class="grid g2">
        <div class="card"><h2>Fakturačné údaje <button class="btn btn-s" data-a="kopiruj-fakt">Kopírovať</button></h2><dl class="dl" id="faktDl">
          <dt>Firma</dt><dd>${esc(f.firma || k.firma || '–')}</dd><dt>IČO</dt><dd>${esc(f.ico || k.ico || '–')}</dd><dt>DIČ</dt><dd>${esc(f.dic || '–')}</dd><dt>IČ DPH</dt><dd>${esc(f.icdph || '–')}</dd>
          <dt>Adresa</dt><dd>${esc([f.ulica, [f.psc, f.mesto].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '–')}</dd><dt>E-mail pre faktúru</dt><dd>${esc(f.email || k.email)}</dd></dl></div>
        <div class="card"><h2>Faktúry</h2>${fTab(d.faktury, false)}</div>
      </div>
      <div class="card" style="margin-top:12px"><h2>Kampane</h2><table><tbody>${d.kampane.map(c => `<tr class="cl" data-href="#kampan/${c.id}"><td><b>${esc(c.nazov || c.id)}</b></td><td>${st(STAV, c.stav)}</td><td>${c.cena_eur != null ? st(PLATBA, c.platba) : ''}</td><td class="r">${fmt(c.odoslane)} / ${fmt(c.pocet_firiem)}</td><td class="r"><b>${fmt(c.zaujemcovia)}</b> záujemcov</td><td class="r">${eur(c.cena_eur)}</td></tr>`).join('') || '<tr><td class="mut">Žiadne.</td></tr>'}</tbody></table></div>
      <div class="card" style="margin-top:12px"><h2>Záujemcovia (${d.leady.length})</h2>${leadTab(d.leady, false)}</div>
      <div class="card" style="margin-top:12px"><h2>Udalosti</h2><table><tbody>${d.udalosti.map(u => `<tr><td class="mut nw">${dt(u.ts)}</td><td>${esc(u.text)}</td></tr>`).join('') || '<tr><td class="mut">Žiadne.</td></tr>'}</tbody></table></div>`;
  }

  // ---------- faktúry ----------
  const fTab = (l, klient = true) => l.length ? `<div style="overflow-x:auto"><table><thead><tr><th>Číslo</th>${klient ? '<th>Klient</th>' : ''}<th class="r">Suma</th><th>Splatnosť</th><th>Stav</th><th></th></tr></thead><tbody>
    ${l.map(f => `<tr><td><b>${esc(f.cislo)}</b><br><span class="mut">${dt(f.vytvorene)}</span></td>${klient ? `<td><a href="#klient/${f.client_id}">${esc(f.klient_firma || f.klient_email || '')}</a></td>` : ''}<td class="r nw">${eur(f.suma_eur)}</td><td class="nw">${esc(f.splatnost || '–')}</td>
      <td>${st(FSTAV, f.stav)}${f.stav === 'pripravena' && f.poslat ? '<br><span class="mut">čaká na odoslanie e-mailom</span>' : ''}${f.chyba ? `<br><span class="st st-bad">${esc(f.chyba)}</span>` : ''}</td>
      <td><div class="acts"><button class="btn btn-s" data-a="pdf" data-id="${f.id}">PDF</button>${f.stav === 'pripravena' ? `<button class="btn btn-s" data-a="fstav" data-id="${f.id}" data-v="odoslana">Poslal som ručne</button>` : ''}${['pripravena', 'odoslana'].includes(f.stav) ? `<button class="btn btn-s btn-l" data-a="fstav" data-id="${f.id}" data-v="zaplatena">Zaplatená</button>` : ''}${f.stav !== 'storno' ? `<button class="btn btn-s btn-d" data-a="fstav" data-id="${f.id}" data-v="storno">Storno</button>` : ''}</div></td></tr>`).join('')}
    </tbody></table></div>` : '<p class="empty">Zatiaľ žiadne faktúry.</p>';
  async function vFaktury() {
    const d = await api('/api/adm/faktury');
    return `<div class="ph"><div><h1>Faktúry</h1><p>Faktúru vystavíte vo svojom programe, tu nahráte PDF. Klient ju uvidí v portáli a dostane ju e-mailom z info@mailito.eu.</p></div><button class="btn btn-p" data-a="nova-faktura">Nahrať faktúru</button></div>
      ${(ENGINE?.schranky || []).some(s => s.ucel === 'notif') ? '' : '<p class="note" style="margin-bottom:12px">Notifikačná schránka (info@mailito.eu) ešte nie je nastavená, preto faktúry zatiaľ neodchádzajú e-mailom. Klient ich vidí v portáli; PDF môžete poslať aj ručne a kliknúť „Poslal som ručne“.</p>'}
      <div class="tw" style="padding:6px">${fTab(d.faktury)}</div>`;
  }
  async function novaFaktura(pre = {}) {
    if (!KLIENTI.length) KLIENTI = (await api('/api/adm/klienti')).klienti;
    if (!KAMPANE.length) KAMPANE = (await api('/api/adm/kampane')).kampane;
    const c = modal(`<h2>Nahrať faktúru</h2>
      <label>Klient<select name="klient">${KLIENTI.map(k => `<option value="${k.id}"${k.id === pre.klient ? ' selected' : ''}>${esc(k.firma || k.email)}</option>`).join('')}</select></label>
      <label>Kampaň (nepovinné)<select name="kampan"></select></label>
      <div class="f2"><label>Číslo faktúry<input name="cislo" required placeholder="2026001"></label><label>Suma s DPH alebo bez (€)<input name="suma" type="number" step="0.01" value="${esc(pre.suma || '')}"></label></div>
      <div class="f2"><label>Splatnosť<input name="splatnost" type="date" value="${new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)}"></label><label>PDF faktúry<input name="subor" type="file" accept="application/pdf"></label></div>
      <label style="display:flex;gap:8px;align-items:center;color:var(--tx)"><input name="poslat" type="checkbox" checked style="width:auto">Poslať klientovi e-mailom (z info@mailito.eu)</label>
      <p class="msg" id="fMsg"></p><div class="acts"><button class="btn btn-p" id="fGo">Nahrať</button><button class="btn" data-zavri>Zrušiť</button></div>`);
    const selK = $('[name=klient]', c), selC = $('[name=kampan]', c);
    const plnK = () => { selC.innerHTML = '<option value="">– bez kampane –</option>' + KAMPANE.filter(x => x.client_id === selK.value).map(x => `<option value="${x.id}"${x.id === pre.kampan ? ' selected' : ''}>${esc(x.nazov || x.id)}${x.cena_eur != null ? ' · ' + eur(x.cena_eur) : ''}</option>`).join(''); };
    selK.addEventListener('change', plnK); plnK();
    $('#fGo', c).addEventListener('click', async () => {
      const file = $('[name=subor]', c).files[0], m = $('#fMsg', c);
      if (!$('[name=cislo]', c).value.trim()) return (m.textContent = 'Zadajte číslo faktúry.');
      if (!file) return (m.textContent = 'Vyberte PDF faktúry.');
      if (file.size > 1.9e6) return (m.textContent = 'PDF je príliš veľké (max 1,9 MB).');
      const b64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
      $('#fGo', c).disabled = true;
      try {
        await api('/api/adm/faktura', { client_id: selK.value, campaign_id: selC.value || null, cislo: $('[name=cislo]', c).value.trim(), suma_eur: $('[name=suma]', c).value, splatnost: $('[name=splatnost]', c).value, subor: b64, subor_nazov: file.name, poslat: $('[name=poslat]', c).checked });
        zavri(); toast('Faktúra je nahraná. Klient ju vidí v portáli.'); route();
      } catch (e) { m.textContent = e.message; $('#fGo', c).disabled = false; }
    });
  }

  // ---------- záujemcovia ----------
  let LEADY = [];
  async function vLeady() {
    LEADY = (await api('/api/adm/leady')).leady;
    return `<div class="ph"><div><h1>Záujemcovia</h1><p>${LEADY.length} záujemcov zo všetkých kampaní</p></div></div><div class="filters"><input id="fL" placeholder="Hľadať firmu, klienta, text"></div><div class="tw" style="padding:6px" id="lBox">${leadTab(LEADY)}</div>`;
  }

  // ---------- rozosielka ----------
  async function vRozosielka() {
    const d = await api('/api/adm/rozosielka'); const e = d.engine || {}; engineStav(d.engine);
    const dni = Object.entries(d.dni).sort().slice(-30), mx = Math.max(1, ...dni.map(([, x]) => x.odoslane));
    const sch = e.schranky || [];
    return `<div class="ph"><div><h1>Rozosielka a schránky</h1><p>Odosiela engine z našich schránok, v pracovné dni 8 – 17 h, postupne a s denným limitom na schránku.</p></div><button class="btn btn-p" data-a="nova-schranka">Pridať schránku</button></div>
      <div class="grid g4">
        <div class="card kpi ${e.ostro ? 'dark' : 'warn'}"><small>Režim</small><b>${e.ostro ? 'Ostro' : 'Nanečisto'}</b><span>${e.ostro ? 'e-maily naozaj odchádzajú' : 'e-maily sa len ukladajú, nič neodchádza'}</span></div>
        <div class="card kpi"><small>Odosielacie schránky</small><b>${sch.filter(s => s.aktivna && s.ucel !== 'notif').length}</b><span>${sch.length} spolu</span></div>
        <div class="card kpi"><small>Dnes odoslané</small><b>${fmt(sch.reduce((a, s) => a + (s.dnes || 0), 0))}</b><span>kapacita ${fmt(sch.filter(s => s.aktivna && s.ucel !== 'notif').reduce((a, s) => a + (s.denny_limit || 0), 0))} denne</span></div>
        <div class="card kpi"><small>Engine</small><b>${ENGINE && ago(ENGINE._ts) < 15 ? 'Beží' : 'Neodpovedá'}</b><span>${ENGINE ? 'naposledy ' + dt(ENGINE._ts) : 'zatiaľ sa neozval'}${e.host ? ' · ' + esc(e.host) : ''}</span></div>
      </div>
      <div class="card" style="margin-top:12px"><h2>Ostré odosielanie <button class="btn btn-s ${e.ostro ? 'btn-d' : 'btn-p'}" data-a="ostro" data-v="${e.ostro ? 0 : 1}">${e.ostro ? 'Vypnúť (nanečisto)' : 'Zapnúť ostro'}</button></h2><p class="mut">Kým je vypnuté, engine všetko pripraví, ale e-maily len uloží do outboxu. Zapnite, keď sú schránky zahriate a texty schválené.</p></div>
      <div class="card" style="margin-top:12px"><h2>Schránky</h2>${sch.length ? `<table><thead><tr><th>E-mail</th><th>Účel</th><th>Stav</th><th class="r">Dnes</th><th class="r">Limit / deň</th><th>Odosiela od</th><th></th></tr></thead><tbody>${sch.map(s => `<tr><td><b>${esc(s.email)}</b><br><span class="mut">${esc(s.meno || '')} · ${esc(s.smtp_host || '')}</span></td><td>${s.ucel === 'notif' ? '<span class="st st-blue">notifikácie a faktúry</span>' : 'odosielanie'}</td><td>${s.aktivna ? '<span class="st st-ok">aktívna</span>' : '<span class="st">vypnutá</span>'}</td><td class="r">${fmt(s.dnes || 0)}</td><td class="r">${fmt(s.denny_limit)}</td><td>${esc(s.start || '–')}</td><td><button class="btn btn-s" data-a="schranka-stav" data-email="${esc(s.email)}" data-v="${s.aktivna ? 0 : 1}">${s.aktivna ? 'Vypnúť' : 'Zapnúť'}</button></td></tr>`).join('')}</tbody></table>` : '<p class="note">Zatiaľ nemáme žiadnu schránku. Pridajte odosielacie schránky (napr. rafael@getmailito.eu) a jednu notifikačnú (info@mailito.eu) na upozornenia a faktúry.</p>'}</div>
      <div class="card" style="margin-top:12px"><h2>Odoslané za 30 dní</h2>${dni.length ? `<div class="chart">${dni.map(([dd, x]) => `<i style="height:${Math.max(2, x.odoslane / mx * 100)}%" data-t="${dd}: ${x.odoslane} odoslaných, ${x.zaujemcovia} záujemcov"></i>`).join('')}</div>` : '<p class="mut">Zatiaľ nič neodišlo.</p>'}</div>
      <div class="card" style="margin-top:12px"><h2>Posledné príkazy</h2><table><tbody>${d.prikazy.map(p => `<tr><td class="mut nw">${dt(p.vytvorene)}</td><td>${esc(AKCIA[p.akcia] || p.akcia)}</td><td class="mono">${esc(p.campaign_id || '')}</td><td>${p.stav === 'hotovo' ? '<span class="st st-ok">vykonané</span>' : p.stav === 'chyba' ? '<span class="st st-bad">chyba</span>' : '<span class="st st-warn">čaká</span>'}</td><td class="mut">${esc(p.vysledok || '')}</td></tr>`).join('') || '<tr><td class="mut">Žiadne.</td></tr>'}</tbody></table></div>`;
  }

  // ---------- databáza ----------
  async function vDatabaza() {
    const d = await api('/api/adm/databaza'); const x = d.db || {};
    const tab = o => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<tr><td>${esc(k)}</td><td class="r">${fmt(n)}</td></tr>`).join('');
    return `<div class="ph"><div><h1>Databáza a blocklist</h1><p>Firmy, z ktorých vyberáme cieľovky, a adresy, ktoré nikdy neoslovíme.</p></div></div>
      <div class="grid g4"><div class="card kpi dark"><small>Firiem s e-mailom</small><b>${fmt(x.firmy)}</b><span>${x.aktualizovane ? 'aktualizované ' + esc(x.aktualizovane) : 'údaje pošle engine'}</span></div>
        <div class="card kpi"><small>V kampaniach</small><b>${fmt(x.v_kampaniach)}</b><span>príjemcov spolu</span></div>
        <div class="card kpi"><small>Blocklist</small><b>${fmt(d.suppress_n)}</b><span>odhlásené adresy a domény</span></div>
        <div class="card kpi"><small>Už oslovené</small><b>${fmt(x.oslovene)}</b><span>firiem aspoň raz</span></div></div>
      <div class="grid g2" style="margin-top:12px"><div class="card"><h2>Podľa odvetvia</h2><table><tbody>${tab(x.segmenty) || '<tr><td class="mut">Údaje pošle engine pri ďalšej synchronizácii.</td></tr>'}</tbody></table></div>
        <div class="card"><h2>Podľa kraja</h2><table><tbody>${tab(x.kraje) || '<tr><td class="mut">–</td></tr>'}</tbody></table></div></div>
      <div class="card" style="margin-top:12px"><h2>Pridať do blocklistu</h2><div class="f2"><label>E-maily alebo domény (@firma.sk), každý na nový riadok<textarea id="supE" style="min-height:80px"></textarea></label><label>Dôvod<input id="supD" placeholder="napr. sťažnosť, konkurencia"></label></div><div class="acts" style="margin-top:10px"><button class="btn btn-p" data-a="suppress">Pridať</button></div></div>
      <div class="card" style="margin-top:12px"><h2>Posledné záznamy blocklistu</h2><table><thead><tr><th>Adresa</th><th>Zdroj</th><th>Dôvod</th><th>Kedy</th></tr></thead><tbody>${d.suppress.map(s => `<tr><td class="mono">${esc(s.email)}</td><td>${esc(s.zdroj || '')}</td><td class="mut">${esc(s.dovod || '')}</td><td class="mut nw">${dt(s.ts)}</td></tr>`).join('') || '<tr><td class="mut" colspan="4">Prázdny.</td></tr>'}</tbody></table></div>`;
  }

  // ---------- AI ----------
  async function vAi() {
    const d = await api('/api/adm/ai');
    const TYP = { kampan: 'Príprava kampane', texty: 'Úprava textov', chat: 'Asistent', ukazka: 'Ukážka e-mailu', odhad: 'Počet firiem' };
    return `<div class="ph"><div><h1>AI úlohy</h1><p>Úlohy z webu a objednávky (posledných 150).</p></div></div>
      <p class="note ${d.ai_cloud ? 'ok' : ''}" style="margin-bottom:12px">${d.ai_cloud ? 'AI beží v cloude, Mac nemusí byť zapnutý.' : 'AI zatiaľ spracúva Mac. Keď je vypnutý, AI na webe neodpovedá. Na zapnutie cloudu treba kľúč Claude API.'}</p>
      <div class="tw"><table><thead><tr><th>Kedy</th><th>Typ</th><th>Stav</th><th>Trvanie</th><th>Vstup</th></tr></thead><tbody>${d.ulohy.map(u => { const s = u.hotove && u.vytvorene ? Math.round((new Date(u.hotove.replace(' ', 'T') + 'Z') - new Date(u.vytvorene.replace(' ', 'T') + 'Z')) / 1000) : null; return `<tr><td class="mut nw">${dt(u.vytvorene)}</td><td>${esc(TYP[u.typ] || u.typ)}</td><td>${u.stav === 'hotovo' ? '<span class="st st-ok">hotovo</span>' : u.stav === 'chyba' ? `<span class="st st-bad">chyba</span><br><span class="mut">${esc(u.chyba || '')}</span>` : `<span class="st st-warn">${esc(u.stav)}</span>`}</td><td class="nw">${s != null && s >= 0 ? s + ' s' : '–'}</td><td class="mut" style="max-width:420px">${esc((u.vstup || '').replace(/[{}"]/g, ' ').slice(0, 160))}</td></tr>`; }).join('') || '<tr><td class="empty" colspan="5">Žiadne úlohy.</td></tr>'}</tbody></table></div>`;
  }

  // ---------- web ----------
  async function vWeb() {
    const d = await api('/api/adm/web?dni=30');
    const mx = Math.max(1, ...d.po_dnoch.map(x => x.zobrazenia));
    const t = (l, k) => l.map(x => `<tr><td>${esc(x[k] || '(priamo)')}</td><td class="r">${fmt(x.pocet)}</td></tr>`).join('') || '<tr><td class="mut">Zatiaľ nič.</td></tr>';
    return `<div class="ph"><div><h1>Návštevnosť webu</h1><p>Posledných 30 dní, bez cookies a osobných údajov.</p></div></div>
      <div class="card"><h2>Zobrazenia po dňoch</h2>${d.po_dnoch.length ? `<div class="chart">${d.po_dnoch.map(x => `<i style="height:${Math.max(2, x.zobrazenia / mx * 100)}%" data-t="${x.den}: ${x.zobrazenia} zobrazení"></i>`).join('')}</div>` : '<p class="mut">Zatiaľ žiadne dáta.</p>'}</div>
      <div class="grid g3" style="margin-top:12px"><div class="card"><h2>Stránky</h2><table><tbody>${t(d.stranky, 'stranka')}</tbody></table></div><div class="card"><h2>Zdroje</h2><table><tbody>${t(d.zdroje, 'zdroj')}</tbody></table></div><div class="card"><h2>Udalosti</h2><table><tbody>${t(d.udalosti, 'nazov')}</tbody></table></div></div>`;
  }

  // ---------- akcie ----------
  function bind(m, v, id) {
    $$('tr.cl', m).forEach(r => r.addEventListener('click', e => { if (!e.target.closest('a,button')) location.hash = r.dataset.href; }));
    const filt = (inp, list, rows, f) => inp && inp.addEventListener('input', () => { const q = inp.value.toLowerCase(); rows(list.filter(x => f(x).toLowerCase().includes(q))); });
    filt($('#fK', m), KLIENTI, l => { $('#klRows').innerHTML = klRows(l); bind($('#klRows'), v); }, k => [k.firma, k.meno, k.email, k.ico].join(' '));
    filt($('#fL', m), LEADY, l => { $('#lBox').innerHTML = leadTab(l); }, x => [x.firma, x.klient_firma, x.zhrnutie, x.odpoved, x.email].join(' '));
    const kf = () => { const q = ($('#fQ', m)?.value || '').toLowerCase(), s = $('#fS', m)?.value; $('#kRows').innerHTML = kRows(KAMPANE.filter(k => (!s || k.stav === s) && [k.nazov, k.klient_firma, k.klient_email, k.id].join(' ').toLowerCase().includes(q))); bind($('#kRows'), v); };
    $('#fQ', m)?.addEventListener('input', kf); $('#fS', m)?.addEventListener('change', kf);
    $$('[data-a]', m).forEach(b => b.addEventListener('click', () => akcia(b, v, id)));
  }
  const prikaz = async (akcia, data = {}, cid = null) => { await api('/api/adm/prikaz', { akcia, data, campaign_id: cid }); toast('Príkaz odoslaný. Engine ho vykoná do 5 minút.'); route(); };
  async function akcia(b, v, id) {
    const a = b.dataset.a;
    try {
      if (a === 'nova-faktura') return novaFaktura({ klient: b.dataset.klient, kampan: b.dataset.kampan, suma: b.dataset.suma });
      if (a === 'zaplatene') { if (!confirm('Označiť objednávku ako zaplatenú? Engine potom kampaň sám spustí.')) return; await api('/api/adm/platba', { id: b.dataset.id, platba: 'zaplatene' }); toast('Označené ako zaplatené.'); return route(); }
      if (a === 'fakt-udaje') { const d = await api('/api/adm/klient?id=' + b.dataset.id); const f = d.klient.fakturacne || {}; const txt = [f.firma || d.klient.firma, f.ulica, [f.psc, f.mesto].filter(Boolean).join(' '), 'IČO: ' + (f.ico || '–'), f.dic ? 'DIČ: ' + f.dic : '', f.icdph ? 'IČ DPH: ' + f.icdph : '', 'E-mail: ' + (f.email || d.klient.email)].filter(Boolean).join('\n'); modal(`<h2>Fakturačné údaje</h2><pre class="mail">${esc(txt)}</pre><div class="acts"><button class="btn btn-p" id="cp">Kopírovať</button><button class="btn" data-zavri>Zavrieť</button></div>`); $('#cp').onclick = () => { navigator.clipboard.writeText(txt); toast('Skopírované.'); }; return; }
      if (a === 'kopiruj-fakt') { navigator.clipboard.writeText($('#faktDl').innerText); return toast('Skopírované.'); }
      if (a === 'pdf') { const r = await fetch(API + '/api/adm/faktura-pdf?id=' + b.dataset.id, { headers: { Authorization: 'Bearer ' + store.get(TK) } }); if (!r.ok) throw new Error('PDF sa nepodarilo načítať.'); open(URL.createObjectURL(await r.blob()), '_blank'); return; }
      if (a === 'fstav') { await api('/api/adm/faktura-stav', { id: b.dataset.id, stav: b.dataset.v }); toast('Uložené.'); return route(); }
      if (a === 'prikaz') { const t = { spustit: 'Spustiť kampaň? Odosielať sa začne v pracovnom čase.', ukoncit: 'Naozaj ukončiť kampaň? Ďalšie e-maily už neodídu.', pauza: 'Pozastaviť kampaň?', pokracovat: 'Pokračovať v kampani?' }[b.dataset.akcia]; if (t && !confirm(t)) return; return prikaz(b.dataset.akcia, {}, id); }
      if (a === 'limit') { const n = prompt('Koľko nových firiem denne má kampaň osloviť?', b.dataset.v); if (n && +n > 0) return prikaz('limit', { novych_den: Math.round(+n) }, id); return; }
      if (a === 'schranky-k') { const cur = JSON.parse(b.dataset.v), all = JSON.parse(b.dataset.all); if (!all.length) return toast('Najprv pridajte schránky v časti Rozosielka.'); const c = modal(`<h2>Schránky kampane</h2>${all.map(e => `<label style="display:flex;gap:8px;align-items:center;color:var(--tx)"><input type="checkbox" value="${esc(e)}" ${cur.includes(e) ? 'checked' : ''} style="width:auto">${esc(e)}</label>`).join('')}<div class="acts"><button class="btn btn-p" id="sGo">Uložiť</button><button class="btn" data-zavri>Zrušiť</button></div>`); $('#sGo', c).onclick = () => { zavri(); prikaz('schranky', { schranky: $$('input:checked', c).map(i => i.value) }, id); }; return; }
      if (a === 'ulozit-texty') { const tx = []; $$('[data-t="text"]', $('#main')).forEach(t => { const i = +t.dataset.i, pr = $(`[data-t="predmet"][data-i="${i}"]`, $('#main')); tx[i] = { text: t.value, po_dnoch: +t.dataset.dni || (i ? (i === 1 ? 4 : 9) : 0), ...(pr ? { predmet: pr.value.split('|').map(s => s.trim()).filter(Boolean) } : {}) }; }); if (!tx[0]?.predmet?.length) return toast('Prvý e-mail potrebuje predmet.'); return prikaz('texty', { texty: tx }, id); }
      if (a === 'portal') { const r = await api('/api/adm/klient-portal', { id: b.dataset.id }); if (!confirm('Otvorí sa portál prihlásený za klienta. Vaše vlastné prihlásenie do portálu na tomto prehliadači sa tým nahradí. Pokračovať?')) return; localStorage.setItem('mailito_token', r.token); open('../portal/', '_blank'); return; }
      if (a === 'heslo') { if (!confirm('Vygenerovať klientovi nové heslo? Staré prestane platiť.')) return; const r = await api('/api/adm/klient-heslo', { id: b.dataset.id }); modal(`<h2>Nové heslo</h2><p>Pošlite ho klientovi. Ukazujeme ho len teraz.</p><pre class="mail">${esc(r.heslo)}</pre><div class="acts"><button class="btn btn-p" id="cp">Kopírovať</button><button class="btn" data-zavri>Zavrieť</button></div>`); $('#cp').onclick = () => { navigator.clipboard.writeText(r.heslo); toast('Skopírované.'); }; return; }
      if (a === 'klient-uprava') { const k = KLIENT.klient, f = k.fakturacne || {}; const c = modal(`<h2>Údaje klienta</h2><div class="f2"><label>Meno<input name="meno" value="${esc(k.meno || '')}"></label><label>E-mail (prihlásenie)<input name="email" value="${esc(k.email)}"></label><label>Telefón<input name="telefon" value="${esc(k.telefon || '')}"></label><label>Stav<select name="stav"><option value="aktivny">aktívny</option><option value="pozastaveny"${k.stav === 'pozastaveny' ? ' selected' : ''}>pozastavený</option></select></label></div><h2 style="font-size:1rem">Fakturačné</h2><div class="f2">${['firma', 'ico', 'dic', 'icdph', 'ulica', 'psc', 'mesto', 'email'].map(x => `<label>${{ firma: 'Firma', ico: 'IČO', dic: 'DIČ', icdph: 'IČ DPH', ulica: 'Ulica', psc: 'PSČ', mesto: 'Mesto', email: 'E-mail pre faktúry' }[x]}<input data-f="${x}" value="${esc(f[x] || (x === 'firma' ? k.firma : x === 'ico' ? k.ico : '') || '')}"></label>`).join('')}</div><p class="msg" id="kMsg"></p><div class="acts"><button class="btn btn-p" id="kGo">Uložiť</button><button class="btn" data-zavri>Zrušiť</button></div>`); $('#kGo', c).onclick = async () => { const fk = Object.fromEntries($$('[data-f]', c).map(i => [i.dataset.f, i.value.trim()])); try { await api('/api/adm/klient-uprava', { id: k.id, meno: $('[name=meno]', c).value, email: $('[name=email]', c).value, telefon: $('[name=telefon]', c).value, stav: $('[name=stav]', c).value, firma: fk.firma, ico: fk.ico, fakturacne: fk }); zavri(); toast('Uložené.'); route(); } catch (e) { $('#kMsg', c).textContent = e.message; } }; return; }
      if (a === 'suppress') { const em = $('#supE').value.split(/[\s,;]+/).filter(Boolean); const r = await api('/api/adm/suppress', { emaily: em, dovod: $('#supD').value }); toast(`Pridané: ${r.n}. Engine ich vyradí zo všetkých kampaní.`); return route(); }
      if (a === 'ostro') { const on = b.dataset.v === '1'; if (!confirm(on ? 'Zapnúť ostré odosielanie? E-maily začnú naozaj odchádzať firmám.' : 'Vypnúť ostré odosielanie? E-maily sa budú len ukladať.')) return; return prikaz('ostro', { zapnut: on }); }
      if (a === 'schranka-stav') return prikaz('schranka_stav', { email: b.dataset.email, aktivna: b.dataset.v === '1' });
      if (a === 'nova-schranka') {
        const c = modal(`<h2>Pridať schránku</h2><p class="mut">Heslo pošleme len enginu, z databázy sa po uložení zmaže.</p>
          <div class="f2"><label>E-mail<input name="email" placeholder="rafael@getmailito.eu"></label><label>Meno odosielateľa<input name="meno" placeholder="Rafael z Mailito"></label>
          <label>SMTP server<input name="smtp_host" placeholder="smtp.example.com"></label><label>SMTP port<input name="smtp_port" value="465"></label>
          <label>IMAP server<input name="imap_host" placeholder="imap.example.com"></label><label>IMAP port<input name="imap_port" value="993"></label>
          <label>Prihlasovacie meno<input name="user" placeholder="zvyčajne e-mail"></label><label>Heslo<input name="heslo" type="password" autocomplete="new-password"></label>
          <label>Denný limit<input name="denny_limit" type="number" value="40"></label><label>Odosielať od (zahrievanie)<input name="start" type="date" value="${new Date().toISOString().slice(0, 10)}"></label>
          <label>Účel<select name="ucel"><option value="">Odosielanie kampaní</option><option value="notif">Notifikácie a faktúry (info@mailito.eu)</option></select></label><label>Stav<select name="aktivna"><option value="1">aktívna</option><option value="0">vypnutá</option></select></label></div>
          <p class="msg" id="sMsg"></p><div class="acts"><button class="btn btn-p" id="sGo">Uložiť</button><button class="btn" data-zavri>Zrušiť</button></div>`);
        $('#sGo', c).onclick = async () => { const d = Object.fromEntries($$('input,select', c).map(i => [i.name, i.value.trim()])); d.smtp_port = +d.smtp_port || 465; d.imap_port = +d.imap_port || 993; d.denny_limit = +d.denny_limit || 40; d.aktivna = d.aktivna === '1'; if (!d.user) d.user = d.email; if (!d.ucel) delete d.ucel; try { await api('/api/adm/prikaz', { akcia: 'schranka', data: d }); zavri(); toast('Schránka odoslaná enginu.'); route(); } catch (e) { $('#sMsg', c).textContent = e.message; } };
        return;
      }
    } catch (e) { toast(e.message); }
  }

  async function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    try { const d = await api('/api/adm/prehlad'); engineStav(d.engine); const pl = d.platby.filter(x => x.platba !== 'zaplatene').reduce((a, x) => a + x.n, 0); $('#nObj').textContent = pl || ''; } catch {}
    route();
  }
  if (store.get(TK)) start(); else showLogin();
})();
