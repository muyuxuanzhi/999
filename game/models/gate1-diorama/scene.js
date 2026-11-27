import * as THREE from 'three';
import { OrbitControls } from './vendor/three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from './vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from './vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/three/examples/jsm/postprocessing/OutputPass.js';
import { Reflector } from './vendor/three/examples/jsm/objects/Reflector.js';
import { createGameCamera } from './game-camera.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#192634');
scene.fog = new THREE.FogExp2('#192634', 0.013);
const camera = new THREE.OrthographicCamera(-14, 14, 14, -14, 0.1, 160);
camera.position.set(19, 16, 24);
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (error) {
  const el = document.getElementById('error');
  el.textContent = '无法启动三维渲染，请使用开启硬件加速的新版 Edge / Chrome。'; el.className = 'visible'; throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.04;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.info.autoReset = false;
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', '半杯之间：茶水间三维微缩模型');
document.querySelector('main').append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 3.0, -0.3); controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.minPolarAngle = 0.12; controls.maxPolarAngle = 1.47;
controls.minZoom = 0.6; controls.maxZoom = 5.0; controls.rotateSpeed = 0.65;
controls.update(); controls.saveState();
renderer.domElement.addEventListener('dblclick', () => { if (!gameCamera.embedded) controls.reset(); });
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
const target = new THREE.WebGLRenderTarget(1024, 768, { type: THREE.HalfFloatType, samples: Math.min(4, renderer.capabilities.maxSamples) });
const composer = new EffectComposer(renderer, target);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(1024, 768), 0.32, 0.5, 0.96));
composer.addPass(new OutputPass());
const root = new THREE.Group(); root.name = 'Gate1_Between_half_cups'; scene.add(root);
let seed = 3527;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const gradient = new THREE.DataTexture(new Uint8Array([85, 145, 197, 240]), 4, 1, THREE.RedFormat);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
const toon = color => new THREE.MeshToonMaterial({ color, gradientMap: gradient });
const luminous = (color, level = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(level), toneMapped: false });
const M = {
  ink: toon('#192c39'), dark: toon('#22333e'), mint: toon('#8cafa7'), teal: toon('#477b79'),
  cream: toon('#d4ceba'), white: toon('#e2e0d2'), wall: toon('#adb7af'), floor: toon('#8b9d97'),
  plum: toon('#595d77'), brass: toon('#b6a278'), wood: toon('#8b6d52'), paper: toon('#dfd6b5'),
  coffee: toon('#71472c'), rubber: toon('#28393e'), blue: toon('#819ea9'), red: toon('#ad736b'),
  warm: luminous('#f2d9a6', 1.3), cold: luminous('#a3d7d5', 1.1), dim: luminous('#8cb6b4', 0.6),
  metal: new THREE.MeshStandardMaterial({ color: '#a9b9b7', metalness: 0.48, roughness: 0.38 }),
  water: new THREE.MeshStandardMaterial({ color: '#66bdc7', roughness: 0.16, metalness: 0.26, transparent: true, opacity: 0.77 }),
  glass: new THREE.MeshStandardMaterial({ color: '#c1e4df', roughness: 0.12, metalness: 0.12, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false }),
  waterLine: luminous('#badfd8', 0.80)
};
const geoCache = new Map();
const outline = new THREE.LineBasicMaterial({ color: '#233141', transparent: true, opacity: 0.4 });
function group(p, name, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); g.rotation.y = ry; p.add(g); return g;
}
function cubeGeo(w, h, d, r = 0.035) {
  r = Math.min(r, w / 3, h / 3, d / 3); const key = [w, h, d, r].join('|');
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, 1, r));
  return geoCache.get(key);
}
function box(p, w, h, d, x, y, z, mat, r = 0.035, edge = false) {
  const m = new THREE.Mesh(cubeGeo(w, h, d, r), mat); m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true; p.add(m);
  if (edge) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 35), outline)); return m;
}
function cylinder(p, r, h, x, y, z, mat, segments = 28, open = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments, 1, open), mat);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; p.add(m); return m;
}
function sphere(p, r, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12), mat); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m;
}
function torus(p, r, tube, x, y, z, mat, angle = Math.PI * 2) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 44, angle), mat); m.position.set(x, y, z); p.add(m); return m;
}
function pipe(p, points, r = 0.035, mat = M.metal) {
  const curve = new THREE.CatmullRomCurve3(points.map(a => new THREE.Vector3(...a)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, r, 8, false), mat); m.castShadow = true; p.add(m); return m;
}
function texture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); return t;
}
function plane(p, w, h, x, y, z, tex) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }));
  m.position.set(x, y, z); p.add(m); return m;
}
function plaque(p, title, sub, w, h, x, y, z, warm = false) {
  const tex = texture(768, 240, (c, cw, ch) => {
    c.fillStyle = warm ? '#494c45' : '#29434b'; c.fillRect(0, 0, cw, ch);
    c.strokeStyle = warm ? '#b6a180' : '#829e9d'; c.lineWidth = 3; c.strokeRect(12, 12, cw - 24, ch - 24);
    c.fillStyle = '#e0d9bb'; c.font = '600 60px "Microsoft YaHei",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(title, cw / 2, sub ? 91 : 123);
    if (sub) { c.font = '23px monospace'; c.fillText(sub, cw / 2, 177); }
  });
  box(p, w + 0.09, h + 0.075, 0.05, x, y, z - 0.033, M.brass, 0.02);
  return plane(p, w, h, x, y, z, tex);
}
const glowTex = texture(128, 128, c => {
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, '#ffffff9a'); g.addColorStop(0.16, '#ffffff38'); g.addColorStop(1, '#ffffff00');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
});
function glow(p, color, x, y, z, size, opacity = 0.12) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(x, y, z); m.scale.set(size, size, 1); p.add(m); return m;
}
function light(p, color, intensity, range, x, y, z) {
  const l = new THREE.PointLight(color, intensity, range, 2); l.position.set(x, y, z); p.add(l); return l;
}
const floaters = [];
function float(object, amplitude = 0.07, tilt = 0.012) { floaters.push({ object, y: object.position.y, z: object.rotation.z, phase: random() * 6.28, amplitude, tilt }); }
const layers = {
  ground: group(root, 'Ground_furniture'), air: group(root, 'Floating_objects'),
  ceiling: group(root, 'Inverted_canopy'), structure: group(root, 'Tall_cutaway')
};
const anchors = { ground: {}, air: {}, ceiling: {} };
function anchor(view, id, p, x, y, z) { anchors[view][id] = group(p, 'Anchor_' + id, x, y, z); }
scene.add(new THREE.HemisphereLight('#d4e6de', '#55516b', 1.85));
const key = new THREE.DirectionalLight('#e4dec4', 2.8); key.position.set(-6, 17, 10); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 45 });
key.shadow.bias = -0.0003; key.shadow.normalBias = 0.04; key.shadow.radius = 3; scene.add(key);
const rim = new THREE.DirectionalLight('#a5bbdb', 1.7); rim.position.set(8, 10, -9); scene.add(rim);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#233444', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -1.2; ground.receiveShadow = true; scene.add(ground);
const base = group(root, 'Square_plinth');
box(base, 16.7, 0.25, 16.7, 0, -1.02, 0, M.ink, 0.15, true);
box(base, 16.4, 0.69, 16.4, 0, -0.60, 0, M.plum, 0.12, true);
box(base, 16.46, 0.04, 16.46, 0, -0.31, 0, M.brass, 0.012);
box(base, 16.2, 0.29, 16.2, 0, -0.13, 0, M.dark, 0.065);
plaque(base, '半杯之间', 'B7 / BETWEEN HALF CUPS / GATE 01', 4.6, 0.57, 0, -0.62, 8.23, true);
plaque(base, '闸 01', 'BREAK ROOM', 1.3, 0.48, 6.5, -0.61, 8.23);
const temp = new THREE.Object3D();
const tiles = new THREE.InstancedMesh(cubeGeo(0.975, 0.075, 0.975, 0.018), M.floor, 256);
for (let i = 0; i < 256; i++) {
  const x = i % 16, z = Math.floor(i / 16);
  temp.position.set(x - 7.5, 0.055, z - 7.5); temp.updateMatrix(); tiles.setMatrixAt(i, temp.matrix);
  tiles.setColorAt(i, new THREE.Color((x + z) % 2 ? '#dbe2d4' : '#9ebeb5'));
}
tiles.receiveShadow = true; base.add(tiles);
for (const x of [-7.9, 7.9]) box(base, 0.06, 0.025, 15.8, x, 0.11, 0, M.brass, 0.008);
const structure = layers.structure;
box(structure, 15.2, 3.0, 0.25, 0, 1.6, -6.3, M.wall, 0.06, true);
box(structure, 0.25, 4.9, 10.2, -7.5, 2.55, -1.32, M.mint, 0.05, true);
box(structure, 15.5, 0.15, 0.36, 0, 3.15, -6.3, M.cream, 0.035);
for (let i = 0; i < 6; i++) {
  box(structure, 2.46, 0.03, 0.027, -6.25 + i * 2.5, 1.20, -6.159, M.cream, 0.003);
  box(structure, 0.025, 2.5, 0.025, -7.45 + i * 2.5, 1.48, -6.15, M.cream, 0.003);
}
for (const x of [-6.85, 6.85]) {
  box(structure, 0.30, 8.5, 0.34, x, 4.37, -5.5, M.teal, 0.04, true);
  box(structure, 0.63, 0.22, 0.62, x, 0.23, -5.5, M.ink, 0.045);
  box(structure, 0.50, 0.14, 0.5, x, 7.5, -5.5, M.brass, 0.015);
}
box(structure, 14.05, 0.30, 0.50, 0, 8.43, -5.5, M.teal, 0.06, true);
box(structure, 8.3, 0.23, 0.33, -1.3, 7.85, -2.05, M.wood, 0.04, true);
for (const x of [-5.4, 2.8]) box(structure, 0.15, 0.17, 3.7, x, 7.85, -3.73, M.brass, 0.025);
const windowGroup = group(structure, 'Long_warehouse_window', -7.35, 3.35, -1.85, Math.PI / 2);
box(windowGroup, 6.8, 2.45, 0.08, 0, 0, 0, M.cream, 0.05);
for (let i = 0; i < 5; i++) {
  box(windowGroup, 1.15, 2.10, 0.032, -2.62 + i * 1.31, 0, 0.065, M.blue, 0.03);
  box(windowGroup, 1.06, 0.78, 0.008, -2.62 + i * 1.31, 0.54, 0.087, M.dim, 0.01);
  box(windowGroup, 1.15, 0.045, 0.025, -2.62 + i * 1.31, 0, 0.09, M.cream, 0.005);
}
plaque(structure, '休憩室', 'PLEASE LEAVE SOME SPACE', 2.8, 0.64, 0, 2.52, -6.13, true);
for (let i = 0; i < 3; i++) pipe(structure, [[-7.25, 0.22, 3.4], [-7.25, 0.55, -2.6], [-7.25, 5.3 + i * 0.13, -4.9], [-5.7, 5.6 + i * 0.13, -5.9], [-3.3, 5.6 + i * 0.13, -5.9]], 0.026, i === 1 ? M.brass : M.ink);
function fluorescent(x, y, z, len) {
  const g = group(structure, 'Warm_fluorescent', x, y, z);
  box(g, len + 0.18, 0.17, 0.30, 0, 0, 0, M.cream, 0.045, true);
  box(g, len, 0.06, 0.1, 0, -0.112, 0.12, M.warm, 0.028);
  glow(g, '#e9ca97', 0, -0.22, 0.16, len * 0.85, 0.075);
  return light(g, '#ebcf9d', 15, 7, 0, -0.50, 0.40);
}
const mainLamp = fluorescent(-3.8, 5.1, -4.3, 2.8);
fluorescent(4.5, 6.2, -5.0, 2.1);

