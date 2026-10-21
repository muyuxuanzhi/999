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

  // 房间尺寸取自全局模型 room_b7.glb 实测外包（Blender 建模，1:1 烘焙到游戏坐标）
  const W = 11.6; // 宽（x）
  const D = 9.8; // 深（z）
  const H = 7; // 高（y）

  // size 约定：[x 向边长, y 向边长, z 向边长]；cyl 为 [半径, 半径, 厚度]；disc 为 [x 半径, 厚度, z 半径]
  // 所有 pos / size 均由模型网格包围盒换算得到（见 room_b7.glb），改模型后需同步
  const items = [
    // ---- 后墙（front 视角）----
    { id: "countdown", label: "倒计时屏", view: "front", color: 0xd13b2b, size: [1.1, 0.4, 0.15], pos: [0, 5.63, -4.54], emissive: true, alwaysOn: true },
    { id: "clock", label: "时钟", view: "front", color: 0x4a6fd4, shape: "cyl", size: [0.35, 0.35, 0.09], pos: [2.37, 4.88, -4.53] },
    { id: "painting", label: "画", view: "front", color: 0x9d7bd8, size: [0.8, 1.0, 0.14], pos: [-2.37, 4.01, -4.53], fallenPos: [-4.2, 0.5, -3.9] },

    // ---- 左墙（left 视角）：灯开关靠前，书架居中偏后，配电盒靠前下方 ----
    { id: "switch", label: "灯开关", view: "left", color: 0xe8563a, size: [0.06, 0.25, 0.17], pos: [-5.46, 2.76, 0.77] },
    { id: "bookshelf", label: "书架", view: "left", color: 0x9a6b2f, size: [0.8, 4.99, 2.0], pos: [-5.09, 2.51, -2.1] },

    // ---- 右墙（right 视角）----
    { id: "door", label: "门", view: "right", color: 0x3b2a1a, size: [0.4, 5.24, 2.62], pos: [5.59, 2.63, -2.35] },
    { id: "panel", label: "电子面板", view: "right", color: 0x4ade80, size: [0.15, 0.7, 0.45], pos: [5.42, 3.38, -0.6] },

    // ---- 地面（floor 视角）----
    // 配电盒在模型里挂在左墙下部，但开场黑暗中它是第一个可交互物，必须留在「地面」视角
    { id: "fusebox", label: "配电盒", view: "floor", color: 0x6b7280, size: [0.9, 0.65, 0.9], pos: [-5.0, 1.14, 4.02] },
    { id: "desk", label: "桌子", hsLabel: "桌子 / 抽屉", view: "floor", color: 0xa67b5b, size: [2.99, 1.87, 1.58], pos: [0, 0.95, 1.04], labelOffset: [-1.0, 0.1] },
    { id: "badge", label: "工牌", view: "floor", color: 0xf59e0b, size: [0.25, 0.03, 0.37], pos: [-0.37, 1.9, 1.03], labelOffset: [0.5, 0.9] },
    { id: "puddle", label: "水渍", view: "floor", color: 0x2ec4b6, shape: "disc", size: [0.735, 0.03, 0.41], pos: [3.71, 0.02, 3.52] },
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
