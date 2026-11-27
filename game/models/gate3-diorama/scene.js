import * as THREE from 'three';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from './vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from './vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/three/examples/jsm/postprocessing/OutputPass.js';
import { createGameCamera } from './game-camera.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#171927');
scene.fog = new THREE.FogExp2('#171927', 0.011);
const camera = new THREE.OrthographicCamera(-17, 17, 17, -17, 0.1, 180);
camera.position.set(24, 26, 31);
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (error) {
  const el = document.getElementById('error');
  el.textContent = '无法启动三维渲染，请使用开启硬件加速的新版 Edge / Chrome。';
  el.className = 'visible'; throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.info.autoReset = false;
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', '闭眼之后：闸3黑暗房三维模型');
document.querySelector('main').append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.0, 0);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.minPolarAngle = 0.13; controls.maxPolarAngle = 1.43;
controls.minZoom = 0.6; controls.maxZoom = 5; controls.rotateSpeed = 0.65;
controls.update(); controls.saveState();
renderer.domElement.addEventListener('dblclick', () => { if (!gameCamera.embedded) controls.reset(); });
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
const target = new THREE.WebGLRenderTarget(1024, 768, { type: THREE.HalfFloatType, samples: Math.min(4, renderer.capabilities.maxSamples) });
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1024, 768), 0.40, 0.55, 0.90));
composer.addPass(new OutputPass());
const root = new THREE.Group(); root.name = 'Gate3_After_eyes_close'; scene.add(root);
let seed = 3518;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gradient = new THREE.DataTexture(new Uint8Array([72, 136, 185, 230]), 4, 1, THREE.RedFormat);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
const toon = color => new THREE.MeshToonMaterial({ color, gradientMap: gradient });
const luminous = (color, level = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(level), toneMapped: false });
const M = {
  ink: toon('#192230'), black: toon('#101521'), navy: toon('#273948'), floor: toon('#445361'),
  wall: toon('#58616c'), trim: toon('#80939a'), teal: toon('#557c7b'), plum: toon('#4f4b64'),
  brass: toon('#b59c73'), wood: toon('#8e7054'), crate: toon('#b29878'), paper: toon('#c3bda5'),
  ivory: toon('#c0c9c1'), red: toon('#99535a'), blue: toon('#6c8a9d'), rubber: toon('#30373d'),
  mint: luminous('#95bdbe', 0.85), warm: luminous('#f5d4a2', 1.6), cold: luminous('#bdd8d7', 1.4),
  glassOff: new THREE.MeshStandardMaterial({ color: '#485665', metalness: 0.2, roughness: 0.34 }),
  metal: new THREE.MeshStandardMaterial({ color: '#aab9ba', roughness: 0.25, metalness: 0.68 })
};
const geoCache = new Map();
const outlineMat = new THREE.LineBasicMaterial({ color: '#101524', transparent: true, opacity: 0.45 });
function group(parent, name, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g;
}
function cubeGeo(w, h, d, radius = 0.035) {
  const r = Math.min(radius, w / 3, h / 3, d / 3), key = [w, h, d, r].join('|');
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, 1, r));
  return geoCache.get(key);
}
function box(p, w, h, d, x, y, z, mat, radius = 0.035, outline = false) {
  const m = new THREE.Mesh(cubeGeo(w, h, d, radius), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m);
  if (outline) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 35), outlineMat));
  return m;
}
function cylinder(p, r, h, x, y, z, mat, segments = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m); return m;
}
function ball(p, r, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat); m.position.set(x, y, z); p.add(m); return m;
}
function rod(p, a, b, r, mat = M.trim) {
  const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, av.distanceTo(bv), 10), mat);
  m.position.copy(av).add(bv).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bv.sub(av).normalize());
  m.castShadow = true; p.add(m); return m;
}
function pipe(p, points, r = 0.035, mat = M.ink) {
  const curve = new THREE.CatmullRomCurve3(points.map(a => new THREE.Vector3(...a)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, r, 6, false), mat); p.add(m); return m;
}
function texture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); return t;
}
function plane(p, w, h, x, y, z, tex, color = '#ffffff') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color, side: THREE.DoubleSide, toneMapped: false }));
  m.position.set(x, y, z); p.add(m); return m;
}
function plaque(p, text, sub, w, h, x, y, z, warm = false) {
  const tex = texture(768, 240, (c, cw, ch) => {
    c.fillStyle = warm ? '#353734' : '#273642'; c.fillRect(0, 0, cw, ch);
    c.strokeStyle = warm ? '#aa9175' : '#718e97'; c.lineWidth = 3; c.strokeRect(12, 12, cw - 24, ch - 24);
    c.fillStyle = warm ? '#e2d0b3' : '#bdd0d1'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '600 60px "Microsoft YaHei", sans-serif'; c.fillText(text, cw / 2, sub ? 95 : 125);
    if (sub) { c.font = '23px monospace'; c.fillText(sub, cw / 2, 176); }
  });
  box(p, w + 0.09, h + 0.08, 0.065, x, y, z - 0.035, M.brass, 0.025);
  return plane(p, w, h, x, y, z + 0.003, tex);
}
const glowTex = texture(128, 128, c => {
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, '#ffffffc0'); g.addColorStop(0.18, '#ffffff48'); g.addColorStop(1, '#ffffff00');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
});
function glow(p, color, x, y, z, size, opacity = 0.18) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.position.set(x, y, z); s.scale.set(size, size, 1); p.add(s); return s;
}
function light(p, color, intensity, range, x, y, z) {
  const l = new THREE.PointLight(color, intensity, range, 2); l.position.set(x, y, z); p.add(l); return l;
}
const floaters = [];
function float(object, amplitude = 0.05, tilt = 0.008) {
  floaters.push({ object, y: object.position.y, z: object.rotation.z, phase: random() * 6.28, amplitude, tilt });
}
const rooms = {}, anchors = {};
function anchor(room, id, x, y, z) { anchors[room.name][id] = group(room, 'Anchor_' + id, x, y, z); }
scene.add(new THREE.HemisphereLight('#b8c9e1', '#47435d', 1.4));
const key = new THREE.DirectionalLight('#b6c8e5', 2.35); key.position.set(-4, 22, 12);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 55 });
key.shadow.bias = -0.00025; key.shadow.normalBias = 0.04; key.shadow.radius = 3; scene.add(key);
const rim = new THREE.DirectionalLight('#b7a0d8', 1.7); rim.position.set(-10, 7, -10); scene.add(rim);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#222b3e', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -1.3; ground.receiveShadow = true; scene.add(ground);
const base = group(root, 'Square_collectible_plinth');
box(base, 23, 0.35, 23, 0, -1.1, 0, M.ink, 0.2, true);
box(base, 22.65, 0.75, 22.65, 0, -0.55, 0, M.plum, 0.15, true);
box(base, 22.7, 0.045, 22.7, 0, -0.25, 0, M.brass, 0.015);
box(base, 22.5, 0.24, 22.5, 0, -0.07, 0, M.black, 0.07);
for (let i = 0; i < 20; i++) box(base, 0.035, 0.16, 0.02, -10.4 + i * 0.2, -0.55, 11.34, M.trim, 0.003);
plaque(base, '閉眼のあと', 'B7 / AFTER EYES CLOSE / GATE 03', 5.5, 0.62, 0, -0.57, 11.35, true);
plaque(base, '眼 × 3', 'SENSORY DEPOSIT', 1.65, 0.52, 8.4, -0.56, 11.35);
const temp = new THREE.Object3D();
function tiledFloor(p, w, d, y, mat = M.floor) {
  box(p, w + 0.22, 0.3, d + 0.22, 0, y - 0.15, 0, M.navy, 0.04, true);
  const cells = Math.floor(w) * Math.floor(d), inst = new THREE.InstancedMesh(cubeGeo(0.97, 0.085, 0.97, 0.013), mat, cells);
  let i = 0;
  for (let x = 0; x < Math.floor(w); x++) for (let z = 0; z < Math.floor(d); z++) {
    temp.position.set(x - (Math.floor(w) - 1) / 2, y + 0.03, z - (Math.floor(d) - 1) / 2); temp.updateMatrix(); inst.setMatrixAt(i, temp.matrix);
    inst.setColorAt(i++, new THREE.Color(random() < 0.12 ? '#9eabb9' : '#f0eeee'));
  }
  inst.receiveShadow = true; p.add(inst);
  for (const x of [-w / 2, w / 2]) box(p, 0.07, 0.045, d, x, y + 0.06, 0, M.brass, 0.015);
}
function room(id, x, z, w, d, name, number, bright = false) {
  const g = group(root, id, x, 0, z); rooms[id] = g; anchors[id] = {};
  tiledFloor(g, w, d, 0.34, bright ? M.floor : M.navy);
  if (id === 'hub') {
    for (const side of [-1, 1]) box(g, (w - 1.8) / 2, 3.45, 0.22, side * (w + 1.8) / 4, 2.0, -d / 2, M.plum, 0.055, true);
  } else box(g, w + 0.2, 3.45, 0.22, 0, 2.0, -d / 2, bright ? M.wall : M.plum, 0.055, true);
  box(g, w + 0.3, 0.16, 0.35, 0, 3.75, -d / 2, M.trim, 0.025);
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    const length = (d - 1.9) / 2, zz = end * (d + 1.9) / 4;
    box(g, 0.22, 1.02, length, side * w / 2, 0.84, zz, M.plum, 0.055, true);
    box(g, 0.26, 0.09, length, side * w / 2, 1.39, zz, M.brass, 0.015);
  }
  for (let xx = -w / 2 + 0.5; xx < w / 2; xx += 1.5) {
    if (id === 'hub' && Math.abs(xx) < 0.95) continue;
    box(g, 0.04, 2.96, 0.035, xx, 1.95, -d / 2 + 0.132, M.ink, 0.006);
  }
  if (id !== 'hub') box(g, w - 0.2, 0.17, 0.12, 0, 0.52, -d / 2 + 0.17, M.trim, 0.02);
  plaque(g, name, number, 2.30, id === 'hub' ? 0.30 : 0.49, 0, id === 'hub' ? 3.48 : 3.25, -d / 2 + 0.16, bright);
  return g;
}
function doorway(p, x, z, ry, text, closed = false, shade = M.teal) {
  const g = group(p, text, x, 0.39, z, ry);
  for (const side of [-1, 1]) box(g, 0.2, 2.66, 0.37, side * 0.83, 1.33, 0, shade, 0.035, true);
  box(g, 1.87, 0.23, 0.4, 0, 2.73, 0, shade, 0.025, true);
  box(g, 1.86, 0.085, 0.9, 0, -0.006, 0, M.brass, 0.025);
  if (closed) {
    box(g, 1.46, 2.54, 0.12, 0, 1.30, -0.07, M.navy, 0.035);
    box(g, 0.34, 0.05, 0.07, 0.44, 1.17, 0.06, M.brass, 0.013);
  }
  plaque(g, text, '', 1.38, 0.30, 0, 2.73, 0.223);
  return g;
}
function fluorescent(p, x, y, z, length = 2.0, warm = false) {
  box(p, length + 0.2, 0.18, 0.32, x, y, z, M.ink, 0.04, true);
  box(p, length, 0.065, 0.09, x, y - 0.115, z + 0.11, warm ? M.warm : M.cold, 0.02);
  glow(p, warm ? '#edc591' : '#b4d7d6', x, y - 0.25, z + 0.1, length * 0.85, 0.065);
  light(p, warm ? '#efd0a0' : '#c0e4df', 17, 6.5, x, y - 0.6, z + 0.5);
}
function lantern(p, x, z, scale = 1) {
  const g = group(p, 'Emergency_work_lamp', x, 0.4, z); g.scale.setScalar(scale);
  box(g, 0.42, 0.12, 0.35, 0, 0.04, 0, M.brass, 0.045);
  box(g, 0.32, 0.36, 0.27, 0, 0.27, 0, M.ink, 0.02);
  box(g, 0.21, 0.27, 0.02, 0, 0.29, 0.146, M.warm, 0.025);
  pipe(g, [[-0.16, 0.4, 0], [-0.16, 0.65, 0], [0.16, 0.65, 0], [0.16, 0.4, 0]], 0.025, M.brass);
  glow(g, '#edb578', 0, 0.3, 0.18, 1.55, 0.065);
  light(g, '#f1bd82', 6, 4.8, 0, 0.5, 0.28); return g;
}
function railing(p, a, b) {
  rod(p, [a[0], 1.1, a[1]], [b[0], 1.1, b[1]], 0.036, M.brass);
  rod(p, [a[0], 0.74, a[1]], [b[0], 0.74, b[1]], 0.021, M.trim);
  const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let i = 0; i <= Math.ceil(distance / 1.1); i++) {
    const f = i / Math.ceil(distance / 1.1), x = THREE.MathUtils.lerp(a[0], b[0], f), z = THREE.MathUtils.lerp(a[1], b[1], f);
    cylinder(p, 0.045, 0.75, x, 0.72, z, M.trim, 10);
    cylinder(p, 0.11, 0.06, x, 0.37, z, M.ink, 12);
  }
}
const links = group(root, 'V3_fixed_walkways');
for (const x of [-4, 4]) box(links, 2.05, 0.32, 1.48, x, 0.2, 0, M.floor, 0.045, true);
box(links, 1.48, 0.32, 1.55, 0, 0.2, -4.2, M.floor, 0.045, true);
for (const side of [-1, 1]) {
  box(links, 1.42, 0.32, 5.3, side * 7, 0.2, 4.33, M.floor, 0.03, true);
  box(links, 4.0, 0.32, 1.42, side * 5.55, 0.2, 6.75, M.floor, 0.03, true);
  railing(links, [side * 7.65, 2.3], [side * 7.65, 7.4]);
  railing(links, [side * 3.65, 7.4], [side * 7.65, 7.4]);
  box(links, 0.34, 0.035, 0.12, side * 7, 0.385, 4.4, M.brass, 0.01);
}
const hub = room('hub', 0, 0, 6, 6, '闸·眼 ×3', 'B7 / INTERSECTION');
const north = room('north', 0, -7.4, 7, 5, '消失的回声', '01 / DARK CORRIDOR');
const west = room('west', -7, 0, 6, 5, '備品保管', '02 / STORAGE', true);
const east = room('east', 7, 0, 6, 5, '配電室', '03 / SWITCHGEAR', true);
const south = room('south', 0, 7.1, 7, 5, '员工通道', '04 / DEEP ROOM');