const puddleShape = new THREE.Shape();
puddleShape.moveTo(-2.8, -0.8); puddleShape.bezierCurveTo(-3.3, 0.8, -1.6, 1.3, -0.4, 1.1);
puddleShape.bezierCurveTo(1.0, 1.6, 3.3, 1.0, 3.0, -0.2); puddleShape.bezierCurveTo(3.1, -1.8, 0.8, -1.4, -0.4, -1.8); puddleShape.bezierCurveTo(-1.8, -1.8, -2.1, -1.1, -2.8, -0.8);
const mirror = new Reflector(new THREE.ShapeGeometry(puddleShape, 32), { color: '#94b3b2', textureWidth: 768, textureHeight: 768, clipBias: 0.004 });
mirror.rotation.x = -Math.PI / 2; mirror.position.set(-0.5, 0.10, -0.6); mirror.name = 'Actual_puddle_reflection'; base.add(mirror);
for (let i = 0; i < 3; i++) { const ring = torus(base, 0.18 + i * 0.21, 0.006, 0.4, 0.111, -0.05, M.waterLine); ring.rotation.x = -Math.PI / 2; }
const sink = group(layers.ground, 'Antigravity_sink', -2.65, 0.1, 2.13);
box(sink, 5.1, 1.22, 1.72, 0, 0.63, 0, M.teal, 0.08, true);
box(sink, 5.2, 0.14, 1.9, 0, 1.31, 0, M.metal, 0.045);
for (let i = 0; i < 4; i++) {
  box(sink, 1.18, 1.03, 0.07, -1.90 + i * 1.27, 0.66, 0.895, M.mint, 0.028, true);
  box(sink, 0.29, 0.042, 0.08, -1.90 + i * 1.27, 1.02, 0.96, M.brass, 0.011);
}
box(sink, 2.06, 0.05, 1.19, -1.28, 1.398, -0.07, M.dark, 0.17);
box(sink, 1.89, 0.034, 1.04, -1.28, 1.433, -0.07, M.water, 0.14);
const drain = cylinder(sink, 0.10, 0.012, -1.28, 1.46, -0.07, M.ink, 24);
for (let i = 0; i < 4; i++) box(sink, 0.009, 0.01, 0.13, -1.34 + i * 0.04, 1.468, -0.07, M.metal, 0.001);
pipe(sink, [[-1.60, 1.38, -0.71], [-1.60, 2.23, -0.71], [-1.60, 2.46, -0.22], [-1.60, 2.15, 0.02]], 0.053);
for (const x of [-2.1, -1.06]) { cylinder(sink, 0.10, 0.07, x, 1.47, -0.70, M.metal); box(sink, 0.25, 0.04, 0.065, x, 1.54, -0.70, M.brass, 0.01); }
const halfCups = [];
for (let i = 0; i < 7; i++) {
  const cup = group(sink, 'Half_filled_glass_' + (i + 1), 0.28 + i * 0.31, 1.4, 0.40);
  cylinder(cup, 0.13, 0.46, 0, 0.23, 0, M.glass, 28, true);
  cylinder(cup, 0.115, 0.23, 0, 0.115, 0, M.water, 28);
  cylinder(cup, 0.115, 0.018, 0, 0.01, 0, M.glass);
  const rim = torus(cup, 0.13, 0.01, 0, 0.46, 0, M.white); rim.rotation.x = Math.PI / 2;
  const level = torus(cup, 0.117, 0.008, 0, 0.23, 0, M.waterLine); level.rotation.x = Math.PI / 2;
  cup.userData.fill = 0.5; halfCups.push(cup);
}
plaque(sink, '温水 / 冷水', 'WATER SERVICE', 0.92, 0.23, 1.55, 0.72, 0.94);
const waterDrops = [];
for (let i = 0; i < 7; i++) {
  const x = -1.35 + i * 0.48, y = 2.1 + i * 0.15 + Math.sin(i * 0.6) * 0.17;
  const drop = sphere(sink, 0.115 + (i % 2) * 0.026, x, y, -0.03, M.water);
  drop.scale.y = 1.16;
  sphere(drop, 0.032, -0.052, 0.055, 0.076, M.white);
  drop.name = 'Countable_water_drop_' + (i + 1); float(drop, 0.055, 0); waterDrops.push(drop);
}
light(sink, '#80cbd1', 4.5, 5, -0.5, 2.2, 0.6);
anchor('ground', 'mech4', sink, -0.2, 0.50, 1.0);
anchor('ground', 'npc_hanasaki_ground', root, -5.4, 0.45, 4.4);
anchor('ground', 'npc_sanae_ground', root, 0, 0.5, 1.8);
anchor('ground', 'npc_mio_ground', root, -0.5, 0.45, 6.6);

