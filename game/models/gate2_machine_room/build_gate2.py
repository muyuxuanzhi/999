import bpy, bmesh, math
from mathutils import Vector, Matrix, Euler

BASE = "E:/zhuomian/999/game/models/gate2_machine_room"
TEX = BASE + "/tex/"

# ---------------------------------------------------------------- reset
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves,
             bpy.data.lights, bpy.data.cameras):
    for d in list(coll):
        coll.remove(d)
for c in list(bpy.data.collections):
    bpy.data.collections.remove(c)

scene = bpy.context.scene
root = scene.collection


def new_coll(name):
    c = bpy.data.collections.new(name)
    root.children.link(c)
    return c


C_SHELL = new_coll("01_Shell")
C_CAB = new_coll("02_FloorCabinets")
C_CEIL = new_coll("03_CeilingCabinets")
C_FLOAT = new_coll("04_Floating")
C_DOOR = new_coll("05_Doors")
C_DETAIL = new_coll("06_Details")
C_CABLE = new_coll("07_Cables")
C_LIGHT = new_coll("08_Lights")
C_NPC = new_coll("09_NPC_StickFigures")

# ---------------------------------------------------------------- materials


def load_img(name, noncolor=False):
    img = bpy.data.images.load(TEX + name, check_existing=True)
    if noncolor:
        img.colorspace_settings.name = "Non-Color"
    return img


def make_mat(name, albedo=None, normal=None, color=(0.5, 0.5, 0.5, 1), rough=0.8, metal=0.0,
             emit_tex=False, emit_color=None, emit_strength=0.0, nstr=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None) or nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Base Color"].default_value = color
    if albedo:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = load_img(albedo)
        t.interpolation = "Linear"
        t.extension = "REPEAT"
        nt.links.new(t.outputs["Color"], bsdf.inputs["Base Color"])
        if emit_tex:
            nt.links.new(t.outputs["Color"], bsdf.inputs["Emission Color"])
            bsdf.inputs["Emission Strength"].default_value = emit_strength
    if normal:
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = load_img(normal, True)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = nstr
        nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    if emit_color:
        bsdf.inputs["Emission Color"].default_value = emit_color
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    return m


M = {}
M["wall"] = make_mat("M_Wall", "wall_albedo.png", "wall_normal.png", rough=0.92, nstr=0.8)
M["floor"] = make_mat("M_Floor", "floor_albedo.png", "floor_normal.png", rough=0.5, nstr=0.8)
M["cab"] = make_mat("M_Cabinet", "cabinet_albedo.png", "cabinet_normal.png", rough=0.45, metal=0.25, nstr=0.5)
M["cab7"] = make_mat("M_Cabinet7", "cabinet7_albedo.png", rough=0.45, metal=0.25, emit_tex=True, emit_strength=0.7)
M["door"] = make_mat("M_Door", "door_albedo.png", "door_normal.png", rough=0.55, metal=0.4, nstr=0.8)
M["keypad"] = make_mat("M_Keypad", "keypad_albedo.png", rough=0.4, emit_tex=True, emit_strength=0.8)
M["scr_vol"] = make_mat("M_ScreenVolume", "screen_volume_albedo.png", rough=0.3, emit_tex=True, emit_strength=1.5)
M["scr_code"] = make_mat("M_ScreenCode", "screen_code_albedo.png", rough=0.3, emit_tex=True, emit_strength=1.5)
M["scr_arc"] = make_mat("M_ScreenArchive", "screen_archive_albedo.png", rough=0.3, emit_tex=True, emit_strength=1.5)
M["kb"] = make_mat("M_Keyboard", "keyboard_albedo.png", rough=0.6)
M["metal"] = make_mat("M_Metal", "metal_albedo.png", "metal_normal.png", color=(0.3, 0.33, 0.38, 1), rough=0.45, metal=0.5, nstr=0.3)
M["red"] = make_mat("M_AlarmRed", color=(0.8, 0.05, 0.04, 1), rough=0.3, emit_color=(1.0, 0.08, 0.05, 1), emit_strength=8.0)
M["tube"] = make_mat("M_Tube", color=(0.9, 0.95, 1, 1), rough=0.3, emit_color=(0.85, 0.93, 1.0, 1), emit_strength=6.0)
M["cable"] = make_mat("M_Cable", color=(0.03, 0.03, 0.045, 1), rough=0.55)

