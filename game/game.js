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
  }

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
    note2: 0, // 纸条②的查看次数：第一次看倒字，第二次才倒置理解
  };

  // 是否已"仔细看过"该物品（开灯后才计入）
  const investigated = {
    switch: false, fusebox: false, desk: false, clock: false, badge: false,
    painting: false, puddle: false, countdown: false, door: false, panel: false,
  };

  const REQUIRED = [
    "switch", "fusebox", "desk", "clock", "badge",
    "painting", "puddle", "countdown", "door", "panel",
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
  const SAVE_SLOT_COUNT = 9;

  function loadGlobalState() {
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Object.assign({ trueRouteUnlocked: false, endingsCleared: [] }, parsed);
      }
    } catch (e) {}
    return { trueRouteUnlocked: false, endingsCleared: [] };
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
        if (Array.isArray(arr) && arr.length === SAVE_SLOT_COUNT) return arr;
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

    // 教学性高亮：持有电池 → 配电盒；已通电但没开灯 → 灯开关；时钟已拨对 → 电子面板
    const fuseEl = document.getElementById("hs-fusebox");
    if (fuseEl) fuseEl.classList.toggle("glow", flags.hasBattery && !flags.powerOn);
    const switchEl = document.getElementById("hs-switch");
    if (switchEl) switchEl.classList.toggle("glow", flags.powerOn && !lit);
    const panelEl = document.getElementById("hs-panel");
    if (panelEl) panelEl.classList.toggle("glow", flags.clockSolved && !flags.solved);

    // 灯灭时，只调暗"需要照明才看得清"的物品，不调暗配电盒与灯开关本身
    ["desk", "clock", "badge", "door", "countdown"].forEach((id) => {
      const el = document.getElementById("hs-" + id);
      if (el) el.classList.toggle("dim", !lit);
    });

    // 视角箭头上的引导提示：通电后提醒去左边墙壁按开关；时钟拨对后提醒去右边墙壁看面板
    document.querySelectorAll(".nav-arrow").forEach((el) => {
      const guideLeft = flags.powerOn && !lit && el.dataset.to === "left";
      const guideRight = flags.clockSolved && !flags.solved && el.dataset.to === "right";
      el.classList.toggle("nav-guide", guideLeft || guideRight);
    });
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
          L_narr("[一节普通的干电池。外壳上印着模糊的型号，像是从某个旧机器上拆下来的。]"),
          L_think("橘鏡", null, "电池啊。这种地方捡到，八成有用。揣上。"),
        ],
        resumeFreeRoam
      );
      return;
    }

    if (id === "note1") {
      if (!flags.batteryInstalled) {
        playLines(
          [
            L_narr("~橘鏡把纸条举到眼前，可周围太黑了，什么都看不清。"),
            L_think("橘鏡", null, "黑成这样，字都看不清。先弄点亮光再说。"),
          ],
          resumeFreeRoam
        );
        return;
      }
      const lines = [
        L_narr("[一张有点皱的白纸，上面用黑色笔写着【05：99】。]"),
        L_think("橘鏡", null, "【05：99】。啧，这数字留着，肯定用得上。"),
      ];
      if (flags.hasNote2) {
        lines.push(
          L_narr("[另一张纸条上，用倒着的字迹写着【12：66】。]"),
          L_think("橘鏡", "恍然", "……哦，这张是倒着写的。翻个个儿，才是真话。")
        );
      }
      playLines(lines, resumeFreeRoam);
      return;
    }

    if (id === "note2") {
      if (!flags.batteryInstalled) {
        playLines(
          [
            L_narr("~橘鏡把纸条举到眼前，可周围太黑了，什么都看不清。"),
            L_think("橘鏡", null, "黑成这样，字都看不清。先弄点亮光再说。"),
          ],
          resumeFreeRoam
        );
        return;
      }
      // 第一次查看：看到的是倒着写的 12:66，还不明白
      if (clickCounts.note2 === 0) {
        clickCounts.note2++;
        playLines(
          [
            L_narr("[一张对折过好几道的白纸，上面用黑色笔写着一串数字，字迹却是倒着的。]"),
            L_narr("[【12：66】——数字上下颠倒，笔画像反过来写的一样。]"),
            L_think("橘鏡", "疑惑", "诶，这字怎么是倒的？……跟那幅倒挂的画，一个德性嘛。"),
            L_think("橘鏡", null, "摆明了要我倒过来看。行吧，配合一下。"),
          ],
          resumeFreeRoam
        );
        return;
      }
      // 第二次及以后：倒过来看，得到 99:21
      const lines = [
        L_narr("~橘鏡把纸条倒过来，重新看了一遍。"),
        L_narr("[倒过来之后，那串数字变成了【99：21】。]"),
        L_think("橘鏡", "恍然", "倒过来是【99：21】。……又跟第一张一个套路。"),
      ];
      if (flags.hasNote1) {
        lines.push(
          L_think(
            "橘鏡",
            "疑惑",
            "【05：99】、【99：21】——两个「99」，成心不说清楚呢。"
          )
        );
      }
      playLines(lines, resumeFreeRoam);
      return;
    }

    if (id === "badge") {
      playLines(
        [
          cycle(
            [
              L_narr("[一张员工工牌。姓名：橘鏡。职位：夜班心理评估员。编号：B7-0313。]"),
              L_think("橘鏡", null, "橘鏡，夜班心理评估员，B7-0313。……嗯，是我没错。"),
              L_narr("~工牌边缘有点磨损，像是戴了很久。挂绳上还留着一道折痕。"),
              L_think("橘鏡", null, "心理评估员被关进这种房间……说出去，还挺像笑话的。"),
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
      if (!flags.hasBattery) {
        playLines(
          [
            L_say("橘鏡", "疑惑", "诶？没电。"),
            L_narr("~橘鏡又按了按开关，灯还是没有反应。"),
            L_think("橘鏡", "平静", "开关是好的，是这屋压根没电。"),
          ],
          resumeFreeRoam
        );
      } else {
        playLines(
          [
            L_narr("~橘鏡按下开关。灯没有亮。"),
            L_think("橘鏡", "疑惑", "咔哒一声，挺响，光倒是一点没有。"),
            L_think("橘鏡", null, "线路没电。手里这节电池，多半就是喂给它的。"),
          ],
          resumeFreeRoam
        );
      }
      return;
    }

    // ② 已通电但还没开灯：这一下，灯亮
    if (!flags.batteryInstalled) {
      playLines(
        [
          L_narr("~橘鏡伸手按下墙上的灯开关。"),
          L_narr("[「咔哒——」]"),
          L_narr("[灯管先是一阵细碎的电流杂音，接着「嗡」地亮了起来。惨白的日光灯照亮了整个房间。]"),
          L_narr("~突如其来的强光让橘鏡不得不闭眼，抬手挡住眼睛。"),
          L_say("橘鏡", "闭眼 刺眼", "嚯——我的眼睛。"),
          L_narr("[过了几秒，橘鏡慢慢放下手，睁开眼睛。]"),
          L_narr("~橘鏡睁眼，环顾四周，愣住了。"),
          L_narr(
            "[灯光下，房间的全貌显现出来——它太大了，大得不像一间关押室。天花板高得望不到顶，桌椅孤零零地待在远处，人站在这里，渺小得像一件被遗忘的家具。]"
          ),
          L_think("橘鏡", "惊 微张嘴", "这房间大得离谱……天花板都看不到顶。"),
          L_narr("~橘鏡揉了揉眼睛，决定把整个房间都看一遍。")
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
      [
        cycle(
          [
            L_narr("~橘鏡又按了按灯开关。开关「咔哒」响了一声，灯本来就是亮的。"),
            L_think("橘鏡", null, "开关没坏。这屋也就这么点东西了。"),
          ],
          "switch"
        ),
      ],
      resumeFreeRoam
    );
  }

  function onFusebox() {
    // ② 已通电（灯可能亮着，也可能还灭着）——只做确认
    if (flags.powerOn) {
      markInv("fusebox");
      playLines(
        [
          cycle(
            [
              L_think("橘鏡", null, "电池装好了，别的接口都是空的。"),
              L_think("橘鏡", "思索", "线路通了。开关在左边墙上，按下去灯才亮——故意拆成两步，挺会玩。"),
            ],
            "fusebox"
          ),
        ],
        resumeFreeRoam
      );
      return;
    }

    // ① 还没装电池
    if (!flags.hasBattery) {
      playLines(
        [
          L_think("橘鏡", "观察", "配电盒里空着一个电池槽。"),
          L_think("橘鏡", null, "没电就是因为它。去找节电池。"),
        ],
        resumeFreeRoam
      );
      return;
    }

    // ③ 持有电池 → 装电池（通电，但灯还没开）
    playLines(
      [
        L_narr("~橘鏡蹲在配电盒前，把电池对准卡槽，推进去。"),
        L_narr("[「咔」的一声，电池卡进了槽里。]"),
        L_narr("[配电盒内部传来一声轻响，指示灯从暗红跳成了微亮的绿色——线路通了。]"),
        L_think("橘鏡", "观察", "通电了。灯还是灭的。"),
        L_think("橘鏡", null, "还得去按开关。左边墙上，早就看见了。"),
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
          L_narr("~橘鏡转身，摸索到房间中央的桌子，拉开抽屉。"),
          L_narr("[抽屉里躺着一节电池，还有一张折起来的白纸。]"),
          L_think("橘鏡", null, "电池，还有张纸。先收着，回头再看。"),
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
          L_narr("~抽屉里已经没有别的东西了。"),
          L_think("橘鏡", "思索", "配电盒要电池，左边墙要开关。两样都得跑一趟。"),
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
            L_think("橘鏡", null, "就一个抽屉。底板上一圈压痕，像放过什么东西，又拿走了。"),
          ],
          "desk"
        ),
      ],
      resumeFreeRoam
    );
  }

  function onBadge() {
    if (!flags.batteryInstalled) {
      playLines([L_say("橘鏡", null, "摸到张卡片……看不清。")], resumeFreeRoam);
      return;
    }
    // 工牌已经拾取并收进物品栏，桌上这里不会再有新反应
    if (flags.hasBadge) {
      playLines(
        [L_narr("~桌上已经没有别的东西了，工牌刚才已经收起来了。")],
        resumeFreeRoam
      );
      return;
    }
    markInv("badge");
    playLines(
      [
        L_narr("~橘鏡走到桌边，捡起桌上倒扣的工牌，翻了过来。"),
        L_narr("[一张员工工牌。姓名：橘鏡。职位：夜班心理评估员。编号：B7-0313。]"),
        L_say("橘鏡", "恍然", "哦，我的工牌。夜班心理评估员，B7-0313。"),
        L_think("橘鏡", null, "这可是要紧东西，得揣好。"),
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

    // 第一段：只说外表
    if (stage === 0) {
      clickCounts.painting++;
      playLines(
        [
          L_narr("[墙上挂着一幅画。深色木框，画面蒙着一层灰，看不清画的是什么。]"),
          L_narr("[有意思的是——画框，上下颠倒着挂着。]"),
          L_think("橘鏡", "疑惑", "这画怎么是倒着挂的？挂画的人，眼神儿不行，还是故意的？"),
        ],
        resumeFreeRoam
      );
      return;
    }

    // 第二段：靠近后发现异常（仍未拿到）
    if (stage === 1) {
      clickCounts.painting++;
      playLines(
        [
          L_narr("~橘鏡凑近了些，抬手按上画框的边。"),
          L_narr("[指尖底下，画框背面有一块地方鼓鼓的——薄薄一片，边缘硬硬的。]"),
          L_say("橘鏡", "疑惑", "这块儿鼓鼓的，像夹了东西。"),
        ],
        resumeFreeRoam
      );
      return;
    }

    // 第三段：取下画框，拿到纸条
    if (!flags.hasNote2) {
      clickCounts.painting++;
      playLines(
        [
          L_narr("~橘鏡扶着画框，把它从墙上摘了下来，翻到背面。"),
          L_narr("[画框背板与边框的缝隙里，塞着一张对折过好几道的白纸。]"),
          L_say("橘鏡", "恍然", "哦，果然藏在这儿。"),
          L_narr("~橘鏡把纸抽出来，捏在手里。"),
          L_think("橘鏡", null, "又一张纸。收好，等会儿一起看。"),
          L_narr("~橘鏡把画框靠在墙边，没有再挂回去。"),
        ],
        () => {
          flags.hasNote2 = true;
          updateInventory();
          updateStageVisual();
          resumeFreeRoam();
        }
      );
      return;
    }

    playLines(
      [
        cycle(
          [
            L_narr("~画框靠在墙边，背面已经空了。"),
            L_think("橘鏡", null, "纸藏在画后面，画还倒着挂……这套路，是怕我找不着吗。"),
          ],
          "painting"
        ),
      ],
      resumeFreeRoam
    );
  }

  function onPuddle() {
    markInv("puddle");

    if (!flags.sawFace) {
      playLines(
        [
          L_narr("~水面渐渐静下来，橘鏡低头看去。"),
          L_narr("[水渍里，倒映出一张脸——是他自己的脸。]"),
          L_think("橘鏡", "怔住", "……好久没这么正经地看过自己了。"),
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

    playLines(
      [
        cycle(
          [
            L_think("橘鏡", "观察", "一滩水，把天花板倒映出来了。抬头看不清的，低头倒看得清。"),
            L_narr("~水面很静，倒影里的天花板，比抬头看到的还要清楚几分。"),
            L_narr("~水渍边缘已经有点发黑了，像是放了很久。地上却没有漏水的痕迹。"),
          ],
          "puddle"
        ),
      ],
      resumeFreeRoam
    );
  }

  // ---- 倒计时屏：只在点击时给出催促提示 ----
  function onCountdown() {
    if (!flags.batteryInstalled) {
      playLines(
        [
          L_say("橘鏡", "好奇", "诶，那是在倒数吗？"),
          L_think("橘鏡", "平静", "归零了会怎样呢。……算了，最好别等到那会儿才明白。"),
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
            L_think("橘鏡", "催促", "数字在往下掉。……行行行，我快点还不行吗。"),
            L_narr("~红色的数字一格一格往下跳。看久了，心跳好像也跟着一起走。"),
            L_think("橘鏡", "平静", "归零会怎样？没人说。不过嘛，最好别等到那会儿再知道。"),
          ],
          "countdown"
        ),
      ],
      resumeFreeRoam
    );
  }

  // ---- 门：不指向时钟 ----
  function onDoor() {
    if (!flags.batteryInstalled) {
      playLines([L_say("橘鏡", null, "门，锁着。")], resumeFreeRoam);
      return;
    }
    if (flags.solved) {
      playLines([L_narr("~面板亮着，选择工作间的界面还开着。")], resumeFreeRoam);
      return;
    }
    markInv("door");
    playLines(
      [
        cycle(
          [
            L_narr("~橘鏡走到门前，握住把手用力推了推。门纹丝不动。"),
            L_narr("~门缝压得很紧，连一丝光都透不进来。锁扣那边传来沉闷的金属声。"),
            L_think("橘鏡", null, "推不动。这扇门不吃力气，得找别的开法。"),
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
      playLines([L_say("橘鏡", null, "黑漆漆的，啥也看不见。")], resumeFreeRoam);
      return;
    }
    // 时钟已经拨对，面板已经通电——玩家主动走过来点开它，才真正触发系统启动
    if (flags.clockSolved) {
      markInv("panel");
      playLines(
        [
          L_narr("~橘鏡走到门旁，面板果然亮着，泛着惨白的光。"),
          L_narr("[门旁的电子面板「嗡」地亮了起来，惨白的光映在橘鏡脸上。]"),
          L_say("橘鏡", "警惕", "哟，亮了。这是什么系统？"),
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
            L_narr("~面板嵌在门边的墙上，比一块砖大不了多少，整块屏幕是全黑的。"),
            L_narr("~橘鏡敲了敲面板边缘。没有反应，连一丝电流声都没有。"),
            L_think("橘鏡", "观察", "不通电的屏幕，黑得像块砖。它在等谁把它叫醒呢。"),
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
      playLines([L_say("橘鏡", null, "太黑了，看不清时钟。")], resumeFreeRoam);
      return;
    }
    if (flags.solved) {
      playLines([L_narr("~时钟已经归位了，面板亮着呢。")], resumeFreeRoam);
      return;
    }

    const firstTime = !investigated.clock;
    markInv("clock");

    // 第一次调查：只报时间
    if (firstTime) {
      playLines(
        [
          L_narr("~橘鏡走到门旁的墙边。墙上嵌着一个圆形的时钟，指针缓慢地走着。"),
          L_narr("[时钟显示着：凌晨 2 点 14 分。]"),
          L_say("橘鏡", "疑惑", "凌晨……2 点 14 分？我睡了这么久吗。"),
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
          L_narr("~橘鏡把两张纸条并排举到时钟前。"),
          L_narr("[【05：99】　…　【12：66】]"),
          L_say("橘鏡", "恍然", "第二张是倒着写的……一倒过来，两个 99 就对齐了！"),
          L_think("橘鏡", null, "99 是同一个数，换掉它就成。答案嘛……心里有数。"),
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
      playLines(
        [
          L_think("橘鏡", "平静", "数字有了，总觉得还缺点什么。"),
          L_say("橘鏡", null, "还有没看的东西，全看完再动它，免得漏了什么。"),
        ],
        resumeFreeRoam
      );
      return;
    }

    // 线索不全
    if (flags.hasNote1 || flags.hasNote2) {
      if (clickCounts.clock === 0) {
        clickCounts.clock++;
        playLines(
          [
            L_narr("~橘鏡把纸条和时钟来回看了几遍。"),
            L_think("橘鏡", "疑惑", "纸条写着【05：99】……是要我拨这个钟？"),
            L_say("橘鏡", "疑惑", "可 99 是几嘛，我哪知道。再到处翻翻好了。"),
          ],
          resumeFreeRoam
        );
        return;
      }
      playLines(
        [
          cycle(
            [
              L_think("橘鏡", null, "99……这么拨肯定不对。差点什么。"),
              L_narr("~橘鏡在时钟前站了一会儿，还是没想明白，先去看看别处。"),
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
            L_think("橘鏡", null, "连该拨到几点都不给，就让我猜？……行，陪你玩。"),
            L_narr("~指针走得很稳，两点，十四分。和这间房一样，安静得不对劲。"),
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
      [L_think("橘鏡", null, "先不拨了，再溜达溜达。")],
      resumeFreeRoam
    );
  });

  const CLOCK_FAIL_LINES = [
    "「咔。」时钟没反应。",
    "「咔。」啧，又错了。手别抖啊。",
    "「咔。」行吧，重来。",
  ];

  document.getElementById("btn-clock-confirm").addEventListener("click", () => {
    const hintEl = document.getElementById("clock-hint");
    if (clockHour === 5 && clockMin === 21) {
      showScreen("game");
      playLines(
        [
          L_narr("[「咔哒。」时钟归位。]"),
          L_say("橘鏡", "恍然", "哦——原来如此。"),
          L_narr("~就在这时，右边墙的方向传来一声轻微的电流声，像是什么东西被接通了。"),
          L_think("橘鏡", "平静", "右边墙有动静。面板？过去看看就懂了。"),
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
          L_think("橘鏡", "怔住", "……这个时间，我没拨过。"),
          L_narr("~没有电流声，没有系统提示音。门锁那边，自己松开了一道缝。"),
          L_say("橘鏡", "决意", "……算了，直接走好了。"),
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
    if (clockFails >= 3) {
      hintEl.textContent +=
        "\n橘鏡：数字99是占位符，正确答案【05：21】。……切，早说不就好了。";
    }
  });

  // ---------------- 场景七：选门 ----------------
  function playScene7() {
    showScreen("game");
    playLines(
      [
        L_narr("[屏幕亮起，一段失真的机械音从面板里传来。]"),
        L_say("系统机械音", null, "全员 16 人，入职登记完成。"),
        L_narr("[屏幕亮起，出现三扇门的选项，以及一排排黑色的人形剪影——只有工牌号，没有脸。]"),
        L_say("系统机械音", null, "接下来，请选择你要进入的【工作间】。每个工作间，至少需要 5 人。"),
        L_say(
          "系统机械音",
          null,
          "规则说明——你们十六人，要进入怪谈房间，探索房间出现的诡异现象。通俗点说，就是敢死队。"
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
          "为了防止你们把房间直接炸掉……你们肯定有人这样想过，不是吗？"
        ),
        L_narr("~屏幕上，其他人的黑色剪影逐个亮起、又逐个暗下。带着工号标注的电子音，此起彼伏地响起。"),
        L_say("工牌 B7-0107 · 电子音", null, "敢死队……我们，不会死在这里吧？"),
        L_say("工牌 B7-0204 · 电子音", null, "怕什么，规则不是说了吗，选哪个最后都能到档案室。"),
        L_say("工牌 B7-0311 · 电子音", null, "押金……要交什么？手？眼睛？还是……命？"),
        L_think("橘鏡", "观察", "大家在吵。可这些声音，我一个都对不上号。"),
        L_say("系统机械音", null, "当前——茶水间 5 人，机房 5 人，黑暗房 5 人。"),
        L_say("系统机械音", null, "其余 15 人，已完成选择。"),
        L_say("系统机械音", null, "剩下还有一人——截止时间还剩——"),
        L_think("橘鏡", "凝重", "轮到我了。选一个吧。"),
        L_narr("~橘鏡盯着屏幕上那些黑色的剪影。他们一个个地熄灭，像陌生人，又像有什么东西，让他心里一动。"),
        L_think("橘鏡", null, "声音都处理过了，脸也不给看……成心不让我认出谁。"),
        L_narr("~橘鏡甩了甩头，把杂念压下去，看向三扇门。"),
        L_narr("[三扇门并列在屏幕上：茶水间（闸·舌）、机房（闸·耳）、黑暗房（闸·眼）。]"),
        L_think("橘鏡", "决意", "先挑扇门出去。剩下的，边走边看。"),
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
    saveGlobalState();

    document.getElementById("end-text").textContent = ENDING_TEXTS[key];
    const lockNoticeEl = document.getElementById("end-lock-notice");
    if (lockNoticeEl) {
      lockNoticeEl.style.display = !wasUnlocked ? "block" : "none";
    }
    const flowBtn = document.getElementById("btn-end-flowchart");
    if (flowBtn) flowBtn.style.display = flags.canSave ? "inline-block" : "none";
    showScreen("end");
  }

  // ---------------- 热点定义（按视角分组） ----------------
  // 俯瞰房间地面（默认视角）：配电盒 / 桌子·抽屉 / 工牌 / 水渍
  // 前方墙壁（↑ 从地面进入）：倒计时屏 / 时钟 / 倒挂的画
  // 左边墙壁（← 从前方墙壁进入）：灯开关
  // 右边墙壁（→ 从前方墙壁进入）：门 / 电子面板
  const HOTSPOTS = [
    { id: "fusebox", view: "floor", label: "配电盒", cls: "c-fusebox", style: "top:52%;left:10%;width:90px;height:80px;", onClick: onFusebox },
    { id: "desk", view: "floor", label: "桌子 / 抽屉", cls: "c-desk", style: "top:50%;left:42%;width:150px;height:60px;", onClick: onDesk },
    { id: "badge", view: "floor", label: "工牌", cls: "c-badge", style: "top:40%;left:50%;width:55px;height:32px;", onClick: onBadge },
    { id: "puddle", view: "floor", label: "水渍", cls: "c-puddle", style: "top:70%;left:68%;width:120px;height:44px;border-radius:50%;", onClick: onPuddle },

    { id: "countdown", view: "front", label: "倒计时屏", cls: "c-countdown", style: "top:8%;left:42%;width:90px;height:28px;", onClick: onCountdown },
    { id: "clock", view: "front", label: "时钟", cls: "c-clock", style: "top:32%;left:55%;width:85px;height:85px;border-radius:50%;", onClick: onClock },
    { id: "painting", view: "front", label: "倒挂的画", cls: "c-painting", style: "top:18%;left:16%;width:85px;height:105px;", onClick: onPainting },

    { id: "switch", view: "left", label: "灯开关", cls: "c-switch", style: "top:40%;left:45%;width:70px;height:85px;", onClick: onSwitch },

    { id: "door", view: "right", label: "门", cls: "c-door", style: "top:18%;left:55%;width:75px;height:175px;", onClick: onDoor },
    { id: "panel", view: "right", label: "电子面板", cls: "c-panel", style: "top:18%;left:28%;width:70px;height:75px;", onClick: onPanel },
  ];

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
      el.setAttribute("style", h.style);
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
        L_narr("[一个昏暗的房间，几乎伸手不见五指。只有正前方高处，一点幽暗的红光，一闪一闪。]"),
        L_narr("[橘鏡躺在地板上，缓缓睁开眼睛。]"),
        L_say("橘鏡", "揉眼", "啊咧……这是哪儿来着？我进了电梯，然后……嗯，想不起来啦。"),
        L_think("橘鏡", "平静", "记得，全记得。不过刚醒，先装个傻，看看这儿是什么路数。"),
        L_narr("~橘鏡撑着地坐起来，环顾四周，只看得见那一点红光，忽明忽暗，离得很远。"),
        L_think("橘鏡", "观察", "黑得挺彻底。行吧，先摸，别踩到什么不该踩的。"),
        L_narr("~橘鏡伸手在周围摸索。"),
        L_narr("[指尖碰到冰凉的地面，还有一些家具模糊的轮廓。]"),
        L_think("橘鏡", null, "有桌子，还有点别的。一样一样摸过去呗，急也没用。"),
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
    resetGameState();
    playIntro();
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
    if (!globalState.trueRouteUnlocked) return;
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
  }

  // ---------------- 主界面按钮状态 ----------------
  function refreshMainMenuButtons() {
    document.getElementById("btn-continue").disabled = latestSlotIndex() < 0;
    document.getElementById("btn-flowchart-menu").disabled = !globalState.trueRouteUnlocked;
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

  // ---------------- 存档 / 读档界面 ----------------
  let savesMode = "load"; // "save" | "load"
  let savesBackTarget = "title";

  function openSaves(mode, backTarget) {
    savesMode = mode;
    savesBackTarget = backTarget;
    document.getElementById("saves-title").textContent = mode === "save" ? "保存进度" : "读取存档";
    renderSavesGrid();
    showScreen("saves");
  }

  function formatSavedAt(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function renderSavesGrid() {
    const grid = document.getElementById("saves-grid");
    grid.innerHTML = "";
    saveSlots.forEach((slot, i) => {
      const el = document.createElement("div");
      el.className = "save-slot" + (slot ? "" : " empty");
      if (!slot) {
        el.textContent = savesMode === "save" ? "（空槛 · 点击保存）" : "（空）";
      } else {
        const rescuedText = slot.rescued && slot.rescued.length ? slot.rescued.join("、") : "无";
        el.innerHTML =
          '<div class="slot-index">槽位 ' + (i + 1) + "</div>" +
          '<div class="slot-progress">' + slot.progressName + "</div>" +
          '<div class="slot-meta">用时 ' + formatDuration(slot.elapsedSeconds) + "</div>" +
          '<div class="slot-meta">已救：' + rescuedText + "</div>" +
          '<div class="slot-meta">' + formatSavedAt(slot.savedAt) + "</div>";
      }
      el.addEventListener("click", () => onSaveSlotClick(i));
      grid.appendChild(el);
    });
  }

  function onSaveSlotClick(i) {
    if (savesMode === "save") {
      if (saveSlots[i] && !window.confirm("槽位 " + (i + 1) + " 已有存档，覆盖吗？")) return;
      saveSlots[i] = buildSaveData();
      persistSaveSlots();
      renderSavesGrid();
    } else {
      const slot = saveSlots[i];
      if (!slot) return;
      applySaveData(slot);
    }
  }

  document.getElementById("btn-saves-back").addEventListener("click", () => {
    showScreen(savesBackTarget);
    if (savesBackTarget === "game") resumeFreeRoam();
  });

  // ---------------- 剧情流程图 ----------------
  let flowchartBackTarget = "title";

  function openFlowchart(backTarget) {
    flowchartBackTarget = backTarget;
    renderFlowchart();
    showScreen("flowchart");
  }

  const DOOR_FLOW_INFO = {
    tea: "茶水间（闸 · 舌）",
    server: "机房（闸 · 耳）",
    dark: "黑暗房（闸 · 眼）",
  };

  function renderFlowchart() {
    const body = document.getElementById("flowchart-body");
    body.innerHTML = "";

    const startNode = document.createElement("div");
    startNode.className = "flow-node cleared";
    startNode.textContent = "序幕 · 单人关押室苏醒";
    body.appendChild(startNode);

    const arrow1 = document.createElement("div");
    arrow1.className = "flow-arrow";
    arrow1.textContent = "↓ 解谜通关";
    body.appendChild(arrow1);

    const branchWrap = document.createElement("div");
    branchWrap.className = "flow-branches";
    ["tea", "server", "dark"].forEach((key) => {
      const cleared = globalState.endingsCleared.includes(key);
      const node = document.createElement("div");
      node.className = "flow-node" + (cleared ? " cleared jumpable" : " locked");
      node.textContent = DOOR_FLOW_INFO[key] + (cleared ? "" : "（未达成）");
      if (cleared) node.addEventListener("click", () => jumpToDoorSelection());
      branchWrap.appendChild(node);
    });
    body.appendChild(branchWrap);

    const lockNode = document.createElement("div");
    if (globalState.trueRouteUnlocked) {
      const cleared = globalState.endingsCleared.includes("true");
      lockNode.className = "flow-node" + (cleared ? " cleared jumpable" : " jumpable");
      lockNode.textContent = "隐藏分支 · 差一分【05：20】" + (cleared ? "" : "（可尝试）");
      lockNode.addEventListener("click", () => jumpToHiddenLockAttempt());
    } else {
      lockNode.className = "flow-node locked";
      lockNode.textContent = "？？？（隐藏剧情锁 · 通关任意结局后解锁）";
    }
    body.appendChild(lockNode);
  }

  document.getElementById("btn-flowchart-back").addEventListener("click", () => {
    showScreen(flowchartBackTarget);
    if (flowchartBackTarget === "game") resumeFreeRoam();
  });

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

  // ---------------- 初始 ----------------
  refreshMainMenuButtons();
  showScreen("title");
})();
