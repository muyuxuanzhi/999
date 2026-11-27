import * as THREE from 'three';

const CHANNEL = 'g999-gate3-v1';
const POSES = {
  hub: { position: [3.5, 9, 10], target: [0, 1, 0], half: 4.8, width: 5.0 },
  north: { position: [0.4, 6, 0.1], target: [0, 1.4, -7.1], half: 3.6, width: 4.7 },
  west: { position: [-3, 6.5, 7], target: [-7, 1.3, 0], half: 4.0, width: 4.4 },
  east: { position: [11, 6.5, 7.5], target: [7, 1.3, 0], half: 3.9, width: 4.5 },
  south: { position: [2.3, 7.8, 16.0], target: [0, 1.7, 7.0], half: 4.0, width: 5.1 }
};

export function createGameCamera({ camera, controls, root, rooms, anchors, reducedMotion }) {
  const embedded = window.parent !== window && new URLSearchParams(location.search).has('embedded');
  const origin = location.origin === 'null' ? '*' : location.origin;
  let active = !embedded, view = 'hub', settled = !embedded, transition = null;
  let currentHalf = POSES.hub.half, currentWidth = POSES.hub.width, lastPosted = 0;
  let positions = {};
  function post(type, data = {}) {
    if (embedded) parent.postMessage({ channel: CHANNEL, type, ...data }, origin);
  }
  function frustum() {
    const ratio = Math.max(1, innerWidth) / Math.max(1, innerHeight);
    const half = Math.max(currentHalf, currentWidth / ratio);
    camera.left = -half * ratio; camera.right = half * ratio;
    camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  function cutaway() {
    for (const [id, room] of Object.entries(rooms)) {
      room.visible = !embedded || id === view || !!transition;
    }
  }
  function setView(id, immediate = false) {
    if (!Object.hasOwn(POSES, id)) return;
    if (id === view && (transition || settled) && !immediate) return;
    view = id; settled = false;
    const pose = POSES[id];
    transition = {
      elapsed: 0, duration: immediate || reducedMotion.matches ? 0 : 0.92,
      from: camera.position.clone(), to: new THREE.Vector3(...pose.position),
      targetFrom: controls.target.clone(), targetTo: new THREE.Vector3(...pose.target),
      halfFrom: currentHalf, widthFrom: currentWidth
    };
    camera.zoom = 1; controls.enabled = false;
    cutaway(); post('moving', { view }); tick(0);
  }
  function project() {
    root.updateWorldMatrix(true, true); camera.updateMatrixWorld(true);
    positions = {};
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
  if (embedded) { controls.enabled = false; setView('hub', true); post('ready'); }
  return {
    embedded, tick, resize: frustum,
    get active() { return active; }, get view() { return view; },
    get settled() { return settled; }, get positions() { return positions; },
    afterRender() {
      if (embedded && performance.now() - lastPosted > 50) { lastPosted = performance.now(); project(); }
    }
  };
}
