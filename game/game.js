/* ============================================================
   怪谈笔记 999 · 序幕新手关（占位版试玩）
   纯前端文字冒险 / 点击解谜原型
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
    batteryInstalled: false, // = 灯亮 / lit
    hasNote1: false,
    hasNote2: false,
    paintingChecked: false,
    solved: false,
  };

  const clickCounts = {
    switch: 0, fusebox: 0, desk: 0, clock: 0, badge: 0,
    painting: 0, puddle: 0, countdown: 0, door: 0, panel: 0,
  };

  let clockFails = 0;
  let clockHour = 2, clockMin = 14;

  // ---------------- 对话队列引擎 ----------------
  let lineQueue = [];
  let onQueueComplete = null;

  function L_narr(text) { return { type: "narr", text }; }
  function L_say(speaker, emotion, text) { return { type: "say", speaker, emotion, text }; }
  function L_think(speaker, emotion, text) { return { type: "think", speaker, emotion, text }; }

  function setHotspotsEnabled(enabled) {
    hotspotsEl.style.pointerEvents = enabled ? "auto" : "none";
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
    dlgNext.style.display = lineQueue.length >= 0 ? "block" : "none";
  }

  dlgBox.addEventListener("click", () => {
    renderNext();
  });

  function resumeFreeRoam() {
    setHotspotsEnabled(true);
    dlgSpeaker.textContent = "";
    dlgText.className = "narration";
    dlgText.textContent = "（点击场景中的物品，继续调查……）";
    dlgNext.style.display = "none";
  }

  // ---------------- 场景背景 / 氛围 ----------------
  function updateStageVisual() {
    if (flags.batteryInstalled) {
      stageEl.classList.remove("stage-dark");
      stageEl.classList.add("stage-lit");
      stageLabelEl.textContent = "明亮 · 异常空旷的关押室";
    } else {
      stageEl.classList.remove("stage-lit");
      stageEl.classList.add("stage-dark");
      stageLabelEl.textContent = "黑暗 · 只能摸索";
    }
    // painting / puddle / panel 只有开灯后才可见
    ["painting", "puddle", "panel"].forEach((id) => {
      const el = document.getElementById("hs-" + id);
      if (!el) return;
      el.classList.toggle("hidden-item", !flags.batteryInstalled);
    });
    // 时钟在拿到两张纸条后发光提示
    const clockEl = document.getElementById("hs-clock");
    if (clockEl) {
      clockEl.classList.toggle("glow", flags.hasNote1 && flags.hasNote2 && !flags.solved);
    }
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
  function updateInventory() {
    inventoryEl.innerHTML = "";
    const items = [];
    if (flags.hasBattery && !flags.batteryInstalled) items.push({ name: "电池", color: "#FFD700" });
    if (flags.hasNote1) items.push({ name: "纸条1\n【05:99】", color: "#F0F0F0" });
    if (flags.hasNote2) items.push({ name: "纸条2\n【99:21】", color: "#F0F0F0" });
    if (items.length === 0) {
      const d = document.createElement("div");
      d.className = "inv-empty";
      d.textContent = "（物品栏为空）";
      inventoryEl.appendChild(d);
      return;
    }
    items.forEach((it) => {
      const d = document.createElement("div");
      d.className = "inv-item";
      d.style.background = it.color;
      d.style.whiteSpace = "pre-line";
      d.textContent = it.name;
      inventoryEl.appendChild(d);
    });
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
    } else {
      const arr = [
        L_say("橘鏡", null, "灯已经亮着了，没必要再按。"),
        L_think("橘鏡", null, "开关按下去只有「咔哒」声，没什么别的反应了。"),
      ];
      playLines([cycle(arr, "switch")], resumeFreeRoam);
    }
  }

  function onFusebox() {
    if (!flags.hasBattery) {
      playLines(
        [L_think("橘鏡", "观察", "配电盒里有个电池槽，空着的。")],
        resumeFreeRoam
      );
      return;
    }
    if (!flags.batteryInstalled) {
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
          L_narr(
            "【可交互】房间亮堂了，可调查的东西多了起来——墙上的时钟、桌上的工牌、倒挂的画、地板的水渍。"
          ),
        ],
        () => {
          flags.batteryInstalled = true;
          flags.hasBattery = false;
          updateStageVisual();
          updateInventory();
          resumeFreeRoam();
        }
      );
    } else {
      const arr = [
        L_say("橘鏡", null, "电池已经装好了，灯是亮的。"),
        L_think("橘鏡", null, "配电盒里的电池接得很稳，没有别的东西了。"),
      ];
      playLines([cycle(arr, "fusebox")], resumeFreeRoam);
    }
  }

  function onDesk() {
    if (clickCounts.desk === 0) {
      clickCounts.desk++;
      playLines(
        [
          L_narr("~橘鏡转身，摸索到房间中央的桌子，拉开抽屉。"),
          L_narr("[抽屉里躺着一节电池，还有一张折起来的纸条。]"),
          L_think("橘鏡", null, "电池。还有……纸条？"),
          L_narr("~橘鏡先拿起电池，又抖开那张纸条。"),
          L_narr("[纸条 1 上写着：【05：99】。]"),
          L_think("橘鏡", "疑惑", "【05：99】……这是什么意思？先不管了，把灯打开。"),
        ],
        () => {
          flags.hasBattery = true;
          flags.hasNote1 = true;
          updateInventory();
          updateStageVisual();
          resumeFreeRoam();
        }
      );
    } else {
      playLines([L_narr("~抽屉是空的，东西都拿走了。")], resumeFreeRoam);
    }
  }

  function onBadge() {
    if (!flags.batteryInstalled) {
      playLines([L_say("橘鏡", null, "摸到：什么卡片？看不清。")], resumeFreeRoam);
      return;
    }
    if (clickCounts.badge === 0) {
      clickCounts.badge++;
      playLines(
        [
          L_narr("~橘鏡又走到桌边，捡起桌上倒扣的工牌，翻了过来。"),
          L_narr("[一张员工工牌。姓名：橘鏡。职位：夜班心理评估员。编号：B7-0313。]"),
          L_say("橘鏡", "恍然 思索", "这是我的工牌……夜班心理评估员。编号 B7-0313。"),
        ],
        resumeFreeRoam
      );
    } else {
      const arr = [
        L_think("橘鏡", null, "橘鏡。夜班心理评估员。编号 B7-0313……这真的是我吗？"),
        L_narr("~工牌边缘有点磨损，像是戴了很久。"),
        L_think("橘鏡", null, "心理评估员……这职位，和这间房，总觉得哪里对不上。"),
      ];
      playLines([cycle(arr, "badge")], resumeFreeRoam);
    }
  }

  function onPainting() {
    if (!flags.hasNote2) {
      if (!flags.paintingChecked) {
        flags.paintingChecked = true;
        playLines(
          [
            L_narr("~橘鏡抬头，看见墙上挂着一幅画——画框是倒的。"),
            L_think("橘鏡", "疑惑", "那幅画……是倒着挂的？"),
            L_narr("（再点一次，试着把它取下来。）"),
          ],
          resumeFreeRoam
        );
      } else {
        playLines(
          [
            L_narr("~橘鏡伸手扶住那幅倒挂的画，把它取了下来。"),
            L_narr("[画框翻过来，背面贴着一张折起来的纸条。]"),
            L_say("橘鏡", "恍然 睁眼", "果然藏在这后面。"),
            L_narr("~橘鏡揭下纸条，展开。"),
            L_narr("[纸条 2 上写着：【99：21】。]"),
            L_think("橘鏡", "专注 抿嘴", "【99：21】……和刚才的【05：99】……"),
            L_narr("~橘鏡把两张纸条并排放在桌上，盯着看。"),
            L_narr("[两张纸条并排：【05：99】　【99：21】]"),
            L_say("橘鏡", "恍然 睁眼", "【05：99】【99：21】……原来是这样，我知道了！"),
            L_think("橘鏡", null, "99 是占位符。第一张的 05，第二张的 21……合起来是——"),
          ],
          () => {
            flags.hasNote2 = true;
            updateInventory();
            updateStageVisual();
            resumeFreeRoam();
          }
        );
      }
    } else {
      playLines([L_narr("~画框已经空了，纸条都拿到手了。")], resumeFreeRoam);
    }
  }

  function onPuddle() {
    const arr = [
      L_think("橘鏡", "观察", "一滩水渍，倒映着天花板……我抬头看不清的，水里反而清楚。"),
      L_narr("~水面很静，倒影里的天花板，比抬头看到的还要清楚几分。"),
      L_think("橘鏡", null, "这滩水……到底是什么时候积下的？地上明明没有漏水的痕迹。"),
      L_narr("~水渍边缘已经有点发黑了，像是放了很久。"),
    ];
    playLines([cycle(arr, "puddle")], resumeFreeRoam);
  }

  function onCountdown() {
    if (!flags.batteryInstalled) {
      playLines(
        [
          L_say("橘鏡", "惊 睁大眼", "那是……倒计时？！"),
          L_think(
            "橘鏡",
            null,
            "它在倒数。等它归零，会发生什么？不行……我得先搞清楚这是什么地方。"
          ),
        ],
        resumeFreeRoam
      );
      return;
    }
    const arr = [
      L_think("橘鏡", null, "倒计时还在走。等它归零，会发生什么？"),
      L_narr("~红色数字一格一格往下跳，看久了让人心慌。"),
      L_think("橘鏡", null, "没有人告诉我，这个倒计时代表什么。不去想了。"),
    ];
    playLines([cycle(arr, "countdown")], resumeFreeRoam);
  }

  function onDoor() {
    if (!flags.batteryInstalled) {
      playLines([L_say("橘鏡", null, "摸到门：锁着，推不开。")], resumeFreeRoam);
      return;
    }
    if (flags.solved) {
      playLines([L_narr("~面板亮着，选择工作间的界面还开着。")], resumeFreeRoam);
      return;
    }
    if (clickCounts.door === 0) {
      clickCounts.door++;
      playLines(
        [L_think("橘鏡", null, "锁死了。门旁边好像有什么……（时钟和面板）")],
        resumeFreeRoam
      );
    } else {
      const arr = [
        L_narr("~门缝里透不出一点光，确实锁死了。"),
        L_think("橘鏡", null, "得先解决旁边那个时钟和面板，光靠蛮力打不开这扇门。"),
      ];
      playLines([cycle(arr, "door")], resumeFreeRoam);
    }
  }

  function onPanel() {
    if (flags.solved) {
      playLines([L_narr("~面板亮着，选择工作间的界面还开着。")], resumeFreeRoam);
      return;
    }
    if (!flags.hasNote1 && !flags.hasNote2) {
      playLines([L_think("橘鏡", null, "一块黑屏的面板，没通电。")], resumeFreeRoam);
      return;
    }
    playLines(
      [L_narr("~没反应。得先解开旁边那个时钟？")],
      resumeFreeRoam
    );
  }

  function onClock() {
    if (!flags.batteryInstalled) {
      playLines([L_say("橘鏡", null, "太黑了，看不清时钟。")], resumeFreeRoam);
      return;
    }
    if (flags.solved) {
      playLines([L_narr("~时钟已经归位了，面板亮着呢。")], resumeFreeRoam);
      return;
    }
    if (!flags.hasNote2) {
      if (clickCounts.clock === 0) {
        clickCounts.clock++;
        playLines(
          [
            L_narr("~橘鏡想起口袋里那张纸条，掏出来又看了一眼。"),
            L_think(
              "橘鏡",
              "专注 抿嘴",
              "纸条上写着【05：99】……是要拨动墙上的时钟吗？"
            ),
            L_narr("~橘鏡回到时钟前，抬手去拨指针，又停住了。"),
            L_say(
              "橘鏡",
              "泄气 挠头",
              "但 99 这个数字还是个谜……再探索看看其他地方吧，或许还缺了什么线索。"
            ),
            L_think("橘鏡", null, "99……肯定不对。还差一张纸条，或者别的什么。"),
          ],
          resumeFreeRoam
        );
      } else {
        const arr = [
          L_think("橘鏡", null, "【05：99】……99 到底是什么意思，再找找别的线索吧。"),
          L_narr("~橘鏡在时钟前站了一会儿，还是没想明白，先去看看别处。"),
        ];
        playLines([cycle(arr, "clock")], resumeFreeRoam);
      }
      return;
    }
    // 两张纸条都有了，进入拨针小游戏
    playLines(
      [L_think("橘鏡", "专注 咬唇", "时针拨到 5，分针拨到 21……")],
      () => {
        clockHour = 2;
        clockMin = 14;
        clockFails = 0;
        document.getElementById("clock-hint").textContent = "";
        updateClockDisplay();
        showScreen("clock");
      }
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
      hintEl.textContent += "\n橘鏡：数字 99 是占位符，所以正确的时间是【05：21】。";
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

  // ---------------- 热点定义 ----------------
  const HOTSPOTS = [
    { id: "switch", label: "灯开关", cls: "c-switch", style: "top:38%;left:4%;width:60px;height:70px;", onClick: onSwitch },
    { id: "fusebox", label: "配电盒", cls: "c-fusebox", style: "top:58%;left:3%;width:80px;height:70px;", onClick: onFusebox },
    { id: "desk", label: "桌子 / 抽屉", cls: "c-desk", style: "top:66%;left:38%;width:130px;height:55px;", onClick: onDesk },
    { id: "badge", label: "工牌", cls: "c-badge", style: "top:58%;left:44%;width:50px;height:30px;", onClick: onBadge },
    { id: "clock", label: "时钟", cls: "c-clock", style: "top:12%;left:58%;width:75px;height:75px;border-radius:50%;", onClick: onClock },
    { id: "panel", label: "电子面板", cls: "c-panel", style: "top:14%;left:70%;width:65px;height:70px;", onClick: onPanel },
    { id: "painting", label: "倒挂的画", cls: "c-painting", style: "top:8%;left:28%;width:75px;height:95px;", onClick: onPainting },
    { id: "puddle", label: "水渍", cls: "c-puddle", style: "top:80%;left:18%;width:95px;height:38px;border-radius:50%;", onClick: onPuddle },
    { id: "countdown", label: "倒计时屏", cls: "c-countdown", style: "top:3%;left:46%;width:75px;height:26px;", onClick: onCountdown },
    { id: "door", label: "门", cls: "c-door", style: "top:26%;left:85%;width:60px;height:150px;", onClick: onDoor },
  ];

  function buildHotspots() {
    hotspotsEl.innerHTML = "";
    HOTSPOTS.forEach((h) => {
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
        L_narr("[一个昏暗的房间，几乎伸手不见五指。只有天花板角落，一点幽暗的红光，一闪一闪。]"),
        L_narr("[主角躺在地板上，缓缓睁开眼睛。]"),
        L_say("橘鏡", "不清醒 疑惑", "这……是哪里？我记得……我乘了电梯……然后？……想不起来了。"),
        L_think("橘鏡", null, "头好沉。我怎么会躺在地上？"),
        L_narr("~橘鏡撑着地坐起来，环顾四周，只看得见黑暗里那一点红光。"),
        L_think("橘鏡", "紧张 皱眉", "太黑了。先看看周围有什么。"),
        L_narr("~橘鏡贴着墙，慢慢摸索着前进。"),
        L_narr("[指尖碰到冰凉的墙面。]"),
        L_think("橘鏡", null, "墙。很凉。这间房，好像不小……"),
        L_narr("~橘鏡抬头，看清了那一点红光——是天花板角落的一块电子屏，红色的数字正在跳动。"),
        L_narr("[倒计时屏：19:37 → 19:36 → 19:35 ……]"),
        L_say("橘鏡", "惊 睁大眼", "那是……倒计时？！"),
        L_think("橘鏡", null, "它在倒数。等它归零，会发生什么？不行……我得先搞清楚这是什么地方。"),
        L_narr(
          "【可交互】黑暗中，橘鏡只能靠摸索。灯开关、配电盒、门、桌、工牌……都只能摸到轮廓。点击场景中的色块，试着调查周围吧。"
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
