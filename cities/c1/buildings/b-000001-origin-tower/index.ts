import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { gardenTree } from '../../blocks/glm-5.3/garden-tree'
import { modernLamp, bollardLight, planterBench } from '../../blocks/glm-5.3/modern-site'

/**
 * 原点塔 Origin Tower · 模都第一栋楼（E5 原点街区一期）
 *
 * 形制叙事「向原点行礼」：E5-05 是全城几何原点（全局 0,0 = 本宗地局部 (10,-10)）。
 * 裙房以原点为圆心 r5 咬出凹弧口，嵌「原点光庭」（下沉圆庭+发光原点盘+环形柱廊）；
 * 塔身三段方塔逐段向西北错动收小 = 向东南的原点层层退让，退台做空中花园；
 * 塔顶悬发光圆环冠「原点环」——地面圆庭、空中圆环首尾呼应。
 *
 * 角度约定：dir 为绕 Y 旋转角，面外法线 = (sin dir, 0, cos dir)，面内横向 = (cos dir, 0, -sin dir)。
 * CylinderGeometry 的 theta 参数 θ 与方位角 φw 关系：φw = π/2 − θ；RingGeometry 经
 * rotateX(−π/2) 后 φw = −thetaStart。TorusGeometry 整环用 rotateZ(起始方位角)+rotateX(π/2) 定缺口。
 */

/* ---------- 常量 ---------- */

/** 全城几何原点在本宗地局部坐标系中的位置（宗地中心 = 全局 (-10,+10)） */
const ORG = { x: 10, z: -10 }
const ARC_R = 5                        // 裙房咬口弧半径（圆心 = 原点）
/** 咬口弧的世界方位角范围（西北段，东端 1.16 → 南端 3.55） */
const ARC_A0 = 1.16, ARC_LEN = 2.39

/* ---------- 顶点合并 Sink（顶点色几何桶） ---------- */

interface Sink { pos: number[]; nor: number[]; col: number[]; idx: number[] }
const newSink = (): Sink => ({ pos: [], nor: [], col: [], idx: [] })

function pushGeo(s: Sink, g: THREE.BufferGeometry, c: THREE.Color, m?: THREE.Matrix4): void {
  if (m) g.applyMatrix4(m)
  const p = g.attributes.position, n = g.attributes.normal, ix = g.index!
  const base = s.pos.length / 3
  for (let i = 0; i < p.count; i++) {
    s.pos.push(p.getX(i), p.getY(i), p.getZ(i))
    s.nor.push(n.getX(i), n.getY(i), n.getZ(i))
    s.col.push(c.r, c.g, c.b)
  }
  for (let i = 0; i < ix.count; i++) s.idx.push(ix.getX(i) + base)
  g.dispose()
}

/** 追加一个 box（先绕 Z 再绕 Y 旋转后平移） */
function box(s: Sink, w: number, h: number, d: number, x: number, y: number, z: number, c: THREE.Color, rotY = 0, rotZ = 0): void {
  const g = new THREE.BoxGeometry(w, h, d)
  if (rotZ) g.rotateZ(rotZ)
  if (rotY) g.rotateY(rotY)
  g.translate(x, y, z)
  pushGeo(s, g, c)
}

/** 追加一个竖直 quad（法线朝 dir 角方向） */
function quad(s: Sink, w: number, h: number, x: number, y: number, z: number, dir: number, c: THREE.Color): void {
  const g = new THREE.PlaneGeometry(w, h)
  g.rotateY(dir)
  g.translate(x, y, z)
  pushGeo(s, g, c)
}

/** 追加一个水平三角面（广场楔形铺装用），逆时针序朝上 */
function tri(s: Sink, x0: number, z0: number, x1: number, z1: number, x2: number, z2: number, y: number, c: THREE.Color): void {
  const base = s.pos.length / 3
  s.pos.push(x0, y, z0, x1, y, z1, x2, y, z2)
  for (let i = 0; i < 3; i++) { s.nor.push(0, 1, 0); s.col.push(c.r, c.g, c.b) }
  s.idx.push(base, base + 2, base + 1)
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

/** 水平圆环（带缺口）：TorusGeometry 定缺口方位 */
function arcTorus(r: number, tube: number, a0: number, len: number, radSeg = 10, tubSeg = 48): THREE.TorusGeometry {
  const g = new THREE.TorusGeometry(r, tube, radSeg, tubSeg, len)
  g.rotateZ(a0)
  g.rotateX(Math.PI / 2)
  return g
}

/* ---------- 材质 ---------- */

const C = (h: string) => new THREE.Color(h)
// [十轮·光泽强化] 银件同步拉高光跳跃（三轮「镜面亮银」经验：受光面高光条是 CBD 质感来源）
// [十二轮] envMap 0.95→1.1：银件背光面同样吃环境反射（全天候光泽）
const matSolid = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.62, roughness: 0.09, envMapIntensity: 1.1 })
const matPave  = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.06, roughness: 0.92 })
// [七轮·整幅玻璃] 光泽 = 大片连续玻璃上拉得出的镜面高光长带：分格缝会把高光切碎成格子。
// [八轮·四调] 背光面病根在 rough 0.06 完美镜面：反射能量集中单方向，背光面从观察角吃不到
// envMap——缎面金属化 rough 0.06→0.16（反射分布拉宽，全域吃环境反射）+ metal 0.5 + envMap 0.88
// [九轮·银蓝换轴] 金色撤出塔身：金玻璃反射 RoomEnvironment（灰白无内容）= 浊金/灰金，shot
// 白光直射下金×白光=黄褐（木质感病根）。换钢青蓝系（比渐变天穹 #6296CE 深一档防融化）
// [十轮·光泽强化] 银蓝系下反射灰白环境=银白高光：rough 0.16→0.10、metal→0.58、envMap→1.15
// [十一轮·深镜收敛] 城主四条验收：颜色太淡→深一档饱和 #55789F；透明度太高→实心镜面
// transparent:false（反射主导，塔身内部结构不再透出）；再高亮→metal 0.62 / envMap 1.35
// [十二轮·全天候光泽] 城主指图：受光面「光打上去的质感」是目标，背光面无光逊色——镜面
// 反射只集中在受光角，背光面吃不到环境。手术：emissive 换「天空光」色系 #4A6C96 提亮
// ×0.5（模拟天空对背光面的漫射补光——全楼任何角度都有光感）+ rough 0.08→0.12（反射锥
// 加宽，背光面也能吃到 envMap，受光高光仍锐）
const matGlass = new THREE.MeshStandardMaterial({ color: '#55789F', metalness: 0.62, roughness: 0.12, emissive: '#4A6C96', emissiveIntensity: 0.58, envMapIntensity: 1.35, side: THREE.DoubleSide })
// [十一轮] 观景亭玻璃拆独立材质：塔身实心镜面后亭子保留微透（亭内楼梯间/藻井是可看的）
const matGlassPav = new THREE.MeshStandardMaterial({ color: '#55789F', metalness: 0.6, roughness: 0.12, transparent: true, opacity: 0.88, emissive: '#4A6C96', emissiveIntensity: 0.45, envMapIntensity: 1.3, side: THREE.DoubleSide })
// [九轮] 灯条本体色换暗蓝灰（白天隐入蓝玻璃，夜里 emissive 暖白主导——蓝塔暖灯带对比）
const matLit   = new THREE.MeshStandardMaterial({ color: '#26364A', emissive: '#FFE0AC', emissiveIntensity: 1.1, side: THREE.DoubleSide })
// [十三轮·内透灯带] 与塔身玻璃完全同参的「亮窗」材质：白天与玻璃融为一体近隐形（仅暖白
// 微光如开着灯的楼层），夜里 emissive 暖白主导——灯是玻璃自己的光，非外挂件
const matGlassLit = new THREE.MeshStandardMaterial({ color: '#55789F', metalness: 0.62, roughness: 0.12, emissive: '#FFE0AC', emissiveIntensity: 0.55, envMapIntensity: 1.35, side: THREE.DoubleSide })
const matGlow  = new THREE.MeshStandardMaterial({ color: '#FFD9A0', emissive: '#FFC878', emissiveIntensity: 2.5 })
const matGlowW = new THREE.MeshStandardMaterial({ color: '#FFF3DC', emissive: '#FFEED2', emissiveIntensity: 2.1 })
const matWater = new THREE.MeshStandardMaterial({ color: '#3F6E80', metalness: 0.35, roughness: 0.06, transparent: true, opacity: 0.82 })

