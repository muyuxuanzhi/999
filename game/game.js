/* ============================================================
   怪谈笔记 999 · 序幕新手关（占位版试玩）
   纯前端文字冒险 / 点击解谜原型

   设计要点
   - 反复探索：物品随持有线索变化反应，线索需多次点击才浮现
   - 线索揭示：纸条拿到手时不显示数字，点击道具才揭示
   - 解谜门禁：时钟解谜需「开灯 + 时钟已调查 + 纸条1 + 纸条2 + 全部物品已调查」
   - 隐藏提示：门与面板不直接指向时钟，由玩家自行发现
   ============================================================ */

(function () {
  "use strict";

  // ---------------- DOM ----------------
  const screens = {
    title: document.getElementById("screen-title"),
    game: document.getElementById("screen-game"),
    clock: document.getElementById("screen-clock"),
    doors: document.getElementById("screen-doors"),
    end: document.getElementById("screen-end"),
    portrait: document.getElementById("screen-portrait"),
    sysmenu: document.getElementById("screen-sysmenu"),
    saves: document.getElementById("screen-saves"),
    flowchart: document.getElementById("screen-flowchart"),
    node: document.getElementById("screen-node"),
  };
  const stageEl = document.getElementById("stage");
  const stageLabelEl = document.getElementById("stage-label");
  const hotspotsEl = document.getElementById("hotspots");
  const inventoryEl = document.getElementById("inventory");
  const dlgBox = document.getElementById("dialogue-box");
  const dlgSpeaker = document.getElementById("dlg-speaker");
  const dlgText = document.getElementById("dlg-text");
  const dlgNext = document.getElementById("dlg-next");
  const countdownTimeEl = document.getElementById("countdown-time");

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
    if (name === "title") refreshMainMenuButtons();
    if (name === "game") fitHotspots();
  }

  // 热点按 800×600 设计坐标布局，随 4:3 舞台实际宽度等比缩放
  function fitHotspots() {
    const w = stageEl.clientWidth;
    if (!w) return;
    hotspotsEl.style.transform = "scale(" + w / 800 + ")";
  }
  if (window.ResizeObserver) new ResizeObserver(fitHotspots).observe(stageEl);
  window.addEventListener("resize", fitHotspots);

  // 同步状态到左侧 3D 房间模型（room3d.js 为模块脚本，加载稍晚，所以做存在性判断）
  function syncRoom3D() {
    const R = window.Room3D;
    if (!R || !window.__room3dReady) return;
    R.setLit(flags.batteryInstalled);
    R.setItemState("badge", { hidden: flags.hasBadge });
    R.setItemState("panel", { glow: flags.clockSolved });
    R.setItemState("painting", { pos: window.ROOM_LAYOUT.byId.painting.pos });
    if (syncRoom3D.lastView !== currentView) {
      syncRoom3D.lastView = currentView;
      R.setView(currentView);
    }
    const cap = document.getElementById("room-caption");
    if (cap) {
      cap.textContent =
        (flags.batteryInstalled ? "明亮" : "黑暗") + " · 当前视角：" + VIEW_NAMES[currentView];
    }
  }
  window.addEventListener("room3d-init", syncRoom3D);

  // ---------------- 游戏状态 ----------------
  const flags = {
    hasBattery: false,
    powerOn: false, // 电池已装入配电盒，线路通电（但开关还没按，灯仍是灭的）
    batteryInstalled: false, // 开关已按下，灯亮
    hasNote1: false,
    hasNote2: false,
    hasBadge: false, // 工牌已拾取（重要道具，预留跨章节继承）
    clockSolved: false, // 时钟已拨对，电子面板已通电，但玩家还没去右墙点击它
    solved: false, // 玩家已点击电子面板，触发了入职系统
    sawFace: false, // 已在水渍中看清自己的脸（一次性剧情）
    canSave: false, // 从看清脸那一刻起，解锁存档/读档/流程图
  };

  const clickCounts = {
    switch: 0, fusebox: 0, desk: 0, clock: 0, badge: 0,
    painting: 0, puddle: 0, countdown: 0, door: 0, panel: 0,
    bookshelf: 0,
    note1: 0, note2: 0, // 纸条被翻开的次数：首次翻开才有一句感想
  };

  // 是否已"仔细看过"该物品（开灯后才计入）
  const investigated = {
    switch: false, fusebox: false, desk: false, clock: false, badge: false,
    painting: false, puddle: false, countdown: false, door: false, panel: false,
    bookshelf: false,
  };

  const REQUIRED = [
    "switch", "fusebox", "desk", "clock", "badge",
    "painting", "puddle", "countdown", "door", "panel", "bookshelf",
  ];

  function markInv(id) {
    if (flags.batteryInstalled) investigated[id] = true;
  }

  function remainingCount() {
    return REQUIRED.filter((id) => !investigated[id]).length;
  }

  function isFullyExplored() {
    return remainingCount() === 0;
  }

  // ---------------- 持久化：全局解锁（跨存档 / 跨周目） ----------------
  const GLOBAL_KEY = "g999_global_v1";
  const SAVES_KEY = "g999_saves_v1";
  const SAVE_SLOT_COUNT = 30;

  function defaultGlobalState() {
    // visited：流程图已到达的节点；locks：已获得的剧情锁钥匙；lastNode：流程图上的当前位置标记
    return { trueRouteUnlocked: false, endingsCleared: [], visited: [], locks: [], lastNode: null };
  }
  function loadGlobalState() {
    const g = defaultGlobalState();
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      if (raw) Object.assign(g, JSON.parse(raw));
    } catch (e) {}
    // 旧版本只记录了结局：补齐流程图的到达记录
    if (g.endingsCleared.length && !g.visited.length) {
      g.visited.push("e_prologue", "n_door");
      if (g.endingsCleared.includes("true")) g.visited.push("n_hidden");
    }
    return g;
  }
  function saveGlobalState() {
    try { localStorage.setItem(GLOBAL_KEY, JSON.stringify(globalState)); } catch (e) {}
  }
  const globalState = loadGlobalState();

  function loadSaveSlots() {
    try {
      const raw = localStorage.getItem(SAVES_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          // 旧版本只有 9 个槽位：补齐到 30 个，保留原有存档
          while (arr.length < SAVE_SLOT_COUNT) arr.push(null);
          return arr.slice(0, SAVE_SLOT_COUNT);
        }
      }
    } catch (e) {}
    return new Array(SAVE_SLOT_COUNT).fill(null);
  }
  function persistSaveSlots() {
    try { localStorage.setItem(SAVES_KEY, JSON.stringify(saveSlots)); } catch (e) {}
  }
  const saveSlots = loadSaveSlots();

  function latestSlotIndex() {
    let best = -1, bestTime = -1;
    saveSlots.forEach((s, i) => {
      if (s && s.savedAt > bestTime) { bestTime = s.savedAt; best = i; }
    });
    return best;
  }

  // ---------------- 存档：进度名 / 用时 / 序列化 ----------------
  let playStartTimestamp = Date.now();
  let accumulatedSeconds = 0; // 从读档中继承的已用时长

  function currentElapsedSeconds() {
    return accumulatedSeconds + Math.floor((Date.now() - playStartTimestamp) / 1000);
  }
  function formatDuration(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
  function computeProgressName() {
    if (flags.solved) return "序幕 · 系统已启动（即将抉择）";
    if (flags.clockSolved) return "序幕 · 时钟已解（待启动系统）";
    if (flags.hasNote1 && flags.hasNote2 && isFullyExplored()) return "序幕 · 线索齐备（待解时钟）";
    if (flags.canSave) return "序幕 · 已看清自己的脸";
    if (flags.batteryInstalled) return "序幕 · 已开灯探索";
    if (flags.powerOn) return "序幕 · 线路已通（待开灯）";
    if (flags.hasBattery) return "序幕 · 摸黑拾物";
    return "序幕 · 摸黑苏醒";
  }

  function buildSaveData() {
    return {
      version: 1,
      savedAt: Date.now(),
      progressName: computeProgressName(),
      elapsedSeconds: currentElapsedSeconds(),
      rescued: [], // 占位：序幕暂无可救 NPC，供后续房间继承同一存档结构
      state: {
        flags: Object.assign({}, flags),
        clickCounts: Object.assign({}, clickCounts),
        investigated: Object.assign({}, investigated),
        clockFails, clockHour, clockMin, currentView,
        countdownSeconds,
      },
    };
  }

  function applySaveData(data) {
    const st = data.state;
    Object.assign(flags, st.flags);
    Object.assign(clickCounts, st.clickCounts);
    Object.assign(investigated, st.investigated);
    clockFails = st.clockFails;
    clockHour = st.clockHour;
    clockMin = st.clockMin;
    currentView = st.currentView;
    if (typeof st.countdownSeconds === "number") countdownSeconds = st.countdownSeconds;
    accumulatedSeconds = data.elapsedSeconds || 0;
    playStartTimestamp = Date.now();

    showScreen("game");
    buildHotspots();
    updateStageVisual();
    updateInventory();
    updateSaveIconVisibility();
    resumeFreeRoam();
  }

  let clockFails = 0;
  let clockHour = 2, clockMin = 14;

  // ---------------- 场景视角：地面 / 前方墙壁 / 左墙 / 右墙 ----------------
  let currentView = "floor";
  const VIEW_NAMES = {
    floor: "俯瞰房间地面",
    front: "前方墙壁",
    left: "左边墙壁",
    right: "右边墙壁",
  };

  // ---------------- 对话队列引擎 ----------------
  let lineQueue = [];
  let onQueueComplete = null;

  function L_narr(text) { return { type: "narr", text }; }
  function L_say(speaker, emotion, text) { return { type: "say", speaker, emotion, text }; }
  function L_think(speaker, emotion, text) { return { type: "think", speaker, emotion, text }; }

  function setHotspotsEnabled(enabled) {
    hotspotsEl.style.pointerEvents = enabled ? "auto" : "none";
    inventoryEl.style.pointerEvents = enabled ? "auto" : "none";
    const sysBtn = document.getElementById("btn-system");
    if (sysBtn) sysBtn.style.pointerEvents = enabled ? "auto" : "none";
  }

  function updateSaveIconVisibility() {
    const btn = document.getElementById("btn-system");
    if (btn) btn.style.display = flags.canSave ? "inline-flex" : "none";
  }

  function playLines(lines, onDone) {
    lineQueue = lines.slice();
    onQueueComplete = onDone || null;
    setHotspotsEnabled(false);
    dlgNext.style.display = "none";
    renderNext();
  }

  function renderNext() {
    if (lineQueue.length === 0) {
      dlgNext.style.display = "none";
      const cb = onQueueComplete;
      onQueueComplete = null;
      if (cb) cb();
      return;
    }
    const line = lineQueue.shift();
    dlgText.className = "";
    if (line.type === "narr") {
      dlgSpeaker.textContent = "";
      dlgText.classList.add("narration");
      dlgText.textContent = line.text;
    } else if (line.type === "say") {
      dlgSpeaker.textContent = line.emotion ? `${line.speaker}  【${line.emotion}】` : line.speaker;
      dlgText.textContent = line.text;
    } else if (line.type === "think") {
      dlgSpeaker.textContent = line.emotion ? `${line.speaker}  【${line.emotion}】` : line.speaker;
      dlgText.classList.add("thought");
      dlgText.textContent = `（${line.text}）`;
    }
    dlgNext.style.display = "block";
  }

  dlgBox.addEventListener("click", () => {
    renderNext();
  });

  function resumeFreeRoam() {
    setHotspotsEnabled(true);
    dlgSpeaker.textContent = "";
    dlgText.className = "narration";
    dlgText.textContent = "（点击场景中的物品，或点击下方道具查看细节……）";
    dlgNext.style.display = "none";
  }

  // ---------------- 场景背景 / 氛围 ----------------
  // 每个视角一个 stage-view-xx 类，明亮版可挂对应背景图（CSS 里控制）
  function updateStageVisual() {
    const lit = flags.batteryInstalled;

    if (lit) {
      stageEl.classList.remove("stage-dark");
      stageEl.classList.add("stage-lit");
      stageLabelEl.textContent = "明亮 · " + VIEW_NAMES[currentView];
    } else {
      stageEl.classList.remove("stage-lit");
      stageEl.classList.add("stage-dark");
      stageLabelEl.textContent = "黑暗 · " + VIEW_NAMES[currentView];
    }

    // 同步视角类，供背景图/氛围 CSS 使用
    Object.keys(VIEW_NAMES).forEach((v) => {
      stageEl.classList.toggle("stage-view-" + v, currentView === v);
    });

    // 画 / 水渍 / 面板 只有开灯后才可见
    ["painting", "puddle", "panel"].forEach((id) => {
      const el = document.getElementById("hs-" + id);
      if (!el) return;
      el.classList.toggle("hidden-item", !lit);
    });

    // 引导高亮：只保留「时钟拨对 → 电子面板」，配电盒与灯开关不再提示
    const panelEl = document.getElementById("hs-panel");
    if (panelEl) panelEl.classList.toggle("glow", flags.clockSolved && !flags.solved);

    // 灯灭时，只调暗"需要照明才看得清"的物品，不调暗配电盒与灯开关本身
    ["desk", "clock", "badge", "door", "countdown", "bookshelf"].forEach((id) => {
      const el = document.getElementById("hs-" + id);
      if (el) el.classList.toggle("dim", !lit);
    });

    // 视角箭头引导：仅时钟拨对后提醒去右边墙壁看面板
    document.querySelectorAll(".nav-arrow").forEach((el) => {
      const guideRight = flags.clockSolved && !flags.solved && el.dataset.to === "right";
      el.classList.toggle("nav-guide", guideRight);
    });

    syncRoom3D();
  }

  // ---------------- 物品栏 ----------------
  const ITEMS = {
    battery: { name: "电池", color: "#FFD700" },
    note1: { name: "纸条①", color: "#F0F0F0" },
    note2: { name: "纸条②", color: "#F0F0F0" },
    badge: { name: "工牌 B7-0313", color: "#C9A227" },
  };

  function updateInventory() {
    inventoryEl.innerHTML = "";
    const owned = [];
    if (flags.hasBattery) owned.push("battery");
    if (flags.hasNote1) owned.push("note1");
    if (flags.hasNote2) owned.push("note2");
    if (flags.hasBadge) owned.push("badge");

    if (owned.length === 0) {
      const d = document.createElement("div");
      d.className = "inv-empty";
      d.textContent = "（物品栏为空）";
      inventoryEl.appendChild(d);
      return;
    }
    owned.forEach((id) => {
      const it = ITEMS[id];
      const d = document.createElement("div");
      d.className = "inv-item";
      d.style.background = it.color;
      d.textContent = it.name;
      d.title = "点击查看";
      d.addEventListener("click", () => viewItem(id));
      inventoryEl.appendChild(d);
    });
  }

  // ---------------- 查看道具 ----------------
  function viewItem(id) {
    if (id === "battery") {
      playLines(
        [
          L_narr("[一块大型电池。外壳上印着模糊的型号，像是从某个旧机器上拆下来的。]"),
          L_think("橘鏡", null, "电池，不知道安装在哪里，总之先揣着吧。"),
        ],
        resumeFreeRoam
      );
      return;
    }

    // 纸条只如实呈现纸上的内容：不替玩家倒置、不替玩家比对、不点破两张纸的关系
    if (id === "note1" || id === "note2") {
      if (!flags.batteryInstalled) {
        playLines(
          [
            L_narr("~橘鏡把纸举到眼前，太黑了，只能摸到有笔写过的字迹。"),
            L_think("橘鏡", null, "太黑了，什么都看不清啊，可能是什么线索。"),
          ],
          resumeFreeRoam
        );
        return;
      }
      const n = clickCounts[id]++;
      if (id === "note1") {
        const lines = [L_narr("[纸上用黑色的笔写着：【05：99】]")];
        if (n === 0) lines.push(L_think("橘鏡", null, "这是时间吗？但是没有这个数，真奇怪。"));
        playLines(lines, resumeFreeRoam);
        return;
      }
      // 纸条②：每点一次，纸在手里转半圈（奇数次是原样，偶数次是转过来）。
      if (n % 2 === 0) {
        const lines = [L_narr("[纸上用黑色的笔写着：【12：66】，字迹龙飞凤舞，希望没有辨认错]")];
        if (n === 0) lines.push(L_think("橘鏡", null, "又是一串数字，这个时间也不太正常的感觉。"));
        playLines(lines, resumeFreeRoam);
      } else {
        playLines(
          [
            L_narr("~橘鏡把纸在手里翻来覆去。"),
            L_narr("[我知道了！要稍微转变一下看的方向。]"),
            L_narr("[纸上的字：【99：21】]"),
          ],
          resumeFreeRoam
        );
      }
      return;
    }

    if (id === "badge") {
      playLines(
        [
          cycle(
            [
              L_narr("[一张员工工牌。姓名：橘鏡。职位：夜班心理评估员。编号：B7-0313。]"),
              L_think("橘鏡", null, "橘鏡，夜班心理评估员，B7-0313。……嗯，我的照片还挺帅的。"),
              L_narr("~工牌边缘有点磨损，像是戴了很久。挂绳上还留着一道折痕。"),
              L_think("橘鏡", null, "我还是不太喜欢带工牌，感觉莫名勒脖子。"),
            ],
            "badge"
          ),
        ],
        resumeFreeRoam
      );
      return;
    }
  }

  // ---------------- 工具：数组循环取值 ----------------
  function cycle(arr, id) {
    const i = clickCounts[id] % arr.length;
    clickCounts[id]++;
    return arr[i];
  }

  // ============================================================
  // 各物品点击逻辑
  // ============================================================

  function onSwitch() {
    // ① 还没通电：按了没反应
    if (!flags.powerOn) {
      playLines([L_narr("[咔哒。没有反应，是没有电了吗？]")], resumeFreeRoam);
      return;
    }

    // ② 已通电但还没开灯：这一下，灯亮
    if (!flags.batteryInstalled) {
      playLines(
        [
          L_narr("~橘鏡伸手按下墙上的灯开关。"),
          L_narr("[「咔哒！——」]"),
          L_narr("[先是一阵细碎的电流杂音，接着灯管「嗡——」地亮了起来。雪白的日光灯照亮了整个房间。]"),
          L_narr("~橘鏡抬手捂住眼睛，缓了好几秒慢慢睁开。"),
          L_say("橘鏡", "闭眼 刺眼", "我的天！——我的眼睛。"),
          L_narr("[这个房间比想象的大得多，天花板高得看不清，桌子孤零零地摆在房间中间。]"),
          L_think("橘鏡", "惊 微张嘴", "好家伙，这到底是个什么地方啊。"),
        ],
        () => {
          flags.batteryInstalled = true;
          updateStageVisual();
          updateInventory();
          resumeFreeRoam();
        }
      );
      return;
    }

    // ③ 灯已经亮了：循环确认台词
    markInv("switch");
    playLines(
      [L_narr("~橘鏡又按了按灯开关，开关「咔哒」响了一声。哎，这里太黑了，灯就不要关上了，橘鏡重新把灯打开。")],
      resumeFreeRoam
    );
  }

  function onFusebox() {
    // ② 已通电（灯可能亮着，也可能还灭着）——只做确认
    if (flags.powerOn) {
      markInv("fusebox");
      playLines([L_narr("[盒里的小灯亮着，应该是成功接通的状态。]")], resumeFreeRoam);
      return;
    }

    // ① 还没装电池
    if (!flags.hasBattery) {
      playLines([L_narr("[打开盒子，在盒盖内侧有个空着的电池槽。]")], resumeFreeRoam);
      return;
    }

    // ③ 持有电池 → 装电池（通电，但灯还没开）
    playLines(
      [
        L_narr("~橘鏡蹲在配电盒前，把电池对准卡槽推进去。"),
        L_narr("[「咔！——」的一声，电池卡进了槽里，不知哪里传来了提示的声音。]"),
        L_narr("[盒里一盏小灯闪了一下，应该是打开了。]"),
      ],
      () => {
        flags.powerOn = true;
        flags.hasBattery = false;
        updateStageVisual();
        updateInventory();
        resumeFreeRoam();
      }
    );
  }

  function onDesk() {
    if (clickCounts.desk === 0) {
      clickCounts.desk++;
      playLines(
        [
          L_narr("~橘鏡摸索到房间中央的桌子，拉开抽屉。"),
          L_narr("[抽屉里躺着一块电池，还有一张折起来的白纸。]"),
          L_think("橘鏡", null, "电池，那么大一块？是从什么地方拆下来的吗？看看有没有地方能安放。"),
          L_think("橘鏡", null, "然后……还有张纸。太黑了看不清字，先收着吧。"),
        ],
        () => {
          flags.hasBattery = true;
          flags.hasNote1 = true;
          updateInventory();
          updateStageVisual();
          resumeFreeRoam();
        }
      );
      return;
    }
    if (!flags.batteryInstalled) {
      playLines(
        [
          L_narr("~抽屉拉开到底，里面什么都没有，去别的地方看看吧。"),
        ],
        resumeFreeRoam
      );
      return;
    }
    markInv("desk");
    playLines(
      [
        cycle(
          [
            L_narr("~抽屉是空的，里面只剩下一层灰。"),
            L_think("橘鏡", null, "一个空的抽屉，里面的东西之前拿走了。"),
          ],
          "desk"
        ),
      ],
      resumeFreeRoam
    );
  }

  function onBadge() {
    if (!flags.batteryInstalled) {
      playLines(
        [L_say("橘鏡", null, "这是张卡片吗？先找一下灯怎么开吧，其他的待会再探索。")],
        resumeFreeRoam
      );
      return;
    }
    // 工牌已经拾取并收进物品栏，桌上这里不会再有新反应
    if (flags.hasBadge) {
      playLines(
        [L_narr("~一张有点旧的桌子，桌上已经没有别的东西了。")],
        resumeFreeRoam
      );
      return;
    }
    markInv("badge");
    playLines(
      [
        L_narr("~橘鏡走到桌边，查看桌上的卡片，将卡片翻了过来。"),
        L_narr("[一张员工工牌。姓名：橘鏡。职位：夜班心理评估员。编号：B7-0313。]"),
        L_say("橘鏡", "恍然", "哎？这是我的工牌吗？夜班心理评估员，B7-0313。"),
        L_think("橘鏡", null, "这个应该是我的吧，上面写着我的名字。"),
      ],
      () => {
        flags.hasBadge = true;
        // 工牌是关键身份道具，预留跨章节继承：先用 localStorage 占位记录，
        // 后续章节加载时可读取该 key 判断玩家是否已拾取过工牌。
        try {
          localStorage.setItem("qbw_badge_b7_0313", "1");
        } catch (e) {}
        updateInventory();
        buildHotspots(); // 拾取后立即重建热点，让地面上的工牌消失
        resumeFreeRoam();
      }
    );
  }

  // ---- 画框：三段式调查（多次点击才浮现线索） ----
  function onPainting() {
    markInv("painting");
    const stage = clickCounts.painting;

    // 渐进式：前三次只给描述，第四次才取下画框
    if (stage === 0) {
      clickCounts.painting++;
      playLines([L_narr("~画框上积着厚厚一层灰，画面有些奇怪。")], resumeFreeRoam);
      return;
    }

    if (stage === 1) {
      clickCounts.painting++;
      playLines([L_narr("~画的是一栋在空中倒置的奇异的房子，很华丽。")], resumeFreeRoam);
      return;
    }

    if (stage === 2) {
      clickCounts.painting++;
      playLines([L_narr("~橘鏡的手顺着画框摸到背面，有一块地方硬硬的，鼓了起来。")], resumeFreeRoam);
      return;
    }

    // 取下画框，拿到纸条
    if (!flags.hasNote2) {
      clickCounts.painting++;
      playLines(
        [
          L_narr("~橘鏡把画框从墙上摘下来，翻到背面。"),
          L_narr("[背板和边框的缝里，塞着一张对折了好几次的白纸。]"),
          L_narr("~橘鏡把纸抽出来揣进口袋，将画重新挂了回去。"),
        ],
        () => {
          flags.hasNote2 = true;
          updateInventory();
          resumeFreeRoam();
        }
      );
      return;
    }

    playLines([L_narr("~画着一栋在空中倒置的奇异的华丽房子。")], resumeFreeRoam);
  }

  function onPuddle() {
    markInv("puddle");

    if (!flags.sawFace) {
      playLines(
        [
          L_narr("~水面很清澈，橘鏡低头看去。"),
          L_narr("[水渍里，倒映出橘镜的脸。]"),
          L_think("橘鏡", "欣赏", "……好久没这么正经地看过自己了，还是一如既往的帅气。"),
          L_narr("[从这一刻起，可以保存与读取进度，也能查看故事的分支流程图。]"),
        ],
        () => {
          flags.sawFace = true;
          flags.canSave = true;
          updateSaveIconVisibility();
          openPortrait();
        }
      );
      return;
    }

    playLines([L_narr("[水面平静地映着天花板。]")], resumeFreeRoam);
  }

  // ---- 倒计时屏：只在点击时给出催促提示 ----
  function onCountdown() {
    if (!flags.batteryInstalled) {
      playLines(
        [
          L_say("橘鏡", "好奇", "诶，那是在倒数吗？"),
          L_think("橘鏡", "紧张", "归零了会怎样呢。……嘶，感觉还是不要等它归零比较好。"),
        ],
        resumeFreeRoam
      );
      return;
    }
    markInv("countdown");
    playLines(
      [
        cycle(
          [
            L_think("橘鏡", "紧张", "数字在往下掉！啊啊啊，我得快点了。"),
            L_narr("~红色的数字一格一格往下跳。看久了感觉心脏好像在蹦跶。"),
            L_think("橘鏡", "紧张", "归零会怎样啊！"),
          ],
          "countdown"
        ),
      ],
      resumeFreeRoam
    );
  }

  // ---- 书架：第一次读到书的内容，之后都是空白书（书的正文替换 BOOK_TEXT 即可） ----
  const BOOK_TEXT = "【空白的书】\n【空白的书】\n【空白的书】\n【空白的书】\n【空白的书】";
  function onBookshelf() {
    if (!flags.batteryInstalled) {
      playLines(
        [L_narr("~橘鏡摸到一排冰凉的木板，上面码着些硬邦邦的长方块，这是书架吗？")],
        resumeFreeRoam
      );
      return;
    }
    markInv("bookshelf");
    const first = clickCounts.bookshelf++ === 0;
    playLines(
      first
        ? [
            L_narr("~墙边立着一座顶到天花板的书架，书脊上的字被灰盖住了大半。"),
            L_narr("~橘鏡抽出一本看着很新的书，翻开查看。"),
            L_narr("[" + BOOK_TEXT + "]"),
          ]
        : [
            L_narr("~橘鏡从架子上抽出一本，翻开。"),
            L_narr("[是空白的，好像只有刚刚那本有内容，这边应该调查完了，去别的地方看看吧]"),
          ],
      resumeFreeRoam
    );
  }

  // ---- 门：不指向时钟 ----
  function onDoor() {
    if (!flags.batteryInstalled) {
      playLines([L_say("橘鏡", null, "是从这个门出去吗？啊——果然锁着。")], resumeFreeRoam);
      return;
    }
    if (flags.solved) {
      playLines([L_narr("~门还是打不开，是其他地方的锁开了吗？")], resumeFreeRoam);
      return;
    }
    markInv("door");
    playLines(
      [
        cycle(
          [
            L_narr("~橘鏡走到门前，握住把手用力推了推。门像和空间黏在一起了一样，纹丝不动。"),
            L_narr("~门缝压得很紧，感觉连一丝光都透不进来。"),
            L_think("橘鏡", null, "推不动啊，再探索看看。"),
          ],
          "door"
        ),
      ],
      resumeFreeRoam
    );
  }

  // ---- 电子面板：不指向时钟 ----
  function onPanel() {
    if (flags.solved) {
      playLines([L_narr("~面板亮着，选择工作间的界面还开着。")], resumeFreeRoam);
      return;
    }
    if (!flags.batteryInstalled) {
      playLines([L_say("橘鏡", null, "这是什么屏幕？现在太黑了，啥也看不见。")], resumeFreeRoam);
      return;
    }
    // 时钟已经拨对，面板已经通电——玩家主动走过来点开它，才真正触发系统启动
    if (flags.clockSolved) {
      markInv("panel");
      playLines(
        [
          L_narr("~橘鏡走到门旁，墙壁上的面板不知道什么时候亮的，屏幕泛着绿色的亮光。"),
          L_narr("[门旁的电子面板「嗡」地亮了起来，光映在橘鏡脸上。]"),
          L_say("橘鏡", "疑惑", "亮了。这是什么？系统面板……"),
        ],
        () => {
          flags.solved = true;
          updateStageVisual();
          playScene7();
        }
      );
      return;
    }
    markInv("panel");
    playLines(
      [
        cycle(
          [
            L_narr("~一块面板嵌在门边的墙上，大小差不多一块砖头那样，屏幕是全黑的，怎么样打开它？"),
            L_narr("~橘鏡敲了敲面板边缘，虽说卡顿的家电拍一拍就能修好，但是没通电的家电这个方法不行啊。"),
            L_think("橘鏡", "观察", "没通电的屏幕，像块板砖。"),
          ],
          "panel"
        ),
      ],
      resumeFreeRoam
    );
  }

  // ---- 时钟：解谜入口（带全调查门禁） ----
  function onClock() {
    if (!flags.batteryInstalled) {
      playLines([L_say("橘鏡", null, "听声音，是时钟吗？太黑了，看不清时间。")], resumeFreeRoam);
      return;
    }
    if (flags.solved) {
      playLines([L_narr("~时钟指针静止在5点21分。")], resumeFreeRoam);
      return;
    }

    const firstTime = !investigated.clock;
    markInv("clock");

    // 第一次调查：只报时间
    if (firstTime) {
      playLines(
        [
          L_narr("~橘鏡仰头看向墙上的圆形时钟。指针在一格一格地走着。"),
          L_narr("[时钟显示着：凌晨 2 点 14 分。]"),
          L_say("橘鏡", "疑惑", "凌晨两点十四……我这是昏了多久啊？"),
        ],
        resumeFreeRoam
      );
      return;
    }

    const notesReady = flags.hasNote1 && flags.hasNote2;
    const explored = isFullyExplored();

    // 条件齐备 → 进入拨针解谜
    if (notesReady && explored) {
      playLines(
        [
          L_narr("[那两张纸条应该和这个时钟有关系。]"),
          L_say("橘鏡", null, "试试吧。"),
        ],
        () => {
          clockHour = 2;
          clockMin = 14;
          clockFails = 0;
          document.getElementById("clock-hint").textContent = "";
          updateClockDisplay();
          showScreen("clock");
        }
      );
      return;
    }

    // 有纸条但没探索完 → 劝阻，让玩家把房间看全
    if (notesReady && !explored) {
      playLines([L_think("橘鏡", null, "再探索看看，这屋子还有地方没转完。")], resumeFreeRoam);
      return;
    }

    // 线索不全
    if (flags.hasNote1 || flags.hasNote2) {
      if (clickCounts.clock === 0) {
        clickCounts.clock++;
        playLines(
          [
            L_narr("~橘鏡拿着纸条，对着时钟看了一会儿。"),
            L_think("橘鏡", "叹息", "这个时间不存在啊，要是是电子钟没准能卡出来。"),
          ],
          resumeFreeRoam
        );
        return;
      }
      playLines(
        [
          cycle(
            [
              L_think("橘鏡", null, "还缺一些线索吧。"),
              L_narr("~橘鏡在时钟前观察了一会，转身走开了。"),
            ],
            "clock"
          ),
        ],
        resumeFreeRoam
      );
      return;
    }

    // 一点线索都没有
    playLines(
      [
        cycle(
          [
            L_think("橘鏡", null, "2点14？这个时钟怎么停下来了？明明刚刚还在走的，难道是什么机关吗？"),
            L_narr("~时钟的指针静止在2点14分"),
          ],
          "clock"
        ),
      ],
      resumeFreeRoam
    );
  }

  // ---------------- 时钟拨针小游戏 ----------------
  function updateClockDisplay() {
    document.getElementById("clock-hour").textContent = String(clockHour).padStart(2, "0");
    document.getElementById("clock-min").textContent = String(clockMin).padStart(2, "0");
    document.getElementById("clock-display").textContent =
      String(clockHour).padStart(2, "0") + ":" + String(clockMin).padStart(2, "0");
  }

  document.querySelectorAll("[data-adj]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-adj");
      const dir = parseInt(btn.getAttribute("data-dir"), 10);
      if (type === "hour") {
        clockHour = (clockHour + dir + 24) % 24;
      } else {
        clockMin = (clockMin + dir + 60) % 60;
      }
      updateClockDisplay();
    });
  });

  document.getElementById("btn-clock-close").addEventListener("click", () => {
    // 关键：进入解谜前 playLines() 已把热点禁用，离开弹窗时必须恢复，
    // 否则回到场景后既不能点物品、也不能查看道具，表现为"游戏卡死"。
    const hintEl = document.getElementById("clock-hint");
    if (hintEl) hintEl.textContent = "";
    clockFails = 0;
    showScreen("game");
    playLines(
      [L_think("橘鏡", null, "让我思考一下。")],
      resumeFreeRoam
    );
  });

  const CLOCK_FAIL_LINES = [
    "「咔。」没反应。",
    "「咔。」没反应。没反应。",
    "「咔。」没反应。没反应。没反应。",
  ];

  document.getElementById("btn-clock-confirm").addEventListener("click", () => {
    const hintEl = document.getElementById("clock-hint");
    if (clockHour === 5 && clockMin === 21) {
      showScreen("game");
      playLines(
        [
          L_narr("[「咔哒。」发出了零件归位的声音，看起来是什么机关解开了。]"),
          L_narr("~右边墙的方向传来一声轻微的电流声。"),
        ],
        () => {
          clockFails = 0;
          flags.clockSolved = true; // 时钟已解开，电子面板通电，但要玩家自己去右墙点击它才会继续
          updateStageVisual();
          resumeFreeRoam();
        }
      );
      return;
    }

    // 隐藏剧情锁：05:20 只有在「已通关过任意一次」之后才会真正生效
    if (clockHour === 5 && clockMin === 20 && globalState.trueRouteUnlocked) {
      showScreen("game");
      playLines(
        [
          L_narr("[「咔哒。」——和上次不太一样的轻响。]"),
          L_think("橘鏡", "怔住", "……这个时间……"),
          L_narr("~门松开了一道缝。"),
          L_say("橘鏡", null, "……"),
        ],
        () => {
          clockFails = 0;
          flags.solved = true;
          updateStageVisual();
          finishEnding("true");
        }
      );
      return;
    }

    clockFails++;
    hintEl.textContent = CLOCK_FAIL_LINES[(clockFails - 1) % CLOCK_FAIL_LINES.length];
    // 阶梯提示：只给方向，不给答案
    if (clockFails === 3) {
      hintEl.textContent += "\n橘鏡：再看看纸条。";
    } else if (clockFails >= 6) {
      hintEl.textContent += "\n橘鏡：66 这个数字有什么含义呢？";
    }
  });

  // ---------------- 场景七：选门 ----------------
  function playScene7() {
    if (window.Flow) window.Flow.visit("n_door");
    showScreen("game");
    playLines(
      [
        L_narr("[屏幕亮起，一段失真的机械音从面板里传来。]"),
        L_say("系统机械音", null, "全员 16 人，入职登记完成。"),
        L_narr("[屏幕亮起，出现奇怪的选项，以及一排排黑色的人形剪影——剪影上面标注的只有工牌号，和开线上会议一样。]"),
        L_say("系统机械音", null, "接下来，请选择你要进入的【工作间】。每个工作间，至少需要 4 人。"),
        L_say("系统机械音", null, "这里是规则说明————————"),
        L_say(
          "系统机械音",
          null,
          "你们十六人，要进入怪谈房间，探索房间出现的诡异现象。嘛~通俗点说，就是敢死队。"
        ),
        L_say(
          "系统机械音",
          null,
          "不过，你们探索出来之后，还要在档案室上传报告。不用太担心，基本上选哪个，最后都会到达档案室的。"
        ),
        L_say(
          "系统机械音",
          null,
          "另外，进入房间需要上交一部分『押金』。这可不是给我的——只是房间里的怪谈索要的。"
        ),
        L_say(
          "系统机械音",
          null,
          "这次的每扇门，都需要两份『押金』哦。顺带一提，自愿上交的人优先登记。"
        ),
        L_say(
          "系统机械音",
          null,
          "不够要是自愿的人数不够嘛——就从要进这扇门的人里，随机抽啦！"
        ),
        L_say(
          "系统机械音",
          null,
          "不过不用担心，押金只是为了防止你们把房间直接炸掉……"
        ),
        L_say("系统机械音", null, "你们肯定有人这样想过，不是吗？"),
        L_narr("~屏幕上，其他人的黑色剪影逐个亮起、又逐个暗下。带着工号标注的电子音，此起彼伏地响起。"),
        L_say("工牌 B7-0107 · 电子音", null, "天呐，我们不会死在这里吧？"),
        L_say("工牌 B7-0204 · 电子音", null, "看不见有点难受了，只能选茶水间了吗……"),
        L_say("工牌 B7-0311 · 电子音", null, "押金……呜呜，我不想交啊！看不见好可怕，怎么办怎么办怎么办——"),
        L_think("橘鏡", "混乱", "我要上交吗？"),
        L_say("系统机械音", null, "当前——茶水间 5 人，机房 5 人，黑暗房 5 人。"),
        L_say("系统机械音", null, "其余 15 人，已完成选择。"),
        L_say("系统机械音", null, "剩下还有一人——截止时间还剩——"),
        L_think("橘鏡",null , "只剩下我了。选一个吧。"),
        L_narr("~橘鏡盯着屏幕上显示的信息。"),
        L_think("橘鏡", null, "上交身体的一部分……"),
        L_narr("~橘鏡甩了甩头。"),
        L_narr("[三扇门并列在屏幕上，门牌上标注着押金收集情况——茶水间（闸·舌）【已集齐】、机房（闸·耳）【已集齐】、黑暗房（闸·眼）【缺一份】。]"),
        L_think("橘鏡", "决意", "我要选……"),
      ],
      () => {
        showScreen("doors");
      }
    );
  }

  document.querySelectorAll(".door-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const door = btn.getAttribute("data-door");
      finishEnding(door);
    });
  });

  // ---------------- 结局结算：标记流程图节点 / 解锁隐藏剧情锁 ----------------
  const ENDING_TEXTS = {
    tea: "橘鏡按下了【茶水间】。\n\n门缓缓滑开，一股冷风从门缝里涌出来。\n\n[画面一黑。序幕结束。]\n\n（闸·舌 —— 下一轮，在茶水间等待着他的，会是什么？）",
    server: "橘鏡按下了【机房】。\n\n门缝里传出细碎的电流声，像是什么东西正在运转。\n\n[画面一黑。序幕结束。]\n\n（闸·耳 —— 下一轮，在机房等待着他的，会是什么？）",
    dark: "橘鏡按下了【黑暗房】。\n\n门后一片比这里更深的黑，吞没了刚刚亮起的灯光。\n\n[画面一黑。序幕结束。]\n\n（闸·眼 —— 下一轮，在黑暗房等待着他的，会是什么？）",
    true: "时钟停在【05：20】，和正确答案只差一分。\n\n可门，却自己开了。\n\n[橘鏡站在门缝前，没有回头。]\n\n（也许……这栋楼本来就没打算真的锁住他。）\n\n[隐藏分支 · 「差一分」]",
  };
  const ENDING_NAMES = {
    tea: "闸 · 舌（茶水间）",
    server: "闸 · 耳（机房）",
    dark: "闸 · 眼（黑暗房）",
    true: "隐藏分支 · 差一分",
  };

  function finishEnding(key) {
    const wasUnlocked = globalState.trueRouteUnlocked;
    if (!globalState.endingsCleared.includes(key)) {
      globalState.endingsCleared.push(key);
    }
    globalState.trueRouteUnlocked = true; // 完成任意一个结局（含 BE）即揭示隐藏剧情锁
    if (window.Flow) {
      window.Flow.visit("n_door");
      if (key === "true") window.Flow.visit("n_hidden");
    }
    saveGlobalState();

    document.getElementById("end-text").textContent = ENDING_TEXTS[key];
    const lockNoticeEl = document.getElementById("end-lock-notice");
    if (lockNoticeEl) {
      lockNoticeEl.style.display = !wasUnlocked ? "block" : "none";
    }
    const flowBtn = document.getElementById("btn-end-flowchart");
    if (flowBtn) flowBtn.style.display = "inline-block";
    showScreen("end");
  }

  // ---------------- 热点定义（按视角分组） ----------------
  // 俯瞰房间地面（默认视角）：配电盒 / 桌子·抽屉 / 工牌 / 水渍
  // 前方墙壁（↑ 从地面进入）：倒计时屏 / 时钟 / 画
  // 左边墙壁（← 从前方墙壁进入）：灯开关
  // 右边墙壁（→ 从前方墙壁进入）：门 / 电子面板
  // 位置与大小不在这里写死：由 layout.js 里的 3D 房间布局投影得到（rect2d），
  // 所以右侧热点与左侧房间模型里的物品始终对得上。
  const HOTSPOT_HANDLERS = {
    fusebox: onFusebox,
    desk: onDesk,
    badge: onBadge,
    puddle: onPuddle,
    countdown: onCountdown,
    clock: onClock,
    painting: onPainting,
    switch: onSwitch,
    bookshelf: onBookshelf,
    door: onDoor,
    panel: onPanel,
  };

  function hotspotStyle(def) {
    const r = window.ROOM_LAYOUT.rect2d(def, def.pos);
    const round = def.shape === "cyl" || def.shape === "disc" ? "border-radius:50%;" : "";
    return "left:" + r.left + "px;top:" + r.top + "px;width:" + r.width + "px;height:" + r.height + "px;" + round;
  }

  const HOTSPOTS = window.ROOM_LAYOUT.items.map((def) => ({
    id: def.id,
    view: def.view,
    label: def.hsLabel || def.label,
    cls: "c-" + def.id,
    def,
    onClick: HOTSPOT_HANDLERS[def.id],
  }));

  // 视角导航箭头：floor --↑--> front --←/→--> left/right，left/right --返回--> front
  const NAV_MAP = {
    floor: [{ dir: "up", label: "前方墙壁", to: "front" }],
    front: [
      { dir: "down", label: "地面", to: "floor" },
      { dir: "left", label: "左边墙壁", to: "left" },
      { dir: "right", label: "右边墙壁", to: "right" },
    ],
    left: [{ dir: "right", label: "前方墙壁", to: "front" }],
    right: [{ dir: "left", label: "前方墙壁", to: "front" }],
  };
  const ARROW_GLYPH = { up: "▲", down: "▼", left: "◀", right: "▶" };
  const ARROW_STYLE = {
    up: "top:44px;left:50%;transform:translateX(-50%);",
    down: "bottom:16px;left:50%;transform:translateX(-50%);",
    left: "top:50%;left:12px;transform:translateY(-50%);",
    right: "top:50%;right:12px;transform:translateY(-50%);",
  };

  function buildNavArrows() {
    const arrows = NAV_MAP[currentView] || [];
    arrows.forEach((a) => {
      const el = document.createElement("div");
      el.className = "nav-arrow nav-" + a.dir;
      el.dataset.to = a.to;
      el.setAttribute("style", ARROW_STYLE[a.dir]);
      el.innerHTML =
        '<span class="nav-glyph">' + ARROW_GLYPH[a.dir] + "</span><span>" + a.label + "</span>";
      el.addEventListener("click", () => switchView(a.to));
      hotspotsEl.appendChild(el);
    });
  }

  function switchView(view) {
    currentView = view;
    buildHotspots();
  }

  function buildHotspots() {
    hotspotsEl.innerHTML = "";
    HOTSPOTS.filter((h) => {
      // 工牌拾取后从场景中消失（不再显示"地上的工牌"热点）
      if (h.id === "badge" && flags.hasBadge) return false;
      return h.view === currentView;
    }).forEach((h) => {
      const el = document.createElement("div");
      el.id = "hs-" + h.id;
      el.className = "hotspot " + h.cls;
      el.setAttribute("style", hotspotStyle(h.def));
      const labelEl = document.createElement("div");
      labelEl.className = "hs-label";
      labelEl.textContent = h.label;
      el.appendChild(labelEl);
      el.addEventListener("click", h.onClick);
      hotspotsEl.appendChild(el);
    });
    buildNavArrows();
    updateStageVisual();
  }

  // ---------------- 倒计时装饰（纯氛围，不影响玩法） ----------------
  let countdownSeconds = 19 * 60 + 37;
  setInterval(() => {
    if (countdownSeconds > 0) countdownSeconds--;
    const m = Math.floor(countdownSeconds / 60);
    const s = countdownSeconds % 60;
    countdownTimeEl.textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }, 1000);

  // ---------------- 开场 ----------------
  function playIntro() {
    showScreen("game");
    playLines(
      [
        L_narr("[一个昏暗伸手不见五指的房间。隐约感觉正前方高处有幽暗的红光，一闪一闪的。]"),
        L_narr("[橘鏡躺在地板上，缓缓睁开眼睛。]"),
        L_say("橘鏡", "揉眼", "嘶……哎？这是哪？我记得我进了电梯，然后……"),
        L_think("橘鏡", null, "好黑啊，这里有灯吗？"),
        L_narr("~橘鏡撑着地坐起来，环顾四周，只看得见那一点红光，忽明忽暗，离得很远。"),
        L_think("橘鏡", "观察", "太黑了看不清，只能抹黑探索一下了，希望别踩到什么不该踩的。"),
        L_narr("~橘鏡扶着墙四处摸索。"),
        L_narr("[指尖碰到冰凉的地面，还有一些家具模糊的轮廓。]"),
        L_think("橘鏡", null, "这个是……桌子，上面还放在什么的。啊啊，只能一样一样摸过去了。"),
        L_narr(
          "【可交互】点击场景中的色块可以调查周围；点击画面边缘的箭头，可以转动视角，看看房间其他角落。"
        ),
      ],
      () => {
        buildHotspots();
        updateStageVisual();
        updateInventory();
        resumeFreeRoam();
      }
    );
  }

  document.getElementById("btn-start").addEventListener("click", () => {
    startNewGame();
  });

  document.getElementById("btn-continue").addEventListener("click", () => {
    const idx = latestSlotIndex();
    if (idx < 0) return;
    applySaveData(saveSlots[idx]);
  });

  document.getElementById("btn-load-menu").addEventListener("click", () => {
    openSaves("load", "title");
  });

  document.getElementById("btn-flowchart-menu").addEventListener("click", () => {
    openFlowchart("title");
  });

  document.getElementById("btn-restart").addEventListener("click", () => {
    location.reload();
  });

  document.getElementById("btn-end-title").addEventListener("click", () => {
    showScreen("title");
  });

  document.getElementById("btn-end-flowchart").addEventListener("click", () => {
    openFlowchart("end");
  });

  // ---------------- 重置：开始新游戏 ----------------
  function resetGameState() {
    Object.assign(flags, {
      hasBattery: false, powerOn: false, batteryInstalled: false,
      hasNote1: false, hasNote2: false, hasBadge: false,
      clockSolved: false, solved: false, sawFace: false, canSave: false,
    });
    Object.keys(clickCounts).forEach((k) => (clickCounts[k] = 0));
    Object.keys(investigated).forEach((k) => (investigated[k] = false));
    clockFails = 0; clockHour = 2; clockMin = 14; currentView = "floor";
    countdownSeconds = 19 * 60 + 37;
    accumulatedSeconds = 0;
    playStartTimestamp = Date.now();
    updateSaveIconVisibility();
    syncRoom3D();
  }

  // ---------------- 主界面按钮状态 ----------------
  function refreshMainMenuButtons() {
    document.getElementById("btn-continue").disabled = latestSlotIndex() < 0;
    document.getElementById("btn-flowchart-menu").disabled = false;
  }

  // ---------------- 水渍立绘弹窗 ----------------
  function openPortrait() {
    showScreen("portrait");
  }
  document.getElementById("btn-portrait-save").addEventListener("click", () => {
    openSaves("save", "game");
  });
  document.getElementById("btn-portrait-flowchart").addEventListener("click", () => {
    openFlowchart("game");
  });
  document.getElementById("btn-portrait-close").addEventListener("click", () => {
    showScreen("game");
    resumeFreeRoam();
  });

  // ---------------- 总机菜单（游戏内系统入口） ----------------
  document.getElementById("btn-system").addEventListener("click", () => {
    showScreen("sysmenu");
  });
  document.getElementById("btn-sys-save").addEventListener("click", () => {
    openSaves("save", "game");
  });
  document.getElementById("btn-sys-load").addEventListener("click", () => {
    openSaves("load", "game");
  });
  document.getElementById("btn-sys-flowchart").addEventListener("click", () => {
    openFlowchart("game");
  });
  document.getElementById("btn-sys-title").addEventListener("click", () => {
    showScreen("title");
  });
  document.getElementById("btn-sys-close").addEventListener("click", () => {
    showScreen("game");
    resumeFreeRoam();
  });

  // ---------------- 存档 / 读档界面（参考《极限脱出》的 save data 屏） ----------------
  let savesMode = "load"; // "save" | "load"
  let savesBackTarget = "title";
  let svCurrent = 0; // 当前展示的存档序号（0~29）

  function openSaves(mode, backTarget) {
    savesMode = mode;
    savesBackTarget = backTarget;
    svCurrent = latestSlotIndex() >= 0 ? latestSlotIndex() : 0;
    showScreen("saves");
    renderSavesUI();
  }

  function formatSavedAt(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function renderSavesUI() {
    const strip = document.getElementById("sv-strip");
    const count = document.getElementById("sv-count");
    const main = document.getElementById("sv-main");
    const mainText = document.getElementById("sv-main-text");
    const info = document.getElementById("sv-info-body");
    const delBtn = document.getElementById("sv-del");
    const title = document.getElementById("sv-title");

    title.textContent = savesMode === "save" ? "SAVE" : "LOAD";
    count.textContent = String(svCurrent + 1).padStart(2, "0") + "/" + SAVE_SLOT_COUNT;

    // 顶部缩略条（5 个框：前 2 / 当前 / 后 2）
    strip.innerHTML = "";
    [-2, -1, 0, 1, 2].forEach((offset) => {
      const idx = svCurrent + offset;
      const slot = idx >= 0 && idx < SAVE_SLOT_COUNT ? saveSlots[idx] : null;
      const div = document.createElement("div");
      div.className = "sv-strip-cell" + (offset === 0 ? " current" : "") + (slot ? "" : " empty");
      if (idx >= 0 && idx < SAVE_SLOT_COUNT) {
        div.textContent = String(idx + 1).padStart(2, "0");
        if (slot) div.style.background = slot.color || "#4a6fd4";
      }
      strip.appendChild(div);
    });

    const slot = saveSlots[svCurrent];
    if (!slot) {
      main.classList.add("empty");
      mainText.textContent = savesMode === "save" ? "Click to Save" : "(Empty)";
      info.innerHTML = "";
      delBtn.disabled = true;
      delBtn.textContent = "删除此存档";
      return;
    }

    main.classList.remove("empty");
    mainText.textContent = savesMode === "save" ? "Overwrite?" : "Load";
    info.innerHTML =
      '<div class="sv-row"><b>' + slot.progressName + "</b></div>" +
      '<div class="sv-row">已用时间：' + formatDuration(slot.elapsedSeconds) + "</div>" +
      '<div class="sv-row">保存时间：' + formatSavedAt(slot.savedAt) + "</div>";
    delBtn.disabled = false;
    delBtn.textContent = "删除此存档";
  }

  document.getElementById("sv-prev").addEventListener("click", () => {
    svCurrent = (svCurrent - 1 + SAVE_SLOT_COUNT) % SAVE_SLOT_COUNT;
    renderSavesUI();
  });
  document.getElementById("sv-next").addEventListener("click", () => {
    svCurrent = (svCurrent + 1) % SAVE_SLOT_COUNT;
    renderSavesUI();
  });
  document.getElementById("sv-main").addEventListener("click", () => {
    if (savesMode === "save") {
      if (saveSlots[svCurrent] && !window.confirm("槽位 " + (svCurrent + 1) + " 已有存档，覆盖吗？")) return;
      const data = buildSaveData();
      data.color = ["#4a6fd4", "#9d7bd8", "#e8563a", "#4ade80"][svCurrent % 4];
      saveSlots[svCurrent] = data;
      persistSaveSlots();
      renderSavesUI();
    } else {
      const slot = saveSlots[svCurrent];
      if (!slot) return;
      applySaveData(slot);
    }
  });
  document.getElementById("sv-del").addEventListener("click", () => {
    if (!saveSlots[svCurrent]) return;
    if (!window.confirm("确认删除槽位 " + (svCurrent + 1) + " 的存档？")) return;
    saveSlots[svCurrent] = null;
    persistSaveSlots();
    renderSavesUI();
  });
  document.getElementById("btn-saves-back").addEventListener("click", () => {
    showScreen(savesBackTarget);
    if (savesBackTarget === "game") resumeFreeRoam();
  });

  // ---------------- 剧情流程图 ----------------
  // 流程图渲染与占位节点播放器在 flow.js 里
  function openFlowchart(backTarget) {
    window.Flow.open(backTarget);
  }

  // ---------------- 流程图跳转：快进到三门抉择 / 隐藏锁尝试 ----------------
  function fastForwardExploration() {
    flags.hasBattery = true;
    flags.powerOn = true;
    flags.batteryInstalled = true;
    flags.hasNote1 = true;
    flags.hasNote2 = true;
    flags.hasBadge = true;
    flags.sawFace = true;
    flags.canSave = true;
    REQUIRED.forEach((id) => (investigated[id] = true));
    updateSaveIconVisibility();
  }

  function jumpToDoorSelection() {
    fastForwardExploration();
    flags.clockSolved = true;
    flags.solved = false;
    showScreen("game");
    buildHotspots();
    updateStageVisual();
    updateInventory();
    playScene7();
  }

  function jumpToHiddenLockAttempt() {
    fastForwardExploration();
    flags.clockSolved = false;
    flags.solved = false;
    showScreen("game");
    buildHotspots();
    updateStageVisual();
    updateInventory();
    playLines(
      [
        L_narr("[流程图跳转 · 场景回到门旁的时钟前，线索已经齐全。]"),
        L_think("橘鏡", null, "这次……试试那个数字？"),
      ],
      () => {
        clockHour = 2; clockMin = 14; clockFails = 0;
        document.getElementById("clock-hint").textContent = "";
        updateClockDisplay();
        showScreen("clock");
      }
    );
  }

  // ---------------- 对外接口：供 flow.js 调用 ----------------
  function startNewGame() {
    resetGameState();
    if (window.Flow) window.Flow.visit("e_prologue");
    playIntro();
  }
  window.G999 = {
    globalState,
    saveGlobalState,
    showScreen,
    resumeFreeRoam,
    startNewGame,
    jumpToDoorSelection,
    jumpToHiddenLockAttempt,
    openSaves,
  };

  // ---------------- 初始 ----------------
  refreshMainMenuButtons();
  showScreen("title");
})();
