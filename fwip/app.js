// FWIP pro provozovny – personalizace, hero, stopky, kalkulačka, náhledy. Nativní scroll, bez smyček v klidu.
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  document.documentElement.classList.add("js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── hero: rozdělení nadpisu na slova ──
  const h1 = $(".split");
  if (h1) {
    let i = 0;
    const wrap = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(t => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.append(" "); return; }
            const w = document.createElement("span"); w.className = "w";
            const s = document.createElement("span"); s.textContent = t; s.style.setProperty("--i", i++);
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(h1);
  }

  // ── hero stopky 0 → 7 s ──
  const hs = $("#heroSec");
  if (hs) {
    if (reduced) hs.textContent = "7";
    else for (let s = 1; s <= 7; s++) setTimeout(() => (hs.textContent = s), 1100 + s * 1000);
  }

  // ── personalizace z odkazu ?p=base64url("podnik|město|segment") ──
  const SEG2TYP = { A1: "kavarna", A2: "bistro", B1: "hotel", B2: "aquapark", B3: "catering", C: "restaurace" };
  let typ = "kavarna";
  try {
    const p = new URLSearchParams(location.search).get("p");
    if (p) {
      const raw = atob(p.replace(/-/g, "+").replace(/_/g, "/"));
      const [podnik, mesto, seg] = new TextDecoder().decode(Uint8Array.from(raw, c => c.charCodeAt(0))).split("|");
      if (podnik) {
        $("#osobneText").textContent = `Připraveno pro ${podnik}${mesto ? " · " + mesto : ""}`;
        $("#osobne").hidden = false;
        $("#fPodnik").value = podnik;
        if (mesto) $("#fMesto").value = mesto;
      }
      if (SEG2TYP[seg]) typ = SEG2TYP[seg];
    }
  } catch (e) { /* neplatný odkaz – stránka funguje i bez personalizace */ }

  // ── navigace ──
  const nav = $("#nav"), burger = $("#burger"), mcta = $(".mcta");
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle("scrolled", y > 40);
    if (mcta) mcta.classList.toggle("on", y > innerHeight * .8 && y < document.body.scrollHeight - innerHeight * 1.6);
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  burger.addEventListener("click", () => {
    const open = !nav.classList.contains("open");
    nav.classList.toggle("open", open); burger.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  $$("#menu a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("open"); burger.setAttribute("aria-expanded", false); document.body.style.overflow = "";
  }));

  // ── reveal ──
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { rootMargin: "0px 0px -12% 0px" });
  $$(".r, .r-group, .vs").forEach(el => io.observe(el));

  // ── jak to funguje: stopky podle aktivního kroku ──
  const bw = $("#bw"), js = $("#jakSec"), C = 2 * Math.PI * 90;
  let cur = 0, tick;
  const setSec = to => {
    clearInterval(tick);
    bw.style.strokeDashoffset = C * (1 - to / 7);
    tick = setInterval(() => {
      if (cur === to) return clearInterval(tick);
      cur += cur < to ? 1 : -1; js.textContent = cur;
    }, 130);
  };
  const steps = $$(".step");
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    steps.forEach(s => s.classList.toggle("on", s === e.target));
    setSec(+e.target.dataset.s);
  }), { rootMargin: "-45% 0px -45% 0px" });
  steps.forEach(s => so.observe(s));

  // ── kalkulačka ──
  // Orientační výchozí hodnoty; kapsle 37–46 Kč podle velkoobchodu UK/PL 2026 + kelímek a lžička. Před spuštěním potvrdí FWIP.
  const TYPY = {
    kavarna:    { nazev: "Kavárna",    porce: 15,  cena: 89, dny: 26 },
    bistro:     { nazev: "Bistro",     porce: 20,  cena: 79, dny: 26 },
    hotel:      { nazev: "Hotel",      porce: 20,  cena: 99, dny: 30 },
    aquapark:   { nazev: "Aquapark",   porce: 70,  cena: 89, dny: 30 },
    catering:   { nazev: "Catering",   porce: 120, cena: 89, dny: 8 },
    restaurace: { nazev: "Restaurace", porce: 12,  cena: 99, dny: 26 },
  };
  const NAKUP = 44;
  const kc = n => new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(Math.round(n));
  const R = { porce: $("#cPorce"), cena: $("#cCena"), nakup: $("#cNakup"), dny: $("#cDny") };
  const segs = $("#segs");
  for (const [k, t] of Object.entries(TYPY)) {
    const b = document.createElement("button"); b.type = "button"; b.role = "radio"; b.dataset.k = k; b.textContent = t.nazev;
    b.addEventListener("click", () => nastav(k)); segs.append(b);
  }
  const fill = el => el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min) * 100) + "%");
  let shown = 0, anim;
  const countTo = (el, to) => {
    cancelAnimationFrame(anim);
    const from = shown, t0 = performance.now(), d = reduced ? 1 : 600;
    const step = t => {
      const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
      shown = from + (to - from) * e; el.textContent = kc(shown);
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  function nastav(k) {
    const t = TYPY[k];
    segs.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", b.dataset.k === k));
    R.porce.value = t.porce; R.cena.value = t.cena; R.dny.value = t.dny; R.nakup.value = NAKUP;
    spocitej();
  }
  function spocitej() {
    const porce = +R.porce.value, cena = +R.cena.value, nakup = +R.nakup.value, dny = +R.dny.value;
    $("#oPorce").textContent = porce;
    $("#oCena").textContent = kc(cena) + " Kč";
    $("#oNakup").textContent = kc(nakup) + " Kč";
    $("#oDny").textContent = dny;
    const naPorci = cena / 1.12 - nakup;          // prodejní cena bez DPH 12 % (jídlo na místě)
    const pocet = porce * dny, mesic = naPorci * pocet;
    $("#rPorce").textContent = kc(naPorci) + " Kč";
    $("#rPocet").textContent = kc(pocet);
    $("#rSezona").textContent = kc(mesic * 5) + " Kč";
    $("#oBar").style.width = Math.max(2, Math.min(100, mesic / 1500)) + "%";
    countTo($("#rMesic"), mesic);
    Object.values(R).forEach(fill);
  }
  Object.values(R).forEach(el => el.addEventListener("input", spocitej));
  nastav(typ);

  // ── proč FWIP: náhled obrázku u kurzoru (jen myš) ──
  const pv = $("#pv");
  if (pv && matchMedia("(hover:hover) and (pointer:fine)").matches) {
    let x = 0, y = 0, raf = 0;
    const move = () => { pv.style.left = x + "px"; pv.style.top = y + "px"; raf = 0; };
    $$(".row[data-img]").forEach(row => {
      row.addEventListener("mouseenter", () => { pv.style.backgroundImage = `url(${row.dataset.img})`; pv.classList.add("on"); });
      row.addEventListener("mouseleave", () => pv.classList.remove("on"));
      row.addEventListener("mousemove", e => { x = e.clientX + 150; y = e.clientY; if (!raf) raf = requestAnimationFrame(move); });
    });
  }

  // ── příchutě: šipky ──
  const flav = $("#flav");
  const by = dir => flav.scrollBy({ left: dir * (flav.querySelector("figure").offsetWidth + 20), behavior: "smooth" });
  $("#fPrev").addEventListener("click", () => by(-1));
  $("#fNext").addEventListener("click", () => by(1));

  // ── čísla ──
  const co = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    co.unobserve(e.target);
    const el = e.target, to = +el.dataset.to, t0 = performance.now(), d = reduced ? 1 : 1600;
    const step = t => {
      const k = Math.min(1, (t - t0) / d), v = to * (1 - Math.pow(1 - k, 3));
      el.textContent = to >= 1000 ? kc(v) : Math.round(v);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$("[data-to]").forEach(el => co.observe(el));

  // ── magnetická tlačítka (jen myš) ──
  if (matchMedia("(hover:hover) and (pointer:fine)").matches && !reduced) {
    $$(".mag").forEach(b => {
      b.addEventListener("mousemove", e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .14}px,${(e.clientY - r.top - r.height / 2) * .2}px)`;
      });
      b.addEventListener("mouseleave", () => (b.style.transform = ""));
    });
  }

  // ── formulář: v ukázce jen potvrzení ──
  $("#form").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    if (f.web.value) return;
    if (!f.podnik.value.trim() || !f.email.checkValidity()) { f.reportValidity(); return; }
    $("#ok").hidden = false;
    f.querySelector("button[type=submit]").disabled = true;
  });
})();
