/* ============================================================
   序幕关押室 · 共享布局数据（单一数据源）
   - room3d.js 用它搭建左侧 3D 房间模型
   - game.js 用 rect2d() 把同一批物品投影到右侧 4:3 舞台，生成可点击热点
   想挪动物品，只改这里，左右两边会一起变。

   坐标：房间中心在地面原点；x 向右，y 向上，z 朝向观察者（前）；单位：米
   视角：front = 正对后墙；left = 面向左墙；right = 面向右墙；floor = 俯瞰地面
   ============================================================ */
(function () {
  "use strict";

  const W = 12; // 宽（x）
  const D = 12; // 深（z）
  const H = 7; // 高（y）

  // size 约定：[x 向边长, y 向边长, z 向边长]；cyl 为 [半径, 半径, 厚度]；disc 为 [x 半径, 厚度, z 半径]
  const items = [
    // ---- 后墙（front 视角）----
    { id: "countdown", label: "倒计时屏", view: "front", color: 0xd13b2b, size: [2.4, 1.6, 0.25], pos: [0, 6.0, -D / 2 + 0.2], emissive: true, alwaysOn: true },
    { id: "clock", label: "时钟", view: "front", color: 0x4a6fd4, shape: "cyl", size: [0.9, 0.9, 0.25], pos: [2.6, 3.6, -D / 2 + 0.2] },
    { id: "painting", label: "画", view: "front", color: 0x9d7bd8, size: [1.8, 2.2, 0.2], pos: [-3.2, 3.6, -D / 2 + 0.2], fallenPos: [-5.0, 1.1, -D / 2 + 0.7] },

    // ---- 左墙（left 视角）：灯开关靠前（近配电盒），书架居中偏后 ----
    { id: "switch", label: "灯开关", view: "left", color: 0xe8563a, size: [0.25, 0.9, 0.6], pos: [-W / 2 + 0.15, 3.0, 3.4] },
    { id: "bookshelf", label: "书架", view: "left", color: 0x9a6b2f, size: [1.0, 4.4, 2.2], pos: [-W / 2 + 0.5, 2.2, -0.8] },

    // ---- 右墙（right 视角）----
    { id: "door", label: "门", view: "right", color: 0x3b2a1a, size: [0.25, 4.2, 2.8], pos: [W / 2 - 0.15, 2.1, -2.2] },
    { id: "panel", label: "电子面板", view: "right", color: 0x4ade80, size: [0.25, 1.4, 1.05], pos: [W / 2 - 0.15, 3.2, 1.6] },

    // ---- 地面（floor 视角）----
    { id: "fusebox", label: "配电盒", view: "floor", color: 0x6b7280, size: [1.5, 1.4, 1.3], pos: [-3.8, 0.7, 2.6] },
    { id: "desk", label: "桌子", hsLabel: "桌子 / 抽屉", view: "floor", color: 0xa67b5b, size: [2.8, 1.1, 2.4], pos: [0.4, 0.55, 0], labelOffset: [-1.0, 0.1] },
    { id: "badge", label: "工牌", view: "floor", color: 0xf59e0b, size: [0.9, 0.06, 0.9], pos: [1.45, 1.14, 0.1], labelOffset: [0.5, 0.9] },
    { id: "puddle", label: "水渍", view: "floor", color: 0x2ec4b6, shape: "disc", size: [1.5, 0.03, 1.15], pos: [3.2, 0.03, 2.8] },
  ];

  const byId = {};
  items.forEach((it) => (byId[it.id] = it));

  // ---------------- 3D → 4:3 舞台（设计坐标 800×600）的投影 ----------------
  const STAGE_W = 800;
  const STAGE_H = 600;
  const S = STAGE_W / W; // 墙面视角：每米对应的像素（横纵同比例）
  const S_FLOOR_Z = STAGE_H / D; // 俯瞰视角：纵向每米像素（后墙在画面上缘）
  const FLOOR_Y = 540; // 墙面视角下，地板线在舞台中的纵坐标
  const MIN_W = 56; // 热点最小可点击尺寸
  const MIN_H = 40;

  // 物品三维外包尺寸 [x, y, z]
  function extent(it) {
    if (it.shape === "cyl") return [it.size[0] * 2, it.size[0] * 2, it.size[2]];
    if (it.shape === "disc") return [it.size[0] * 2, it.size[1], it.size[2] * 2];
    return it.size;
  }

  // 返回物品在对应视角舞台里的矩形 { left, top, width, height }（单位 px，800×600 设计坐标）
  function rect2d(it, posOverride) {
    const p = posOverride || it.pos;
    const e = extent(it);
    let cx, cy, w, h;
    switch (it.view) {
      case "floor": // 俯瞰：右 = +x，画面上方 = 后墙（-z）
        cx = STAGE_W / 2 + p[0] * S;
        cy = STAGE_H / 2 + p[2] * S_FLOOR_Z;
        w = e[0] * S;
        h = e[2] * S_FLOOR_Z;
        break;
      case "front": // 正对后墙：右 = +x
        cx = STAGE_W / 2 + p[0] * S;
        cy = FLOOR_Y - p[1] * S;
        w = e[0] * S;
        h = e[1] * S;
        break;
      case "left": // 面向左墙：右 = -z（后墙在右手边）
        cx = STAGE_W / 2 - p[2] * S;
        cy = FLOOR_Y - p[1] * S;
        w = e[2] * S;
        h = e[1] * S;
        break;
      case "right": // 面向右墙：右 = +z（后墙在左手边）
        cx = STAGE_W / 2 + p[2] * S;
        cy = FLOOR_Y - p[1] * S;
        w = e[2] * S;
        h = e[1] * S;
        break;
      default:
        throw new Error("unknown view: " + it.view);
    }
    w = Math.max(w, MIN_W);
    h = Math.max(h, MIN_H);
    return {
      left: Math.round(cx - w / 2),
      top: Math.round(cy - h / 2),
      width: Math.round(w),
      height: Math.round(h),
    };
  }

  window.ROOM_LAYOUT = { W, D, H, items, byId, rect2d };
})();