/** 立面色板（[九轮·银蓝换轴] 塔身金色全撤：亮银铝三档 + 石墨巨柱——二三四轮验证系；金收缩为
 *  三处点睛：塔冠原点环系（环/金边/藻井/顶板收头）、光庭金环/柱冠、主入口雨棚。银系依据：
 *  RoomEnvironment 灰白反射对银是同族加成；石墨 #4A5568 = 官方 9 号（二轮验证巨柱色） */
const GOLD = C('#C9AE8A'), GOLD_D = C('#8F7452'), STEEL = C('#3A3F46'), STEEL_D = C('#2A2E34')
const SILVER_L = C('#E8E9EB'), SILVER = C('#C4C7CB'), SILVER_M = C('#9EA3A9')
const GRAPHITE = C('#4A5568'), STEEL_BLUE = C('#5A7A9C'), STEEL_BLUE_D = C('#46617F')
const WHITE = C('#E2E4E6'), CONC = C('#B7B3AC'), CONC_D = C('#8F8C86'), FRAME = C('#4A4F56')
const PAVE_L = C('#9C9890'), PAVE_M = C('#7E7A73'), PAVE_D = C('#5E5B56')
const GRASS_C = C('#667A54'), WOOD = C('#8A6E4E'), SILVER_LINE = C('#B9BDC2')

/* ---------- 幕墙：一面一层的成件 ---------- */

interface FaceDef { dir: number; cx: number; cz: number; w: number }

/** 一面一层的幕墙：整幅通高实心镜面玻璃（bay 一块无缝）+ 窄梁带 + 稀疏 T 型隐框梃；
 *  亮窗=玻璃面外凸出竖灯槽（夜暖白）。[十一轮·深镜收敛] 城主四条：删百叶、梃收疏隐框、
 *  删中间鳍只留四角、玻璃不透明深蓝高反 */
function facadeLayer(
  f: FaceDef, y0: number, h: number, rng: () => number, parent: THREE.Object3D,
  lit: boolean,
): void {
  const s = newSink(), gs = newSink()
  const beamH = 0.22
  const glassH = h - beamH - 0.06
  const nx = Math.sin(f.dir), nz = Math.cos(f.dir)      // 面外法线
  const tx = Math.cos(f.dir), tz = -Math.sin(f.dir)     // 面内横向
  box(s, f.w, beamH, 0.42, f.cx, y0 + beamH / 2, f.cz, SILVER, f.dir)     // 楼板边梁带（淡银低对比）
  box(s, f.w + 0.05, 0.1, 0.46, f.cx, y0 + beamH - 0.05, f.cz, SILVER_L, f.dir) // 楼板沿口亮银细线
  // [十一轮] 梃收疏 0.95→1.35m（数量 -30%）+ 换玻璃同族深青两档（视觉隐框——叠加删百叶后
  // 格子感大减）；T 型型材截面（腹板+双翼，真实幕墙型材，斜侧光下有细微明暗）兼补 R11 三角
  const n = Math.max(4, Math.round(f.w / 1.35))
  const cw = f.w / n
  for (let i = 0; i <= n; i++) {
    const off = -f.w / 2 + cw * i
    const px = f.cx + tx * off + nx * 0.05, pz = f.cz + tz * off + nz * 0.05
    const mullC = i % 6 === 0 ? STEEL_BLUE_D : STEEL_BLUE
    box(s, 0.07, h - beamH + 0.12, 0.1, px, y0 + beamH + (h - beamH) / 2, pz, mullC, f.dir)          // 腹板
    box(s, 0.02, h - beamH + 0.12, 0.26, px + nx * 0.08, y0 + beamH + (h - beamH) / 2, pz + nz * 0.08, mullC, f.dir) // 双翼
    box(s, 0.02, h - beamH + 0.12, 0.26, px - nx * 0.08, y0 + beamH + (h - beamH) / 2, pz - nz * 0.08, mullC, f.dir)
    if (i === 0 || i === n) {                          // 四角转角肋（银色高光锚点，中间鳍已删）
      const fx = f.cx + tx * off + nx * 0.24, fz = f.cz + tz * off + nz * 0.24
      box(s, 0.06, glassH + 0.08, 0.42, fx, y0 + beamH + glassH / 2, fz, SILVER, f.dir)
      box(s, 0.028, glassH + 0.08, 0.1, fx + nx * 0.21, y0 + beamH + glassH / 2, fz + nz * 0.21, SILVER_L, f.dir)
    }
  }
  for (let i = 0; i < n; i++) {                         // 整幅通高实心镜面玻璃（bay 一块，无分格无百叶）
    const off = -f.w / 2 + cw * (i + 0.5)
    quad(gs, cw - 0.05, glassH, f.cx + tx * off + nx * 0.02, y0 + beamH + glassH / 2, f.cz + tz * off + nz * 0.02, f.dir, FRAME)
  }
  parent.add(sinkMesh(s, matSolid))
  parent.add(sinkMesh(gs, matGlass))
  // [十一轮] 灯条从玻璃内侧移到面外 0.045m 凸出竖灯槽：实心玻璃不再遮挡，夜里 emissive 暖白
  // 直接可见（白天深蓝灰与深蓝玻璃低对比近隐）
  if (lit) {
    // [十三轮·内透灯带] 城主反馈「灯条漏在外面很奇怪」——外凸灯槽删除，改为与玻璃共面
    // 0.015m 的同色竖条挂 matGlassLit（底色/金属度/粗糙度与塔身玻璃完全一致=白天近隐形，
    // 仅暖白 emissive 微光如「这层开着灯」；夜里 emissive 主导暖白亮起）——灯是玻璃自身的光
    const ls = newSink()
    const nLit = 3 + Math.floor(rng() * 2)
    for (let k = 0; k < nLit; k++) {
      const i = Math.floor(rng() * n)
      const off = -f.w / 2 + cw * (i + 0.5)
      const lh = glassH * (0.55 + rng() * 0.25)
      quad(ls, Math.min(0.5, cw * 0.45), lh,
        f.cx + tx * off + nx * 0.015, y0 + beamH + 0.35 + (glassH - 0.5 - lh) * 0.42,
        f.cz + tz * off + nz * 0.015, f.dir, WHITE)
    }
    parent.add(sinkMesh(ls, matGlassLit))
  }
}

