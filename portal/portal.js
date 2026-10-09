(() => {
  const API = 'https://mailito-api.webhunter.workers.dev';
  const TK = 'mailito_token';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(+n || 0).toLocaleString('sk-SK').replace(/ /g, ' ');
  const pct = (a, b) => b ? (a / b * 100).toLocaleString('sk-SK', { maximumFractionDigits: 1 }) + ' %' : '–';
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const dt = s => { if (!s) return ''; const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z'); return d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' }) + ' ' + d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }); };
  const ago = s => { if (!s) return ''; const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z'); const m = Math.round((Date.now() - d) / 60000); if (m < 60) return `pred ${Math.max(1, m)} min`; if (m < 1440) return `pred ${Math.round(m / 60)} h`; return dt(s); };

  const STAVY = { novy: 'Nový', kontaktovany: 'Kontaktovaný', stretnutie: 'Stretnutie', ponuka: 'Ponuka', obchod: 'Obchod', neaktualny: 'Neaktuálny', reklamacia: 'Reklamácia' };
  const CSTAV = { objednana: 'Objednaná · čaká na úhradu', priprava: 'V príprave', na_schvalenie: 'Na schválenie', schvalena: 'Schválená', bezi: 'Beží', pauza: 'Pozastavená', hotova: 'Dokončená' };
  const TEPL = { horuci: 'Horúci', teply: 'Teplý', neskor: 'Neskôr' };
  const cena = n => { let p = 0, od = 0; for (const [d, c] of [[1000, .149], [3000, .10], [10000, .08], [Infinity, .06]]) { if (n > od) p += (Math.min(n, d) - od) * c; od = d; } return Math.round(p / 10) * 10 - 1; };
  const BALIK = { test: '1 000 firiem · 149 €', kampan: '3 500 firiem · 389 €', vykon: 'Platba za záujemcu' };
  const balik = b => BALIK[b] || (/^\d+$/.test(b || '') ? `${fmt(+b)} + 100 firiem · ${fmt(cena(+b))} €` : b);
  { const sel = document.getElementById('nkPocet'); if (sel) { let o = ''; for (let n = 1000; n <= 20000; n += 500) o += `<option value="${n}" ${n === 3500 ? 'selected' : ''}>${fmt(n)} + 100 firiem · ${fmt(cena(n))} €</option>`; sel.innerHTML = o; } }

  const demo = new URLSearchParams(location.search).has('demo');
  const embed = new URLSearchParams(location.search).has('embed');
  let S = { klient: null, kampane: [], leady: [], udalosti: [], leadStat: [] };
  let filt = { stav: 'vsetko', q: '', kampan: '' };

  // ---------- API ----------
  async function api(path, body) {
    const r = await fetch(API + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (store.get(TK) || '') },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({ ok: false, chyba: 'Chyba spojenia.' }));
    if (r.status === 401 && path !== '/api/login') { logout(); throw new Error(j.chyba); }
    if (!j.ok) throw new Error(j.chyba || 'Chyba');
    return j;
  }
  async function load() {
    if (demo) { S = demoData(); return; }
    const [me, ld, fk] = await Promise.all([api('/api/me'), api('/api/leads'), api('/api/faktury').catch(() => ({ faktury: [] }))]);
    S = { klient: me.klient, kampane: me.kampane, leady: ld.leady, udalosti: me.udalosti, leadStat: me.leady, faktury: fk.faktury || [] };
  }
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }

  // ---------- auth ----------
  function showLogin() { $('#login').hidden = false; $('#app').hidden = true; }
  function logout() { store.set(TK, null); if (demo) location.href = './'; else showLogin(); }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)); const m = $('#loginMsg');
    m.className = 'form-msg'; m.textContent = 'Prihlasujem…';
    try {
      const j = await api('/api/login', f);
      store.set(TK, j.token); m.textContent = '';
      await start();
    } catch (err) { m.className = 'form-msg err'; m.textContent = err.message; }
  });
  $('#btnLogout').onclick = logout;

  // ---------- routing ----------
  const TITLES = { prehlad: 'Prehľad', zaujemcovia: 'Záujemcovia', kampane: 'Kampane', kampan: 'Kampaň', ucet: 'Účet' };
  function route() {
    const [v, id] = (location.hash.slice(1) || 'prehlad').split('/');
    const view = TITLES[v] ? v : 'prehlad';
    $$('.side-nav a').forEach(a => a.classList.toggle('on', a.dataset.v === (view === 'kampan' ? 'kampane' : view)));
    $('#topH').textContent = TITLES[view];
    const html = { prehlad: vPrehlad, zaujemcovia: vLeads, kampane: vKampane, kampan: () => vKampan(id), ucet: vUcet }[view]();
    $('#view').innerHTML = html;
    $('#side').classList.remove('open');
    const n = S.leady.filter(l => l.stav === 'novy').length;
    $('#badgeNew').hidden = !n; $('#badgeNew').textContent = n;
    scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  $('#sideBurger').onclick = () => $('#side').classList.toggle('open');

  // ---------- views ----------
  function sum(k) { return S.kampane.reduce((a, c) => a + (+c[k] || 0), 0); }
  function vPrehlad() {
    const obchody = S.leady.filter(l => l.stav === 'obchod');
    const hodnota = obchody.reduce((a, l) => a + (+l.hodnota_eur || 0), 0);
    const waiting = S.kampane.filter(c => c.stav === 'na_schvalenie');
    const days = {};
    S.kampane.forEach(c => Object.entries(c.denne || {}).forEach(([d, v]) => { const x = days[d] ||= { odoslane: 0, odpovede: 0, zaujemcovia: 0 }; for (const k in x) x[k] += +v[k] || 0; }));
    const keys = Object.keys(days).sort().slice(-21);
    const max = Math.max(1, ...keys.map(k => days[k].odoslane));
    const recent = S.leady.slice(0, 6);
    return `
      ${waiting.map(c => `<div class="alert"><p><b>${esc(c.nazov)}</b> čaká na vaše schválenie. Skontrolujte texty a cieľovú skupinu.</p><a class="btn btn-ink btn-sm" href="#kampan/${esc(c.id)}">Skontrolovať →</a></div>`).join('')}
      <div class="grid g4">
        <div class="card kpi"><small>Oslovené firmy</small><b>${fmt(sum('odoslane'))}</b><span>z ${fmt(sum('pocet_firiem'))} vybraných</span></div>
        <div class="card kpi"><small>Odpovede</small><b>${fmt(sum('odpovede'))}</b><span>${pct(sum('odpovede'), sum('odoslane'))} z oslovených</span></div>
        <div class="card kpi hot"><small>Záujemcovia</small><b>${fmt(S.leady.length)}</b><span>${S.leady.filter(l => l.stav === 'novy').length} čaká na kontakt</span></div>
        <div class="card kpi"><small>Obchody</small><b>${fmt(obchody.length)}</b><span>${hodnota ? fmt(hodnota) + ' € hodnota' : 'zapíšte pri záujemcovi'}</span></div>
      </div>
      <div class="grid g2" style="margin-top:1.2rem">
        <div class="card">
          <div class="card-h"><h2>Priebeh po dňoch</h2><span class="muted" style="font-size:.8rem">posledných ${keys.length} dní</span></div>
          ${keys.length ? `<div class="chart">${keys.map(k => `<div class="col" data-t="${esc(k.slice(8, 10) + '. ' + k.slice(5, 7) + '. · ' + days[k].odoslane + ' odoslaných · ' + days[k].zaujemcovia + ' záujemcov')}">${days[k].zaujemcovia ? `<span class="zn">${days[k].zaujemcovia}</span>` : ''}<span class="bar" style="height:${days[k].odoslane / max * 78}%"></span></div>`).join('')}</div>
          <div class="legend"><span><i style="background:#E6EAF0;border-top:2px solid var(--tx)"></i>Odoslané</span><span><i style="background:var(--red);border-radius:50%"></i>Počet záujemcov v daný deň</span></div>` : '<p class="empty">Graf sa zobrazí po spustení kampane.</p>'}
        </div>
        <div class="card">
          <div class="card-h"><h2>Čo sa deje</h2></div>
          ${S.udalosti.length ? `<ul class="feed">${S.udalosti.slice(0, 14).map(e => `<li><time>${esc(ago(e.ts))}</time><span class="t-${esc(e.typ)}">${esc(e.text)}</span></li>`).join('')}</ul>` : '<p class="empty">Zatiaľ nič. Hneď ako sa niečo stane, uvidíte to tu.</p>'}
        </div>
      </div>
      <div class="card" style="margin-top:1.2rem">
        <div class="card-h"><h2>Najnovší záujemcovia</h2><a href="#zaujemcovia">Všetci →</a></div>
        ${leadTable(recent)}
      </div>`;
  }

  function leadTable(rows) {
    if (!rows.length) return '<p class="empty">Zatiaľ žiadni záujemcovia. Prví zvyčajne prídu v deň spustenia kampane.</p>';
    const camp = id => S.kampane.find(c => c.id === id)?.nazov || '';
    return `<div class="tbl-wrap"><table><thead><tr><th>Firma</th><th>Čo napísali</th><th>Stav</th><th>Prišlo</th></tr></thead><tbody>
      ${rows.map(l => `<tr data-lead="${esc(l.id)}">
        <td class="firm"><b><span class="temp temp-${esc(l.teplota || 'teply')}" title="${esc(TEPL[l.teplota] || '')}"></span>${esc(l.firma || l.email)}</b><span>${esc([l.kontakt, l.mesto].filter(Boolean).join(' · '))}</span></td>
        <td class="q"><span>${esc(l.zhrnutie || l.odpoved || '')}</span><small>${esc(camp(l.campaign_id))}</small></td>
        <td><span class="st st-${esc(l.stav)}">${esc(STAVY[l.stav] || l.stav)}</span></td>
        <td><small>${esc(ago(l.vytvorene))}</small></td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function vLeads() {
    const counts = { vsetko: S.leady.length };
    S.leady.forEach(l => counts[l.stav] = (counts[l.stav] || 0) + 1);
    const q = filt.q.toLowerCase();
    const rows = S.leady.filter(l => (filt.stav === 'vsetko' || l.stav === filt.stav) && (!filt.kampan || l.campaign_id === filt.kampan)
      && (!q || [l.firma, l.kontakt, l.email, l.mesto, l.odpoved, l.zhrnutie].join(' ').toLowerCase().includes(q)));
    return `
      <div class="tabs">${['vsetko', ...Object.keys(STAVY)].filter(k => k === 'vsetko' || counts[k]).map(k => `<button class="tab ${filt.stav === k ? 'on' : ''}" data-stav="${k}">${k === 'vsetko' ? 'Všetci' : STAVY[k]}<b>${counts[k] || 0}</b></button>`).join('')}</div>
      <div class="toolbar">
        <input type="search" id="leadQ" placeholder="Hľadať firmu, mesto, text…" value="${esc(filt.q)}">
        <select id="leadCamp"><option value="">Všetky kampane</option>${S.kampane.map(c => `<option value="${esc(c.id)}" ${filt.kampan === c.id ? 'selected' : ''}>${esc(c.nazov)}</option>`).join('')}</select>
        <button class="btn btn-ghost btn-sm" id="btnCsv" type="button">Export CSV</button>
      </div>
      ${leadTable(rows)}`;
  }

  function vKampane() {
    if (!S.kampane.length) return `<div class="card empty"><p>Zatiaľ nemáte žiadnu kampaň.</p><p style="margin-top:1rem"><button class="btn btn-red" data-nova>+ Zadať prvú kampaň</button></p></div>`;
    return `<div class="camps">${S.kampane.map(c => `
      <a class="card camp" href="#kampan/${esc(c.id)}">
        <span class="cs cs-${esc(c.stav)}">${esc(CSTAV[c.stav] || c.stav)}</span>
        <h3>${esc(c.nazov)}</h3>
        <p>${esc(c.ciel || '')}</p>
        <div class="progress"><i style="width:${c.pocet_firiem ? Math.min(100, c.odoslane / c.pocet_firiem * 100) : 0}%"></i></div>
        <div class="funnel">
          <div><small>Vybrané</small><b>${fmt(c.pocet_firiem)}</b></div>
          <div><small>Oslovené</small><b>${fmt(c.odoslane)}</b></div>
          <div><small>Odpovede</small><b>${fmt(c.odpovede)}</b></div>
          <div class="z"><small>Záujem</small><b>${fmt(c.zaujemcovia)}</b></div>
        </div>
      </a>`).join('')}</div>`;
  }

  function vKampan(id) {
    const c = S.kampane.find(x => x.id === id);
    if (!c) return '<p class="empty">Kampaň sa nenašla.</p>';
    const leads = S.leady.filter(l => l.campaign_id === c.id);
    const ev = S.udalosti.filter(e => e.campaign_id === c.id);
    return `
      <p style="margin-bottom:1rem"><a href="#kampane" class="linkbtn">← Späť na kampane</a></p>
      ${c.stav === 'na_schvalenie' ? `<div class="alert"><p><b>Táto kampaň čaká na vaše schválenie.</b> Ak je všetko v poriadku, kliknite na Schváliť. Ak chcete niečo zmeniť, napíšte pripomienku nižšie.</p><button class="btn btn-red btn-sm" data-approve="${esc(c.id)}">Schváliť a spustiť</button></div>` : ''}
      <div class="grid g4">
        <div class="card kpi"><small>Vybrané firmy</small><b>${fmt(c.pocet_firiem)}</b><span>${esc(CSTAV[c.stav])}</span></div>
        <div class="card kpi"><small>Oslovené</small><b>${fmt(c.odoslane)}</b><span>${pct(c.odoslane, c.pocet_firiem)} z výberu</span></div>
        <div class="card kpi"><small>Odpovede</small><b>${fmt(c.odpovede)}</b><span>${pct(c.odpovede, c.odoslane)} · odhlásení ${fmt(c.odhlasenia)}</span></div>
        <div class="card kpi hot"><small>Záujemcovia</small><b>${fmt(c.zaujemcovia)}</b><span>${pct(c.zaujemcovia, c.odoslane)} z oslovených</span></div>
      </div>
      <div class="cdet" style="margin-top:1.2rem">
        <div class="card">
          <div class="card-h"><h2>Texty e-mailov</h2><span class="muted" style="font-size:.8rem">${(c.texty || []).length} ${(c.texty || []).length === 1 ? 'správa' : 'správy'}</span></div>
          ${(c.texty || []).length ? c.texty.map((t, i) => `<div class="mail"><div class="mail-h"><span>${i === 0 ? 'Úvodný e-mail' : i + '. pripomienka'}</span><span>${i === 0 ? 'deň 1' : 'po ' + esc(t.po_dnoch || 3) + ' dňoch, ak neodpovedia'}</span></div><p class="mail-s">${esc(t.predmet || '(rovnaké vlákno)')}</p><p class="mail-b">${esc(t.text)}</p></div>`).join('') : '<p class="empty">Texty pripravujeme.</p>'}
          <div class="comment">
            <label for="koment" style="font-weight:600;font-size:.9rem">Pripomienka k textom alebo cieľovke</label>
            <textarea id="koment" rows="3" placeholder="Napr. Spomeňte aj, že máme certifikát ISO 9001."></textarea>
            <button class="btn btn-ghost btn-sm" data-comment="${esc(c.id)}" style="justify-self:start">Poslať pripomienku</button>
            ${(c.pripomienky || []).map(p => `<p class="sum"><b>${esc(dt(p.ts))}</b><span>${esc(p.text)}</span></p>`).join('')}
          </div>
        </div>
        <div class="grid">
          <div class="card">
            <div class="card-h"><h2>Cieľová skupina</h2></div>
            <dl class="dl">
              <dt>Popis</dt><dd>${esc(c.ciel || '–')}</dd>
              <dt>Odvetvia</dt><dd><span class="chips-s">${(c.segmenty || []).map(s => `<span>${esc(s)}</span>`).join('') || '–'}</span></dd>
              <dt>Kraje</dt><dd>${esc((c.kraje || []).join(', ') || 'celé Slovensko')}</dd>
              <dt>Štart</dt><dd>${esc(c.start || '–')}</dd>
              ${c.schvalene ? `<dt>Schválené</dt><dd>${esc(dt(c.schvalene))}</dd>` : ''}
            </dl>
          </div>
          <div class="card">
            <div class="card-h"><h2>Udalosti</h2></div>
            ${ev.length ? `<ul class="feed">${ev.map(e => `<li><time>${esc(ago(e.ts))}</time><span class="t-${esc(e.typ)}">${esc(e.text)}</span></li>`).join('')}</ul>` : '<p class="muted">Zatiaľ nič.</p>'}
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:1.2rem"><div class="card-h"><h2>Záujemcovia z tejto kampane</h2></div>${leadTable(leads)}</div>`;
  }

  function vUcet() {
    const k = S.klient || {};
    return `<div class="grid g2">
      <div class="card">
        <div class="card-h"><h2>Firma</h2></div>
        <dl class="dl">
          <dt>Firma</dt><dd>${esc(k.firma || '–')}</dd>
          <dt>Kontakt</dt><dd>${esc(k.meno || '–')}</dd>
          <dt>E-mail</dt><dd>${esc(k.email || '–')}</dd>
          <dt>IČO</dt><dd>${esc(k.ico || '–')}</dd>
          <dt>Posledná objednávka</dt><dd>${esc(balik(k.balik) || '–')}</dd>
          ${k.balik === 'vykon' ? `<dt>Kredit</dt><dd>${fmt((k.kredit_cent || 0) / 100)} € · ${fmt((k.cena_leadu_cent || 3900) / 100)} € za záujemcu</dd>` : ''}
        </dl>
        <p class="muted" style="font-size:.85rem;margin-top:1.2rem">Zmenu fakturačných údajov alebo balíka nám napíšte na <a href="mailto:info.webhunter@email.cz" style="color:var(--red)">info.webhunter@email.cz</a>.</p>
      </div>
      <div class="card">
        <div class="card-h"><h2>Zmena hesla</h2></div>
        <form id="passForm" class="form form-flat" style="margin-top:0">
          <label>Súčasné heslo<input type="password" name="stare" autocomplete="current-password" required></label>
          <label>Nové heslo<input type="password" name="nove" autocomplete="new-password" minlength="8" required></label>
          <button class="btn btn-ink" type="submit">Zmeniť heslo</button>
          <p class="form-msg" id="passMsg"></p>
        </form>
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <div class="card-h"><h2>Faktúry</h2></div>
      ${(S.faktury || []).length ? `<dl class="dl">${S.faktury.map(f => `<dt>č. ${esc(f.cislo)}</dt><dd>${f.suma_eur != null ? fmt(f.suma_eur) + ' € · ' : ''}${f.stav === 'zaplatena' ? 'zaplatená' : f.splatnost ? 'splatná do ' + esc(f.splatnost.split('-').reverse().join('. ')) : ''} · <a href="#" data-faktura="${esc(f.id)}" style="color:var(--red)">Stiahnuť PDF</a></dd>`).join('')}</dl>` : '<p class="muted">Zatiaľ žiadne faktúry. Po objednávke ju tu nájdete a pošleme ju aj e-mailom.</p>'}
    </div>`;
  }

  // ---------- detail záujemcu ----------
  function openLead(id) {
    const l = S.leady.find(x => x.id === id); if (!l) return;
    const c = S.kampane.find(x => x.id === l.campaign_id);
    $('#drawerBody').innerHTML = `
      <p class="kicker">${esc(c?.nazov || 'Záujemca')} · ${esc(ago(l.vytvorene))}</p>
      <h2 class="dw-h" id="dwTitle">${esc(l.firma || l.email)}</h2>
      <p class="muted">${esc([l.kontakt, l.obor, [l.mesto, l.kraj].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</p>
      ${l.zhrnutie ? `<p class="sum" style="margin-top:1.2rem"><b>Čo chce</b><span>${esc(l.zhrnutie)}</span></p>` : ''}
      <div class="quote">${esc(l.odpoved || '')}</div>
      <div class="contact-actions">
        ${l.email ? `<a class="btn btn-red btn-sm" href="mailto:${esc(l.email)}?subject=${encodeURIComponent('Re: ' + (c?.texty?.[0]?.predmet || 'Vaša odpoveď'))}">Napísať e-mail</a>` : ''}
        ${l.telefon ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(l.telefon.replace(/\s/g, ''))}">Zavolať ${esc(l.telefon)}</a>` : ''}
        ${l.web ? `<a class="btn btn-ghost btn-sm" href="${esc(/^https?:/.test(l.web) ? l.web : 'https://' + l.web)}" target="_blank" rel="noopener">Web</a>` : ''}
      </div>
      <dl class="dl">${[['E-mail', l.email], ['Telefón', l.telefon], ['IČO', l.ico], ['Teplota', TEPL[l.teplota]]].filter(x => x[1]).map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
      <form class="form form-flat" id="leadForm" data-id="${esc(l.id)}">
        <label>Stav obchodu</label>
        <div class="stav-pick">${Object.entries(STAVY).map(([k, v]) => `<button type="button" data-s="${k}" class="${l.stav === k ? 'on' : ''}">${v}</button>`).join('')}</div>
        <input type="hidden" name="stav" value="${esc(l.stav)}">
        <label>Hodnota obchodu (€)<input name="hodnota_eur" type="number" min="0" step="1" value="${esc(l.hodnota_eur ?? '')}"></label>
        <label>Poznámka${l.stav === 'reklamacia' ? ' – dôvod reklamácie' : ''}<textarea name="poznamka" rows="3">${esc(l.poznamka || '')}</textarea></label>
        <button class="btn btn-ink" type="submit">Uložiť</button>
      </form>`;
    $('#drawer').hidden = false;
  }

  // ---------- interakcie ----------
  document.addEventListener('click', async e => {
    const t = e.target;
    const row = t.closest('[data-lead]'); if (row) return openLead(row.dataset.lead);
    if (t.closest('[data-close]')) { t.closest('.drawer').hidden = true; return; }
    const tab = t.closest('[data-stav]'); if (tab) { filt.stav = tab.dataset.stav; return route(); }
    const sp = t.closest('.stav-pick button');
    if (sp) { $$('.stav-pick button').forEach(b => b.classList.toggle('on', b === sp)); $('#leadForm [name=stav]').value = sp.dataset.s; return; }
    if (t.closest('#btnNova') || t.closest('[data-nova]')) { $('#modalNova').hidden = false; return; }
    if (t.closest('#btnCsv')) return csv();
    const fa = t.closest('[data-faktura]');
    if (fa) {
      e.preventDefault();
      if (demo) { toast('V ukážke faktúry nie sú.'); return; }
      try { const r = await fetch(API + '/api/faktury/' + fa.dataset.faktura, { headers: { Authorization: 'Bearer ' + (store.get(TK) || '') } }); if (!r.ok) throw 0; open(URL.createObjectURL(await r.blob()), '_blank'); } catch { toast('Faktúru sa nepodarilo stiahnuť.'); }
      return;
    }
    const ap = t.closest('[data-approve]');
    if (ap) {
      if (!confirm('Schváliť texty a cieľovú skupinu? Kampaň spustíme po prijatí platby.')) return;
      try {
        if (!demo) await api(`/api/campaigns/${ap.dataset.approve}/approve`, {});
        const c = S.kampane.find(x => x.id === ap.dataset.approve); c.stav = 'schvalena'; c.schvalene = new Date().toISOString();
        S.udalosti.unshift({ ts: new Date().toISOString(), typ: 'schvalenie', text: 'Klient schválil texty a cieľovú skupinu.', campaign_id: c.id });
        toast(demo ? 'V ukážke sa schválenie neukladá.' : 'Ďakujeme, kampaň je schválená.'); route();
      } catch (err) { toast(err.message); }
      return;
    }
    const cm = t.closest('[data-comment]');
    if (cm) {
      const text = $('#koment').value.trim(); if (!text) return toast('Napíšte pripomienku.');
      try {
        if (!demo) await api(`/api/campaigns/${cm.dataset.comment}/comment`, { text });
        const c = S.kampane.find(x => x.id === cm.dataset.comment); (c.pripomienky ||= []).push({ ts: new Date().toISOString(), text });
        toast(demo ? 'V ukážke sa pripomienky neukladajú.' : 'Pripomienku máme, texty upravíme.'); route();
      } catch (err) { toast(err.message); }
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.drawer').forEach(d => d.hidden = true); });
  document.addEventListener('input', e => {
    if (e.target.id === 'leadQ') { filt.q = e.target.value; const pos = e.target.selectionStart; route(); const i = $('#leadQ'); i.focus(); i.setSelectionRange(pos, pos); }
  });
  document.addEventListener('change', e => { if (e.target.id === 'leadCamp') { filt.kampan = e.target.value; route(); } });
  document.addEventListener('submit', async e => {
    if (e.target.id === 'leadForm') {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target)); const id = e.target.dataset.id;
      const body = { stav: f.stav, poznamka: f.poznamka, hodnota_eur: f.hodnota_eur === '' ? null : +f.hodnota_eur };
      try {
        if (!demo) await api(`/api/leads/${id}`, body);
        Object.assign(S.leady.find(l => l.id === id), body);
        $('#drawer').hidden = true; toast(demo ? 'V ukážke sa zmeny neukladajú.' : 'Uložené.'); route();
      } catch (err) { toast(err.message); }
    }
    if (e.target.id === 'passForm') {
      e.preventDefault(); const m = $('#passMsg');
      if (demo) { m.className = 'form-msg err'; m.textContent = 'V ukážke sa heslo nemení.'; return; }
      try { await api('/api/password', Object.fromEntries(new FormData(e.target))); e.target.reset(); m.className = 'form-msg ok'; m.textContent = 'Heslo je zmenené.'; }
      catch (err) { m.className = 'form-msg err'; m.textContent = err.message; }
    }
    if (e.target.id === 'novaForm') {
      e.preventDefault(); const m = $('#novaMsg'); const f = Object.fromEntries(new FormData(e.target));
      if (demo) { m.className = 'form-msg err'; m.innerHTML = 'V ukážke sa zadanie neposiela. <a href="../#zadanie">Pošlite ho tu →</a>'; return; }
      const k = S.klient || {};
      try {
        await fetch(API + '/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, meno: k.meno, email: k.email, firma: k.firma, zdroj: 'portal:' + k.id }) }).then(r => r.json()).then(j => { if (!j.ok) throw new Error(j.chyba); });
        e.target.reset(); m.className = 'form-msg ok'; m.textContent = 'Zadanie máme. Návrh nájdete v Kampaniach do 2 pracovných dní.';
      } catch (err) { m.className = 'form-msg err'; m.textContent = err.message || 'Nepodarilo sa odoslať.'; }
    }
  });

  function csv() {
    const cols = [['firma', 'Firma'], ['ico', 'IČO'], ['kontakt', 'Kontakt'], ['email', 'E-mail'], ['telefon', 'Telefón'], ['web', 'Web'], ['mesto', 'Mesto'], ['kraj', 'Kraj'], ['zhrnutie', 'Čo chce'], ['odpoved', 'Odpoveď'], ['stav', 'Stav'], ['hodnota_eur', 'Hodnota €'], ['poznamka', 'Poznámka'], ['vytvorene', 'Prišlo']];
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const out = '﻿' + [cols.map(c => q(c[1])).join(';'), ...S.leady.map(l => cols.map(([k]) => q(k === 'stav' ? STAVY[l[k]] : l[k])).join(';'))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out], { type: 'text/csv;charset=utf-8' }));
    a.download = `mailito-zaujemcovia-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  // ---------- štart ----------
  async function start() {
    try { await load(); } catch (err) { if (!demo) { showLogin(); return; } }
    $('#login').hidden = true; $('#app').hidden = false;
    $('#sideClient').textContent = S.klient?.firma || S.klient?.email || '';
    $('#demoFlag').hidden = !demo || embed;
    if (embed) { $('#btnLogout').hidden = true; document.body.classList.add('embed'); }
    route();
  }
  if (demo || store.get(TK)) start(); else showLogin();

  // ---------- ukážkové dáta ----------
  function demoData() {
    const now = Date.now(), iso = (h) => new Date(now - h * 3600e3).toISOString();
    const denne = (n, base, z) => { const o = {}; for (let i = n; i >= 0; i--) { const d = new Date(now - i * 864e5); if ([0, 6].includes(d.getDay())) continue; const s = Math.round(base * (0.8 + Math.random() * 0.4)); o[d.toISOString().slice(0, 10)] = { odoslane: s, odpovede: Math.round(s * 0.06), zaujemcovia: Math.round(s * z * (0.5 + Math.random())) }; } return o; };
    const kampane = [
      { id: 'c1', nazov: 'Upratovanie hál – západ', stav: 'bezi', ciel: 'Výrobné a logistické firmy s halami, Trnavský, Nitriansky a Trenčiansky kraj', segmenty: ['Výroba a priemysel', 'Logistika a doprava'], kraje: ['Trnavský', 'Nitriansky', 'Trenčiansky'], pocet_firiem: 2418, odoslane: 1874, odpovede: 112, zaujemcovia: 58, odhlasenia: 23, start: '2026-09-22', denne: denne(16, 140, 0.031),
        texty: [
          { predmet: 'Upratovanie haly bez odstávky výroby', text: 'Dobrý deň,\n\nupratujeme výrobné haly a sklady v noci a cez víkendy, aby výroba nemusela stáť. Pre firmy v okolí Trnavy, Nitry a Trenčína máme od novembra voľné kapacity.\n\nMôžem Vám poslať orientačnú cenu podľa rozlohy? Stačí odpísať „áno“ a rozlohu haly.\n\nS pozdravom\nMartin Kováč\nČistá Hala s.r.o.' },
          { predmet: '', po_dnoch: 4, text: 'Dobrý deň,\n\nlen krátko pripomínam – ak by Vás zaujímala cena upratovania haly, pošlem ju do hodiny. Ak to nie je pre Vás aktuálne, odpíšte „nie“ a už Vás nebudem rušiť.\n\nMartin Kováč' },
        ] },
      { id: 'c2', nazov: 'Upratovanie kancelárií – Bratislava', stav: 'na_schvalenie', ciel: 'IT firmy a služby pre firmy s kanceláriou v Bratislave', segmenty: ['IT, marketing a médiá', 'Služby pre firmy'], kraje: ['Bratislavský'], pocet_firiem: 3120, odoslane: 0, odpovede: 0, zaujemcovia: 0, odhlasenia: 0, denne: {},
        texty: [
          { predmet: 'Čistá kancelária každé ráno, bez starostí', text: 'Dobrý deň,\n\nstaráme sa o kancelárie v Bratislave – upratujeme po pracovnej dobe, dopĺňame kuchynku a hygienu. Pri zmluve od decembra prvý mesiac za polovicu.\n\nMám Vám poslať cenu pre Vašu kanceláriu? Stačí odpísať približnú rozlohu.\n\nMartin Kováč\nČistá Hala s.r.o.' },
          { predmet: '', po_dnoch: 3, text: 'Dobrý deň,\n\nnadväzujem na môj e-mail. Ak by sa Vám hodila cenová ponuka na upratovanie kancelárie, pošlem ju ešte dnes.\n\nMartin Kováč' },
          { predmet: '', po_dnoch: 5, text: 'Dobrý deň,\n\nposledná správa ode mňa – ak upratovanie teraz neriešite, rozumiem. Keby sa to zmenilo, stačí odpísať na tento e-mail.\n\nMartin Kováč' },
        ] },
      { id: 'c3', nazov: 'Test – sklady Žilina', stav: 'hotova', ciel: 'Sklady a veľkoobchody v Žilinskom kraji', segmenty: ['Veľkoobchod a distribúcia'], kraje: ['Žilinský'], pocet_firiem: 1000, odoslane: 1000, odpovede: 61, zaujemcovia: 34, odhlasenia: 12, start: '2026-09-01', denne: {}, texty: [] },
    ];
    const L = [
      ['Logistika Váh s.r.o.', 'Ing. Peter Mráz', 'Hlohovec', 'Trnavský', 'Pošlite cenu za 2 000 m² mesačne, ideálne aj termín obhliadky. Ďakujem, Mráz', 'Chce cenu za 2 000 m² mesačne a termín obhliadky.', 'horuci', 'stretnutie', 'c1', 3],
      ['Kovo Záhorie a.s.', 'Jana Holubová', 'Senica', 'Trnavský', 'Dobrý deň, aktuálne riešime nového dodávateľa upratovania od januára. Prosím o ponuku, hala má cca 3 500 m².', 'Hľadá dodávateľa od januára, hala 3 500 m².', 'horuci', 'novy', 'c1', 1],
      ['Plasty Nitra s.r.o.', 'Michal Benko', 'Nitra', 'Nitriansky', 'Zaujíma nás nočné upratovanie, máme 3 zmeny. Zavolajte mi prosím 0905 xxx xxx.', 'Chce telefonát, výroba na 3 zmeny.', 'horuci', 'kontaktovany', 'c1', 7],
      ['Drevotech Považie s.r.o.', 'Ing. Lucia Šimková', 'Púchov', 'Trenčiansky', 'Pošlite PDF s referenciami, prediskutujeme na porade vo štvrtok.', 'Chce referencie, rozhodnú vo štvrtok.', 'teply', 'ponuka', 'c1', 26],
      ['Agro Podunajsko s.r.o.', 'Tomáš Varga', 'Nové Zámky', 'Nitriansky', 'Máme dodávateľa, ale zmluva končí v januári. Pošlite ponuku, porovnáme.', 'Zmluva im končí v januári, chcú porovnať ponuky.', 'teply', 'novy', 'c1', 2],
      ['Strojárne Dubnica s.r.o.', 'Pavol Kukučka', 'Dubnica nad Váhom', 'Trenčiansky', 'Aká je minimálna objednávka? Radi by sme sa stretli osobne.', 'Chce stretnutie, pýta sa na minimálnu objednávku.', 'horuci', 'obchod', 'c1', 72],
      ['Sklad Pezinok s.r.o.', 'Erika Molnárová', 'Trnava', 'Trnavský', 'Teraz nie, ozvite sa prosím v marci.', 'Aktuálne nie, ozvať sa v marci.', 'neskor', 'neaktualny', 'c1', 50],
      ['Elektro Senec s.r.o.', 'Róbert Hudec', 'Galanta', 'Trnavský', 'Koľko by stálo jednorazové upratovanie po rekonštrukcii haly? Asi 1 200 m².', 'Jednorazové upratovanie po rekonštrukcii, 1 200 m².', 'teply', 'kontaktovany', 'c1', 30],
      ['Velkosklad Martin s.r.o.', 'Juraj Kollár', 'Martin', 'Žilinský', 'Ďakujem za ponuku, pošlite cenník.', 'Chce cenník.', 'teply', 'ponuka', 'c3', 400],
      ['Kysuca Distribúcia a.s.', 'Ing. Mária Pajtinková', 'Čadca', 'Žilinský', 'Zaujíma nás to, prosím zavolajte po 14:00.', 'Chce telefonát po 14:00.', 'horuci', 'obchod', 'c3', 420],
      ['Orava Trade s.r.o.', 'Stanislav Krajči', 'Dolný Kubín', 'Žilinský', 'Toto sme nechceli, nemáme sklad.', 'Nemajú sklad – nesedí.', 'teply', 'reklamacia', 'c3', 430],
    ];
    const leady = L.map(([firma, kontakt, mesto, kraj, odpoved, zhrnutie, teplota, stav, campaign_id, h], i) => ({ id: 'l' + i, firma, kontakt, mesto, kraj, odpoved, zhrnutie, teplota, stav, campaign_id, vytvorene: iso(h), email: 'kontakt@' + firma.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '').slice(0, 14) + '.sk', telefon: i % 2 ? '' : '+421 9xx xxx xxx', obor: 'Výroba a priemysel', hodnota_eur: stav === 'obchod' ? [4800, 2400][i % 2] : null, poznamka: stav === 'reklamacia' ? 'Firma nemá sklad, nesedí do cieľovky.' : '' }));
    const udalosti = [
      ...leady.slice(0, 6).map(l => ({ ts: l.vytvorene, typ: 'zaujemca', text: 'Nový záujemca: ' + l.firma, campaign_id: l.campaign_id })),
      { ts: iso(5), typ: 'info', text: 'Návrh kampane „Upratovanie kancelárií – Bratislava“ je pripravený na schválenie.', campaign_id: 'c2' },
      { ts: iso(26), typ: 'info', text: 'Odoslaných ďalších 142 e-mailov.', campaign_id: 'c1' },
      { ts: iso(380), typ: 'info', text: 'Kampaň dokončená: 1 000 oslovených, 34 záujemcov.', campaign_id: 'c3' },
    ].sort((a, b) => b.ts.localeCompare(a.ts));
    return { klient: { id: 'demo', firma: 'Čistá Hala s.r.o. (ukážka)', meno: 'Martin Kováč', email: 'ukazka@mailito.eu', balik: '3500', ico: '00 000 000' }, kampane, leady, udalosti, leadStat: [] };
  }
})();
