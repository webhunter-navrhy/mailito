// Mailito – malé hlinené 3D scény (Three.js) namiesto obrázkov.
// <div data-3d="box"> schránka na ostrovčeku posiela obálky, vracajú sa limetkové odpovede
// <div data-3d="funnel"> obálky padajú do lievika, von padajú mince
// Three.js sa načíta až pri prvej viditeľnej scéne
let THREE;
const nacitaj = () => THREE ? Promise.resolve() : import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js').then(m => { THREE = m; });

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 700px)').matches;
const slabe = mobile || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const setri = navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches;
const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();

const clay = (color, rough = 0.9) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
const mats = () => ({
  grass: clay(0x9cc77c), grassD: clay(0x86b866), soil: clay(0xc49a74), soilD: clay(0xa97f5c), rock: clay(0xb9c3c6),
  tree: clay(0x86c25f), tree2: clay(0x6fb450), pine: clay(0x3f9152), trunk: clay(0x9b7a5c), cloud: clay(0xffffff, 1), win: clay(0x4d5a55, 0.6),
  box: new THREE.MeshPhysicalMaterial({ color: 0x86cc2e, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.22 }),
  boxD: new THREE.MeshPhysicalMaterial({ color: 0x5e9e1c, roughness: 0.4, clearcoat: 0.8 }),
  lime: new THREE.MeshPhysicalMaterial({ color: 0xc8f169, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.2, side: THREE.DoubleSide }),
  limeIn: new THREE.MeshPhysicalMaterial({ color: 0x9fd13f, roughness: 0.5, side: THREE.BackSide }),
  gold: new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, roughness: 0.25, metalness: 0.35, clearcoat: 1 }),
  goldD: new THREE.MeshPhysicalMaterial({ color: 0xd9a531, roughness: 0.35, metalness: 0.3 }),
});
const sh = m => { m.castShadow = true; m.receiveShadow = true; return m; };
const rnd = (a, b) => a + Math.random() * (b - a);

function envTex(lime) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 86; const x = c.getContext('2d');
  x.fillStyle = lime ? '#c8f169' : '#ffffff'; x.fillRect(0, 0, 128, 86);
  x.strokeStyle = lime ? '#6f9a1f' : '#c3ccc6'; x.lineWidth = 4; x.beginPath(); x.moveTo(4, 6); x.lineTo(64, 50); x.lineTo(124, 6); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function envMats() {
  const w = clay(0xffffff), l = clay(0xc8f169);
  return { white: [w, w, w, w, new THREE.MeshStandardMaterial({ map: envTex(false), roughness: 0.9 }), w], lime: [l, l, l, l, new THREE.MeshStandardMaterial({ map: envTex(true), roughness: 0.8 }), l] };
}