/** 一段塔身：巨柱（带柱冠箍）+ 逐层四向幕墙 + 段顶收头 */
function towerSegment(
  parent: THREE.Object3D, rng: () => number,
  cx: number, cz: number, w: number, y0: number, y1: number, floors: number,
): void {
  const h = (y1 - y0) / floors
  const hw = w / 2
  const colSink = newSink()                              // 角巨柱 + 每边两根中柱（外露框筒）
  const colPts: Array<[number, number, number]> = []     // [x, z, 粗]
  for (const [dx, dz] of [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]] as Array<[number, number]>) colPts.push([cx + dx, cz + dz, 1.05])
  for (let i = 1; i <= 2; i++) {
    const t = -hw + (w * i) / 3
    for (const [px, pz] of [[cx + t, cz - hw], [cx + t, cz + hw], [cx - hw, cz + t], [cx + hw, cz + t]] as Array<[number, number]>) colPts.push([px, pz, 0.55])
  }
  for (const [px, pz, cw2] of colPts) {
    // [九轮] 角巨柱（cw2>1）换石墨蓝灰（官方 9 号，二轮验证），中柱深银——三层明暗：石墨巨柱>深银中柱>银梃
    box(colSink, cw2, y1 - y0, cw2, px, y0 + (y1 - y0) / 2, pz, cw2 > 1 ? GRAPHITE : SILVER_M)
    for (const cy of [y0 + 0.18, y1 - 0.18]) {           // 柱顶底箍
      box(colSink, cw2 + 0.22, 0.3, cw2 + 0.22, px, cy, pz, SILVER)
    }
    if (cw2 > 1) for (let fl = 1; fl < floors; fl++) {   // 角巨柱层间银箍（竹节韵律）
      box(colSink, cw2 + 0.12, 0.16, cw2 + 0.12, px, y0 + fl * ((y1 - y0) / floors), pz, SILVER_L)
    }
    else if (cw2 > 0.5) for (let fl = 1; fl < floors; fl += 2) {  // [十一轮] 中柱隔层细箍（补 R11）
      box(colSink, cw2 + 0.1, 0.12, cw2 + 0.1, px, y0 + fl * ((y1 - y0) / floors), pz, SILVER)
    }
  }
  parent.add(sinkMesh(colSink, matSolid))
  const faces: FaceDef[] = [
    { dir: Math.PI / 2, cx: cx + hw, cz, w },            // 东
    { dir: 0, cx, cz: cz + hw, w },                      // 北
    { dir: -Math.PI / 2, cx: cx - hw, cz, w },           // 西
    { dir: Math.PI, cx, cz: cz - hw, w },                // 南
  ]
  for (let fl = 0; fl < floors; fl++) {
    const ly = y0 + fl * h
    const lit = Math.sin(fl * 0.9 + 0.7) > 0.45 || rng() < 0.12   // 灯槽层（竖向 sin 带+少量随机）
    for (let fi = 0; fi < 4; fi++) {
      facadeLayer(faces[fi], ly, h, rng, parent, lit && (fi === 0 || fi === 3 || rng() < 0.6))
    }
  }
  const capSink = newSink()
  box(capSink, w, 0.5, w, cx, y1 - 0.25, cz, CONC)
  box(capSink, w + 0.2, 0.22, w + 0.2, cx, y1 + 0.11, cz, SILVER_M)
  parent.add(sinkMesh(capSink, matPave))
}