const doorCorner = group(layers.ground, 'Twisted_wall_floor_corner', 4.7, 0, 2.45, -0.10);
box(doorCorner, 0.63, 2.50, 0.45, 1.95, 1.35, -0.20, M.mint, 0.035, true);
box(doorCorner, 0.38, 1.15, 1.48, -1.52, 0.67, -0.70, M.wall, 0.035, true);
box(doorCorner, 3.15, 0.06, 1.50, 0.10, 0.14, 0, M.ink, 0.04);
const exitDoor = group(doorCorner, 'Twisted_employee_exit', 0, 0.23, 0);
layers.exit = doorCorner;
exitDoor.rotation.z = -0.13;
box(exitDoor, 2.52, 3.48, 0.5, 0, 1.68, 0, M.ink, 0.11, true);
box(exitDoor, 2.2, 3.21, 0.14, 0, 1.69, 0.29, M.brass, 0.065);
box(exitDoor, 1.98, 2.96, 0.10, 0, 1.65, 0.397, M.teal, 0.045, true);
box(exitDoor, 0.68, 0.6, 0.035, 0, 2.20, 0.464, M.blue, 0.04);
box(exitDoor, 0.37, 0.048, 0.08, 0.62, 1.4, 0.48, M.brass, 0.015);
plaque(exitDoor, '员工通道', '', 1.68, 0.32, 0, 3.15, 0.304);
plaque(exitDoor, '装到一半，门就开。', '', 1.72, 0.23, 0, 0.76, 0.462, true);
box(exitDoor, 2.67, 0.10, 1.12, 0, -0.08, 0.24, M.metal, 0.045);
const keypad = group(exitDoor, 'Four_digit_lock', 1.50, 1.73, 0.19);
box(keypad, 0.39, 0.67, 0.19, 0, 0, 0, M.ink, 0.045);
const lockTex = texture(384, 160, c => { c.fillStyle = '#384743'; c.fillRect(0, 0, 384, 160); c.fillStyle = '#dbd2ab'; c.font = '56px monospace'; c.fillText('— — — —', 16, 103); });
plane(keypad, 0.31, 0.16, 0, 0.20, 0.103, lockTex);
for (let i = 0; i < 9; i++) box(keypad, 0.064, 0.067, 0.025, -0.10 + (i % 3) * 0.10, -Math.floor(i / 3) * 0.09, 0.115, M.brass, 0.008);
anchor('ground', 'door', exitDoor, 0, 0.38, 0.62);

