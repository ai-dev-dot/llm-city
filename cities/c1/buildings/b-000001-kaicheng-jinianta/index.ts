import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

// 模都开城纪念塔 · 文明阶梯 —— b-000001 重建版（新宪法第 9 条下的高完成度交付）
// 九段退台阶梯金字塔：三层台基 + 八层拱券柱廊退台 + 八柱圣坛穹顶 + 常亮「开城之芯」。
// 细节策略：真开洞拱券（Shape 挖半圆洞 + Extrude）、密柱栏杆、双层檐口线脚、退台石盆、
// 环形灯柱与树阵场地。构件仅 0/90/180/270 度放置（避开保守包围盒 √2 外扩）。

const C = {
  stone: '#E8E6E1',  // 塔身石灰白
  light: '#D9D6CF',  // 台基/线脚浅灰
  trim: '#A8A5A0',   // 檐口/栏杆中灰
  sand: '#C9B79C',   // 拱券砂岩
  dark: '#3E3C3A',   // 深炭（碑/灯杆/天线）
  bronze: '#4A5568', // 青铜穹顶
  wood: '#B0885E',   // 暖木（长椅）
  gold: '#FFD98A',   // 开城之芯暖金
  glow: '#FFE3B0',   // 券内暖光
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const B = ctx.blocks
  const rng = ctx.rng

  // y 一律为底部高度；构件已加入 root
  const box = (
    w: number, h: number, d: number, x: number, y: number, z: number, color: string,
    o?: { metalness?: number; roughness?: number; emissive?: string; emissiveIntensity?: number },
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stdMaterial(color, o))
    m.position.set(x, y + h / 2, z)
    m.castShadow = true
    root.add(m)
    return m
  }
  const lift = (o: THREE.Object3D, dy: number) => { o.position.y += dy; root.add(o); return o }

  // 拱券柱廊板（官方件 archWall）：位置语义 (x,z) 为板厚中心（法线 = rotY 方向），y 为板底
  const ARCH_DEPTH = 0.4
  const archPanel = (w: number, h: number, aw: number, ah: number, x: number, y: number, z: number, rotY: number) => {
    const m = B.archWall({ w, h, archW: aw, archH: ah, depth: ARCH_DEPTH, color: C.sand }) as THREE.Mesh
    m.geometry.translate(0, 0, -ARCH_DEPTH / 2)
    m.position.set(x + Math.sin(rotY) * (ARCH_DEPTH / 2), y, z + Math.cos(rotY) * (ARCH_DEPTH / 2))
    m.rotation.y = rotY
    root.add(m)
    // 券洞内暖光板（居墙厚，小于洞口，两面可见——夜景灯笼效果）
    const glowPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(aw * 0.8, ah * 0.78),
      stdMaterial(C.glow, { emissive: C.glow, emissiveIntensity: 0.55, roughness: 0.6 }),
    )
    glowPlate.position.set(x + Math.sin(rotY) * (ARCH_DEPTH / 2), y + ah * 0.42, z + Math.cos(rotY) * (ARCH_DEPTH / 2))
    glowPlate.rotation.y = rotY
    root.add(glowPlate)
  }

  // 栏杆段（官方件 railing，四面安放补 rotY）
  const railing = (w: number, x: number, y: number, z: number, rotY: number) => {
    const g = B.railing({ w, color: C.trim })
    g.position.set(x, y, z)
    g.rotation.y = rotY
    root.add(g)
  }

  // ---- 台基（三层收方：±7 / ±6.25 / ±5.5，顶面 y=2.8）——收窄台基，把地块还给草坪 ----
  box(14, 0.9, 14, 0, 0, 0, C.light)
  box(12.5, 0.95, 12.5, 0, 0.9, 0, C.light)
  box(11, 0.95, 11, 0, 1.85, 0, C.trim)

  // 南面大台阶：从台基顶缘（z 7）九级落到草坪（高差 2.8）
  for (let j = 0; j < 9; j++) box(5.0, 0.31, 0.26, 0, 2.49 - 0.31 * j, 7.1 + 0.26 * j, C.light)

  // 北面开城铭碑（立于北侧草坪，面朝城外）
  box(3.0, 0.3, 0.9, 0, 0.5, -8.3, C.trim)
  box(2.5, 2.0, 0.38, 0, 0.8, -8.3, C.dark)
  box(2.0, 1.3, 0.06, 0, 1.15, -8.51, '#9FB8C8', { emissive: '#9FB8C8', emissiveIntensity: 0.5 })
  box(2.8, 0.2, 0.6, 0, 2.8, -8.3, C.light)

  // ---- 塔身八层退台（每层 6.5m，自 10.4m 见方每层收 0.6m）----
  let width = 10.4
  let y = 2.8
  for (let f = 0; f < 8; f++) {
    const hw = width / 2
    // 实体核（缩进，被拱廊包住）
    box(width - 1.8, 6.5, width - 1.8, 0, y, 0, C.stone)
    // 四面拱券柱廊：下层 5 券、上层 4 券
    const panelW = width - 0.6
    const nArch = width >= 9.5 ? 5 : 4
    const aw = panelW / nArch - 0.5
    for (let k = 0; k < nArch; k++) {
      const cx = -panelW / 2 + (panelW / nArch) * (k + 0.5)
      archPanel(panelW / nArch + 0.08, 5.6, aw, 4.9, cx, y + 0.35, hw - 0.2, 0)
      archPanel(panelW / nArch + 0.08, 5.6, aw, 4.9, cx, y + 0.35, -hw + 0.2, Math.PI)
      archPanel(panelW / nArch + 0.08, 5.6, aw, 4.9, hw - 0.2, y + 0.35, cx, Math.PI / 2)
      archPanel(panelW / nArch + 0.08, 5.6, aw, 4.9, -hw + 0.2, y + 0.35, cx, -Math.PI / 2)
    }
    // 券内深景：实体核四面对齐每个券洞贴盲拱浮雕（官方件 archPanel），洞中见拱，纵深成对
    const coreHw = (width - 1.8) / 2
    for (let k = 0; k < nArch; k++) {
      const cx = -panelW / 2 + (panelW / nArch) * (k + 0.5)
      const niche = (x: number, z: number, rotY: number) => {
        const relief = B.archPanel({ w: aw * 0.92, h: 4.4, depth: 0.16, color: C.sand })
        relief.position.set(x, y + 0.5, z)
        relief.rotation.y = rotY
        root.add(relief)
        if (k % 2 === 0) lift(B.urn({ scale: 0.85, color: C.trim, x, y: y + 0.5, z }), 0)
      }
      niche(cx, coreHw + 0.02, 0)
      niche(cx, -coreHw - 0.02 - 0.16, Math.PI)
      niche(coreHw + 0.02, cx, Math.PI / 2)
      niche(-coreHw - 0.02 - 0.16, cx, -Math.PI / 2)
    }
    // 核顶棂窗带（官方件 latticePanel，透过拱券上沿可见）
    for (const [nx, nz, rotY] of [[0, coreHw + 0.03, 0], [0, -coreHw - 0.03, Math.PI], [coreHw + 0.03, 0, Math.PI / 2], [-coreHw - 0.03, 0, -Math.PI / 2]] as const) {
      const lp = B.latticePanel({ w: panelW - 1.2, h: 1.0, cols: 6, rows: 1, bar: 0.1, color: C.trim })
      lp.position.set(nx, y + 5.2, nz)
      lp.rotation.y = rotY
      root.add(lp)
    }
    // 券间壁柱（每面 nArch-1 根）+ 四角护角柱
    for (let k = 1; k <= nArch - 1; k++) {
      const bx = -panelW / 2 + (panelW / nArch) * k
      box(0.44, 5.7, 0.5, bx, y + 0.25, hw - 0.2, C.sand)
      box(0.44, 5.7, 0.5, bx, y + 0.25, -hw + 0.2, C.sand)
      box(0.5, 5.7, 0.44, hw - 0.2, y + 0.25, bx, C.sand)
      box(0.5, 5.7, 0.44, -hw + 0.2, y + 0.25, bx, C.sand)
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box(0.6, 5.9, 0.6, sx * (hw - 0.45), y + 0.2, sz * (hw - 0.45), C.sand)
    // 双道檐口线脚（层顶收头，外挑）
    box(width + 0.3, 0.34, width + 0.3, 0, y + 6.0, 0, C.light)
    box(width + 0.75, 0.5, width + 0.75, 0, y + 6.34, 0, C.trim)
    // 退台平台：沿檐板外缘一圈栏杆 + 四角石盆
    const rw = width + 0.55
    railing(rw, 0, y + 6.84, rw / 2 - 0.11, 0)
    railing(rw, 0, y + 6.84, -rw / 2 + 0.11, 0)
    railing(rw, rw / 2 - 0.11, y + 6.84, 0, Math.PI / 2)
    railing(rw, -rw / 2 + 0.11, y + 6.84, 0, Math.PI / 2)
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      lift(B.urn({ color: C.trim, x: sx * (hw + 0.05), y: y + 6.84, z: sz * (hw + 0.05) }), 0)
    y += 6.5
    width -= 0.6
  }

  // ---- 圣坛（八柱亭 + 青铜穹顶 + 灯笼），y 为八层塔身顶 ----
  const altarW = width + 1.2
  const ahw = altarW / 2
  box(altarW, 0.5, altarW, 0, y, 0, C.trim)
  for (const px of [-1, 0, 1]) for (const pz of [-1, 0, 1]) {
    if (px === 0 && pz === 0) continue
    lift(B.column({ r: 0.24, h: 3.6, x: px * (ahw - 0.5), z: pz * (ahw - 0.5), y: y + 0.5, color: C.stone }), 0)
  }
  box(altarW + 0.7, 0.45, altarW + 0.7, 0, y + 4.1, 0, C.trim)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(ahw - 0.3, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    stdMaterial(C.bronze, { roughness: 0.55, metalness: 0.25 }),
  )
  dome.position.y = y + 4.55
  dome.castShadow = true
  root.add(dome)
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.8, 8),
    stdMaterial(C.glow, { emissive: C.glow, emissiveIntensity: 0.9 }),
  )
  lantern.position.y = y + 4.55 + (ahw - 0.3) + 0.4
  root.add(lantern)

  // 圣坛四尊守护碑像（盲拱背光 + 大石盆，立于顶层退台、面朝四方）
  for (const [gx, gz, rotY] of [[0, ahw - 0.5, 0], [0, -ahw + 0.5, Math.PI], [ahw - 0.5, 0, Math.PI / 2], [-ahw + 0.5, 0, -Math.PI / 2]] as const) {
    const back = B.archPanel({ w: 1.8, h: 3.2, depth: 0.2, color: C.sand })
    back.position.set(gx, y + 0.5, gz)
    back.rotation.y = rotY
    root.add(back)
    lift(B.urn({ scale: 1.8, color: C.trim, x: gx, y: y + 0.5, z: gz }), 0)
  }

  // ---- 塔冠：天线 + 常亮「开城之芯」+ 光环 + 航空障碍灯 ----
  const mastTop = y + 4.55 + (ahw - 0.3) + 0.8
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.12, 3.6, 8),
    stdMaterial(C.dark, { metalness: 0.6, roughness: 0.4 }),
  )
  mast.position.y = mastTop + 1.8
  mast.castShadow = true
  root.add(mast)
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 20, 14),
    stdMaterial(C.gold, { emissive: C.gold, emissiveIntensity: 1.8, roughness: 0.3 }),
  )
  core.position.y = mastTop + 1.5
  root.add(core)
  for (const [r, tilt] of [[1.45, Math.PI / 2], [1.62, Math.PI / 2 - 0.5]] as const) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.05, 8, 44),
      stdMaterial(C.gold, { emissive: C.gold, emissiveIntensity: 1.1, metalness: 0.4, roughness: 0.35 }),
    )
    ring.position.y = core.position.y
    ring.rotation.x = tilt
    root.add(ring)
  }
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    stdMaterial('#FF5A4E', { emissive: '#FF5A4E', emissiveIntensity: 2 }),
  )
  beacon.position.y = mastTop + 3.7
  root.add(beacon)

  // ---- 场地：地块满铺（草皮垫层 + 铺装环 + 灌木），不裸地交付 ----
  // 场景地面 y=0、道路 y=0.05：草皮必须是有厚度的垫层（顶面 0.5）才能在深度缓冲里
  // 站得住——薄贴片会与大地平面同深度档而被吃掉。0.5 高的垫层自带路缘效果。
  box(19.6, 0.5, 19.6, 0, 0, 0, '#7FA35C', { roughness: 0.95, emissive: '#4F7A38', emissiveIntensity: 0.42 })
  // 十字步道（草坪上的浅石步道，从四方通向台基）
  box(1.4, 0.08, 3.0, 0, 0.5, 8.35, C.light, { roughness: 0.9 })
  box(1.4, 0.08, 3.0, 0, 0.5, -8.35, C.light, { roughness: 0.9 })
  box(3.0, 0.08, 1.4, 8.35, 0.5, 0, C.light, { roughness: 0.9 })
  box(3.0, 0.08, 1.4, -8.35, 0.5, 0, C.light, { roughness: 0.9 })
  // 草皮上的灌木球阵（半嵌进草皮面）
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + 0.22
    const r = 9.35 + rng() * 0.12
    const shrub = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.38 + rng() * 0.16, 1),
      stdMaterial(i % 3 === 0 ? '#8C9E8B' : '#6E7F5C', { roughness: 0.95 }),
    )
    shrub.position.set(Math.cos(ang) * r, 0.85, Math.sin(ang) * r)
    shrub.castShadow = true
    root.add(shrub)
  }

  // ---- 场地设施（台基外环带 y=0 与一台顶 y=0.9）----
  // 12 盏灯柱环（r=9.55，让开正南台阶轴线）
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2
    if (Math.abs(Math.cos(ang)) < 0.3 && Math.sin(ang) > 0.55) continue
    lift(B.streetLamp({ x: Math.cos(ang) * 9.4, z: Math.sin(ang) * 9.4, h: 4.0 }), 0.5)
  }
  // 一台顶外圈树阵（r≈8.8，介于二台 ±8.5 与一台边 ±9.25 之间）
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + Math.PI / 12
    if (Math.sin(ang) > 0.8) continue   // 让开南面
    lift(B.tree({
      x: Math.cos(ang) * (8.8 + (rng() - 0.5) * 0.2), z: Math.sin(ang) * (8.8 + (rng() - 0.5) * 0.2),
      scale: 0.85 + rng() * 0.3, seed: i + 1,
    }), 0.5)
  }
  // 四角 L 形绿篱（一台顶）
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    lift(B.hedge({ w: 3.2, d: 0.55, h: 0.75, x: sx * 8.4, z: sz * 9.2 }), 0.5)
    lift(B.hedge({ w: 0.55, d: 3.2, h: 0.75, x: sx * 9.2, z: sz * 8.4 }), 0.5)
  }
  // 南轴仪仗旗阵（南步道两侧草坪各六杆，旗面暖金）
  for (let i = 0; i < 6; i++) {
    const z = 9.0 - i * 0.24
    for (const sx of [-1, 1]) {
      const px = sx * 2.6
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 7, 8), stdMaterial(C.dark, { metalness: 0.5, roughness: 0.5 }))
      pole.position.set(px, 4.0, z)
      pole.castShadow = true
      root.add(pole)
      box(1.8, 1.0, 0.06, px + sx * -0.92, 6.4, z, C.gold, { emissive: C.gold, emissiveIntensity: 0.35 })
    }
  }
  // 长椅（草坪边、步道旁）
  lift(B.bench({ x: -2.6, z: 9.45 }), 0.5)
  lift(B.bench({ x: 2.6, z: 9.45 }), 0.5)
  lift(B.bench({ x: -6.9, z: 6.9, rotY: Math.PI / 4 }), 0.5)
  lift(B.bench({ x: 6.9, z: 6.9, rotY: -Math.PI / 4 }), 0.5)

  return root
}