// ostrovček: tráva hore, hlina dole
function island(M, r = 4.2) {
  const g = new THREE.Group();
  const topG = new THREE.CylinderGeometry(r, r * 0.97, 0.7, 56, 2);
  const p = topG.attributes.position;
  for (let i = 0; i < p.count; i++) { if (p.getY(i) > 0.3) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 1.7) * Math.cos(p.getZ(i) * 1.3) * 0.07); }
  topG.computeVertexNormals();
  const top = sh(new THREE.Mesh(topG, M.grass)); g.add(top);
  const botG = new THREE.ConeGeometry(r * 0.96, r * 1.05, 28, 4); botG.rotateX(Math.PI);
  const b = botG.attributes.position;
  for (let i = 0; i < b.count; i++) { const y = b.getY(i); if (y < 0.4 && y > -r * 0.5) { const k = 1 + Math.sin(i * 1.7) * 0.06; b.setX(i, b.getX(i) * k); b.setZ(i, b.getZ(i) * k); } }
  botG.computeVertexNormals();
  const bot = sh(new THREE.Mesh(botG, M.soil)); bot.position.y = -0.35 - r * 0.52; g.add(bot);
  for (let i = 0; i < 5; i++) { const s = sh(new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.18, 0.36), 0), M.rock)); const a = rnd(0, 6.28), d = rnd(1.2, r - 0.5); s.position.set(Math.cos(a) * d, 0.42, Math.sin(a) * d); g.add(s); }
  return g;
}
function tree(M, s = 1, kind = 0) {
  const g = new THREE.Group();
  const tr = sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.8, 8), M.trunk)); tr.position.y = 0.4; g.add(tr);
  if (kind) { [[0.8, 1.1, 0.95], [0.6, 0.95, 1.55], [0.42, 0.8, 2.05]].forEach(([r, h, y]) => { const c = sh(new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), M.pine)); c.position.y = y; g.add(c); }); }
  else { const c = sh(new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 14), Math.random() < 0.5 ? M.tree : M.tree2)); c.position.y = 1.35; c.scale.y = 1.25; g.add(c); }
  g.scale.setScalar(s); return g;
}
function cloud(M, s = 1) {
  const g = new THREE.Group();
  [[0, 0, 0, 1], [1, -0.15, 0.1, 0.75], [-0.95, -0.2, 0, 0.72], [0.35, 0.45, -0.1, 0.7]].forEach(([a, b, c, r]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), M.cloud); m.position.set(a, b, c); g.add(m); });
  g.scale.setScalar(s); return g;
}
function mailbox(M) {
  const mb = new THREE.Group();
  const body = sh(new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 2.4), M.box)); body.position.y = 1.0; mb.add(body);
  const tg = new THREE.CylinderGeometry(1.2, 1.2, 3.4, 40, 1, false, 0, Math.PI); tg.rotateZ(Math.PI / 2);
  const top = sh(new THREE.Mesh(tg, M.box)); top.position.y = 2.0; mb.add(top);
  const door = sh(new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 2.46), M.boxD)); door.position.set(-1.74, 1.0, 0); mb.add(door);
  const ag = new THREE.CylinderGeometry(1.23, 1.23, 0.12, 40, 1, false, 0, Math.PI); ag.rotateZ(Math.PI / 2);
  const arch = sh(new THREE.Mesh(ag, M.boxD)); arch.position.set(-1.74, 2.0, 0); mb.add(arch);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 1.3), M.win); slot.position.set(-1.82, 2.25, 0); mb.add(slot);
  const knob = sh(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), M.box)); knob.position.set(-1.86, 1.2, 0); mb.add(knob);
  const pole = sh(new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.16), M.boxD)); pole.position.set(0.7, 2.3, 1.3); mb.add(pole);
  const flag = sh(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.12), M.boxD)); flag.position.set(1.05, 2.95, 1.3); mb.add(flag);
  const post = sh(new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 0.6), M.trunk)); post.position.set(0, -1.3, 0); mb.add(post);
  return { mb, flag, slot: new THREE.Vector3(-2.1, 2.3, 0) };
}