const coffee = group(layers.air, 'Floating_coffee_machine', -3.10, 3.68, -2.6, 0.08);
box(coffee, 2.12, 2.0, 1.20, 0, 0, 0, M.cream, 0.16, true);
box(coffee, 1.76, 1.74, 0.075, 0, 0, 0.637, M.teal, 0.065);
box(coffee, 1.07, 0.67, 0.25, -0.12, -0.4, 0.79, M.ink, 0.055);
box(coffee, 1.80, 0.10, 0.55, 0, -0.93, 0.74, M.metal, 0.035);
for (let i = 0; i < 10; i++) box(coffee, 0.06, 0.018, 0.30, -0.68 + i * 0.15, -0.869, 0.78, M.ink, 0.006);
for (const x of [-0.38, 0.18]) cylinder(coffee, 0.052, 0.21, x, -0.16, 0.99, M.metal, 20);
const display = texture(512, 256, c => {
  c.fillStyle = '#193943'; c.fillRect(0, 0, 512, 256); c.strokeStyle = '#7ba59d'; c.lineWidth = 4; c.strokeRect(12, 12, 488, 232);
  c.fillStyle = '#e2d4a2'; c.textAlign = 'center'; c.font = 'bold 119px monospace'; c.fillText('50%', 256, 150);
  c.font = '25px monospace'; c.fillText('WATER RESERVE', 256, 211);
});
plane(coffee, 1.10, 0.55, -0.12, 0.51, 0.691, display);
for (let i = 0; i < 2; i++) { const b = cylinder(coffee, 0.072, 0.035, 0.68, 0.57 - i * 0.27, 0.714, i ? M.brass : M.red); b.rotation.x = Math.PI / 2; }
const tank = group(coffee, 'Half_full_water_tank', 1.25, -0.05, 0.0);
box(tank, 0.52, 1.56, 0.82, 0, 0, 0, M.glass, 0.065);
box(tank, 0.46, 0.75, 0.75, 0, -0.375, 0, M.water, 0.04);
box(tank, 0.59, 0.07, 0.87, 0, 0.82, 0, M.cream, 0.025);
for (let i = 0; i < 5; i++) box(tank, 0.14, 0.02, 0.009, 0.11, -0.63 + i * 0.31, 0.418, M.white, 0.002);
pipe(coffee, [[-0.9, 0.5, -0.56], [-1.3, 0.1, -0.6], [-1.32, -1.2, -0.44], [-0.83, -1.68, -0.33], [-0.72, -1.38, -0.22]], 0.026, M.ink);
plaque(coffee, 'B7 · COFFEE', '', 0.76, 0.17, 0, 1.01, 0.36, true);
float(coffee, 0.095, 0.012);
anchor('air', 'mech2', coffee, 0, -1.40, 0.72);
anchor('air', 'npc_arami_air', root, -4.3, 0.6, 0.5);
const broom = group(layers.air, 'Floating_broom', -5.1, 2.6, -1.1);
cylinder(broom, 0.042, 2.7, 0, 0, 0, M.wood, 16);
box(broom, 0.61, 0.12, 0.23, 0, -1.30, 0, M.brass, 0.03);
for (let i = 0; i < 12; i++) box(broom, 0.043, 0.40, 0.18, -0.26 + i * 0.047, -1.55, 0, i % 2 ? M.wood : M.paper, 0.006);
broom.rotation.z = -0.43; float(broom, 0.08, 0.02);
for (let i = 0; i < 2; i++) {
  const jar = group(layers.air, 'Floating_sugar_tin_' + i, -0.80 + i * 0.72, 3.1 + i * 0.50, -3.4);
  cylinder(jar, 0.22, 0.49, 0, 0, 0, M.cream); cylinder(jar, 0.24, 0.065, 0, 0.28, 0, M.wood);
  plaque(jar, i ? 'TEA' : 'SUGAR', '', 0.31, 0.13, 0, 0, 0.222); float(jar, 0.07, 0.035);
}

