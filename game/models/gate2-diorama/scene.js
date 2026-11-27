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
scene.background = new THREE.Color('#151d2d');
scene.fog = new THREE.FogExp2('#151d2d', 0.016);
const camera = new THREE.OrthographicCamera(-14, 14, 12, -12, 0.1, 180);
camera.position.set(21, 19, 26);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (error) {
  const fallback = document.getElementById('error');
  fallback.textContent = '无法启动三维渲染。请用支持 WebGL 2 的新版 Edge / Chrome 打开，并开启浏览器硬件加速。';
  fallback.className = 'visible';
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.setAttribute('aria-label', '无声的金属森林三维模型');
renderer.domElement.tabIndex = 0;
document.querySelector('main').append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.95, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = 1.47;
controls.minZoom = 0.58;
controls.maxZoom = 4.2;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.rotateSpeed = 0.64;
controls.zoomSpeed = 0.8;
controls.update();
controls.saveState();
renderer.domElement.addEventListener('dblclick', () => controls.reset());
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

const renderTarget = new THREE.WebGLRenderTarget(1024, 768, { type: THREE.HalfFloatType, samples: Math.min(4, renderer.capabilities.maxSamples) });
const composer = new EffectComposer(renderer, renderTarget);
renderer.info.autoReset = false;
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1024, 768), 0.48, 0.58, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const root = new THREE.Group();
root.name = 'B7_Gate2_SilentForest';
scene.add(root);
let seed = 4023;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const gradient = new THREE.DataTexture(new Uint8Array([86, 145, 194, 235]), 4, 1, THREE.RedFormat);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;
function toon(color, emissive = 0, intensity = 0) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradient, emissive, emissiveIntensity: intensity });
}
function lightMat(color, intensity = 1) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
}
const M = {
  ink: toon('#121f30'), shell: toon('#2b4251'), edge: toon('#617a86'), panel: toon('#344957'),
  slate: toon('#384754'), floor: toon('#485764'), tile: toon('#4f606d'), grout: toon('#1b2b3d'),
  violet: toon('#575771'), wall: toon('#3c4d5f'), trim: toon('#768a93'), brass: toon('#ab956e'),
  cable: toon('#14202e'), white: toon('#c0d6d7'), black: toon('#0b131f'), paper: toon('#d9d3b4'),
  teal: lightMat('#8cdfc7', 1.45), cyan: lightMat('#8fd4de', 1.15), dim: lightMat('#345e6d', 0.7),
  amber: lightMat('#f5c68a', 1.45), green: lightMat('#6bf5b1', 1.55), off: toon('#183834'),
  red: lightMat('#ed6374', 0.7), label: toon('#d0c7b4')
};
const geomCache = new Map();
function geoBox(w, h, d, radius = 0.025) {
  const r = Math.min(radius, w / 3, h / 3, d / 3);
  const key = [w, h, d, r].join('|');
  if (!geomCache.has(key)) geomCache.set(key, new RoundedBoxGeometry(w, h, d, 1, r));
  return geomCache.get(key);
}
const outlineMat = new THREE.LineBasicMaterial({ color: '#101c2e', transparent: true, opacity: 0.43 });
function box(parent, w, h, d, x, y, z, mat, rounded = 0.025, outline = false) {
  const mesh = new THREE.Mesh(geoBox(w, h, d, rounded), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (outline) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 32), outlineMat));
  return mesh;
}
function cylinder(parent, radius, height, x, y, z, mat, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function sphere(parent, r, x, y, z, mat) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function pipe(parent, points, radius = 0.035, mat = M.cable) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => v3(...p)), false, 'centripetal');
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, radius, 6, false), mat);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function rod(parent, a, b, r, mat = M.edge) {
  const from = v3(...a), to = v3(...b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, from.distanceTo(to), 10), mat);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(v3(0, 1, 0), to.clone().sub(from).normalize());
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function torus(parent, r, tube, x, y, z, mat = M.edge) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 56), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function group(parent, name, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
function labelTexture(title, subtitle = '', bg = '#233c49', fg = '#cfe3dc') {
  return canvasTexture(768, 256, (c, w, h) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.strokeStyle = fg; c.globalAlpha = 0.45; c.lineWidth = 3; c.strokeRect(15, 15, w - 30, h - 30); c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = fg; c.font = '600 64px "Microsoft YaHei", sans-serif'; c.fillText(title, w / 2, subtitle ? 105 : 130);
    if (subtitle) { c.font = '24px "Microsoft YaHei", sans-serif'; c.fillText(subtitle, w / 2, 183); }
  });
}
function plane(parent, width, height, x, y, z, texture, tint = '#ffffff') {
  const material = new THREE.MeshBasicMaterial({ map: texture, color: tint, side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function plaque(parent, title, subtitle, w, h, x, y, z, warm = false) {
  box(parent, w + 0.08, h + 0.08, 0.045, x, y, z - 0.012, warm ? M.brass : M.edge, 0.025);
  return plane(parent, w, h, x, y, z + 0.013, labelTexture(title, subtitle, warm ? '#423f38' : '#233c49', warm ? '#ead4af' : '#cfe3dc'));
}
const floaters = [];
function floating(object, amplitude = 0.075, speed = 0.45, tilt = 0.012) {
  floaters.push({ object, y: object.position.y, z: object.rotation.z, x: object.rotation.x, phase: random() * Math.PI * 2, amplitude, speed, tilt });
}
const glowTexture = canvasTexture(128, 128, c => {
  const grad = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.72)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.24)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = grad; c.fillRect(0, 0, 128, 128);
});
function glow(parent, color, x, y, z, size, opacity = 0.28) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  sprite.position.set(x, y, z); sprite.scale.set(size, size, 1); parent.add(sprite); return sprite;
}
function point(color, intensity, distance, x, y, z) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(x, y, z); root.add(light); return light;
}

