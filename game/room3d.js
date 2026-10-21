/* ============================================================
   序幕关押室 · 全局房间模型（真实 GLB 模型）
   - 模型：models/room_b7.glb（Blender 制作，已烘焙到游戏坐标）
   - 节点命名：B7_<部件id>_NN，按前缀归组，可整组显隐
   - 黑暗：灭掉所有灯，只留倒计时屏红光；明亮：显示房间与物品
   - 剖切：相机绕到某面墙外侧时自动隐藏该墙及其挂件
   对外接口：window.Room3D.init(container) / setLit / setView / setItemState / resize
   ============================================================ */

import * as THREE from "./lib/three.module.min.js";
import { GLTFLoader } from "./lib/GLTFLoader.js";

// 物品布局来自 layout.js（与右侧 4:3 舞台的热点共用同一份数据）
const LAYOUT = window.ROOM_LAYOUT;
const ROOM_W = LAYOUT.W;
const ROOM_D = LAYOUT.D;
const ROOM_H = LAYOUT.H;

// 模型外框（Blender 导出后实测，单位与游戏坐标一致）
const MODEL = { halfW: 5.79, halfD: 4.89, minZ: -4.89 };

// 各游戏视角对应的镜头位置与注视点
// 房间只有「后墙/左墙/右墙」三面墙、前面敞开（供摄像机从外部观察），
// 因此 left/right 视角的镜头必须放在房间内部、偏向对侧，就近看向目标墙，
// 不能放到对侧墙外穿过整个房间去看（否则中途的书架/桌子等家具会完全挡住镜头）。
const VIEW_POSES = {
  overview: { pos: [14, 10.5, 16], look: [0, 2.4, 0] },
  floor: { pos: [0.01, 16.5, 5.6], look: [0, 0, 0] },
  front: { pos: [0, 4.0, 13], look: [0, 3.6, -MODEL.halfD + 0.3] },
  left: { pos: [3.2, 4.0, 2.4], look: [-MODEL.halfW + 0.3, 3.0, -1.4] },
  right: { pos: [-2.6, 4.0, 2.6], look: [MODEL.halfW - 0.3, 3.2, -0.6] },
};

const ITEMS = LAYOUT.items;

// 贴在墙上的部件：相机绕到墙外侧时，连同挂件一起隐藏（剖切）
const WALL_GROUPS = [
  { wall: "backwall", members: ["backwall", "countdown", "clock", "painting"], test: (p) => p.z < MODEL.minZ + 0.3 },
  { wall: "leftwall", members: ["leftwall", "switch", "fusebox"], test: (p) => p.x < -MODEL.halfW + 0.3 },
  { wall: "rightwall", members: ["rightwall", "door", "panel"], test: (p) => p.x > MODEL.halfW - 0.3 },
];

// 灯灭时需要熄灭的自发光部件（吸顶灯）
const LAMP_GROUPS = ["lightl", "lightr"];

let renderer, scene, camera, container;
let ambient, hemi, keyLight, roomLight, redGlow;
let modelRoot = null;
let modelLoaded = false;
const itemObjs = {}; // id -> { group, meshes, mats, label, def, basePos }
const pendingStates = {}; // 模型加载前的状态缓存
let lit = false;
let currentViewName = "overview";

// 轨道控制（自写，避免引入额外模块）
const orbit = {
  target: new THREE.Vector3(),
  desiredTarget: new THREE.Vector3(),
  radius: 22,
  desiredRadius: 22,
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
  sp.userData.ratio = w / 72;
  sp.scale.set((w / 72) * 0.04, 0.04, 1);
  sp.renderOrder = 10;
  return sp;
}

// ---------------- 真实模型加载 ----------------

function groupIdOf(name) {
  // B7_<id>_NN  ->  <id>
  const m = /^B7_([a-z]+)_\d+$/.exec(name);
  return m ? m[1] : null;
}

function registerItem(id, mesh, def) {
  let o = itemObjs[id];
  if (!o) {
    o = itemObjs[id] = {
      group: new THREE.Group(),
      meshes: [],
      mats: [],
      def,
      basePos: new THREE.Vector3(),
      hidden: false,
    };
    scene.add(o.group);
  }
  // 材质按网格克隆，避免 glow 影响同材质的其他物体
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const cloned = mats.map((m) => {
    const c = m.clone();
    c.userData.baseEmissive = c.emissive ? c.emissive.clone() : null;
    c.userData.baseEmissiveIntensity = c.emissiveIntensity !== undefined ? c.emissiveIntensity : 1;
    return c;
  });
  mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];

  // 保留世界变换，改挂到物品组下
  mesh.matrixAutoUpdate = true;
  const wp = new THREE.Vector3();
  const wq = new THREE.Quaternion();
  const ws = new THREE.Vector3();
  mesh.matrixWorld.decompose(wp, wq, ws);
  mesh.parent && mesh.parent.remove(mesh);
  o.group.add(mesh);
  mesh.position.copy(wp);
  mesh.quaternion.copy(wq);
  mesh.scale.copy(ws);

  o.meshes.push(mesh);
  o.mats.push(...cloned);
}