const strangeDoor = doorway(hub, 0, -2.95, 0, '暗い廊下', false, M.plum);
for (let i = 0; i < 3; i++) {
  box(strangeDoor, 0.085, 2.05 - i * 0.19, 0.04, -0.58 + i * 0.07, 1.25, 0.12 + i * 0.012, M.brass, 0.012);
  box(strangeDoor, 1.16 - i * 0.14, 0.05, 0.04, 0, 2.27 - i * 0.10, 0.12 + i * 0.012, M.brass, 0.009);
}
const centerRug = box(hub, 3.1, 0.025, 2.05, 0, 0.40, 0, M.plum, 0.04);
const arrowTex = texture(512, 512, c => {
  c.fillStyle = '#514d60'; c.fillRect(0, 0, 512, 512);
  c.strokeStyle = '#a99d91'; c.lineWidth = 9; c.strokeRect(20, 20, 472, 472);
  c.strokeStyle = '#a6aca7'; c.lineWidth = 12;
  [[150, 150, 1], [353, 160, -1], [270, 340, 1]].forEach(([x, y, dir]) => {
    c.save(); c.translate(x, y); c.rotate(dir * 0.9); c.beginPath(); c.moveTo(-45, 0); c.lineTo(40, 0); c.lineTo(17, -23); c.moveTo(40, 0); c.lineTo(17, 23); c.stroke(); c.restore();
  });
});
const rugPrint = plane(hub, 3.05, 2.0, 0, 0.42, 0, arrowTex); rugPrint.rotation.x = -Math.PI / 2;
doorway(hub, -2.95, 0, Math.PI / 2, '保管室');
doorway(hub, 2.95, 0, -Math.PI / 2, '配電室');
const hubSouth = doorway(hub, 0.35, 2.74, 0, '行先不明', true, M.plum);
hubSouth.rotation.z = 0.018;
box(hub, 3.0, 0.22, 0.15, 0, 0.74, 3.4, M.ink, 0.025);
for (const x of [-1.1, 0, 1.1]) box(hub, 0.28, 0.045, 0.31, x, 0.875, 3.4, M.brass, 0.005).rotation.y = -0.5;
const plate = group(hub, 'Drifting_direction_plate', 1.72, 2.9, -1.8, -0.15);
plaque(plate, '出口 →', 'WRONG WAY', 1.15, 0.40, 0, 0, 0); float(plate, 0.065, 0.02);
lantern(hub, -1.9, 1.7);
anchor(hub, 'hub_sense', 0, 1.0, -1.1);