const fridge = group(layers.air, 'Mirror_refrigerator', 3.40, 0.13, -3.30, -0.06);
for (const x of [-1.28, 1.28]) for (const z of [-0.50, 0.63]) cylinder(fridge, 0.095, 0.20, x, 0.13, z, M.ink, 16);
box(fridge, 3.0, 0.20, 1.58, 0, 0.32, 0, M.cream, 0.09, true);
box(fridge, 3.0, 0.25, 1.58, 0, 4.42, 0, M.white, 0.10, true);
for (const x of [-1.38, 1.38]) box(fridge, 0.24, 4.00, 1.58, x, 2.38, 0, M.white, 0.10, true);
box(fridge, 2.62, 3.87, 0.12, 0, 2.37, -0.76, M.ink, 0.055);
box(fridge, 2.70, 3.90, 0.04, 0, 2.37, -0.67, M.dark, 0.035);
const pocket = group(fridge, 'Actual_inverted_pocket_room', 0, 2.29, 0.64);
box(pocket, 2.43, 3.50, 0.075, 0, 0, -0.48, M.plum, 0.015);
for (const x of [-1.20, 1.20]) box(pocket, 0.10, 3.50, 0.53, x, 0, -0.22, M.teal, 0.015);
const mini = group(pocket, 'Upside_down_mirrored_interior', 0, 0.03, -0.10);
mini.rotation.z = Math.PI;
box(mini, 2.3, 0.07, 0.62, 0, -1.45, -0.05, M.cream, 0.012);
box(mini, 1.38, 0.73, 0.33, -0.29, -1.0, 0.0, M.mint, 0.024);
box(mini, 1.56, 0.06, 0.45, -0.29, -0.60, 0.03, M.metal, 0.015);
for (let i = 0; i < 3; i++) { box(mini, 0.40, 0.59, 0.025, -0.75 + i * 0.45, -1.01, 0.19, M.cream, 0.012); box(mini, 0.12, 0.02, 0.035, -0.75 + i * 0.45, -0.81, 0.215, M.brass, 0.005); }
pipe(mini, [[-0.48, -0.55, 0.04], [-0.48, -0.24, 0.04], [-0.17, -0.22, 0.04], [-0.17, -0.35, 0.09]], 0.018);
for (const x of [-1.07, 1.07]) box(mini, 0.07, 2.8, 0.05, x, 0, -0.33, M.brass, 0.01);
box(mini, 0.58, 1.17, 0.06, 0.72, 0.42, -0.34, M.cream, 0.02);
box(mini, 0.45, 1.04, 0.025, 0.72, 0.42, -0.293, M.teal, 0.01);
box(mini, 0.14, 0.023, 0.026, 0.82, 0.3, -0.27, M.brass, 0.005);
for (let i = 0; i < 6; i++) box(mini, 2.2, 0.014, 0.025, 0, -1.2 + i * 0.5, -0.355, M.mint, 0.001);
const clockTex = texture(512, 512, c => {
  c.translate(512, 0); c.scale(-1, 1);
  c.fillStyle = '#e0d9bb'; c.beginPath(); c.arc(256, 256, 248, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#567071'; c.lineWidth = 5; c.beginPath(); c.arc(256, 256, 239, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#35494d'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 43px serif';
  for (let n = 1; n <= 12; n++) { const a = n * Math.PI / 6 - Math.PI / 2; c.fillText(String(n), 256 + Math.cos(a) * 196, 256 + Math.sin(a) * 196); }
  c.lineCap = 'round'; c.lineWidth = 14; c.beginPath(); c.moveTo(256, 256); c.lineTo(256, 108); c.stroke();
  c.strokeStyle = '#9a5846'; c.lineWidth = 18; c.beginPath(); c.moveTo(256, 256); c.lineTo(350, 202); c.stroke();
  c.fillStyle = '#556d67'; c.beginPath(); c.arc(256, 256, 16, 0, Math.PI * 2); c.fill();
});
const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.56, 64), new THREE.MeshBasicMaterial({ map: clockTex, toneMapped: false }));
clockFace.position.set(-0.38, -0.07, 0.19); pocket.add(clockFace);
torus(pocket, 0.58, 0.035, -0.38, -0.07, 0.18, M.brass);
for (const x of [-1.13, 1.13]) box(pocket, 0.026, 3.25, 0.028, x, 0, 0.12, M.cold, 0.005);
glow(pocket, '#b2d7ec', 0, 0, 0.24, 3.0, 0.06); light(pocket, '#afcde6', 4.0, 4, 0, 0, 0.50);
const openDoor = group(fridge, 'Open_refrigerator_door', 1.48, 2.40, 0.75, 1.24);
box(openDoor, 2.80, 4.15, 0.22, 1.40, 0, 0, M.cream, 0.14, true);
box(openDoor, 2.55, 3.87, 0.045, 1.40, 0, -0.135, M.mint, 0.06);
for (let i = 0; i < 3; i++) box(openDoor, 2.36, 0.21, 0.15, 1.40, -1.24 + i * 1.06, -0.245, M.white, 0.035);
box(openDoor, 0.1, 0.9, 0.12, 2.54, 0.2, 0.18, M.brass, 0.025);
plaque(fridge, 'B7 / 冷蔵', '', 1.35, 0.26, 0, 4.40, 0.83);
anchor('air', 'mech3', fridge, 0, 0.82, 1.0);
anchor('air', 'npc_lan_air', root, 1.2, 0.60, -0.16);

