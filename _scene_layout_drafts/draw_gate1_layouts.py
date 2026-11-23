# -*- coding: utf-8 -*-
"""
闸1·茶水间 俯视/剖面布局图（几何图形+文字说明占位版）
三个版本，供挑选：
  V1 左右对半型：一条中线把房间分成左右两半（呼应主题「半」），左半=杯架+咖啡机，右半=镜像冰箱+水槽
  V2 垂直分层型：强调「天花板望不到顶」——分地面层/半空层/天花板层三层垂直视角，镜像冰箱作为连接入口
  V3 四角环绕型：中央出口枢纽，四个机关分布四角，结构最简单直接，适合作为基础版本快速实现
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
    "蓝": "#4A6FD4",   # 水無瀬藍，蓝（失语）
    "翔": "#E8563A",   # 荒波翔，朱红（触觉失能）
    "花咲": "#FF9EC4", # 花咲樂，樱花粉
    "澪": "#2EC4B6",   # 深海澪，海青
    "希": "#6B8E23",   # 早苗希，叶绿
}

OBJ_FACE = {
    "cups": "#a67b5b",     # 倒置杯架（机关1）
    "coffee": "#6b7280",   # 漂浮咖啡机（机关2）
    "mirror": "#4a6fd4",   # 镜像冰箱（机关3）
    "sink": "#2ec4b6",     # 反重力水槽（机关4）
    "door": "#3b2a1a",     # 出口门
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


def base_canvas(title, subtitle, w, h, bg="#EDE6DA"):
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
        ("倒置杯架(机关1)", OBJ_FACE["cups"]),
        ("漂浮咖啡机(机关2)", OBJ_FACE["coffee"]),
        ("镜像冰箱(机关3)", OBJ_FACE["mirror"]),
        ("反重力水槽(机关4)", OBJ_FACE["sink"]),
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
# V1 · 左右对半型（呼应主题「半」：一条中线分左右两半）
# =========================================================
def v1():
    W, H = 14, 16
    fig, ax = base_canvas("闸1·茶水间 布局 V1", "左右对半型 · 一条中线把房间分成左右两半，呼应主题「半」——左半现实区／右半镜像区", W, H)

    # 中线
    ax.plot([W / 2, W / 2], [1.2, H - 2.0], color="#8a7a5a", linewidth=2, linestyle=":", zorder=1)
    ax.text(W / 2, H - 1.9, "— 对半中线 —", ha="center", fontsize=8, color="#8a7a5a")

    # 左半：现实区（入口 + 杯架 + 咖啡机）
    draw_rect(ax, 3.4, H - 3.2, 6.0, 1.4, "#d8c9a8", "入口（现实区）", label_color="#2a2410")
    draw_rect(ax, 3.4, H - 6.4, 4.4, 3.0, OBJ_FACE["cups"], "机关1\n倒置杯架(天花板)\n数渍杯=3", label_color="#fff", fontsize=7.5)
    draw_npc(ax, 1.3, H - 6.4, "澪", "数不清杯渍")
    draw_npc(ax, 5.6, H - 6.4, "希", "数出=3")

    draw_rect(ax, 3.4, H - 10.2, 4.4, 3.0, OBJ_FACE["coffee"], "机关2\n漂浮咖啡机\n水位50%=5", label_color="#fff", fontsize=7.5)
    draw_npc(ax, 1.3, H - 10.2, "翔", "摸到\"凉的\"")
    draw_npc(ax, 5.6, H - 10.2, "花咲", "勾扫帚")

    # 右半：镜像区（冰箱 + 水槽 + 出口）
    draw_rect(ax, 10.6, H - 3.2, 6.0, 1.4, "#ccd6e8", "镜像区（倒置茶水间）", label_color="#1a2a4a")
    draw_rect(ax, 10.6, H - 6.4, 4.4, 3.0, OBJ_FACE["mirror"], "机关3\n镜像冰箱\n反读钟表=2", label_color="#fff", fontsize=7.5)
    draw_npc(ax, 8.5, H - 6.4, "蓝", "僵住·摇头(失语)")
    draw_npc(ax, 12.7, H - 6.4, "澪", "钟是反的？")

    draw_rect(ax, 10.6, H - 10.2, 4.4, 3.0, OBJ_FACE["sink"], "机关4\n反重力水槽\n半杯水珠=7", label_color="#fff", fontsize=7.5)
    draw_npc(ax, 8.5, H - 10.2, "蓝", "比划\"一半\"(核心诡计)")
    draw_npc(ax, 12.7, H - 10.2, "希", "别倒满出来")

    # 底部：出口（跨中线，门\"歪斜嵌在交界处\"）
    draw_rect(ax, W / 2, 1.8, 3.0, 1.6, OBJ_FACE["door"], "员工通道\n(歪嵌中线交界)\n密码锁", label_color="#fff", fontsize=7.5)

    ax.text(0.3, 0.6, "路线：左半（杯架→咖啡机）与右半（冰箱→水槽）对称分布，出口刻意卡在中线交界处，\n呼应「门被拧了半圈」的设定；镜像区视觉风格可与现实区做冷暖/明暗区分", fontsize=7.6, color="#444")
    draw_legend_row(ax, W, H)
    save(fig, "gate1_layout_V1_左右对半.png")


# =========================================================
# V2 · 垂直分层型（强调天花板望不到顶：地面层/半空层/天花板层）
# =========================================================
def v2():
    W, H = 12, 20
    fig, ax = base_canvas("闸1·茶水间 布局 V2", "垂直分层型 · 强调「天花板望不到顶」——地面层→半空层→天花板层三层仰视嵌套", W, H, bg="#E2D9C8")

    # 天花板层（最上，倒置杯架）
    draw_rect(ax, 6, 18.2, 10, 3.0, "#cbb48a", "")
    ax.text(6, 19.6, "天花板层（倒吊物件，仰视）", fontsize=9.5, color="#2a2410", ha="center", fontweight="bold")
    draw_rect(ax, 6, 17.6, 4.6, 1.6, OBJ_FACE["cups"], "机关1\n倒置杯架\n数渍杯=3", label_color="#fff", fontsize=7.5)
    draw_npc(ax, 2.7, 17.6, "澪", "抬头吓一跳")
    draw_npc(ax, 9.3, 17.6, "希", "敏感数渍圈")

    ax.annotate("", xy=(6, 16.3), xytext=(6, 15.3), arrowprops=dict(arrowstyle="->", color="#8a7a5a", lw=1.6))
    ax.text(6.6, 15.8, "借地板积水\n倒影看清杯底", fontsize=6.5, color="#8a7a5a")

    # 半空层（中间，漂浮咖啡机 + 镜像冰箱入口）
    draw_rect(ax, 6, 12.0, 10.5, 5.4, "#d8cdb4", "")
    ax.text(6, 14.5, "半空层（悬浮物件 + 镜像入口）", fontsize=9.5, color="#2a2410", ha="center", fontweight="bold")
    draw_rect(ax, 3.2, 11.8, 3.6, 2.2, OBJ_FACE["coffee"], "机关2\n漂浮咖啡机\n水位50%=5", label_color="#fff", fontsize=7)
    draw_npc(ax, 1.4, 11.0, "翔", "勾咖啡机\n摸到\"凉的\"")
    draw_npc(ax, 4.6, 10.3, "花咲", "拿扫帚勾")

    draw_rect(ax, 9.2, 11.8, 3.6, 2.4, OBJ_FACE["mirror"], "机关3\n镜像冰箱\n(门内另一间倒置房)\n反读钟表=2", label_color="#fff", fontsize=6.8)
    draw_npc(ax, 7.6, 10.5, "蓝", "僵住·摇头")
    draw_npc(ax, 10.8, 10.5, "澪", "钟是反的")

    ax.annotate("", xy=(6, 9.0), xytext=(6, 8.0), arrowprops=dict(arrowstyle="->", color="#8a7a5a", lw=1.6))

    # 地面层（最下，入口 + 水槽 + 出口）
    draw_rect(ax, 6, 4.6, 10.5, 6.8, "#e6ddc8", "")
    ax.text(6, 8.0, "地面层（入口 + 核心诡计 + 出口）", fontsize=9.5, color="#2a2410", ha="center", fontweight="bold")
    draw_rect(ax, 6, 7.0, 3.0, 1.0, "#9a8a6a", "入口", label_color="#fff", fontsize=8)
    draw_rect(ax, 3.4, 4.6, 4.0, 2.4, OBJ_FACE["sink"], "机关4\n反重力水槽\n半杯水珠=7", label_color="#fff", fontsize=7.5)
    draw_npc(ax, 1.6, 4.6, "蓝", "比划\"一半\"\n(核心诡计)")
    draw_npc(ax, 5.2, 3.6, "希", "别倒满")
    draw_npc(ax, 5.2, 5.6, "翔", "摸到烫的\n却说\"凉的\"")

    draw_rect(ax, 9.3, 2.0, 2.8, 1.6, OBJ_FACE["door"], "员工通道\n密码锁", label_color="#fff", fontsize=7.5)

    ax.text(0.3, 1.0, "路线：进门先在地面层接触核心诡计(水槽)，再抬头/借倒影逐层往上看清\n半空层和天花板层的机关，每层都要\"仰望\"才能看清，强化空间被拉伸的压迫感", fontsize=7, color="#444")
    draw_legend_row(ax, W, H, y=0.4)
    save(fig, "gate1_layout_V2_垂直分层.png")


# =========================================================
# V3 · 四角环绕型（中央出口枢纽，结构最简单直接）
# =========================================================
def v3():
    W, H = 14, 14
    fig, ax = base_canvas("闸1·茶水间 布局 V3", "四角环绕型 · 中央出口枢纽，四个机关分布四角，结构最简单直接，复用闸2机房引擎成本最低", W, H)

    cx, cy = 7, 7.2

    # 中央：出口密码锁（居中，视线可见四角）
    draw_rect(ax, cx, cy, 3.0, 2.2, OBJ_FACE["door"], "员工通道\n(中央，歪嵌地板)\n密码锁", label_color="#fff", fontsize=8)

    # 左上：倒置杯架
    draw_rect(ax, cx - 4.0, cy + 3.6, 4.0, 2.6, OBJ_FACE["cups"], "机关1\n倒置杯架\n数渍杯=3", label_color="#fff", fontsize=7.5)
    draw_npc(ax, cx - 5.6, cy + 3.6, "澪", "")
    draw_npc(ax, cx - 2.4, cy + 3.6, "希", "")

    # 右上：漂浮咖啡机
    draw_rect(ax, cx + 4.0, cy + 3.6, 4.0, 2.6, OBJ_FACE["coffee"], "机关2\n漂浮咖啡机\n水位50%=5", label_color="#fff", fontsize=7.5)
    draw_npc(ax, cx + 2.4, cy + 3.6, "翔", "")
    draw_npc(ax, cx + 5.6, cy + 3.6, "花咲", "")

    # 左下：反重力水槽（核心诡计，靠近入口）
    draw_rect(ax, cx - 4.0, cy - 3.6, 4.0, 2.6, OBJ_FACE["sink"], "机关4\n反重力水槽\n半杯水珠=7\n(核心诡计)", label_color="#fff", fontsize=7)
    draw_npc(ax, cx - 5.6, cy - 3.6, "蓝", "")
    draw_npc(ax, cx - 2.4, cy - 3.6, "希", "")

    # 右下：镜像冰箱
    draw_rect(ax, cx + 4.0, cy - 3.6, 4.0, 2.6, OBJ_FACE["mirror"], "机关3\n镜像冰箱\n反读钟表=2", label_color="#fff", fontsize=7.5)
    draw_npc(ax, cx + 2.4, cy - 3.6, "蓝", "")
    draw_npc(ax, cx + 5.6, cy - 3.6, "澪", "")

    # 入口（从下方进入枢纽）
    draw_rect(ax, cx, cy - 6.0, 2.6, 1.0, "#9a8a6a", "入口", label_color="#fff", fontsize=8)

    for (dx, dy) in [(-1, 1), (1, 1), (-1, -1), (1, -1)]:
        ax.annotate("", xy=(cx + dx * 1.8, cy + dy * 1.8), xytext=(cx + dx * 1.0, cy + dy * 1.0),
                     arrowprops=dict(arrowstyle="->", color="#8a7a5a", lw=1.2))

    ax.text(0.3, 0.5, "路线：从入口进中央枢纽，枢纽四向可去四个机关（左上杯架/右上咖啡机/左下水槽/右下冰箱），\n探完任意顺序后回中央输入密码；结构与闸2机房的环形回环类似，最容易复用现有多视角引擎实现", fontsize=7.4, color="#444")
    draw_legend_row(ax, W, H, y=0.5)
    save(fig, "gate1_layout_V3_四角环绕.png")


if __name__ == "__main__":
    v1()
    v2()
    v3()
