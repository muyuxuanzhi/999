# -*- coding: utf-8 -*-
"""
场景七 · 最终闸（天台 / 人力资源部）俯视布局图（几何图形+文字说明占位版）
注：仓库里暂无「房间设计_最终闸.md」，本稿依据《999式流程设计案.md》§四(流程结构)、
§五.2(真相线)、§五.4(TRUE END)、《门与分组配置.md》§四(第三轮·会合→最终闸) 自行设计。
这是全场唯一的「全员会合」房间——不再分组，幸存者（约10~14人）第一次面对面，
律、蓝的记忆在此完全归还，有机会认出彼此与主角；随后面对最终闸：
门牌二选一【闸·时→天台】/【闸·忆→人力资源部】，并做出「拒绝抵押／继续抵押／只带部分人走」
三选一的最终决定，分别导向 x_true（天亮了）/ x_good（下班路上有脚步声）/ x_be（被录用）。

三个版本，供挑选：
  V1 双闸对决型：会合广场居中，两扇闸门（时/忆）左右并列把房间劈成两半，
     律蓝站在主角两侧触发相认，走到任一闸门前触发三选一，最直给、最贴合"二选一"字面设定
  V2 审判法庭型：逆转裁判式对称构图，主角站证据台正面对律蓝，真相三证逐一呈示，
     背后旁听区坐满其他幸存者，法庭审判感最强，呼应"看破真相才能走真结局"的核心玩法
  V3 天台/HR分流俯视型：俯视全景图，中央会合大厅向两侧延伸出两条通道——
     左往天台（开放/向上/亮），右往人力资源部（格子间/向下/暗），空间氛围对比最强烈
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
    "橘鏡": "#D4AF37",   # 主角，金色突出（但表现为假装中二，脸上仍蒙着雾）
    "律":   "#7EC8E3",   # 氷川律，主角好友·真相线核心
    "蓝":   "#4A6FD4",   # 水無瀬藍，主角好友·真相线核心
    "栞":   "#A67B5B",   # 継井栞，正常人代表
    "翔":   "#D98E04",   # 荒波翔，正常人代表
    "安澄": "#4FB8A6",   # 白川安澄，正常人代表
    "零":   "#4ADE80",   # コード零
    "其他": "#9CA3AF",   # 其余幸存者占位（人数随前两轮结算浮动）
}

OBJ_FACE = {
    "proof1": "#B8574E",   # 证据一：律的记忆空白+蓝的寻人描述
    "proof2": "#8A6B5C",   # 证据二：入职档案旧照
    "proof3": "#5c4a7a",   # 证据三：主角超忆症的周目画面
    "gate_time": "#C9A227",  # 闸·时 → 天台
    "gate_mem":  "#4a6fd4",  # 闸·忆 → 人力资源部
}


def draw_npc(ax, x, y, name, note="", text_color="#fff", highlight=False, r=0.4):
    c = NPC_COLOR.get(name, NPC_COLOR["其他"])
    if highlight:
        ax.add_patch(patches.Circle((x, y), r + 0.12, facecolor="none", edgecolor=c, linewidth=1.4, zorder=4))
    ax.add_patch(patches.Circle((x, y), r, facecolor=c, edgecolor="#fff", linewidth=1.3, zorder=5))
    label = name if name != "其他" else "？"
    ax.text(x, y, label, ha="center", va="center", fontsize=8.5, fontweight="bold", color=text_color, zorder=6)
    if note:
        ax.text(x, y - r - 0.28, note, ha="center", va="top", fontsize=6.6, color="#444", zorder=6)


def draw_rect(ax, x, y, w, h, color, label, dashed=False, label_color="#fff", fontsize=8.5):
    ls = "--" if dashed else "-"
    ax.add_patch(patches.Rectangle((x - w / 2, y - h / 2), w, h, facecolor=color,
                                    edgecolor="#333", linewidth=1.2, linestyle=ls, zorder=2))
    ax.text(x, y, label, ha="center", va="center", fontsize=fontsize, color=label_color, zorder=4)


def base_canvas(title, subtitle, w, h, bg="#e8ecef"):
    fig, ax = plt.subplots(figsize=(9.5, 9.5 * h / w))
    ax.set_xlim(0, w)
    ax.set_ylim(0, h)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_facecolor(bg)
    fig.patch.set_facecolor(bg)
    ax.text(w / 2, h - 0.6, title, ha="center", va="center", fontsize=16, fontweight="bold", color="#1a1a2a")
    ax.text(w / 2, h - 1.3, subtitle, ha="center", va="center", fontsize=8.6, color="#444")
    return fig, ax


def draw_legend_row(ax, w, h, y=0.55, text_color="#333"):
    items = [
        ("证据①记忆空白/寻人", OBJ_FACE["proof1"]),
        ("证据②档案旧照", OBJ_FACE["proof2"]),
        ("证据③周目画面", OBJ_FACE["proof3"]),
        ("闸·时→天台", OBJ_FACE["gate_time"]),
        ("闸·忆→人力资源部", OBJ_FACE["gate_mem"]),
    ]
    n = len(items)
    step = (w - 1.0) / n
    for i, (label, color) in enumerate(items):
        x = 0.5 + i * step
        ax.add_patch(patches.Rectangle((x, y - 0.16), 0.3, 0.3, facecolor=color, edgecolor="#333", linewidth=1))
        ax.text(x + 0.4, y, label, ha="left", va="center", fontsize=6.6, color=text_color)


def save(fig, name):
    path = os.path.join(OUT_DIR, name)
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print("saved", path)


# =========================================================
# V1 · 双闸对决型（会合广场居中，两扇闸门左右并列，走到门前触发三选一）
# =========================================================
def v1():
    W, H = 18, 12
    fig, ax = base_canvas("场景七·最终闸 布局 V1", "双闸对决型 · 会合广场居中，律蓝立于主角两侧触发相认，两扇闸门（时/忆）左右并列，走到任一门前触发「拒绝/继续抵押/带部分人」三选一", W, H)

    # 会合广场（中央）
    ax.add_patch(patches.Circle((W / 2, 6.8), 3.6, facecolor="#dde2e6", edgecolor="#333", linewidth=1.2, zorder=1))
    ax.text(W / 2, 10.0, "— 会合广场：第一次真正面对面 —", ha="center", fontsize=7.5, color="#5a5a6a")

    draw_npc(ax, W / 2, 7.4, "橘鏡", "装失忆的中二少年，心里全记得", highlight=True)
    draw_npc(ax, W / 2 - 1.6, 6.3, "律", "记忆归还，隐约认出蓝")
    draw_npc(ax, W / 2 + 1.6, 6.3, "蓝", "记忆归还，隐约认出律")

    # 其他幸存者环绕外圈（数量随前两轮结算浮动，示意性摆放）
    others = [(W / 2 - 2.6, 5.2), (W / 2 - 1.0, 4.6), (W / 2 + 1.0, 4.6), (W / 2 + 2.6, 5.2),
              (W / 2 - 2.0, 8.6), (W / 2 + 2.0, 8.6)]
    for (ox, oy) in others:
        draw_npc(ax, ox, oy, "其他", r=0.32)
    ax.text(W / 2, 3.7, "外圈：其余幸存者（安澄/翔/栞/零/花咲…具体几人随前两轮是否失踪而定）", ha="center", fontsize=6.6, color="#555")

    # 真相三证展示台（广场边缘，与主角对话时逐一呈示）
    draw_rect(ax, W / 2 - 4.6, 7.4, 2.0, 1.4, OBJ_FACE["proof1"], "证据①\n记忆空白\n+寻人描述", fontsize=6.2)
    draw_rect(ax, W / 2 + 4.6, 7.4, 2.0, 1.4, OBJ_FACE["proof2"], "证据②\n入职档案\n旧照", fontsize=6.2)
    draw_rect(ax, W / 2, 10.2 - 0.2, 2.0, 0.9, OBJ_FACE["proof3"], "证据③ 主角周目画面（仅主角线可见）", fontsize=5.8)

    # 两扇闸门（最终闸）分列左右
    draw_rect(ax, 2.2, 6.8, 2.6, 4.2, OBJ_FACE["gate_time"], "闸·时\n→ 天台\n（开放·向上）", fontsize=7.6)
    draw_rect(ax, W - 2.2, 6.8, 2.6, 4.2, OBJ_FACE["gate_mem"], "闸·忆\n→ 人力资源部\n（格子间·向下）", fontsize=7.0)

    ax.text(2.2, 4.1, "走近任一闸门触发：\n拒绝抵押／继续抵押／\n只带部分人走", ha="center", fontsize=6.4, color="#444")
    ax.text(W - 2.2, 4.1, "三条路径分别导向\nTRUE／GOOD／BAD\n三类结局", ha="center", fontsize=6.4, color="#444")

    ax.text(0.3, 1.1, "路线：进场先在广场自由与律/蓝/其他幸存者对话（收束各线伏笔，触发相认判定），\n再走向任意一扇闸门，门前统一弹出三选一：拒绝抵押（需真相三证+相认→天亮了）／\n继续抵押（→被录用BAD）／只带部分人走（→下班路上有脚步声GOOD）；结构最直白，改动成本最低", fontsize=7.0, color="#444")
    draw_legend_row(ax, W, H, y=0.4)
    save(fig, "gate7_layout_V1_双闸对决.png")


# =========================================================
# V2 · 审判法庭型（逆转裁判式对称构图，证据逐一呈示，背后旁听区）
# =========================================================
def v2():
    W, H = 14, 13
    fig, ax = base_canvas("场景七·最终闸 布局 V2", "审判法庭型 · 主角站证据台正对律蓝，真相三证逐一呈示（逆转裁判式），背后旁听区坐满其余幸存者，法庭审判感最强，呼应「看破真相才能走真结局」", W, H, bg="#eceae4")

    # 法庭纵深结构：最远处是律蓝的「证人台」，中间是证据台，主角在近景，最后方是闸门
    draw_npc(ax, W / 2 - 1.6, H - 3.0, "律", "证人台·记忆归还")
    draw_npc(ax, W / 2 + 1.6, H - 3.0, "蓝", "证人台·记忆归还")
    ax.add_patch(patches.Rectangle((W / 2 - 3.2, H - 3.9), 6.4, 1.8, facecolor="#cfd3c8", edgecolor="#333", linewidth=1.1, zorder=1))
    ax.text(W / 2, H - 4.3, "证人台（律 / 蓝 面对面站立，第一次真正看清彼此）", ha="center", fontsize=7, color="#333")

    draw_rect(ax, W / 2 - 3.0, H - 6.4, 2.0, 1.3, OBJ_FACE["proof1"], "证据①\n记忆空白\n/寻人描述", fontsize=6.0)
    draw_rect(ax, W / 2, H - 6.4, 2.0, 1.3, OBJ_FACE["proof2"], "证据②\n档案旧照", fontsize=6.4)
    draw_rect(ax, W / 2 + 3.0, H - 6.4, 2.0, 1.3, OBJ_FACE["proof3"], "证据③\n周目画面\n（主角线）", fontsize=6.0)
    ax.text(W / 2, H - 7.3, "逆转裁判式呈证：逐一点击证据台，向律/蓝「指出」矛盾，集齐三证才解锁「拒绝抵押」选项", ha="center", fontsize=6.6, color="#555")

    draw_npc(ax, W / 2, H - 8.6, "橘鏡", "被指证台，装失忆却心里全记得", highlight=True)

    # 旁听区（其余幸存者坐两侧）
    bench_y = H - 9.8
    for i, bx in enumerate([W / 2 - 4.6, W / 2 - 3.1, W / 2 - 1.6, W / 2 + 1.6, W / 2 + 3.1, W / 2 + 4.6]):
        draw_npc(ax, bx, bench_y, "其他", r=0.3)
    ax.text(W / 2, bench_y - 0.75, "旁听区：其余幸存者（安澄/翔/栞/零/花咲…）围观审判全程", ha="center", fontsize=6.6, color="#555")

    # 最终闸：法庭最深处的两扇门（审判结束后才可到达）
    draw_rect(ax, W / 2 - 2.0, 1.4, 2.4, 1.8, OBJ_FACE["gate_time"], "闸·时\n→ 天台", fontsize=7.3)
    draw_rect(ax, W / 2 + 2.0, 1.4, 2.4, 1.8, OBJ_FACE["gate_mem"], "闸·忆\n→ 人力资源部", fontsize=6.8)

    ax.text(0.2, 0.2, "路线：进场先经历法庭式问答——向律蓝逐一出示三证、每次出示都推进一段相认剧情；\n集齐三证+完成相认后，「拒绝抵押」才从灰锁变为可选项，再选择一扇闸门走向结局；\n审判节奏最强，最贴合「主角其实什么都记得，只是装失忆」的核心真相揭露感，但实现成本较高（需管理证据收集状态）", fontsize=6.8, color="#444")
    draw_legend_row(ax, W, H, y=0.0 - 1.0 + 1.0)
    save(fig, "gate7_layout_V2_审判法庭.png")


# =========================================================
# V3 · 天台/HR分流俯视型（俯视全景，中央大厅向两侧分流，氛围对比最强）
# =========================================================
def v3():
    W, H = 20, 10
    fig, ax = base_canvas("场景七·最终闸 布局 V3", "天台/HR分流俯视型 · 俯视全景，中央会合大厅向左右延伸——左往天台（开放/向上/亮），右往人力资源部（格子间/向下/暗），空间氛围对比最强烈", W, H)

    # 中央会合大厅
    ax.add_patch(patches.Rectangle((7.2, 2.2), 5.6, 6.0, facecolor="#dde2e6", edgecolor="#333", linewidth=1.2, zorder=1))
    ax.text(10, 7.7, "会合大厅", ha="center", fontsize=8.5, color="#333", fontweight="bold")
    draw_npc(ax, 9.3, 5.2, "律", "")
    draw_npc(ax, 10.7, 5.2, "蓝", "")
    draw_npc(ax, 10, 4.0, "橘鏡", "", highlight=True)
    for (ox, oy) in [(8.0, 3.2), (12.0, 3.2), (8.0, 6.4), (12.0, 6.4)]:
        draw_npc(ax, ox, oy, "其他", r=0.3)
    draw_rect(ax, 10, 2.8, 2.6, 0.9, OBJ_FACE["proof2"], "三证展示台（①②③ 依次收集/呈示）", fontsize=5.8)

    # 左通道 → 天台
    ax.add_patch(patches.Rectangle((1.0, 4.0), 6.2, 2.4, facecolor="#f3e9c6", edgecolor="#333", linewidth=1.1, zorder=1))
    ax.text(4.1, 6.7, "← 通往天台：开放天空、风声、向上的楼梯", ha="center", fontsize=7, color="#7a6420")
    draw_rect(ax, 2.2, 5.2, 2.2, 1.6, OBJ_FACE["gate_time"], "闸·时", fontsize=8)
    ax.text(4.6, 5.2, "拒绝抵押\n需真相三证+相认", ha="center", fontsize=6.4, color="#5a4a10")

    # 右通道 → 人力资源部
    ax.add_patch(patches.Rectangle((12.8, 4.0), 6.2, 2.4, facecolor="#c7cdd6", edgecolor="#333", linewidth=1.1, zorder=1))
    ax.text(15.9, 6.7, "通往人力资源部：森冷格子间、向下的通道 →", ha="center", fontsize=7, color="#2a3a4a")
    draw_rect(ax, 17.8, 5.2, 2.2, 1.6, OBJ_FACE["gate_mem"], "闸·忆", fontsize=8)
    ax.text(15.4, 5.2, "继续抵押\n→ 被录用", ha="center", fontsize=6.4, color="#2a3a4a")

    ax.text(10, 1.3, "走到任一闸门前，统一弹出三选一：拒绝抵押／继续抵押／只带部分人走\n（只带部分人走＝只让一部分幸存者跟你走同一扇门，其余人留下 → GOOD/NORMAL）", ha="center", fontsize=6.6, color="#444")

    ax.text(0.3, 0.2, "路线：会合大厅内自由走动、与所有人对话收束伏笔；厅内三证展示台集齐三证后，\n天台通道的「拒绝抵押」选项解锁；俯视构图能最直观地表现「天台＝光＋自由」与\n「人力资源部＝暗＋被困」的象征对比，复用闸4/闸5/闸6已验证的多视角引擎（大厅/左通道/右通道三视角切换）", fontsize=6.8, color="#444")
    draw_legend_row(ax, W, H, y=0.75)
    save(fig, "gate7_layout_V3_天台HR分流俯视.png")


if __name__ == "__main__":
    v1()
    v2()
    v3()
