/* ============================================================
   图鉴：每页一名角色，四条描述里有一条是假的。
   只改这里的文本即可；fake 是假条的序号（1~4），页面上不会显示。
   ============================================================ */
(function () {
  "use strict";

  const CODEX = [
    {
      name: "橘鏡",
      lines: [
        "记性好到离谱，看过的东西基本忘不掉",
        "吐槽很准，而且是那种听完还挑不出毛病的准",
        "夜班心理评估员，专门给怪谈做心理评估",
        "这是第一次走进这栋楼",
      ],
      fake: 4,
    },
    {
      name: "氷川律",
      lines: [
        "工作的时候一定戴着细框眼镜",
        "推理成瘾，看到谜题就想解",
        "话多又爱热情搭话，是办公室里的气氛担当",
        "对橘鏡的保护欲过剩，过剩到有点吓人",
      ],
      fake: 3,
    },
    {
      name: "水無瀬藍",
      lines: [
        "发型每天都不一样，同事靠发型认她",
        "爱吃，抽屉里的零食常年是满的",
        "观察力很强，细节一眼就能看穿",
        "性格内向，一天说不了几句话",
      ],
      fake: 4,
    },
    {
      name: "花咲樂",
      lines: [
        "管橘鏡叫「小鏡」，而且完全不打算改",
        "全公司没有她不认识的人",
        "聊天聊着聊着就跑偏，属于电波系",
        "讨厌难缠的访客，会当场把脸拉下来",
      ],
      fake: 4,
    },
    {
      name: "コード零",
      lines: [
        "技术狂，三天不睡也能盯着屏幕",
        "公司的规则档案基本都归他管",
        "能用代码解决的事，绝对不用嘴说",
        "对新技术毫无兴趣，用的还是十年前的设备",
      ],
      fake: 4,
    },
    {
      name: "白川安澄",
      lines: [
        "温和，对谁说话都是同一个语气",
        "一视同仁，同事受伤和怪谈受伤都一样认真处理",
        "体检单写得特别细，连心率和代谢都不落",
        "一看见血就头晕，所以医务室的血袋都是别人拿的",
      ],
      fake: 4,
    },
    {
      name: "星見啓",
      lines: [
        "看到按钮就想按，手比脑子快",
        "说话不过脑，说完才发现不太对",
        "最怕的是无聊，比怪谈还怕",
        "占卜从来没准过，纯属装样子",
      ],
      fake: 4,
    },
    {
      name: "鉄井鈴",
      lines: [
        "沉默寡言，开会基本只说「嗯」",
        "门锁和通风设备，闭着眼睛也能拆",
        "偶尔会像换了个人一样",
        "修东西的时候话特别多，嘴停不下来",
      ],
      fake: 4,
    },
    {
      name: "白瀬構",
      lines: [
        "完美主义，一个镜头能重拍二十遍",
        "对镜头语言有执念，聊起来能聊一下午",
        "看到歪一点的构图就浑身难受",
        "拍东西很随性，差不多就行",
      ],
      fake: 4,
    },
    {
      name: "小鳥遊綴",
      lines: [
        "胆小，听见怪声先往后缩",
        "针线活细腻，工装破了找綴准没错",
        "太喜欢大家了，所以总是强装活泼",
        "胆子很大，什么怪谈都敢第一个冲",
      ],
      fake: 4,
    },
    {
      name: "天宮光",
      lines: [
        "自带光源一样的存在感，站哪哪亮",
        "关心所有人，谁不舒服都第一个发现",
        "对鈴格外照顾，照顾得很明显",
        "不喜欢亮的地方，总爱待在阴暗的角落",
      ],
      fake: 4,
    },
    {
      name: "荒波翔",
      lines: [
        "冒险狂，口头禅是「踏出那一步」",
        "方向感很好，是外勤里的活地图",
        "常年在外面跑，很少老老实实坐办公室",
        "遇到危险总是第一个往回跑",
      ],
      fake: 4,
    },
    {
      name: "早苗希",
      lines: [
        "内向，但干起活来非常专注",
        "渴望被需要，被拜托的时候会偷偷开心",
        "办公室里的植物全归她管",
        "对植物死活毫不在意，浇水全凭心情",
      ],
      fake: 4,
    },
    {
      name: "継井栞",
      lines: [
        "温和寡言，说话轻得像怕吵醒谁",
        "耐心极好，一页一页慢慢修",
        "执着于修复碎掉的东西，哪怕只剩一小片",
        "粗枝大叶，修东西全靠蛮力",
      ],
      fake: 4,
    },
    {
      name: "天祐晴",
      lines: [
        "自称幸运儿，也确实经常很幸运",
        "把发生的一切都定义为「幸运」",
        "零焦虑，天塌下来也先吃完饭",
        "一碰到倒霉事就垂头丧气，半天缓不过来",
      ],
      fake: 4,
    },
    {
      name: "深海澪",
      lines: [
        "冒冒失失，单纯得让人放心不下",
        "变装达人，每次出现都像换了个人",
        "水质数据报得又快又准",
        "做事一向稳重，从来没出过差错",
      ],
      fake: 4,
    },
  ];

  const $ = (id) => document.getElementById(id);
  let page = 0;
  let backTarget = "title";

  function render() {
    const c = CODEX[page];
    $("cx-title").textContent = "关于" + c.name;
    const ul = $("cx-lines");
    ul.innerHTML = "";
    c.lines.forEach((t, i) => {
      const li = document.createElement("li");
      li.innerHTML = '<b>' + (i + 1) + '.</b><span></span>';
      li.querySelector("span").textContent = t;
      ul.appendChild(li);
    });
    $("cx-count").textContent =
      String(page + 1).padStart(2, "0") + "/" + String(CODEX.length).padStart(2, "0");
  }

  function turn(d) {
    page = (page + d + CODEX.length) % CODEX.length;
    render();
  }

  function open(back) {
    backTarget = back || "title";
    render();
    window.G999.showScreen("codex");
  }

  $("btn-codex-menu").addEventListener("click", () => open("title"));
  $("cx-prev").addEventListener("click", () => turn(-1));
  $("cx-next").addEventListener("click", () => turn(1));
  $("btn-codex-back").addEventListener("click", () => {
    window.G999.showScreen(backTarget);
  });
  document.addEventListener("keydown", (e) => {
    if (!$("screen-codex").classList.contains("active")) return;
    if (e.key === "ArrowLeft") turn(-1);
    else if (e.key === "ArrowRight") turn(1);
  });

  window.Codex = { open, data: CODEX };
})();
