// Mailito – príbeh jedného e-mailu pri skrolovaní (Three.js, natívny scroll, bez knižníc).
// 0 AI pripraví kampaň · 1 obálky letia k firmám · 2 firmy odpisujú · 3 zákazky = mince
import { nacitaj, mats, envMats, island, tree, cloud, mailbox, sh, rnd, webgl, setri, slabe, reduce } from './clay3d.js?v=346b9b1c';
import * as M3 from './clay3d.js?v=346b9b1c';

const sec = document.querySelector('[data-story]');
const fallback = document.getElementById('ako');
if (sec && webgl && !setri && !reduce) {
  sec.hidden = false; if (fallback) { fallback.hidden = true; fallback.id = 'ako-tl'; } sec.id = 'ako';
  const pin = sec.querySelector('.story-pin'), host = sec.querySelector('.story-gl'), kroky = [...sec.querySelectorAll('.story-step')], bar = sec.querySelector('.story-prog i');
  const dots = [...sec.querySelectorAll('.story-dots button')];
  let prog = 0, cur = -1;
  const meraj = () => { const r = sec.getBoundingClientRect(); prog = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); };
  addEventListener('scroll', meraj, { passive: true }); addEventListener('resize', meraj); meraj();
  const nastavKrok = i => {
    if (i === cur) return; cur = i;
    kroky.forEach((k, j) => k.classList.toggle('on', j === i));
    dots.forEach((d, j) => d.classList.toggle('on', j <= i));
    try { window.mailitoEv?.('pribeh_krok_' + (i + 1)); } catch {}
  };
  dots.forEach((d, j) => d.addEventListener('click', () => { const r = sec.getBoundingClientRect(), top = scrollY + r.top; scrollTo({ top: top + (r.height - innerHeight) * ((j + 0.5) / 4), behavior: 'smooth' }); }));
  // texty sa prepínajú aj bez 3D (kým sa načíta)
  const loopTxt = () => { nastavKrok(Math.min(3, Math.floor(prog * 4))); if (bar) bar.style.transform = `scaleX(${prog})`; requestAnimationFrame(loopTxt); };
  loopTxt();

  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); nacitaj().then(start).catch(() => {}); } }, { rootMargin: '600px' });
  io.observe(sec);

  function start() {
    const THREE = M3.THREE;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 2 : slabe ? 1.25 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0xdde7ec, 40, 90);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xeef4ff, 0x7a9563, 1.4));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.5); sun.position.set(-6, 18, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(slabe ? 1024 : 2048, slabe ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 16, bottom: -16, near: 1, far: 60 }); sun.shadow.radius = 5; sun.shadow.bias = -0.0005;
    scene.add(sun);
    const M = mats(), E = envMats();
    const wall = new THREE.MeshStandardMaterial({ color: 0xf1e7d9, roughness: 0.9 }), roof = new THREE.MeshStandardMaterial({ color: 0xc99a8b, roughness: 0.9 }), roof2 = new THREE.MeshStandardMaterial({ color: 0xb7b0a8, roughness: 0.9 });

    // ostrov A: schránka
    const A = new THREE.Group(); A.position.set(-10, 0, 0); scene.add(A);
    A.add(island(M, 4.2));
    const { mb, flag, slot } = mailbox(M); mb.scale.setScalar(0.78); mb.position.set(0.2, 2.35, 0); mb.rotation.y = 0.75; A.add(mb);
    [[-2.6, -1.2, 0.9, 0], [2.6, -1.4, 0.8, 1], [-1.6, 2.2, 0.7, 1], [2.2, 2.0, 0.9, 0]].forEach(([x, z, s, k]) => { const t = tree(M, s, k); t.position.set(x, 0.35, z); A.add(t); });
    // ostrov B: dedina firiem
    const B = new THREE.Group(); B.position.set(5, 1.2, -7); scene.add(B);
    B.add(island(M, 5.6));
    const firmy = [];
    const dom = (x, z, ry, hala) => {
      const g = new THREE.Group();
      if (hala) {
        const b = sh(new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.7), wall)); b.position.y = 0.55; g.add(b);
        for (let i = 0; i < 3; i++) { const r = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.72, 3), roof2)); r.rotation.set(Math.PI / 2, Math.PI / 2, Math.PI / 2); r.position.set(-0.85 + i * 0.85, 1.25, 0); r.scale.set(0.85, 1, 0.55); g.add(r); }
      } else {
        const b = sh(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.95, 1.1), wall)); b.position.y = 0.48; g.add(b);
        const r = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.45, 3), roof)); r.rotation.z = Math.PI / 2; r.position.y = 1.2; r.scale.set(0.6, 1, 0.98); g.add(r);
      }
      g.position.set(x, 0.35, z); g.rotation.y = ry; B.add(g);
      firmy.push(new THREE.Vector3(x, hala ? 1.9 : 1.8, z));
    };
    [[-3, -1, 0.3, 1], [-0.6, 1.8, -0.2, 0], [1.8, -1.6, 0.5, 0], [3.2, 1.2, -0.4, 1], [-2.8, 2.6, 0.1, 0], [0.6, -0.2, 0.2, 0], [-1.2, -3.1, 0, 0], [2.4, 3.4, 0.4, 0]].forEach(a => dom(...a));
    [[-4.4, 0.8, 0.7, 1], [4.6, -1.2, 0.8, 0], [0.4, 4.2, 0.6, 1], [-0.2, -4.4, 0.7, 0]].forEach(([x, z, s, k]) => { const t = tree(M, s, k); t.position.set(x, 0.35, z); B.add(t); });
    // ostrov C: zákazky – stĺpce mincí
    const C = new THREE.Group(); C.position.set(15, -0.4, 1); scene.add(C);
    C.add(island(M, 4));
    const coinG = new THREE.CylinderGeometry(0.46, 0.46, 0.14, 30);
    const stlpy = [-1.6, -0.5, 0.6, 1.7].map((x, i) => ({ x, z: 0.3 - Math.abs(x) * 0.2, n: 0, max: 6 + i * 4, list: [] }));
    [[-2.6, -1.6, 0.8, 1], [2.7, -1.2, 0.75, 0], [-2.2, 2.0, 0.65, 0]].forEach(([x, z, s, k]) => { const t = tree(M, s, k); t.position.set(x, 0.35, z); C.add(t); });
    const minca = q => { const c = sh(new THREE.Mesh(coinG, M.gold)); c.position.set(q.x + rnd(-0.03, 0.03), 0.43 + q.n * 0.15, q.z); c.rotation.y = rnd(0, 6); c.scale.setScalar(0.2); c.userData.g = 0; C.add(c); q.list.push(c); q.n++; };
    // oblaky
    const oblaky = [[-16, 8, -10, 1.2], [-2, 10, -16, 1.4], [10, 9, -14, 1.1], [22, 7, -6, 1], [-6, 6, 6, 0.6], [8, 6.5, 7, 0.55]].map(([x, y, z, s]) => { const c = cloud(M, s); c.position.set(x, y, z); scene.add(c); return c; });
    // „AI“ iskry nad schránkou (krok 0)
    const iskraG = new THREE.OctahedronGeometry(0.16, 0), iskraM = new THREE.MeshStandardMaterial({ color: 0xc8f169, emissive: 0x8fbf2a, emissiveIntensity: 0.6, roughness: 0.4 });
    const iskry = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(iskraG, iskraM); m.userData.a = (i / 10) * Math.PI * 2; A.add(m); return m; });

    // lietajúce obálky
    const geo = new THREE.BoxGeometry(1, 0.66, 0.06), lety = [], pool = [];
    const let_ = (from, to, lime, d, onEnd) => {
      const m = pool.pop() || sh(new THREE.Mesh(geo, E.white)); m.material = lime ? E.lime : E.white;
      const mid = from.clone().lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + from.distanceTo(to) * 0.28 + 1.5;
      lety.push({ m, c: new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone()), t: 0, d, spin: rnd(-1, 1), onEnd }); scene.add(m);
    };
    const wp = (g, v) => g.localToWorld(v.clone());
    const slotW = () => mb.localToWorld(slot.clone());

    // kamera – 4 zábery
    const K = [
      { p: new THREE.Vector3(-5.5, 5.5, 17), t: new THREE.Vector3(-10.5, 2, 0) },
      { p: new THREE.Vector3(-0.5, 13, 33), t: new THREE.Vector3(-0.5, 1.5, -3.5) },
      { p: new THREE.Vector3(1.5, 10, 30), t: new THREE.Vector3(-1, 2, -3) },
      { p: new THREE.Vector3(19.5, 5.5, 15), t: new THREE.Vector3(14.5, 1.2, 1) },
    ];
    const camP = K[0].p.clone(), camT = K[0].t.clone(), tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3();
    const ss = x => x * x * (3 - 2 * x);
    const size = () => {
      const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.9 ? 48 : 32; camera.updateProjectionMatrix();
      // na desktope posunúť obraz doprava, vľavo je text
      camera.setViewOffset(w, h, w / h > 1.1 ? -w * 0.16 : 0, h / w > 1.1 ? h * 0.2 : 0, w, h);
    };
    new ResizeObserver(size).observe(host); size();
    let vidno = false; new IntersectionObserver(es => { vidno = es[0].isIntersecting; }).observe(pin);
    let last = performance.now(), t = 0, next = 0, fpsN = 0, fpsT = 0, znizene = false;
    const frame = now => {
      requestAnimationFrame(frame);
      if (!vidno || document.hidden) { last = now; return; }
      const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now; t += dt;
      if (!znizene && t > 1) { fpsN++; fpsT += raw; if (fpsN === 90) { znizene = true; if (fpsT / fpsN > 1 / 38) { renderer.setPixelRatio(1); renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => (m.needsUpdate = true)); }); size(); } } }
      // kamera podľa skrolovania (plynulo)
      // stred každého kroku = jeho záber, medzi krokmi plynulý prelet
      const x = Math.min(3, Math.max(0, prog * 4 - 0.5)), i = Math.min(2, Math.floor(x)), f = ss(Math.min(1, x - i));
      tmpP.lerpVectors(K[i].p, K[i + 1].p, f); tmpT.lerpVectors(K[i].t, K[i + 1].t, f);
      camP.lerp(tmpP, 0.08); camT.lerp(tmpT, 0.08);
      camera.position.set(camP.x + Math.sin(t * 0.3) * 0.3, camP.y + Math.sin(t * 0.4) * 0.15, camP.z); camera.lookAt(camT);
      const krok = Math.min(3, Math.floor(prog * 4));
      // dianie podľa kroku
      iskry.forEach((m, j) => { const on = krok === 0 ? 1 : 0; const a = m.userData.a + t * 1.4; m.position.set(Math.cos(a) * 2.2, 3.6 + Math.sin(t * 2 + j) * 0.35, Math.sin(a) * 2.2); m.rotation.set(t * 2, t * 3, 0); m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, on ? 1 : 0.001, 0.1)); });
      if (t > next) {
        if (krok === 0) { const z = slotW(); let_(z.clone().add(new THREE.Vector3(rnd(-3, 3), 5, rnd(-2, 2))), z, false, 1.2); next = t + 0.5; }
        else if (krok === 1) { let_(slotW(), wp(B, firmy[(Math.random() * firmy.length) | 0]), false, 2.2); next = t + 0.22; }
        else if (krok === 2) { const k = (Math.random() * firmy.length) | 0; if (Math.random() < 0.55) let_(wp(B, firmy[k]), mb.localToWorld(new THREE.Vector3(0, 3.6, 0)), true, 2.4, () => { flag.rotation.z = 0.55; setTimeout(() => (flag.rotation.z = 0), 450); }); else let_(slotW(), wp(B, firmy[k]), false, 2.2); next = t + 0.3; }
        else { const vol = stlpy.filter(q => q.n < q.max); if (!vol.length) { stlpy.forEach(q => { q.list.forEach(c => C.remove(c)); q.list = []; q.n = 0; }); } else { const q = vol[(Math.random() * vol.length) | 0]; let_(wp(B, firmy[(Math.random() * firmy.length) | 0]), wp(C, new THREE.Vector3(q.x, 0.6 + q.n * 0.15, q.z)), true, 1.8, () => minca(q)); } next = t + 0.28; }
      }
      for (let j = lety.length - 1; j >= 0; j--) {
        const l = lety[j]; l.t += dt / l.d; const k = Math.min(1, l.t);
        l.m.position.copy(l.c.getPoint(k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2));
        l.m.rotation.set(Math.sin(t * 2 + l.spin) * 0.3, t * l.spin, Math.cos(t * 1.7 + l.spin) * 0.2);
        l.m.scale.setScalar(0.62 * Math.min(1, k * 6) * (1 - Math.max(0, k - 0.9) / 0.1) + 0.001);
        if (l.t >= 1) { scene.remove(l.m); pool.push(l.m); lety.splice(j, 1); l.onEnd?.(); }
      }
      stlpy.forEach(q => q.list.forEach(c => { if (c.userData.g < 1) { c.userData.g = Math.min(1, c.userData.g + dt * 5); c.scale.setScalar(0.2 + 0.8 * (1 - (1 - c.userData.g) ** 3)); } }));
      A.position.y = Math.sin(t * 1.1) * 0.12; B.position.y = 1.2 + Math.sin(t * 0.9 + 1) * 0.12; C.position.y = -0.4 + Math.sin(t * 1.0 + 2) * 0.12;
      oblaky.forEach((o, j) => { o.position.x += dt * (0.2 + j * 0.04); if (o.position.x > 30) o.position.x = -24; });
      renderer.render(scene, camera);
    };
    // na začiatku pár mincí, aby posledný záber nebol prázdny
    stlpy.forEach(q => { while (q.n < q.max * 0.35) minca(q); q.list.forEach(c => { c.userData.g = 1; c.scale.setScalar(1); }); });
    requestAnimationFrame(t0 => { last = t0; frame(t0); host.classList.add('gl-on'); });
  }
}