/** 桁架腰线层（设备/避难层：深色背板 + 外露 X 撑与弦杆 + 转换层顶底板） */
function trussBand(parent: THREE.Object3D, cx: number, cz: number, w: number, y0: number, y1: number): void {
  const s = newSink(), gs = newSink()
  const h = y1 - y0
  const faces: FaceDef[] = [
    { dir: Math.PI / 2, cx: cx + w / 2, cz, w }, { dir: 0, cx, cz: cz + w / 2, w },
    { dir: -Math.PI / 2, cx: cx - w / 2, cz, w }, { dir: Math.PI, cx, cz: cz - w / 2, w },
  ]
  // [九轮] 桁架背板与塔身同一 matGlass（材质不读顶点色，本色即钢青蓝）——X 撑深银浮于其上，
  // 腰线与塔身连续无断色横带（八轮目标在蓝系下延续）
  for (const f of faces) quad(gs, f.w, h, f.cx, y0 + h / 2, f.cz, f.dir, STEEL_BLUE)
  for (const yy of [y0 + 0.22, y1 - 0.22]) {             // 上下弦杆（周圈）
    box(s, 0.3, 0.3, w - 0.1, cx + w / 2 - 0.15, yy, cz, SILVER_M)
    box(s, 0.3, 0.3, w - 0.1, cx - w / 2 + 0.15, yy, cz, SILVER_M)
    box(s, w - 0.7, 0.3, 0.3, cx, yy, cz + w / 2 - 0.15, SILVER_M)
    box(s, w - 0.7, 0.3, 0.3, cx, yy, cz - w / 2 + 0.15, SILVER_M)
  }
  for (const f of faces) {                               // 每面 8 组 X 斜撑 + 竖腹杆（[十一轮] 4→8 组补 R11）
    const tx = Math.cos(f.dir), tz = -Math.sin(f.dir)
    const diag = Math.hypot(f.w / 8, h - 0.44)
    const ang = Math.atan2(h - 0.44, f.w / 8)
    for (let i = 0; i < 8; i++) {
      const off = -f.w / 2 + (f.w * (i + 0.5)) / 8
      const mx = f.cx + tx * off, mz = f.cz + tz * off
      box(s, diag, 0.16, 0.16, mx, y0 + h / 2, mz, SILVER_M, f.dir, ang)
      box(s, diag, 0.16, 0.16, mx, y0 + h / 2, mz, SILVER_M, f.dir, -ang)
    }
    for (let i = 0; i <= 8; i++) {
      const off = -f.w / 2 + (f.w * i) / 8
      box(s, 0.14, h - 0.44, 0.14, f.cx + tx * off, y0 + h / 2, f.cz + tz * off, SILVER_M)
    }
  }
  box(s, w, 0.28, w, cx, y0 + 0.14, cz, CONC)           // 转换层底板
  box(s, w, 0.28, w, cx, y1 - 0.14, cz, CONC)           // 转换层顶板（兼露台基层）
  parent.add(sinkMesh(s, matSolid))
  parent.add(sinkMesh(gs, matGlass))
}

/** 退台空中花园（外段顶面减内段轮廓的露台环带，铺东南两条） */
function skyTerrace(
  parent: THREE.Object3D, rng: () => number,
  ox: number, oz: number, ow: number,   // 外段中心/宽
  ix: number, iz: number, iw: number,   // 内段中心/宽
  y: number,
): void {
  const s = newSink()
  const ex0 = ix + iw / 2, ex1 = ox + ow / 2            // 东带宽
  const sz0 = oz - ow / 2, sz1 = iz - iw / 2            // 南带宽
  const sx0 = ox - ow / 2 + 0.6
  box(s, ex1 - ex0, 0.12, ow - 1.2, (ex0 + ex1) / 2, y + 0.06, oz, PAVE_M)
  box(s, ex0 - sx0, 0.12, sz1 - sz0, (sx0 + ex0) / 2, y + 0.06, (sz0 + sz1) / 2, PAVE_M)
  box(s, ex1 - ex0, 0.5, 0.1, (ex0 + ex1) / 2, y + 0.25, oz - ow / 2 + 0.55, SILVER_M)  // 矮栏
  box(s, 0.1, 0.5, sz1 - sz0, ox + ow / 2 - 0.55, y + 0.25, (sz0 + sz1) / 2, SILVER_M)
  for (let i = 0; i < 10; i++) {                         // 矮栏竖杆加密（[十一轮] 6→10，步长分母同步 /9）
    box(s, 0.07, 0.5, 0.07, (ex0 + ex1) / 2, y + 0.25, oz - ow / 2 + 0.55 + 1 + i * ((ow - 2.5) / 9), SILVER_M)
  }
  parent.add(sinkMesh(s, matPave))
  if (ex1 - ex0 > 3.4) {                                 // 树池 + 修剪树
    const tx = (ex0 + ex1) / 2, tz = oz + ow / 4
    parent.add(planterBench({ x: tx, z: tz, size: 1.5 }))
    const t = gardenTree({ x: tx, z: tz, scale: 0.7, seed: 31 })
    t.position.y = y + 0.12
    parent.add(t)
  }
  const sh = newSink()                                   // 灌木球阵（南带，[十一轮] 5→9 补 R11，步长分母同步 /8）
  for (let i = 0; i < 9; i++) {
    const g = new THREE.SphereGeometry(0.28 + rng() * 0.16, 10, 8)
    g.translate(sx0 + 0.5 + i * ((ex0 - sx0 - 1) / 8), y + 0.42, (sz0 + sz1) / 2)
    pushGeo(sh, g, GRASS_C)
  }
  parent.add(sinkMesh(sh, matPave))
  parent.add(bollardLight({ x: (ex0 + ex1) / 2, z: oz - ow / 2 + 0.8, h: 0.5 }))
}

/* ---------- 原点光庭（裙房凹弧前的下沉圆庭，圆心 = 全城原点） ---------- */

