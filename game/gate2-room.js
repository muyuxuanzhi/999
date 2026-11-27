(() => {
  const CHANNEL = 'g999-gate2-v1';
  const stage = document.getElementById('node-stage');
  const screen = document.getElementById('screen-node');
  const targetOrigin = location.origin === 'null' ? '*' : location.origin;
  const validViews = ['gate', 'west', 'north', 'east'];
  let frame = null;
  let status = null;
  let ready = false;
  let failed = false;
  let enabled = false;
  let view = 'gate';
  let interactive = false;
  let settled = false;
  let watchdog = null;
  let positions = {};

  function send(immediate = false) {
    if (!frame || !ready) return;
    frame.contentWindow.postMessage({ channel: CHANNEL, type: 'state', view, immediate,
      active: enabled && screen.classList.contains('active') && !document.hidden && !failed }, targetOrigin);
  }

  function restoreMarkers() {
    stage.querySelectorAll('[data-gate2-anchor]').forEach(el => {
      const original = JSON.parse(el.dataset.gate2Original);
      el.style.cssText = original.style;
      el.classList.remove('gate2-marker');
      el.removeAttribute('data-positioned');
      el.removeAttribute('aria-hidden');
      el.tabIndex = interactive ? 0 : -1;
    });
  }

  function fail() {
    if (failed) return;
    failed = true;
    clearTimeout(watchdog);
    if (enabled) stage.dataset.gate2 = 'fallback';
    if (frame) frame.hidden = true;
    if (status) { status.textContent = '3D 场景暂不可用，已切回调查视图。'; status.hidden = !enabled; }
    restoreMarkers();
    send();
  }

  function ensureFrame() {
    if (frame) return;
    status = document.createElement('div');
    status.className = 'gate2-status';
    status.setAttribute('role', 'status');
    status.textContent = '正在载入机房…';
    frame = document.createElement('iframe');
    frame.id = 'gate2-model';
    frame.title = '闸2机房三维调查场景';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.src = 'models/gate2-diorama/index.html?embedded=1&v=20261127-gate2-1';
    frame.addEventListener('error', fail);
    stage.prepend(frame);
    stage.append(status);
    watchdog = setTimeout(() => { if (!ready) fail(); }, 30000);
  }

  function updateMarkers() {
    if (!enabled || failed) return;
    stage.querySelectorAll('[data-gate2-anchor]').forEach(el => {
      el.classList.add('gate2-marker');
      const point = positions[el.dataset.gate2Anchor];
      const visible = ready && settled && point?.visible && Number.isFinite(point.x) && Number.isFinite(point.y);
      el.dataset.positioned = visible ? 'true' : 'false';
      el.setAttribute('aria-hidden', visible ? 'false' : 'true');
      el.tabIndex = visible && interactive ? 0 : -1;
      if (visible) {
        el.style.left = point.x + '%';
        el.style.top = point.y + '%';
      }
    });
  }

  function setRoom(id, initialView = 'gate') {
    enabled = id === 'e_server';
    if (!enabled) {
      delete stage.dataset.gate2;
      if (frame) frame.hidden = true;
      if (status) status.hidden = true;
      send();
      return;
    }
    view = validViews.includes(initialView) ? initialView : 'gate';
    positions = {};
    settled = false;
    ensureFrame();
    stage.dataset.gate2 = failed ? 'fallback' : ready ? 'ready' : 'loading';
    frame.hidden = failed;
    status.hidden = ready && !failed;
    send(true);
  }

  function setView(next) {
    if (!enabled || !validViews.includes(next)) return;
    if (view !== next) { positions = {}; settled = false; }
    view = next;
    updateMarkers();
    send();
  }

  function bind(el, anchor) {
    if (!enabled) return;
    el.dataset.gate2Anchor = anchor;
    el.dataset.gate2Original = JSON.stringify({ style: el.style.cssText });
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', el.textContent);
    el.addEventListener('keydown', event => {
      if (interactive && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        el.click();
      }
    });
    if (failed) { el.tabIndex = interactive ? 0 : -1; return; }
    el.classList.add('gate2-marker');
    el.dataset.positioned = 'false';
    el.tabIndex = -1;
  }

  function setInteractive(on) {
    interactive = on;
    if (!enabled) return;
    stage.dataset.gate2Interactive = String(on);
    if (failed) restoreMarkers();
    else updateMarkers();
  }

  window.addEventListener('message', event => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin) return;
    const message = event.data;
    if (!message || message.channel !== CHANNEL) return;
    if (message.type === 'error') { fail(); return; }
    if (failed) return;
    if (message.type === 'ready') {
      ready = true;
      clearTimeout(watchdog);
      if (enabled) stage.dataset.gate2 = 'ready';
      status.hidden = true;
      send(true);
    } else if (message.type === 'anchors' && message.view === view) {
      positions = message.positions || {};
      settled = message.settled === true;
      updateMarkers();
    } else if (message.type === 'moving' && message.view === view) {
      settled = false;
      updateMarkers();
    }
  });
  new MutationObserver(() => send()).observe(screen, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => send());
  window.Gate2Room = { setRoom, setView, bind, setInteractive };
})();