const dots = group(north, 'Tactile_three_dot_panel', -2.35, 1.7, -1.65, 0.12);
box(dots, 1.25, 1.55, 0.22, 0, 0, 0, M.trim, 0.075, true);
for (const x of [-0.43, 0.43]) {
  const a = dots.localToWorld(new THREE.Vector3(x, 0, -0.11));
  const local = north.worldToLocal(a.clone());
  rod(north, local.toArray(), [local.x, local.y, -2.37], 0.055, M.ink);
}
box(dots, 1.02, 1.32, 0.08, 0, 0, 0.143, M.wood, 0.025);
const tactileDots = [];
for (let i = 0; i < 3; i++) tactileDots.push(ball(dots, 0.087, 0, 0.35 - i * 0.35, 0.24, M.ivory));
for (const x of [-0.46, 0.46]) for (const y of [-0.6, 0.6]) ball(dots, 0.024, x, y, 0.203, M.brass);
pipe(north, [[-3.22, 0.42, 1.0], [-3.22, 1.8, 0.9], [-3.15, 2.8, -1.5], [-2.75, 3.05, -2.25]], 0.04, M.trim);
const echoObstacles = [];
const obstacleSpecs = [[-0.63, -1.4, 0.97], [0.44, -1.95, 1.48], [1.6, -1.27, 1.75], [2.43, -0.24, 1.13], [1.62, 0.92, 0.74]];
obstacleSpecs.forEach(([x, z, h], i) => {
  const g = group(north, 'Echo_obstacle_' + (i + 1), x, 0.42, z);
  box(g, 0.52, h, 0.57, 0, h / 2, 0, i % 2 ? M.plum : M.navy, 0.07, true);
  box(g, 0.59, 0.065, 0.64, 0, h + 0.02, 0, M.trim, 0.025);
  box(g, 0.08, h * 0.55, 0.018, -0.08, h * 0.48, 0.3, M.brass, 0.008);
  echoObstacles.push(g);
});
lantern(north, -1.2, 0.85, 0.95);
anchor(north, 'mech1', -2.30, 0.69, -1.10);
anchor(north, 'mech2', 1.25, 0.58, 1.27);
anchor(north, 'npc_anzumi_n', -2.55, 0.55, 2.12);
anchor(north, 'npc_tsuzuri_n', 2.5, 0.55, 2.12);