function originCourt(parent: THREE.Object3D): void {
  const steps = newSink()
  for (let i = 0; i < 4; i++) {                          // 四级下沉台阶
    const r0 = ARC_R - 0.62 * i
    const g = new THREE.RingGeometry(r0 - 0.62, r0, 72, 1)
    g.rotateX(-Math.PI / 2)
    g.translate(ORG.x, -0.31 * i, ORG.z)
    pushGeo(steps, g, i % 2 === 0 ? PAVE_M : PAVE_D)
    const rim = new THREE.CylinderGeometry(r0 + 0.04, r0 + 0.04, 0.31, 72, 1, true)
    rim.translate(ORG.x, -0.31 * i - 0.155, ORG.z)
    pushGeo(steps, rim, PAVE_D)
  }
  const floorG = new THREE.CircleGeometry(ARC_R - 2.48, 48)
  floorG.rotateX(-Math.PI / 2)
  floorG.translate(ORG.x, -1.24, ORG.z)
  pushGeo(steps, floorG, PAVE_D)
  for (let i = 0; i < 24; i++) {                         // 底盘放射刻度缝（[十一轮] 12→24 补 R11）
    const a = (i / 24) * Math.PI * 2
    const g = new THREE.PlaneGeometry(0.1, ARC_R - 3.2)
    g.rotateX(-Math.PI / 2)
    g.rotateY(-a)
    g.translate(ORG.x + Math.cos(a) * (ARC_R - 2.48) / 2, -1.235, ORG.z + Math.sin(a) * (ARC_R - 2.48) / 2)
    pushGeo(steps, g, C('#4E4B47'))
  }
  parent.add(sinkMesh(steps, matPave))
  const disk = mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.14, 40), matGlowW)   // 原点盘（强发光）
  disk.position.set(ORG.x, -1.14, ORG.z); parent.add(disk)
  const ring1 = mesh(arcTorus(2.1, 0.06, 0, Math.PI * 2), matGlow)
  ring1.position.set(ORG.x, -1.17, ORG.z); parent.add(ring1)
  const ring2 = mesh(arcTorus(2.45, 0.035, 0, Math.PI * 2), stdMaterial('#C9AE8A', { metalness: 0.7, roughness: 0.3 }))
  ring2.position.set(ORG.x, -1.17, ORG.z); parent.add(ring2)
  const colSink = newSink()                              // 环形柱廊（东南开口段，西北由弧墙收）
  const open0 = ARC_A0 + ARC_LEN                         // 开口段起点
  const openLen = Math.PI * 2 - ARC_LEN
  const nCol = 14                                        // [十一轮] 10→14 柱补 R11
  for (let i = 0; i < nCol; i++) {
    const a = open0 + (openLen / (nCol - 1)) * i
    const g = new THREE.CylinderGeometry(0.17, 0.2, 4.6, 10)
    g.translate(ORG.x + Math.cos(a) * 5.35, 2.3, ORG.z + Math.sin(a) * 5.35)
    pushGeo(colSink, g, WHITE)
    const cap = new THREE.BoxGeometry(0.42, 0.24, 0.42)
    cap.rotateY(-a)
    cap.translate(ORG.x + Math.cos(a) * 5.35, 4.72, ORG.z + Math.sin(a) * 5.35)
    pushGeo(colSink, cap, GOLD_D)
  }
  pushGeo(colSink, arcTorus(5.35, 0.24, open0, openLen), WHITE)
  pushGeo(colSink, arcTorus(5.35, 0.07, open0, openLen, 8, 72), GOLD_D)
  parent.add(sinkMesh(colSink, matPave))
  const seat = mesh(arcTorus(3.05, 0.26, open0 + 0.3, openLen - 0.6), stdMaterial('#8A6E4E', { roughness: 0.8 }))
  seat.position.set(ORG.x, -0.67, ORG.z); parent.add(seat)
  for (let i = 0; i < 8; i++) {                          // 庭外环矮柱灯阵（开口段）
    const a = open0 + 0.25 + ((openLen - 0.5) / 7) * i
    parent.add(bollardLight({ x: ORG.x + Math.cos(a) * 7.2, z: ORG.z + Math.sin(a) * 7.2 }))
  }
}

/* ---------- 裙房 ---------- */