# ---------------------------------------------------------------- helpers
AX = {"x": 0, "y": 1, "z": 2}


def new_obj(name, mesh, coll, loc=(0, 0, 0), rot=(0, 0, 0)):
    o = bpy.data.objects.new(name, mesh)
    coll.objects.link(o)
    o.location = loc
    o.rotation_euler = Euler([math.radians(a) for a in rot], "XYZ")
    return o


def face_key(f, thr=0.99):
    n = f.normal
    for a, name in enumerate("xyz"):
        if n[a] > thr:
            return "+" + name
        if n[a] < -thr:
            return "-" + name
    return None


def box_mesh(name, size, mat, front=None, bevel=0.0, open_faces=(), dark=(0.008, 0.016, 0.45, 0.55)):
    sx, sy, sz = size
    bm = bmesh.new()
    vs = {}
    for ix in (-1, 1):
        for iy in (-1, 1):
            for iz in (-1, 1):
                vs[(ix, iy, iz)] = bm.verts.new((ix * sx / 2, iy * sy / 2, iz * sz / 2))
    quads = [
        ((-1, -1, -1), (-1, 1, -1), (-1, 1, 1), (-1, -1, 1)),
        ((1, -1, -1), (1, -1, 1), (1, 1, 1), (1, 1, -1)),
        ((-1, -1, -1), (-1, -1, 1), (1, -1, 1), (1, -1, -1)),
        ((-1, 1, -1), (1, 1, -1), (1, 1, 1), (-1, 1, 1)),
        ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1)),
        ((-1, -1, 1), (-1, 1, 1), (1, 1, 1), (1, -1, 1)),
    ]
    for q in quads:
        bm.faces.new([vs[k] for k in q])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect="EDGES")
    bm.normal_update()
    uvl = bm.loops.layers.uv.verify()
    mnx, mny, mnz = -sx / 2, -sy / 2, -sz / 2
    for f in bm.faces:
        k = face_key(f)
        for l in f.loops:
            p = l.vert.co
            if front is not None and k == front:
                if k == "-y":
                    uv = ((p.x - mnx) / sx, (p.z - mnz) / sz)
                elif k == "+y":
                    uv = ((sx / 2 - p.x) / sx, (p.z - mnz) / sz)
                elif k == "+x":
                    uv = ((p.y - mny) / sy, (p.z - mnz) / sz)
                elif k == "-x":
                    uv = ((sy / 2 - p.y) / sy, (p.z - mnz) / sz)
                elif k == "+z":
                    uv = ((p.x - mnx) / sx, (p.y - mny) / sy)
                else:
                    uv = ((p.x - mnx) / sx, (p.y - mny) / sy)
            else:
                uv = ((dark[0] + dark[1]) / 2, (dark[2] + dark[3]) / 2)
            l[uvl].uv = uv
    kill = [f for f in bm.faces if face_key(f) in open_faces]
    if kill:
        bmesh.ops.delete(bm, geom=kill, context="FACES")
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    return me


def add_box_bm(bm, c, s, rotx=0.0):
    sx, sy, sz = s
    rm = Matrix.Rotation(math.radians(rotx), 3, "X")
    vs = {}
    for ix in (-1, 1):
        for iy in (-1, 1):
            for iz in (-1, 1):
                p = rm @ Vector((ix * sx / 2, iy * sy / 2, iz * sz / 2)) + Vector(c)
                vs[(ix, iy, iz)] = bm.verts.new(p)
    quads = [
        ((-1, -1, -1), (-1, 1, -1), (-1, 1, 1), (-1, -1, 1)),
        ((1, -1, -1), (1, -1, 1), (1, 1, 1), (1, 1, -1)),
        ((-1, -1, -1), (-1, -1, 1), (1, -1, 1), (1, -1, -1)),
        ((-1, 1, -1), (1, 1, -1), (1, 1, 1), (-1, 1, 1)),
        ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1)),
        ((-1, -1, 1), (-1, 1, 1), (1, 1, 1), (1, -1, 1)),
    ]
    fs = [bm.faces.new([vs[k] for k in q]) for q in quads]
    bmesh.ops.recalc_face_normals(bm, faces=fs)


