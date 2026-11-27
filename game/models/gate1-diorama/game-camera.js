import * as THREE from 'three';

const CHANNEL = 'g999-gate1-v1';
const POSES = {
  ground: { position: [6.5, 8.5, 17], target: [0, 1.35, 1.6], half: 4.6, width: 7.3 },
  air: { position: [0.3, 5.9, 14.6], target: [0.1, 3.1, -1.7], half: 4.1, width: 6.0 },
  ceiling: { position: [1.0, 12.8, 8.5], target: [0, 6.5, -1.7], half: 3.65, width: 5.7 }
};

export function createGameCamera({ camera, controls, root, layers, anchors, reducedMotion }) {
  const embedded = parent !== window && new URLSearchParams(location.search).has('embedded');
  const origin = location.origin === 'null' ? '*' : location.origin;
  let active = !embedded, view = 'ground', settled = !embedded, transition = null;
  let currentHalf = POSES.ground.half, currentWidth = POSES.ground.width, lastPosted = 0;
  let positions = {};
  function post(type, data = {}) { if (embedded) parent.postMessage({ channel: CHANNEL, type, ...data }, origin); }
  function frustum() {
    const ratio = Math.max(1, innerWidth) / Math.max(1, innerHeight);
    const half = Math.max(currentHalf, currentWidth / ratio);
    camera.left = -half * ratio; camera.right = half * ratio; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  function cutaway() {
    layers.ceiling.visible = !embedded || view === 'ceiling' || !!transition;
    layers.air.visible = !embedded || view !== 'ground' || !!transition;
    layers.structure.visible = !embedded || view !== 'ceiling' || !!transition;
    layers.exit.visible = !embedded || view === 'ground' || !!transition;
  }
  function setView(id, immediate = false) {
    if (!Object.hasOwn(POSES, id) || (id === view && (transition || settled) && !immediate)) return;
    view = id; settled = false;
    const pose = POSES[id];
    transition = { elapsed: 0, duration: immediate || reducedMotion.matches ? 0 : 0.9,
      from: camera.position.clone(), to: new THREE.Vector3(...pose.position),
      targetFrom: controls.target.clone(), targetTo: new THREE.Vector3(...pose.target),
      halfFrom: currentHalf, widthFrom: currentWidth };
    camera.zoom = 1; controls.enabled = false; cutaway(); post('moving', { view }); tick(0);
  }
  function project() {
    root.updateWorldMatrix(true, true); camera.updateMatrixWorld(true); positions = {};
    for (const [id, object] of Object.entries(anchors[view])) {
      const p = object.getWorldPosition(new THREE.Vector3()).project(camera);
      positions[id] = { x: (p.x + 1) * 50, y: (1 - p.y) * 50,
        visible: p.z > -1 && p.z < 1 && Math.abs(p.x) < 0.97 && Math.abs(p.y) < 0.91 };
    }
    post('anchors', { view, settled, positions });
  }
  function tick(dt) {
    if (!embedded || !transition) return;
    transition.elapsed += dt;
    const t = transition.duration ? Math.min(1, transition.elapsed / transition.duration) : 1;
    const eased = t * t * (3 - 2 * t);
    camera.position.lerpVectors(transition.from, transition.to, eased);
    controls.target.lerpVectors(transition.targetFrom, transition.targetTo, eased);
    currentHalf = THREE.MathUtils.lerp(transition.halfFrom, POSES[view].half, eased);
    currentWidth = THREE.MathUtils.lerp(transition.widthFrom, POSES[view].width, eased);
    frustum(); camera.lookAt(controls.target);
    if (t === 1) { transition = null; settled = true; cutaway(); }
  }
  addEventListener('message', event => {
    if (!embedded || event.source !== parent || event.origin !== location.origin) return;
    const msg = event.data;
    if (!msg || msg.channel !== CHANNEL || msg.type !== 'state' || typeof msg.active !== 'boolean' || !Object.hasOwn(POSES, msg.view)) return;
    active = msg.active; setView(msg.view, msg.immediate === true);
    if (active) { frustum(); project(); }
  });
  if (embedded) { controls.enabled = false; setView('ground', true); post('ready'); }
  return { embedded, tick, resize: frustum,
    get active() { return active; }, get view() { return view; },
    get settled() { return settled; }, get positions() { return positions; },
    afterRender() { if (embedded && performance.now() - lastPosted > 50) { lastPosted = performance.now(); project(); } }
  };
}
