# -*- coding: utf-8 -*-
"""
闸3·黑暗房 俯视/剖面布局图（几何图形+文字说明占位版）
三个版本，供挑选：
  V1 嵌套直线型：配电间(亮)→黑走廊(暗)→储藏室(亮)→深处暗室(暗)，一条线、亮暗交替嵌套
  V2 双线会合型：配电间(亮,入口)分两路——核心区(暗,主角组)与辅助区(亮,啓组)，最终在深处暗室会合
  V3 十字错乱型：中心枢纽暗区向四方延伸，亮暗区交错分布，突出"门位错乱、记忆失效"的空间异常
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
    "鏡": "#8FA6C8",   # 主角，雾蓝银（已失明）
    "安澄": "#F0F0F0", # 浅灰白
    "光": "#FFD700",   # 金黄（带应急灯）
    "啓": "#9D7BD8",   # 神秘紫（失明）
    "構": "#F59E0B",   # 镜头橙
    "綴": "#F5E6C8",   # 米黄
}

ROOM_LIT = "#B8A98A"      # 亮区底色（暖灰）
ROOM_DARK = "#17161C"     # 暗区底色（近黑）
OBJ_FACE = {
    "handle": "#c9a227",   # 门把手（亮区机关3）
    "braille": "#3b3b46",  # 盲文墙（暗区机关1）
    "echo": "#26262e",     # 回声点（暗区机关2）
    "lamp": "#111116",     # 八盏灭灯（暗区机关4）
    "door": "#3b2a1a",     # 出口门
}


def draw_npc(ax, x, y, name, note="", text_color="#111"):
    c = NPC_COLOR[name]
    ax.add_patch(patches.Circle((x, y), 0.42, facecolor=c, edgecolor="#fff", linewidth=1.3, zorder=5))
    ax.text(x, y, name, ha="center", va="center", fontsize=9.5, fontweight="bold", color=text_color, zorder=6)
    if note:
        ax.text(x, y - 0.72, note, ha="center", va="top", fontsize=7, color="#ddd", zorder=6)


def draw_rect(ax, x, y, w, h, color, label, dashed=False, label_color="#fff", fontsize=8.5):
    ls = "--" if dashed else "-"
    ax.add_patch(patches.Rectangle((x - w / 2, y - h / 2), w, h, facecolor=color,
                                    edgecolor="#eee", linewidth=1.2, linestyle=ls, zorder=2))
    ax.text(x, y, label, ha="center", va="center", fontsize=fontsize, color=label_color, zorder=4)


def base_canvas(title, subtitle, w, h):
    fig, ax = plt.subplots(figsize=(9, 9 * h / w))
    ax.set_xlim(0, w)
    ax.set_ylim(0, h)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_facecolor("#2A2A30")
    fig.patch.set_facecolor("#2A2A30")
    ax.text(w / 2, h - 0.6, title, ha="center", va="center", fontsize=16, fontweight="bold", color="#fff")
    ax.text(w / 2, h - 1.25, subtitle, ha="center", va="center", fontsize=9, color="#bbb")
    return fig, ax


def draw_legend_row(ax, w, h, y=0.55):
    items = [
        ("亮区（灯正常）", ROOM_LIT),
        ("暗区（全黑）", ROOM_DARK),
        ("门把手(机关3)", OBJ_FACE["handle"]),
        ("盲文墙(机关1)", OBJ_FACE["braille"]),
        ("回声点(机关2)", OBJ_FACE["echo"]),
        ("八盏灭灯(机关4)", OBJ_FACE["lamp"]),
        ("出口密码锁", OBJ_FACE["door"]),
    ]
    n = len(items)
    step = (w - 1.0) / n
    for i, (label, color) in enumerate(items):
        x = 0.5 + i * step
        ax.add_patch(patches.Rectangle((x, y - 0.16), 0.3, 0.3, facecolor=color, edgecolor="#eee", linewidth=1))
        ax.text(x + 0.4, y, label, ha="left", va="center", fontsize=6.6, color="#ddd")


def save(fig, name):
    path = os.path.join(OUT_DIR, name)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print("saved", path)


# =========================================================
# V1 · 嵌套直线型（亮-暗-亮-暗 一条线套娃嵌套）
# =========================================================
def v1():
    W, H = 11, 22
    fig, ax = base_canvas("闸3·黑暗房 布局 V1", "嵌套直线型 · 配电间(亮)→黑走廊(暗)→储藏室(亮)→深处暗室(暗)，亮暗交替套娃嵌套", W, H)

    # R1 配电间（亮，最外层，机关3）
    draw_rect(ax, 5.5, 19.0, 9.5, 3.4, ROOM_LIT, "", dashed=True)
    ax.text(5.5, 20.6, "① 配电间（亮区，入口）", fontsize=9, color="#2a2410", ha="center", fontweight="bold")
    draw_rect(ax, 5.5, 18.3, 3.0, 1.0, OBJ_FACE["handle"], "机关3\n门把手(找金属)", label_color="#fff", fontsize=7.5)
    draw_npc(ax, 2.3, 18.3, "光", "数把手口述", text_color="#222")
    draw_npc(ax, 8.6, 18.3, "綴", "小声确认")
    draw_npc(ax, 1.2, 20.0, "構", "搀着啓")
    draw_npc(ax, 9.7, 20.0, "啓", "手欠乱摸")

    # R2 黑走廊（暗，机关1+2）
    draw_rect(ax, 5.5, 14.7, 8.3, 4.0, ROOM_DARK, "", dashed=True)
    ax.text(5.5, 16.5, "② 黑走廊（暗区）", fontsize=9, color="#ddd", ha="center", fontweight="bold")
    draw_rect(ax, 3.0, 14.3, 2.2, 1.1, OBJ_FACE["braille"], "机关1\n盲文墙\n(摸=3)", label_color="#fff", fontsize=7)
    draw_rect(ax, 8.0, 14.3, 2.2, 1.1, OBJ_FACE["echo"], "机关2\n回声\n(听=5)", label_color="#fff", fontsize=7)
    draw_npc(ax, 3.0, 13.0, "鏡", "摸墙(失明)")
    draw_npc(ax, 1.5, 13.4, "安澄", "搀扶引导")
    draw_npc(ax, 8.0, 13.0, "構", "拍手听回声")
    draw_npc(ax, 6.2, 13.4, "綴", "发颤跟随")

    # R3 储藏室（亮，过渡/flavor）
    draw_rect(ax, 5.5, 10.6, 7.0, 3.0, ROOM_LIT, "")
    ax.text(5.5, 12.0, "③ 储藏室（亮区，过渡）", fontsize=9, color="#2a2410", ha="center", fontweight="bold")
    ax.text(5.5, 10.5, "[啓手欠，碰到储藏室里悬浮的杂物]", fontsize=7.5, color="#2a2410", ha="center")
    draw_npc(ax, 3.3, 9.8, "啓", "摸到了什么")
    draw_npc(ax, 7.7, 9.8, "構", "別乱摸")

    # R4 深处暗室（暗，机关4+门）
    draw_rect(ax, 5.5, 5.8, 8.6, 5.0, ROOM_DARK, "")
    ax.text(5.5, 8.0, "④ 深处暗室（暗区，终点）", fontsize=9, color="#ddd", ha="center", fontweight="bold")
    draw_rect(ax, 3.2, 6.6, 2.2, 1.3, OBJ_FACE["lamp"], "机关4\n八盏灭灯\n(照=8)", label_color="#fff", fontsize=7)
    draw_rect(ax, 7.8, 5.2, 2.6, 1.6, OBJ_FACE["door"], "员工通道\n4位密码锁", label_color="#fff", fontsize=7.5)
    draw_npc(ax, 3.2, 5.0, "光", "举灯照天花板")
    draw_npc(ax, 5.3, 4.2, "構", "八盏灭灯感叹")
    draw_npc(ax, 1.6, 4.0, "鏡", "失明·等待")
    draw_npc(ax, 1.6, 7.3, "安澄", "急：别乱开")
    draw_npc(ax, 4.6, 6.8, "啓", "乱摸门把(诡计点)")
    draw_npc(ax, 8.8, 7.4, "綴", "发抖")

    ax.text(0.4, 1.2, "路线：严格单线——亮(配电间)→暗(黑走廊)→亮(储藏室)→暗(深处暗室)，\n每进一层空间感觉更深、更封闭，呼应「套娃式空间嵌套」", fontsize=8, color="#ccc")
    draw_legend_row(ax, W, H)
    save(fig, "gate3_layout_V1_嵌套直线.png")


# =========================================================
# V2 · 双线会合型（分组探索，核心区/辅助区，最终会合）
# =========================================================
def v2():
    W, H = 16, 14
    fig, ax = base_canvas("闸3·黑暗房 布局 V2", "双线会合型 · 配电间(亮,入口)分两路——核心区(暗,鏡组)／辅助区(亮,啓组)，最终深处暗室会合", W, H)

    # 入口配电间（亮，顶部居中）
    draw_rect(ax, 8, 12.0, 6.0, 1.6, ROOM_LIT, "入口 · 配电间（亮区）", label_color="#2a2410")
    draw_npc(ax, 6.2, 12.0, "安澄", "")
    draw_npc(ax, 9.8, 12.0, "構", "")

    # 左路：核心区（暗，鏡组：鏡+光+安澄）
    draw_rect(ax, 3.6, 7.5, 6.0, 7.0, ROOM_DARK, "")
    ax.text(3.6, 10.5, "核心区（暗区）· 组1：鏡＋光＋安澄", fontsize=8.5, color="#ddd", ha="center", fontweight="bold")
    draw_rect(ax, 3.6, 9.0, 2.2, 1.1, OBJ_FACE["braille"], "机关1\n盲文墙(=3)", label_color="#fff", fontsize=7)
    draw_rect(ax, 3.6, 6.8, 2.2, 1.1, OBJ_FACE["echo"], "机关2\n回声(=5)", label_color="#fff", fontsize=7)
    draw_npc(ax, 1.8, 9.0, "鏡", "摸墙")
    draw_npc(ax, 5.4, 9.0, "安澄", "搀扶")
    draw_npc(ax, 1.8, 6.8, "光", "带灯照明")
    draw_npc(ax, 3.6, 5.0, "鏡", "继续前行")

    # 右路：辅助区（亮，啓组：啓+構+綴）
    draw_rect(ax, 12.4, 7.5, 6.0, 7.0, ROOM_LIT, "")
    ax.text(12.4, 10.5, "辅助区（亮区）· 组2：啓＋構＋綴", fontsize=8.5, color="#2a2410", ha="center", fontweight="bold")
    draw_rect(ax, 12.4, 9.0, 2.6, 1.1, OBJ_FACE["handle"], "机关3\n门把手(=1)", label_color="#fff", fontsize=7)
    draw_npc(ax, 10.6, 9.0, "構", "口述把手")
    draw_npc(ax, 14.2, 9.0, "綴", "小声确认")
    draw_npc(ax, 12.4, 7.0, "啓", "手欠乱摸(失明)")
    draw_npc(ax, 12.4, 5.0, "構", "继续前行")

    # 会合：深处暗室
    draw_rect(ax, 8, 2.2, 8.0, 3.2, ROOM_DARK, "")
    ax.text(8, 3.6, "会合点 · 深处暗室（暗区）", fontsize=9, color="#ddd", ha="center", fontweight="bold")
    draw_rect(ax, 5.8, 1.6, 2.2, 1.1, OBJ_FACE["lamp"], "机关4\n八盏灭灯(=8)", label_color="#fff", fontsize=6.8)
    draw_rect(ax, 10.2, 1.6, 2.4, 1.3, OBJ_FACE["door"], "员工通道\n密码锁", label_color="#fff", fontsize=7)
    draw_npc(ax, 4.2, 2.6, "光", "举灯")
    draw_npc(ax, 7.0, 2.8, "安澄", "")
    draw_npc(ax, 9.0, 3.0, "構", "")
    draw_npc(ax, 11.8, 3.0, "綴", "")
    draw_npc(ax, 8.0, 0.9, "啓", "诡计点·乱开门")

    ax.annotate("", xy=(5.6, 4.5), xytext=(6.5, 5.0), arrowprops=dict(arrowstyle="->", color="#ccc", lw=1.4))
    ax.annotate("", xy=(10.4, 4.5), xytext=(9.5, 5.0), arrowprops=dict(arrowstyle="->", color="#ccc", lw=1.4))

    ax.text(0.4, 12.8, "路线：从配电间分两路同时探索（左暗/右亮），\n两组各自摸完2个/1个机关后，在底部深处暗室会合、共同面对机关4和出口", fontsize=7.6, color="#ccc")
    draw_legend_row(ax, W, H, y=0.45)
    save(fig, "gate3_layout_V2_双线会合.png")


# =========================================================
# V3 · 十字错乱型（中心暗枢纽向四方延伸，亮暗交错、方向易错乱）
# =========================================================
def v3():
    W, H = 14, 14
    fig, ax = base_canvas("闸3·黑暗房 布局 V3", "十字错乱型 · 中心暗枢纽向四方延伸，亮暗区交错分布，突出「门位错乱、记忆失效」的空间异常", W, H)

    cx, cy = 7, 7.2

    # 中心枢纽（全黑，纯通道，无机关）
    draw_rect(ax, cx, cy, 2.6, 2.6, "#0c0b10", "枢纽\n(全黑，四向门\n位置易记混)", label_color="#999", fontsize=7.5)
    draw_npc(ax, cx, cy - 1.7, "鏡", "在枢纽等待", text_color="#222")

    # 北：黑走廊（暗，机关1+2）
    draw_rect(ax, cx, cy + 3.6, 5.0, 3.2, ROOM_DARK, "")
    ax.text(cx, cy + 5.0, "北 · 黑走廊（暗区）", fontsize=8.5, color="#ddd", ha="center", fontweight="bold")
    draw_rect(ax, cx - 1.3, cy + 3.4, 1.8, 1.0, OBJ_FACE["braille"], "机关1\n(=3)", label_color="#fff", fontsize=7)
    draw_rect(ax, cx + 1.3, cy + 3.4, 1.8, 1.0, OBJ_FACE["echo"], "机关2\n(=5)", label_color="#fff", fontsize=7)
    draw_npc(ax, cx - 1.3, cy + 2.6, "安澄", "")
    draw_npc(ax, cx + 1.3, cy + 2.6, "構", "")

    # 东：配电间（亮，机关3）
    draw_rect(ax, cx + 3.8, cy, 3.6, 3.0, ROOM_LIT, "")
    ax.text(cx + 3.8, cy + 1.7, "东 · 配电间（亮区）", fontsize=8.5, color="#2a2410", ha="center", fontweight="bold")
    draw_rect(ax, cx + 3.8, cy - 0.3, 2.4, 1.1, OBJ_FACE["handle"], "机关3\n门把手(=1)", label_color="#fff", fontsize=7)
    draw_npc(ax, cx + 2.6, cy + 0.6, "光", "")
    draw_npc(ax, cx + 5.0, cy + 0.6, "綴", "")

    # 西：储藏室（亮，flavor，啓组经过）
    draw_rect(ax, cx - 3.8, cy, 3.6, 3.0, ROOM_LIT, "")
    ax.text(cx - 3.8, cy + 1.7, "西 · 储藏室（亮区）", fontsize=8.5, color="#2a2410", ha="center", fontweight="bold")
    ax.text(cx - 3.8, cy - 0.3, "[悬浮杂物，啓手欠碰一下]", fontsize=7, color="#2a2410", ha="center")
    draw_npc(ax, cx - 3.8, cy + 0.6, "啓", "乱摸(失明)")

    # 南：深处暗室（暗，机关4+出口门）—— 远端，不与枢纽直接相邻，呼应"错乱"
    draw_rect(ax, cx, cy - 4.4, 6.4, 3.4, ROOM_DARK, "")
    ax.text(cx, cy - 3.0, "南 · 深处暗室（暗区，终点）", fontsize=8.5, color="#ddd", ha="center", fontweight="bold")
    draw_rect(ax, cx - 1.8, cy - 4.6, 2.0, 1.1, OBJ_FACE["lamp"], "机关4\n(=8)", label_color="#fff", fontsize=7)
    draw_rect(ax, cx + 1.8, cy - 4.6, 2.4, 1.3, OBJ_FACE["door"], "员工通道\n密码锁", label_color="#fff", fontsize=7)
    draw_npc(ax, cx - 0.2, cy - 5.6, "光", "举灯")
    draw_npc(ax, cx + 0.6, cy - 3.6, "安澄", "")
    draw_npc(ax, cx - 2.6, cy - 3.6, "構", "")
    draw_npc(ax, cx + 3.0, cy - 5.3, "啓", "诡计点")

    for (dx, dy) in [(0, 1.5), (1.5, 0), (-1.5, 0), (0, -1.5)]:
        ax.annotate("", xy=(cx + dx * 1.3, cy + dy * 1.3), xytext=(cx + dx * 0.6, cy + dy * 0.6),
                     arrowprops=dict(arrowstyle="->", color="#888", lw=1.1, linestyle="--"))

    ax.text(0.3, 0.6, "路线：从枢纽可去北/东/西任一方向探机关，但南向的深处暗室不与枢纽直接相邻（要绕経其他区），\n门的方位全部靠「摸/听」重新确认——玩家若凭直觉记位置，极易走错，呼应「记忆失效」的核心诡计", fontsize=7.4, color="#ccc")
    save(fig, "gate3_layout_V3_十字错乱.png")


if __name__ == "__main__":
    v1()
    v2()
    v3()