const boxLabel = texture(256, 192, c => {
  c.fillStyle = '#c2b695'; c.fillRect(0, 0, 256, 192); c.fillStyle = '#4e5558'; c.font = 'bold 38px monospace'; c.fillText('B7', 20, 55);
  for (let i = 0; i < 19; i++) c.fillRect(22 + i * 10, 95, 3 + i % 3, 60);
});
function carton(p, x, y, z, w = 0.72, h = 0.48, d = 0.55) {
  const g = group(p, 'Archive_carton', x, y, z);
  box(g, w, h, d, 0, h / 2, 0, M.crate, 0.035, true);
  box(g, 0.13, 0.015, d + 0.003, 0, h + 0.004, 0, M.paper, 0.001);
  plane(g, w * 0.32, h * 0.48, -w * 0.22, h * 0.52, d / 2 + 0.003, boxLabel); return g;
}
function shelf(p, x, z, ry = 0) {
  const g = group(p, 'Stock_shelf', x, 0.43, z, ry);
  for (const xx of [-1.04, 1.04]) for (const zz of [-0.36, 0.36]) box(g, 0.09, 2.38, 0.09, xx, 1.19, zz, M.trim, 0.013);
  for (let j = 0; j < 4; j++) {
    const yy = 0.12 + j * 0.67;
    box(g, 2.26, 0.08, 0.90, 0, yy, 0, M.teal, 0.025, true);
    for (let k = 0; k < 3; k++) carton(g, -0.72 + k * 0.70, yy + 0.044, 0, 0.58, j === 3 ? 0.27 : 0.42, 0.65);
  }
  return g;
}
shelf(west, -1.48, -1.63); shelf(west, 1.15, -1.63);
fluorescent(west, 0, 3.48, -2.12, 3.1, true);
box(west, 1.0, 0.055, 1.4, -1.7, 0.41, 0.8, M.rubber, 0.05);
const chair = group(west, 'Upside_down_chair', -0.2, 2.5, 0.5, -0.18);
box(chair, 0.78, 0.11, 0.76, 0, 0, 0, M.wood, 0.045, true);
for (const x of [-0.3, 0.3]) for (const z of [-0.29, 0.29]) rod(chair, [x, 0.02, z], [x * 1.15, 0.77, z * 1.15], 0.038, M.trim);
for (const x of [-0.29, 0.29]) rod(chair, [x, -0.03, -0.27], [x, -0.74, -0.27], 0.032, M.trim);
box(chair, 0.70, 0.37, 0.10, 0, -0.59, -0.27, M.wood, 0.05); chair.rotation.z = 0.08; float(chair, 0.09, 0.018);
const suspended = carton(west, 1.64, 1.15, 0.75, 0.7, 0.5, 0.58); suspended.rotation.z = -0.13; float(suspended, 0.06, 0.019);
carton(west, -1.9, 0.43, 1.14, 0.83, 0.6, 0.75);
const cart = group(west, 'Maintenance_trolley', 1.55, 0.44, 1.68);
box(cart, 1.16, 0.1, 0.6, 0, 0.13, 0, M.teal, 0.04);
for (const x of [-0.47, 0.47]) for (const z of [-0.22, 0.22]) ball(cart, 0.10, x, 0, z, M.rubber);
rod(cart, [-0.53, 0.12, -0.22], [-0.53, 0.85, -0.22], 0.035); rod(cart, [-0.53, 0.12, 0.22], [-0.53, 0.85, 0.22], 0.035);
rod(cart, [-0.53, 0.85, -0.22], [-0.53, 0.85, 0.22], 0.035);
for (let i = 0; i < 4; i++) cylinder(cart, 0.08, 0.3 + i * 0.03, -0.19 + i * 0.18, 0.34, 0, i % 2 ? M.paper : M.blue);
anchor(west, 'npc_kei_w', -1.45, 0.62, 1.3);
anchor(west, 'npc_kamae_w', 1.40, 0.58, 1.05);

