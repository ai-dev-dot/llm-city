import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { gardenTree } from '../../blocks/glm-5.3/garden-tree'
import { modernLamp, bollardLight } from '../../blocks/glm-5.3/modern-site'

/**
 * 蓝图馆 Blueprint Hall · E5「原点街区」四期城市规划馆（宗地 E5-07，20×20m）
 *
 * 「蓝图」：城市在成为城市之前是一张图纸。白盒体量像摊开的晒图纸，蓝图青玻璃带是
 * 图纸线条；中央通高中庭放着微缩模都沙盘（九宫格街区，E5 三件套逐件可辨，西南角
 * 还有一座小小的蓝图馆——馆里看城，城里也有馆）；中庭顶是发光圆环天窗——E5 圆环
 * 母题的最后一环：光庭（地面）→ 塔冠环（空中）→ 水环（地面）→ 澜环（塔身）→
 * 天窗环（收口）。白天采光，入夜微光，为街区叙事画句点。
 *
 * 坐标：局部原点 = 宗地中心地面，+x 东、+z 北（E5 街区统一约定），x/z∈[-10,10]。
 * 东邻光环广场（主入口朝东迎人流），北邻原点塔宗地（次入口）。
 * R13 本体线 |x|≤8、|z|≤8：主体 15.6 方盒居中。
 */

/* ---------- 常量 ---------- */

const H1 = 5.0, H2 = 10.0                 // 一层 / 二层檐口标高
const HALL = 7.9                          // 主体半宽（15.8×15.8，R13 线内）
const BLUE = '#2E4A66'                    // 蓝图青（cyanotype 系）

/* ---------- 顶点合并 Sink（街区同工艺，兼容非索引几何） ---------- */

interface Sink { pos: number[]; nor: number[]; col: number[]; idx: number[] }
const newSink = (): Sink => ({ pos: [], nor: [], col: [], idx: [] })

function pushGeo(s: Sink, g: THREE.BufferGeometry, c: THREE.Color, m?: THREE.Matrix4): void {
  if (m) g.applyMatrix4(m)
  const p = g.attributes.position, n = g.attributes.normal, ix = g.index
  const base = s.pos.length / 3
  for (let i = 0; i < p.count; i++) {
    s.pos.push(p.getX(i), p.getY(i), p.getZ(i))
    s.nor.push(n.getX(i), n.getY(i), n.getZ(i))
    s.col.push(c.r, c.g, c.b)
  }
  if (ix) for (let i = 0; i < ix.count; i++) s.idx.push(ix.getX(i) + base)
  else for (let i = 0; i < p.count; i++) s.idx.push(i + base)
  g.dispose()
}

function box(s: Sink, w: number, h: number, d: number, x: number, y: number, z: number, c: THREE.Color, rotY = 0): void {
  const g = new THREE.BoxGeometry(w, h, d)
  if (rotY) g.rotateY(rotY)
  g.translate(x, y, z)
  pushGeo(s, g, c)
}

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

function sinkMesh(s: Sink, mat: THREE.Material): THREE.Mesh {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(s.nor, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(s.col, 3))
  g.setIndex(s.idx)
  return mesh(g, mat)
}

const C = (h: string) => new THREE.Color(h)

/* ---------- 材质（E5 谱系 + 蓝图青知识灯态） ---------- */

