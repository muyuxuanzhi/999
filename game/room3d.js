/* ============================================================
   序幕关押室 · 全局房间模型（three.js 灰盒）
   - 物品 = 几何方块 + 名称标签
   - 黑暗：全黑，仅倒计时屏的红光；明亮：显示物品布局
   对外接口：window.Room3D.init(container) / setLit / setView / setItemState
   ============================================================ */

import * as THREE from "./lib/three.module.min.js";

// 物品布局来自 layout.js（与右侧 4:3 舞台的热点共用同一份数据）
const LAYOUT = window.ROOM_LAYOUT;
const ROOM_W = LAYOUT.W;
const ROOM_D = LAYOUT.D;
const ROOM_H = LAYOUT.H;

// 各游戏视角对应的镜头位置与注视点
const VIEW_POSES = {
  overview: { pos: [15, 11, 17], look: [0, 2.2, 0] },
  floor: { pos: [0.01, 17, 6], look: [0, 0, 0] },
  front: { pos: [0, 3.6, 17], look: [0, 3.4, -ROOM_D / 2] },
  left: { pos: [17, 3.6, 0], look: [-ROOM_W / 2, 3.2, 0] },
  right: { pos: [-17, 3.6, 0], look: [ROOM_W / 2, 3.2, 0] },
};

// 物品定义：id 与游戏热点 id 保持一致，数据见 layout.js
const ITEMS = LAYOUT.items;

let renderer, scene, camera, container;
let wallMats = [], lineMats = [];
let ambient, roomLight, redGlow;
const itemObjs = {};
let lit = false;

// 轨道控制（自写，避免引入额外模块）
const orbit = {
  target: new THREE.Vector3(),
  desiredTarget: new THREE.Vector3(),
  radius: 20,
  desiredRadius: 20,
  theta: 0, phi: 1,
  desiredTheta: 0, desiredPhi: 1,
  dragging: false, lastX: 0, lastY: 0,
  pinchDist: 0,
};

function poseToSpherical(pose) {
  const p = new THREE.Vector3(...pose.pos);
  const t = new THREE.Vector3(...pose.look);
  const d = p.clone().sub(t);
  const r = d.length();
  return {
    target: t,
    radius: r,
    theta: Math.atan2(d.x, d.z),
    phi: Math.acos(Math.min(1, Math.max(-1, d.y / r))),
  };
}

function makeLabel(text) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  const font = "bold 44px 'Microsoft YaHei', sans-serif";
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 36;
  c.width = w;
  c.height = 72;
  ctx.font = font;
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(0, 0, w, 72, 14) : ctx.rect(0, 0, w, 72);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, w / 2, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false });
  const sp = new THREE.Sprite(mat);
  sp.userData.ratio = w / 72; // 宽高比，resize 时按画布高度重算尺寸
  sp.scale.set((w / 72) * 0.04, 0.04, 1);
  sp.renderOrder = 10;
  return sp;
}

function buildRoom() {
  // 地面
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x000000, side: THREE.FrontSide });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(ROOM_W, 12, 0x555a66, 0x2a2d35);
  grid.position.y = 0.01;
  scene.add(grid);
  lineMats.push(grid.material);

  // 三面墙（单面渲染，背对镜头时自动透明形成剖面）
  const wallDefs = [
    { pos: [0, ROOM_H / 2, -ROOM_D / 2], rotY: 0, w: ROOM_W },
    { pos: [-ROOM_W / 2, ROOM_H / 2, 0], rotY: Math.PI / 2, w: ROOM_D },
    { pos: [ROOM_W / 2, ROOM_H / 2, 0], rotY: -Math.PI / 2, w: ROOM_D },
  ];
  wallDefs.forEach((d) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x000000, side: THREE.FrontSide });
    wallMats.push(m);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.w, ROOM_H), m);
    mesh.position.set(...d.pos);
    mesh.rotation.y = d.rotY;
    scene.add(mesh);
  });
  wallMats.push(floorMat);

  // 房间轮廓线框
  const box = new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D);
  const edges = new THREE.EdgesGeometry(box);
  const lm = new THREE.LineBasicMaterial({ color: 0x7a8294 });
  const lines = new THREE.LineSegments(edges, lm);
  lines.position.y = ROOM_H / 2;
  scene.add(lines);
  lineMats.push(lm);
}