const rack = group(layers.ceiling, 'Seven_inverted_mugs', -1.0, 6.65, -1.85);
for (const z of [-0.62, 0.62]) box(rack, 8.4, 0.12, 0.13, 0, -0.18, z, M.brass, 0.02, true);
for (const x of [-4.08, 4.08]) {
  box(rack, 0.12, 0.12, 1.32, x, -0.18, 0, M.brass, 0.02);
  pipe(rack, [[x, -0.16, -0.62], [x, 0.72, -0.62], [x, 1.12, -0.2]], 0.022, M.metal);
}
const mugs = [], stained = [2, 4, 7];
const mugProfile = [[0.0, 0.018], [0.24, 0.018], [0.32, 0.10], [0.34, 0.66], [0.305, 0.69], [0.278, 0.63], [0.266, 0.14], [0.0, 0.14]].map(([x, y]) => new THREE.Vector2(x, y));
const mugGeo = new THREE.LatheGeometry(mugProfile, 40);
for (let i = 0; i < 7; i++) {
  const mug = group(rack, 'Upside_down_cup_' + (i + 1), -3.45 + i * 1.13, 0.30, 0);
  mug.rotation.z = Math.PI;
  const body = new THREE.Mesh(mugGeo, M.white); body.castShadow = body.receiveShadow = true; mug.add(body);
  const handle = torus(mug, 0.215, 0.046, 0.40, 0.36, 0, M.white); handle.scale.x = 0.85;
  const foot = torus(mug, 0.205, 0.022, 0, 0.015, 0, M.cream); foot.rotation.x = Math.PI / 2;
  if (stained.includes(i + 1)) {
    const stain = torus(mug, 0.164, 0.016, 0, 0.008, 0, M.coffee); stain.rotation.x = Math.PI / 2;
    const trace = torus(mug, 0.146, 0.005, 0.005, 0.007, 0.004, M.coffee, Math.PI * 1.53); trace.rotation.x = Math.PI / 2;
  }
  pipe(rack, [[mug.position.x - 0.47, -0.10, -0.58], [mug.position.x - 0.47, -0.06, -0.1], [mug.position.x - 0.40, -0.03, 0.03]], 0.025, M.metal);
  mug.userData.stained = stained.includes(i + 1); mugs.push(mug);
}
anchor('ceiling', 'mech1', rack, 0, -0.60, 1.1);
function hangingChair(x, z, angle) {
  const chair = group(layers.ceiling, 'Inverted_chair', x, 7.15, z, angle);
  box(chair, 0.87, 0.12, 0.84, 0, 0, 0, M.wood, 0.05, true);
  for (const xx of [-0.33, 0.33]) for (const zz of [-0.32, 0.32]) cylinder(chair, 0.035, 0.96, xx, 0.50, zz, M.metal, 12);
  for (const xx of [-0.33, 0.33]) cylinder(chair, 0.03, 0.80, xx, -0.41, -0.32, M.metal, 12);
  box(chair, 0.80, 0.42, 0.12, 0, -0.66, -0.32, M.wood, 0.045);
  chair.rotation.z = 0.04; float(chair, 0.027, 0.015); return chair;
}
hangingChair(-5.5, -4.1, 0.12); hangingChair(4.6, -4.2, -0.18);