const vents = texture(256, 256, c => {
  c.fillStyle = '#2d3c43'; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 15; i++) { c.fillStyle = '#111c28'; c.fillRect(12, 12 + i * 16, 232, 8); c.fillStyle = '#76898a'; c.fillRect(12, 21 + i * 16, 232, 2); }
});
const gaugeTex = texture(256, 256, c => {
  c.fillStyle = '#cfccae'; c.fillRect(0, 0, 256, 256); c.strokeStyle = '#495c63'; c.lineWidth = 4;
  for (let i = 0; i < 12; i++) { const a = Math.PI * (0.8 + i / 8); c.beginPath(); c.moveTo(128 + Math.cos(a) * 80, 139 + Math.sin(a) * 80); c.lineTo(128 + Math.cos(a) * 98, 139 + Math.sin(a) * 98); c.stroke(); }
  c.strokeStyle = '#954c4b'; c.lineWidth = 5; c.beginPath(); c.moveTo(128, 139); c.lineTo(71, 82); c.stroke();
  c.fillStyle = '#495c63'; c.font = '28px monospace'; c.fillText('AMP', 100, 222);
});
for (let i = 0; i < 2; i++) {
  const cab = group(east, 'Switch_cabinet_' + i, -1.92 + i * 1.28, 0.43, -1.91);
  box(cab, 1.16, 2.51, 0.79, 0, 1.25, 0, M.teal, 0.055, true);
  box(cab, 1.04, 2.27, 0.06, 0, 1.28, 0.425, M.wall, 0.025);
  plane(cab, 0.5, 0.44, -0.13, 2.06, 0.462, gaugeTex);
  plane(cab, 0.67, 0.56, 0, 0.53, 0.462, vents);
  for (let j = 0; j < 6; j++) box(cab, 0.13, 0.13, 0.10, -0.32 + (j % 3) * 0.27, 1.54 - Math.floor(j / 3) * 0.24, 0.494, j === 0 ? M.red : M.rubber, 0.02);
  rod(cab, [0.39, 0.94, 0.52], [0.39, 1.25, 0.52], 0.025, M.brass);
  pipe(east, [[cab.position.x, 2.95, -1.91], [cab.position.x, 3.11, -2.25], [0.85, 3.11 + i * 0.10, -2.25], [1.50, 2.55, -2.28]], 0.04, M.trim);
}
fluorescent(east, -0.8, 3.52, -2.18, 2.0);
const handlePanel = group(east, 'Material_handle_panel', 1.7, 0.47, -1.9);
box(handlePanel, 1.63, 2.34, 0.16, 0, 1.17, 0, M.plum, 0.045, true);
const handles = [];
for (let i = 0; i < 5; i++) {
  const x = -0.57 + i * 0.28, y = 0.48 + i * 0.34;
  const mat = i === 4 ? M.metal : i % 2 === 0 ? M.wood : M.rubber;
  const g = group(handlePanel, i === 4 ? 'Only_metal_handle' : 'Nonmetal_handle_' + i, x, y, 0.20);
  box(g, 0.18, 0.12, 0.07, 0, 0, 0, M.brass, 0.02);
  rod(g, [0, 0, 0], [0.06, 0.26, 0.24], 0.045, mat);
  cylinder(g, 0.068, 0.20, 0.06, 0.31, 0.24, mat);
  handles.push(g);
}
plaque(handlePanel, '保守 / 点検', '', 1.25, 0.29, 0, 2.09, 0.104);
box(east, 3.9, 0.035, 1.12, 0, 0.41, -0.12, M.rubber, 0.05);
for (let i = 0; i < 12; i++) box(east, 0.045, 0.012, 0.97, -1.70 + i * 0.31, 0.435, -0.12, M.floor, 0.004);
const toolcase = box(east, 1.05, 0.32, 0.66, 1.83, 0.6, 1.27, M.red, 0.08, true);
box(east, 0.35, 0.06, 0.04, 1.83, 0.69, 1.62, M.brass, 0.015);
anchor(east, 'mech3', 1.68, 0.68, -0.9);
anchor(east, 'npc_hikari_e', -1.25, 0.6, 1.3);

