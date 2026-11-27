import * as THREE from 'three';

const CHANNEL = 'g999-gate2-v1';
const POSES = {
  gate: { position: [10, 9, 20], target: [0.15, 1.2, 5.6], half: 4.1, width: 6.4 },
  west: { position: [-0.7, 4.8, 7.9], target: [-5.1, 1.5, 1.8], half: 3.3, width: 3.65 },
  north: { position: [0.2, 4.6, 0.0], target: [0.2, 2.15, -5.7], half: 3.45, width: 4.6 },
  east: { position: [12.2, 5.5, 5.4], target: [6.6, 2.25, -1.6], half: 3.2, width: 3.55 }
};

export function createGameCamera({ camera, controls, root, objects, reducedMotion }) {
  const embedded = window.parent !== window && new URLSearchParams(location.search).has('embedded');
  const targetOrigin = location.origin === 'null' ? '*' : location.origin;
  let active = !embedded;
  let view = 'gate';
  let transition = null;
  let settled = !embedded;
  let currentHalf = POSES.gate.half;
  let currentWidth = POSES.gate.width;
  let lastPosted = 0;
  let positions = {};
  const anchors = {
    gate: {
      terminal: [objects.archive, [0, -0.91, 0.25]],
      door: [objects.exit, [0, 0.55, 0.52]],
      npc_lu_gate: [root, [-4.0, 0.55, 7.1]]
    },
    west: {
      mech1: [objects.seven, [0, -1.13, 0.64]],
      npc_ling_west: [root, [-6.45, 0.55, 3.15]],
      npc_qing_west: [root, [-3.85, 0.55, 1.30]]
    },
    north: {
      mech2: [objects.screen, [0, -1.17, 0.28]],
      mech3: [objects.fan, [0, -1.48, 0.34]],
      npc_shiori_north: [root, [-2.7, 0.52, -4.22]],
      npc_ling_north: [root, [3.40, 0.52, -4.22]]
    },
    east: { mech4: [objects.alarm, [0, 3.08, 0.38]] }
  };

  function post(type, data = {}) {
    if (embedded) window.parent.postMessage({ channel: CHANNEL, type, ...data }, targetOrigin);
  }

  function frustum() {
    const ratio = Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight);
    const half = Math.max(currentHalf, currentWidth / ratio);
    camera.left = -half * ratio;
    camera.right = half * ratio;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
  }

  function setView(id, immediate = false) {
    if (!Object.hasOwn(POSES, id)) return;
    if (id === view && (transition || settled) && !immediate) return;
    view = id;
    const pose = POSES[id];
    const duration = immediate || reducedMotion.matches ? 0 : 0.85;
    transition = {
      elapsed: 0, duration, from: camera.position.clone(), to: new THREE.Vector3(...pose.position),
      targetFrom: controls.target.clone(), targetTo: new THREE.Vector3(...pose.target),
      halfFrom: currentHalf, widthFrom: currentWidth
    };
    settled = false;
    objects.hanging.visible = id !== 'north';
    controls.enabled = false;
    camera.zoom = 1;
    post('moving', { view });
    tick(0);
  }

  function project() {
    root.updateWorldMatrix(true, true);
    camera.updateMatrixWorld(true);
    positions = {};
    for (const [id, [object, offset]] of Object.entries(anchors[view])) {
      const p = object.localToWorld(new THREE.Vector3(...offset)).project(camera);
      positions[id] = { x: (p.x + 1) * 50, y: (1 - p.y) * 50, visible: p.z > -1 && p.z < 1 && Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.94 };
    }
    post('anchors', { view, settled, positions });
  }

  function tick(dt) {
    if (!embedded) return;
    if (transition) {
      transition.elapsed += dt;
      const t = transition.duration ? Math.min(1, transition.elapsed / transition.duration) : 1;
      const eased = t * t * (3 - 2 * t);
      camera.position.lerpVectors(transition.from, transition.to, eased);
      controls.target.lerpVectors(transition.targetFrom, transition.targetTo, eased);
      currentHalf = THREE.MathUtils.lerp(transition.halfFrom, POSES[view].half, eased);
      currentWidth = THREE.MathUtils.lerp(transition.widthFrom, POSES[view].width, eased);
      frustum();
      camera.lookAt(controls.target);
      if (t === 1) { transition = null; settled = true; }
    }
  }

  window.addEventListener('message', event => {
    if (!embedded || event.source !== window.parent || event.origin !== location.origin) return;
    const message = event.data;
    if (!message || message.channel !== CHANNEL || message.type !== 'state') return;
    if (typeof message.active !== 'boolean' || !Object.hasOwn(POSES, message.view)) return;
    active = message.active;
    setView(message.view, message.immediate === true);
    if (active) { frustum(); project(); }
  });
  if (embedded) {
    controls.enabled = false;
    setView('gate', true);
    post('ready');
  }
  return {
    embedded,
    get active() { return active; },
    get view() { return view; },
    get settled() { return settled; },
    get positions() { return positions; },
    tick,
    resize: frustum,
    afterRender() {
      if (embedded && performance.now() - lastPosted > 50) {
        lastPosted = performance.now();
        project();
      }
    }
  };
}
