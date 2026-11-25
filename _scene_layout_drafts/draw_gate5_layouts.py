# -*- coding: utf-8 -*-
"""
闸5·镜像走廊 俯视布局图（几何图形+文字说明占位版）
三个版本，供挑选：
  V1 直线长廊型：一条走不到头的长廊，四个机关依次排开，尽头岔路+员工通道，最贴合"一条镜面迷宫"的字面设定
  V2 镜中对称长廊型：一面整墙镜子把长廊劈成「现实半廊」与「镜中半廊」，两侧各2个机关，呼应"镜像重叠"异常
  V3 四向环形枢纽型：中央出口枢纽，四条镜面短廊向外辐射，复用闸1/闸2/闸4验证过的引擎，成本最低
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
    "構": "#5c7a8a",   # 方向错乱·导演型，镜头审视
    "綴": "#b08968",   # 方向错乱·缝补伏线
    "翔": "#f2c14e",   # 方向参照物(唯一正常人)，暖金色突出
    "澪": "#3a8fb7",   # 方向错乱·潜水科普
    "啓": "#9c6b9e",   # 方向错乱·占卜预言，手欠
}

OBJ_FACE = {
    "digit": "#6b5b95",   # 机关1·镜面反写数字
    "clock": "#7a5c3e",   # 机关2·颠倒挂钟
    "chair": "#4a6fd4",   # 机关3·镜像重叠物体(椅子)
    "fork": "#c9a227",    # 机关4·方向错乱岔路
    "door": "#241f33",    # 出口门
}


def draw_npc(ax, x, y, name, note="", text_color="#fff"):
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


def base_canvas(title, subtitle, w, h, bg="#dfe4ea"):
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
        ("反写数字(机关1)", OBJ_FACE["digit"]),
        ("颠倒挂钟(机关2)", OBJ_FACE["clock"]),
        ("重叠椅子(机关3)", OBJ_FACE["chair"]),
        ("错乱岔路(机关4)", OBJ_FACE["fork"]),
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
# V1 · 直线长廊型（一条走不到头的长廊，四个机关依次排开，尽头岔路+出口）
# =========================================================
def v1():
    W, H = 20, 9
    fig, ax = base_canvas("闸5·镜像走廊 布局 V1", "直线长廊型 · 一条走不到头的长廊，四个机关依次排开，尽头分岔后才是员工通道，最贴合「镜面迷宫」的字面设定", W, H)

    # 长廊地面
    ax.add_patch(patches.Rectangle((0.6, 2.6), W - 2.6, 3.4, facecolor="#c7cedb", edgecolor="#333", linewidth=1.2, zorder=1))
    # 两侧镜墙（虚线表示镜面）
    ax.plot([0.6, W - 2.0], [2.6, 2.6], color="#8FA6C8", linewidth=2.0, linestyle=":", zorder=1)
    ax.plot([0.6, W - 2.0], [6.0, 6.0], color="#8FA6C8", linewidth=2.0, linestyle=":", zorder=1)
    ax.text(W / 2, 6.5, "— 两侧整面镜墙，倒影与现实重叠 —", ha="center", fontsize=7.5, color="#4a5a7a")

    draw_rect(ax, 1.4, 4.3, 1.3, 2.2, "#9a8a6a", "入口", label_color="#fff", fontsize=7.5)

    draw_rect(ax, 4.6, 4.3, 2.2, 2.0, OBJ_FACE["digit"], "机关1\n反写数字\n反读=6", fontsize=7.3)
    draw_npc(ax, 4.6, 2.0, "澪", "看不出是六还是九")
    draw_npc(ax, 4.6, 7.0, "翔", "反着读，是六")

    draw_rect(ax, 8.4, 4.3, 2.2, 2.0, OBJ_FACE["clock"], "机关2\n颠倒挂钟\n反读=0", fontsize=7.3)
    draw_npc(ax, 8.4, 2.0, "綴", "十二点还是零点？")
    draw_npc(ax, 8.4, 7.0, "構", "十二点。（读反了）")

    draw_rect(ax, 12.2, 4.3, 2.2, 2.0, OBJ_FACE["chair"], "机关3\n重叠椅子\n现实4+倒影4=8", fontsize=7.0)
    draw_npc(ax, 12.2, 2.0, "啓", "哪边是椅子哪边是倒影")
    draw_npc(ax, 12.2, 7.0, "翔", "一共八把")

    draw_rect(ax, 16.0, 4.3, 2.4, 2.4, OBJ_FACE["fork"], "机关4\n错乱岔路\n正确只有=1条\n(核心诡计)", fontsize=6.6)
    draw_npc(ax, 16.0, 1.8, "啓", "这边有门！(手欠)")
    draw_npc(ax, 16.0, 7.2, "翔", "等等，那是倒影！")
    draw_npc(ax, 13.9, 1.8, "構", "门在这边(指反了)")

    draw_rect(ax, 18.7, 4.3, 1.6, 2.6, OBJ_FACE["door"], "员工通道\n密码锁", fontsize=7.3)

    ax.text(0.3, 0.6, "路线：从入口起只能沿长廊依次前进，机关1→2→3→4强制顺序通过，尽头触发「方向错乱找门」核心诡计后才到密码锁；\n最贴合设计文档「走不到头的长廊」的线性压迫感，但探索自由度最低，机关间无法跳着看", fontsize=7.3, color="#444")
    draw_legend_row(ax, W, H, y=1.0)
    save(fig, "gate5_layout_V1_直线长廊.png")


# =========================================================
# V2 · 镜中对称长廊型（整墙镜子把长廊劈成现实半廊/镜中半廊，呼应"镜像重叠"）
# =========================================================
def v2():
    W, H = 14, 15
    fig, ax = base_canvas("闸5·镜像走廊 布局 V2", "镜中对称长廊型 · 一整面镜子把长廊纵向劈成「现实半廊」与「镜中半廊」，两侧机关对称分布，出口在镜面交界的尽头", W, H, bg="#e4e8f0")

    ax.plot([W / 2, W / 2], [1.4, H - 2.0], color="#4a6fd4", linewidth=2.6, linestyle=":", zorder=1)
    ax.text(W / 2, H - 1.9, "— 整墙镜面(纵向分割) —", ha="center", fontsize=8, color="#4a6fd4")

    draw_rect(ax, W / 2, H - 0.9, 3.0, 1.0, "#9a8a6a", "入口(两侧共用)", label_color="#fff", fontsize=7.5)

    # 左半：现实半廊（机关1反写数字 + 机关2颠倒挂钟）
    draw_rect(ax, 3.3, H - 4.4, 4.2, 2.6, "#d8dde8", "现实半廊", label_color="#1a2a4a", fontsize=8)
    draw_rect(ax, 3.3, H - 7.6, 3.6, 2.2, OBJ_FACE["digit"], "机关1\n反写数字\n反读=6", fontsize=7)
    draw_npc(ax, 1.4, H - 7.6, "澪", "")
    draw_npc(ax, 5.2, H - 7.6, "翔", "")

    draw_rect(ax, 3.3, H - 11.0, 3.6, 2.2, OBJ_FACE["clock"], "机关2\n颠倒挂钟\n反读=0", fontsize=7)
    draw_npc(ax, 1.4, H - 11.0, "綴", "")
    draw_npc(ax, 5.2, H - 11.0, "構", "")

    # 右半：镜中半廊（机关3重叠椅子 + 机关4错乱岔路）
    draw_rect(ax, 10.7, H - 4.4, 4.2, 2.6, "#ccd6e8", "镜中半廊(倒影重叠)", label_color="#1a2a4a", fontsize=7.6)
    draw_rect(ax, 10.7, H - 7.6, 3.6, 2.2, OBJ_FACE["chair"], "机关3\n重叠椅子\n4+4=8", fontsize=7)
    draw_npc(ax, 8.8, H - 7.6, "啓", "")
    draw_npc(ax, 12.6, H - 7.6, "翔", "")

    draw_rect(ax, 10.7, H - 11.0, 3.6, 2.2, OBJ_FACE["fork"], "机关4\n错乱岔路\n正确=1条\n(核心诡计)", fontsize=6.6)
    draw_npc(ax, 8.8, H - 11.0, "構", "门在这边(反了)")
    draw_npc(ax, 12.6, H - 11.0, "啓", "这边有门！")

    draw_rect(ax, W / 2, 1.0, 3.0, 1.6, OBJ_FACE["door"], "员工通道\n(镜面交界处)\n密码锁", fontsize=7.3)

    ax.text(0.2, 0.3, "", fontsize=1)
    ax.text(0.2, 13.6, "路线：从共用入口可选先进现实半廊或镜中半廊，两侧各2个机关对称呼应（反写数字／重叠椅子、颠倒挂钟／错乱岔路）；\n两半廊探索顺序自由，解完全部4个后在镜面交界的尽头汇合开锁；与闸4 V1「镜中对半」结构同源，复用成本中等",
            fontsize=7.2, color="#444")
    draw_legend_row(ax, W, H, y=0.6)
    save(fig, "gate5_layout_V2_镜中对称长廊.png")


# =========================================================
# V3 · 四向环形枢纽型（中央枢纽+四条镜面短廊辐射，复用验证过的引擎，成本最低）
# =========================================================
def v3():
    W, H = 14, 14
    fig, ax = base_canvas("闸5·镜像走廊 布局 V3", "四向环形枢纽型 · 中央出口枢纽，四条镜面短廊向外辐射，每条短廊深处各有一个机关，复用闸1/闸2/闸4验证过的多视角引擎", W, H)

    cx, cy = 7, 7.2

    draw_rect(ax, cx, cy, 3.0, 2.2, OBJ_FACE["door"], "员工通道\n(中央枢纽)\n密码锁", fontsize=8)

    # 上：反写数字
    draw_rect(ax, cx, cy + 4.2, 3.8, 2.4, OBJ_FACE["digit"], "机关1\n反写数字\n反读=6", fontsize=7.3)
    draw_npc(ax, cx - 1.6, cy + 4.2, "澪", "")
    draw_npc(ax, cx + 1.6, cy + 4.2, "翔", "")

    # 右：颠倒挂钟
    draw_rect(ax, cx + 4.6, cy, 2.4, 3.8, OBJ_FACE["clock"], "机关2\n颠倒挂钟\n反读=0", fontsize=7.3)
    draw_npc(ax, cx + 4.6, cy + 1.6, "綴", "")
    draw_npc(ax, cx + 4.6, cy - 1.6, "構", "")

    # 左：重叠椅子
    draw_rect(ax, cx - 4.6, cy, 2.4, 3.8, OBJ_FACE["chair"], "机关3\n重叠椅子\n4+4=8", fontsize=7.3)
    draw_npc(ax, cx - 4.6, cy + 1.6, "啓", "")
    draw_npc(ax, cx - 4.6, cy - 1.6, "翔", "")

    # 下：错乱岔路（核心诡计所在方向）
    draw_rect(ax, cx, cy - 4.2, 3.8, 2.4, OBJ_FACE["fork"], "机关4\n错乱岔路\n正确=1条\n(核心诡计)", fontsize=6.8)
    draw_npc(ax, cx - 1.6, cy - 4.2, "構", "门在这边(反了)")
    draw_npc(ax, cx + 1.6, cy - 4.2, "啓", "这边有门！")
    draw_npc(ax, cx + 1.6, cy - 5.6, "翔", "(拦住啓)")

    draw_rect(ax, cx, cy - 6.3, 2.6, 1.0, "#9a8a6a", "入口", label_color="#fff", fontsize=8)

    for (dx, dy) in [(0, 1), (1, 0), (-1, 0), (0, -1)]:
        ax.annotate("", xy=(cx + dx * 2.2, cy + dy * 2.2), xytext=(cx + dx * 1.0, cy + dy * 1.0),
                     arrowprops=dict(arrowstyle="->", color="#5a6a8a", lw=1.2))

    ax.text(0.3, 0.5, "路线：从入口进中央枢纽，四向可去四条镜面短廊（上反写数字/右颠倒挂钟/左重叠椅子/下错乱岔路），\n每条短廊都「看不到尽头」只是视觉遮挡，任意顺序探完回枢纽输入密码；与闸1 V3/闸2/闸4 V3同构，开发测试效率最高、风险最低",
            fontsize=7.3, color="#444")
    draw_legend_row(ax, W, H, y=0.5)
    save(fig, "gate5_layout_V3_四向环形枢纽.png")


if __name__ == "__main__":
    v1()
    v2()
    v3()
