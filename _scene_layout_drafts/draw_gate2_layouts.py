# -*- coding: utf-8 -*-
"""
闸2·机房 俯视平面布局图（几何图形+文字说明占位版）
三个版本，供挑选：
  V1 直线通道型：入口→机关1→机关3→机关2→机关4→终端→出口，一条直线走到底
  V2 两侧分支型：主通道居中，4个机关各在左右两侧的凹室里，需要左右拐进去看
  V3 环形回环型：入口与出口在同一端，绕一圈经过全部机关再折返，呼应"服务器森林没有尽头"的空间异常
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.font_manager as fm
import os

# ---- 中文字体 ----
FONT_CANDIDATES = ["Microsoft YaHei", "SimHei", "SimSun"]
font_path = None
for f in fm.fontManager.ttflist:
    if f.name in FONT_CANDIDATES:
        font_path = f.fname
        plt.rcParams["font.sans-serif"] = [f.name]
        break
plt.rcParams["axes.unicode_minus"] = False

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---- 角色代表色（取自 房间设计_序幕新手关.md §八）----
NPC_COLOR = {
    "零": "#4ADE80",   # 终端绿
    "律": "#7EC8E3",   # 冰蓝
    "鈴": "#6B7280",   # 铁灰
    "晴": "#FFE066",   # 明黄
    "栞": "#A67B5B",   # 羊皮棕
}

OBJ_FACE = {
    "rack": "#3A3F4A",      # 普通机柜排
    "door_in": "#8B5A2B",   # 入口门
    "door_out": "#5B3A8B",  # 出口门（员工通道+密码锁）
    "terminal": "#1FB6C9",  # 档案库终端
    "gimmick": "#2B2F36",   # 漂浮机关（虚线边框表示漂浮）
    "alarm": "#D92B2B",     # 警报灯（核心诡计点）
}


def draw_npc(ax, x, y, name, note=""):
    c = NPC_COLOR[name]
    ax.add_patch(patches.Circle((x, y), 0.45, facecolor=c, edgecolor="#111", linewidth=1.5, zorder=5))
    ax.text(x, y, name, ha="center", va="center", fontsize=10, fontweight="bold", color="#111", zorder=6)
    if note:
        ax.text(x, y - 0.75, note, ha="center", va="top", fontsize=7.5, color="#333", zorder=6)


def draw_rect(ax, x, y, w, h, color, label, dashed=False, label_color="#fff"):
    ls = "--" if dashed else "-"
    ax.add_patch(patches.Rectangle((x - w / 2, y - h / 2), w, h, facecolor=color,
                                    edgecolor="#111", linewidth=1.3, linestyle=ls, zorder=3))
    ax.text(x, y, label, ha="center", va="center", fontsize=8.5, color=label_color, zorder=4, wrap=True)


def base_canvas(title, subtitle, w=12, h=18):
    fig, ax = plt.subplots(figsize=(9, 13))
    ax.set_xlim(0, w)
    ax.set_ylim(0, h)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_facecolor("#EDEDED")
    fig.patch.set_facecolor("#EDEDED")
    ax.text(w / 2, h - 0.6, title, ha="center", va="center", fontsize=16, fontweight="bold", color="#111")
    ax.text(w / 2, h - 1.25, subtitle, ha="center", va="center", fontsize=9.5, color="#555")
    return fig, ax


def draw_legend(ax, w, h):
    items = [
        ("普通机柜排", OBJ_FACE["rack"]),
        ("漂浮机关（虚线=漂浮）", OBJ_FACE["gimmick"]),
        ("入口门", OBJ_FACE["door_in"]),
        ("出口门/密码锁", OBJ_FACE["door_out"]),
        ("档案库终端", OBJ_FACE["terminal"]),
        ("核心诡计点（警报灯）", OBJ_FACE["alarm"]),
    ]
    x0, y0 = 0.5, 0.9
    for i, (label, color) in enumerate(items):
        yy = y0 + i * 0 - 0
    # 横向图例放在底部
    lx = 0.6
    ly = 0.55
    for label, color in items:
        ax.add_patch(patches.Rectangle((lx, ly - 0.22), 0.4, 0.4, facecolor=color, edgecolor="#111", linewidth=1))
        ax.text(lx + 0.55, ly, label, ha="left", va="center", fontsize=7.5, color="#333")
        ly -= 0
        lx += 0  # placeholder, real spacing handled by caller loop below


def draw_legend_row(ax, w, h):
    items = [
        ("机柜", OBJ_FACE["rack"]),
        ("漂浮机关", OBJ_FACE["gimmick"]),
        ("入口门", OBJ_FACE["door_in"]),
        ("出口/密码锁", OBJ_FACE["door_out"]),
        ("档案库终端", OBJ_FACE["terminal"]),
        ("警报灯(诡计点)", OBJ_FACE["alarm"]),
    ]
    n = len(items)
    total_w = w - 1.0
    step = total_w / n
    y = 0.55
    for i, (label, color) in enumerate(items):
        x = 0.5 + i * step
        ax.add_patch(patches.Rectangle((x, y - 0.18), 0.32, 0.32, facecolor=color, edgecolor="#111", linewidth=1))
        ax.text(x + 0.42, y, label, ha="left", va="center", fontsize=7, color="#333")


def save(fig, name):
    path = os.path.join(OUT_DIR, name)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print("saved", path)


# =========================================================
# V1 · 直线通道型
# =========================================================
def v1():
    W, H = 12, 20
    fig, ax = base_canvas("闸2·机房 俯视布局 V1", "直线通道型 · 入口→机关1→机关3→机关2→机关4→终端→出口 一条直线走到底", w=W, h=H)

    # 两侧机柜排（贯穿全程）
    draw_rect(ax, 1.3, 10, 1.4, 14, OBJ_FACE["rack"], "机柜排\n(左)", label_color="#eee")
    draw_rect(ax, 10.7, 10, 1.4, 14, OBJ_FACE["rack"], "机柜排\n(右)", label_color="#eee")

    # 入口门（下方）
    draw_rect(ax, 6, 2.3, 1.6, 1.0, OBJ_FACE["door_in"], "入口门", label_color="#fff")

    # 机关1 静音服务器机柜（漂浮，左侧）
    draw_rect(ax, 3.4, 5.2, 1.8, 1.3, OBJ_FACE["gimmick"], "机关1\n静音机柜\n(7灯数绿灯)", dashed=True, label_color="#fff")
    draw_npc(ax, 4.6, 5.0, "鈴", "数灯/比\"4\"")
    draw_npc(ax, 4.6, 6.1, "晴", "乱按键")

    # 机关3 无扇叶风扇（漂浮，右侧）
    draw_rect(ax, 8.6, 8.6, 1.8, 1.3, OBJ_FACE["gimmick"], "机关3\n无扇叶风扇\n(数2片)", dashed=True, label_color="#fff")
    draw_npc(ax, 7.4, 8.4, "鈴", "移动至此")

    # 机关2 镜像屏幕（漂浮，左侧）
    draw_rect(ax, 3.4, 12.2, 1.8, 1.3, OBJ_FACE["gimmick"], "机关2\n镜像屏幕\n(音量\"0\")", dashed=True, label_color="#fff")
    draw_npc(ax, 4.6, 12.0, "栞", "贴近看")
    draw_npc(ax, 4.6, 13.1, "零", "科普解读")

    # 机关4 静音警报灯（核心诡计点，右侧）
    draw_rect(ax, 8.6, 15.6, 1.4, 1.1, OBJ_FACE["alarm"], "机关4\n警报灯\n(诡计核心)", label_color="#fff")

    # 档案库终端（近出口）
    draw_rect(ax, 6, 17.4, 1.8, 1.1, OBJ_FACE["terminal"], "档案库终端", label_color="#111")
    draw_npc(ax, 5.0, 17.9, "律", "蹲着写字条")

    # 出口门（上方）
    draw_rect(ax, 6, 19.0, 1.8, 0.9, OBJ_FACE["door_out"], "出口门\n4位密码锁", label_color="#fff")

    ax.annotate("", xy=(6, 3.0), xytext=(6, 2.6), arrowprops=dict(arrowstyle="->", color="#333"))
    ax.text(1.5, 1.2, "路线：入口→1→3→2→4(诡计)→终端→出口，无分岔，线性推进", fontsize=8.5, color="#444")
    draw_legend_row(ax, W, H)
    save(fig, "gate2_layout_V1_直线通道.png")


# =========================================================
# V2 · 两侧分支型
# =========================================================
def v2():
    W, H = 16, 14
    fig, ax = base_canvas("闸2·机房 俯视布局 V2", "两侧分支型 · 主通道居中，4个机关各在左右凹室，需拐弯才看得到", w=W, h=H)

    # 主通道（中间竖向）
    draw_rect(ax, 8, 7, 2.2, 10.5, "#C9C9C9", "主通道", label_color="#333")

    # 入口（主通道底端）
    draw_rect(ax, 8, 2.0, 1.6, 1.0, OBJ_FACE["door_in"], "入口门", label_color="#fff")
    # 出口（主通道顶端）
    draw_rect(ax, 8, 12.0, 1.8, 0.9, OBJ_FACE["door_out"], "出口门\n4位密码锁", label_color="#fff")
    # 终端挨着出口
    draw_rect(ax, 8, 10.6, 1.8, 1.0, OBJ_FACE["terminal"], "档案库终端", label_color="#111")
    draw_npc(ax, 8.0, 9.3, "律", "蹲着写字条")

    # 左凹室1：机关1
    draw_rect(ax, 3.2, 4.4, 2.2, 1.6, OBJ_FACE["rack"], "", label_color="#eee")
    draw_rect(ax, 3.2, 4.4, 1.9, 1.3, OBJ_FACE["gimmick"], "机关1\n静音机柜", dashed=True, label_color="#fff")
    draw_npc(ax, 2.0, 4.3, "鈴", "数灯")
    draw_npc(ax, 4.3, 5.0, "晴", "乱按键")

    # 右凹室2：机关4（警报灯，核心诡计靠近入口，先遇到伏笔）
    draw_rect(ax, 12.8, 4.4, 2.2, 1.6, OBJ_FACE["rack"], "", label_color="#eee")
    draw_rect(ax, 12.8, 4.4, 1.5, 1.1, OBJ_FACE["alarm"], "机关4\n警报灯\n(诡计核心)", label_color="#fff")

    # 左凹室3：机关3
    draw_rect(ax, 3.2, 8.2, 2.2, 1.6, OBJ_FACE["rack"], "", label_color="#eee")
    draw_rect(ax, 3.2, 8.2, 1.9, 1.3, OBJ_FACE["gimmick"], "机关3\n无扇叶风扇", dashed=True, label_color="#fff")
    draw_npc(ax, 2.0, 8.1, "鈴", "移动至此/数叶片")

    # 右凹室4：机关2
    draw_rect(ax, 12.8, 8.2, 2.2, 1.6, OBJ_FACE["rack"], "", label_color="#eee")
    draw_rect(ax, 12.8, 8.2, 1.9, 1.3, OBJ_FACE["gimmick"], "机关2\n镜像屏幕", dashed=True, label_color="#fff")
    draw_npc(ax, 11.6, 8.1, "栞", "贴近看")
    draw_npc(ax, 14.0, 8.5, "零", "科普解读")

    ax.text(0.6, 1.2, "路线：入口沿主通道前进，玩家主动拐进左右凹室才能看到各机关；全部探索完再到终端触发终局", fontsize=8, color="#444")
    draw_legend_row(ax, W, H)
    save(fig, "gate2_layout_V2_两侧分支.png")


# =========================================================
# V3 · 环形回环型
# =========================================================
def v3():
    W, H = 14, 14
    fig, ax = base_canvas("闸2·机房 俯视布局 V3", "环形回环型 · 入口与出口同侧，绕一圈经过全部机关再折返，呼应\"没有尽头的金属森林\"", w=W, h=H)

    cx, cy = 7, 7.3
    ring_w, ring_h = 9.5, 9.0

    # 画一个环形走廊（外框 - 内框 的视觉示意：用两个矩形边框叠加文字说明，简化为四条边分别布点）
    draw_rect(ax, cx, cy + ring_h / 2 - 0.5, ring_w - 1, 1.0, "#C9C9C9", "环形走廊 · 上边", label_color="#333")
    draw_rect(ax, cx, cy - ring_h / 2 + 0.5, ring_w - 1, 1.0, "#C9C9C9", "环形走廊 · 下边", label_color="#333")
    draw_rect(ax, cx - ring_w / 2 + 0.5, cy, 1.0, ring_h - 1, "#C9C9C9", "左边", label_color="#333")
    draw_rect(ax, cx + ring_w / 2 - 0.5, cy, 1.0, ring_h - 1, "#C9C9C9", "右边", label_color="#333")
    # 中央留空（天花板倒吊机柜示意区）
    draw_rect(ax, cx, cy, ring_w - 3.6, ring_h - 3.6, "#DADADA", "中庭\n（抬头可见倒吊机柜，\n地面不可通行）", label_color="#555")

    # 入口 + 出口 并排在下边（同侧）
    draw_rect(ax, cx - 1.0, cy - ring_h / 2 + 0.5, 1.3, 0.8, OBJ_FACE["door_in"], "入口", label_color="#fff")
    draw_rect(ax, cx + 1.0, cy - ring_h / 2 + 0.5, 1.4, 0.8, OBJ_FACE["door_out"], "出口\n密码锁", label_color="#fff")

    # 机关沿环布置：左边=机关1，上边左=机关2，上边右=机关3，右边=机关4
    draw_rect(ax, cx - ring_w / 2 + 0.5, cy + 2.0, 1.4, 1.1, OBJ_FACE["gimmick"], "机关1\n静音机柜", dashed=True, label_color="#fff")
    draw_npc(ax, cx - ring_w / 2 + 1.6, cy + 2.0, "鈴", "数灯")
    draw_npc(ax, cx - ring_w / 2 + 0.6, cy + 3.2, "晴", "乱按键")

    draw_rect(ax, cx - 2.0, cy + ring_h / 2 - 0.5, 1.6, 1.0, OBJ_FACE["gimmick"], "机关2\n镜像屏幕", dashed=True, label_color="#fff")
    draw_npc(ax, cx - 2.0, cy + ring_h / 2 - 1.6, "栞", "贴近看")
    draw_npc(ax, cx - 0.6, cy + ring_h / 2 - 1.6, "零", "科普解读")

    draw_rect(ax, cx + 2.0, cy + ring_h / 2 - 0.5, 1.6, 1.0, OBJ_FACE["gimmick"], "机关3\n无扇叶风扇", dashed=True, label_color="#fff")
    draw_npc(ax, cx + 2.0, cy + ring_h / 2 - 1.6, "鈴", "数叶片")

    draw_rect(ax, cx + ring_w / 2 - 0.5, cy - 0.5, 1.4, 1.1, OBJ_FACE["alarm"], "机关4\n警报灯\n诡计核心", label_color="#fff")

    # 档案库终端放在环的下边、入口出口之间稍靠内
    draw_rect(ax, cx, cy - ring_h / 2 + 0.5, 1.6, 0.8, OBJ_FACE["terminal"], "档案库终端", label_color="#111")
    draw_npc(ax, cx, cy - ring_h / 2 - 0.9, "律", "蹲着写字条")

    ax.text(0.4, 0.9, "路线：从入口出发绕环形走廊一圈，依次路过机关1→2→3→4，最终回到入口旁的终端+出口；\n体现\"服务器森林延伸到看不见的深处、像没有尽头\"的空间异常", fontsize=8, color="#444")
    draw_legend_row(ax, W, H)
    save(fig, "gate2_layout_V3_环形回环.png")


if __name__ == "__main__":
    v1()
    v2()
    v3()