const matSolid = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.25, envMapIntensity: 1.2 })
const matPave = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.06, roughness: 0.92 })
const matGlassBlue = new THREE.MeshStandardMaterial({ color: '#3D5F80', metalness: 0.4, roughness: 0.14, emissive: '#7FA8C8', emissiveIntensity: 0.32, envMapIntensity: 1.2, side: THREE.DoubleSide })
const matGlassHall = new THREE.MeshStandardMaterial({ color: '#8FB4D4', metalness: 0.15, roughness: 0.08, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
const matGlow = new THREE.MeshStandardMaterial({ color: '#FFD9A0', emissive: '#FFC878', emissiveIntensity: 2.5 })
const matGlowW = new THREE.MeshStandardMaterial({ color: '#FFF3DC', emissive: '#FFEED2', emissiveIntensity: 2.1 })
const matGold = stdMaterial('#C9AE8A', { metalness: 0.72, roughness: 0.25 })
const matTableLit = stdMaterial('#E8E2D2', { emissive: '#FFF4DC', emissiveIntensity: 0.55, roughness: 0.6 })

const SILVER_L = C('#E8E6E1'), SILVER = C('#C4C1BA'), SILVER_M = C('#9EA3A9')
const PAVE_L = C('#9C9890'), PAVE_M = C('#7E7A73'), PAVE_D = C('#5E5B56')
const GRASS_C = C('#667A54'), WHITE_W = C('#DDD8CE'), WHITE_W_D = C('#B8B0A2')
const BLUE_C = C(BLUE), BLUE_D = C('#22364C')

/* ---------- 场地：基底 + 蓝图坐标网格 + 东前庭地花 + 角标墩 + 草皮树 ---------- */

function paving(parent: THREE.Object3D): void {
  const base = newSink()
  box(base, 19.9, 0.04, 19.9, 0, 0.02, 0, C('#4B4B49'))
  box(base, 19.7, 0.04, 19.7, 0, 0.045, 0, PAVE_L)
  parent.add(sinkMesh(base, matPave))

  // 蓝图坐标网格（1.0m 网格缝——晒图纸的坐标格）+ 青色轴线（十字，贯穿前庭）
  const grid = newSink()
  for (let gx = -9; gx <= 9.01; gx += 1.0)
    if (Math.abs(gx) > 0.05) box(grid, 0.05, 0.04, 19.4, gx, 0.058, 0, PAVE_D)
  for (let gz = -9; gz <= 9.01; gz += 1.0)
    if (Math.abs(gz) > 0.05) box(grid, 19.4, 0.04, 0.05, 0, 0.058, gz, PAVE_D)
  parent.add(sinkMesh(grid, matPave))
  const axis = newSink()
  box(axis, 19.4, 0.04, 0.2, 0, 0.062, 0, BLUE_C)
  box(axis, 0.2, 0.04, 19.4, 0, 0.062, 0, BLUE_C)
  box(axis, 19.4, 0.03, 0.06, 0, 0.064, 0.28, BLUE_D)
  box(axis, 19.4, 0.03, 0.06, 0, 0.064, -0.28, BLUE_D)
  box(axis, 0.06, 0.03, 19.4, 0.28, 0.064, 0, BLUE_D)
  box(axis, 0.06, 0.03, 19.4, -0.28, 0.064, 0, BLUE_D)
  parent.add(sinkMesh(axis, stdMaterial(BLUE, { metalness: 0.2, roughness: 0.5 })))

  // 东前庭同心圆欢迎地花（迎光环广场人流；圆母题的地面回声，收在宗地界内）
  const petal = newSink()
  for (const [r, cc] of [[1.1, PAVE_M], [1.8, PAVE_L], [2.35, PAVE_M]] as Array<[number, THREE.Color]>) {
    const g = new THREE.RingGeometry(r - 0.3, r, 48, 1)
    g.rotateX(-Math.PI / 2)
    g.translate(7.5, 0.06, 0)
    pushGeo(petal, g, cc)
  }
  parent.add(sinkMesh(petal, matPave))

  // 四角图纸角标墩（景观小品，挂 site 豁免）——图纸的坐标标记
  const marks = newSink()
  for (const [mx, mz] of [[-9.3, -9.3], [9.3, -9.3], [-9.3, 9.3], [9.3, 9.3]] as Array<[number, number]>) {
    box(marks, 0.45, 0.75, 0.45, mx, 0.42, mz, WHITE_W)
    box(marks, 0.5, 0.1, 0.5, mx, 0.82, mz, BLUE_C)
  }
  const marksMesh = sinkMesh(marks, matPave)
  marksMesh.userData.site = true
  parent.add(marksMesh)

  // 草皮环带（北/南/西）+ 步道
  const green = newSink()
  box(green, 19.7, 0.05, 1.5, 0, 0.03, 9.1, GRASS_C)
  box(green, 19.7, 0.05, 1.5, 0, 0.03, -9.1, GRASS_C)
  box(green, 1.5, 0.05, 16.7, -9.1, 0.03, 0, GRASS_C)
  box(green, 0.8, 0.05, 16.5, -8.6, 0.055, 0, PAVE_M)
  parent.add(sinkMesh(green, matPave))

  // 树阵 8（北 3 南 3 西 2）
  const trees: Array<[number, number, number]> = [
    [-5.5, 9.2, 0.9], [0, 9.25, 1.0], [5.5, 9.2, 0.9],
    [-5.5, -9.2, 0.95], [0, -9.25, 0.85], [5.5, -9.2, 0.95],
    [-9.15, -5, 0.9], [-9.15, 5, 1.0],
  ]
  trees.forEach(([tx, tz, sc], i) => parent.add(gardenTree({ x: tx, z: tz, scale: sc, seed: 131 + i * 13 })))
}

/* ---------- 主体：两层白盒 + 立面体系（展窗带/竖窗阵/图框线/层带） ---------- */

function hall(parent: THREE.Object3D): void {
  const s = newSink()
  // 主体两层白盒（浅暖白）+ 层间银带（悬浮二层）+ 檐口
  box(s, HALL * 2, H1 - 0.3, HALL * 2, 0, (H1 - 0.3) / 2, 0, WHITE_W)
  box(s, HALL * 2 + 0.2, 0.34, HALL * 2 + 0.2, 0, H1 - 0.15, 0, SILVER)
  box(s, HALL * 2, H2 - H1, HALL * 2, 0, H1 + (H2 - H1) / 2, 0, WHITE_W)
  box(s, HALL * 2 + 0.18, 0.26, HALL * 2 + 0.18, 0, H2 - 0.13, 0, SILVER_L)   // 檐口亮银细带（收薄防压顶）
  box(s, HALL * 2 - 0.6, 0.5, HALL * 2 - 0.6, 0, H2 + 0.25, 0, WHITE_W_D)    // 屋面女儿墙内衬
  parent.add(sinkMesh(s, matPave))

  // 四向立面：一层横向展窗带（蓝图青玻璃 + 银框 + 竖筋）+ 二层竖条窗阵
  const frames = newSink(), glass = newSink()
  const faces: Array<{ dir: number; cx: number; cz: number }> = [
    { dir: Math.PI / 2, cx: HALL, cz: 0 },      // 东（主立面）
    { dir: 0, cx: 0, cz: HALL },                // 北（次入口）
    { dir: -Math.PI / 2, cx: -HALL, cz: 0 },    // 西
    { dir: Math.PI, cx: 0, cz: -HALL },         // 南
  ]
  for (const f of faces) {
    const nx = Math.sin(f.dir), nz = Math.cos(f.dir)         // 面外法线
    const tx = Math.cos(f.dir), tz = -Math.sin(f.dir)        // 面内横向
    const put = (w: number, h: number, d: number, off: number, y: number, cc: THREE.Color) =>
      box(frames, w, h, d, f.cx + tx * off + nx * 0.08, y, f.cz + tz * off + nz * 0.08, cc, f.dir)
    // 一层：三扇横向展窗（每扇 3.6 宽，间隔墙垛）——东面中扇让位主入口
    const bays = [-5.2, 0, 5.2]
    for (const off of bays) {
      if (f.dir === Math.PI / 2 && Math.abs(off) < 0.1) continue    // 东主入口位
      put(3.6, 2.6, 0.1, off, 2.5, SILVER)                          // 窗框
      const gw = 3.3, gh = 2.3
      const g = new THREE.BoxGeometry(gw, gh, 0.05)
      if (f.dir) g.rotateY(f.dir)
      g.translate(f.cx + tx * off + nx * 0.09, 2.5, f.cz + tz * off + nz * 0.09)
      pushGeo(glass, g, C(BLUE))
      for (let k = 1; k < 7; k++) put(0.05, 2.3, 0.04, off - gw / 2 + (gw * k) / 7, 2.5, SILVER_M)   // 竖筋 ×6/扇
      for (const hy of [1.65, 3.35]) put(3.3, 0.05, 0.04, off, hy, SILVER_M)                           // 横筋 ×2/扇
    }
    // 二层：竖条窗阵 ×10（蓝图青竖窗，1.44m 分格）
    for (let i = 0; i < 10; i++) {
      const off = -6.5 + i * 1.44
      put(1.0, 3.6, 0.1, off, H1 + (H2 - H1) / 2 + 0.3, SILVER)
      const g = new THREE.BoxGeometry(0.72, 3.3, 0.05)
      if (f.dir) g.rotateY(f.dir)
      g.translate(f.cx + tx * off + nx * 0.09, H1 + (H2 - H1) / 2 + 0.3, f.cz + tz * off + nz * 0.09)
      pushGeo(glass, g, C(BLUE))
      for (const hy of [H1 + 1.8, H1 + 4.5, H1 + 7.2]) put(1.0, 0.06, 0.06, off, hy, SILVER_M)        // 横梃 ×3/窗
    }
    // 陶板竖肋 ×12（通高立面肌理——晒图纸的折痕线）
    for (let i = 0; i < 12; i++) {
      const off = -7.15 + i * 1.3
      if (f.dir === Math.PI / 2 && Math.abs(off) < 0.8) continue
      put(0.07, H2 - 0.5, 0.09, off, (H2 - 0.5) / 2 + 0.1, WHITE_W_D)
    }
    // 基座展墙横缝 ×5（石板分层）
    for (let k = 1; k < 5; k++) put(HALL * 2, 0.05, 0.04, 0, k * 0.85, WHITE_W_D)
    // 图框勾边线（立面四边细银线——图框语言，双线）
    put(HALL * 2, 0.1, 0.06, 0, H2 - 0.62, SILVER_L)
    put(HALL * 2, 0.07, 0.06, 0, H2 - 0.82, SILVER_L)
    put(HALL * 2, 0.1, 0.06, 0, 0.35, SILVER_L)
    for (const sx of [-7.75, 7.75]) { put(0.1, H2 - 1.0, 0.06, sx, H2 / 2, SILVER_L); put(0.07, H2 - 1.0, 0.06, sx, H2 / 2, SILVER_L) }
  }
  parent.add(sinkMesh(frames, matSolid))
  parent.add(sinkMesh(glass, matGlassBlue))

  // 女儿墙顶齿状格栅（四向 56 个小盒——图纸的刻度带，单层不堆叠；收在 R13 线内）
  const dent = newSink()
  for (const [ex, ez, dir] of [[0, HALL + 0.04, 0], [0, -HALL - 0.04, 0], [HALL + 0.04, 0, Math.PI / 2], [-HALL - 0.04, 0, Math.PI / 2]] as Array<[number, number, number]>) {
    for (let i = 0; i < 14; i++) {
      const off = -7.0 + i * 1.08
      const g = new THREE.BoxGeometry(0.5, 0.14, 0.14)
      if (dir) g.rotateY(dir)
      g.translate(ex + (dir ? 0 : off), H2 + 0.32, ez + (dir ? off : 0))
      pushGeo(dent, g, SILVER)
    }
  }
  parent.add(sinkMesh(dent, matSolid))

  // 角部图号牌（四角小青牌）
  const tags = newSink()
  for (const [cx2, cz2, r] of [[7.5, 7.5, Math.PI / 4], [7.5, -7.5, -Math.PI / 4], [-7.5, 7.5, Math.PI * 3 / 4], [-7.5, -7.5, -Math.PI * 3 / 4]] as Array<[number, number, number]>) {
    box(tags, 0.7, 0.5, 0.12, cx2 + Math.cos(r) * 0.35, H2 - 1.1, cz2 + Math.sin(r) * 0.35, BLUE_C, r)
  }
  parent.add(sinkMesh(tags, stdMaterial(BLUE, { metalness: 0.3, roughness: 0.4, emissive: '#3D5F80', emissiveIntensity: 0.4 })))

  // 东主入口：双柱门斗 + 贴墙青金梁雨棚（收进 R13 线内）+ 双扇玻璃门
  const ent = newSink()
  box(ent, 4.6, 0.32, 0.42, HALL - 0.22, 3.9, 0, BLUE_C, Math.PI / 2)
  box(ent, 4.9, 0.1, 0.18, HALL - 0.12, 4.1, 0, C('#C9AE8A'), Math.PI / 2)
  for (const dz of [-2.0, 2.0]) {
    const col = new THREE.CylinderGeometry(0.15, 0.17, 3.8, 10)
    col.translate(HALL - 0.32, 1.9, dz)
    pushGeo(ent, col, SILVER_L)
  }
  parent.add(sinkMesh(ent, matGold))
  const door = newSink()
  for (const dz of [-0.55, 0.55]) box(door, 0.08, 3.0, 1.0, HALL - 0.02, 1.5, dz, C(BLUE))
  box(door, 0.1, 3.4, 2.3, HALL - 0.03, 1.7, 0, SILVER)
  parent.add(sinkMesh(door, matGlassBlue))

  // 北次入口（简洁门斗，收进 R13 线内）
  const ent2 = newSink()
  box(ent2, 2.6, 0.26, 0.36, 0, 3.4, HALL - 0.22, SILVER_L)
  box(ent2, 1.4, 2.6, 0.08, 0, 1.3, HALL - 0.06, C(BLUE))
  parent.add(sinkMesh(ent2, matSolid))
}

/* ---------- 中庭阁 + 圆环天窗 + 二层俯瞰环廊 ---------- */

function atrium(parent: THREE.Object3D): void {
  // 玻璃阁体（8×8，从屋面升 6m；四角银柱 + 竖梃 + 玻璃）
  const s = newSink()
  const A = 4.0, AH = 6.0
  for (const [dx, dz] of [[-A, -A], [A, -A], [A, A], [-A, A]] as Array<[number, number]>) {
    const col = new THREE.BoxGeometry(0.34, AH, 0.34)
    col.translate(dx, H2 + AH / 2, dz)
    pushGeo(s, col, SILVER)
  }
  for (const [ex, ez, dir] of [[0, -A, 0], [0, A, 0], [-A, 0, Math.PI / 2], [A, 0, Math.PI / 2]] as Array<[number, number, number]>) {
    for (let i = 1; i < 7; i++) {
      const off = -A + (2 * A * i) / 7
      const g = new THREE.BoxGeometry(0.07, AH - 0.2, 0.1)
      if (dir) g.rotateY(dir)
      g.translate(ex + (dir ? 0 : off), H2 + AH / 2, ez + (dir ? off : 0))
      pushGeo(s, g, SILVER_M)
    }
  }
  box(s, A * 2 + 0.4, 0.3, A * 2 + 0.4, 0, H2 + AH - 0.15, 0, SILVER_L)   // 阁顶板
  parent.add(sinkMesh(s, matSolid))
  const gl = newSink()
  for (const [ex, ez, dir] of [[0, -A, 0], [0, A, 0], [-A, 0, Math.PI / 2], [A, 0, Math.PI / 2]] as Array<[number, number, number]>) {
    const g = new THREE.BoxGeometry(A * 2 - 0.3, AH - 0.4, 0.04)
    if (dir) g.rotateY(dir)
    g.translate(ex, H2 + AH / 2, ez)
    pushGeo(gl, g, C('#8FB4D4'))
  }
  parent.add(sinkMesh(gl, matGlassHall))

  // 圆环天窗（E5 母题收口环：r3 发光环 + 环内米字采光梁 + 中心小盘）+ 金边高分段
  const ring = mesh(new THREE.TorusGeometry(3.0, 0.22, 24, 192), matGlowW)
  ring.rotateX(Math.PI / 2); ring.position.set(0, H2 + AH + 0.35, 0); parent.add(ring)
  const rim = mesh(new THREE.TorusGeometry(3.35, 0.08, 14, 192), matGold)
  rim.rotateX(Math.PI / 2); rim.position.set(0, H2 + AH + 0.35, 0); parent.add(rim)
  const rim2 = mesh(new THREE.TorusGeometry(2.72, 0.05, 10, 160), matGold)
  rim2.rotateX(Math.PI / 2); rim2.position.set(0, H2 + AH + 0.32, 0); parent.add(rim2)
  const beams = newSink()
  for (let i = 0; i < 4; i++) {
    const g = new THREE.BoxGeometry(6.6, 0.14, 0.26)
    g.rotateY((i * Math.PI) / 4); g.translate(0, H2 + AH + 0.42, 0)
    pushGeo(beams, g, SILVER)
  }
  parent.add(sinkMesh(beams, matSolid))
  const hub = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 24), matGlow)
  hub.position.set(0, H2 + AH + 0.46, 0); parent.add(hub)

  // 二层俯瞰环廊（沿中庭四周悬挑内廊；栏杆=railG 环形竖杆阵）
  const gal = newSink()
  for (const [gx, gz, w, d] of [[0, -2.8, 7.4, 1.2], [0, 2.8, 7.4, 1.2], [-2.8, 0, 1.2, 4.4], [2.8, 0, 1.2, 4.4]] as Array<[number, number, number, number]>) {
    box(gal, w, 0.22, d, gx, H1 + 0.11, gz, WHITE_W_D)
  }
  parent.add(sinkMesh(gal, matPave))
  const railG = newSink()
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2
    const rx = Math.cos(a) * 4.35, rz = Math.sin(a) * 4.35
    if (Math.abs(rx) > 3.5 && Math.abs(rz) > 3.5) continue
    const rod = new THREE.CylinderGeometry(0.02, 0.02, 0.72, 4)
    rod.translate(rx, H1 + 0.42, rz)
    pushGeo(railG, rod, SILVER_M)
  }
  const handRail = new THREE.TorusGeometry(4.35, 0.045, 8, 128)
  handRail.rotateX(Math.PI / 2); handRail.translate(0, H1 + 0.78, 0)
  pushGeo(railG, handRail, SILVER)
  parent.add(sinkMesh(railG, matSolid))

  // 中庭地面（浅色展面 + 中央沙盘台座裙边 + 同心圆地花——观众低头的视线焦点）
  const floor = newSink()
  box(floor, 7.6, 0.06, 7.6, 0, 0.09, 0, C('#C8C2B6'))
  box(floor, 6.6, 0.08, 6.6, 0, 0.13, 0, BLUE_D)
  for (const [r, cc] of [[3.0, C('#A9A5A0')], [3.35, C('#C0BBB2')]] as Array<[number, THREE.Color]>) {
    const g = new THREE.RingGeometry(r, r + 0.12, 48, 1)
    g.rotateX(-Math.PI / 2); g.translate(0, 0.165, 0)
    pushGeo(floor, g, cc)
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const tick = new THREE.BoxGeometry(0.4, 0.02, 0.07)
    tick.rotateY(-a); tick.translate(Math.cos(a) * 3.17, 0.168, Math.sin(a) * 3.17)
    pushGeo(floor, tick, C('#8C8880'))
  }
  parent.add(sinkMesh(floor, matTableLit))

  // 中庭北侧两跑参观楼梯（踏步×2×12 + 边梁）——二层俯瞰沙盘的路径
  const stair = newSink()
  for (let k = 0; k < 12; k++) {
    box(stair, 0.62, 0.06, 0.26, -3.4 - 0.0, 0.35 + k * 0.32, -1.2 + k * 0.28, WHITE_W_D)
    box(stair, 0.62, 0.06, 0.26, 3.4, 0.35 + k * 0.32, -1.2 + k * 0.28, WHITE_W_D)
  }
  box(stair, 0.62, 0.08, 3.6, -3.4, H1 - 0.1, 1.9, SILVER_M)
  box(stair, 0.62, 0.08, 3.6, 3.4, H1 - 0.1, 1.9, SILVER_M)
  parent.add(sinkMesh(stair, matPave))

  // 二层环廊墙面「蓝图展画」×8（错位双跑楼梯之间的弧面展带——展馆挂图纸）
  const arts = newSink()
  for (const [ax, az, r] of [[-2.2, -3.6, 0], [0, -3.6, 0], [2.2, -3.6, 0], [-2.2, 3.6, Math.PI], [0, 3.6, Math.PI], [2.2, 3.6, Math.PI], [-3.6, -2.2, Math.PI / 2], [-3.6, 2.2, Math.PI / 2]] as Array<[number, number, number]>) {
    const art = new THREE.BoxGeometry(1.0, 0.66, 0.05)
    art.rotateY(r); art.translate(ax, H1 + 2.2, az)
    pushGeo(arts, art, C(BLUE))
    const frame2 = new THREE.BoxGeometry(1.12, 0.78, 0.03)
    frame2.rotateY(r); frame2.translate(ax, H1 + 2.2, az)
    pushGeo(arts, frame2, C('#DDD8CE'))
  }
  parent.add(sinkMesh(arts, stdMaterial('#3D5F80', { emissive: '#6E98C0', emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.1 })))
}