scene.add(new THREE.HemisphereLight('#b4d4e2', '#46425b', 1.95));
const key = new THREE.DirectionalLight('#c4d9ed', 2.65);
key.position.set(4, 17, 8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 45 });
key.shadow.bias = -0.00035;
key.shadow.normalBias = 0.035;
key.shadow.radius = 3;
scene.add(key);
const rimLight = new THREE.DirectionalLight('#ada5df', 2.5);
rimLight.position.set(-9, 9, -7); scene.add(rimLight);
const frontFill = new THREE.DirectionalLight('#8bbeb9', 0.7);
frontFill.position.set(8, 6, 12); scene.add(frontFill);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#1c293b', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -1.11; ground.receiveShadow = true; scene.add(ground);

const base = group(root, 'Square_collectible_base');
box(base, 16.9, 0.30, 16.9, 0, -0.91, 0, M.ink, 0.16, true);
box(base, 16.55, 0.62, 16.55, 0, -0.51, 0, M.violet, 0.12, true);
box(base, 16.58, 0.055, 16.58, 0, -0.24, 0, M.brass, 0.026);
box(base, 16.4, 0.25, 16.4, 0, -0.08, 0, M.grout, 0.075);
for (let i = 0; i < 12; i++) {
  box(base, 0.24, 0.08, 0.012, -7.3 + i * 0.35, -0.46, 8.306, i < 4 ? M.dim : M.panel, 0.002);
}
plaque(base, '無声の金属森林', 'B7   /   THE SILENT FOREST   /   GATE 02', 4.45, 0.53, 0.5, -0.54, 8.34, true);
plaque(base, '耳 × 2', 'SENSORY DEPOSIT', 1.35, 0.48, 6.3, -0.54, 8.34);

const tileGeo = geoBox(0.97, 0.08, 0.97, 0.018);
const tiles = [];
for (let x = -7.5; x <= 7.5; x++) for (let z = -7.5; z <= 7.5; z++) {
  if (Math.abs(x) < 3.5 && Math.abs(z + 0.5) < 3) continue;
  tiles.push([x, z]);
}
const floorTiles = new THREE.InstancedMesh(tileGeo, M.floor, tiles.length);
floorTiles.receiveShadow = true;
const temp = new THREE.Object3D();
tiles.forEach(([x, z], i) => {
  temp.position.set(x, 0.1, z); temp.updateMatrix(); floorTiles.setMatrixAt(i, temp.matrix);
  floorTiles.setColorAt(i, new THREE.Color(i % 7 === 0 ? '#b0bfc6' : i % 3 === 0 ? '#d7dcdd' : '#ffffff'));
});
base.add(floorTiles);

const pit = group(root, 'Non_walkable_atrium', 0, 0, -0.5);
box(pit, 6.95, 0.12, 6.0, 0, -0.18, 0, M.black, 0.02);
for (const x of [-3.58, 3.58]) {
  box(pit, 0.25, 0.27, 6.4, x, 0.18, 0, M.edge, 0.045, true);
  box(pit, 0.035, 0.018, 6.0, x - Math.sign(x) * 0.09, 0.325, 0, M.dim, 0.001);
}
for (const z of [-3.13, 3.13]) {
  box(pit, 7.4, 0.27, 0.25, 0, 0.18, z, M.edge, 0.045, true);
  box(pit, 6.9, 0.018, 0.035, 0, 0.325, z - Math.sign(z) * 0.08, M.dim, 0.001);
}
const mirror = new Reflector(new THREE.PlaneGeometry(6.82, 5.78), { color: '#506476', textureWidth: 768, textureHeight: 768, clipBias: 0.004 });
mirror.rotation.x = -Math.PI / 2;
mirror.position.set(0, -0.106, 0);
pit.add(mirror);
for (const x of [-3.5, 3.5]) for (const z of [-2.92, 0, 2.92]) {
  cylinder(pit, 0.048, 0.9, x, 0.72, z, M.edge, 10);
  sphere(pit, 0.065, x, 1.17, z, M.brass);
}
for (const x of [-3.5, 3.5]) {
  rod(pit, [x, 1.17, -2.92], [x, 1.17, 2.92], 0.038, M.brass);
  rod(pit, [x, 0.74, -2.92], [x, 0.74, 2.92], 0.017, M.edge);
}
for (const z of [-2.92, 2.92]) {
  rod(pit, [-3.5, 1.17, z], [3.5, 1.17, z], 0.038, M.brass);
}
for (let i = 0; i < 12; i++) {
  const stripe = box(pit, 0.14, 0.014, 0.3, -2.9 + i * 0.53, 0.334, 3.14, M.brass, 0.001);
  stripe.rotation.y = -0.45;
}