function stage(host, { fov = 30, cam = [0, 6, 18], look = [0, 1.6, 0] } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, slabe ? 1.25 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xeef4ff, 0x7a9563, 1.4));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.5); sun.position.set(-8, 14, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(slabe ? 512 : 1024, slabe ? 512 : 1024); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 }); sun.shadow.radius = 5; sun.shadow.bias = -0.0005;
  scene.add(sun);
  const base = new THREE.Vector3(...cam), target = new THREE.Vector3(...look);
  let mx = 0, my = 0, sx = 0, sy = 0;
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; }, { passive: true });
  host.addEventListener('pointerleave', () => { mx = 0; my = 0; });
  const size = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(host); size();
  let vidno = false, last = 0, t = 0, tick = () => {}, staticDone = false;
  new IntersectionObserver(es => { vidno = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(host);
  const frame = now => {
    requestAnimationFrame(frame);
    if (!vidno || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; t += dt;
    sx += (mx - sx) * 0.05; sy += (my - sy) * 0.05;
    camera.position.set(base.x + sx * 3 + Math.sin(t * 0.3) * 0.4, base.y - sy * 1.6, base.z);
    camera.lookAt(target);
    if (!reduce) tick(dt, t); else if (!staticDone) { staticDone = true; for (let i = 0; i < 90; i++) tick(1 / 30, i / 30); }
    renderer.render(scene, camera);
  };
  requestAnimationFrame(t0 => { last = t0; frame(t0); host.classList.add('gl-on'); });
  return { scene, set tick(f) { tick = f; } };
}

// ---------- scéna: schránka ----------
function boxScene(host) {
  const S = stage(host, { fov: 30, cam: [0, 5.5, 19], look: [0, 1.8, 0] }), M = mats(), E = envMats();
  const world = new THREE.Group(); S.scene.add(world);
  const isl = island(M, 4.3); world.add(isl);
  const { mb, flag, slot } = mailbox(M); mb.scale.setScalar(0.78); mb.position.set(0.2, 2.35, 0); mb.rotation.y = 0.55; world.add(mb);
  [[-2.6, -1.2, 0.95, 0], [2.7, -1.6, 0.8, 1], [-1.4, 2.4, 0.75, 1], [2.3, 1.9, 1.0, 0], [-3.2, 1.2, 0.6, 0]].forEach(([x, z, s, k]) => { const tr = tree(M, s, k); tr.position.set(x, 0.35, z); world.add(tr); });
  const cl = [[-3.6, 5.6, -3, 0.7], [3.5, 6.1, -4, 0.75], [3.5, 2.8, 1.5, 0.4]].map(([x, y, z, s]) => { const c = cloud(M, s); c.position.set(x, y, z); S.scene.add(c); return c; });
  const geo = new THREE.BoxGeometry(1, 0.66, 0.06), lety = [], pool = [];
  const out = () => {
    const m = pool.pop() || sh(new THREE.Mesh(geo, E.white)); m.material = E.white;
    const from = mb.localToWorld(slot.clone()), side = Math.random() < 0.5 ? -1 : 1;
    const to = new THREE.Vector3(side * rnd(5, 8), rnd(5, 8), rnd(-4, 1));
    const mid = from.clone().lerp(to, 0.4); mid.y += 3;
    lety.push({ m, c: new THREE.QuadraticBezierCurve3(from, mid, to), t: 0, d: rnd(2.2, 3), spin: rnd(-1, 1), out: true }); S.scene.add(m);
  };
  const back = () => {
    const m = pool.pop() || sh(new THREE.Mesh(geo, E.lime)); m.material = E.lime;
    const to = mb.localToWorld(new THREE.Vector3(0, 3.6, 0)), side = Math.random() < 0.5 ? -1 : 1;
    const from = new THREE.Vector3(side * rnd(6, 8), rnd(5, 7), rnd(-3, 0));
    const mid = from.clone().lerp(to, 0.5); mid.y += 2.5;
    lety.push({ m, c: new THREE.QuadraticBezierCurve3(from, mid, to), t: 0, d: rnd(2.4, 3), spin: rnd(-1, 1), out: false }); S.scene.add(m);
  };
  let next = 0, nextB = 1.6;
  S.tick = (dt, t) => {
    world.position.y = Math.sin(t * 1.1) * 0.12; world.rotation.y = Math.sin(t * 0.25) * 0.18;
    cl.forEach((c, i) => { c.position.y += Math.sin(t * 0.8 + i) * 0.003; });
    if (t > next) { out(); next = t + rnd(0.45, 0.8); }
    if (t > nextB) { back(); nextB = t + rnd(1.6, 2.6); }
    for (let i = lety.length - 1; i >= 0; i--) {
      const l = lety[i]; l.t += dt / l.d; const k = Math.min(1, l.t);
      l.m.position.copy(l.c.getPoint(l.out ? 1 - (1 - k) ** 2 : k * k * (3 - 2 * k)));
      l.m.rotation.set(Math.sin(t * 2 + l.spin) * 0.3, t * l.spin, Math.cos(t * 1.6 + l.spin) * 0.25);
      const s = l.out ? 0.6 * (1 - Math.max(0, k - 0.7) / 0.3) : 0.7 * Math.min(1, k * 4) * (1 - Math.max(0, k - 0.88) / 0.12);
      l.m.scale.setScalar(Math.max(0.001, s));
      if (l.t >= 1) { S.scene.remove(l.m); pool.push(l.m); lety.splice(i, 1); if (!l.out) { flag.rotation.z = 0.55; setTimeout(() => (flag.rotation.z = 0), 500); } }
    }
  };
}

// ---------- scéna: lievik → mince ----------
function funnelScene(host) {
  const S = stage(host, { fov: 30, cam: [0, 5, 19], look: [0, 2.2, 0] }), M = mats(), E = envMats();
  const world = new THREE.Group(); S.scene.add(world);
  const isl = island(M, 4.4); isl.position.y = -1.4; world.add(isl);
  // lievik
  const prof = [[0.32, 0], [0.34, 0.9], [0.5, 1.35], [1.1, 1.9], [2.05, 2.75], [2.25, 3.0], [2.3, 3.12]].map(([x, y]) => new THREE.Vector2(x, y));
  const fg = new THREE.LatheGeometry(prof, 56);
  const fun = new THREE.Group();
  fun.add(sh(new THREE.Mesh(fg, M.lime)));
  const inner = new THREE.Mesh(fg, M.limeIn); inner.scale.setScalar(0.985); fun.add(inner);
  const rim = sh(new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.1, 12, 64), M.lime)); rim.rotation.x = Math.PI / 2; rim.position.y = 3.12; fun.add(rim);
  fun.position.y = 1.2; world.add(fun);
  // kôpky mincí
  const coinG = new THREE.CylinderGeometry(0.34, 0.34, 0.1, 28);
  const coin = () => { const g = new THREE.Group(); g.add(sh(new THREE.Mesh(coinG, M.gold))); const r = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 28), M.goldD); r.rotation.x = Math.PI / 2; r.position.y = 0.052; g.add(r); return g; };
  const kopy = [[-1.4, 1.2], [0, 1.7], [1.35, 1.1], [-0.7, 2.6], [0.75, 2.5]].map(([x, z]) => ({ x, z, n: 0, list: [] }));
  const stackY = -1.4 + 0.36;
  [[-2.8, -0.6, 0.9, 0], [3, -0.9, 0.8, 1], [2.9, 2.2, 0.65, 0]].forEach(([x, z, s, k]) => { const tr = tree(M, s, k); tr.position.set(x, stackY - 0.02, z); world.add(tr); });
  const geo = new THREE.BoxGeometry(1, 0.66, 0.06), lety = [], pool = [], padaju = [];
  const drop = () => {
    const m = pool.pop() || sh(new THREE.Mesh(geo, E.white));
    m.position.set(rnd(-2.6, 2.6), rnd(8, 9.5), rnd(-1.2, 1.2)); m.userData = { v: 0, spin: rnd(-1.5, 1.5), d: 0 };
    S.scene.add(m); lety.push(m);
  };
  const spout = new THREE.Vector3(0, 1.2, 0);
  const mince = () => {
    const k = kopy[(Math.random() * kopy.length) | 0];
    if (k.n > 9) { kopy.forEach(q => { q.list.forEach(c => world.remove(c)); q.list = []; q.n = 0; }); }
    const c = coin(); c.position.copy(spout); c.userData = { k, vy: 0, vx: (k.x - spout.x) * 1.1, vz: (k.z - spout.z) * 1.1, ty: stackY + k.n * 0.105, spin: rnd(4, 9) };
    k.n++; world.add(c); padaju.push(c);
  };
  let next = 0, cnt = 0;
  S.tick = (dt, t) => {
    world.rotation.y = Math.sin(t * 0.22) * 0.2; fun.rotation.y = t * 0.15; fun.position.y = 1.2 + Math.sin(t * 1.3) * 0.08;
    if (t > next) { drop(); next = t + rnd(0.22, 0.42); }
    for (let i = lety.length - 1; i >= 0; i--) {
      const m = lety[i], u = m.userData; u.v += dt * 6; m.position.y -= u.v * dt;
      m.position.x *= 1 - dt * 0.6; m.position.z *= 1 - dt * 0.6;
      m.rotation.set(Math.sin(t * 2 + u.spin) * 0.6, t * u.spin, Math.cos(t * 2.3 + u.spin) * 0.4);
      const y = m.position.y - world.position.y;
      const s = y > 4.4 ? 0.55 : Math.max(0.001, 0.55 * (y - 2.6) / 1.8);
      m.scale.setScalar(s);
      if (y < 2.65) { S.scene.remove(m); pool.push(m); lety.splice(i, 1); if (++cnt % 2 === 0) mince(); }
    }
    for (let i = padaju.length - 1; i >= 0; i--) {
      const c = padaju[i], u = c.userData; u.vy -= dt * 14;
      c.position.y += u.vy * dt; c.position.x += u.vx * dt; c.position.z += u.vz * dt;
      c.rotation.x += u.spin * dt; c.rotation.z += u.spin * 0.6 * dt;
      if (c.position.y <= u.ty) { c.position.set(u.k.x + rnd(-0.04, 0.04), u.ty, u.k.z + rnd(-0.04, 0.04)); c.rotation.set(0, rnd(0, 6), 0); u.k.list.push(c); padaju.splice(i, 1); }
    }
  };
}