function podium(parent: THREE.Object3D, rng: () => number): void {
  const yBase = 0.44, yTop = 17
  const a = newSink()                                    // 主体两块（咬口弧以原点为心）
  box(a, 5.42 + 17.8, yTop - yBase, 30, (-17.8 + 5.42) / 2, (yBase + yTop) / 2, 3, CONC)
  box(a, 12 - 5.42, yTop - yBase, 17.8 + 5.42, (5.42 + 12) / 2, (yBase + yTop) / 2, (17.8 - 5.42) / 2, CONC)
  parent.add(sinkMesh(a, matPave))
  const arc0 = ARC_A0, arcLen = ARC_LEN
  // 弧墙（r5.3 双层，CylinderGeometry θ = π/2 − φw）
  const shellOut = mesh(new THREE.CylinderGeometry(ARC_R + 0.3, ARC_R + 0.3, yTop - yBase, 56, 1, true, Math.PI / 2 - arc0 - arcLen, arcLen),
    stdMaterial('#C2BEB6', { roughness: 0.7, metalness: 0.15, side: THREE.DoubleSide }))
  shellOut.position.set(ORG.x, (yBase + yTop) / 2, ORG.z); parent.add(shellOut)
  const shellIn = mesh(new THREE.CylinderGeometry(ARC_R, ARC_R, yTop - yBase, 56, 1, true, Math.PI / 2 - arc0 - arcLen, arcLen),
    stdMaterial('#A9A5A0', { roughness: 0.8, side: THREE.DoubleSide }))
  shellIn.position.copy(shellOut.position); parent.add(shellIn)
  // 弧面橱窗横带（4 层商业）+ 层间弧形挑板 + 竖筋
  const shop = newSink(), shopG = newSink()
  for (let fl = 0; fl < 4; fl++) {
    const yy = yBase + 0.7 + fl * 4.05
    const band = new THREE.CylinderGeometry(ARC_R + 0.05, ARC_R + 0.05, 2.5, 48, 1, true, Math.PI / 2 - arc0 - 0.06 - (arcLen - 0.12), arcLen - 0.12)
    band.translate(ORG.x, yy + 1.25, ORG.z)
    pushGeo(shopG, band, FRAME)
    for (let i = 0; i <= 22; i++) {                      // 竖筋（[十一轮] 14→22 补 R11；按方位角 φw 定位，θ = π/2 − φw 转向）
      const a = arc0 + 0.08 + ((arcLen - 0.16) * i) / 14
      const g = new THREE.BoxGeometry(0.1, 3.4, 0.5)
      const rot = new THREE.Matrix4().makeRotationY(Math.PI / 2 - a)
      const tr = new THREE.Matrix4().makeTranslation(ORG.x + Math.cos(a) * (ARC_R + 0.14), yy + 1.45, ORG.z + Math.sin(a) * (ARC_R + 0.14))
      pushGeo(shop, g, i % 4 === 0 ? SILVER_M : SILVER, tr.multiply(rot))
    }
    const slab = new THREE.RingGeometry(ARC_R + 0.02, ARC_R + 0.62, 48, 1, -(arc0 + arcLen), arcLen)   // 层间弧挑板
    slab.rotateX(-Math.PI / 2)
    slab.translate(ORG.x, yy + 2.85, ORG.z)
    pushGeo(shop, slab, WHITE)
  }
  parent.add(sinkMesh(shop, matSolid))
  parent.add(sinkMesh(shopG, matLit))
  // 西/北主大堂立面（7.2m 通高）+ 上部两层办公（面线收进 17.45，留百叶出挑余地）
  const hallW: FaceDef[] = [
    { dir: -Math.PI / 2, cx: -17.45, cz: 3, w: 22.5 },  // 西面
    { dir: 0, cx: -6.19, cz: 17.45, w: 22.5 },          // 北面
  ]
  for (const f of hallW) {
    facadeLayer(f, yBase, 7.2, rng, parent, true)
    facadeLayer(f, yBase + 7.2, 4.2, rng, parent, rng() < 0.5)
    facadeLayer(f, yBase + 11.4, 4.2, rng, parent, rng() < 0.5)
  }
  // 东立面（块 B 东墙，面向前广场）四层橱窗 + 块 A 东墙橱窗
  const eastFace: FaceDef = { dir: Math.PI / 2, cx: 12, cz: 6.19, w: 22.5 }
  facadeLayer(eastFace, yBase, 5.2, rng, parent, true)
  facadeLayer(eastFace, yBase + 5.2, 4.2, rng, parent, false)
  facadeLayer(eastFace, yBase + 9.4, 4.2, rng, parent, true)
  facadeLayer(eastFace, yBase + 13.6, 2.96, rng, parent, false)
  const eastA: FaceDef = { dir: Math.PI / 2, cx: 5.42, cz: -8.71, w: 6.5 }
  facadeLayer(eastA, yBase, 5.2, rng, parent, true)
  facadeLayer(eastA, yBase + 5.2, 4.2, rng, parent, false)
  facadeLayer(eastA, yBase + 9.4, 4.2, rng, parent, true)
  // 南面（块 A 南墙）店铺四层
  const south: FaceDef = { dir: Math.PI, cx: -6.19, cz: -12, w: 20 }
  facadeLayer(south, yBase, 4.4, rng, parent, true)
  facadeLayer(south, yBase + 4.4, 4.2, rng, parent, false)
  facadeLayer(south, yBase + 8.6, 4.2, rng, parent, true)
  facadeLayer(south, yBase + 12.8, 3.76, rng, parent, false)
  // 屋面：女儿墙 + 机组
  const roof = newSink()
  box(roof, 5.42 + 17.8, 0.8, 30, (-17.8 + 5.42) / 2, yTop + 0.4, 3, CONC_D)
  box(roof, 12 - 5.42, 0.8, 17.8 + 5.42, (5.42 + 12) / 2, yTop + 0.4, (17.8 - 5.42) / 2, CONC_D)
  box(roof, 3.2, 1.6, 2.4, -13, yTop + 1.4, 12, STEEL_D)
  box(roof, 2.6, 1.2, 3.6, -1, yTop + 1.2, 13.5, STEEL_D)
  box(roof, 1.8, 2.2, 1.8, -15, yTop + 1.7, -6, STEEL)
  parent.add(sinkMesh(roof, matPave))
  // 主入口雨棚（弧墙中点外挑环板，外缘收在 17.9 内）+ 双柱门斗
  const mid = arc0 + arcLen / 2
  const ent = newSink()
  const canopy = new THREE.RingGeometry(ARC_R + 0.02, ARC_R + 2.85, 24, 1, -(mid + 0.42), 0.84)
  canopy.rotateX(-Math.PI / 2)
  canopy.translate(ORG.x, 5.6, ORG.z)
  pushGeo(ent, canopy, GOLD)
  pushGeo(ent, arcTorus(ARC_R + 2.85, 0.08, mid - 0.42, 0.84, 8, 24), GOLD_D)
  for (const da of [-0.34, 0.34]) {
    const a = mid + da
    const g = new THREE.CylinderGeometry(0.16, 0.16, 5.2, 10)
    g.translate(ORG.x + Math.cos(a) * (ARC_R + 2.3), 2.6, ORG.z + Math.sin(a) * (ARC_R + 2.3))
    pushGeo(ent, g, WHITE)
  }
  parent.add(sinkMesh(ent, matSolid))
  const steps = newSink()                                // 入口台阶 + 坡道（薄板豁免件）
  box(steps, 10, 0.22, 1.4, ORG.x + 0.5, 0.11, ORG.z - ARC_R - 4.6, PAVE_M)
  box(steps, 10, 0.22, 1.4, ORG.x + 0.5, 0.33, ORG.z - ARC_R - 3.2, PAVE_L)
  box(steps, 2.2, 0.22, 3.4, ORG.x - 5.2, 0.11, ORG.z - ARC_R - 2.6, PAVE_M)
  parent.add(sinkMesh(steps, matPave))
}

/* ---------- 塔冠：观景亭 + 原点环 ---------- */

