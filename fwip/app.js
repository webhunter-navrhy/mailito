// FWIP pro provozovny – personalizace z osobního odkazu + kalkulačka zisku
(() => {
  const $ = s => document.querySelector(s);

  // Výchozí hodnoty podle typu provozu. Ceny jsou orientační – před ostrým spuštěním je potvrdí FWIP.
  const TYPY = {
    kavarna:    { nazev: "Kavárna / cukrárna",       porce: 15, cena: 89, dny: 26 },
    bistro:     { nazev: "Bistro / fast food",        porce: 20, cena: 79, dny: 26 },
    hotel:      { nazev: "Hotel / wellness / kemp",   porce: 20, cena: 99, dny: 30 },
    aquapark:   { nazev: "Aquapark / kino / areál",   porce: 70, cena: 89, dny: 30 },
    catering:   { nazev: "Catering / akce",           porce: 120, cena: 89, dny: 8 },
    restaurace: { nazev: "Restaurace / bar / penzion", porce: 12, cena: 99, dny: 26 },
  };
  const NAKUP = 44;          // orientačně: kapsle 37–46 Kč (velkoobchod UK/PL 2026) + kelímek a lžička; před spuštěním potvrdí FWIP
  const SEG2TYP = { A1: "kavarna", A2: "bistro", B1: "hotel", B2: "aquapark", B3: "catering", C: "restaurace" };

  // ?p=<base64url "podnik|město|segment"> z e-mailu
  let typ = "kavarna";
  try {
    const p = new URLSearchParams(location.search).get("p");
    if (p) {
      const [podnik, mesto, seg] = decodeURIComponent(escape(atob(p.replace(/-/g, "+").replace(/_/g, "/")))).split("|");
      if (podnik) {
        $("#osobneText").textContent = `Připraveno pro ${podnik}${mesto ? " · " + mesto : ""}`;
        $("#osobne").hidden = false;
        $("#fPodnik").value = podnik;
        if (mesto) $("#fMesto").value = mesto;
      }
      if (SEG2TYP[seg]) typ = SEG2TYP[seg];
    }
  } catch (e) { /* neplatný odkaz – stránka funguje i bez personalizace */ }

  const kc = n => new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(Math.round(n)) + " Kč";
  const sel = $("#cTyp");
  for (const [k, t] of Object.entries(TYPY)) sel.add(new Option(t.nazev, k));

  const R = { porce: $("#cPorce"), cena: $("#cCena"), nakup: $("#cNakup"), dny: $("#cDny") };
  const fill = el => el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min) * 100) + "%");

  function nastav(k) {
    const t = TYPY[k];
    sel.value = k;
    R.porce.value = t.porce; R.cena.value = t.cena; R.dny.value = t.dny; R.nakup.value = NAKUP;
    spocitej();
  }
  function spocitej() {
    const porce = +R.porce.value, cena = +R.cena.value, nakup = +R.nakup.value, dny = +R.dny.value;
    $("#oPorce").textContent = porce;
    $("#oCena").textContent = kc(cena);
    $("#oNakup").textContent = kc(nakup);
    $("#oDny").textContent = dny;
    const naPorci = cena / 1.12 - nakup;            // prodejní cena bez DPH 12 % (nápoje/jídlo na místě)
    const pocet = porce * dny;
    $("#rPorce").textContent = kc(naPorci);
    $("#rPocet").textContent = new Intl.NumberFormat("cs-CZ").format(pocet);
    $("#rMesic").textContent = kc(naPorci * pocet);
    $("#rSezona").textContent = kc(naPorci * pocet * 5);
    Object.values(R).forEach(fill);
  }
  sel.addEventListener("change", () => nastav(sel.value));
  Object.values(R).forEach(el => el.addEventListener("input", spocitej));
  nastav(typ);

  // Formulář – v ukázce jen potvrzení, v ostré verzi se napojí na příjem poptávek
  $("#form").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    if (f.web.value) return;
    if (!f.podnik.value.trim() || !f.email.checkValidity()) { f.reportValidity(); return; }
    $("#ok").hidden = false;
    f.querySelector("button").disabled = true;
  });
})();