// ---------- scéna: rastúce stĺpce mincí (obálka dopadne → minca) ----------
function coinsScene(host) {
  const S = stage(host, { fov: 30, cam: [0, 6, 19], look: [0, 1.6, 0] }), M = mats(), E = envMats();
  const world = new THREE.Group(); S.scene.add(world);
  const isl = island(M, 4.4); isl.position.y = -0.9; world.add(isl);
  const base = -0.9 + 0.36;
  [[-3.1, -1.6, 0.85, 1], [3.2, -1.4, 0.8, 0], [-2.9, 2.2, 0.7, 0]].forEach(([x, z, s, k]) => { const tr = tree(M, s, k); tr.position.set(x, base - 0.02, z); world.add(tr); });
  const coinG = new THREE.CylinderGeometry(0.48, 0.48, 0.15, 30);
  const stlpy = [-1.8, -0.6, 0.6, 1.8].map((x, i) => ({ x, z: 0.4 - Math.abs(x) * 0.15, max: 5 + i * 5, n: 0, list: [] }));
  stlpy.forEach(q => { while (q.n < q.max * 0.5) { const c = sh(new THREE.Mesh(coinG, M.gold)); c.position.set(q.x, base + q.n * 0.16 + 0.08, q.z); c.rotation.y = rnd(0, 6); c.userData.g = 1; world.add(c); q.list.push(c); q.n++; } });
  const geo = new THREE.BoxGeometry(1, 0.66, 0.06), lety = [], pool = [];
  const cl = [[-3.5, 5.8, -3, 0.7], [3.4, 6.3, -4, 0.75]].map(([x, y, z, s]) => { const c = cloud(M, s); c.position.set(x, y, z); S.scene.add(c); return c; });
  const drop = () => {
    const s = stlpy.filter(q => q.n < q.max); if (!s.length) { stlpy.forEach(q => { q.list.forEach(c => world.remove(c)); q.list = []; q.n = 0; }); return; }
    const q = s[(Math.random() * s.length) | 0];
    const m = pool.pop() || sh(new THREE.Mesh(geo, E.white)); m.material = Math.random() < 0.3 ? E.lime : E.white;
    const to = new THREE.Vector3(q.x, base + q.n * 0.16 + 0.3, q.z), from = new THREE.Vector3(q.x + rnd(-3, 3), 8.5, q.z - 2);
    const mid = from.clone().lerp(to, 0.5); mid.y += 1;
    m.userData = { c: new THREE.QuadraticBezierCurve3(from, mid, to), t: 0, d: rnd(1.1, 1.5), q, spin: rnd(-1, 1) };
    S.scene.add(m); lety.push(m);
  };
  let next = 0;
  S.tick = (dt, t) => {
    world.rotation.y = Math.sin(t * 0.25) * 0.22; world.position.y = Math.sin(t * 1.1) * 0.1;
    cl.forEach((c, i) => { c.position.x += Math.sin(t * 0.4 + i) * 0.004; });
    if (t > next) { drop(); next = t + rnd(0.25, 0.45); }
    for (let i = lety.length - 1; i >= 0; i--) {
      const m = lety[i], u = m.userData; u.t += dt / u.d; const k = Math.min(1, u.t);
      m.position.copy(u.c.getPoint(k * k)); m.position.y += world.position.y;
      m.rotation.set(Math.sin(t * 2 + u.spin) * 0.4, t * u.spin, 0); m.scale.setScalar(0.55 * (1 - Math.max(0, k - 0.85) / 0.15) + 0.001);
      if (u.t >= 1) {
        S.scene.remove(m); pool.push(m); lety.splice(i, 1);
        const q = u.q, c = sh(new THREE.Mesh(coinG, M.gold)); c.position.set(q.x + rnd(-0.03, 0.03), base + q.n * 0.16 + 0.08, q.z); c.rotation.y = rnd(0, 6); c.scale.setScalar(0.2); c.userData.g = 0;
        world.add(c); q.list.push(c); q.n++;
      }
    }
    stlpy.forEach(q => q.list.forEach(c => { if (c.userData.g < 1) { c.userData.g = Math.min(1, c.userData.g + dt * 5); c.scale.setScalar(0.2 + 0.8 * (1 - (1 - c.userData.g) ** 3)); } }));
  };
}

const SC = { box: boxScene, funnel: funnelScene, coins: coinsScene };
if (webgl && !setri) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); nacitaj().then(() => (SC[e.target.dataset['3d']] || boxScene)(e.target)).catch(() => {}); } }), { rootMargin: '400px' });
  document.querySelectorAll('[data-3d]').forEach(el => io.observe(el));
}