function crown(parent: THREE.Object3D, cx: number, cz: number): void {
  const s = newSink(), gs = newSink()
  const w = 12, hw = w / 2
  for (const [dx, dz] of [[-hw, -hw], [hw, -hw], [hw, hw], [-hw, hw]] as Array<[number, number]>) {
    const g = new THREE.BoxGeometry(0.75, 14, 0.75)
    g.translate(cx + dx, 197, cz + dz)
    pushGeo(s, g, GRAPHITE)
  }
  const faces: Array<{ dir: number; x: number; z: number; ew: boolean }> = [
    { dir: Math.PI / 2, x: cx + hw, z: cz, ew: true },
    { dir: 0, x: cx, z: cz + hw, ew: false },
    { dir: -Math.PI / 2, x: cx - hw, z: cz, ew: true },
    { dir: Math.PI, x: cx, z: cz - hw, ew: false },
  ]
  const mull = newSink()
  for (const f of faces) {                               // 通高玻璃 + 银竖梃（金只留环冠/藻井/顶板收头）
    quad(gs, w, 13, f.x, 197.5, f.z, f.dir, FRAME)
    for (let i = 1; i < 12; i++) {
      const t = -hw + (w * i) / 12
      const g = new THREE.BoxGeometry(0.07, 13, 0.12)
      g.translate(f.ew ? f.x : cx + t, 197.5, f.ew ? cz + t : f.z)
      pushGeo(mull, g, SILVER)
    }
    for (let r = 1; r < 3; r++) {                        // 两道玻璃横梃
      box(mull, w, 0.08, 0.11, f.ew ? f.x : cx, 191 + r * 4.3, f.ew ? cz : f.z, SILVER_M, f.dir)
    }
  }
  parent.add(sinkMesh(mull, matSolid))
  box(s, w + 0.6, 0.7, w + 0.6, cx, 204.3, cz, GOLD_D)   // 亭顶板
  box(s, 5.5, 1.6, 5.5, cx, 205.4, cz, STEEL)          // 设备间收束
  box(s, 6.1, 0.3, 6.1, cx, 206.3, cz, GOLD_D)
  box(s, 13.6, 1.2, 13.6, cx, 190.9, cz, SILVER_M)          // 亭底收腰裙板
  box(s, 2.6, 9, 2.6, cx + 3.2, 195.5, cz - 3.2, CONC_D) // 亭内楼梯间体块
  parent.add(sinkMesh(s, matSolid))
  parent.add(sinkMesh(gs, matGlassPav))
  const deck = mesh(arcTorus(5.4, 0.18, 0, Math.PI * 2), stdMaterial('#FFE0AC', { emissive: '#FFD9A0', emissiveIntensity: 1.3 }))
  deck.position.set(cx, 196.8, cz); parent.add(deck)     // 亭内观景平台发光挑边
  const halo = mesh(new THREE.TorusGeometry(7, 1.3, 48, 224), matGlow)                   // 原点环（[十一轮] 32×144→48×224 高分段更圆润，补 R11）
  halo.rotateX(Math.PI / 2); halo.position.set(cx, 209.8, cz); parent.add(halo)
  const halo2 = mesh(new THREE.TorusGeometry(5.2, 0.55, 32, 144), matGlow)               // 内辉环（双环辉映）
  halo2.rotateX(Math.PI / 2); halo2.position.set(cx, 208.4, cz); parent.add(halo2)
  for (const rr of [8.25, 5.75]) {                       // 环内外金边
    const rim = mesh(new THREE.TorusGeometry(rr, 0.15, 16, 192), stdMaterial('#C9AE8A', { metalness: 0.72, roughness: 0.25 }))
    rim.rotateX(Math.PI / 2); rim.position.set(cx, 209.8, cz); parent.add(rim)
  }
  const hang = newSink()                                 // 环下悬吊杆（[十一轮] 8→16 补 R11）
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16
    const g = new THREE.CylinderGeometry(0.07, 0.07, 3.6, 8)
    g.translate(cx + Math.cos(a) * 6.4, 207.9, cz + Math.sin(a) * 6.4)
    pushGeo(hang, g, STEEL)
  }
  parent.add(sinkMesh(hang, matSolid))
  const coffer = newSink()                               // 观景亭天花金藻井（三环+放射肋 24）
  for (const [r, t] of [[3.2, 0.18], [4.4, 0.15], [5.5, 0.12]] as Array<[number, number]>) {
    const g = arcTorus(r, t, 0, Math.PI * 2, 8, 48)
    g.translate(cx, 203.9, cz)
    pushGeo(coffer, g, GOLD)
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const g = new THREE.BoxGeometry(5.6, 0.06, 0.12)
    g.rotateY(-a)
    g.translate(cx + Math.cos(a) * 2.8, 203.95, cz + Math.sin(a) * 2.8)
    pushGeo(coffer, g, GOLD_D)
  }
  parent.add(sinkMesh(coffer, matSolid))
  for (let i = 0; i < 4; i++) {                          // 航空障碍灯
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const l = mesh(new THREE.SphereGeometry(0.28, 10, 8), stdMaterial('#5A1414', { emissive: '#FF2A2A', emissiveIntensity: 2.2 }))
    l.position.set(cx + Math.cos(a) * 7, 211.3, cz + Math.sin(a) * 7)
    parent.add(l)
  }
}

/* ---------- 场地 ---------- */

