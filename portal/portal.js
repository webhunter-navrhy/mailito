// Mailito – klientsky portál (CZ/SK). Účty zakladáme my v administrácii, klient tu schvaľuje kampane, sleduje priebeh, pracuje so záujemcami a môže kampaň pozastaviť.
(() => {
  const API = 'https://mailito-api.webhunter.workers.dev';
  const TK = 'mailito_token';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
  const qp = new URLSearchParams(location.search);
  const demo = qp.has('demo'), embed = qp.has('embed');

  // ---------- jazyk: klient (po prihlásení) > ?jazyk= > uložená voľba > prehliadač ----------
  let J = ['cs', 'sk'].includes(qp.get('jazyk')) ? qp.get('jazyk') : store.get('mailito_jazyk') || ((navigator.languages || [navigator.language || '']).some(l => /^sk\b/i.test(l)) ? 'sk' : 'cs');
  const D = {
    cs: {
      loc: 'cs-CZ', portal: 'Klientský portál', loginTxt: 'Přihlaste se údaji, které jsme vám poslali e-mailem.', heslo: 'Heslo', prihlasit: 'Přihlásit se', prihlasujem: 'Přihlašuji…',
      loginAlt1: 'Ještě s námi nespolupracujete? <a href="./?demo=1">Prohlédněte si ukázku portálu</a> nebo <a href="../#poptavka">napište nezávaznou poptávku</a>.',
      loginAlt2: 'Zapomněli jste heslo? Napište na <a href="mailto:info.webhunter@email.cz">info.webhunter@email.cz</a>.', laBig: 'Vaši zájemci<br><em>na jednom místě.</em>',
      prehlad: 'Přehled', zaujemcovia: 'Zájemci', kampane: 'Kampaně', kampan: 'Kampaň', ucet: 'Účet', nova: '+ Nová kampaň', odhlasit: 'Odhlásit se',
      demoFlag: 'Ukázka · změny se neukládají · <a href="../#poptavka">Chci vlastní kampaň</a>',
      STAVY: { novy: 'Nový', kontaktovany: 'Kontaktován', stretnutie: 'Schůzka', ponuka: 'Nabídka', obchod: 'Obchod', neaktualny: 'Neaktuální', reklamacia: 'Reklamace' },
      CSTAV: { objednana: 'Připravuje se', priprava: 'Připravujeme', na_schvalenie: 'Ke schválení', schvalena: 'Schválená', bezi: 'Běží', pauza: 'Pozastavená', hotova: 'Dokončená', ukoncena: 'Ukončená' },
      TEPL: { horuci: 'Horký', teply: 'Teplý', neskor: 'Později' },
      cakaSchv: n => `<b>${n}</b> čeká na vaše schválení. Zkontrolujte texty a cílovou skupinu.`, skontrolovat: 'Zkontrolovat →',
      oslovene: 'Oslovené firmy', zVybranych: n => `z ${n} vybraných`, odpovede: 'Odpovědi', zOslovenych: p => `${p} z oslovených`, cakaKontakt: n => `${n} čeká na kontakt`,
      obchody: 'Obchody', hodnota: h => `${h} Kč hodnota`, zapiste: 'zapište u zájemce', priebeh: 'Průběh po dnech', poslednych: n => `posledních ${n} dní`,
      grafT: (d, o, z) => `${d} · ${o} odeslaných · ${z} zájemců`, grafPrazdny: 'Graf se zobrazí po spuštění kampaně.', odoslane: 'Odeslané', pocetZ: 'Počet zájemců v daný den',
      coSaDeje: 'Co se děje', nicNie: 'Zatím nic. Jakmile se něco stane, uvidíte to tady.', najnovsi: 'Nejnovější zájemci', vsetci: 'Všichni →',
      firma: 'Firma', coNapisali: 'Co napsali', stav: 'Stav', prislo: 'Přišlo', ziadniZ: 'Zatím žádní zájemci. První obvykle přijdou v den spuštění kampaně.',
      vsetciTab: 'Všichni', hladat: 'Hledat firmu, město, text…', vsetkyK: 'Všechny kampaně',
      ziadnaK: 'Zatím tu nemáte žádnou kampaň. Návrh pro vás připravujeme, objeví se tady ke schválení.', zadatK: '+ Zadat novou kampaň',
      vybrane: 'Vybrané', osl: 'Oslovené', odp: 'Odpovědi', zaujem: 'Zájem', nenajdena: 'Kampaň se nenašla.', spat: '← Zpět na kampaně',
      schvBox: '<b>Tato kampaň čeká na vaše schválení.</b> Když je všechno v pořádku, klikněte na Schválit. Když chcete něco změnit, napište připomínku níže.', schvalit: 'Schválit',
      pauzaBox: '<b>Kampaň je pozastavená.</b> Nic se neodesílá, odpovědi dál čteme. Pokračovat můžete kdykoli.',
      vybraneF: 'Vybrané firmy', zVyberu: p => `${p} z výběru`, odhlaseni: n => `odhlášení ${n}`,
      textyM: 'Texty e-mailů', sprav: n => n === 1 ? '1 zpráva' : `${n} zprávy`, uvodny: 'Úvodní e-mail', prip: i => `${i}. navázání`, den1: 'den 1', poDnoch: d => `po ${d} dnech, když neodpoví`,
      rovnake: '(stejné vlákno)', textyPrip: 'Texty připravujeme.', pripomienkaL: 'Připomínka k textům nebo cílovce', pripomienkaPh: 'Např. Zmiňte i, že máme certifikát ISO 9001.', poslatPrip: 'Poslat připomínku',
      ciel: 'Cílová skupina', popis: 'Popis', odvetvia: 'Obory', kraje: 'Regiony', celaKrajina: 'celá země', start: 'Start', schvalene: 'Schváleno', udalosti: 'Události', zatialNic: 'Zatím nic.',
      zTejto: 'Zájemci z této kampaně', pozastavit: 'Pozastavit kampaň', pokracovat: 'Pokračovat v kampani',
      kontakt: 'Kontakt', ico: 'IČO', zmenaUdajov: 'Změnu fakturačních údajů nám napište na <a href="mailto:info.webhunter@email.cz">info.webhunter@email.cz</a>.',
      zmenaHesla: 'Změna hesla', sucasne: 'Současné heslo', nove: 'Nové heslo', zmenit: 'Změnit heslo', faktury: 'Faktury', stiahnut: 'Stáhnout PDF', zaplatena: 'zaplacená', splatna: d => `splatná do ${d}`,
      ziadneF: 'Zatím žádné faktury. Jakmile ji vystavíme, najdete ji tady a pošleme ji i e-mailem.',
      coChce: 'Co chtějí', napisat: 'Napsat e-mail', zavolat: t => `Zavolat ${t}`, vasaOdp: 'Vaše odpověď', telefon: 'Telefon', teplota: 'Teplota',
      stavObchodu: 'Stav obchodu', hodnotaObchodu: 'Hodnota obchodu (Kč)', poznamka: 'Poznámka', dovodRekl: ' – důvod reklamace', ulozit: 'Uložit',
      demoFakt: 'V ukázce faktury nejsou.', faktChyba: 'Fakturu se nepodařilo stáhnout.', confSchv: 'Schválit texty a cílovou skupinu? Pak připravíme spuštění kampaně.',
      demoSchv: 'V ukázce se schválení neukládá.', schvOk: 'Děkujeme, kampaň je schválená. Ozveme se se spuštěním.', schvEv: 'Klient schválil texty a cílovou skupinu.',
      napistePrip: 'Napište připomínku.', demoPrip: 'V ukázce se připomínky neukládají.', pripOk: 'Připomínku máme, texty upravíme.',
      confPauza: 'Pozastavit kampaň? Další e-maily neodejdou, dokud ji znovu nespustíte.', confPokr: 'Pokračovat v kampani? E-maily začnou znovu odcházet v pracovní době.',
      demoPauza: 'V ukázce se kampaň nepozastavuje.', pauzaOk: 'Kampaň je pozastavená.', pokrOk: 'Kampaň znovu běží.',
      demoUloz: 'V ukázce se změny neukládají.', ulozene: 'Uloženo.', demoHeslo: 'V ukázce se heslo nemění.', hesloOk: 'Heslo je změněné.',
      demoZad: 'V ukázce se zadání neposílá. <a href="../#poptavka">Pošlete ho tady →</a>', zadOk: 'Zadání máme. Návrh vám připravíme a objeví se v Kampaních ke schválení.', neodoslane: 'Nepodařilo se odeslat.',
      novaKicker: 'Nová kampaň', novaH: 'Komu chcete prodávat teď?', novaTxt: 'Návrh cílovky a textů vám připravíme na míru. Objeví se v sekci Kampaně ke schválení.',
      ponuka: 'Co nabízíte?', zakaznik: 'Kdo je ideální zákazník?', objem: 'Kolik firem měsíčně zhruba', objemy: ['do 1 000', '1 000–5 000', '5 000–20 000', '20 000+', 'nevím'], poznPh: 'Regiony, velikost firem, co se osvědčilo…', poslatZad: 'Poslat zadání',
      csv: ['Firma', 'IČO', 'Kontakt', 'E-mail', 'Telefon', 'Web', 'Město', 'Kraj', 'Co chtějí', 'Odpověď', 'Stav', 'Hodnota Kč', 'Poznámka', 'Přišlo'], csvN: 'mailito-zajemci', mena: 'Kč',
      pred: m => `před ${m} min`, predH: h => `před ${h} h`, chyba: 'Chyba', spojenie: 'Chyba spojení.', zavriet: 'Zavřít', ziadnyKl: 'Ukázková firma',
    },
    sk: {
      loc: 'sk-SK', portal: 'Klientsky portál', loginTxt: 'Prihláste sa údajmi, ktoré sme vám poslali e-mailom.', heslo: 'Heslo', prihlasit: 'Prihlásiť sa', prihlasujem: 'Prihlasujem…',
      loginAlt1: 'Ešte s nami nespolupracujete? <a href="./?demo=1&jazyk=sk">Pozrite si ukážku portálu</a> alebo <a href="../sk/#poptavka">napíšte nezáväzný dopyt</a>.',
      loginAlt2: 'Zabudli ste heslo? Napíšte na <a href="mailto:info.webhunter@email.cz">info.webhunter@email.cz</a>.', laBig: 'Vaši záujemcovia<br><em>na jednom mieste.</em>',
      prehlad: 'Prehľad', zaujemcovia: 'Záujemcovia', kampane: 'Kampane', kampan: 'Kampaň', ucet: 'Účet', nova: '+ Nová kampaň', odhlasit: 'Odhlásiť sa',
      demoFlag: 'Ukážka · zmeny sa neukladajú · <a href="../sk/#poptavka">Chcem vlastnú kampaň</a>',
      STAVY: { novy: 'Nový', kontaktovany: 'Kontaktovaný', stretnutie: 'Stretnutie', ponuka: 'Ponuka', obchod: 'Obchod', neaktualny: 'Neaktuálny', reklamacia: 'Reklamácia' },
      CSTAV: { objednana: 'Pripravuje sa', priprava: 'Pripravujeme', na_schvalenie: 'Na schválenie', schvalena: 'Schválená', bezi: 'Beží', pauza: 'Pozastavená', hotova: 'Dokončená', ukoncena: 'Ukončená' },
      TEPL: { horuci: 'Horúci', teply: 'Teplý', neskor: 'Neskôr' },
      cakaSchv: n => `<b>${n}</b> čaká na vaše schválenie. Skontrolujte texty a cieľovú skupinu.`, skontrolovat: 'Skontrolovať →',
      oslovene: 'Oslovené firmy', zVybranych: n => `z ${n} vybraných`, odpovede: 'Odpovede', zOslovenych: p => `${p} z oslovených`, cakaKontakt: n => `${n} čaká na kontakt`,
      obchody: 'Obchody', hodnota: h => `${h} € hodnota`, zapiste: 'zapíšte pri záujemcovi', priebeh: 'Priebeh po dňoch', poslednych: n => `posledných ${n} dní`,
      grafT: (d, o, z) => `${d} · ${o} odoslaných · ${z} záujemcov`, grafPrazdny: 'Graf sa zobrazí po spustení kampane.', odoslane: 'Odoslané', pocetZ: 'Počet záujemcov v daný deň',
      coSaDeje: 'Čo sa deje', nicNie: 'Zatiaľ nič. Hneď ako sa niečo stane, uvidíte to tu.', najnovsi: 'Najnovší záujemcovia', vsetci: 'Všetci →',
      firma: 'Firma', coNapisali: 'Čo napísali', stav: 'Stav', prislo: 'Prišlo', ziadniZ: 'Zatiaľ žiadni záujemcovia. Prví zvyčajne prídu v deň spustenia kampane.',
      vsetciTab: 'Všetci', hladat: 'Hľadať firmu, mesto, text…', vsetkyK: 'Všetky kampane',
      ziadnaK: 'Zatiaľ tu nemáte žiadnu kampaň. Návrh pre vás pripravujeme, objaví sa tu na schválenie.', zadatK: '+ Zadať novú kampaň',
      vybrane: 'Vybrané', osl: 'Oslovené', odp: 'Odpovede', zaujem: 'Záujem', nenajdena: 'Kampaň sa nenašla.', spat: '← Späť na kampane',
      schvBox: '<b>Táto kampaň čaká na vaše schválenie.</b> Ak je všetko v poriadku, kliknite na Schváliť. Ak chcete niečo zmeniť, napíšte pripomienku nižšie.', schvalit: 'Schváliť',
      pauzaBox: '<b>Kampaň je pozastavená.</b> Nič sa neodosiela, odpovede ďalej čítame. Pokračovať môžete kedykoľvek.',
      vybraneF: 'Vybrané firmy', zVyberu: p => `${p} z výberu`, odhlaseni: n => `odhlásení ${n}`,
      textyM: 'Texty e-mailov', sprav: n => n === 1 ? '1 správa' : `${n} správy`, uvodny: 'Úvodný e-mail', prip: i => `${i}. nadviazanie`, den1: 'deň 1', poDnoch: d => `po ${d} dňoch, ak neodpovedia`,
      rovnake: '(rovnaké vlákno)', textyPrip: 'Texty pripravujeme.', pripomienkaL: 'Pripomienka k textom alebo cieľovke', pripomienkaPh: 'Napr. Spomeňte aj, že máme certifikát ISO 9001.', poslatPrip: 'Poslať pripomienku',
      ciel: 'Cieľová skupina', popis: 'Popis', odvetvia: 'Odvetvia', kraje: 'Kraje', celaKrajina: 'celá krajina', start: 'Štart', schvalene: 'Schválené', udalosti: 'Udalosti', zatialNic: 'Zatiaľ nič.',
      zTejto: 'Záujemcovia z tejto kampane', pozastavit: 'Pozastaviť kampaň', pokracovat: 'Pokračovať v kampani',
      kontakt: 'Kontakt', ico: 'IČO', zmenaUdajov: 'Zmenu fakturačných údajov nám napíšte na <a href="mailto:info.webhunter@email.cz">info.webhunter@email.cz</a>.',
      zmenaHesla: 'Zmena hesla', sucasne: 'Súčasné heslo', nove: 'Nové heslo', zmenit: 'Zmeniť heslo', faktury: 'Faktúry', stiahnut: 'Stiahnuť PDF', zaplatena: 'zaplatená', splatna: d => `splatná do ${d}`,
      ziadneF: 'Zatiaľ žiadne faktúry. Keď ju vystavíme, nájdete ju tu a pošleme ju aj e-mailom.',
      coChce: 'Čo chcú', napisat: 'Napísať e-mail', zavolat: t => `Zavolať ${t}`, vasaOdp: 'Vaša odpoveď', telefon: 'Telefón', teplota: 'Teplota',
      stavObchodu: 'Stav obchodu', hodnotaObchodu: 'Hodnota obchodu (€)', poznamka: 'Poznámka', dovodRekl: ' – dôvod reklamácie', ulozit: 'Uložiť',
      demoFakt: 'V ukážke faktúry nie sú.', faktChyba: 'Faktúru sa nepodarilo stiahnuť.', confSchv: 'Schváliť texty a cieľovú skupinu? Potom pripravíme spustenie kampane.',
      demoSchv: 'V ukážke sa schválenie neukladá.', schvOk: 'Ďakujeme, kampaň je schválená. Ozveme sa so spustením.', schvEv: 'Klient schválil texty a cieľovú skupinu.',
      napistePrip: 'Napíšte pripomienku.', demoPrip: 'V ukážke sa pripomienky neukladajú.', pripOk: 'Pripomienku máme, texty upravíme.',
      confPauza: 'Pozastaviť kampaň? Ďalšie e-maily neodídu, kým ju znova nespustíte.', confPokr: 'Pokračovať v kampani? E-maily začnú znova odchádzať v pracovnom čase.',
      demoPauza: 'V ukážke sa kampaň nepozastavuje.', pauzaOk: 'Kampaň je pozastavená.', pokrOk: 'Kampaň znova beží.',
      demoUloz: 'V ukážke sa zmeny neukladajú.', ulozene: 'Uložené.', demoHeslo: 'V ukážke sa heslo nemení.', hesloOk: 'Heslo je zmenené.',
      demoZad: 'V ukážke sa zadanie neposiela. <a href="../sk/#poptavka">Pošlite ho tu →</a>', zadOk: 'Zadanie máme. Návrh vám pripravíme a objaví sa v Kampaniach na schválenie.', neodoslane: 'Nepodarilo sa odoslať.',
      novaKicker: 'Nová kampaň', novaH: 'Komu chcete predávať teraz?', novaTxt: 'Návrh cieľovky a textov vám pripravíme na mieru. Objaví sa v sekcii Kampane na schválenie.',
      ponuka: 'Čo ponúkate?', zakaznik: 'Kto je ideálny zákazník?', objem: 'Koľko firiem mesačne zhruba', objemy: ['do 1 000', '1 000–5 000', '5 000–20 000', '20 000+', 'neviem'], poznPh: 'Kraje, veľkosť firiem, čo sa osvedčilo…', poslatZad: 'Poslať zadanie',
      csv: ['Firma', 'IČO', 'Kontakt', 'E-mail', 'Telefón', 'Web', 'Mesto', 'Kraj', 'Čo chcú', 'Odpoveď', 'Stav', 'Hodnota €', 'Poznámka', 'Prišlo'], csvN: 'mailito-zaujemcovia', mena: '€',
      pred: m => `pred ${m} min`, predH: h => `pred ${h} h`, chyba: 'Chyba', spojenie: 'Chyba spojenia.', zavriet: 'Zavrieť', ziadnyKl: 'Ukážková firma',
    },
  };
  let T = D[J];
  const fmt = n => Math.round(+n || 0).toLocaleString(T.loc).replace(/ /g, ' ');
  const pct = (a, b) => b ? (a / b * 100).toLocaleString(T.loc, { maximumFractionDigits: 1 }) + ' %' : '–';
  const tm = s => new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  const dt = s => { if (!s) return ''; const d = tm(s); return d.toLocaleDateString(T.loc, { day: 'numeric', month: 'numeric' }) + ' ' + d.toLocaleTimeString(T.loc, { hour: '2-digit', minute: '2-digit' }); };
  const ago = s => { if (!s) return ''; const m = Math.round((Date.now() - tm(s)) / 60000); if (m < 60) return T.pred(Math.max(1, m)); if (m < 1440) return T.predH(Math.round(m / 60)); return dt(s); };

  // statické texty stránky
  function prelozStranku() {
    document.documentElement.lang = J;
    document.title = T.portal + ' – Mailito';
    $$('[data-t]').forEach(el => { const v = T[el.dataset.t]; if (typeof v === 'string') el.innerHTML = v; });
    $$('[data-tp]').forEach(el => { const v = T[el.dataset.tp]; if (typeof v === 'string') el.placeholder = v; });
    const sel = $('#nkObjem'); if (sel) sel.innerHTML = T.objemy.map((o, i) => `<option${i === 4 ? ' selected' : ''}>${o}</option>`).join('');
  }
  function nastavJazyk(j) { if (!D[j] || j === J) return; J = j; T = D[j]; prelozStranku(); }

  let S = { klient: null, kampane: [], leady: [], udalosti: [], leadStat: [] };
  let filt = { stav: 'vsetko', q: '', kampan: '' };

  // ---------- API ----------
  async function api(path, body) {
    const r = await fetch(API + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (store.get(TK) || '') },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({ ok: false, chyba: T.spojenie }));
    if (r.status === 401 && path !== '/api/login') { logout(); throw new Error(j.chyba); }
    if (!j.ok) throw new Error(j.chyba || T.chyba);
    return j;
  }
  async function load() {
    if (demo) { S = demoData(); return; }
    const [me, ld, fk] = await Promise.all([api('/api/me'), api('/api/leads'), api('/api/faktury').catch(() => ({ faktury: [] }))]);
    S = { klient: me.klient, kampane: me.kampane, leady: ld.leady, udalosti: me.udalosti, leadStat: me.leady, faktury: fk.faktury || [] };
    if (S.klient?.jazyk) nastavJazyk(S.klient.jazyk);
  }
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }

  // ---------- auth ----------
  function showLogin() { $('#login').hidden = false; $('#app').hidden = true; }
  function logout() { store.set(TK, null); if (demo) location.href = './' + (J === 'sk' ? '?jazyk=sk' : ''); else showLogin(); }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)); const m = $('#loginMsg');
    m.className = 'form-msg'; m.textContent = T.prihlasujem;
    try {
      const j = await api('/api/login', f);
      store.set(TK, j.token); m.textContent = '';
      await start();
    } catch (err) { m.className = 'form-msg err'; m.textContent = err.message; }
  });
  $('#btnLogout').onclick = logout;

  // ---------- routing ----------
  function route() {
    const [v, id] = (location.hash.slice(1) || 'prehlad').split('/');
    const view = ['prehlad', 'zaujemcovia', 'kampane', 'kampan', 'ucet'].includes(v) ? v : 'prehlad';
    $$('.side-nav a').forEach(a => a.classList.toggle('on', a.dataset.v === (view === 'kampan' ? 'kampane' : view)));
    $('#topH').textContent = T[view];
    $('#view').innerHTML = { prehlad: vPrehlad, zaujemcovia: vLeads, kampane: vKampane, kampan: () => vKampan(id), ucet: vUcet }[view]();
    $('#side').classList.remove('open');
    const n = S.leady.filter(l => l.stav === 'novy').length;
    $('#badgeNew').hidden = !n; $('#badgeNew').textContent = n;
    scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  $('#sideBurger').onclick = () => $('#side').classList.toggle('open');

  // ---------- views ----------
  const sum = k => S.kampane.reduce((a, c) => a + (+c[k] || 0), 0);
  const pauzaBtn = c => c.stav === 'bezi' ? `<button class="btn btn-ghost btn-sm" data-pauza="${esc(c.id)}">⏸ ${T.pozastavit}</button>` : c.stav === 'pauza' ? `<button class="btn btn-red btn-sm" data-pokracovat="${esc(c.id)}">▶ ${T.pokracovat}</button>` : '';
  function vPrehlad() {
    const obchody = S.leady.filter(l => l.stav === 'obchod');
    const hodnota = obchody.reduce((a, l) => a + (+l.hodnota_eur || 0), 0);
    const waiting = S.kampane.filter(c => c.stav === 'na_schvalenie');
    const days = {};
    S.kampane.forEach(c => Object.entries(c.denne || {}).forEach(([d, v]) => { const x = days[d] ||= { odoslane: 0, odpovede: 0, zaujemcovia: 0 }; for (const k in x) x[k] += +v[k] || 0; }));
    const keys = Object.keys(days).sort().slice(-21);
    const max = Math.max(1, ...keys.map(k => days[k].odoslane));
    return `
      ${waiting.map(c => `<div class="alert"><p>${T.cakaSchv(esc(c.nazov))}</p><a class="btn btn-ink btn-sm" href="#kampan/${esc(c.id)}">${T.skontrolovat}</a></div>`).join('')}
      <div class="grid g4">
        <div class="card kpi"><small>${T.oslovene}</small><b>${fmt(sum('odoslane'))}</b><span>${T.zVybranych(fmt(sum('pocet_firiem')))}</span></div>
        <div class="card kpi"><small>${T.odpovede}</small><b>${fmt(sum('odpovede'))}</b><span>${T.zOslovenych(pct(sum('odpovede'), sum('odoslane')))}</span></div>
        <div class="card kpi hot"><small>${T.zaujemcovia}</small><b>${fmt(S.leady.length)}</b><span>${T.cakaKontakt(S.leady.filter(l => l.stav === 'novy').length)}</span></div>
        <div class="card kpi"><small>${T.obchody}</small><b>${fmt(obchody.length)}</b><span>${hodnota ? T.hodnota(fmt(hodnota)) : T.zapiste}</span></div>
      </div>
      <div class="grid g2" style="margin-top:1.2rem">
        <div class="card">
          <div class="card-h"><h2>${T.priebeh}</h2><span class="muted" style="font-size:.8rem">${T.poslednych(keys.length)}</span></div>
          ${keys.length ? `<div class="chart">${keys.map(k => `<div class="col" data-t="${esc(T.grafT(k.slice(8, 10) + '. ' + k.slice(5, 7) + '.', days[k].odoslane, days[k].zaujemcovia))}">${days[k].zaujemcovia ? `<span class="zn">${days[k].zaujemcovia}</span>` : ''}<span class="bar" style="height:${days[k].odoslane / max * 78}%"></span></div>`).join('')}</div>
          <div class="legend"><span><i style="background:#E6EAF0;border-top:2px solid var(--tx)"></i>${T.odoslane}</span><span><i style="background:var(--red);border-radius:50%"></i>${T.pocetZ}</span></div>` : `<p class="empty">${T.grafPrazdny}</p>`}
        </div>
        <div class="card">
          <div class="card-h"><h2>${T.coSaDeje}</h2></div>
          ${S.udalosti.length ? `<ul class="feed">${S.udalosti.slice(0, 14).map(e => `<li><time>${esc(ago(e.ts))}</time><span class="t-${esc(e.typ)}">${esc(e.text)}</span></li>`).join('')}</ul>` : `<p class="empty">${T.nicNie}</p>`}
        </div>
      </div>
      <div class="card" style="margin-top:1.2rem">
        <div class="card-h"><h2>${T.najnovsi}</h2><a href="#zaujemcovia">${T.vsetci}</a></div>
        ${leadTable(S.leady.slice(0, 6))}
      </div>`;
  }

  function leadTable(rows) {
    if (!rows.length) return `<p class="empty">${T.ziadniZ}</p>`;
    const camp = id => S.kampane.find(c => c.id === id)?.nazov || '';
    return `<div class="tbl-wrap"><table><thead><tr><th>${T.firma}</th><th>${T.coNapisali}</th><th>${T.stav}</th><th>${T.prislo}</th></tr></thead><tbody>
      ${rows.map(l => `<tr data-lead="${esc(l.id)}">
        <td class="firm"><b><span class="temp temp-${esc(l.teplota || 'teply')}" title="${esc(T.TEPL[l.teplota] || '')}"></span>${esc(l.firma || l.email)}</b><span>${esc([l.kontakt, l.mesto].filter(Boolean).join(' · '))}</span></td>
        <td class="q"><span>${esc(l.zhrnutie || l.odpoved || '')}</span><small>${esc(camp(l.campaign_id))}</small></td>
        <td><span class="st st-${esc(l.stav)}">${esc(T.STAVY[l.stav] || l.stav)}</span></td>
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
      <div class="tabs">${['vsetko', ...Object.keys(T.STAVY)].filter(k => k === 'vsetko' || counts[k]).map(k => `<button class="tab ${filt.stav === k ? 'on' : ''}" data-stav="${k}">${k === 'vsetko' ? T.vsetciTab : T.STAVY[k]}<b>${counts[k] || 0}</b></button>`).join('')}</div>
      <div class="toolbar">
        <input type="search" id="leadQ" placeholder="${esc(T.hladat)}" value="${esc(filt.q)}">
        <select id="leadCamp"><option value="">${T.vsetkyK}</option>${S.kampane.map(c => `<option value="${esc(c.id)}" ${filt.kampan === c.id ? 'selected' : ''}>${esc(c.nazov)}</option>`).join('')}</select>
        <button class="btn btn-ghost btn-sm" id="btnCsv" type="button">Export CSV</button>
      </div>
      ${leadTable(rows)}`;
  }

  function vKampane() {
    if (!S.kampane.length) return `<div class="card empty"><p>${T.ziadnaK}</p><p style="margin-top:1rem"><button class="btn btn-red" data-nova>${T.zadatK}</button></p></div>`;
    return `<div class="camps">${S.kampane.map(c => `
      <a class="card camp" href="#kampan/${esc(c.id)}">
        <span class="cs cs-${esc(c.stav)}">${esc(T.CSTAV[c.stav] || c.stav)}</span>
        <h3>${esc(c.nazov)}</h3>
        <p>${esc(c.ciel || '')}</p>
        <div class="progress"><i style="width:${c.pocet_firiem ? Math.min(100, c.odoslane / c.pocet_firiem * 100) : 0}%"></i></div>
        <div class="funnel">
          <div><small>${T.vybrane}</small><b>${fmt(c.pocet_firiem)}</b></div>
          <div><small>${T.osl}</small><b>${fmt(c.odoslane)}</b></div>
          <div><small>${T.odp}</small><b>${fmt(c.odpovede)}</b></div>
          <div class="z"><small>${T.zaujem}</small><b>${fmt(c.zaujemcovia)}</b></div>
        </div>
      </a>`).join('')}</div>`;
  }

  function vKampan(id) {
    const c = S.kampane.find(x => x.id === id);
    if (!c) return `<p class="empty">${T.nenajdena}</p>`;
    const leads = S.leady.filter(l => l.campaign_id === c.id);
    const ev = S.udalosti.filter(e => e.campaign_id === c.id);
    const n = (c.texty || []).length;
    return `
      <p style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap"><a href="#kampane" class="linkbtn">${T.spat}</a>${pauzaBtn(c)}</p>
      ${c.stav === 'na_schvalenie' ? `<div class="alert"><p>${T.schvBox}</p><button class="btn btn-red btn-sm" data-approve="${esc(c.id)}">${T.schvalit}</button></div>` : ''}
      ${c.stav === 'pauza' ? `<div class="alert"><p>${T.pauzaBox}</p></div>` : ''}
      <div class="grid g4">
        <div class="card kpi"><small>${T.vybraneF}</small><b>${fmt(c.pocet_firiem)}</b><span>${esc(T.CSTAV[c.stav] || c.stav)}</span></div>
        <div class="card kpi"><small>${T.osl}</small><b>${fmt(c.odoslane)}</b><span>${T.zVyberu(pct(c.odoslane, c.pocet_firiem))}</span></div>
        <div class="card kpi"><small>${T.odp}</small><b>${fmt(c.odpovede)}</b><span>${pct(c.odpovede, c.odoslane)} · ${T.odhlaseni(fmt(c.odhlasenia))}</span></div>
        <div class="card kpi hot"><small>${T.zaujemcovia}</small><b>${fmt(c.zaujemcovia)}</b><span>${T.zOslovenych(pct(c.zaujemcovia, c.odoslane))}</span></div>
      </div>
      <div class="cdet" style="margin-top:1.2rem">
        <div class="card">
          <div class="card-h"><h2>${T.textyM}</h2><span class="muted" style="font-size:.8rem">${T.sprav(n)}</span></div>
          ${n ? c.texty.map((t, i) => `<div class="mail"><div class="mail-h"><span>${i === 0 ? T.uvodny : T.prip(i)}</span><span>${i === 0 ? T.den1 : T.poDnoch(esc(t.po_dnoch || 3))}</span></div><p class="mail-s">${esc((Array.isArray(t.predmet) ? t.predmet.join(' / ') : t.predmet) || T.rovnake)}</p><p class="mail-b">${esc(t.text)}</p></div>`).join('') : `<p class="empty">${T.textyPrip}</p>`}
          <div class="comment">
            <label for="koment" style="font-weight:600;font-size:.9rem">${T.pripomienkaL}</label>
            <textarea id="koment" rows="3" placeholder="${esc(T.pripomienkaPh)}"></textarea>
            <button class="btn btn-ghost btn-sm" data-comment="${esc(c.id)}" style="justify-self:start">${T.poslatPrip}</button>
            ${(c.pripomienky || []).map(p => `<p class="sum"><b>${esc(dt(p.ts))}</b><span>${esc(p.text)}</span></p>`).join('')}
          </div>
        </div>
        <div class="grid">
          <div class="card">
            <div class="card-h"><h2>${T.ciel}</h2></div>
            <dl class="dl">
              <dt>${T.popis}</dt><dd>${esc(c.ciel || '–')}</dd>
              <dt>${T.odvetvia}</dt><dd><span class="chips-s">${(c.segmenty || []).map(s => `<span>${esc(s)}</span>`).join('') || '–'}</span></dd>
              <dt>${T.kraje}</dt><dd>${esc((c.kraje || []).join(', ') || T.celaKrajina)}</dd>
              <dt>${T.start}</dt><dd>${esc(c.start || '–')}</dd>
              ${c.schvalene ? `<dt>${T.schvalene}</dt><dd>${esc(dt(c.schvalene))}</dd>` : ''}
            </dl>
          </div>
          <div class="card">
            <div class="card-h"><h2>${T.udalosti}</h2></div>
            ${ev.length ? `<ul class="feed">${ev.map(e => `<li><time>${esc(ago(e.ts))}</time><span class="t-${esc(e.typ)}">${esc(e.text)}</span></li>`).join('')}</ul>` : `<p class="muted">${T.zatialNic}</p>`}
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:1.2rem"><div class="card-h"><h2>${T.zTejto}</h2></div>${leadTable(leads)}</div>`;
  }

  function vUcet() {
    const k = S.klient || {};
    return `<div class="grid g2">
      <div class="card">
        <div class="card-h"><h2>${T.firma}</h2></div>
        <dl class="dl">
          <dt>${T.firma}</dt><dd>${esc(k.firma || '–')}</dd>
          <dt>${T.kontakt}</dt><dd>${esc(k.meno || '–')}</dd>
          <dt>E-mail</dt><dd>${esc(k.email || '–')}</dd>
          <dt>${T.ico}</dt><dd>${esc(k.ico || '–')}</dd>
        </dl>
        <p class="muted" style="font-size:.85rem;margin-top:1.2rem">${T.zmenaUdajov}</p>
      </div>
      <div class="card">
        <div class="card-h"><h2>${T.zmenaHesla}</h2></div>
        <form id="passForm" class="form form-flat" style="margin-top:0">
          <label>${T.sucasne}<input type="password" name="stare" autocomplete="current-password" required></label>
          <label>${T.nove}<input type="password" name="nove" autocomplete="new-password" minlength="8" required></label>
          <button class="btn btn-ink" type="submit">${T.zmenit}</button>
          <p class="form-msg" id="passMsg"></p>
        </form>
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <div class="card-h"><h2>${T.faktury}</h2></div>
      ${(S.faktury || []).length ? `<dl class="dl">${S.faktury.map(f => `<dt>č. ${esc(f.cislo)}</dt><dd>${f.suma_eur != null ? fmt(f.suma_eur) + ' ' + T.mena + ' · ' : ''}${f.stav === 'zaplatena' ? T.zaplatena : f.splatnost ? T.splatna(esc(f.splatnost.split('-').reverse().join('. '))) : ''} · <a href="#" data-faktura="${esc(f.id)}" style="color:var(--red)">${T.stiahnut}</a></dd>`).join('')}</dl>` : `<p class="muted">${T.ziadneF}</p>`}
    </div>`;
  }

  // ---------- detail záujemcu ----------
  function openLead(id) {
    const l = S.leady.find(x => x.id === id); if (!l) return;
    const c = S.kampane.find(x => x.id === l.campaign_id);
    const pr = c?.texty?.[0]?.predmet;
    $('#drawerBody').innerHTML = `
      <p class="kicker">${esc(c?.nazov || T.zaujemcovia)} · ${esc(ago(l.vytvorene))}</p>
      <h2 class="dw-h" id="dwTitle">${esc(l.firma || l.email)}</h2>
      <p class="muted">${esc([l.kontakt, l.obor, [l.mesto, l.kraj].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</p>
      ${l.zhrnutie ? `<p class="sum" style="margin-top:1.2rem"><b>${T.coChce}</b><span>${esc(l.zhrnutie)}</span></p>` : ''}
      <div class="quote">${esc(l.odpoved || '')}</div>
      <div class="contact-actions">
        ${l.email ? `<a class="btn btn-red btn-sm" href="mailto:${esc(l.email)}?subject=${encodeURIComponent('Re: ' + ((Array.isArray(pr) ? pr[0] : pr) || T.vasaOdp))}">${T.napisat}</a>` : ''}
        ${l.telefon ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(l.telefon.replace(/\s/g, ''))}">${T.zavolat(esc(l.telefon))}</a>` : ''}
        ${l.web ? `<a class="btn btn-ghost btn-sm" href="${esc(/^https?:/.test(l.web) ? l.web : 'https://' + l.web)}" target="_blank" rel="noopener">Web</a>` : ''}
      </div>
      <dl class="dl">${[['E-mail', l.email], [T.telefon, l.telefon], [T.ico, l.ico], [T.teplota, T.TEPL[l.teplota]]].filter(x => x[1]).map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
      <form class="form form-flat" id="leadForm" data-id="${esc(l.id)}">
        <label>${T.stavObchodu}</label>
        <div class="stav-pick">${Object.entries(T.STAVY).map(([k, v]) => `<button type="button" data-s="${k}" class="${l.stav === k ? 'on' : ''}">${v}</button>`).join('')}</div>
        <input type="hidden" name="stav" value="${esc(l.stav)}">
        <label>${T.hodnotaObchodu}<input name="hodnota_eur" type="number" min="0" step="1" value="${esc(l.hodnota_eur ?? '')}"></label>
        <label>${T.poznamka}${l.stav === 'reklamacia' ? T.dovodRekl : ''}<textarea name="poznamka" rows="3">${esc(l.poznamka || '')}</textarea></label>
        <button class="btn btn-ink" type="submit">${T.ulozit}</button>
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
      if (demo) { toast(T.demoFakt); return; }
      try { const r = await fetch(API + '/api/faktury/' + fa.dataset.faktura, { headers: { Authorization: 'Bearer ' + (store.get(TK) || '') } }); if (!r.ok) throw 0; open(URL.createObjectURL(await r.blob()), '_blank'); } catch { toast(T.faktChyba); }
      return;
    }
    const ap = t.closest('[data-approve]');
    if (ap) {
      if (!confirm(T.confSchv)) return;
      try {
        if (!demo) await api(`/api/campaigns/${ap.dataset.approve}/approve`, {});
        const c = S.kampane.find(x => x.id === ap.dataset.approve); c.stav = 'schvalena'; c.schvalene = new Date().toISOString();
        S.udalosti.unshift({ ts: new Date().toISOString(), typ: 'schvalenie', text: T.schvEv, campaign_id: c.id });
        toast(demo ? T.demoSchv : T.schvOk); route();
      } catch (err) { toast(err.message); }
      return;
    }
    const pz = t.closest('[data-pauza], [data-pokracovat]');
    if (pz) {
      const pauza = pz.hasAttribute('data-pauza'), id = pz.dataset.pauza || pz.dataset.pokracovat;
      if (!confirm(pauza ? T.confPauza : T.confPokr)) return;
      try {
        if (demo) { toast(T.demoPauza); return; }
        await api(`/api/campaigns/${id}/${pauza ? 'pauza' : 'pokracovat'}`, {});
        await load(); toast(pauza ? T.pauzaOk : T.pokrOk); route();
      } catch (err) { toast(err.message); }
      return;
    }
    const cm = t.closest('[data-comment]');
    if (cm) {
      const text = $('#koment').value.trim(); if (!text) return toast(T.napistePrip);
      try {
        if (!demo) await api(`/api/campaigns/${cm.dataset.comment}/comment`, { text });
        const c = S.kampane.find(x => x.id === cm.dataset.comment); (c.pripomienky ||= []).push({ ts: new Date().toISOString(), text });
        toast(demo ? T.demoPrip : T.pripOk); route();
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
        $('#drawer').hidden = true; toast(demo ? T.demoUloz : T.ulozene); route();
      } catch (err) { toast(err.message); }
    }
    if (e.target.id === 'passForm') {
      e.preventDefault(); const m = $('#passMsg');
      if (demo) { m.className = 'form-msg err'; m.textContent = T.demoHeslo; return; }
      try { await api('/api/password', Object.fromEntries(new FormData(e.target))); e.target.reset(); m.className = 'form-msg ok'; m.textContent = T.hesloOk; }
      catch (err) { m.className = 'form-msg err'; m.textContent = err.message; }
    }
    if (e.target.id === 'novaForm') {
      e.preventDefault(); const m = $('#novaMsg'); const f = Object.fromEntries(new FormData(e.target));
      if (demo) { m.className = 'form-msg err'; m.innerHTML = T.demoZad; return; }
      const k = S.klient || {};
      try {
        await fetch(API + '/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ponuka: f.ponuka, zakaznik: f.zakaznik, objem: f.objem, poznamka: f.poznamka, meno: k.meno, email: k.email, firma: k.firma, jazyk: J, zdroj: 'portal:' + k.id }) })
          .then(r => r.json()).then(j => { if (!j.ok) throw new Error(j.chyba); });
        e.target.reset(); m.className = 'form-msg ok'; m.textContent = T.zadOk;
      } catch (err) { m.className = 'form-msg err'; m.textContent = err.message || T.neodoslane; }
    }
  });

  function csv() {
    const kl = ['firma', 'ico', 'kontakt', 'email', 'telefon', 'web', 'mesto', 'kraj', 'zhrnutie', 'odpoved', 'stav', 'hodnota_eur', 'poznamka', 'vytvorene'];
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const out = '﻿' + [T.csv.map(q).join(';'), ...S.leady.map(l => kl.map(k => q(k === 'stav' ? T.STAVY[l[k]] : l[k])).join(';'))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out], { type: 'text/csv;charset=utf-8' }));
    a.download = `${T.csvN}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
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
  prelozStranku();
  if (demo || store.get(TK)) start(); else showLogin();

  // ---------- ukážkové dáta ----------
  function demoData() {
    const sk = J === 'sk';
    const now = Date.now(), iso = h => new Date(now - h * 3600e3).toISOString();
    const denne = (n, base, z) => { const o = {}; for (let i = n; i >= 0; i--) { const d = new Date(now - i * 864e5); if ([0, 6].includes(d.getDay())) continue; const s = Math.round(base * (0.8 + Math.random() * 0.4)); o[d.toISOString().slice(0, 10)] = { odoslane: s, odpovede: Math.round(s * 0.06), zaujemcovia: Math.round(s * z * (0.5 + Math.random())) }; } return o; };
    const kampane = sk ? [
      { id: 'c1', nazov: 'IT správa – výrobné firmy západ', stav: 'bezi', ciel: 'Výrobné a logistické firmy s 20 – 200 zamestnancami, konateľ alebo prevádzkový riaditeľ, Trnavský, Nitriansky a Trenčiansky kraj', segmenty: ['Výroba a priemysel', 'Logistika a doprava'], kraje: ['Trnavský', 'Nitriansky', 'Trenčiansky'], pocet_firiem: 2418, odoslane: 1874, odpovede: 112, zaujemcovia: 58, odhlasenia: 23, start: '2026-09-22', denne: denne(16, 140, 0.031),
        texty: [
          { predmet: ['Výpadok servera vo výrobe, kto to u vás rieši?'], text: 'Dobrý deň,\n\nstaráme sa o IT v 40 výrobných firmách na západnom Slovensku a najčastejšie počujeme jedno: keď stojí server, stojí výroba. Máte to u vás pokryté, alebo by sa hodil druhý názor?\n\nStačí odpísať „áno“ a pošlem, ako to máme nastavené v podobnej firme.\n\nS pozdravom\nMartin Kováč\nNovák Servis s.r.o.' },
          { po_dnoch: 4, text: 'Dobrý deň,\n\nlen krátko nadväzujem. Ak by vás zaujímalo, ako by vyzerala správa IT u vás, pošlem to ešte dnes. Ak to nie je aktuálne, odpíšte „nie“ a už nebudem rušiť.\n\nMartin Kováč' },
        ] },
      { id: 'c2', nazov: 'IT správa – kancelárie Bratislava', stav: 'na_schvalenie', ciel: 'Firmy so službami a kanceláriou v Bratislave, 10 – 80 zamestnancov', segmenty: ['IT, marketing a médiá', 'Služby pre firmy'], kraje: ['Bratislavský'], pocet_firiem: 3120, odoslane: 0, odpovede: 0, zaujemcovia: 0, odhlasenia: 0, denne: {},
        texty: [
          { predmet: ['Počítače v kancelárii bez starostí'], text: 'Dobrý deň,\n\nstaráme sa o počítače a siete v kanceláriách v Bratislave – správa, zálohy, bezpečnosť, jedna mesačná cena. Pri zmluve od decembra prvý mesiac za polovicu.\n\nMám vám poslať, koľko by to stálo pre vašu kanceláriu?\n\nMartin Kováč\nNovák Servis s.r.o.' },
          { po_dnoch: 3, text: 'Dobrý deň,\n\nnadväzujem na môj e-mail. Ak by sa vám hodila cenová ponuka, pošlem ju ešte dnes.\n\nMartin Kováč' },
          { po_dnoch: 5, text: 'Dobrý deň,\n\nposledná správa odo mňa – ak IT teraz neriešite, rozumiem. Keby sa to zmenilo, stačí odpísať na tento e-mail.\n\nMartin Kováč' },
        ] },
      { id: 'c3', nazov: 'Test – sklady Žilina', stav: 'hotova', ciel: 'Sklady a veľkoobchody v Žilinskom kraji', segmenty: ['Veľkoobchod a distribúcia'], kraje: ['Žilinský'], pocet_firiem: 1000, odoslane: 1000, odpovede: 61, zaujemcovia: 34, odhlasenia: 12, start: '2026-09-01', denne: {}, texty: [] },
    ] : [
      { id: 'c1', nazov: 'IT správa – výrobní firmy Morava', stav: 'bezi', ciel: 'Výrobní a logistické firmy s 20–200 zaměstnanci, jednatel nebo provozní ředitel, Olomoucký, Zlínský a Moravskoslezský kraj', segmenty: ['Výroba a průmysl', 'Logistika a doprava'], kraje: ['Olomoucký', 'Zlínský', 'Moravskoslezský'], pocet_firiem: 2418, odoslane: 1874, odpovede: 112, zaujemcovia: 58, odhlasenia: 23, start: '2026-09-22', denne: denne(16, 140, 0.031),
        texty: [
          { predmet: ['Výpadek serveru ve výrobě, kdo to u vás řeší?'], text: 'Dobrý den,\n\nstaráme se o IT ve 40 výrobních firmách na Moravě a nejčastěji slyšíme jedno: když stojí server, stojí výroba. Máte to u vás pokryté, nebo by se hodil druhý názor?\n\nStačí odepsat „ano“ a pošlu, jak to máme nastavené u podobné firmy.\n\nS pozdravem\nMartin Kovář\nNovák Servis s.r.o.' },
          { po_dnoch: 4, text: 'Dobrý den,\n\njen krátce navazuji. Kdyby vás zajímalo, jak by vypadala správa IT u vás, pošlu to ještě dnes. Pokud to není aktuální, odepište „ne“ a už nebudu rušit.\n\nMartin Kovář' },
        ] },
      { id: 'c2', nazov: 'IT správa – kanceláře Brno', stav: 'na_schvalenie', ciel: 'Firmy se službami a kanceláří v Brně, 10–80 zaměstnanců', segmenty: ['IT, marketing a média', 'Služby pro firmy'], kraje: ['Jihomoravský'], pocet_firiem: 3120, odoslane: 0, odpovede: 0, zaujemcovia: 0, odhlasenia: 0, denne: {},
        texty: [
          { predmet: ['Počítače v kanceláři bez starostí'], text: 'Dobrý den,\n\nstaráme se o počítače a sítě v kancelářích v Brně – správa, zálohy, bezpečnost, jedna měsíční cena. Při smlouvě od prosince první měsíc za polovinu.\n\nMám vám poslat, kolik by to stálo pro vaši kancelář?\n\nMartin Kovář\nNovák Servis s.r.o.' },
          { po_dnoch: 3, text: 'Dobrý den,\n\nnavazuji na svůj e-mail. Kdyby se vám hodila cenová nabídka, pošlu ji ještě dnes.\n\nMartin Kovář' },
          { po_dnoch: 5, text: 'Dobrý den,\n\nposlední zpráva ode mě – pokud IT teď neřešíte, rozumím. Kdyby se to změnilo, stačí odepsat na tento e-mail.\n\nMartin Kovář' },
        ] },
      { id: 'c3', nazov: 'Test – sklady Ostrava', stav: 'hotova', ciel: 'Sklady a velkoobchody v Moravskoslezském kraji', segmenty: ['Velkoobchod a distribuce'], kraje: ['Moravskoslezský'], pocet_firiem: 1000, odoslane: 1000, odpovede: 61, zaujemcovia: 34, odhlasenia: 12, start: '2026-09-01', denne: {}, texty: [] },
    ];
    const L = sk ? [
      ['Logistika Váh s.r.o.', 'Ing. Peter Mráz', 'Hlohovec', 'Trnavský', 'Pošlite cenu správy pre 60 počítačov, ideálne aj termín stretnutia. Ďakujem, Mráz', 'Chce cenu správy 60 PC a termín stretnutia.', 'horuci', 'stretnutie', 'c1', 3],
      ['Kovo Záhorie a.s.', 'Jana Holubová', 'Senica', 'Trnavský', 'Dobrý deň, aktuálne riešime nového dodávateľa IT od januára. Prosím o ponuku, máme 3 prevádzky.', 'Hľadá dodávateľa IT od januára, 3 prevádzky.', 'horuci', 'novy', 'c1', 1],
      ['Plasty Nitra s.r.o.', 'Michal Benko', 'Nitra', 'Nitriansky', 'Zaujíma nás to, sieť nám vypadáva. Zavolajte mi prosím 0905 xxx xxx.', 'Chce telefonát, výpadky siete.', 'horuci', 'kontaktovany', 'c1', 7],
      ['Drevotech Považie s.r.o.', 'Ing. Lucia Šimková', 'Púchov', 'Trenčiansky', 'Pošlite PDF s referenciami, prediskutujeme na porade vo štvrtok.', 'Chce referencie, rozhodnú vo štvrtok.', 'teply', 'ponuka', 'c1', 26],
      ['Agro Podunajsko s.r.o.', 'Tomáš Varga', 'Nové Zámky', 'Nitriansky', 'Máme dodávateľa, ale zmluva končí v januári. Pošlite ponuku, porovnáme.', 'Zmluva im končí v januári, chcú porovnať ponuky.', 'teply', 'novy', 'c1', 2],
      ['Strojárne Dubnica s.r.o.', 'Pavol Kukučka', 'Dubnica nad Váhom', 'Trenčiansky', 'Aká je minimálna zmluva? Radi by sme sa stretli osobne.', 'Chce stretnutie, pýta sa na minimálnu zmluvu.', 'horuci', 'obchod', 'c1', 72],
      ['Sklad Pezinok s.r.o.', 'Erika Molnárová', 'Trnava', 'Trnavský', 'Teraz nie, ozvite sa prosím v marci.', 'Aktuálne nie, ozvať sa v marci.', 'neskor', 'neaktualny', 'c1', 50],
      ['Velkosklad Martin s.r.o.', 'Juraj Kollár', 'Martin', 'Žilinský', 'Ďakujem, pošlite cenník.', 'Chce cenník.', 'teply', 'ponuka', 'c3', 400],
      ['Kysuca Distribúcia a.s.', 'Ing. Mária Pajtinková', 'Čadca', 'Žilinský', 'Zaujíma nás to, prosím zavolajte po 14:00.', 'Chce telefonát po 14:00.', 'horuci', 'obchod', 'c3', 420],
    ] : [
      ['Logistika Olomouc s.r.o.', 'Ing. Petr Mráz', 'Olomouc', 'Olomoucký', 'Pošlete cenu správy pro 60 počítačů, ideálně i termín schůzky. Děkuji, Mráz', 'Chce cenu správy 60 PC a termín schůzky.', 'horuci', 'stretnutie', 'c1', 3],
      ['Kovo Hranice a.s.', 'Jana Holubová', 'Hranice', 'Olomoucký', 'Dobrý den, aktuálně řešíme nového dodavatele IT od ledna. Prosím o nabídku, máme 3 provozy.', 'Hledá dodavatele IT od ledna, 3 provozy.', 'horuci', 'novy', 'c1', 1],
      ['Plasty Zlín s.r.o.', 'Michal Beneš', 'Zlín', 'Zlínský', 'Zajímá nás to, síť nám vypadává. Zavolejte mi prosím 605 xxx xxx.', 'Chce telefonát, výpadky sítě.', 'horuci', 'kontaktovany', 'c1', 7],
      ['Dřevo Vsetín s.r.o.', 'Ing. Lucie Šimková', 'Vsetín', 'Zlínský', 'Pošlete PDF s referencemi, probereme na poradě ve čtvrtek.', 'Chce reference, rozhodnou ve čtvrtek.', 'teply', 'ponuka', 'c1', 26],
      ['Agro Kroměříž s.r.o.', 'Tomáš Vágner', 'Kroměříž', 'Zlínský', 'Máme dodavatele, ale smlouva končí v lednu. Pošlete nabídku, porovnáme.', 'Smlouva jim končí v lednu, chtějí porovnat nabídky.', 'teply', 'novy', 'c1', 2],
      ['Strojírny Přerov a.s.', 'Pavel Kukla', 'Přerov', 'Olomoucký', 'Jaká je minimální smlouva? Rádi bychom se sešli osobně.', 'Chce schůzku, ptá se na minimální smlouvu.', 'horuci', 'obchod', 'c1', 72],
      ['Sklad Šumperk s.r.o.', 'Eva Molnárová', 'Šumperk', 'Olomoucký', 'Teď ne, ozvěte se prosím v březnu.', 'Aktuálně ne, ozvat se v březnu.', 'neskor', 'neaktualny', 'c1', 50],
      ['Velkosklad Ostrava s.r.o.', 'Jiří Kollár', 'Ostrava', 'Moravskoslezský', 'Děkuji, pošlete ceník.', 'Chce ceník.', 'teply', 'ponuka', 'c3', 400],
      ['Beskydy Distribuce a.s.', 'Ing. Marie Pajurková', 'Frýdek-Místek', 'Moravskoslezský', 'Zajímá nás to, prosím zavolejte po 14:00.', 'Chce telefonát po 14:00.', 'horuci', 'obchod', 'c3', 420],
    ];
    const tld = sk ? '.sk' : '.cz';
    const leady = L.map(([firma, kontakt, mesto, kraj, odpoved, zhrnutie, teplota, stav, campaign_id, h], i) => ({ id: 'l' + i, firma, kontakt, mesto, kraj, odpoved, zhrnutie, teplota, stav, campaign_id, vytvorene: iso(h), email: 'kontakt@' + firma.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '').slice(0, 14) + tld, telefon: i % 2 ? '' : (sk ? '+421 9xx xxx xxx' : '+420 6xx xxx xxx'), obor: sk ? 'Výroba a priemysel' : 'Výroba a průmysl', hodnota_eur: stav === 'obchod' ? (sk ? [580, 420] : [14500, 9800])[i % 2] : null, poznamka: '' }));
    const udalosti = [
      ...leady.slice(0, 6).map(l => ({ ts: l.vytvorene, typ: 'zaujemca', text: (sk ? 'Nový záujemca: ' : 'Nový zájemce: ') + l.firma, campaign_id: l.campaign_id })),
      { ts: iso(5), typ: 'info', text: sk ? 'Návrh kampane „IT správa – kancelárie Bratislava“ je pripravený na schválenie.' : 'Návrh kampaně „IT správa – kanceláře Brno“ je připravený ke schválení.', campaign_id: 'c2' },
      { ts: iso(26), typ: 'info', text: sk ? 'Odoslaných ďalších 142 e-mailov.' : 'Odesláno dalších 142 e-mailů.', campaign_id: 'c1' },
      { ts: iso(380), typ: 'info', text: sk ? 'Kampaň dokončená: 1 000 oslovených, 34 záujemcov.' : 'Kampaň dokončena: 1 000 oslovených, 34 zájemců.', campaign_id: 'c3' },
    ].sort((a, b) => b.ts.localeCompare(a.ts));
    return { klient: { id: 'demo', firma: 'Novák Servis s.r.o. (' + (sk ? 'ukážka' : 'ukázka') + ')', meno: 'Martin Kováč', email: 'ukazka@mailito.eu', ico: '00 000 000' }, kampane, leady, udalosti, leadStat: [] };
  }
})();