const architecture = group(root, 'Cutaway_architecture');
box(architecture, 16.0, 4.6, 0.24, 0, 2.42, -7.87, M.wall, 0.045, true);
box(architecture, 0.24, 4.6, 9.8, -7.87, 2.42, -2.94, M.wall, 0.045, true);
box(architecture, 0.24, 1.0, 5.95, -7.87, 0.62, 4.93, M.wall, 0.035, true);
box(architecture, 16.0, 0.22, 0.37, 0, 4.78, -7.87, M.edge, 0.035);
box(architecture, 0.37, 0.22, 9.8, -7.87, 4.78, -2.94, M.edge, 0.035);
for (let x = -7; x <= 7; x += 2) {
  box(architecture, 0.065, 4.22, 0.055, x, 2.3, -7.715, M.trim, 0.004);
  box(architecture, 1.7, 0.04, 0.02, x, 1.04, -7.713, M.ink, 0.002);
}
for (let z = -7; z < 2; z += 2) box(architecture, 0.05, 4.2, 0.065, -7.715, 2.3, z, M.trim, 0.004);
box(architecture, 15.5, 0.30, 0.19, 0, 0.33, -7.62, M.ink, 0.018);
plaque(architecture, 'B7 / 設備保全区', 'NO SIGNAL · NO SOUND', 2.6, 0.62, -5.25, 4.05, -7.70);
plaque(architecture, '02', 'SYSTEM CONTROL', 0.8, 0.56, 6.6, 3.99, -7.70);
for (const x of [-6, 5.8]) {
  box(architecture, 0.18, 6.15, 0.18, x, 3.2, -4.7, M.edge, 0.025, true);
  box(architecture, 0.4, 0.18, 0.4, x, 0.25, -4.7, M.ink, 0.035);
}
box(architecture, 12.12, 0.25, 0.32, -0.1, 6.21, -4.7, M.panel, 0.05, true);
box(architecture, 10.8, 0.07, 0.08, -0.1, 6.11, -4.46, M.dim, 0.01);
for (const x of [-2.1, 1.6]) {
  box(architecture, 0.24, 0.20, 5.15, x, 6.2, -2.25, M.panel, 0.035, true);
  for (let z = -4; z < 0.3; z += 0.6) box(architecture, 0.33, 0.08, 0.1, x, 6.33, z, M.brass, 0.014);
}
function tubeLight(x, y, z, length, rotate = 0) {
  const g = group(root, 'Cold_fluorescent', x, y, z, rotate);
  box(g, length + 0.24, 0.2, 0.34, 0, 0, 0, M.ink, 0.04, true);
  box(g, length, 0.065, 0.12, 0, -0.126, 0, M.cyan, 0.027);
  box(g, length, 0.074, 0.075, 0, -0.08, 0.17, M.cyan, 0.026);
  for (const xx of [-length / 2, length / 2]) box(g, 0.1, 0.13, 0.23, xx, -0.08, 0, M.edge, 0.02);
  glow(g, '#a5e6e8', 0, -0.15, 0.24, length * 1.2, 0.24);
}
tubeLight(-4.7, 4.25, -7.4, 2.65);
tubeLight(1.3, 4.53, -7.4, 3.05);
tubeLight(-7.38, 4.45, -2.5, 2.55, Math.PI / 2);
tubeLight(4.9, 3.9, 1.9, 1.65, Math.PI / 2);
point('#98d8e3', 11, 7, -4.6, 3.2, -5.8);
point('#b7b0ea', 14, 9, 1.3, 4.7, -2.5);
point('#8dd9d0', 8, 7, 4, 2.0, 2);