const deadLamps = [], lampGlass = [];
for (const z of [-0.95, 0.70]) {
  box(south, 3.44, 0.13, 0.17, -1.52, 3.3, z, M.ink, 0.025, true);
  for (const x of [-2.98, -0.06]) cylinder(south, 0.055, 2.84, x, 1.82, z, M.trim, 12);
  for (let i = 0; i < 4; i++) {
    const g = group(south, 'Unlit_lamp_' + deadLamps.length, -2.65 + i * 0.73, 3.11, z);
    rod(g, [0, 0.2, 0], [0, -0.13, 0], 0.02, M.brass);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.235, 0.17, 24, 1, true), M.trim);
    shade.position.y = -0.14; shade.castShadow = true; g.add(shade);
    const bulb = ball(g, 0.082, 0, -0.25, 0, M.glassOff); lampGlass.push(bulb);
    cylinder(g, 0.045, 0.09, 0, -0.14, 0, M.brass, 12);
    deadLamps.push(g);
  }
}
const exitDoor = doorway(south, 1.74, -2.24, 0, '员工通道', true, M.teal);
box(exitDoor, 0.78, 0.52, 0.024, 0, 1.80, 0.018, M.glassOff, 0.018);
for (let i = 0; i < 4; i++) box(exitDoor, 0.022, 0.52, 0.035, -0.3 + i * 0.2, 1.8, 0.04, M.trim, 0.002);
const lock = group(south, 'Four_digit_keypad', 3.05, 1.6, -2.02);
box(lock, 0.39, 0.68, 0.20, 0, 0, 0, M.ink, 0.045);
const blankDigits = texture(384, 160, c => { c.fillStyle = '#314043'; c.fillRect(0, 0, 384, 160); c.fillStyle = '#acbbae'; c.font = '60px monospace'; c.fillText('— — — —', 16, 102); });
plane(lock, 0.30, 0.14, 0, 0.18, 0.106, blankDigits);
for (let i = 0; i < 9; i++) box(lock, 0.058, 0.06, 0.032, -0.10 + (i % 3) * 0.1, -Math.floor(i / 3) * 0.09, 0.118, M.trim, 0.01);
plaque(exitDoor, '闭上眼睛，门就开。', '', 1.27, 0.21, 0, 0.75, 0.068, true);
lantern(south, -1.9, 1.12, 1.1); lantern(south, 2.60, 0.68, 0.8);
box(south, 1.45, 0.035, 0.85, 1.74, 0.408, -0.90, M.rubber, 0.04);
anchor(south, 'mech4', -1.55, 1.85, -0.06);
anchor(south, 'door', 1.72, 1.0, -1.25);
anchor(south, 'npc_anzumi_s', -1.72, 0.64, 1.57);
anchor(south, 'npc_kei_s', 1.45, 0.64, 1.57);

