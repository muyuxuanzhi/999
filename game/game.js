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
  }

  // ---------------- 游戏状态 ----------------
  const flags = {
    hasBattery: false,
    batteryInstalled: false, // = 灯亮
    hasNote1: false,
    hasNote2: false,
    solved: false,
  };

  const clickCounts = {
    switch: 0, fusebox: 0, desk: 0, clock: 0, badge: 0,
    painting: 0, puddle: 0, countdown: 0, door: 0, panel: 0,
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
  function updateStageVisual() {
    if (flags.batteryInstalled) {
      stageEl.classList.remove("stage-dark");
      stageEl.classList.add("stage-lit");
      stageLabelEl.textContent = "明亮 · " + VIEW_NAMES[currentView];
    } else {
      stageEl.classList.remove("stage-lit");
      stageEl.classList.add("stage-dark");
      stageLabelEl.textContent = "黑暗 · " + VIEW_NAMES[currentView];
    }
    // 画 / 水渍 / 面板 只有开灯后才可见
    ["painting", "puddle", "panel"].forEach((id) => {
      const el = document.getElementById("hs-" + id);
      if (!el) return;
      el.classList.toggle("hidden-item", !flags.batteryInstalled);
    });
    // 只保留"持有电池 → 配电盒"这一处教学性提示；时钟不作高亮
    const fuseEl = document.getElementById("hs-fusebox");
    if (fuseEl) {
      fuseEl.classList.toggle("glow", flags.hasBattery && !flags.batteryInstalled);
    }
    ["switch", "fusebox", "desk", "clock", "badge", "door", "countdown"].forEach((id) => {
      const el = document.getElementById("hs-" + id);
      if (el) el.classList.toggle("dim", !flags.batteryInstalled);
    });
  }

  // ---------------- 物品栏 ----------------
  const ITEMS = {
    battery: { name: "电池", color: "#FFD700" },
    note1: { name: "纸条①", color: "#F0F0F0" },
    note2: { name: "纸条②", color: "#F0F0F0" },
  };

  function updateInventory() {
    inventoryEl.innerHTML = "";
    const owned = [];
    if (flags.hasBattery && !flags.batteryInstalled) owned.push("battery");
    if (flags.hasNote1) owned.push("note1");
    if (flags.hasNote2) owned.push("note2");

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
          L_think("橘鏡", "思考", "电池……这种地方怎么会有电池。先拿着，说不定用得上。"),
        ],
        resumeFreeRoam
      );
      return;
    }

    if (id === "note1") {
      const lines = [
        L_narr("[一张有点皱的白纸，上面用黑色笔写着【05：99】。]"),
        L_think("橘鏡", "思考", "不知道能用在哪里的数字，也许是什么线索？再探索看看。"),
      ];
      if (flags.hasNote2) {
        lines.push(
          L_narr("[另一张纸条上写着【99：21】。两张纸并排放在一起。]"),
          L_think("橘鏡", "疑惑", "……两张纸上的数字，好像都在同一个位置上缺了一块。")
        );
      }
      playLines(lines, resumeFreeRoam);
      return;
    }

    if (id === "note2") {
      const lines = [
        L_narr("[一张对折过好几道的白纸，上面用黑色笔写着【99：21】。]"),
        L_think("橘鏡", "思考", "又是这种写法。和刚才那张，会不会有什么关系？"),
      ];
      if (flags.hasNote1) {
        lines.push(
          L_think(
            "橘鏡",
            "疑惑",
            "【05：99】……【99：21】……这两个「99」，都是不肯好好说清楚的地方。"
          )
        );
      }
      playLines(lines, resumeFreeRoam);
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
    if (!flags.batteryInstalled) {
      playLines(
        [
          L_say("橘鏡", "疑惑", "没电？"),
          L_narr("~橘鏡又按了按开关，灯还是没有反应。"),
        ],
        resumeFreeRoam
      );
      return;
    }
    markInv("switch");
    playLines(
      [
        cycle(
          [
            L_narr("~橘鏡又按了按灯开关。开关「咔哒」响了一声，灯本来就是亮的。"),
            L_think("橘鏡", null, "开关没坏，是之前没电而已。这里没有别的东西了。"),
          ],
          "switch"
        ),
      ],
      resumeFreeRoam
    );
  }

  function onFusebox() {
    if (!flags.hasBattery) {
      if (!flags.batteryInstalled) {
        playLines(
          [L_think("橘鏡", "观察", "配电盒里有个电池槽，空着的。")],
          resumeFreeRoam
        );
      } else {
        markInv("fusebox");
        playLines(
          [L_think("橘鏡", null, "配电盒的盖子虚掩着，电池已经接上了，别的接口都是空的。")],
          resumeFreeRoam
        );
      }
      return;
    }
    // 持有电池 → 装电池开灯
    playLines(
      [
        L_narr("~橘鏡回到配电盒前，把电池装了进去。"),
        L_narr("[「嗡——」灯光亮起，惨白的日光灯照亮了整个房间。]"),
        L_narr("~突如其来的强光让橘鏡不得不闭眼，抬手挡住眼睛。"),
        L_say("橘鏡", "闭眼 刺眼", "天呐……我的眼睛。"),
        L_narr("[过了几秒，橘鏡慢慢放下手，睁开眼睛。]"),
        L_narr("~橘鏡睁眼，环顾四周，愣住了。"),
        L_narr(
          "[灯光下，房间的全貌显现出来——它太大了，大得不像一间关押室。天花板高得望不到顶，桌椅孤零零地待在远处，人站在这里，渺小得像一件被遗忘的家具。]"
        ),
        L_think("橘鏡", "惊 微张嘴", "这间房……也太大了。天花板……我居然看不到顶。"),
        L_narr("~橘鏡揉了揉眼睛，决定把整个房间都看一遍。")
      ],
      () => {
        flags.batteryInstalled = true;
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
          L_think("橘鏡", null, "电池。还有……一张纸？先开灯，等会儿再仔细看。"),
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
      playLines([L_narr("~抽屉里已经没有别的东西了。")], resumeFreeRoam);
      return;
    }
    markInv("desk");
    playLines(
      [
        cycle(
          [
            L_narr("~抽屉是空的，里面只剩下一层灰。"),
            L_think("橘鏡", null, "桌子只有这一个抽屉。底板上有一圈浅浅的压痕，像是长期放过什么东西。"),
          ],
          "desk"
        ),
      ],
      resumeFreeRoam
    );
  }

  function onBadge() {
    if (!flags.batteryInstalled) {
      playLines([L_say("橘鏡", null, "摸到：什么卡片？看不清。")], resumeFreeRoam);
      return;
    }
    const first = clickCounts.badge === 0;
    markInv("badge");
    if (first) {
      clickCounts.badge++;
      playLines(
        [
          L_narr("~橘鏡走到桌边，捡起桌上倒扣的工牌，翻了过来。"),
          L_narr("[一张员工工牌。姓名：橘鏡。职位：夜班心理评估员。编号：B7-0313。]"),
          L_say("橘鏡", "恍然 思索", "这是我的工牌……夜班心理评估员。编号 B7-0313。"),
        ],
        resumeFreeRoam
      );
      return;
    }
    playLines(
      [
        cycle(
          [
            L_think("橘鏡", null, "橘鏡。夜班心理评估员。编号 B7-0313……这真的是我吗？"),
            L_narr("~工牌边缘有点磨损，像是戴了很久。挂绳上还留着一道折痕。"),
            L_think("橘鏡", null, "心理评估员……这职位，和这间房，总觉得哪里对不上。"),
          ],
          "badge"
        ),
      ],
      resumeFreeRoam
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
          L_think("橘鏡", "疑惑", "这幅画，是倒着挂的？挂画的人……是没注意，还是故意的？"),
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
          L_say("橘鏡", "疑惑 定神", "这一块……鼓鼓的，好像夹着什么东西。"),
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
          L_say("橘鏡", "恍然 睁眼", "果然夹在这后面。"),
          L_narr("~橘鏡把纸抽出来，捏在手里。"),
          L_think("橘鏡", "专注 抿嘴", "又是一张纸。上面写了什么，等会儿再看——先收好。"),
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
            L_think("橘鏡", null, "为什么要把纸藏在画的后面？而且……还要把画倒过来挂。"),
          ],
          "painting"
        ),
      ],
      resumeFreeRoam
    );
  }

  function onPuddle() {
    markInv("puddle");
    playLines(
      [
        cycle(
          [
            L_think("橘鏡", "观察", "一滩水渍，倒映着天花板……我抬头看不清的，水里反而清楚。"),
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
          L_say("橘鏡", "惊 睁大眼", "那是……倒计时？！"),
          L_think(
            "橘鏡",
            "紧张",
            "它在倒数。等它归零，会发生什么？不行……我得先搞清楚这是什么地方。"
          ),
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
            L_think("橘鏡", "紧张 催促", "时间一点点变少！快点探索吧。"),
            L_narr("~红色的数字一格一格往下跳。看久了，心跳好像也跟着一起走。"),
            L_think("橘鏡", "紧张", "没人告诉我它归零之后会怎样——可越是这样，越让人不敢停下来。"),
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
      playLines([L_say("橘鏡", null, "摸到门：锁着，推不开。")], resumeFreeRoam);
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
            L_think("橘鏡", null, "推不动。这门不是用力气就能打开的。"),
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
      playLines([L_say("橘鏡", null, "太黑了，什么都看不清。")], resumeFreeRoam);
      return;
    }
    markInv("panel");
    playLines(
      [
        cycle(
          [
            L_narr("~面板嵌在门边的墙上，比一块砖大不了多少，整块屏幕是全黑的。"),
            L_narr("~橘鏡敲了敲面板边缘。没有反应，连一丝电流声都没有。"),
            L_think("橘鏡", "观察", "不通电的屏幕。它在等什么？——还是说，在等什么人把它打开。"),
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
          L_say("橘鏡", "疑惑", "目前的时间——凌晨 2 点 14 分！？我晕过去了多久啊……"),
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
          L_narr("[【05：99】　…　【99：21】]"),
          L_say("橘鏡", "恍然 睁眼", "【05：99】【99：21】……原来是这样，我知道了！"),
          L_think("橘鏡", "专注 咬唇", "时针拨到 5，分针拨到 21……"),
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
          L_think("橘鏡", "定神", "手上有数字，可总觉得还漏了点什么。"),
          L_say("橘鏡", null, "还有东西没查看，全部探索完吧，万一漏下点什么就不好了。"),
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
            L_think("橘鏡", "专注 抿嘴", "纸条上写着【05：99】……是要拨动这个时钟吗？"),
            L_say("橘鏡", "泄气 挠头", "但 99 这个数字还是个谜……再探索看看其他地方吧，或许还缺了什么线索。"),
          ],
          resumeFreeRoam
        );
        return;
      }
      playLines(
        [
          cycle(
            [
              L_think("橘鏡", null, "99……肯定不对。还差一点什么，再找找看。"),
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
            L_think("橘鏡", null, "要我拨动它吗？可我连该拨到几点都不知道。"),
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
    showScreen("game");
  });

  const CLOCK_FAIL_LINES = [
    "「咔。」时钟没有反应。",
    "「咔。」又错了？手在抖吗……定一定神。",
    "「咔。」橘鏡深吸一口气，重新开始。",
  ];

  document.getElementById("btn-clock-confirm").addEventListener("click", () => {
    const hintEl = document.getElementById("clock-hint");
    if (clockHour === 5 && clockMin === 21) {
      showScreen("game");
      playLines(
        [
          L_narr("[「咔哒。」时钟归位。]"),
          L_narr("[门旁的电子面板「嗡」地亮了起来，惨白的光映在橘鏡脸上。]"),
          L_say("橘鏡", "警惕 皱眉", "启动了。这是什么……电子系统？"),
        ],
        () => {
          flags.solved = true;
          updateStageVisual();
          playScene7();
        }
      );
      return;
    }
    clockFails++;
    hintEl.textContent = CLOCK_FAIL_LINES[(clockFails - 1) % CLOCK_FAIL_LINES.length];
    if (clockFails >= 3) {
      hintEl.textContent +=
        "\n橘鏡：数字 99 是占位符，所以正确的时间是【05：21】。";
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
        L_think("橘鏡", "观察", "大家都在讨论。可这些声音……我一个都想不起来是谁。"),
        L_say("系统机械音", null, "当前——茶水间 5 人，机房 5 人，黑暗房 5 人。"),
        L_say("系统机械音", null, "其余 15 人，已完成选择。"),
        L_say("系统机械音", null, "剩下还有一人——截止时间还剩——"),
        L_think("橘鏡", "凝重 决意", "要做出选择了。"),
        L_narr("~橘鏡盯着屏幕上那些黑色的剪影。他们一个个地熄灭，像陌生人，又像有什么东西，让他心里一动。"),
        L_think("橘鏡", "疑惑", "这些人……为什么，我一个都想不起来是谁？明明应该……"),
        L_narr("~橘鏡甩了甩头，把杂念压下去，看向三扇门。"),
        L_narr("[三扇门并列在屏幕上：茶水间（闸·舌）、机房（闸·耳）、黑暗房（闸·眼）。]"),
        L_think("橘鏡", "决意", "选一扇门，走出去。先离开这间房再说。"),
      ],
      () => {
        showScreen("doors");
      }
    );
  }

  document.querySelectorAll(".door-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const door = btn.getAttribute("data-door");
      const texts = {
        tea: "橘鏡按下了【茶水间】。\n\n门缓缓滑开，一股冷风从门缝里涌出来。\n\n[画面一黑。序幕结束。]\n\n（闸·舌 —— 下一轮，在茶水间等待着他的，会是什么？）",
        server: "橘鏡按下了【机房】。\n\n门缝里传出细碎的电流声，像是什么东西正在运转。\n\n[画面一黑。序幕结束。]\n\n（闸·耳 —— 下一轮，在机房等待着他的，会是什么？）",
        dark: "橘鏡按下了【黑暗房】。\n\n门后一片比这里更深的黑，吞没了刚刚亮起的灯光。\n\n[画面一黑。序幕结束。]\n\n（闸·眼 —— 下一轮，在黑暗房等待着他的，会是什么？）",
      };
      document.getElementById("end-text").textContent = texts[door];
      showScreen("end");
    });
  });

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
    HOTSPOTS.filter((h) => h.view === currentView).forEach((h) => {
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
        L_say("橘鏡", "不清醒 疑惑", "这……是哪里？我记得……我乘了电梯……然后？……想不起来了。"),
        L_think("橘鏡", null, "头好沉。我怎么会躺在地上？"),
        L_narr("~橘鏡撑着地坐起来，环顾四周，只看得见那一点红光，忽明忽暗，离得很远。"),
        L_think("橘鏡", "紧张 皱眉", "太黑了。先摸摸脚边，看看有什么。"),
        L_narr("~橘鏡伸手在周围摸索。"),
        L_narr("[指尖碰到冰凉的地面，还有一些家具模糊的轮廓。]"),
        L_think("橘鏡", null, "地上好像有桌子之类的东西……一样一样摸清楚吧。"),
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
    playIntro();
  });

  document.getElementById("btn-restart").addEventListener("click", () => {
    location.reload();
  });

  // ---------------- 初始 ----------------
  showScreen("title");
})();