function site(parent: THREE.Object3D, rng: () => number): void {
  const base = newSink()                                 // 基底：沥青满铺（宗地全域无裸灰）
  box(base, 39.9, 0.02, 39.9, 0, 0.01, 0, C('#4B4B49'))
  parent.add(sinkMesh(base, matPave))
  const green = newSink()                                // 西北三面退线环带：草皮 + 步道（地被层，顶≤0.6）
  box(green, 1.9, 0.05, 39.9, -18.95, 0.03, 0, GRASS_C)
  box(green, 39.9, 0.05, 1.9, 0, 0.03, 18.95, GRASS_C)
  box(green, 2.3, 0.05, 17.4, 18.75, 0.03, 10.1, GRASS_C)
  box(green, 0.9, 0.05, 37.3, -18.5, 0.055, 0, PAVE_M)
  box(green, 37.3, 0.05, 0.9, 0, 0.055, 18.5, PAVE_M)
  parent.add(sinkMesh(green, matPave))
  for (let i = 0; i < 5; i++) {                          // 步道树（积木自带 site 豁免）
    parent.add(gardenTree({ x: -18.9, z: -14 + i * 7, scale: 0.9, seed: 41 + i * 13 }))
  }
  // —— 前广场：以原点为心的放射楔形铺装（径向外缘按宗地边界裁剪，严格界内） ——
  const plaza = newSink()
  const rInner = ARC_R + 0.6
  const rClip = (phi: number): number => {
    let r = 19.5
    if (Math.cos(phi) > 0.02) r = Math.min(r, (19.5 - ORG.x) / Math.cos(phi))
    if (Math.sin(phi) < -0.02) r = Math.min(r, (ORG.z + 19.5) / -Math.sin(phi))
    return Math.max(rInner, r)
  }
  const PHI0 = -Math.PI / 2 - 0.3, PHI1 = 0.3
  const NSEC = 42
  const bandC = [PAVE_L, PAVE_M, PAVE_D]
  for (let i = 0; i < NSEC; i++) {
    const p0 = PHI0 + ((PHI1 - PHI0) * i) / NSEC
    const p1 = PHI0 + ((PHI1 - PHI0) * (i + 1)) / NSEC
    if (i % 7 === 3) continue                            // 放射缝（透基底色）
    const rOut = Math.min(rClip(p0), rClip(p1))
    if (rOut - rInner < 0.8) continue
    const band = bandC[i % 3]
    const rMid = rInner + (rOut - rInner) * 0.55         // 两级径向带
    const pts = (r: number): Array<[number, number]> => [
      [ORG.x + Math.cos(p0) * r, ORG.z + Math.sin(p0) * r],
      [ORG.x + Math.cos(p1) * r, ORG.z + Math.sin(p1) * r],
    ]
    const [a0, a1] = pts(rInner), [b0, b1] = pts(rMid), [c0, c1] = pts(rOut)
    tri(plaza, a0[0], a0[1], a1[0], a1[1], b1[0], b1[1], 0.055, band)
    tri(plaza, a0[0], a0[1], b1[0], b1[1], b0[0], b0[1], 0.055, band)
    tri(plaza, b0[0], b0[1], b1[0], b1[1], c1[0], c1[1], 0.055, i % 2 === 0 ? PAVE_M : PAVE_L)
    tri(plaza, b0[0], b0[1], c1[0], c1[1], c0[0], c0[1], 0.055, i % 2 === 0 ? PAVE_M : PAVE_L)
  }
  // 放射强调缝（金色窄楔，三条）
  for (const ang of [-Math.PI / 4 - Math.PI / 2, -Math.PI / 4, -Math.PI / 4 + Math.PI / 2]) {
    const rO = rClip(ang)
    if (rO - rInner < 1) continue
    const dphi = 0.035
    const [a0, a1] = [[ORG.x + Math.cos(ang - dphi) * rInner, ORG.z + Math.sin(ang - dphi) * rInner],
                      [ORG.x + Math.cos(ang + dphi) * rInner, ORG.z + Math.sin(ang + dphi) * rInner]] as Array<[number, number]>
    const [c0, c1] = [[ORG.x + Math.cos(ang - dphi) * rO, ORG.z + Math.sin(ang - dphi) * rO],
                      [ORG.x + Math.cos(ang + dphi) * rO, ORG.z + Math.sin(ang + dphi) * rO]] as Array<[number, number]>
    tri(plaza, a0[0], a0[1], a1[0], a1[1], c1[0], c1[1], 0.065, SILVER_LINE)
    tri(plaza, a0[0], a0[1], c1[0], c1[1], c0[0], c0[1], 0.065, SILVER_LINE)
  }
  parent.add(sinkMesh(plaza, matPave))
  const pond = newSink()                                 // 镜面水景：池缘 + 水面 + 汀步
  box(pond, 6.4, 0.32, 5.2, 14.6, 0.16, -14.6, PAVE_D)
  parent.add(sinkMesh(pond, matPave))
  const water = mesh(new THREE.BoxGeometry(5.9, 0.08, 4.7), matWater)
  water.position.set(14.6, 0.3, -14.6); parent.add(water)
  const st = newSink()
  for (let i = 0; i < 3; i++) box(st, 0.9, 0.12, 0.9, 12.6 + i * 1.35, 0.38, -14.6, PAVE_L)
  parent.add(sinkMesh(st, matPave))
  const trees: Array<[number, number]> = [[5.2, -16.6], [9.4, -17.6], [13.6, -18.2], [16.8, -4.6], [17.8, -8.8], [18.2, -13.0], [3.4, -14.6], [17.6, -16.6], [6.0, -12.4], [10.2, -14.2], [14.8, -14.4], [18.0, -6.6], [3.0, -16.4], [12.6, -16.6], [15.4, -11.4], [18.4, -10.8]]  // [十一轮] 8→16 补 R11（新增位内收防冠幅超界）
  trees.forEach(([tx, tz], i) => {                       // 树阵（树池坐凳 + 修剪树）
    parent.add(planterBench({ x: tx, z: tz, size: 2.2 }))
    parent.add(gardenTree({ x: tx, z: tz, scale: i < 8 ? 1.25 : 1.1, seed: 11 + i * 7 }))
  })
  const lamps: Array<[number, number]> = [[4.0, -17.5], [9.0, -18.6], [14.0, -18.4], [17.6, -14.6], [19.0, -9.6], [19.2, -4.6], [7.0, -11.6], [12.4, -13.8], [16.0, -16.4], [18.6, -7.0]]  // [十一轮] 6→10（新增位内收）
  for (const [lx, lz] of lamps) {                        // 广场灯柱（弧线布点，界内）
    parent.add(modernLamp({ x: lx, z: lz, rotY: Math.atan2(-(lz - ORG.z), -(lx - ORG.x)) }))
  }
  const bench = newSink()                                // 广场坐凳两组
  for (const [bx, bz] of [[8.6, -8.8], [11.4, -6.2]] as Array<[number, number]>) {
    box(bench, 2.6, 0.12, 0.65, bx, 0.5, bz, WOOD)
    box(bench, 0.16, 0.42, 0.55, bx - 1.1, 0.24, bz, STEEL_D)
    box(bench, 0.16, 0.42, 0.55, bx + 1.1, 0.24, bz, STEEL_D)
  }
  parent.add(sinkMesh(bench, matPave))
  const pl = newSink()                                   // 塔基两级台阶（薄板豁免件）
  box(pl, 24.6, 0.22, 24.6, -6, 0.11, 3, PAVE_M)
  box(pl, 23.6, 0.22, 23.6, -6, 0.33, 3, PAVE_L)
  parent.add(sinkMesh(pl, matPave))
}

/* ---------- 装配 ---------- */

export default function build(ctx: BuildCtx): THREE.Object3D {
  const g = new THREE.Group()
  const rng = ctx.rng
  site(g, rng)
  originCourt(g)
  podium(g, rng)
  // 塔身三段：向西北错动收小 = 向东南原点层层退让
  towerSegment(g, rng, -6, 6, 22, 18, 76, 14)            // 下段
  trussBand(g, -7, 7, 21.4, 76, 79.6)                    // 腰线一（转换层）
  skyTerrace(g, rng, -6, 6, 22, -8, 8, 18, 79.6)         // 退台花园一
  towerSegment(g, rng, -8, 8, 18, 79.6, 136, 13)         // 中段
  trussBand(g, -8.9, 8.9, 17.6, 136, 139.6)              // 腰线二
  skyTerrace(g, rng, -8, 8, 18, -9.5, 9.5, 15, 139.6)    // 退台花园二
  towerSegment(g, rng, -9.5, 9.5, 15, 139.6, 190, 12)    // 上段
  crown(g, -9.5, 9.5)                                    // 观景亭 + 原点环
  return g
}