const seam = group(root, 'Unwalkable_fold_between_hub_and_south');
for (let i = 0; i < 5; i++) box(seam, 5.9 - i * 0.35, 0.026, 0.045, 0, 0.065 - i * 0.018, 3.6 + i * 0.17, i % 2 ? M.plum : M.ink, 0.004);
for (const [id, g] of Object.entries(rooms)) {
  for (let i = 0; i < 3; i++) {
    const paper = box(g, 0.3, 0.012, 0.4, -1.8 + random() * 3.5, 0.445, 0.3 + random() * 1.5, M.paper, 0.003);
    paper.rotation.y = random() * 3;
  }
  const sign = box(g, 0.42, 0.05, 0.24, -2.05, 0.435, 1.9, M.brass, 0.015); sign.rotation.y = id === 'south' ? -0.4 : 0.4;
}
const particlesN = 160, particleArray = new Float32Array(particlesN * 3), origins = [];
for (let i = 0; i < particlesN; i++) {
  const p = [(random() - 0.5) * 20, 0.45 + random() * 4.8, (random() - 0.5) * 18]; origins.push(p); particleArray.set(p, i * 3);
}
const particleGeo = new THREE.BufferGeometry(); particleGeo.setAttribute('position', new THREE.BufferAttribute(particleArray, 3));
const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: '#b7c6d4', map: glowTex, size: 0.057, transparent: true, opacity: 0.48, depthWrite: false, blending: THREE.AdditiveBlending })); root.add(particles);
const haze = [];
for (let i = 0; i < 8; i++) { const s = glow(root, '#8376ab', (random() - 0.5) * 17, 0.15, (random() - 0.5) * 17, 4.0, 0.065); s.scale.y = 0.7; haze.push(s); }
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const gameCamera = createGameCamera({ camera, controls, root, rooms, anchors, reducedMotion });
function resize() {
  const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight), ratio = w / h;
  if (gameCamera.embedded) gameCamera.resize();
  else {
    const half = Math.max(15.4, 18.5 / ratio);
    camera.left = -half * ratio; camera.right = half * ratio; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  renderer.setSize(w, h); composer.setSize(w, h);
}
addEventListener('resize', resize); resize();
const clock = new THREE.Clock(); let elapsed = 0, frame = 0;
function render() {
  requestAnimationFrame(render);
  const dt = Math.min(clock.getDelta(), 0.08);
  if (document.hidden || !gameCamera.active) return;
  elapsed += dt; gameCamera.tick(dt);
  if (!reducedMotion.matches) {
    for (const f of floaters) {
      f.object.position.y = f.y + Math.sin(elapsed * 0.43 + f.phase) * f.amplitude;
      f.object.rotation.z = f.z + Math.cos(elapsed * 0.29 + f.phase) * f.tilt;
    }
    for (let i = 0; i < particlesN; i++) {
      particleArray[i * 3] = origins[i][0] + Math.sin(elapsed * 0.12 + i) * 0.08;
      particleArray[i * 3 + 1] = 0.45 + ((origins[i][1] + elapsed * 0.021) % 4.8);
    }
    particleGeo.attributes.position.needsUpdate = true;
    haze.forEach((s, i) => { s.material.opacity = 0.045 + Math.sin(elapsed * 0.18 + i) * 0.014; });
  }
  controls.update(); renderer.info.reset(); composer.render(); gameCamera.afterRender(); frame++;
}
render();
window.__SCENE_DIAGNOSTICS__ = {
  get ready() { return frame > 2; }, get frames() { return frame; },
  get active() { return gameCamera.active; }, get view() { return gameCamera.view; },
  get settled() { return gameCamera.settled; }, get anchors() { return gameCamera.positions; },
  get camera() { return { position: camera.position.toArray(), target: controls.target.toArray(), zoom: camera.zoom }; },
  get renderer() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries }; },
  tactileDots: tactileDots.length, echoObstacles: echoObstacles.length,
  handles: handles.length, metalHandles: handles.filter(h => h.name === 'Only_metal_handle').length,
  deadLamps: deadLamps.length, get litClueLamps() { return lampGlass.filter(g => g.material.emissiveIntensity > 0 && g.material.emissive.getHex() !== 0).length; },
  rooms: Object.keys(rooms), sceneVersion: '1.0.0', dependency: THREE.REVISION
};