def planar_uv(bm, tile=1.0):
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            p = l.vert.co
            if ax == 0:
                uv = (p.y, p.z)
            elif ax == 1:
                uv = (p.x, p.z)
            else:
                uv = (p.x, p.y)
            l[uvl].uv = (uv[0] / tile, uv[1] / tile)


# ---------------------------------------------------------------- shell (one clean mesh)
def raw_box(name, lo, hi):
    bm = bmesh.new()
    vs = {}
    for ix in (0, 1):
        for iy in (0, 1):
            for iz in (0, 1):
                vs[(ix, iy, iz)] = bm.verts.new((hi[0] if ix else lo[0], hi[1] if iy else lo[1], hi[2] if iz else lo[2]))
    quads = [
        ((0, 0, 0), (0, 1, 0), (0, 1, 1), (0, 0, 1)),
        ((1, 0, 0), (1, 0, 1), (1, 1, 1), (1, 1, 0)),
        ((0, 0, 0), (0, 0, 1), (1, 0, 1), (1, 0, 0)),
        ((0, 1, 0), (1, 1, 0), (1, 1, 1), (0, 1, 1)),
        ((0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)),
        ((0, 0, 1), (0, 1, 1), (1, 1, 1), (1, 0, 1)),
    ]
    for q in quads:
        bm.faces.new([vs[k] for k in q])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return me


