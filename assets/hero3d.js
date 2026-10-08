// Mailito – 3D hlinená miniatúra Slovenska v úvode (Three.js).
// Zelená schránka posiela biele obálky firmám v dedinách, niektoré firmy odpíšu limetkovou obálkou späť.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const host = document.querySelector('[data-hero3d]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 700px)').matches;
// slabšie zariadenia: menšie rozlíšenie, menej stromov; šetrenie dát = bez 3D (zostane CSS krajina)
const slabe = mobile || (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const setri = navigator.connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches;

function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

if (host && webgl() && !setri) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 2 : slabe ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xd9e4ea, 70, 150);
  const camera = new THREE.PerspectiveCamera(mobile ? 30 : 26, 1, 0.1, 400);

  // svetlo – mäkké, teplé, ako v ateliéri
  scene.add(new THREE.HemisphereLight(0xe6f0ff, 0x6f8f55, 1.35));
  const sun = new THREE.DirectionalLight(0xfff2de, 2.4);
  sun.position.set(-26, 38, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(slabe ? 1024 : 2048, slabe ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 30, bottom: -30, near: 1, far: 120 });
  sun.shadow.bias = -0.0004; sun.shadow.radius = 6;
  scene.add(sun);

  const clay = (color, rough = 0.92) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  const M = {
    grass: clay(0x9cc77c), grass2: clay(0x8fbe6c), pine: clay(0x3f9152), pine2: clay(0x4fa65f), tree: clay(0x86c25f), trunk: clay(0x9b7a5c),
    wall: clay(0xf1e7d9), wall2: clay(0xe8ddd0), roof: clay(0xc99a8b), roof2: clay(0xb7b0a8), win: clay(0x5c6a66, 0.6), road: clay(0xf3efe7),
    rock: clay(0x9aaab3), snow: clay(0xf7f8f9), cloud: clay(0xffffff, 1), leg: clay(0xd8cbb8),
    box: new THREE.MeshPhysicalMaterial({ color: 0x86cc2e, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.25 }),
    boxDark: new THREE.MeshPhysicalMaterial({ color: 0x5e9e1c, roughness: 0.4, clearcoat: 0.8 }),
  };
  const shadowy = m => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---------- krajina ----------
  const H = (x, z) => 2.2 * Math.sin(x * 0.11 + 1.2) * Math.cos(z * 0.13) + 1.6 * Math.sin((x + z) * 0.07) + 0.9 * Math.cos(x * 0.23 - z * 0.05)
    + 3.4 * Math.exp(-((x - (mobile ? 4 : 13)) ** 2 + (z - 4) ** 2) / 70) - 0.06 * Math.max(0, z - 6) ** 1.4 * 0.0;
  const ground = new THREE.PlaneGeometry(220, 140, mobile ? 110 : 180, mobile ? 70 : 120);
  ground.rotateX(-Math.PI / 2);
  const pos = ground.attributes.position, col = [];
  const cA = new THREE.Color(0xa6d085), cB = new THREE.Color(0x86b866), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = H(x, z);
    pos.setY(i, y);
    tmp.copy(cB).lerp(cA, THREE.MathUtils.clamp((y + 3) / 9, 0, 1)); col.push(tmp.r, tmp.g, tmp.b);
  }
  ground.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  ground.computeVertexNormals();
  const land = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  land.receiveShadow = true;
  scene.add(land);

  // vzdialené Tatry
  const mtn = (x, z, r, h) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1), M.rock); base.position.y = h / 2;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.42, 7, 1), M.snow); cap.position.y = h - h * 0.21 + 0.05;
    g.add(base, cap); g.position.set(x, H(x, z) - 1, z); g.rotation.y = Math.random() * 2;
    scene.add(g);
  };
  mtn(-34, -78, 15, 17); mtn(-14, -86, 12, 13); mtn(-52, -84, 11, 12); mtn(10, -92, 10, 10); mtn(34, -88, 9, 9);

  // cesta
  const roadPts = []; for (let t = 0; t <= 1; t += 0.02) { const x = -6 + 18 * t, z = 22 - 40 * t + 6 * Math.sin(t * 5); roadPts.push(new THREE.Vector3(x, H(x, z) + 0.08, z)); }
  const road = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(roadPts), 120, 0.55, 6, false), M.road);
  road.scale.y = 0.25; road.receiveShadow = true; scene.add(road);

  // stromy
  const rnd = (a, b) => a + Math.random() * (b - a);
  function pine(x, z, s = 1) {
    const g = new THREE.Group();
    const tr = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8), M.trunk)); tr.position.y = 0.3; g.add(tr);
    [[1, 1.3, 0.75], [0.8, 1.1, 1.45], [0.58, 0.95, 2.05]].forEach(([r, h, y], i) => { const c = shadowy(new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), i % 2 ? M.pine2 : M.pine)); c.position.y = y; g.add(c); });
    g.scale.setScalar(s); g.position.set(x, H(x, z) - 0.1, z); scene.add(g);
  }
  function round(x, z, s = 1) {
    const g = new THREE.Group();
    const tr = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 8), M.trunk)); tr.position.y = 0.4; g.add(tr);
    const c = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), M.tree)); c.position.y = 1.3; c.scale.y = 1.15; g.add(c);
    g.scale.setScalar(s); g.position.set(x, H(x, z) - 0.1, z); scene.add(g);
  }
  // budovy (firmy)
  const firmy = [];
  function house(x, z, rot = 0, s = 1, kind = 0) {
    const g = new THREE.Group();
    if (kind === 1) { // hala / výroba
      const b = shadowy(new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.3, 2), M.wall2)); b.position.y = 0.65; g.add(b);
      for (let i = 0; i < 3; i++) { const r = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.02, 3, 1), M.roof2)); r.rotation.x = Math.PI / 2; r.rotation.y = Math.PI / 2; r.rotation.z = Math.PI / 2; r.position.set(-1.05 + i * 1.05, 1.45, 0); r.scale.set(0.85, 1, 0.55); g.add(r); }
      const ch = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.4, 10), M.roof)); ch.position.set(1.15, 1.9, -0.55); g.add(ch);
    } else {
      const b = shadowy(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.3), M.wall)); b.position.y = 0.55; g.add(b);
      const r = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.75, 3, 1), M.roof)); r.rotation.z = Math.PI / 2; r.position.y = 1.38; r.scale.set(0.62, 1, 1.02); g.add(r);
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.55, 0.05), M.win); d.position.set(0.3, 0.3, 0.66); g.add(d);
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.05), M.win); w.position.set(-0.35, 0.62, 0.66); g.add(w);
    }
    g.scale.setScalar(s); g.rotation.y = rot; g.position.set(x, H(x, z) - 0.15, z); scene.add(g);
    firmy.push({ g, top: new THREE.Vector3(x, H(x, z) + (kind ? 2.2 : 1.9) * s, z) });
  }

  // rozmiestnenie – dediny vľavo a v strede, schránka vpravo na kopci
  [[-16, 4, 0.3, 1, 0], [-12.5, 7, -0.2, 0.95, 0], [-19, 9, 0.5, 1.05, 1], [-9, 1, 0.1, 0.9, 0], [-14, -3, -0.4, 1, 1], [-4, 6, 0.2, 0.9, 0], [-22, 0, 0.2, 0.9, 0],
   [-6, -6, -0.3, 1.1, 1], [2, -2, 0.4, 0.85, 0], [-26, -6, 0.1, 1, 1], [5, -12, -0.2, 1, 1], [-10, -12, 0.3, 0.9, 0], [-2, 11, 0.6, 0.9, 0], [-18, -14, 0, 1, 0], [9, -4, 0.3, 0.85, 0], [-28, 8, -0.3, 1, 0]]
    .slice(0, mobile ? 11 : 16).forEach(a => house(...a));
  const zakaz = (x, z) => firmy.some(f => Math.hypot(f.g.position.x - x, f.g.position.z - z) < 2.4) || Math.hypot(x - (mobile ? 4 : 13), z - 4) < 4.5;
  let n = 0;
  while (n < (mobile ? 34 : slabe ? 44 : 60)) { const x = rnd(-40, 32), z = rnd(-26, 18); if (zakaz(x, z)) continue; (Math.random() < 0.62 ? pine : round)(x, z, rnd(0.75, 1.3)); n++; }

  // ---------- schránka Mailito ----------
  const mb = new THREE.Group();
  const body = shadowy(new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 2.4), M.box)); body.position.y = 1.0; mb.add(body);
  const topG = new THREE.CylinderGeometry(1.2, 1.2, 3.4, 40, 1, false, 0, Math.PI); topG.rotateZ(Math.PI / 2);
  const top = shadowy(new THREE.Mesh(topG, M.box)); top.position.y = 2.0; mb.add(top);
  const door = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 2.46), M.boxDark)); door.position.set(-1.74, 1.0, 0); mb.add(door);
  const archG = new THREE.CylinderGeometry(1.23, 1.23, 0.12, 40, 1, false, 0, Math.PI); archG.rotateZ(Math.PI / 2);
  const arch = shadowy(new THREE.Mesh(archG, M.boxDark)); arch.position.set(-1.74, 2.0, 0); mb.add(arch);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 1.3), M.win); slot.position.set(-1.82, 2.25, 0); mb.add(slot);
  const knob = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), M.box)); knob.position.set(-1.86, 1.2, 0); mb.add(knob);
  const flagPole = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 0.16), M.boxDark)); flagPole.position.set(0.7, 2.3, 1.3); mb.add(flagPole);
  const flag = shadowy(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.12), M.boxDark)); flag.position.set(1.05, 2.95, 1.3); mb.add(flag);
  const post = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.6), M.trunk)); post.position.set(0, -1.2, 0); mb.add(post);
  const MBX = mobile ? 4 : 13; mb.scale.setScalar(mobile ? 1.1 : 1.25); mb.position.set(MBX, H(MBX, 4) + 2.2, 4); mb.rotation.y = 0.35;
  scene.add(mb);
  const vystup = new THREE.Vector3(-2.1, 2.3, 0);

  // ---------- oblaky ----------
  const oblaky = [];
  function cloud(x, y, z, s) {
    const g = new THREE.Group();
    [[0, 0, 0, 1.6], [1.6, -0.2, 0.2, 1.2], [-1.5, -0.3, 0, 1.15], [0.6, 0.7, -0.2, 1.1], [-0.7, 0.5, 0.3, 0.95]].forEach(([a, b, c, r]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), M.cloud); m.position.set(a, b, c); m.castShadow = true; g.add(m); });
    g.position.set(x, y, z); g.scale.setScalar(s); scene.add(g); oblaky.push(g);
  }
  cloud(-40, 13, -40, 1.5); cloud(40, 14, -46, 1.3); cloud(-10, 16, -70, 1.6); cloud(58, 10, -30, 1.0);

  // ---------- obálky ----------
  function envTexture(lime) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 86; const x = c.getContext('2d');
    x.fillStyle = lime ? '#c8f169' : '#ffffff'; x.fillRect(0, 0, 128, 86);
    x.strokeStyle = lime ? '#6f9a1f' : '#c3ccc6'; x.lineWidth = 4; x.beginPath(); x.moveTo(4, 6); x.lineTo(64, 50); x.lineTo(124, 6); x.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const envGeo = new THREE.BoxGeometry(1, 0.66, 0.06);
  const envMat = [clay(0xffffff), clay(0xffffff), clay(0xffffff), clay(0xffffff), new THREE.MeshStandardMaterial({ map: envTexture(false), roughness: 0.9 }), clay(0xffffff)];
  const repMat = [clay(0xc8f169), clay(0xc8f169), clay(0xc8f169), clay(0xc8f169), new THREE.MeshStandardMaterial({ map: envTexture(true), roughness: 0.8 }), clay(0xc8f169)];
  const lety = [], pool = [];
  const ringGeo = new THREE.RingGeometry(0.6, 0.8, 40); ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xc8f169, transparent: true, opacity: 0.9, depthWrite: false });
  const kruhy = [];
  function let_(from, to, reply) {
    const m = pool.pop() || shadowy(new THREE.Mesh(envGeo, envMat));
    m.material = reply ? repMat : envMat; m.scale.setScalar(reply ? 0.85 : 0.75);
    const mid = from.clone().lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + from.distanceTo(to) * 0.32 + 2;
    lety.push({ m, c: new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone()), t: 0, d: (reply ? 3.4 : 2.8) + Math.random() * 0.8, reply, spin: rnd(-1, 1), to });
    scene.add(m);
  }
  function posli() {
    const f = firmy[(Math.random() * firmy.length) | 0];
    const z = mb.localToWorld(vystup.clone());
    let_(z, f.top, false);
  }
  function dopad(l) {
    if (l.reply) { flag.rotation.z = 0.5; setTimeout(() => (flag.rotation.z = 0), 600); return; }
    const r = new THREE.Mesh(ringGeo, ringMat.clone()); r.position.copy(l.to); r.position.y -= 0.4; scene.add(r); kruhy.push({ r, t: 0 });
    if (Math.random() < 0.38) setTimeout(() => let_(l.to.clone().add(new THREE.Vector3(0, 0.3, 0)), mb.localToWorld(new THREE.Vector3(0, 3.8, 0)), true), 500);
  }

  // ---------- kamera, veľkosť, pohyb ----------
  const target = new THREE.Vector3(mobile ? -1 : -3, mobile ? 2 : 0, mobile ? -2 : -4);
  const base = new THREE.Vector3(mobile ? -10 : 0, mobile ? 16 : 17, mobile ? 52 : 64);
  // ladenie kamery (len vývoj): ?hc=x,y,z,tx,ty,tz,fov
  const hc = new URLSearchParams(location.search).get('hc');
  if (hc) { const v = hc.split(',').map(Number); base.set(v[0], v[1], v[2]); target.set(v[3], v[4], v[5]); if (v[6]) { camera.fov = v[6]; camera.updateProjectionMatrix(); } }
  let mx = 0, my = 0, sx = 0, sy = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  function size() {
    // na mobile má plátno vlastnú výšku (spodok úvodu), meriame ho, nie celý úvod
    const el = renderer.domElement, w = (mobile && el.clientWidth) || host.clientWidth, h = (mobile && el.clientHeight) || host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // na širokých obrazovkách posunúť pohľad, aby obloha zostala pre nadpis
    camera.setViewOffset(w, h, 0, mobile ? 0 : -h * 0.46, w, h);
  }
  const ro = new ResizeObserver(size); ro.observe(host); ro.observe(renderer.domElement); size();

  let vidno = true, last = performance.now(), nextEnv = 0, t = 0, fpsN = 0, fpsT = 0, znizene = false;
  new IntersectionObserver(es => { vidno = es[0].isIntersecting; }).observe(host);
  function frame(now) {
    requestAnimationFrame(frame);
    if (!vidno || document.hidden) { last = now; return; }
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now; t += dt;
    // ak sa scéna seká, znížiť kvalitu (raz): rozlíšenie 1×, bez tieňov
    if (!znizene && t > 1) { fpsN++; fpsT += raw; if (fpsN === 90) { znizene = true; if (fpsT / fpsN > 1 / 38) { renderer.setPixelRatio(1); renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => (m.needsUpdate = true)); }); size(); } } }
    sx += (mx - sx) * 0.04; sy += (my - sy) * 0.04;
    camera.position.set(base.x + sx * 5 + Math.sin(t * 0.15) * 0.8, base.y - sy * 2.2 + Math.sin(t * 0.21) * 0.3, base.z);
    camera.lookAt(target);
    if (!reduce) {
      if (t > nextEnv) { posli(); nextEnv = t + (mobile ? 1.1 : 0.7) + Math.random() * 0.6; }
      for (let i = lety.length - 1; i >= 0; i--) {
        const l = lety[i]; l.t += dt / l.d;
        const k = l.t < 0.5 ? 2 * l.t * l.t : 1 - (-2 * l.t + 2) ** 2 / 2;
        l.m.position.copy(l.c.getPoint(Math.min(1, k)));
        l.m.rotation.set(Math.sin(t * 2 + l.spin) * 0.25, t * l.spin * 0.6, Math.cos(t * 1.7 + l.spin) * 0.2);
        if (l.t >= 1) { scene.remove(l.m); pool.push(l.m); lety.splice(i, 1); dopad(l); }
      }
      for (let i = kruhy.length - 1; i >= 0; i--) { const k = kruhy[i]; k.t += dt; k.r.scale.setScalar(1 + k.t * 2.4); k.r.material.opacity = Math.max(0, 0.9 - k.t * 0.9); if (k.t > 1) { scene.remove(k.r); kruhy.splice(i, 1); } }
      oblaky.forEach((o, i) => { o.position.x += dt * (0.25 + i * 0.05); if (o.position.x > 46) o.position.x = -50; });
      mb.position.y = H(MBX, 4) + 2.2 + Math.sin(t * 1.4) * 0.05;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(t0 => { last = t0; frame(t0); host.classList.add('gl-on'); });
}
