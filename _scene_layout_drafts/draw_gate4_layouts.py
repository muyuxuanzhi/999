# -*- coding: utf-8 -*-
"""
闸4·档案室 俯视布局图（几何图形+文字说明占位版）
三个版本，供挑选：
  V1 镜中对半型：一面整块镜子把房间分成「现实区」与「镜像区」左右两半，呼应核心异常「镜像重叠」
  V2 纸质迷宫型：档案柜墙体排成弯曲走廊，呼应「档案柜延伸到看不见的尽头」，多视角自由探索
  V3 四象限枢纽型：中央出口枢纽，四个机关分布四象限，结构最简单，复用闸1/闸2引擎成本最低
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.font_manager as fm
import os

FONT_CANDIDATES = ["Microsoft YaHei", "SimHei", "SimSun"]
for f in fm.fontManager.ttflist:
    if f.name in FONT_CANDIDATES:
        plt.rcParams["font.sans-serif"] = [f.name]
        break
plt.rcParams["axes.unicode_minus"] = False

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

NPC_COLOR = {
    "鏡": "#8FA6C8",   # 主角，雾蓝银
    "律": "#7EC8E3",   # 氷川律（失忆）
    "蓝": "#4A6FD4",   # 水無瀬藍（失忆）
    "栞": "#A67B5B",   # 継井栞（唯一正常人）
    "晴": "#FFE066",   # 天祐晴（失忆）
    "希": "#6B8E23",   # 早苗希（失忆）
}

OBJ_FACE = {
    "blank": "#B8B2A6",  # 空白档案(机关1·漂浮)
    "invert": "#5B4636", # 倒置档案柜(机关2·倒吊)
    "mirror": "#4a6fd4", # 镜像档案(机关3·镜中)
    "scatter": "#C9A227", # 错乱散页(机关4·地面)
    "door": "#3b2a1a",   # 出口门
}


def draw_npc(ax, x, y, name, note="", text_color="#111"):
    c = NPC_COLOR[name]
    ax.add_patch(patches.Circle((x, y), 0.4, facecolor=c, edgecolor="#fff", linewidth=1.3, zorder=5))
    ax.text(x, y, name, ha="center", va="center", fontsize=9, fontweight="bold", color=text_color, zorder=6)
    if note:
        ax.text(x, y - 0.68, note, ha="center", va="top", fontsize=6.8, color="#444", zorder=6)


def draw_rect(ax, x, y, w, h, color, label, dashed=False, label_color="#fff", fontsize=8.5):
    ls = "--" if dashed else "-"
    ax.add_patch(patches.Rectangle((x - w / 2, y - h / 2), w, h, facecolor=color,
                                    edgecolor="#333", linewidth=1.2, linestyle=ls, zorder=2))
    ax.text(x, y, label, ha="center", va="center", fontsize=fontsize, color=label_color, zorder=4)


def base_canvas(title, subtitle, w, h, bg="#E6E1D3"):
    fig, ax = plt.subplots(figsize=(9, 9 * h / w))
    ax.set_xlim(0, w)
    ax.set_ylim(0, h)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_facecolor(bg)
    fig.patch.set_facecolor(bg)
    ax.text(w / 2, h - 0.6, title, ha="center", va="center", fontsize=16, fontweight="bold", color="#2a2410")
    ax.text(w / 2, h - 1.25, subtitle, ha="center", va="center", fontsize=9, color="#555")
    return fig, ax


def draw_legend_row(ax, w, h, y=0.55, text_color="#333"):
    items = [
        ("空白档案(机关1)", OBJ_FACE["blank"]),
        ("倒置档案柜(机关2)", OBJ_FACE["invert"]),
        ("镜像档案(机关3)", OBJ_FACE["mirror"]),
        ("错乱散页(机关4)", OBJ_FACE["scatter"]),
        ("出口密码锁", OBJ_FACE["door"]),
    ]
    n = len(items)
    step = (w - 1.0) / n
    for i, (label, color) in enumerate(items):
        x = 0.5 + i * step
        ax.add_patch(patches.Rectangle((x, y - 0.16), 0.3, 0.3, facecolor=color, edgecolor="#333", linewidth=1))
        ax.text(x + 0.4, y, label, ha="left", va="center", fontsize=6.8, color=text_color)


def save(fig, name):
    path = os.path.join(OUT_DIR, name)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print("saved", path)


# =========================================================
# V1 · 镜中对半型（一面整块镜子分割现实区/镜像区，呼应核心异常"镜像重叠"）
# =========================================================
def v1():
    W, H = 14, 16
    fig, ax = base_canvas("闸4·档案室 布局 V1", "镜中对半型 · 一面整块镜子把房间劈成现实区／镜像区，出口嵌在镜面交界处，呼应核心异常「镜像重叠」", W, H)

    ax.plot([W / 2, W / 2], [1.2, H - 2.0], color="#4a6fd4", linewidth=2.4, linestyle=":", zorder=1)
    ax.text(W / 2, H - 1.9, "— 整墙镜面 —", ha="center", fontsize=8, color="#4a6fd4")

    # 左半：现实区（入口 + 空白档案 + 倒置档案柜）
    draw_rect(ax, 3.4, H - 3.2, 6.0, 1.4, "#d8c9a8", "入口（现实区）", label_color="#2a2410")
    draw_rect(ax, 3.4, H - 6.4, 4.4, 3.0, OBJ_FACE["blank"], "机关1\n律的空白档案(漂浮)\n挖空处=3", label_color="#2a2410", fontsize=7.3)
    draw_npc(ax, 1.3, H - 6.4, "栞", "数空白处")
    draw_npc(ax, 5.6, H - 6.4, "律", "这是我的档案？")

    draw_rect(ax, 3.4, H - 10.2, 4.4, 3.0, OBJ_FACE["invert"], "机关2\n蓝的倒置档案柜\n反读编号=8", label_color="#fff", fontsize=7.3)
    draw_npc(ax, 1.3, H - 10.2, "晴", "反着读，是八！")
    draw_npc(ax, 5.6, H - 10.2, "蓝", "那就是八吧")

    # 右半：镜像区（镜像档案 + 错乱散页 + 出口）
    draw_rect(ax, 10.6, H - 3.2, 6.0, 1.4, "#ccd6e8", "镜像区（倒影档案室）", label_color="#1a2a4a")
    draw_rect(ax, 10.6, H - 6.4, 4.4, 3.0, OBJ_FACE["mirror"], "机关3\n镜像档案(镜中)\n反读数字=0", label_color="#fff", fontsize=7.3)
    draw_npc(ax, 8.5, H - 6.4, "栞", "镜子里那份，数字是反的")
    draw_npc(ax, 12.7, H - 6.4, "鏡", "哪个是真，哪个是倒影？")

    draw_rect(ax, 10.6, H - 10.2, 4.4, 3.0, OBJ_FACE["scatter"], "机关4\n错乱的遗忘日期\n缺的一天=1", label_color="#2a2410", fontsize=7.3)
    draw_npc(ax, 8.5, H - 10.2, "希", "少了一天……")
    draw_npc(ax, 12.7, H - 10.2, "蓝", "我在找一个人(核心诡计)")

    draw_rect(ax, W / 2, 1.8, 3.0, 1.6, OBJ_FACE["door"], "员工通道\n(嵌在镜面交界处)\n密码锁", label_color="#fff", fontsize=7.5)

    ax.text(0.3, 0.6, "路线：左半现实区解律的档案(机关1)与蓝的档案柜(机关2)，右半镜像区解镜像档案(机关3)\n与错乱散页(机关4)；律、蓝分居两侧互认不出，核心诡计（二人都在找同一个人）藏在散页旁的对话里",
            fontsize=7.4, color="#444")
    draw_legend_row(ax, W, H)
    save(fig, "gate4_layout_V1_镜中对半.png")


# =========================================================
# V2 · 纸质迷宫型（档案柜墙体排成弯曲走廊，强调"延伸到看不见的尽头"）
# =========================================================
def v2():
    W, H = 15, 15
    fig, ax = base_canvas("闸4·档案室 布局 V2", "纸质迷宫型 · 档案柜墙体排成弯曲走廊，强调「档案柜延伸到看不见的尽头」，四个节点自由探索顺序不限", W, H, bg="#DED6C3")

    # 走廊墙体（档案柜墙，用灰褐色长条表示，营造迷宫感）
    walls = [
        (3.0, 11.0, 0.6, 5.5), (7.0, 12.4, 5.0, 0.6), (10.6, 9.0, 0.6, 4.4),
        (5.6, 7.6, 3.4, 0.6), (3.0, 4.6, 0.6, 5.0), (9.0, 5.2, 4.2, 0.6),
    ]
    for (x, y, w, h) in walls:
        ax.add_patch(patches.Rectangle((x - w / 2, y - h / 2), w, h, facecolor="#8a7560", edgecolor="#5c4a38", linewidth=0.8, zorder=1))
    ax.text(7.0, 13.6, "（灰褐色条块＝档案柜墙，走廊在柜间弯绕）", ha="center", fontsize=7, color="#5c4a38")

    # 入口
    draw_rect(ax, 1.4, 13.0, 2.0, 1.0, "#9a8a6a", "入口", label_color="#fff", fontsize=7.5)

    # 节点1：空白档案（走廊东北角）
    draw_rect(ax, 5.0, 12.4, 2.6, 1.8, OBJ_FACE["blank"], "机关1\n律的空白档案\n挖空处=3", label_color="#2a2410", fontsize=6.8)
    draw_npc(ax, 5.0, 10.8, "栞", "")
    draw_npc(ax, 3.3, 12.4, "律", "")

    # 节点2：倒置档案柜（走廊东侧深处）
    draw_rect(ax, 12.6, 11.0, 2.2, 2.6, OBJ_FACE["invert"], "机关2\n蓝的倒置柜\n反读编号=8", label_color="#fff", fontsize=6.8)
    draw_npc(ax, 12.6, 8.9, "晴", "")
    draw_npc(ax, 10.4, 11.0, "蓝", "")

    # 节点3：镜像档案（走廊中段，大镜子立于节点旁）
    draw_rect(ax, 7.2, 5.0, 2.4, 2.0, OBJ_FACE["mirror"], "机关3\n镜像档案\n反读数字=0", label_color="#fff", fontsize=6.8)
    draw_npc(ax, 7.2, 3.3, "栞", "")
    draw_npc(ax, 5.3, 5.0, "鏡", "")

    # 节点4：错乱散页（走廊西南深处，终点）
    draw_rect(ax, 1.6, 2.2, 2.6, 1.8, OBJ_FACE["scatter"], "机关4\n错乱的日期\n缺的一天=1", label_color="#2a2410", fontsize=6.8)
    draw_npc(ax, 1.6, 0.6, "希", "")
    draw_npc(ax, 3.3, 2.2, "律", "")
    draw_npc(ax, 1.6, 3.6, "蓝", "(核心诡计·找同一人)")

    # 出口（走廊最深处，与入口不同侧，呼应"迷宫"感）
    draw_rect(ax, 12.8, 2.0, 2.6, 1.6, OBJ_FACE["door"], "员工通道\n密码锁", label_color="#fff", fontsize=7.3)

    ax.text(0.3, 0.3, "", fontsize=1)  # placeholder spacing
    ax.text(0.2, 14.4, "", fontsize=1)
    ax.text(0.3, 0.9, "路线：档案柜墙体把房间分成弯绕的走廊，四个机关节点分布在走廊不同深处，\n探索顺序自由，但走到底才能摸到出口；适合体现「迷宫般延伸到看不见尽头」的空间异常，\n实现成本高于十字/环形，需要新的走廊图块拼接",
            fontsize=7.2, color="#444")
    draw_legend_row(ax, W, H, y=0.45)
    save(fig, "gate4_layout_V2_纸质迷宫.png")


# =========================================================
# V3 · 四象限枢纽型（中央出口枢纽，四个机关分布四象限，复用闸1/闸2引擎成本最低）
# =========================================================
def v3():
    W, H = 14, 14
    fig, ax = base_canvas("闸4·档案室 布局 V3", "四象限枢纽型 · 中央出口枢纽，四个机关分布四象限，结构最简单直接，复用闸1/闸2多视角引擎成本最低", W, H)

    cx, cy = 7, 7.2

    draw_rect(ax, cx, cy, 3.0, 2.2, OBJ_FACE["door"], "员工通道\n(中央枢纽)\n密码锁", label_color="#fff", fontsize=8)

    # 左上：空白档案（漂浮）
    draw_rect(ax, cx - 4.0, cy + 3.6, 4.0, 2.6, OBJ_FACE["blank"], "机关1\n律的空白档案\n挖空处=3", label_color="#2a2410", fontsize=7.3)
    draw_npc(ax, cx - 5.6, cy + 3.6, "栞", "")
    draw_npc(ax, cx - 2.4, cy + 3.6, "律", "")

    # 右上：倒置档案柜
    draw_rect(ax, cx + 4.0, cy + 3.6, 4.0, 2.6, OBJ_FACE["invert"], "机关2\n蓝的倒置柜\n反读编号=8", label_color="#fff", fontsize=7.3)
    draw_npc(ax, cx + 2.4, cy + 3.6, "晴", "")
    draw_npc(ax, cx + 5.6, cy + 3.6, "蓝", "")

    # 左下：镜像档案
    draw_rect(ax, cx - 4.0, cy - 3.6, 4.0, 2.6, OBJ_FACE["mirror"], "机关3\n镜像档案\n反读数字=0", label_color="#fff", fontsize=7.3)
    draw_npc(ax, cx - 5.6, cy - 3.6, "栞", "")
    draw_npc(ax, cx - 2.4, cy - 3.6, "鏡", "")

    # 右下：错乱散页（核心诡计所在象限）
    draw_rect(ax, cx + 4.0, cy - 3.6, 4.0, 2.6, OBJ_FACE["scatter"], "机关4\n错乱的日期\n缺的一天=1\n(核心诡计)", label_color="#2a2410", fontsize=6.8)
    draw_npc(ax, cx + 2.4, cy - 3.6, "希", "")
    draw_npc(ax, cx + 5.6, cy - 3.6, "律", "")
    draw_npc(ax, cx + 5.6, cy - 5.0, "蓝", "(找同一人)")

    draw_rect(ax, cx, cy - 6.0, 2.6, 1.0, "#9a8a6a", "入口", label_color="#fff", fontsize=8)

    for (dx, dy) in [(-1, 1), (1, 1), (-1, -1), (1, -1)]:
        ax.annotate("", xy=(cx + dx * 1.8, cy + dy * 1.8), xytext=(cx + dx * 1.0, cy + dy * 1.0),
                     arrowprops=dict(arrowstyle="->", color="#8a7a5a", lw=1.2))

    ax.text(0.3, 0.5, "路线：从入口进中央枢纽，四向可去四个机关（左上空白档案/右上倒置柜/左下镜像档案/右下散页），\n探完任意顺序后回中央输入密码；结构与闸1 V3/闸2机房环形引擎同构，开发测试效率最高",
            fontsize=7.3, color="#444")
    draw_legend_row(ax, W, H, y=0.5)
    save(fig, "gate4_layout_V3_四象限枢纽.png")


if __name__ == "__main__":
    v1()
    v2()
    v3()