def cutter_mesh():
    pts = [(-5, -8), (-1.5, -8), (-1.5, -8.6), (5, -8.6), (5, 8), (-5, 8)]
    bm = bmesh.new()
    bot = [bm.verts.new((x, y, 0)) for x, y in pts]
    top = [bm.verts.new((x, y, 4.5)) for x, y in pts]
    bm.faces.new(bot)
    bm.faces.new(top)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([bot[i], bot[j], top[j], top[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("cutter")
    bm.to_mesh(me)
    bm.free()
    return me


outer = new_obj("_outer", raw_box("_outer", (-5.3, -8.3, -0.3), (5.3, 8.3, 4.8)), C_SHELL)
cut = new_obj("_cut", cutter_mesh(), C_SHELL)
mod = outer.modifiers.new("b", "BOOLEAN")
mod.operation = "DIFFERENCE"
mod.object = cut
mod.solver = "EXACT"
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
shell_me = bpy.data.meshes.new_from_object(outer.evaluated_get(dg))
bpy.data.objects.remove(outer, do_unlink=True)
bpy.data.objects.remove(cut, do_unlink=True)

bm = bmesh.new()
bm.from_mesh(shell_me)
bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1.0), verts=bm.verts, edges=bm.edges)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bmesh.ops.bevel(bm, geom=list(bm.edges), offset=0.05, segments=1, affect="EDGES")
bm.normal_update()
planar_uv(bm, tile=2.0)
for f in bm.faces:
    k = face_key(f)
    c = f.calc_center_median()
    f.material_index = 1 if (k == "+z" and c.z < 0.1 and c.z > -0.1) else 0
bm.to_mesh(shell_me)
bm.free()
shell_me.name = "Shell"
shell_me.materials.append(M["wall"])
shell_me.materials.append(M["floor"])
new_obj("Shell", shell_me, C_SHELL)

# ---------------------------------------------------------------- cabinets
cab_me = box_mesh("CabinetMesh", (0.95, 0.9, 1.9), M["cab"], front="-y", bevel=0.03, open_faces=("-z",))
plinth_me = box_mesh("PlinthMesh", (1.0, 0.95, 0.12), M["metal"], open_faces=("-z",))
cap_me = box_mesh("CabCapMesh", (1.0, 0.95, 0.1), M["metal"], bevel=0.015, open_faces=("-z",))

for i in range(11):
    y = -4.0 + i * 1.05
    for side, x, rz in (("L", -4.45, 90), ("R", 4.45, -90)):
        new_obj(f"Cab_{side}{i}", cab_me, C_CAB, (x, y, 0.12), (0, 0, rz))
        new_obj(f"Plinth_{side}{i}", plinth_me, C_CAB, (x, y, 0.06), (0, 0, rz))
        new_obj(f"Cap_{side}{i}", cap_me, C_CAB, (x, y, 0.12 + 0.95 + 0.05), (0, 0, rz))

# ceiling cabinets (upside-down)
ceil_cab_me = box_mesh("CeilCabMesh", (0.95, 0.9, 1.6), M["cab"], front="-y", bevel=0.03, open_faces=())
rod_me = box_mesh("RodMesh", (0.5, 0.5, 0.2), M["metal"], open_faces=("+z", "-z"))
for i in range(8):
    y = -4.5 + i * 1.5
    for side, x, rz in (("L", -2.2, 90), ("R", 2.2, -90)):
        zc = 4.5 - 0.2 - 0.8
        o = new_obj(f"CeilCab_{side}{i}", ceil_cab_me, C_CEIL, (x, y, zc), (0, 0, rz))
        o.rotation_mode = "XYZ"
        mw = Matrix.Translation((x, y, zc)) @ Matrix.Rotation(math.radians(rz), 4, "Z") @ Matrix.Rotation(math.pi, 4, "Y")
        o.matrix_world = mw
        new_obj(f"Rod_{side}{i}", rod_me, C_CEIL, (x, y, 4.4))

# ---------------------------------------------------------------- doors
# exit door on back wall (inner face y=8)
frame_me = box_mesh("ExitFrame", (2.2, 0.12, 3.0), M["metal"], bevel=0.0, open_faces=("+y", "-z"))
new_obj("ExitFrame", frame_me, C_DOOR, (0, 7.94, 1.5))
door_me = box_mesh("ExitDoor", (1.7, 0.12, 2.7), M["door"], front="-y", bevel=0.02, open_faces=("-z",))
new_obj("ExitDoor", door_me, C_DOOR, (0, 7.88, 1.35))
# keypad
keypad_me = box_mesh("Keypad", (0.5, 0.06, 0.62), M["keypad"], front="-y", bevel=0.01, open_faces=("+y",))
new_obj("Keypad", keypad_me, C_DOOR, (1.7, 7.97, 1.4))
# entry door on front stub inner face (y=-8), faces +y
eframe_me = box_mesh("EntryFrame", (2.0, 0.12, 2.9), M["metal"], bevel=0.0, open_faces=("-y", "-z"))
new_obj("EntryFrame", eframe_me, C_DOOR, (-3.2, -7.94, 1.45))
edoor_me = box_mesh("EntryDoor", (1.6, 0.12, 2.6), M["door"], front="+y", bevel=0.02, open_faces=("-z",))
new_obj("EntryDoor", edoor_me, C_DOOR, (-3.2, -7.88, 1.3))

# ---------------------------------------------------------------- floating objects
cab7_me = box_mesh("Cabinet7", (0.9, 0.8, 1.7), M["cab7"], front="-y", bevel=0.03)
new_obj("FloatCabinet7", cab7_me, C_FLOAT, (3.1, -0.3, 1.6), (0, 0, -70))

vol_me = box_mesh("ScreenVolume", (1.6, 0.08, 1.0), M["scr_vol"], front="-y", bevel=0.015)
new_obj("ScreenVolume", vol_me, C_FLOAT, (3.6, 0.5, 2.0), (-4, 0, -70))

code_me = box_mesh("ScreenCode", (1.4, 0.07, 0.9), M["scr_code"], front="-y", bevel=0.015)
new_obj("ScreenCode_A", code_me, C_FLOAT, (0.6, -0.8, 2.6), (6, 0, 8))
new_obj("ScreenCode_B", code_me, C_FLOAT, (-3.1, -2.2, 1.3), (-5, 0, -20))

arc_me = box_mesh("ScreenArchive", (1.5, 0.08, 0.95), M["scr_arc"], front="-y", bevel=0.015)
new_obj("ArchiveTerminal", arc_me, C_FLOAT, (-0.9, -4.5, 1.7), (3, 0, 10))

kb_me = box_mesh("Keyboard", (0.9, 0.32, 0.04), M["kb"], front="+z", bevel=0.008)
new_obj("FloatKeyboard", kb_me, C_FLOAT, (-1.0, 1.0, 1.1), (10, 0, 25))

# fan with only 2 blades (axis = y)
bm = bmesh.new()
n = 12
R, r, d = 0.38, 0.32, 0.12
of = [bm.verts.new((R * math.cos(2 * math.pi * i / n), -d / 2, R * math.sin(2 * math.pi * i / n))) for i in range(n)]
inf = [bm.verts.new((r * math.cos(2 * math.pi * i / n), -d / 2, r * math.sin(2 * math.pi * i / n))) for i in range(n)]
ob = [bm.verts.new((R * math.cos(2 * math.pi * i / n), d / 2, R * math.sin(2 * math.pi * i / n))) for i in range(n)]
ib = [bm.verts.new((r * math.cos(2 * math.pi * i / n), d / 2, r * math.sin(2 * math.pi * i / n))) for i in range(n)]
rf = []
for i in range(n):
    j = (i + 1) % n
    rf += [bm.faces.new([of[i], of[j], inf[j], inf[i]]),
           bm.faces.new([ob[i], ob[j], ib[j], ib[i]]),
           bm.faces.new([of[i], of[j], ob[j], ob[i]]),
           bm.faces.new([inf[i], inf[j], ib[j], ib[i]])]
bmesh.ops.recalc_face_normals(bm, faces=rf)
# hub
hn = 8
hr, hd = 0.07, 0.14
hf = [bm.verts.new((hr * math.cos(2 * math.pi * i / hn), -hd / 2, hr * math.sin(2 * math.pi * i / hn))) for i in range(hn)]
hb = [bm.verts.new((hr * math.cos(2 * math.pi * i / hn), hd / 2, hr * math.sin(2 * math.pi * i / hn))) for i in range(hn)]
hfaces = [bm.faces.new(hf), bm.faces.new(hb)]
for i in range(hn):
    j = (i + 1) % hn
    hfaces.append(bm.faces.new([hf[i], hf[j], hb[j], hb[i]]))
bmesh.ops.recalc_face_normals(bm, faces=hfaces)
# two blades only
add_box_bm(bm, (0.17, 0, 0), (0.21, 0.02, 0.12), rotx=25)
add_box_bm(bm, (-0.17, 0, 0), (0.21, 0.02, 0.12), rotx=25)
planar_uv(bm, tile=1.0)
fan_me = bpy.data.meshes.new("Fan2Blade")
bm.to_mesh(fan_me)
bm.free()
fan_me.materials.append(M["metal"])
new_obj("FloatFan", fan_me, C_FLOAT, (3.0, -1.5, 2.4), (0, 0, -15))

# ---------------------------------------------------------------- alarm lamp on right wall
base_me = box_mesh("AlarmBase", (0.12, 0.3, 0.3), M["metal"], bevel=0.01, open_faces=("+x",))
new_obj("AlarmBase", base_me, C_DETAIL, (4.94, 0.0, 3.6))
bm = bmesh.new()
us, vs_ = 8, 6
rad = 0.13
top = bm.verts.new((0, 0, rad))
bot = bm.verts.new((0, 0, -rad))
rings = []
for v in range(1, vs_):
    phi = math.pi * v / vs_
    rings.append([bm.verts.new((rad * math.sin(phi) * math.cos(2 * math.pi * u / us),
                                rad * math.sin(phi) * math.sin(2 * math.pi * u / us),
                                rad * math.cos(phi))) for u in range(us)])
sf = []
for u in range(us):
    w = (u + 1) % us
    sf.append(bm.faces.new([top, rings[0][u], rings[0][w]]))
    for k in range(len(rings) - 1):
        sf.append(bm.faces.new([rings[k][u], rings[k + 1][u], rings[k + 1][w], rings[k][w]]))
    sf.append(bm.faces.new([bot, rings[-1][w], rings[-1][u]]))
bmesh.ops.recalc_face_normals(bm, faces=sf)
planar_uv(bm, 1.0)
dome_me = bpy.data.meshes.new("AlarmDome")
bm.to_mesh(dome_me)
bm.free()
dome_me.materials.append(M["red"])
new_obj("AlarmDome", dome_me, C_DETAIL, (4.82, 0.0, 3.6))

# fluorescent tubes on ceiling underside
tube_me = box_mesh("TubeMesh", (0.14, 3.0, 0.08), M["tube"], open_faces=("+z",))
for xi, x in enumerate((-1.2, 1.2)):
    for yi, y in enumerate((-5.0, 0.0, 5.0)):
        new_obj(f"Tube_{xi}{yi}", tube_me, C_DETAIL, (x, y, 4.46))


# ---------------------------------------------------------------- cables
def cable(name, pts, radius=0.04):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.resolution_u = 3
    cu.bevel_depth = radius
    cu.bevel_resolution = 0
    sp = cu.splines.new("BEZIER")
    sp.bezier_points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        bp = sp.bezier_points[i]
        bp.co = p
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    tmp = bpy.data.objects.new("_tmp_" + name, cu)
    C_CABLE.objects.link(tmp)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    me.name = name
    me.materials.append(M["cable"])
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(cu)
    return new_obj(name, me, C_CABLE)


# back wall (sunk ends into ceiling / floor)
cable("Cable_Back_L1", [(-2.7, 7.93, 4.56), (-2.9, 7.93, 3.0), (-2.5, 7.93, 1.6), (-2.8, 7.93, -0.06)])
cable("Cable_Back_L2", [(-3.3, 7.93, 4.56), (-3.1, 7.93, 2.8), (-3.5, 7.93, 1.2), (-3.2, 7.93, -0.06)])
cable("Cable_Back_R1", [(3.0, 7.93, 4.56), (3.3, 7.93, 3.1), (2.9, 7.93, 1.8), (3.2, 7.93, -0.06)])
# left wall, above cabinets
cable("Cable_Left_1", [(-4.94, -8.05, 3.3), (-4.94, -3.0, 3.6), (-4.94, 2.0, 3.1), (-4.94, 8.05, 3.5)])
cable("Cable_Left_2", [(-4.94, -8.05, 2.8), (-4.94, -2.0, 2.6), (-4.94, 3.0, 3.0), (-4.94, 8.05, 2.7)])
# right wall, above cabinets
cable("Cable_Right_1", [(4.94, -8.0, 3.0), (4.94, -3.0, 2.8), (4.94, 2.0, 3.3), (4.94, 8.05, 3.0)])
cable("Cable_Right_2", [(4.94, -7.0, 4.56), (4.94, -4.5, 3.6), (4.94, 1.0, 4.0), (4.94, 8.05, 3.8)])
# ceiling
cable("Cable_Ceil_1", [(-2.8, -8.05, 4.46), (-2.4, -3.0, 4.46), (-3.0, 3.0, 4.46), (-2.6, 8.05, 4.46)])
cable("Cable_Ceil_2", [(2.8, 8.05, 4.46), (3.2, 3.0, 4.46), (4.4, 2.5, 4.3), (5.05, 2.4, 3.5)])
# floor
cable("Cable_Floor_1", [(1.9, 7.9, 0.05), (2.3, 4.0, 0.05), (1.0, 0.0, 0.05), (2.6, -3.0, 0.05), (4.15, -2.95, 0.05)])
cable("Cable_Floor_2", [(-1.4, 7.9, 0.05), (-2.0, 4.0, 0.05), (-1.2, 0.5, 0.05), (-3.0, -2.8, 0.05), (-4.15, -2.95, 0.05)])
cable("Cable_Floor_3", [(-2.0, -7.9, 0.05), (-1.2, -5.0, 0.05), (0.5, -3.0, 0.05), (1.5, -1.0, 0.05), (1.0, 1.5, 0.05)])

# ---------------------------------------------------------------- NPC stick figures (same-door NPC: 零/律/鈴/晴/栞；主角不加入)
def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def limb(bm, a, b, radius):
    a, b = Vector(a), Vector(b)
    vec = b - a
    length = vec.length
    if length < 1e-5:
        return
    rot = Vector((0, 0, 1)).rotation_difference(vec.normalized()).to_matrix().to_4x4()
    m = Matrix.Translation((a + b) / 2) @ rot
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=8,
                           radius1=radius, radius2=radius, depth=length, matrix=m)