const ventTex = canvasTexture(256, 512, c => {
  c.fillStyle = '#1b2b38'; c.fillRect(0, 0, 256, 512);
  for (let y = 13; y < 510; y += 16) {
    c.fillStyle = '#071420'; c.fillRect(10, y, 236, 8);
    c.fillStyle = '#647783'; c.fillRect(10, y + 9, 236, 2);
  }
});
const rackLabel = labelTexture('B7', 'NODE / 017', '#344854', '#d7dccd');
function server(parent, name, x, y, z, ry = 0, scale = 1, inverted = false) {
  const rack = group(parent, name, x, y, z, ry);
  rack.scale.setScalar(scale);
  box(rack, 1.18, 2.84, 1.1, 0, 1.42, 0, M.ink, 0.08, true);
  box(rack, 1.10, 2.67, 1.16, 0, 1.42, 0.0, M.shell, 0.045, true);
  for (const xx of [-0.535, 0.535]) box(rack, 0.085, 2.65, 0.13, xx, 1.41, 0.575, M.edge, 0.018);
  for (let j = 0; j < 6; j++) {
    const yy = 0.34 + j * 0.4;
    box(rack, 0.94, 0.35, 0.09, 0, yy, 0.61, j % 2 ? M.panel : M.ink, 0.024);
    plane(rack, 0.65, 0.26, -0.075, yy, 0.661, ventTex);
    box(rack, 0.035, 0.18, 0.06, -0.433, yy, 0.677, M.trim, 0.01);
    for (let k = 0; k < 2; k++) box(rack, 0.035, 0.025, 0.014, 0.32 + k * 0.065, yy + 0.07, 0.668, j === 5 || k === 0 ? M.dim : M.cyan, 0.005);
    for (const xx of [-0.405, 0.417]) sphere(rack, 0.018, xx, yy - 0.112, 0.665, M.brass);
  }
  plane(rack, 0.45, 0.15, 0, 2.7, 0.633, rackLabel);
  const rear = group(rack, 'Rear_service_panel', 0, 1.42, -0.605, Math.PI);
  box(rear, 0.86, 2.35, 0.042, 0, 0, 0, M.panel, 0.035);
  plane(rear, 0.64, 0.92, 0, 0.40, 0.028, ventTex);
  plane(rear, 0.62, 0.38, 0, -0.55, 0.028, ventTex);
  box(rear, 0.034, 0.24, 0.05, 0.33, -0.10, 0.043, M.brass, 0.01);
  for (let j = 0; j < 3; j++) box(rear, 0.10, 0.065, 0.03, -0.23 + j * 0.21, -0.94, 0.048, M.black, 0.007);
  box(rack, 1.20, 0.12, 1.17, 0, 0.06, 0, M.edge, 0.025);
  if (inverted) {
    rack.rotation.z = Math.PI;
    for (const xx of [-0.38, 0.38]) rod(rack, [xx, 0, 0], [xx, -0.36, 0], 0.03, M.brass);
  }
  return rack;
}
const wallRacks = group(root, 'Perimeter_server_forest');
[-6.85, -5.48, -4.1].forEach((x, i) => server(wallRacks, `Back_left_${i}`, x, 0.14, -6.9));
[4.65, 6.04, 7.38].forEach((x, i) => server(wallRacks, `Back_right_${i}`, x, 0.14, -6.9, 0, i === 2 ? 0.8 : 1));
[-4.5, -2.9, -1.3, 0.35].forEach((z, i) => server(wallRacks, `West_${i}`, -6.96, 0.14, z, Math.PI / 2, 0.92));
[1.85, 3.35].forEach((z, i) => server(wallRacks, `East_${i}`, 6.64, 0.14, z, -Math.PI / 2, 0.87));
const hanging = group(root, 'Inverted_canopy');
const hangingPositions = [[-2.1, 5.84, -2.85, 0.8, -0.08], [-0.75, 5.65, -1.65, 0.74, 0.08], [1.6, 5.87, -3.4, 0.85, -0.08], [1.72, 5.9, -0.05, 0.64, 0.11]];
hangingPositions.forEach(([x, y, z, s, angle], i) => {
  const rack = server(hanging, `Inverted_rack_${i}`, x, y, z, angle, s, true);
  floating(rack, 0.035, 0.27, 0.006);
  pipe(rack, [[0.4, -0.15, -0.25], [0.8, -0.42, -0.6], [1.1, 0.1, -0.9], [0.88, 0.8, -0.91]], 0.042);
});

for (let j = 0; j < 5; j++) {
  const y = 3.35 + j * 0.12;
  pipe(root, [[-7.64, y, 1.6], [-7.64, y + 0.15, -0.8], [-7.64, y - 0.45, -3.6], [-7.54, y + 0.45, -6.8], [-6.8, y + 0.6, -7.55], [-3.1, y + 0.2, -7.55], [0.1, y + 0.38, -7.55], [2.65, y + 0.2, -7.55]], 0.037 + j * 0.005, j === 0 ? M.brass : M.cable);
}
for (let i = 0; i < 4; i++) {
  pipe(root, [[6.6 + i * 0.12, 0.22, 4.65], [7.33 + i * 0.1, 0.28, 3.2], [7.2 + i * 0.1, 0.27, 0.4], [7.32 + i * 0.1, 1.3, -2.25], [7.35, 3.42 + i * 0.12, -3.75], [6.4, 3.85 + i * 0.1, -5.2]], 0.039, M.cable);
}
for (let i = 0; i < 3; i++) {
  pipe(root, [[-2.1 + i * 0.12, 6.36, -4.65], [-2.4 + i * 0.15, 6.67, -3.1], [-1.95 + i * 0.12, 6.39, -1.4], [-1.0 + i * 0.2, 5.94, -0.6], [0.4 + i * 0.12, 6.21, -1.4], [1.6, 6.4, -3.7]], 0.042, i === 1 ? M.edge : M.cable);
}

const seven = group(root, 'Clue_1_seven_indicators', -5.27, 1.72, 1.93, 0.42);
box(seven, 1.75, 1.9, 0.9, 0, 0, 0, M.shell, 0.09, true);
box(seven, 1.57, 1.67, 0.11, 0, 0, 0.494, M.ink, 0.035);
plaque(seven, '静音サーバー', '01   /   STATUS', 1.18, 0.34, 0, 0.60, 0.565);
const clueLamps = [];
for (let i = 0; i < 7; i++) {
  box(seven, 0.17, 0.43, 0.035, -0.63 + i * 0.21, 0.17, 0.577, M.edge, 0.023);
  const lit = [0, 1, 3, 5].includes(i);
  const lamp = box(seven, 0.10, 0.31, 0.035, -0.63 + i * 0.21, 0.17, 0.605, lit ? M.green : M.off, 0.025);
  lamp.name = lit ? `Always_on_green_${i + 1}` : `Unlit_${i + 1}`;
  clueLamps.push(lamp);
}
plane(seven, 1.26, 0.34, 0, -0.47, 0.566, ventTex);
for (const x of [-0.75, 0.75]) box(seven, 0.08, 0.42, 0.12, x, -0.40, 0.61, M.brass, 0.02);
pipe(seven, [[-0.65, 0.7, -0.2], [-0.95, 1.05, -0.4], [-1.1, 1.24, -0.65], [-1.24, 1.05, -0.8]], 0.032);
glow(seven, '#64efbd', -0.3, 0.2, 0.64, 1.5, 0.25);
floating(seven, 0.09, 0.47, 0.017);
point('#68eac0', 5.5, 4, -5, 1.5, 3);