/* ---------- 微缩模都沙盘（E5 街区 1:11 总图沙盘：9 地块四件套逐件可辨 + 递归彩蛋） ---------- */

function sandtable(parent: THREE.Object3D): void {
  const s = newSink()
  // 台座（6×6）+ 裙边 + 基面 + 台前发光铭牌 + 四角展灯
  box(s, 6.6, 0.86, 6.6, 0, 0.43, 0, WHITE_W_D)
  box(s, 6.9, 0.12, 6.9, 0, 0.9, 0, SILVER)
  box(s, 6.0, 0.05, 6.0, 0, 0.94, 0, C('#CFCAC0'))
  for (const [cx, cz] of [[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]] as Array<[number, number]>) {
    const dot = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10)
    dot.translate(cx, 0.99, cz); pushGeo(s, dot, C('#FFD9A0'))
  }
  const tag = mesh(new THREE.BoxGeometry(1.5, 0.34, 0.06), matGlowW)
  tag.position.set(0, 0.72, -3.38); parent.add(tag)          // 台前发光铭牌
  // 台座展柜灯带（双圈高分段——沙盘的「展柜光」）
  const strip = newSink()
  const s1 = new THREE.TorusGeometry(3.45, 0.035, 8, 192)
  s1.rotateX(Math.PI / 2); s1.translate(0, 0.96, 0); pushGeo(strip, s1, C('#FFF3DC'))
  const s2 = new THREE.TorusGeometry(3.3, 0.022, 6, 160)
  s2.rotateX(Math.PI / 2); s2.translate(0, 0.93, 0); pushGeo(strip, s2, C('#FFD9A0'))
  parent.add(sinkMesh(strip, matGlowW))
  // 沙盘参观围栏（四边低栏，观众止步线）
  const fence = newSink()
  for (const [fx, fz, w, d] of [[0, -3.85, 7.4, 0.06], [0, 3.85, 7.4, 0.06], [-3.85, 0, 0.06, 7.4], [3.85, 0, 0.06, 7.4]] as Array<[number, number, number, number]>) {
    box(fence, w, 0.04, d, fx, 0.6, fz, SILVER_M)
    const n = Math.floor(Math.max(w, d) / 0.55)
    for (let i = 0; i <= n; i++) {
      const rod = new THREE.CylinderGeometry(0.014, 0.014, 0.6, 4)
      rod.translate(fx + (w > d ? -w / 2 + (w * i) / n : 0), 0.32, fz + (d > w ? -d / 2 + (d * i) / n : 0))
      pushGeo(fence, rod, SILVER_M)
    }
  }
  parent.add(sinkMesh(fence, matSolid))
  parent.add(sinkMesh(s, matPave))

  // 地块网（3×3，格 1.6、格距 1.8：E5 街区 1:11）+ 道路缝 + 台面细网格缝（0.6 间距图纸格）
  const m = newSink()
  const grey = C('#A8A49C'), greyD = C('#8C8880')
  for (let i = 0; i < 3; i++) {
    box(m, 5.4, 0.03, 0.1, 0, 0.965, -1.8 + i * 1.8, C('#EDEBE6'))
    box(m, 0.1, 0.03, 5.4, -1.8 + i * 1.8, 0.965, 0, C('#EDEBE6'))
  }
  for (let k = 1; k < 10; k++) {                       // 图纸细格（各街区内的地块划分线）
    box(m, 5.4, 0.02, 0.04, 0, 0.968, -2.7 + k * 0.6, C('#D8D4CC'))
    box(m, 0.04, 0.02, 5.4, -2.7 + k * 0.6, 0.968, 0, C('#D8D4CC'))
  }
  // 微树阵（每街区 5 棵微球树——城市绿化剪影）
  const treeSpots: Array<[number, number]> = [
    [-2.4, 2.3], [-1.2, 2.5], [-2.5, 1.4], [-0.9, 1.6], [-1.9, 2.0],
    [0.6, 2.4], [1.2, 2.3], [0.3, 1.5], [1.8, 1.6], [2.4, 2.4],
    [-2.4, -0.6], [-1.3, -1.0], [0.5, -0.5], [1.1, 0.5], [2.4, -0.7],
    [0.7, -2.4], [1.5, -2.3], [2.4, -1.5], [0.3, -1.4], [-2.3, -2.4],
  ]
  for (const [tx, tz] of treeSpots) {
    const trunk = new THREE.CylinderGeometry(0.015, 0.02, 0.1, 4)
    trunk.translate(tx, 1.01, tz); pushGeo(m, trunk, greyD)
    const crown = new THREE.SphereGeometry(0.07, 6, 5)
    crown.translate(tx, 1.09, tz); pushGeo(m, crown, C('#7A8A66'))
  }
  // 微车流点（道路缝上的车流剪影）
  const cars: Array<[number, number, number]> = [
    [-1.9, 0.6, 0], [-0.7, -1.2, 0], [1.5, 0.9, 0], [2.3, -0.6, 0],
    [0.5, 1.9, Math.PI / 2], [-1.1, -2.4, Math.PI / 2], [1.9, 2.2, Math.PI / 2], [-2.5, 1.7, Math.PI / 2],
    [-1.9, -0.8, 0], [0.9, -1.4, 0], [2.5, 1.2, 0], [-0.3, 2.5, Math.PI / 2],
  ]
  for (const [cx, cz, r] of cars) {
    const car = new THREE.BoxGeometry(0.16, 0.05, 0.07)
    car.rotateY(r); car.translate(cx, 1.0, cz)
    pushGeo(m, car, C('#8C8880'))
  }
  parent.add(sinkMesh(m, matPave))

  // —— E5 四件套微缩（地块：01-03 北排 / 04-06 中排 / 07-09 南排；+x 东 +z 北）——
  const e5 = newSink()
  // 一期 · 微缩原点塔（01+02+04+05 西北 2×2；三段向西北错动收分 + 段间腰线 + 竖棱 + 小金环冠）
  const segs: Array<[number, number, number, number, number]> = [   // [cx, cz, y0, h, r]
    [-1.1, 0.75, 0.98, 1.55, 0.12], [-1.25, 0.9, 2.53, 1.05, 0.095], [-1.38, 1.03, 3.58, 0.9, 0.075],
  ]
  for (const [cx, cz, y0, h, r] of segs) {
    const t = new THREE.CylinderGeometry(r * 0.82, r, h, 12)
    t.translate(cx, y0 + h / 2, cz); pushGeo(e5, t, C('#6E92B8'))
    for (let i = 0; i < 8; i++) {                                   // 竖棱线（幕墙梃剪影）
      const a = (i / 8) * Math.PI * 2
      const rod = new THREE.BoxGeometry(0.014, h, 0.014)
      rod.rotateY(-a); rod.translate(cx + Math.cos(a) * r, y0 + h / 2, cz + Math.sin(a) * r)
      pushGeo(e5, rod, C('#9EC5DD'))
    }
    const belt = new THREE.CylinderGeometry(r + 0.02, r + 0.02, 0.05, 12)   // 段间腰线盘
    belt.translate(cx, y0 + h, cz); pushGeo(e5, belt, greyD)
  }
  const haloM = mesh(new THREE.TorusGeometry(0.15, 0.032, 8, 32), matGold)
  haloM.rotateX(Math.PI / 2); haloM.position.set(-1.38, 4.55, 1.03); parent.add(haloM)
  box(e5, 0.6, 0.2, 0.6, -1.15, 1.05, 0.7, greyD)                        // 微缩裙房
  box(e5, 0.14, 0.14, 0.14, -0.85, 0.98, 0.45, C('#FFD9A0'))            // 原点光庭微光点
  // 二期 · 微缩光环广场（08+09 南中东：同心圆盘 ×5 + 小水环 + 放射刻度 12 + 柱廊点 16）
  const p1 = new THREE.CylinderGeometry(0.55, 0.55, 0.05, 28)
  p1.translate(0.9, 0.985, -1.8); pushGeo(e5, p1, C('#C8C2B6'))
  for (const [r, cc] of [[0.38, C('#4E86A0')], [0.52, greyD], [0.62, C('#B5B0A6')], [0.72, greyD]] as Array<[number, THREE.Color]>) {
    const rr = new THREE.TorusGeometry(r, 0.03, 6, 36)
    rr.rotateX(Math.PI / 2); rr.translate(0.9, 1.03, -1.8); pushGeo(e5, rr, cc)
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const tick = new THREE.BoxGeometry(0.02, 0.02, 0.3)
    tick.rotateY(-a); tick.translate(0.9 + Math.cos(a) * 0.44, 1.03, -1.8 + Math.sin(a) * 0.44)
    pushGeo(e5, tick, C('#D8D4CC'))
  }
  for (let i = 0; i < 16; i++) {                                          // 微柱廊点阵
    const a = (i / 16) * Math.PI * 2
    const rod = new THREE.CylinderGeometry(0.013, 0.013, 0.16, 4)
    rod.translate(0.9 + Math.cos(a) * 0.6, 1.08, -1.8 + Math.sin(a) * 0.6)
    pushGeo(e5, rod, greyD)
  }
  // 三期 · 微缩叠澜塔（03+06 东列：胶囊小体 + 澜环六道 + 小悬盘 + 盘缘微金环 + 微电梯核）
  const h1 = new THREE.CylinderGeometry(0.12, 0.12, 1.15, 12)
  h1.translate(1.8, 1.55, 0); pushGeo(e5, h1, C('#7A98B8'))
  for (const yy of [1.1, 1.32, 1.54, 1.76, 1.98, 2.2]) {
    const r = new THREE.TorusGeometry(0.14, 0.022, 6, 26)
    r.rotateX(Math.PI / 2); r.translate(1.8, yy, 0); pushGeo(e5, r, C('#DDD8CE'))
  }
  const hDisc = new THREE.CylinderGeometry(0.18, 0.18, 0.07, 20)
  hDisc.translate(1.8, 2.24, 0); pushGeo(e5, hDisc, C('#DDD8CE'))
  const hRim = new THREE.TorusGeometry(0.18, 0.016, 6, 28)
  hRim.rotateX(Math.PI / 2); hRim.translate(1.8, 2.29, 0); pushGeo(e5, hRim, C('#C9AE8A'))
  const liftM = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6)
  liftM.translate(1.9, 1.5, 0.09); pushGeo(e5, liftM, C('#B08858'))
  // 四期 · 微缩蓝图馆（07 西南：小方 + 四向微窗 + 微天窗环——递归彩蛋：馆里看城，城里也有馆）
  box(e5, 0.34, 0.16, 0.34, -1.8, 1.04, -1.8, C('#DDD8CE'))
  for (const [dx, dz, r] of [[0, 0.18, 0], [0, -0.18, Math.PI], [0.18, 0, Math.PI / 2], [-0.18, 0, -Math.PI / 2]] as Array<[number, number, number]>) {
    const win = new THREE.BoxGeometry(0.14, 0.07, 0.02)
    win.rotateY(r); win.translate(-1.8 + dx, 1.04, -1.8 + dz)
    pushGeo(e5, win, C(BLUE))
  }
  const tiny = mesh(new THREE.TorusGeometry(0.055, 0.013, 6, 20), matGlow)
  tiny.rotateX(Math.PI / 2); tiny.position.set(-1.8, 1.15, -1.8); parent.add(tiny)
  parent.add(sinkMesh(e5, matPave))
}

