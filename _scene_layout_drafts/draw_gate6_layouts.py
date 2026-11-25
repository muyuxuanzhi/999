# -*- coding: utf-8 -*-
"""
闸6·医务室 俯视布局图（几何图形+文字说明占位版）
三个版本，供挑选：
  V1 一字病床长廊型：沿墙排开四张诊疗床位对应四个机关，安澄随队纠正时间感，线性推进，最贴合"钟表乱如麻的病房"字面设定
  V2 双通道对照型：诊疗区分「错乱诊疗区」与「安澄诊疗台」两条平行通道，安澄坐镇中央可随时对照纠正，呼应"信谁的时间"核心诡计
  V3 四向环形枢纽型：中央出口枢纽，四条病区短廊向外辐射，复用闸1/闸2/闸4/闸5验证过的多视角引擎，成本最低
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
    "安澄": "#4FB8A6",   # 时间基准(唯一正常人)，温润青色突出
    "花咲": "#E8779F",   # 时间错乱·乐天型，派对的时间
    "零":   "#4A6FD4",   # 时间错乱·技术型，系统时钟
    "鈴":   "#8A6B5C",   # 时间错乱·沉默守护者，拧螺丝
    "光":   "#C9A227",   # 时间错乱·偶像型，舞台的时间
}

OBJ_FACE = {
    "clock_rev": "#5c4a7a",   # 机关1·倒走的挂钟
    "clock_mix": "#7a93b8",   # 机关2·重叠的钟
    "bottle":    "#3a8f6b",   # 机关3·漂浮的药瓶
    "chart":     "#b06a3a",   # 机关4·体检单(安澄)
    "door":      "#241f33",  # 出口门
}


def draw_npc(ax, x, y, name, note="", text_color="#fff", highlight=False):
    c = NPC_COLOR[name]
    if highlight:
        ax.add_patch(patches.Circle((x, y), 0.5, facecolor="none", edgecolor=c, linewidth=1.4, zorder=4))
    ax.add_patch(patches.Circle((x, y), 0.4, facecolor=c, edgecolor="#fff", linewidth=1.3, zorder=5))
    ax.text(x, y, name, ha="center", va="center", fontsize=9, fontweight="bold", color=text_color, zorder=6)
    if note:
        ax.text(x, y - 0.68, note, ha="center", va="top", fontsize=6.8, color="#444", zorder=6)


def draw_rect(ax, x, y, w, h, color, label, dashed=False, label_color="#fff", fontsize=8.5):
    ls = "--" if dashed else "-"
    ax.add_patch(patches.Rectangle((x - w / 2, y - h / 2), w, h, facecolor=color,
                                    edgecolor="#333", linewidth=1.2, linestyle=ls, zorder=2))
    ax.text(x, y, label, ha="center", va="center", fontsize=fontsize, color=label_color, zorder=4)


def base_canvas(title, subtitle, w, h, bg="#e8ecef"):
    fig, ax = plt.subplots(figsize=(9, 9 * h / w))
    ax.set_xlim(0, w)
    ax.set_ylim(0, h)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_facecolor(bg)
    fig.patch.set_facecolor(bg)
    ax.text(w / 2, h - 0.6, title, ha="center", va="center", fontsize=16, fontweight="bold", color="#1a1a2a")
    ax.text(w / 2, h - 1.25, subtitle, ha="center", va="center", fontsize=9, color="#444")
    return fig, ax


def draw_legend_row(ax, w, h, y=0.55, text_color="#333"):
    items = [
        ("倒走挂钟(机关1)", OBJ_FACE["clock_rev"]),
        ("重叠的钟(机关2)", OBJ_FACE["clock_mix"]),
        ("漂浮药瓶(机关3)", OBJ_FACE["bottle"]),
        ("体检单(机关4)", OBJ_FACE["chart"]),
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
# V1 · 一字病床长廊型（沿墙排开四张诊疗床位，依次对应四个机关，线性推进）
# =========================================================
def v1():
    W, H = 20, 9
    fig, ax = base_canvas("闸6·医务室 布局 V1", "一字病床长廊型 · 沿墙排开四张诊疗床位依次对应四个机关，安澄随队纠正时间感，最贴合「钟表乱如麻的病房」的线性压迫感", W, H)

    ax.add_patch(patches.Rectangle((0.6, 2.6), W - 2.6, 3.4, facecolor="#d6dadf", edgecolor="#333", linewidth=1.2, zorder=1))
    ax.text(W / 2, 6.5, "— 墙上挂满钟表，有快有慢，有倒走有静止 —", ha="center", fontsize=7.5, color="#5a5a6a")

    draw_rect(ax, 1.4, 4.3, 1.3, 2.2, "#9a8a6a", "入口", label_color="#fff", fontsize=7.5)

    draw_rect(ax, 4.6, 4.3, 2.2, 2.0, OBJ_FACE["clock_rev"], "机关1\n倒走挂钟\n反读=3", fontsize=7.3)
    draw_npc(ax, 4.6, 2.0, "鈴", "指着倒走的钟，摇头")
    draw_npc(ax, 4.6, 7.0, "安澄", "反过来读，是三点", highlight=True)

    draw_rect(ax, 8.4, 4.3, 2.2, 2.0, OBJ_FACE["clock_mix"], "机关2\n重叠的钟\n找对齐=1", fontsize=7.3)
    draw_npc(ax, 8.4, 2.0, "零", "指针全乱，系统也帮不上忙")
    draw_npc(ax, 8.4, 7.0, "安澄", "只有一个是对的", highlight=True)

    draw_rect(ax, 12.2, 4.3, 2.2, 2.0, OBJ_FACE["bottle"], "机关3\n漂浮药瓶\n剂量=5", fontsize=7.0)
    draw_npc(ax, 12.2, 2.0, "花咲", "这些瓶子在飘诶！")
    draw_npc(ax, 12.2, 7.0, "安澄", "剂量，五。别碰", highlight=True)

    draw_rect(ax, 16.0, 4.3, 2.4, 2.4, OBJ_FACE["chart"], "机关4\n体检单\n真实时长尾数=0\n(核心诡计)", fontsize=6.4)
    draw_npc(ax, 16.0, 1.8, "光", "连心跳都慢了吗……")
    draw_npc(ax, 16.0, 7.2, "安澄", "心率代谢，骗不了人", highlight=True)

    draw_rect(ax, 18.7, 4.3, 1.6, 2.6, OBJ_FACE["door"], "员工通道\n密码锁", fontsize=7.3)

    ax.text(0.3, 0.6, "路线：从入口起沿病床长廊依次前进，机关1→2→3→4强制顺序通过，安澄全程随队纠正「感觉」，\n走到体检单处触发「信体检单还是信感觉」核心诡计后才到密码锁；线性压迫感最强，但探索自由度最低", fontsize=7.3, color="#444")
    draw_legend_row(ax, W, H, y=1.0)
    save(fig, "gate6_layout_V1_一字病床长廊.png")


# =========================================================
# V2 · 双通道对照型（错乱诊疗区 / 安澄诊疗台 两条平行通道，呼应"信谁的时间"）
# =========================================================
def v2():
    W, H = 15, 11
    fig, ax = base_canvas("闸6·医务室 布局 V2", "双通道对照型 · 诊疗区分「错乱诊疗区」与「安澄诊疗台」两条平行通道，安澄坐镇中央过道可随时对照纠正，呼应「信谁的时间」核心诡计", W, H, bg="#eef1f0")

    # 上通道：错乱诊疗区（机关1倒走挂钟 + 机关2重叠的钟）
    draw_rect(ax, W / 2, H - 2.7, W - 2.0, 2.6, "#dfe3dc", "错乱诊疗区（花咲 / 零 / 鈴 / 光 轮流值守）", label_color="#1a2a2a", fontsize=8)
    draw_rect(ax, 3.6, H - 2.7, 3.4, 1.8, OBJ_FACE["clock_rev"], "机关1\n倒走挂钟\n反读=3", fontsize=6.8)
    draw_npc(ax, 1.8, H - 2.7, "鈴", "")
    draw_rect(ax, 11.4, H - 2.7, 3.4, 1.8, OBJ_FACE["clock_mix"], "机关2\n重叠的钟\n找对齐=1", fontsize=6.8)
    draw_npc(ax, 13.2, H - 2.7, "零", "")

    # 中央过道：安澄诊疗台（可左右移动来回对照，入口也在此）
    draw_rect(ax, 1.4, H / 2 - 0.1, 1.3, 2.0, "#9a8a6a", "入口", label_color="#fff", fontsize=7.2)
    ax.plot([2.4, W - 1.0], [H / 2 - 0.1, H / 2 - 0.1], color="#4FB8A6", linewidth=2.2, linestyle=":", zorder=1)
    draw_npc(ax, 7.5, H / 2 - 0.1, "安澄", "中央过道来回走动，随时对照纠正", highlight=True)
    ax.text(7.5, H / 2 + 0.75, "↑ 对照错乱诊疗区　　↓ 对照花咲/光诊疗台", ha="center", fontsize=6.6, color="#2f7a6e")

    # 下通道：花咲/光诊疗台（机关3漂浮药瓶 + 机关4体检单）
    draw_rect(ax, W / 2, 2.6, W - 2.0, 2.6, "#e6ded0", "安澄诊疗台（药瓶与体检单所在）", label_color="#2a1a0a", fontsize=8)
    draw_rect(ax, 3.6, 2.6, 3.4, 1.8, OBJ_FACE["bottle"], "机关3\n漂浮药瓶\n剂量=5", fontsize=6.8)
    draw_npc(ax, 1.8, 2.6, "花咲", "")
    draw_rect(ax, 11.4, 2.6, 3.4, 1.8, OBJ_FACE["chart"], "机关4\n体检单\n真实时长=0\n(核心诡计)", fontsize=6.2)
    draw_npc(ax, 13.2, 2.6, "光", "")

    draw_rect(ax, W - 1.0, H / 2 - 0.1, 1.6, 2.2, OBJ_FACE["door"], "员工\n通道\n密码锁", fontsize=6.8)

    ax.text(0.2, 0.3, "路线：从入口进中央过道，向上可去「错乱诊疗区」（机关1/2），向下可去「安澄诊疗台」（机关3/4）；\n安澄始终守在中央过道，玩家每解一个机关都能立刻回来对照「他说的时间对不对」，强化「唯一基准点」的空间隐喻；\n两区探索顺序自由，解完全部4个回中央过道右侧开锁",
            fontsize=7.0, color="#444")
    draw_legend_row(ax, W, H, y=0.0 + 0.9)
    save(fig, "gate6_layout_V2_双通道对照.png")


# =========================================================
# V3 · 四向环形枢纽型（中央出口枢纽+四条病区短廊辐射，复用验证过的引擎，成本最低）
# =========================================================
def v3():
    W, H = 14, 14
    fig, ax = base_canvas("闸6·医务室 布局 V3", "四向环形枢纽型 · 中央出口枢纽，四条病区短廊向外辐射，安澄居中可随时响应，复用闸1/闸2/闸4/闸5验证过的多视角引擎", W, H)

    cx, cy = 7, 7.2

    draw_rect(ax, cx, cy, 3.0, 2.2, OBJ_FACE["door"], "员工通道\n(中央枢纽)\n密码锁", fontsize=8)
    draw_npc(ax, cx, cy + 1.5, "安澄", "居中值守，随时对照", highlight=True)

    # 上：倒走挂钟
    draw_rect(ax, cx, cy + 4.2, 3.8, 2.4, OBJ_FACE["clock_rev"], "机关1\n倒走挂钟\n反读=3", fontsize=7.3)
    draw_npc(ax, cx - 1.6, cy + 4.2, "鈴", "")

    # 右：重叠的钟
    draw_rect(ax, cx + 4.6, cy, 2.4, 3.8, OBJ_FACE["clock_mix"], "机关2\n重叠的钟\n找对齐=1", fontsize=7.3)
    draw_npc(ax, cx + 4.6, cy + 1.6, "零", "")

    # 左：漂浮药瓶
    draw_rect(ax, cx - 4.6, cy, 2.4, 3.8, OBJ_FACE["bottle"], "机关3\n漂浮药瓶\n剂量=5", fontsize=7.3)
    draw_npc(ax, cx - 4.6, cy + 1.6, "花咲", "")

    # 下：体检单（核心诡计所在方向）
    draw_rect(ax, cx, cy - 4.2, 3.8, 2.4, OBJ_FACE["chart"], "机关4\n体检单\n真实时长=0\n(核心诡计)", fontsize=6.8)
    draw_npc(ax, cx - 1.6, cy - 4.2, "光", "连心跳都慢了吗……")
    draw_npc(ax, cx + 1.6, cy - 5.6, "安澄", "心率代谢，骗不了人", highlight=True)

    draw_rect(ax, cx, cy - 6.3, 2.6, 1.0, "#9a8a6a", "入口", label_color="#fff", fontsize=8)

    for (dx, dy) in [(0, 1), (1, 0), (-1, 0), (0, -1)]:
        ax.annotate("", xy=(cx + dx * 2.2, cy + dy * 2.2), xytext=(cx + dx * 1.0, cy + dy * 1.0),
                     arrowprops=dict(arrowstyle="->", color="#5a6a8a", lw=1.2))

    ax.text(0.3, 0.5, "路线：从入口进中央枢纽，四向可去四条病区短廊（上倒走挂钟/右重叠的钟/左漂浮药瓶/下体检单），\n安澄居中可随时响应纠正，任意顺序探完回枢纽输入密码；与闸1 V3/闸2/闸4/闸5 V3同构，开发测试效率最高、风险最低",
            fontsize=7.3, color="#444")
    draw_legend_row(ax, W, H, y=0.5)
    save(fig, "gate6_layout_V3_四向环形枢纽.png")


if __name__ == "__main__":
    v1()
    v2()
    v3()