function buildLabels() {
  // 只给布局数据里登记的「可交互物品」做标签；房间结构件（墙/地/灯/角色等）不挂标签
  Object.entries(itemObjs).forEach(([id, o]) => {
    const box = new THREE.Box3();
    o.meshes.forEach((m) => box.expandByObject(m));
    const center = box.getCenter(new THREE.Vector3());
    o.basePos.copy(center);

    const def = LAYOUT.byId[id];
    if (!def) return; // 非交互物品（ground/backwall/leftwall/rightwall/lightl/lightr/character）不生成标签
    const label = makeLabel(def.label);
    const top = box.max.y;
    label.position.set(center.x, top + 0.55, center.z);
    scene.add(label);
    o.label = label;
  });
}

function loadModel() {
  const loader = new GLTFLoader();
  loader.load(
    "./models/room_b7.glb",
    (gltf) => {
      modelRoot = gltf.scene;
      const meshes = [];
      modelRoot.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = false;
          n.receiveShadow = false;
          if (n.geometry) n.geometry.computeBoundingSphere();
          meshes.push(n);
        }
      });

      // 先按前缀归组
      meshes.forEach((m) => {
        const id = groupIdOf(m.name);
        const def = LAYOUT.byId[id] || { label: id, color: 0xffffff };
        if (id) registerItem(id, m, def);
        else scene.add(m);
      });

      buildLabels();
      hideMissingGroups();
      modelLoaded = true;

      // 应用加载前缓存的状态与视角
      if (pendingStates.lit !== undefined) lit = pendingStates.lit;
      Object.entries(pendingStates.items || {}).forEach(([id, st]) => setItemState(id, st));
      applyLit();
      setView(currentViewName);

      window.__room3dReady = true;
      window.dispatchEvent(new Event("room3d-init"));
    },
    undefined,
    (err) => {
      console.warn("room_b7.glb 加载失败，回退到灰盒模型：", err);
      buildFallback();
      modelLoaded = true;
      applyLit();
      setView(currentViewName);
      window.__room3dReady = true;
      window.dispatchEvent(new Event("room3d-init"));
    }
  );
}

// 模型里没有对应网格的布局项（如 future 扩展）从场景移除
function hideMissingGroups() {
  ITEMS.forEach((it) => {
    if (!itemObjs[it.id]) return;
  });
}

// ---------------- 灰盒回退（GLB 不可用时） ----------------

function buildFallback() {
  ITEMS.forEach((it) => {
    const geo =
      it.shape === "cyl"
        ? new THREE.CylinderGeometry(it.size[0], it.size[0], it.size[2], 24)
        : it.shape === "disc"
        ? new THREE.CylinderGeometry(1, 1, it.size[1], 32)
        : new THREE.BoxGeometry(...it.size);
    const mat = new THREE.MeshStandardMaterial({ color: it.color });
    const mesh = new THREE.Mesh(geo, mat);
    if (it.shape === "cyl") mesh.rotation.x = Math.PI / 2;
    if (it.shape === "disc") mesh.scale.set(it.size[0], 1, it.size[2]);
    mesh.position.set(...it.pos);
    registerItem(it.id, mesh, it);

    const label = makeLabel(it.label);
    const topY = it.shape === "disc" ? 0.5 : it.size[1] / 2 + 0.55;
    label.position.set(
      it.pos[0] + (it.labelOffset ? it.labelOffset[0] : 0),
      it.pos[1] + topY + (it.labelOffset ? it.labelOffset[1] : 0),
      it.pos[2]
    );
    scene.add(label);
    itemObjs[it.id].label = label;
  });
}

// ---------------- 灯光与明暗 ----------------

function buildLights() {
  ambient = new THREE.AmbientLight(0xffffff, 0);
  hemi = new THREE.HemisphereLight(0xdfe8ff, 0x30343c, 0);
  keyLight = new THREE.DirectionalLight(0xffffff, 0);
  keyLight.position.set(6, 14, 10);

  roomLight = new THREE.PointLight(0xfff3e0, 0, 40, 2);
  roomLight.position.set(0, ROOM_H - 0.7, 0);

  redGlow = new THREE.PointLight(0xd13b2b, 0, 18, 2);
  redGlow.position.set(0, 5.6, -ROOM_D / 2 + 0.6);

  scene.add(ambient, hemi, keyLight, roomLight, redGlow);
}

