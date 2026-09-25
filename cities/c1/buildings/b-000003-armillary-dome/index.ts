import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial, PALETTE } from '../../../../lib/blocks'
import { armillary } from '../../blocks/qwen3.8-flash/armillary'

// —— 材质（全参数化，无贴图）——
const stone0 = stdMaterial('#E8E6E1', { roughness: 0.85 })
const stone1 = stdMaterial('#D9D6CF', { roughness: 0.8 })
const stone2 = stdMaterial('#C4C1BA', { roughness: 0.85 })
const stone3 = stdMaterial('#A8A5A0', { roughness: 0.9 })
const verdigris = stdMaterial('#6E8B7B', { metalness: 0.35, roughness: 0.55 })
const verdigrisDeep = stdMaterial('#556F62', { metalness: 0.4, roughness: 0.5 })
const gilt = stdMaterial('#C9A227', { metalness: 0.8, roughness: 0.35 })
const glass = stdMaterial('#2E4057', { metalness: 0.6, roughness: 0.25, emissive: '#16283A', emissiveIntensity: 0.4 })
const lawn = stdMaterial('#7F9271', { roughness: 0.95 })
const pathMat = stdMaterial('#C4C1BA', { roughness: 0.9 })

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// 极坐标放置器：item 以局部 (0, y, R) 贴入 holder，holder 绕 Y 转 a → 世界位置 (sin a·R, y, cos a·R)，面朝外
function atRing(item: THREE.Object3D, a: number, R: number, y: number): THREE.Group {
  item.position.set(0, y, R)
  const holder = new THREE.Group()
  holder.add(item)
  holder.rotation.y = a
  return holder
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const rng = ctx.rng
  const B = ctx.blocks

  // ===================================================================
  // 场地层（地块全域用地红线，草皮满铺至边缘 —— R13 豁免的地被/景观件）
  // ===================================================================
  const turf = mesh(new THREE.BoxGeometry(20, 0.12, 20), lawn)
  turf.position.y = 0.06
  turf.userData.site = true
  turf.receiveShadow = true
  turf.castShadow = false
  root.add(turf)

  // 环形铺装（外圈步道）
  const ringWalk = mesh(new THREE.RingGeometry(8.35, 9.35, 64), pathMat)
  ringWalk.rotation.x = -Math.PI / 2
  ringWalk.position.y = 0.13
  ringWalk.receiveShadow = true
  ringWalk.userData.site = true
  root.add(ringWalk)

  // 放射步道（8 条，通向各方位，薄板豁免）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const walk = mesh(new THREE.BoxGeometry(1.4, 0.14, 8.6), pathMat)
    walk.position.set(Math.sin(a) * 5.2, 0.13, Math.cos(a) * 5.2)
    walk.rotation.y = a
    walk.receiveShadow = true
    walk.userData.site = true
    root.add(walk)
  }

  // 外圈绿篱环（多段 hedge，景观件豁免）—— 每段沿切线摆放
  const hedgeN = 20
  for (let i = 0; i < hedgeN; i++) {
    const a = (i / hedgeN) * Math.PI * 2 + Math.PI / hedgeN
    const hx = Math.sin(a) * 9.75
    const hz = Math.cos(a) * 9.75
    const seg = B.hedge({ w: 3.0, d: 0.9, h: 0.95 })
    seg.rotation.y = a
    seg.position.set(hx, 0, hz)
    root.add(seg)
  }

  // 角隅与节点：街灯 ×4、树 ×8、石盆 ×8、长凳 ×4
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    root.add(B.streetLamp({ x: Math.sin(a) * 9.2, z: Math.cos(a) * 9.2, h: 4.6 }))
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    const s = 0.85 + rng() * 0.5
    root.add(B.tree({ x: Math.sin(a) * 8.4, z: Math.cos(a) * 8.4, scale: s, seed: Math.floor(rng() * 1e5) }))
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    root.add(B.urn({ x: Math.sin(a) * 6.6, z: Math.cos(a) * 6.6, scale: 1.1, color: PALETTE[3] }))
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    const bx = Math.sin(a) * 7.6
    const bz = Math.cos(a) * 7.6
    root.add(B.bench({ x: bx, z: bz, rotY: a + Math.PI }))
  }

  // ===================================================================
  // 本体（全部落在 ±8m 内）：三层台基 → 列柱大堂 → 鼓座 → 穹顶 → 浑仪脊饰
  // ===================================================================

  // 台基：三级递减圆柱台阶（半径 7.7 → 7.0 → 6.3，高累计 1.5m）
  const tiers = [[7.7, 0.55, 0.0], [7.0, 0.5, 0.55], [6.35, 0.45, 1.05]] as const
  for (const [r, h, y] of tiers) {
    const step = mesh(new THREE.CylinderGeometry(r, r + 0.12, h, 48), stone2)
    step.position.y = y + h / 2
    root.add(step)
  }
  const podiumTop = 1.5

  // 正面（+Z）四级踏道：深 0.45 薄板（厚≤0.5 且顶≤3 → R13 豁免），总高 1.5m 与台基顶平齐
  const treadH = podiumTop / 4
  for (let s = 0; s < 4; s++) {
    const topY = treadH * (s + 1)
    const stair = mesh(new THREE.BoxGeometry(6.2 - s * 0.4, topY, 0.45), stone1)
    stair.position.set(0, topY / 2, 8.1 - s * 0.45)
    stair.receiveShadow = true
    root.add(stair)
  }

  // 大堂围合柱：16 根，半径 6.0，落在台基上
  const colN = 16
  const colR = 6.0
  const colH = 5.6
  for (let i = 0; i < colN; i++) {
    const a = (i / colN) * Math.PI * 2
    const cx = Math.sin(a) * colR
    const cz = Math.cos(a) * colR
    // 柱基
    const base = mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.4, 16), stone1)
    base.position.set(cx, podiumTop + 0.2, cz)
    root.add(base)
    // 柱身
    root.add(B.column({ r: 0.42, h: colH, x: cx, z: cz, y: podiumTop + 0.4, color: PALETTE[0] }))
    // 柱头
    const cap = mesh(new THREE.CylinderGeometry(0.6, 0.44, 0.42, 16), stone1)
    cap.position.set(cx, podiumTop + 0.4 + colH + 0.21, cz)
    root.add(cap)
    // 檐部连接块（每柱一个 box 朝心，形成密肋檐）
    const ent = mesh(new THREE.BoxGeometry(1.1, 0.7, 1.2), stone0)
    ent.position.set(Math.sin(a) * (colR + 0.1), podiumTop + 0.4 + colH + 0.75, Math.cos(a) * (colR + 0.1))
    ent.rotation.y = a
    root.add(ent)
  }

  // 额枋环（柱顶连续过梁，细圆环 + 方带）
  const architrave = mesh(new THREE.CylinderGeometry(colR + 0.6, colR + 0.6, 0.5, 48), stone0)
  architrave.position.y = podiumTop + 0.4 + colH + 1.25
  root.add(architrave)
  const corniceRing = mesh(new THREE.CylinderGeometry(colR + 0.85, colR + 0.7, 0.35, 48), stone1)
  corniceRing.position.y = podiumTop + 0.4 + colH + 1.65
  root.add(corniceRing)
  const entTop = podiumTop + 0.4 + colH + 1.82

  // 内堂鼓座（cylindrical cella）：半径 4.6，带竖向壁柱与拱窗
  const cellaR = 4.6
  const cellaH = 4.2
  const cellaBase = entTop
  const cella = mesh(new THREE.CylinderGeometry(cellaR, cellaR + 0.1, cellaH, 48), stone1)
  cella.position.y = cellaBase + cellaH / 2
  root.add(cella)
  // 壁柱（pilasters）沿鼓座，24 根（15° 间距，与窗位错开）
  const pilN = 24
  for (let i = 0; i < pilN; i++) {
    const a = (i / pilN) * Math.PI * 2
    const pil = mesh(new THREE.BoxGeometry(0.3, cellaH, 0.3), stone2)
    pil.position.set(Math.sin(a) * (cellaR + 0.05), cellaBase + cellaH / 2, Math.cos(a) * (cellaR + 0.05))
    pil.rotation.y = a
    root.add(pil)
  }
  // 拱窗：自发光玻璃 + 拱形浮雕框 + 窗下栏板（8 扇，位于壁柱之间）
  const winN = 8
  for (let i = 0; i < winN; i++) {
    const a = (i / winN) * Math.PI * 2 + Math.PI / winN
    const gx = Math.sin(a)
    const gz = Math.cos(a)
    const glassWin = mesh(new THREE.BoxGeometry(0.95, 1.9, 0.18), glass)
    glassWin.position.set(gx * (cellaR + 0.1), cellaBase + 2.35, gz * (cellaR + 0.1))
    glassWin.rotation.y = a
    root.add(glassWin)
    const frame = B.archPanel({ w: 1.35, h: 2.6, depth: 0.2, color: PALETTE[1] })
    root.add(atRing(frame, a, cellaR - 0.06, cellaBase + 0.7))
    const key = mesh(new THREE.BoxGeometry(0.4, 0.45, 0.3), stone0)
    key.position.set(gx * (cellaR + 0.1), cellaBase + 3.15, gz * (cellaR + 0.1))
    key.rotation.y = a
    root.add(key)
    const bal = B.latticePanel({ w: 1.15, h: 0.65, cols: 3, rows: 2, bar: 0.1, color: PALETTE[2] })
    root.add(atRing(bal, a, cellaR + 0.28, cellaBase + 0.42))
  }

  // 鼓座顶檐 + 穹底托
  const cellaTop = cellaBase + cellaH
  const drumCap = mesh(new THREE.CylinderGeometry(cellaR + 0.4, cellaR + 0.4, 0.4, 48), stone0)
  drumCap.position.y = cellaTop + 0.2
  root.add(drumCap)
  const drumCornice = mesh(new THREE.CylinderGeometry(cellaR + 0.7, cellaR + 0.5, 0.3, 48), stone1)
  drumCornice.position.y = cellaTop + 0.55
  root.add(drumCornice)
  // 穹底鼓圈（dome drum，高 1.2，半径 4.2）
  const domeBaseY = cellaTop + 0.7
  const domeDrum = mesh(new THREE.CylinderGeometry(4.2, 4.5, 1.3, 48), stone2)
  domeDrum.position.y = domeBaseY + 0.65
  root.add(domeDrum)
  // 鼓圈窗洞（12 个狭长自发光）
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const slit = mesh(new THREE.BoxGeometry(0.4, 0.9, 0.2), glass)
    slit.position.set(Math.sin(a) * 4.35, domeBaseY + 0.7, Math.cos(a) * 4.35)
    slit.rotation.y = a
    root.add(slit)
  }

  // 主穹顶：半径 4.6 半球（顶点约 domeBaseY+1.3+4.6）
  const domeY = domeBaseY + 1.3
  const dome = mesh(new THREE.SphereGeometry(4.6, 64, 36, 0, Math.PI * 2, 0, Math.PI / 2), verdigris)
  dome.scale.set(1, 0.82, 1)
  dome.position.y = domeY
  root.add(dome)

  // 穹顶肋：8 条金色经线弧（半圆环沿经线切放）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const rib = mesh(new THREE.TorusGeometry(4.62, 0.07, 6, 40, Math.PI), gilt)
    rib.position.y = domeY
    rib.rotation.y = a
    rib.rotation.z = 0
    rib.scale.set(1, 0.82, 1)
    root.add(rib)
  }
  // 纬线环（3 条平行圈）
  for (let k = 1; k <= 3; k++) {
    const phi = (k / 4) * (Math.PI / 2)
    const rr = 4.6 * Math.cos(phi)
    const yy = domeY + 4.6 * 0.82 * Math.sin(phi)
    const par = mesh(new THREE.TorusGeometry(rr, 0.05, 6, 48), gilt)
    par.rotation.x = Math.PI / 2
    par.position.y = yy
    root.add(par)
  }

  // 穹顶采光亭（lantern）+ 浑仪脊饰
  const lanternY = domeY + 4.6 * 0.82
  const lantBase = mesh(new THREE.CylinderGeometry(1.15, 1.4, 0.4, 24), stone1)
  lantBase.position.y = lanternY + 0.2
  root.add(lantBase)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const lcol = mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.4, 12), stone0)
    lcol.position.set(Math.sin(a) * 0.95, lanternY + 1.1, Math.cos(a) * 0.95)
    root.add(lcol)
  }
  const lantCap = mesh(new THREE.CylinderGeometry(0.5, 1.35, 0.5, 24), verdigrisDeep)
  lantCap.position.y = lanternY + 2.05
  root.add(lantCap)
  const lantSpire = mesh(new THREE.ConeGeometry(0.5, 1.6, 16), gilt)
  lantSpire.position.y = lanternY + 3.1
  root.add(lantSpire)

  // 浑仪脊饰（复用本人积木）
  const ornY = lanternY + 3.9
  const topOrn = armillary({ scale: 1.3, rotY: rng() * Math.PI })
  topOrn.position.y = ornY
  root.add(topOrn)

  // ===================================================================
  // 场地浑仪雕塑 ×4（对角基座，景观件；本体之外的广场装置）
  // ===================================================================
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    const px = Math.sin(a) * 6.7
    const pz = Math.cos(a) * 6.7
    const pl = B.plinth({ w: 2.4, d: 2.4, h: 0.6, color: PALETTE[2] })
    pl.position.set(px, 0.3, pz)
    pl.userData.site = true
    root.add(pl)
    const orn = armillary({ scale: 1.05, rotY: a })
    orn.position.set(px, 0.6, pz)
    root.add(orn)
    // 基座四角小石盆
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      root.add(B.urn({ x: px + dx * 1.0, z: pz + dz * 1.0, scale: 0.7, color: PALETTE[3] }))
    }
  }

  // 本体栏杆环（台基顶边缘 balustrade，薄板/小件豁免，围合大堂入口平台）
  const balR = 6.35
  const balN = 24
  for (let i = 0; i < balN; i++) {
    const a = (i / balN) * Math.PI * 2
    // 留出入口缺口（正对 +Z）
    if (Math.abs(a) < 0.25 || Math.abs(a - Math.PI * 2) < 0.25) continue
    const seg = B.railing({ w: 1.5, h: 0.95, color: PALETTE[0] })
    seg.userData.site = true
    seg.rotation.y = a
    seg.position.set(Math.sin(a) * balR, podiumTop, Math.cos(a) * balR)
    root.add(seg)
  }

  return root
}