function monitor(parent, name, x, y, z, width, height, texture, ry = 0) {
  const g = group(parent, name, x, y, z, ry);
  box(g, width + 0.22, height + 0.26, 0.29, 0, 0, 0, M.ink, 0.08, true);
  box(g, width + 0.09, height + 0.09, 0.055, 0, 0.025, 0.172, M.edge, 0.035);
  plane(g, width, height, 0, 0.027, 0.204, texture);
  box(g, 0.12, 0.025, 0.015, width / 2 - 0.1, -height / 2 - 0.074, 0.154, M.dim, 0.007);
  box(g, 0.32, 0.12, 0.11, 0, -height / 2 - 0.16, -0.055, M.edge, 0.028);
  return g;
}
const volumeTex = canvasTexture(768, 512, (c, w, h) => {
  c.translate(w, h); c.scale(-1, -1);
  c.fillStyle = '#152e3c'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#335361'; c.lineWidth = 1;
  for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.fillStyle = '#a6d9d4'; c.font = '28px monospace'; c.fillText('VOLUME / INPUT_02', 40, 54);
  c.font = '180px monospace'; c.fillText('0', 566, 274);
  c.strokeStyle = '#a6d9d4'; c.lineWidth = 5;
  for (let i = 0; i < 7; i++) c.strokeRect(48 + i * 68, 239 - i * 13, 42, 43 + i * 13);
  c.font = '24px monospace'; c.fillText('NO AUDIO SIGNAL', 47, 403);
  c.fillStyle = '#72a4a5'; c.fillRect(42, 453, 682, 3);
});
const screen = monitor(root, 'Clue_2_inverted_mirror_volume', -1.8, 2.78, -5.97, 2.57, 1.65, volumeTex, -0.12);
screen.rotation.z = -0.12;
floating(screen, 0.12, 0.38, 0.023);
pipe(screen, [[0.9, -0.5, -0.18], [1.2, -0.9, -0.4], [0.8, -1.3, -0.43], [0.5, -1.5, -0.65]], 0.03);
glow(screen, '#7fbfe1', 0, 0, 0.26, 2.7, 0.22);

const fan = group(root, 'Clue_3_stationary_two_blade_fan', 2.35, 2.73, -5.66, -0.1);
box(fan, 2.12, 2.12, 0.42, 0, 0, 0, M.panel, 0.17, true);
const disk = cylinder(fan, 0.92, 0.10, 0, 0, 0.27, M.black, 56);
disk.rotation.x = Math.PI / 2;
torus(fan, 0.98, 0.055, 0, 0, 0.31, M.edge);
const blades = group(fan, 'Exactly_two_stationary_blades', 0, 0, 0.36);
const bladeShape = new THREE.Shape();
bladeShape.moveTo(-0.13, 0.1); bladeShape.bezierCurveTo(-0.48, 0.26, -0.58, 0.67, -0.22, 0.80);
bladeShape.bezierCurveTo(0.05, 0.90, 0.37, 0.81, 0.37, 0.62); bladeShape.bezierCurveTo(0.37, 0.37, 0.22, 0.24, 0.13, 0.1);
const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.045, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.015, bevelSegments: 2, steps: 1 });
for (let i = 0; i < 2; i++) {
  const b = new THREE.Mesh(bladeGeo, M.white); b.rotation.z = i * Math.PI + 0.32; b.name = `Static_blade_${i + 1}`; blades.add(b);
}
const hub = cylinder(fan, 0.21, 0.13, 0, 0, 0.44, M.brass, 32); hub.rotation.x = Math.PI / 2;
for (const x of [-0.89, 0.89]) for (const y of [-0.89, 0.89]) sphere(fan, 0.045, x, y, 0.27, M.trim);
plaque(fan, '空調 / 03', '', 1.1, 0.23, 0, -1.20, 0.10);
floating(fan, 0.068, 0.32, 0.012);

const alarmPost = group(root, 'Clue_4_silent_three_second_beacon', 6.72, 0.14, -1.73);
box(alarmPost, 0.75, 3.35, 0.58, 0, 1.68, 0, M.shell, 0.07, true);
box(alarmPost, 0.98, 0.19, 0.82, 0, 0.1, 0, M.ink, 0.035);
plaque(alarmPost, '無音', 'ALARM / 04', 0.6, 0.43, 0, 2.80, 0.316);
plane(alarmPost, 0.45, 0.75, 0, 1.24, 0.303, ventTex);
box(alarmPost, 0.22, 0.13, 0.04, 0, 2.2, 0.33, M.red, 0.02);
cylinder(alarmPost, 0.45, 0.16, 0, 3.47, 0, M.ink);
cylinder(alarmPost, 0.36, 0.08, 0, 3.58, 0, M.brass);
const beaconMat = new THREE.MeshToonMaterial({ color: '#943b59', emissive: '#ff3452', emissiveIntensity: 0.2, gradientMap: gradient });
const beacon = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.31, 5, 20), beaconMat);
beacon.position.set(0, 3.87, 0); alarmPost.add(beacon);
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2;
  rod(alarmPost, [Math.cos(a) * 0.33, 3.62, Math.sin(a) * 0.33], [Math.cos(a) * 0.33, 4.17, Math.sin(a) * 0.33], 0.025, M.edge);
}
const cageTop = torus(alarmPost, 0.33, 0.025, 0, 4.17, 0, M.edge); cageTop.rotation.x = Math.PI / 2;
const alarmGlow = glow(alarmPost, '#ff4e75', 0, 3.91, 0, 2.6, 0.05);
const alarmLight = point('#ff496e', 0.0, 6.5, 6.72, 3.96, -1.73);

