/* ============================================================
   怪谈笔记 999 · 剧情流程图 + 占位节点播放器
   - 流程图：参考《极限脱出 999》的 NOVEL / ESC 节点树
       NOVEL = 剧情节点（蓝）　ESC = 逃脱房间节点（粉，右上角钥匙＝房间出口）
       锁徽章 = 剧情锁（红＝未获得相关知识，白＝已解锁）
       灰色「?」= 未到达的节点 / 结局
   - 已制作：序幕新手关（真实可玩）、第一轮三个房间的占位关（密码锁 + 机关线索）
   - 未制作：第二轮之后，用占位节点连线，进入后只播放设计要点
   依赖 game.js 暴露的 window.G999，game.js 通过 window.Flow 回调本模块。
   ============================================================ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const G = () => window.G999;

  // ---------- 台词构造 ----------
  const N = (s) => ({ t: "n", s });
  const S = (who, s) => ({ t: "s", who, s });
  const K = (who, s) => ({ t: "k", who, s });

  // ---------- 剧情锁 ----------
  const LOCKS = {
    rule_half: {
      name: "茶水间的规则",
      notice: "【剧情锁 · 线索入手】茶水间：液体永远半满。倒满＝违反。",
    },
    rule_map: {
      name: "荒波翔的「地图」",
      notice: "【剧情锁 · 线索入手】荒波翔的口述：黑暗里别靠看，靠摸，靠听。",
    },
    true_route: { name: "隐藏剧情锁", notice: "" },
  };

  function hasLock(id) {
    if (!id) return true;
    if (debugAll) return true;
    const g = G().globalState;
    if (id === "true_route") return !!g.trueRouteUnlocked;
    return g.locks.includes(id);
  }
  function grantLock(id) {
    const g = G().globalState;
    if (!g.locks.includes(id)) {
      g.locks.push(id);
      G().saveGlobalState();
    }
  }

  // ============================================================
  // 节点数据（row 为行号，x 为画布横坐标）
  // ============================================================
  const COL = { tea: 170, server: 450, dark: 730 };

  const NODES = [
    {
      id: "e_prologue", kind: "esc", title: "序幕 · 单人关押室", x: 450, row: 0, parents: [],
      real: "prologue",
      desc: "新手关。摸黑找电池、开灯，凑齐线索，拨对时钟，启动入职系统。（真实可玩，从头开始）",
    },
    {
      id: "n_door", kind: "novel", title: "选门 · 押金登记", x: 450, row: 1, parents: ["e_prologue"],
      real: "door",
      desc: "系统机械音宣布规则，三扇门并列，黑暗房【缺一份】押金。（直接跳到选门演出）",
    },
    {
      id: "n_hidden", kind: "novel", title: "差一分 · 05:20", x: 730, row: 1, parents: ["e_prologue"],
      lock: "true_route", real: "hidden",
      desc: "隐藏剧情锁：通关任意结局后，时钟拨到另一个时间。（跳到时钟前）",
    },

    // ---------------- 茶水间线 ----------------
    {
      id: "e_tea", kind: "esc", title: "茶水间（闸·舌）", x: COL.tea, row: 2, parents: ["n_door"],
      desc: "主题「半」。空间异常的茶水间，四个机关，员工通道 4 位密码锁。",
      esc: {
        intro: [
          N("[茶水间。天花板高得望不到顶，杯架倒吊着，咖啡机悬在半空，地板上印着天花板的水渍。]"),
          S("花咲樂", "哇，这里的天花板好高——杯子都在头顶上跳舞呢！"),
          K("橘鏡", "这间房比工位大了十倍不止。头顶的杯子，像被谁钉在了天上。"),
        ],
        mechs: [
          {
            label: "倒置杯架", rect: [5, 10, 26, 26], color: "#a67b5b",
            lines: [
              N("~天花板上倒吊着一个杯架，七只杯子杯口朝下。得借着地板的积水倒影，才看得清杯底。"),
              N("[从左到右，杯底：白　渍　白　渍　白　白　渍。「渍」是一圈干掉的咖啡印。]"),
              S("深海澪", "我、我数不清……那些圈，是咖啡印吗？"),
              S("早苗希", "被用过的，会留下痕迹。"),
            ],
          },
          {
            label: "漂浮咖啡机", rect: [38, 8, 26, 24], color: "#6b7280",
            lines: [
              N("~咖啡机悬在半空，够不着。角落里漂着一把扫帚，勾下来才碰得到按钮。"),
              N("[机身的小屏幕亮着：50%。水箱的水位线，停在刻度正中。]"),
              S("花咲樂", "拿扫帚呀！那根扫帚也在天上飘，勾下来就好啦！"),
              S("荒波翔", "不烫。我摸着，是凉的。"),
            ],
          },
          {
            label: "镜像冰箱", rect: [69, 14, 25, 28], color: "#4a6fd4",
            lines: [
              N("~冰箱门敞开，里面不是冷藏室——是另一间茶水间，左右镜像，上下颠倒。"),
              N("[镜子里的墙上挂着一只钟：短针指在你左手边的『10』，分针对着『12』。]"),
              S("深海澪", "钟……钟是反的。是反的吧？"),
              N("~水無瀬藍站在冰箱前，指着镜子里的倒影，拼命摇头。"),
            ],
          },
          {
            label: "反重力水槽", rect: [8, 52, 27, 26], color: "#2ec4b6",
            lines: [
              N("~水槽边，水龙头开着，水却往上飘，在半空聚成一颗一颗的水珠。"),
              N("[水珠：一、二、三、四、五、六、七。一排杯子里，水面都停在杯身一半。]"),
              N("~蓝捧着半杯咖啡，一遍遍比划「杯子」和「一半」，一个字也说不出。"),
            ],
          },
        ],
        door: {
          label: "员工通道（密码锁）", rect: [58, 52, 30, 38],
          hint: "装到一半，门就开。",
          password: "3527",
          wrong: [
            "「滴。」没有反应。",
            "「滴。」还是没有反应。门上的小字好像在提醒什么。",
            "门缝里渗出一点咖啡色的水汽，停在了半空。",
          ],
          clear: [
            N("[「咔。」员工通道的门只开了半扇，卡在地板与墙的交界处。]"),
            K("橘鏡", "只开一半。门上那句话，不是修辞。"),
          ],
        },
      },
    },
    {
      id: "n_tea_pour", kind: "novel", title: "倒满，还是不倒满", x: COL.tea, row: 3, parents: ["e_tea"],
      script: [
        N("[出口前的台面上，立着一只空杯，旁边是一壶冒着热气的咖啡。]"),
        N("~蓝指着自己的喉咙，又指向杯子，拼命比划着什么，一个字也发不出来。"),
        S("荒波翔", "凉的。……这壶，是凉的吧？"),
        N("~翔的指尖明明按在滚烫的壶身上，神色却毫无变化。"),
        S("早苗希", "别……别到满出来。"),
        K("橘鏡", "三个人说的是同一件事，只是谁也没说清。"),
        K("橘鏡", "手里这壶——"),
      ],
      choices: [
        { text: "倒满", goto: "n_tea_bad" },
        { text: "装一半", goto: "n_tea_half", lock: "rule_half" },
        { text: "拒绝", goto: "n_tea_half", lock: "rule_half" },
      ],
      desc: "核心诡计「倒满 vs 半满」。未学规则前，只能点【倒满】。",
    },
    {
      id: "n_tea_bad", kind: "novel", title: "溢出的杯子", x: COL.tea - 65, row: 4, parents: ["n_tea_pour"],
      script: [
        N("[咖啡漫过杯沿。水珠一颗一颗往上飘，又在半空炸开。]"),
        N("[杯子碎了。蓝站在原地，没来得及发出声音，身影像被水汽擦去一样，淡掉了。]"),
        K("橘鏡", "倒满……是错的。记住了。茶水间，加上倒满，等于异常。"),
      ],
      desc: "误中诡计：蓝「失踪」（不即死）。",
    },
    {
      id: "n_tea_half", kind: "novel", title: "只到一半", x: COL.tea + 65, row: 4, parents: ["n_tea_pour"],
      lock: "rule_half", grants: ["rule_map"],
      script: [
        N("[咖啡停在杯身正中，不再上升。门廊深处传来很轻的一声『咔』。]"),
        S("花咲樂", "蓝想说的是『只到一半』，对不对？"),
        N("~蓝用力点头，眼眶红了。她比划出一个画框的形状，又比划出并排的三个人。"),
        S("荒波翔", "……黑的地方，别靠眼睛。左手贴墙，数着回声走，遇到偏右的那一下，拐。"),
      ],
      desc: "正确线：蓝安全。翔顺口说出了黑暗房的「地图」。（需要先在机房读到规则）",
    },
    {
      id: "x_tea_bad", kind: "item", title: "记忆碎片 · 倒满", x: COL.tea - 65, row: 5, parents: ["n_tea_bad"],
      tag: "满", color: "#8b5a2b",
      script: [N("[碎片] 倒满的杯子，在记忆里留下一圈洗不掉的水渍。"), K("橘鏡", "收好了。")],
    },
    {
      id: "x_tea_half", kind: "item", title: "未完成的画", x: COL.tea + 65, row: 5, parents: ["n_tea_half"],
      tag: "画", color: "#c27ba0",
      script: [N("[碎片] 一幅只画了三个人轮廓的画。三张脸，都空着。"), K("橘鏡", "……我知道那三个人是谁。")],
    },

    // ---------------- 机房线 ----------------
    {
      id: "e_server", kind: "esc", title: "机房（闸·耳）", x: COL.server, row: 2, parents: ["n_door"],
      desc: "主题「静」。机器的声音被吃掉了，四个机关，员工通道 4 位密码锁。",
      esc: {
        intro: [
          N("[机房。成排的机柜没入看不见的深处，风扇在转，指示灯在闪，却听不到一丝机械声。]"),
          S("コード零", "散热扇在满转，分贝计是零。这不合理。……不，是这层楼把声音吃掉了。"),
          N("~氷川律在角落写着什么，写完，举起纸条给你看。"),
          K("橘鏡", "人声还在，机器的声音却一个都不剩。"),
        ],
        mechs: [
          {
            label: "漂浮机柜", rect: [5, 10, 26, 28], color: "#6b7280",
            lines: [
              N("~一台机柜漂浮在半空，得踮脚、借漂浮的键盘垫一下，才能凑近看灯。"),
              N("[七个指示灯，从左到右：绿　绿　灭　绿　灭　绿　灭。风扇在转，没有声音。]"),
            ],
          },
          {
            label: "镜像屏幕", rect: [38, 8, 26, 24], color: "#4a6fd4",
            lines: [
              N("~一块显示屏漂浮在半空，画面镜像加倒置，像隔着水看。"),
              N("[音量条一格都没亮。旁边的数字被镜像过，像是一个倒着的圆。]"),
              S("コード零", "静音。音量格是空的。这个我不用看第二遍。"),
            ],
          },
          {
            label: "无扇叶风扇", rect: [69, 14, 25, 28], color: "#9d7bd8",
            lines: [
              N("~一台散热风扇悬在半空，一动不动。扇叶不转，反而能数得清楚。"),
              N("[扇叶：一片，两片。……就这两片。]"),
              S("鉄井鈴", "……少了。"),
            ],
          },
          {
            label: "静音警报灯", rect: [8, 52, 27, 26], color: "#d13b2b",
            lines: [
              N("~墙上的红色警报灯在闪，本应响铃，此刻一点声音也没有。"),
              N("[亮一下，灭。一秒，两秒，三秒，再亮一下。循环往复。]"),
              S("天祐晴", "咦，这个灯是不是在报警？……可是我什么也听不见呀。"),
            ],
          },
        ],
        door: {
          label: "员工通道（密码锁）", rect: [58, 52, 30, 38],
          hint: "听见的，都不是答案。",
          password: "4023",
          wrong: [
            "「滴。」没有反应。连提示音都没有。",
            "「滴。」没有反应。门上的小字像是在说：别听。",
            "屏幕上跳出一行字，又被抹掉：『看。不要听。』",
          ],
          clear: [
            N("[员工通道的门在绝对的寂静里滑开，没有一声响。]"),
            K("橘鏡", "安静得连自己的心跳都听得见。"),
          ],
        },
      },
    },
    {
      id: "n_server_archive", kind: "novel", title: "规则档案库", x: COL.server, row: 3, parents: ["e_server"],
      grants: ["rule_half"],
      script: [
        N("[开锁后，角落里漂浮的终端亮了。屏幕是镜像的，一行一行倒着浮出来。]"),
        N("[「茶水间：液体永远半满。倒满＝违反。」]"),
        N("[「档案室：记忆，是一条被撕开的线。」]"),
        N("[「电梯：只停奇数层。」……后面的字被抹掉了。]"),
        K("橘鏡", "全部记住了。——过目不忘有时候也是个麻烦。"),
      ],
      desc: "本房是规则档案来源，为茶水间的剧情锁提供钥匙。每次只显示一部分。",
    },
    {
      id: "n_server_zero", kind: "novel", title: "代码的沉默", x: COL.server, row: 4, parents: ["n_server_archive"],
      script: [
        S("コード零", "日志里每一条警报都发出去了，只是没有人听得见。这栋楼不是坏了，是在『静音』。"),
        N("~律把纸条递过来，上面只有一行字：『我好像漏了很重要的一块。』"),
        K("橘鏡", "我知道缺的是哪一块。……但现在，还是装作不认识吧。"),
      ],
      desc: "零的科普段落；律的记忆空白伏笔。",
    },
    {
      id: "x_server", kind: "item", title: "档案残页", x: COL.server, row: 5, parents: ["n_server_zero"],
      tag: "档", color: "#4a6f8a",
      script: [N("[碎片] 一页被撕下的规则，只剩半行：『……只停奇数层。』"), K("橘鏡", "收好。以后用得上。")],
    },

    // ---------------- 黑暗房线 ----------------
    {
      id: "e_dark", kind: "esc", title: "黑暗房（闸·眼）", x: COL.dark, row: 2, parents: ["n_door"],
      desc: "主题「黑」。主角失明，靠搀扶、触摸、听觉和口述解谜，4 位密码锁。",
      esc: {
        intro: [
          N("[黑暗房。亮着灯的配电间里，套着一条全黑的走廊；走廊尽头又套着一间亮灯的储藏室。]"),
          N("~橘鏡的眼睛已经被抵押，什么都看不见。只有一只手托着他的手肘。"),
          S("白川安澄", "往前三步，墙在你的左手边。"),
          S("天宮光", "暗的地方我来照。你们跟紧我的灯。"),
        ],
        mechs: [
          {
            label: "盲文墙", rect: [5, 10, 26, 28], color: "#3b3b46",
            lines: [
              N("~安澄扶着橘鏡摸到走廊的墙。墙是歪的，要顺着摸才找到凸点。"),
              N("[指尖下是凸起的小点，竖着一列，三个。]"),
            ],
          },
          {
            label: "回声", rect: [38, 8, 26, 24], color: "#26262e",
            lines: [
              N("~橘鏡拍了拍手。声音在走廊里乱撞，一次一次弹回来。"),
              N("[回音从五个不同的方向传回。一、二、三、四、五。]"),
              S("白川安澄", "……听得出来，是五个。"),
            ],
          },
          {
            label: "配电间门把", rect: [69, 14, 25, 28], color: "#c9a227",
            lines: [
              N("~配电间的灯是亮的，但橘鏡看不见。要靠别人说。"),
              S("小鳥遊綴", "一排把手……高低都不一样。木的，塑料的，木的……"),
              S("白瀬構", "只有第一个把手是冰的，金属。其余的都不是。"),
            ],
          },
          {
            label: "最深的暗室", rect: [8, 52, 27, 26], color: "#111116",
            lines: [
              N("~最深处的暗室，一点光都没有。光举起手提灯，往天花板上照。"),
              S("天宮光", "天花板上有灯。一盏、两盏、三盏……八盏。都是灭的。"),
            ],
          },
        ],
        door: {
          label: "员工通道（密码锁）", rect: [58, 52, 30, 38],
          hint: "闭上眼睛，门就开。",
          password: "3518",
          wrong: [
            "「滴。」黑暗里，什么都没发生。",
            "「滴。」没有反应。门上的小字，提醒的是别靠看。",
            "有人在黑暗里压低声音说：『再摸一遍，别用眼睛。』",
          ],
          clear: [
            N("[员工通道的门在黑暗中无声滑开。]"),
            K("橘鏡", "闭上眼睛……我本来就看不见。"),
          ],
        },
      },
    },
    {
      id: "n_dark_blind", kind: "novel", title: "摸黑找门", x: COL.dark, row: 3, parents: ["e_dark"],
      script: [
        N("[在最深处的暗室，两组人会合了。门有好几扇，位置却对不上。]"),
        S("星見啓", "这扇？我摸着像是这扇——"),
        N("~啓的手已经按上了其中一扇门把。"),
        K("橘鏡", "选哪一个？"),
      ],
      choices: [
        { text: "凭记忆走", goto: "n_dark_bad" },
        { text: "摸墙找门", goto: "n_dark_ok", lock: "rule_map" },
        { text: "听回声定位", goto: "n_dark_ok", lock: "rule_map" },
      ],
      desc: "核心诡计「摸黑找门」。未得到翔的口述前，只能凭记忆走。",
    },
    {
      id: "n_dark_bad", kind: "novel", title: "走错的门", x: COL.dark - 65, row: 4, parents: ["n_dark_blind"],
      script: [
        N("[橘鏡凭着进门前记住的布局往前走。空间早就叠错了，每一步都踩进了别的房间。]"),
        N("[身后，啓的手松开了。一声很轻的『咦』，然后什么都没有了。]"),
        K("橘鏡", "记忆在这里没用。……记下来。"),
      ],
      desc: "误中诡计：啓「手欠」失踪（不即死）。",
    },
    {
      id: "n_dark_ok", kind: "novel", title: "回声的方向", x: COL.dark + 65, row: 4, parents: ["n_dark_blind"],
      lock: "rule_map",
      script: [
        N("[左手贴墙，数着回声。第五次回响偏向右侧——是门。]"),
        S("天宮光", "灯照不到的地方，你的手比我的灯可靠。"),
        K("橘鏡", "多亏有人把路口述给了我。"),
      ],
      desc: "正确线。（需要先在茶水间线得到翔的口述）",
    },
    {
      id: "x_dark_bad", kind: "item", title: "失踪者 · 啓", x: COL.dark - 65, row: 5, parents: ["n_dark_bad"],
      tag: "啓", color: "#6a4c93",
      script: [N("[碎片] 一只掉在门边的手套，尺寸偏大。"), K("橘鏡", "……还会再见到他的。")],
    },
    {
      id: "x_dark_ok", kind: "item", title: "回声地图", x: COL.dark + 65, row: 5, parents: ["n_dark_ok"],
      tag: "声", color: "#2d6a4f",
      script: [N("[碎片] 一张只用手指画过的地图，线条是凸起的。"), K("橘鏡", "收好。")],
    },

    // ---------------- 之后的流程：占位 ----------------
    {
      id: "n_round2", kind: "novel", title: "第二轮 · 选房", x: 450, row: 6,
      parents: ["x_tea_bad", "x_tea_half", "x_server", "x_dark_bad", "x_dark_ok"], tbd: true,
      desc: "第二轮：档案室 / 镜像走廊 / 医务室（门牌 ×4，每扇门 5 人中只有 1 人正常）。",
    },
    {
      id: "e_archive", kind: "esc", title: "档案室（闸·忆）", x: COL.tea, row: 7, parents: ["n_round2"], tbd: true,
      desc: "诡计二·集体失忆：律、蓝同处一室却互认不出。栞是唯一正常人。",
    },
    {
      id: "e_mirror", kind: "esc", title: "镜像走廊（闸·向）", x: COL.server, row: 7, parents: ["n_round2"], tbd: true,
      desc: "诡计四·镜像：方向全反，靠栞的「反读」提示破解。翔是唯一正常人。",
    },
    {
      id: "e_clinic", kind: "esc", title: "医务室（闸·时）", x: COL.dark, row: 7, parents: ["n_round2"], tbd: true,
      desc: "诡计五·时间：误判时长，靠白川的体检单戳破伪证。",
    },
    {
      id: "n_meet", kind: "novel", title: "第三轮 · 会合", x: 450, row: 8,
      parents: ["e_archive", "e_mirror", "e_clinic"], tbd: true,
      desc: "幸存者第一次面对面，抵押物归还，律、蓝想起彼此，主角有机会被认出。",
    },
    {
      id: "n_final", kind: "esc", title: "最终闸", x: 450, row: 9, parents: ["n_meet"], tbd: true,
      desc: "门牌二选一：闸·时 / 闸·忆。拒绝抵押 / 继续抵押 / 只带部分人走。",
    },
    {
      id: "x_be", kind: "item", title: "BAD END", x: 260, row: 10, parents: ["n_final"], tbd: true,
      tag: "BE", color: "#7a1f1f", desc: "六个 BAD END：被「录用」。",
    },
    {
      id: "x_good", kind: "item", title: "下班的路上有脚步声", x: 450, row: 10, parents: ["n_final"], tbd: true,
      tag: "GD", color: "#8a6d1f", desc: "GOOD / NORMAL：救出部分角色，或独自下班。",
    },
    {
      id: "x_true", kind: "item", title: "天亮了", x: 640, row: 10, parents: ["n_final"], tbd: true,
      tag: "TR", color: "#2f7f5f", desc: "TRUE END：拒绝抵押 + 真相三证 + 与律蓝相认。",
    },
  ];

  const BYID = {};
  NODES.forEach((n) => (BYID[n.id] = n));

  // ============================================================
  // 进度：已到达节点
  // ============================================================
  let debugAll = false;
  function visitedSet() { return G().globalState.visited; }
  function isVisited(id) { return visitedSet().includes(id); }
  function visit(id) {
    if (!BYID[id]) return;
    const g = G().globalState;
    if (!g.visited.includes(id)) g.visited.push(id);
    g.lastNode = id;
    G().saveGlobalState();
  }
  function setCurrent(id) {
    if (!BYID[id]) return;
    G().globalState.lastNode = id;
    G().saveGlobalState();
  }

  function statusOf(n) {
    if (isVisited(n.id)) return "done";
    if (debugAll) return "open";
    if (!n.parents.length) return "open";
    return n.parents.some(isVisited) ? "open" : "hidden";
  }
  function lockedByStory(n) {
    return !!n.lock && !hasLock(n.lock);
  }
  function canEnter(n) {
    const st = statusOf(n);
    if (st === "hidden") return { ok: false, reason: "尚未到达这里" };
    if (lockedByStory(n)) return { ok: false, reason: "剧情锁：还缺少关键的知识" };
    return { ok: true, reason: "" };
  }

  // ============================================================
  // 流程图渲染
  // ============================================================
  const NS = 52; // 节点边长
  const ROW_H = 130;
  const TOP = 60;
  const CW = 900;
  let selected = null;
  let fcBack = "title";
  let dragMoved = false;

  function nodeXY(n) { return { x: n.x, y: TOP + n.row * ROW_H }; }

  function renderFlow() {
    const canvas = $("fc-canvas");
    const maxRow = Math.max.apply(null, NODES.map((n) => n.row));
    const CH = TOP + maxRow * ROW_H + 120;
    canvas.style.width = CW + "px";
    canvas.style.height = CH + "px";
    canvas.innerHTML = "";

    // 连线
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", CW);
    svg.setAttribute("height", CH);
    svg.setAttribute("class", "fc-lines");
    const taken = [];
    NODES.forEach((n) => {
      n.parents.forEach((pid) => {
        const p = BYID[pid];
        const a = nodeXY(p), b = nodeXY(n);
        const y1 = a.y + NS / 2, y2 = b.y - NS / 2;
        const midY = y2 - 34;
        const pts = a.x === b.x
          ? [a.x, y1, b.x, y2]
          : [a.x, y1, a.x, midY, b.x, midY, b.x, y2];
        const pl = document.createElementNS(svgNS, "polyline");
        pl.setAttribute("points", pts.join(" "));
        const bothSeen = isVisited(pid) && isVisited(n.id);
        pl.setAttribute("class", "fc-line" + (bothSeen ? " taken" : "") + (statusOf(n) === "hidden" ? " dim" : ""));
        if (bothSeen) taken.push(pl); else svg.appendChild(pl);
      });
    });
    taken.forEach((pl) => svg.appendChild(pl));
    canvas.appendChild(svg);

    // 节点
    NODES.forEach((n) => {
      const st = statusOf(n);
      const locked = lockedByStory(n);
      const { x, y } = nodeXY(n);
      const el = document.createElement("div");
      el.dataset.id = n.id;
      const unknownItem = n.kind === "item" && st !== "done";
      el.className =
        "fc-node kind-" + n.kind + " st-" + st +
        (unknownItem ? " unknown" : "") + (selected === n.id ? " selected" : "");
      el.style.left = x - NS / 2 + "px";
      el.style.top = y - NS / 2 + "px";

      const face = document.createElement("div");
      face.className = "fc-face";
      if (unknownItem) {
        face.textContent = "?";
      } else if (n.kind === "item") {
        face.style.background = n.color || "#555";
        face.textContent = n.tag || "";
      } else {
        face.innerHTML = '<span class="fc-glyph">' + (n.kind === "esc" ? "🏃" : "📖") + "</span>" +
          '<span class="fc-tag">' + (n.kind === "esc" ? "ESC" : "NOVEL") + "</span>";
      }
      el.appendChild(face);

      // 钥匙：ESC 房间出口；锁：剧情锁
      if (n.kind === "esc" && st !== "hidden") {
        const k = document.createElement("span");
        k.className = "fc-badge " + (st === "done" ? "ok" : "no");
        k.textContent = "🔑";
        el.appendChild(k);
      }
      if (n.lock) {
        const l = document.createElement("span");
        l.className = "fc-badge lock " + (locked ? "no" : "ok");
        l.textContent = "🔒";
        el.appendChild(l);
      }
      if (G().globalState.lastNode === n.id) {
        const pin = document.createElement("div");
        pin.className = "fc-pin";
        el.appendChild(pin);
      }

      const lab = document.createElement("div");
      lab.className = "fc-label";
      lab.textContent = labelFor(n, st, locked);
      el.appendChild(lab);

      el.addEventListener("click", () => {
        if (dragMoved) return;
        select(n.id);
      });
      el.addEventListener("dblclick", () => {
        if (dragMoved) return;
        select(n.id);
        tryEnter();
      });
      canvas.appendChild(el);
    });
    updateInfo();
  }

  function labelFor(n, st, locked) {
    if (st === "hidden") return "？？？";
    if (locked) return "？？？";
    if (n.kind === "item" && st !== "done") return "？？？";
    return n.title;
  }

  function select(id) {
    selected = id;
    document.querySelectorAll(".fc-node").forEach((el) => {
      el.classList.toggle("selected", el.dataset.id === id);
    });
    updateInfo();
  }

  function updateInfo() {
    const n = BYID[selected];
    const box = $("fc-info");
    if (!n) { box.style.visibility = "hidden"; return; }
    box.style.visibility = "visible";
    const st = statusOf(n);
    const locked = lockedByStory(n);
    const hideAll = st === "hidden" || locked || (n.kind === "item" && st !== "done");
    $("fc-info-type").textContent = n.kind === "esc" ? "ESC" : n.kind === "item" ? "ITEM" : "NOVEL";
    $("fc-info-type").className = "fc-info-type kind-" + n.kind;
    $("fc-info-title").textContent = hideAll ? "？？？" : n.title;
    let desc;
    if (st === "hidden") desc = "尚未到达这里。";
    else if (locked) desc = "被剧情锁挡住了。在别的线里找到相关的知识，再回来。";
    else if (n.kind === "item" && st !== "done") desc = "还没有拿到的东西。";
    else desc = (n.desc || "") + (n.tbd ? "（占位节点：尚未制作，进入后只播放设计要点）" : "");
    $("fc-info-desc").textContent = desc;
    const r = canEnter(n);
    const btn = $("fc-enter");
    btn.disabled = !r.ok;
    btn.textContent = r.ok ? (st === "done" ? "再次进入" : "进入") : r.reason;
  }

  function tryEnter() {
    const n = BYID[selected];
    if (!n) return;
    const r = canEnter(n);
    if (!r.ok) return;
    enterNode(n.id);
  }

  function open(back) {
    if (back) fcBack = back;
    if (!selected || !BYID[selected]) selected = G().globalState.lastNode || "e_prologue";
    renderFlow();
    G().showScreen("flowchart");
    scrollToNode(selected);
  }

  function scrollToNode(id) {
    const n = BYID[id];
    if (!n) return;
    const vp = $("fc-viewport");
    const { x, y } = nodeXY(n);
    vp.scrollTo({
      left: Math.max(0, x - vp.clientWidth / 2),
      top: Math.max(0, y - vp.clientHeight / 2),
    });
  }

  // 拖拽滚动
  (function () {
    const vp = $("fc-viewport");
    let down = false, sx = 0, sy = 0, sl = 0, st = 0;
    vp.addEventListener("pointerdown", (e) => {
      down = true; dragMoved = false;
      sx = e.clientX; sy = e.clientY; sl = vp.scrollLeft; st = vp.scrollTop;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 6) dragMoved = true;
      if (dragMoved) {
        vp.scrollLeft = sl - dx;
        vp.scrollTop = st - dy;
      }
    });
    window.addEventListener("pointerup", () => {
      down = false;
      setTimeout(() => (dragMoved = false), 0);
    });
  })();

  $("fc-enter").addEventListener("click", tryEnter);
  $("btn-flowchart-back").addEventListener("click", () => {
    G().showScreen(fcBack);
    if (fcBack === "game") G().resumeFreeRoam();
  });
  $("fc-debug").addEventListener("click", () => {
    debugAll = !debugAll;
    $("fc-debug").textContent = debugAll ? "测试：全部解锁（开）" : "测试：全部解锁（关）";
    $("fc-debug").classList.toggle("on", debugAll);
    renderFlow();
  });
  $("fc-reset").addEventListener("click", () => {
    if (!window.confirm("清空流程图进度（已到达节点、剧情锁、结局记录）？存档不受影响。")) return;
    const g = G().globalState;
    g.visited = []; g.locks = []; g.lastNode = null;
    g.endingsCleared = []; g.trueRouteUnlocked = false;
    G().saveGlobalState();
    selected = "e_prologue";
    renderFlow();
    scrollToNode(selected);
  });

  // ============================================================
  // 进入节点
  // ============================================================
  function enterNode(id) {
    const n = BYID[id];
    if (!n) return;
    selected = id;
    if (n.real === "prologue") {
      if (!window.confirm("将从序幕重新开始（当前未保存的进度会丢失）。继续吗？")) return;
      G().startNewGame();
      return;
    }
    if (n.real === "door") { G().jumpToDoorSelection(); return; }
    if (n.real === "hidden") { G().jumpToHiddenLockAttempt(); return; }
    openPlayer(n);
  }

  // ============================================================
  // 占位节点播放器
  // ============================================================
  const np = { node: null, queue: [], done: null, waiting: false, mode: "idle", seen: {}, wrong: 0, doorSeen: false };
  const dlgEl = $("node-dialogue");
  const ndSpeaker = $("nd-speaker");
  const ndText = $("nd-text");
  const ndNext = $("nd-next");

  function setHotspotsEnabled(on) {
    $("node-hotspots").style.pointerEvents = on ? "auto" : "none";
  }
  function setFree(text) {
    ndSpeaker.textContent = "";
    ndText.className = "narration";
    ndText.textContent = text;
    ndNext.style.display = "none";
  }

  function npPlay(lines, done) {
    np.queue = lines.slice();
    np.done = done || null;
    np.waiting = true;
    setHotspotsEnabled(false);
    npNext();
  }
  function npNext() {
    if (!np.queue.length) {
      ndNext.style.display = "none";
      np.waiting = false;
      const cb = np.done;
      np.done = null;
      if (cb) cb();
      return;
    }
    const line = np.queue.shift();
    ndNext.textContent = "▼ 点击继续";
    ndText.className = "";
    if (line.t === "n") {
      ndSpeaker.textContent = "";
      ndText.classList.add("narration");
      ndText.textContent = line.s;
    } else if (line.t === "s") {
      ndSpeaker.textContent = line.who;
      ndText.textContent = line.s;
    } else {
      ndSpeaker.textContent = line.who;
      ndText.classList.add("thought");
      ndText.textContent = "（" + line.s + "）";
    }
    ndNext.style.display = "block";
  }
  dlgEl.addEventListener("click", () => {
    if (np.waiting) npNext();
    else if (np.mode === "finish") backToFlow();
  });

  function backToFlow() {
    np.mode = "idle";
    open();
  }
  $("btn-node-flow").addEventListener("click", backToFlow);
  $("btn-node-hint").addEventListener("click", () => {
    const n = np.node;
    if (!n || !n.esc || np.waiting) return;
    setFree("（测试提示）出口密码：" + n.esc.door.password);
  });

  function stubLines(n) {
    return [
      N("[占位节点 · " + n.title + "]"),
      N(n.desc || ""),
      N("（这个节点尚未制作。进入它就算「到达」，用来测试流程图的解锁与连线。）"),
    ];
  }

  function openPlayer(n) {
    np.node = n;
    np.mode = "idle";
    np.seen = {};
    np.wrong = 0;
    np.doorSeen = false;
    $("node-name").textContent = n.title;
    $("node-badge").textContent = n.tbd ? "占位节点" : "占位测试关";
    $("btn-node-hint").style.display = n.esc ? "inline-block" : "none";
    $("node-hotspots").innerHTML = "";
    $("node-choices").innerHTML = "";
    $("node-choices").style.display = "none";
    $("node-lock").style.display = "none";
    drawStageBackdrop(n);
    G().showScreen("node");

    if (n.esc) {
      npPlay(n.esc.intro, () => showEscStage(n));
    } else {
      visit(n.id);
      runNovel(n);
    }
  }

  function drawStageBackdrop(n) {
    const stage = $("node-stage");
    const color = n.color || (n.kind === "esc" ? "#b02a78" : "#1d5fa8");
    stage.className = "node-stage-" + n.kind + (n.esc ? " is-esc" : "");
    stage.style.setProperty("--node-color", color);
    const kindText = n.kind === "esc" ? "ESC" : n.kind === "item" ? "ITEM" : "NOVEL";
    $("node-stage-title").innerHTML =
      '<div class="ns-kind">' + kindText + "</div>" +
      '<div class="ns-title">' + (n.kind === "item" ? (n.tag || "") : n.title) + "</div>" +
      (n.kind === "item" ? '<div class="ns-sub">' + n.title + "</div>" : "");
  }

  function runNovel(n) {
    const lines = (n.script || stubLines(n)).slice();
    const gained = (n.grants || []).filter((id) => !G().globalState.locks.includes(id));
    gained.forEach((id) => {
      if (LOCKS[id] && LOCKS[id].notice) lines.push(N(LOCKS[id].notice));
    });
    npPlay(lines, () => {
      (n.grants || []).forEach(grantLock);
      if (n.choices) showChoices(n);
      else finishNode();
    });
  }

  function finishNode() {
    np.mode = "finish";
    ndSpeaker.textContent = "";
    ndText.className = "narration";
    ndText.textContent = "（该节点已到达。点击此处，返回流程图。）";
    ndNext.style.display = "block";
    ndNext.textContent = "▼ 返回流程图";
    setHotspotsEnabled(false);
  }

  function showChoices(n) {
    const box = $("node-choices");
    box.innerHTML = "";
    box.style.display = "flex";
    n.choices.forEach((c) => {
      const open = hasLock(c.lock);
      const b = document.createElement("button");
      b.className = "np-choice" + (open ? "" : " locked");
      b.textContent = open ? c.text : "？？？";
      if (!open) {
        const t = document.createElement("span");
        t.className = "np-choice-lock";
        t.textContent = "🔒 剧情锁";
        b.appendChild(t);
        b.disabled = true;
      } else {
        b.addEventListener("click", () => {
          box.style.display = "none";
          const next = BYID[c.goto];
          npPlay([K("橘鏡", "……" + c.text + "。")], () => openPlayer(next));
        });
      }
      box.appendChild(b);
    });
    setFree("（选择。灰色的选项，现在还选不了。）");
  }

  // ---------------- ESC 房间舞台 ----------------
  function showEscStage(n) {
    const hs = $("node-hotspots");
    hs.innerHTML = "";
    const esc = n.esc;
    esc.mechs.forEach((m, i) => hs.appendChild(makeHotspot(m.label, m.rect, m.color, () => onMech(m, i))));
    const d = esc.door;
    const door = makeHotspot(d.label, d.rect, "#3b2a1a", () => onDoor(n));
    door.classList.add("np-door");
    hs.appendChild(door);
    setHotspotsEnabled(true);
    setFree("（点击场景里的物件调查；调查完，试着输入出口的密码。）");
  }

  function makeHotspot(label, rect, color, onClick) {
    const el = document.createElement("div");
    el.className = "np-hotspot";
    el.style.left = rect[0] + "%";
    el.style.top = rect[1] + "%";
    el.style.width = rect[2] + "%";
    el.style.height = rect[3] + "%";
    el.style.background = color;
    const t = document.createElement("span");
    t.textContent = label;
    el.appendChild(t);
    el.addEventListener("click", onClick);
    return el;
  }

  function onMech(m, i) {
    np.seen[i] = true;
    npPlay(m.lines, () => setFree("（点击场景里的物件调查；调查完，试着输入出口的密码。）"));
  }

  function onDoor(n) {
    const d = n.esc.door;
    if (!np.doorSeen) {
      np.doorSeen = true;
      npPlay(
        [N("[门旁刻着一行小字：「" + d.hint + "」]"), N("[门上有一把 4 位数字的密码锁。]")],
        () => openKeypad(n)
      );
    } else {
      openKeypad(n);
    }
  }

  // ---------------- 密码锁 ----------------
  let kp = "";
  function openKeypad(n) {
    kp = "";
    const box = $("node-lock");
    box.innerHTML =
      '<div class="kp">' +
      '<div class="kp-title">员工通道 · 密码锁</div>' +
      '<div class="kp-display" id="kp-display">- - - -</div>' +
      '<div class="kp-grid" id="kp-grid"></div>' +
      '<div class="kp-msg" id="kp-msg"></div>' +
      '<button class="kp-close" id="kp-close">离开</button>' +
      "</div>";
    const grid = $("kp-grid");
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "确认"].forEach((k) => {
      const b = document.createElement("button");
      b.textContent = k;
      if (k === "确认") b.className = "kp-ok";
      b.addEventListener("click", () => onKey(k, n));
      grid.appendChild(b);
    });
    $("kp-close").addEventListener("click", () => {
      box.style.display = "none";
      setHotspotsEnabled(true);
      setFree("（点击场景里的物件调查；调查完，试着输入出口的密码。）");
    });
    box.style.display = "flex";
    setHotspotsEnabled(false);
    updateKpDisplay();
  }
  function updateKpDisplay() {
    const s = kp.split("");
    while (s.length < 4) s.push("-");
    $("kp-display").textContent = s.join(" ");
  }
  function onKey(k, n) {
    const msg = $("kp-msg");
    if (k === "←") { kp = kp.slice(0, -1); msg.textContent = ""; updateKpDisplay(); return; }
    if (k === "确认") {
      if (kp.length < 4) { msg.textContent = "需要 4 位数字"; return; }
      submitKeypad(n);
      return;
    }
    if (kp.length < 4) kp += k;
    msg.textContent = "";
    updateKpDisplay();
  }
  function submitKeypad(n) {
    const d = n.esc.door;
    if (kp === d.password) {
      $("node-lock").style.display = "none";
      visit(n.id);
      npPlay(d.clear, finishNode);
      return;
    }
    const line = d.wrong[np.wrong % d.wrong.length];
    np.wrong++;
    $("kp-msg").textContent = line;
    kp = "";
    updateKpDisplay();
  }

  // ============================================================
  // 对外接口
  // ============================================================
  window.Flow = { open, visit, setCurrent, enterNode, hasLock, grantLock };
})();