function applyLit() {
  const on = lit;
  ambient.intensity = on ? 0.85 : 0.02;
  hemi.intensity = on ? 0.7 : 0.0;
  keyLight.intensity = on ? 1.15 : 0.05;
  roomLight.intensity = on ? 1.6 : 0;
  redGlow.intensity = on ? 0 : 2.4;

  // 吸顶灯的自发光随开关变化
  LAMP_GROUPS.forEach((id) => {
    const o = itemObjs[id];
    if (!o) return;
    o.mats.forEach((m) => {
      if (!m.emissive) return;
      m.emissiveIntensity = on ? 1.0 : 0.0;
    });
  });

  Object.values(itemObjs).forEach((o) => {
    if (!o.group) return;
    o.group.visible = on && !o.hidden;
    if (o.label) o.label.visible = on;
  });
  // 黑暗时倒计时屏仍然可见（红光）
  const cd = itemObjs["countdown"];
  if (cd) {
    cd.group.visible = !cd.hidden;
    if (cd.label) cd.label.visible = false;
  }
  // 配电盒与开关在黑暗中也保留，供玩家操作
  ["fusebox", "switch"].forEach((id) => {
    const o = itemObjs[id];
    if (o) o.group.visible = !o.hidden;
  });

  scene.background = new THREE.Color(on ? 0x15171c : 0x050506);
}

// ---------------- 剖切 ----------------

function updateCutaway() {
  if (!modelLoaded) return;
  const p = camera.position;
  WALL_GROUPS.forEach((g) => {
    const shouldHide = g.test(p);
    g.members.forEach((id) => {
      const o = itemObjs[id];
      if (!o) return;
      o.cut = shouldHide;
      o.group.visible = !shouldHide && (lit || id === "countdown" || id === "fusebox" || id === "switch") && !o.hidden;
    });
    // 黑暗时倒计时/开关/配电盒仍显示
    if (shouldHide) {
      g.members.forEach((id) => {
        const o = itemObjs[id];
        if (o) o.group.visible = false;
      });
    }
  });
}

// ---------------- 相机 ----------------

function resize() {
  if (!renderer || !container) return;
  const w = Math.max(10, container.clientWidth);
  const h = Math.max(10, container.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const labelH = 22 / (h * 1.3);
  Object.values(itemObjs).forEach((o) => {
    if (!o.label) return;
    const r = o.label.userData.ratio;
    o.label.scale.set(r * labelH, labelH, 1);
  });
}

function updateCamera(dt) {
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
  updateCutaway();
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
      orbit.desiredRadius = Math.min(34, Math.max(9, orbit.desiredRadius + e.deltaY * 0.015));
    },
    { passive: false }
  );
  canvas.addEventListener("dblclick", () => setView("overview"));
}

function setView(name) {
  currentViewName = name;
  const pose = VIEW_POSES[name] || VIEW_POSES.overview;
  const s = poseToSpherical(pose);
  orbit.desiredTarget.copy(s.target);
  orbit.desiredRadius = s.radius;
  orbit.desiredTheta = s.theta;
  orbit.desiredPhi = s.phi;
}

function setLit(v) {
  lit = !!v;
  pendingStates.lit = lit;
  if (scene) applyLit();
}

// 物品状态：hidden / glow / pos
function setItemState(id, state) {
  const o = itemObjs[id];
  if (!o) {
    pendingStates.items = pendingStates.items || {};
    pendingStates.items[id] = Object.assign(pendingStates.items[id] || {}, state);
    return;
  }
  if (state.hidden !== undefined) {
    o.hidden = !!state.hidden;
    o.group.visible = !o.hidden && (lit || id === "countdown" || id === "fusebox" || id === "switch") && !o.cut;
  }
  if (state.glow !== undefined) {
    const color = (o.def && o.def.color) || 0xffffff;
    o.mats.forEach((m) => {
      if (!m.emissive) return;
      if (state.glow) {
        m.emissive.setHex(color);
        m.emissiveIntensity = 1.1;
      } else if (m.userData.baseEmissive) {
        m.emissive.copy(m.userData.baseEmissive);
        m.emissiveIntensity = m.userData.baseEmissiveIntensity;
      } else {
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
      }
    });
  }
  if (state.pos && o.def && o.def.pos) {
    const dx = state.pos[0] - o.def.pos[0];
    const dy = state.pos[1] - o.def.pos[1];
    const dz = state.pos[2] - o.def.pos[2];
    o.group.position.set(dx, dy, dz);
    if (o.label) o.label.position.x = o.basePos.x + dx;
  }
}

function init(el) {
  container = el;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050506);
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

  buildLights();
  loadModel();

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