function keyboard(parent, x, y, z, scale = 1, ry = 0) {
  const g = group(parent, 'Floating_keyboard', x, y, z, ry);
  g.scale.setScalar(scale);
  box(g, 1.1, 0.08, 0.43, 0, 0, 0, M.edge, 0.05, true);
  box(g, 1.0, 0.032, 0.34, 0, 0.047, 0, M.ink, 0.015);
  const keyMesh = new THREE.InstancedMesh(geoBox(0.062, 0.023, 0.052, 0.008), M.trim, 48);
  let n = 0;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 12; col++) {
    temp.position.set(-0.435 + col * 0.079, 0.076, -0.122 + row * 0.080); temp.rotation.set(0, 0, 0); temp.scale.set(1, 1, 1); temp.updateMatrix(); keyMesh.setMatrixAt(n++, temp.matrix);
  }
  g.add(keyMesh);
  return g;
}
const kb1 = keyboard(root, -4.96, 0.70, 3.10, 1.05, 0.31); kb1.rotation.z = 0.08; floating(kb1, 0.045, 0.47, 0.015);
const kb2 = keyboard(root, -1.8, 1.63, -4.92, 1.05, -0.18); kb2.rotation.x = 0.16; floating(kb2, 0.1, 0.38, 0.017);
const kb3 = keyboard(root, 2.65, 2.0, 0.85, 0.85, -0.5); kb3.rotation.z = -0.18; floating(kb3, 0.10, 0.4, 0.023);
const spectralTex = canvasTexture(384, 256, c => {
  c.fillStyle = '#233a4b'; c.fillRect(0, 0, 384, 256);
  c.strokeStyle = '#619da9'; c.lineWidth = 2;
  for (let i = 0; i < 13; i++) { c.beginPath(); c.moveTo(30, 30 + i * 15); c.lineTo(100 + random() * 240, 30 + i * 15); c.stroke(); }
  c.fillStyle = '#b6dad3'; c.font = '36px monospace'; c.fillText('...', 290, 221);
});
const wandering = monitor(root, 'Drifting_monitor', 2.3, 3.0, 1.16, 1.15, 0.78, spectralTex, -0.45);
wandering.rotation.z = 0.14; floating(wandering, 0.1, 0.4, 0.025);
pipe(wandering, [[0, -0.4, -0.1], [0.1, -0.7, -0.2], [-0.2, -0.95, 0], [0.04, -1.18, 0.14]], 0.022);