/* ---------- 屋面设备 + 灯阵 ---------- */

function rooftopAndLights(parent: THREE.Object3D): void {
  const s = newSink()
  box(s, 1.6, 0.9, 1.2, -5.6, H2 + 0.65, -5.4, C('#8F8C86'))               // 机组
  box(s, 1.1, 0.7, 1.4, 5.8, H2 + 0.55, -5.6, C('#7C7A76'))
  const ant = new THREE.CylinderGeometry(0.03, 0.05, 2.2, 6)
  ant.translate(-6.2, H2 + 1.3, 5.8); pushGeo(s, ant, SILVER_M)
  parent.add(sinkMesh(s, matPave))

  parent.add(modernLamp({ x: 9.2, z: 5.5, rotY: Math.atan2(-5.5, -9.2) }))
  parent.add(modernLamp({ x: 9.2, z: -5.5, rotY: Math.atan2(5.5, -9.2) }))
  for (const [bx, bz] of [[9.4, 0], [6.2, 9.4], [0, 9.4], [-6.2, 9.4], [6.2, -9.4], [0, -9.4], [-6.2, -9.4], [-9.4, 0]] as Array<[number, number]>)
    parent.add(bollardLight({ x: bx, z: bz }))
}

/* ---------- 装配 ---------- */

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  paving(g)
  hall(g)
  atrium(g)
  sandtable(g)
  rooftopAndLights(g)
  return g
}