const details = group(layers.ground, 'Pantry_details');
const cupboard = group(details, 'Tea_cupboard', -5.5, 0.12, -4.6);
box(cupboard, 1.8, 1.42, 1.0, 0, 0.74, 0, M.teal, 0.06, true);
box(cupboard, 1.93, 0.12, 1.11, 0, 1.50, 0, M.wood, 0.04);
for (let i = 0; i < 3; i++) { box(cupboard, 1.62, 0.36, 0.07, 0, 0.31 + i * 0.43, 0.54, M.mint, 0.02); box(cupboard, 0.27, 0.035, 0.06, 0, 0.38 + i * 0.43, 0.596, M.brass, 0.01); }
for (let i = 0; i < 3; i++) { box(cupboard, 0.33, 0.51, 0.35, -0.55 + i * 0.41, 1.80, 0, i % 2 ? M.paper : M.red, 0.035); plaque(cupboard, i ? '茶' : '珈琲', '', 0.20, 0.19, -0.55 + i * 0.41, 1.81, 0.185); }
const bulletin = group(structure, 'Staff_noticeboard', -3.05, 1.89, -6.13);
box(bulletin, 1.55, 1.4, 0.11, 0, 0, 0, M.wood, 0.035);
const paperTex = texture(384, 512, c => {
  c.fillStyle = '#dad6bd'; c.fillRect(0, 0, 384, 512); c.fillStyle = '#5c716d'; c.font = 'bold 44px "Microsoft YaHei",sans-serif'; c.fillText('当番表', 50, 77);
  c.lineWidth = 2; c.strokeStyle = '#96a498'; for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(35, 126 + i * 44); c.lineTo(350, 126 + i * 44); c.stroke(); }
});
plane(bulletin, 0.75, 1.05, -0.17, 0.04, 0.06, paperTex); sphere(bulletin, 0.024, -0.15, 0.57, 0.09, M.red);
const stool = group(details, 'Small_stool', -5.9, 0.15, 3.25, 0.15);
cylinder(stool, 0.42, 0.12, 0, 0.74, 0, M.wood);
for (const x of [-0.26, 0.26]) for (const z of [-0.26, 0.26]) cylinder(stool, 0.045, 0.68, x, 0.36, z, M.teal, 12);
const towel = box(sink, 0.54, 0.028, 0.31, 0.34, 1.408, -0.49, M.paper, 0.015); towel.rotation.y = 0.13;
for (let i = 0; i < 5; i++) box(details, 0.045, 0.015, 0.5, -6.2 + i * 0.14, 0.11, 5.1, M.ink, 0.004);
box(details, 0.81, 0.025, 0.60, -5.92, 0.092, 5.1, M.metal, 0.025);
for (let i = 0; i < 6; i++) {
  const sheet = plane(details, 0.26, 0.34, -1.1 + random() * 3.6, 0.11, 4.5 + random() * 1.4, paperTex); sheet.rotation.x = -Math.PI / 2; sheet.rotation.z = random();
}
const dustCount = 95, dustOrigins = [], dustArray = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) { const p = [(random() - 0.5) * 13, 0.5 + random() * 7, (random() - 0.5) * 10]; dustOrigins.push(p); dustArray.set(p, i * 3); }
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustArray, 3));
root.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#d5cab1', map: glowTex, size: 0.035, transparent: true, opacity: 0.33, depthWrite: false })));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const gameCamera = createGameCamera({ camera, controls, root, layers, anchors, reducedMotion });
function resize() {
  const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight), ratio = w / h;
  if (gameCamera.embedded) gameCamera.resize();
  else { const half = Math.max(11.9, 14.2 / ratio); camera.left = -half * ratio; camera.right = half * ratio; camera.top = half; camera.bottom = -half; camera.updateProjectionMatrix(); }
  renderer.setSize(w, h); composer.setSize(w, h);
}
addEventListener('resize', resize); resize();
const clock = new THREE.Clock(); let elapsed = 0, frames = 0;
function render() {
  requestAnimationFrame(render);
  const dt = Math.min(clock.getDelta(), 0.08);
  if (document.hidden || !gameCamera.active) return;
  elapsed += dt; gameCamera.tick(dt);
  if (!reducedMotion.matches) {
    for (const f of floaters) { f.object.position.y = f.y + Math.sin(elapsed * 0.42 + f.phase) * f.amplitude; f.object.rotation.z = f.z + Math.sin(elapsed * 0.26 + f.phase) * f.tilt; }
    for (let i = 0; i < dustCount; i++) dustArray[i * 3 + 1] = 0.5 + (dustOrigins[i][1] + elapsed * 0.012) % 7;
    dustGeo.attributes.position.needsUpdate = true; mainLamp.intensity = 15 + Math.sin(elapsed * 0.8) * 0.35;
  }
  controls.update(); renderer.info.reset(); composer.render(); gameCamera.afterRender(); frames++;
}
render();
window.__SCENE_DIAGNOSTICS__ = {
  get ready() { return frames > 2; }, get frames() { return frames; }, get active() { return gameCamera.active; },
  get view() { return gameCamera.view; }, get settled() { return gameCamera.settled; }, get anchors() { return gameCamera.positions; },
  get camera() { return { position: camera.position.toArray(), target: controls.target.toArray(), zoom: camera.zoom }; },
  get renderer() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries }; },
  mugs: mugs.length, stainIndices: mugs.flatMap((m, i) => m.userData.stained ? [i + 1] : []),
  halfCups: halfCups.length, cupFillFractions: halfCups.map(c => c.userData.fill), waterDrops: waterDrops.length,
  coffeeDisplay: '50%', coffeeFillFraction: 0.5, clockMinuteDirection: 'up', clockHourDirection: 'upper-left',
  realReflection: mirror.isReflector, sceneVersion: '1.0.0', dependency: THREE.REVISION
};