const portals = group(root, 'Same_side_entry_and_exit');
function doorway(name, x, z, entry) {
  const g = group(portals, name, x, 0.16, z);
  const width = 1.85, height = 2.85;
  box(g, width + 0.46, height + 0.35, 0.48, 0, height / 2, 0, M.ink, 0.11, true);
  box(g, width + 0.17, height + 0.05, 0.12, 0, height / 2, 0.29, M.edge, 0.025);
  box(g, width, height - 0.13, 0.16, 0, height / 2, 0.365, M.panel, 0.025);
  box(g, 0.029, height - 0.17, 0.02, 0, height / 2, 0.457, entry ? M.amber : M.cyan, 0.004);
  for (const xx of [-width / 2 - 0.16, width / 2 + 0.16]) {
    box(g, 0.044, 2.1, 0.03, xx, 1.25, 0.289, entry ? M.amber : M.cyan, 0.01);
    box(g, 0.24, 0.17, 0.56, xx, 0.04, 0, M.brass, 0.014);
  }
  box(g, 0.5, 0.075, 0.07, 0.47, 1.2, 0.493, M.trim, 0.02);
  box(g, width + 0.5, 0.07, 1.12, 0, 0, 0.22, M.edge, 0.045);
  plaque(g, entry ? '闸·耳 ×2' : '员工通道', entry ? 'SENSORY DEPOSIT / ENTRY' : 'AUTHORIZED PERSONNEL', 1.90, 0.39, 0, 2.85, 0.305, entry);
  if (!entry) {
    const keypad = group(g, 'Four_digit_keypad', 1.46, 1.38, 0.02);
    box(keypad, 0.4, 0.68, 0.27, 0, 0, 0, M.ink, 0.045);
    const lockTex = canvasTexture(256, 192, c => {
      c.fillStyle = '#28424d'; c.fillRect(0, 0, 256, 192);
      c.fillStyle = '#c3e5d4'; c.font = '56px monospace'; c.textAlign = 'center'; c.fillText('— — — —', 128, 107);
    });
    plane(keypad, 0.31, 0.18, 0, 0.18, 0.143, lockTex);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) box(keypad, 0.060, 0.065, 0.022, -0.102 + col * 0.102, -row * 0.095, 0.15, M.trim, 0.008);
    box(g, 0.10, 1.12, 0.11, 1.46, 0.60, 0, M.edge, 0.012);
    plaque(g, '听见的，都不是答案。', 'LOOK. DO NOT LISTEN.', 1.83, 0.31, 0, 2.35, 0.457);
  }
  glow(g, entry ? '#edc695' : '#9cdddd', 0, 2.6, 0.51, 2.4, 0.12);
  return g;
}
doorway('Gate_ear_entry', -4.12, 6.69, true);
const exitDoor = doorway('Employee_exit_locked', 3.54, 6.69, false);
point('#eac38d', 48, 7, -1.4, 2.7, 5.2);
const terminal = group(root, 'System_archive_locked', -0.40, 0.16, 5.05, 0.10);
box(terminal, 1.15, 0.18, 0.98, 0, 0.09, 0, M.ink, 0.08, true);
box(terminal, 0.60, 0.80, 0.60, 0, 0.50, 0, M.panel, 0.06, true);
box(terminal, 1.48, 0.1, 0.85, 0, 1.00, 0.12, M.edge, 0.055);
const archiveTex = canvasTexture(768, 512, (c, w, h) => {
  c.fillStyle = '#383b3e'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#e5c991'; c.font = '600 49px "Microsoft YaHei", sans-serif'; c.fillText('系统档案库', 54, 83);
  c.fillStyle = '#999d95'; c.font = '23px monospace'; c.fillText('B7 / RULE ARCHIVE / ACCESS 00', 54, 127);
  c.strokeStyle = '#8c8870'; c.lineWidth = 2; c.strokeRect(50, 161, 668, 280);
  c.fillStyle = '#c7bda1'; c.font = '35px "Microsoft YaHei", sans-serif'; c.fillText('权限锁定', 84, 222);
  for (let i = 0; i < 4; i++) { c.fillStyle = i === 0 ? '#a36b6b' : '#696d65'; c.fillRect(87, 262 + i * 38, 230 + i * 63, 11); }
  c.fillStyle = '#e5b284'; c.font = '19px monospace'; c.fillText('AWAITING AUTHORIZATION _', 54, 481);
});
const archiveScreen = monitor(terminal, 'Warm_floating_archive_screen', 0, 1.93, -0.11, 1.68, 1.15, archiveTex);
archiveScreen.rotation.x = -0.10;
floating(archiveScreen, 0.037, 0.38, 0.009);
keyboard(terminal, 0, 1.10, 0.2, 0.88);
plaque(terminal, '記録 / ARCHIVE', '', 0.46, 0.18, 0, 0.50, 0.311, true);
glow(terminal, '#f5ce96', 0, 1.9, 0.24, 3.1, 0.18);

const memoTex = canvasTexture(512, 384, c => {
  c.fillStyle = '#d6ceb1'; c.fillRect(0, 0, 512, 384);
  c.fillStyle = '#434a52'; c.font = '600 52px "Microsoft YaHei", sans-serif'; c.fillText('看灯。别听。', 48, 136);
  c.font = '35px "Microsoft YaHei", sans-serif'; c.fillText('声音没了。', 60, 222);
  c.strokeStyle = '#9c947d'; c.lineWidth = 2; c.beginPath(); c.moveTo(58, 288); c.lineTo(452, 288); c.stroke();
});
const note = plane(root, 0.72, 0.51, -1.67, 0.19, 5.25, memoTex); note.rotation.x = -Math.PI / 2; note.rotation.z = -0.17;
const paperTex = canvasTexture(256, 384, c => {
  c.fillStyle = '#cdcbb9'; c.fillRect(0, 0, 256, 384);
  c.fillStyle = '#627681'; c.fillRect(25, 35, 90, 14);
  for (let y = 83; y < 330; y += 22) c.fillRect(25, y, 100 + random() * 100, 3);
  c.strokeStyle = '#8d8276'; c.lineWidth = 4; c.strokeRect(151, 282, 70, 53);
});
for (let i = 0; i < 9; i++) {
  const a = 0.7 + i * 0.58;
  const paper = plane(root, 0.27 + random() * 0.08, 0.4, Math.cos(a) * 2.3, 0.75 + i * 0.42, Math.sin(a) * 1.8 - 0.5, paperTex);
  paper.rotation.set(-0.45 + random() * 0.5, a, -0.35 + random() * 0.7);
  floating(paper, 0.06, 0.28 + random() * 0.08, 0.065);
}