def make_stick_mesh(name, color, p):
    bm = bmesh.new()
    limb(bm, p["hip_l"], p["knee_l"], 0.05); limb(bm, p["knee_l"], p["foot_l"], 0.044)
    limb(bm, p["hip_r"], p["knee_r"], 0.05); limb(bm, p["knee_r"], p["foot_r"], 0.044)
    limb(bm, p["pelvis"], p["neck"], 0.115)
    limb(bm, p["shoulder_l"], p["elbow_l"], 0.042); limb(bm, p["elbow_l"], p["hand_l"], 0.036)
    limb(bm, p["shoulder_r"], p["elbow_r"], 0.042); limb(bm, p["elbow_r"], p["hand_r"], 0.036)
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.13, matrix=Matrix.Translation(p["head"]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    planar_uv(bm, 1.0)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    mat = make_mat(f"M_{name}", color=color, rough=0.6, metal=0.0, emit_color=color, emit_strength=0.35)
    me.materials.append(mat)
    return me


# local skeleton convention: character faces local +Y; feet at z=0
POSE_ZERO = dict(  # 蹲下查看地面线缆，上身前倾，双手伸向地面
    pelvis=(0, 0, 0.55), neck=(0, 0.08, 0.95), head=(0, 0.14, 1.08),
    hip_l=(-0.09, 0, 0.55), knee_l=(-0.1, 0.12, 0.28), foot_l=(-0.1, 0.22, 0.0),
    hip_r=(0.09, 0, 0.55), knee_r=(0.1, 0.12, 0.28), foot_r=(0.1, 0.22, 0.0),
    shoulder_l=(-0.18, 0.05, 0.92), elbow_l=(-0.15, 0.25, 0.62), hand_l=(-0.1, 0.42, 0.35),
    shoulder_r=(0.18, 0.05, 0.92), elbow_r=(0.15, 0.25, 0.62), hand_r=(0.1, 0.42, 0.35),
)
POSE_LU = dict(  # 叉腰站岗，双脚略宽，警惕姿态
    pelvis=(0, 0, 0.85), neck=(0, 0, 1.35), head=(0, 0, 1.50),
    hip_l=(-0.11, 0, 0.85), knee_l=(-0.13, 0, 0.45), foot_l=(-0.13, 0, 0.0),
    hip_r=(0.11, 0, 0.85), knee_r=(0.13, 0, 0.45), foot_r=(0.13, 0, 0.0),
    shoulder_l=(-0.21, 0, 1.31), elbow_l=(-0.28, 0.08, 1.05), hand_l=(-0.14, 0.1, 0.95),
    shoulder_r=(0.21, 0, 1.31), elbow_r=(0.28, 0.08, 1.05), hand_r=(0.14, 0.1, 0.95),
)
POSE_RIN = dict(  # 低头、略微佝偻，双臂自然垂落
    pelvis=(0, 0, 0.85), neck=(0, -0.02, 1.33), head=(0.03, -0.04, 1.44),
    hip_l=(-0.09, 0, 0.85), knee_l=(-0.09, 0, 0.45), foot_l=(-0.09, 0, 0.0),
    hip_r=(0.09, 0, 0.85), knee_r=(0.09, 0, 0.45), foot_r=(0.09, 0, 0.0),
    shoulder_l=(-0.21, 0, 1.30), elbow_l=(-0.22, 0, 1.07), hand_l=(-0.23, 0, 0.84),
    shoulder_r=(0.21, 0, 1.30), elbow_r=(0.22, 0, 1.07), hand_r=(0.23, 0, 0.84),
)
POSE_QING = dict(  # 前跨步，右臂抬起前指，姿态动感
    pelvis=(0, 0, 0.86), neck=(0, 0.03, 1.36), head=(0, 0.05, 1.52),
    hip_l=(-0.09, 0, 0.86), knee_l=(-0.1, 0.1, 0.46), foot_l=(-0.1, 0.2, 0.0),
    hip_r=(0.09, 0, 0.86), knee_r=(0.09, -0.05, 0.46), foot_r=(0.09, -0.1, 0.0),
    shoulder_l=(-0.21, 0, 1.32), elbow_l=(-0.22, 0, 1.09), hand_l=(-0.23, 0, 0.86),
    shoulder_r=(0.21, 0.03, 1.32), elbow_r=(0.35, 0.25, 1.40), hand_r=(0.55, 0.5, 1.45),
)
POSE_SHIORI = dict(  # 面向密码锁，右臂抬至胸前侧伸，像在操作面板
    pelvis=(0, 0, 0.85), neck=(0, 0.04, 1.34), head=(0, 0.08, 1.49),
    hip_l=(-0.09, 0, 0.85), knee_l=(-0.09, 0, 0.45), foot_l=(-0.09, 0, 0.0),
    hip_r=(0.09, 0, 0.85), knee_r=(0.1, 0.06, 0.45), foot_r=(0.1, 0.1, 0.0),
    shoulder_l=(-0.21, 0, 1.30), elbow_l=(-0.22, 0, 1.07), hand_l=(-0.23, 0, 0.84),
    shoulder_r=(0.21, 0.02, 1.31), elbow_r=(0.32, 0.2, 1.28), hand_r=(0.42, 0.32, 1.22),
)

NPC_DEFS = [
    ("Zero", "#4ADE80", POSE_ZERO, (-1.0, -4.0, 0.0), 100),     # 蹲地检查左墙机柜下的线缆
    ("Lu", "#7EC8E3", POSE_LU, (0.9, -1.5, 0.0), -90),           # 过道中段叉腰警戒
    ("Rin", "#6B7280", POSE_RIN, (-0.8, 1.0, 0.0), 160),         # 独自低头站在过道另一侧
    ("Qing", "#FFE066", POSE_QING, (1.0, 3.5, 0.0), -60),        # 快步向出口方向，手臂前指
    ("Shiori", "#A67B5B", POSE_SHIORI, (-1.1, 6.3, 0.0), -75),   # 正对密码锁面板操作
]
for nm, hexcol, pose, loc, rz in NPC_DEFS:
    me = make_stick_mesh(f"NPC_{nm}", hexrgb(hexcol), pose)
    new_obj(f"NPC_{nm}", me, C_NPC, loc, (0, 0, rz))

# ---------------------------------------------------------------- lights + camera + world
def area(name, loc, rot, size, energy, color=(0.8, 0.9, 1.0)):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy = energy
    ld.size = size
    ld.color = color
    o = bpy.data.objects.new(name, ld)
    C_LIGHT.objects.link(o)
    o.location = loc
    o.rotation_euler = Euler([math.radians(a) for a in rot], "XYZ")
    return o


area("Key_Front", (2.0, -14, 4.2), (82, 0, 0), 9.0, 520, (0.85, 0.92, 1.0))
area("Fill_Top_A", (0, -3, 4.25), (0, 0, 0), 4.0, 220, (0.8, 0.9, 1.0))
area("Fill_Top_B", (0, 4, 4.25), (0, 0, 0), 4.0, 220, (0.8, 0.9, 1.0))
pl = bpy.data.lights.new("AlarmLight", "POINT")
pl.energy = 35
pl.color = (1.0, 0.1, 0.08)
pl.shadow_soft_size = 0.2
po = bpy.data.objects.new("AlarmLight", pl)
C_LIGHT.objects.link(po)
po.location = (4.5, 0.0, 3.6)

cam_d = bpy.data.cameras.new("Cam")
cam_d.lens = 20
cam = bpy.data.objects.new("Cam", cam_d)
C_LIGHT.objects.link(cam)
cam.location = (2.6, -13.5, 3.0)
dirv = Vector((-0.2, 2.0, 1.9)) - cam.location
cam.rotation_euler = dirv.to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

world = bpy.data.worlds[0] if bpy.data.worlds else bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = next((n for n in world.node_tree.nodes if n.type == "BACKGROUND"), None) or world.node_tree.nodes.new("ShaderNodeBackground")
bg.inputs["Color"].default_value = (0.05, 0.03, 0.08, 1)
bg.inputs["Strength"].default_value = 1.0

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1600
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.view_settings.view_transform = "Standard"
try:
    scene.eevee.taa_render_samples = 64
except Exception:
    pass


def tri_count():
    dg = bpy.context.evaluated_depsgraph_get()
    total = 0
    per = {}
    for o in scene.objects:
        if o.type == "MESH":
            me = o.evaluated_get(dg).to_mesh()
            t = sum(len(p.vertices) - 2 for p in me.polygons)
            total += t
            key = o.name.split("_")[0]
            per[key] = per.get(key, 0) + t
            o.evaluated_get(dg).to_mesh_clear()
    return total, per


result = None