function buildItems() {
  ITEMS.forEach((it) => {
    const group = new THREE.Group();
    let geo;
    if (it.shape === "cyl") {
      geo = new THREE.CylinderGeometry(it.size[0], it.size[0], it.size[2], 24);
    } else if (it.shape === "disc") {
      geo = new THREE.CylinderGeometry(1, 1, it.size[1], 32);
    } else {
      geo = new THREE.BoxGeometry(...it.size);
    }
    const mat = new THREE.MeshStandardMaterial({
      color: it.color,
      emissive: it.emissive ? it.color : 0x000000,
      emissiveIntensity: it.emissive ? 1.2 : 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    if (it.shape === "cyl") mesh.rotation.x = Math.PI / 2;
    if (it.shape === "disc") mesh.scale.set(it.size[0], 1, it.size[2]);
    group.add(mesh);

    const label = makeLabel(it.label);
    const topY = it.shape === "disc" ? 0.5 : it.size[1] / 2 + 0.55;
    label.position.set(it.labelOffset ? it.labelOffset[0] : 0, topY + (it.labelOffset ? it.labelOffset[1] : 0), 0);
    group.add(label);

    group.position.set(...it.pos);
    scene.add(group);
    itemObjs[it.id] = { group, mesh, label, def: it, mat };
  });
}

function applyLit() {
  const wallColor = lit ? 0xb9bcc2 : 0x000000;
  wallMats.forEach((m, i) => {
    const isFloor = i === wallMats.length - 1;
    m.color.setHex(lit ? (isFloor ? 0x6a6d75 : wallColor) : 0x000000);
  });
  lineMats.forEach((m) => m.color && m.color.setHex(lit ? 0x8a93a6 : 0x4a5062));
  ambient.intensity = lit ? 0.85 : 0.0;
  roomLight.intensity = lit ? 1.0 : 0.0;
  redGlow.intensity = lit ? 0.0 : 2.2;

  Object.values(itemObjs).forEach((o) => {
    const show = lit || !!o.def.alwaysOn;
    o.group.visible = show && !o.hidden;
    o.label.visible = lit; // 黑暗时倒计时屏也不显示名称
  });
  scene.background = new THREE.Color(lit ? 0x15171c : 0x050506);
}

function resize() {
  if (!renderer || !container) return;
  const w = Math.max(10, container.clientWidth);
  const h = Math.max(10, container.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // 标签按像素高度固定（约 22px），画布大小变化时同步缩放
  const labelH = 22 / (h * 1.3);
  Object.values(itemObjs).forEach((o) => {
    const r = o.label.userData.ratio;
    o.label.scale.set(r * labelH, labelH, 1);
  });
}

function updateCamera(dt) {
  // 按时间做阻尼，帧率高低都表现一致
  const k = 1 - Math.exp(-8 * Math.min(dt, 0.1));
  orbit.target.lerp(orbit.desiredTarget, k);
  orbit.radius += (orbit.desiredRadius - orbit.radius) * k;
  let dTheta = orbit.desiredTheta - orbit.theta;
  dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
  orbit.theta += dTheta * k;
  orbit.phi += (orbit.desiredPhi - orbit.phi) * k;

  const sp = Math.sin(orbit.phi);
  camera.position.set(
    orbit.target.x + orbit.radius * sp * Math.sin(orbit.theta),
    orbit.target.y + orbit.radius * Math.cos(orbit.phi),
    orbit.target.z + orbit.radius * sp * Math.cos(orbit.theta)
  );
  camera.lookAt(orbit.target);
}

let lastT = 0;
function animate(t) {
  requestAnimationFrame(animate);
  const dt = lastT ? (t - lastT) / 1000 : 0.016;
  lastT = t;
  updateCamera(dt);
  renderer.render(scene, camera);
}

function bindControls(canvas) {
  canvas.addEventListener("pointerdown", (e) => {
    orbit.dragging = true;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!orbit.dragging) return;
    const dx = e.clientX - orbit.lastX;
    const dy = e.clientY - orbit.lastY;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    orbit.desiredTheta -= dx * 0.008;
    orbit.desiredPhi = Math.min(Math.PI - 0.05, Math.max(0.05, orbit.desiredPhi - dy * 0.008));
    orbit.theta = orbit.desiredTheta;
    orbit.phi = orbit.desiredPhi;
  });
  const end = () => (orbit.dragging = false);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      orbit.desiredRadius = Math.min(32, Math.max(8, orbit.desiredRadius + e.deltaY * 0.015));
    },
    { passive: false }
  );
  canvas.addEventListener("dblclick", () => setView("overview"));
}

function setView(name) {
  const pose = VIEW_POSES[name] || VIEW_POSES.overview;
  const s = poseToSpherical(pose);
  orbit.desiredTarget.copy(s.target);
  orbit.desiredRadius = s.radius;
  orbit.desiredTheta = s.theta;
  orbit.desiredPhi = s.phi;
}

function setLit(v) {
  lit = !!v;
  if (scene) applyLit();
}

// 物品状态：visible / glow / moveTo
function setItemState(id, state) {
  const o = itemObjs[id];
  if (!o) return;
  if (state.hidden !== undefined) {
    o.hidden = !!state.hidden;
    o.group.visible = (lit || !!o.def.alwaysOn) && !o.hidden;
  }
  if (state.glow !== undefined) {
    o.mat.emissive.setHex(state.glow ? o.def.color : 0x000000);
    o.mat.emissiveIntensity = state.glow ? 0.9 : 0;
  }
  if (state.pos) {
    o.group.position.set(...state.pos);
  }
}

function init(el) {
  container = el;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  ambient = new THREE.AmbientLight(0xffffff, 0);
  roomLight = new THREE.PointLight(0xffffff, 0, 60);
  roomLight.position.set(0, ROOM_H - 0.6, 0);
  redGlow = new THREE.PointLight(0xd13b2b, 2.2, 14);
  redGlow.position.set(0, 5.4, -ROOM_D / 2 + 1.2);
  scene.add(ambient, roomLight, redGlow);

  buildRoom();
  buildItems();
  applyLit();

  const s = poseToSpherical(VIEW_POSES.overview);
  orbit.target.copy(s.target);
  orbit.desiredTarget.copy(s.target);
  orbit.radius = orbit.desiredRadius = s.radius;
  orbit.theta = orbit.desiredTheta = s.theta;
  orbit.phi = orbit.desiredPhi = s.phi;

  bindControls(renderer.domElement);
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(container);
  window.addEventListener("resize", resize);
  animate();
}

window.Room3D = { init, setLit, setView, setItemState, resize };
window.dispatchEvent(new Event("room3d-ready"));