const detail = group(root, 'Maintenance_details');
for (let i = 0; i < 3; i++) {
  box(detail, 0.8, 0.36, 0.62, -6.6 + i * 0.35, 0.34 + (i % 2) * 0.4, 5.4 - i * 0.3, M.panel, 0.05, true);
  box(detail, 0.25, 0.085, 0.026, -6.6 + i * 0.35, 0.36 + (i % 2) * 0.4, 5.725 - i * 0.3, M.brass, 0.009);
}
for (let i = 0; i < 7; i++) {
  const ring = torus(detail, 0.43 + i * 0.018, 0.024, 5.7, 0.20 + i * 0.026, 5.38, M.cable); ring.rotation.x = Math.PI / 2;
}
pipe(detail, [[5.8, 0.2, 5.4], [5.2, 0.20, 4.9], [4.6, 0.20, 4.9], [4.65, 0.2, 5.5]], 0.024);
for (const [x, z] of [[-4.8, -3.6], [4.8, -3.6], [-4.8, 3.9], [4.8, 3.9]]) {
  box(detail, 0.72, 0.045, 0.5, x, 0.175, z, M.ink, 0.03);
  for (let i = 0; i < 6; i++) box(detail, 0.55, 0.018, 0.024, x, 0.21, z - 0.19 + i * 0.074, M.edge, 0.003);
}
for (let i = 0; i < 8; i++) {
  const arrow = new THREE.Shape(); arrow.moveTo(-0.1, -0.16); arrow.lineTo(0.1, -0.16); arrow.lineTo(0.1, 0.02); arrow.lineTo(0.22, 0.02); arrow.lineTo(0, 0.27); arrow.lineTo(-0.22, 0.02); arrow.lineTo(-0.1, 0.02);
  const decal = new THREE.Mesh(new THREE.ShapeGeometry(arrow), new THREE.MeshBasicMaterial({ color: '#81918b', transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  decal.rotation.x = -Math.PI / 2; decal.position.set(i < 4 ? -4.55 : 4.6, 0.146, -3.0 + (i % 4) * 1.8); if (i >= 4) decal.rotation.z = Math.PI; detail.add(decal);
}

const particlesN = 140;
const particlePositions = new Float32Array(particlesN * 3);
const particleOrigins = [];
for (let i = 0; i < particlesN; i++) {
  const p = [(random() - 0.5) * 12, 0.3 + random() * 6, (random() - 0.5) * 10];
  particleOrigins.push(p); particlePositions.set(p, i * 3);
}
const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: '#b8dcd4', map: glowTexture, size: 0.062, transparent: true, opacity: 0.62, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
root.add(particles);
const mists = [];
for (let i = 0; i < 6; i++) {
  const mist = glow(pit, i % 2 ? '#748ad0' : '#5c9fba', (random() - 0.5) * 5, 0.05 + random() * 0.33, (random() - 0.5) * 4.5, 3.2, 0.095);
  mist.scale.y = 0.8;
  mists.push({ mist, x: mist.position.x, phase: random() * 6 });
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const gameCamera = createGameCamera({
  camera, controls, root, reducedMotion,
  objects: { seven, screen, fan, alarm: alarmPost, archive: archiveScreen, exit: exitDoor, hanging }
});
function resize() {
  const width = Math.max(1, window.innerWidth), height = Math.max(1, window.innerHeight), ratio = width / height;
  if (gameCamera.embedded) gameCamera.resize();
  else {
    const half = Math.max(11.45, 13.6 / ratio);
    camera.left = -half * ratio; camera.right = half * ratio; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  renderer.setSize(width, height);
  composer.setSize(width, height);
}
window.addEventListener('resize', resize);
resize();
const clock = new THREE.Clock();
let elapsed = 0, frame = 0;
let hidden = false;
document.addEventListener('visibilitychange', () => { hidden = document.hidden; clock.getDelta(); });
function render() {
  requestAnimationFrame(render);
  const dt = Math.min(clock.getDelta(), 0.08);
  if (hidden || !gameCamera.active) return;
  gameCamera.tick(dt);
  elapsed += dt;
  const t = elapsed;
  if (!reducedMotion.matches) {
    for (const f of floaters) {
      f.object.position.y = f.y + Math.sin(t * f.speed + f.phase) * f.amplitude;
      f.object.rotation.z = f.z + Math.sin(t * f.speed * 0.83 + f.phase) * f.tilt;
      f.object.rotation.x = f.x + Math.cos(t * f.speed * 0.72 + f.phase) * f.tilt * 0.45;
    }
    for (let i = 0; i < particlesN; i++) {
      const p = particleOrigins[i];
      particlePositions[i * 3] = p[0] + Math.sin(t * 0.18 + i) * 0.12;
      particlePositions[i * 3 + 1] = 0.3 + ((p[1] - 0.3 + t * (0.023 + (i % 5) * 0.008)) % 5.9);
    }
    particleGeo.attributes.position.needsUpdate = true;
    for (const f of mists) f.mist.position.x = f.x + Math.sin(t * 0.13 + f.phase) * 0.25;
  }
  const phase = t % 3;
  const flash = reducedMotion.matches ? 0.2 : phase < 0.38 ? Math.pow(Math.sin(Math.PI * phase / 0.38), 2) : 0;
  beaconMat.emissiveIntensity = 0.12 + flash * 3.8;
  alarmGlow.material.opacity = 0.035 + flash * 0.42;
  alarmLight.intensity = flash * 28;
  controls.update();
  renderer.info.reset();
  composer.render();
  gameCamera.afterRender();
  frame++;
}
render();
window.__SCENE_DIAGNOSTICS__ = {
  get ready() { return frame > 2; },
  get frames() { return frame; },
  get active() { return gameCamera.active; },
  get view() { return gameCamera.view; },
  get settled() { return gameCamera.settled; },
  get anchors() { return gameCamera.positions; },
  get renderer() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
  get camera() { return { position: camera.position.toArray(), zoom: camera.zoom, target: controls.target.toArray() }; },
  clueLights: clueLamps.length,
  constantlyLitGreenLights: clueLamps.filter(l => l.material === M.green).length,
  stationaryBlades: blades.children.length,
  alarmPeriodSeconds: 3,
  sceneVersion: '1.0.0',
  dependency: THREE.REVISION
};
