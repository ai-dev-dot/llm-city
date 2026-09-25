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

  // 拱券柱廊板：矩形墙挖半圆拱洞（洞开到底成柱廊），挤出 0.4m。
  // 位置语义：(x, z) 为板厚中心（法线 = rotY 方向），y 为板底。
  const ARCH_DEPTH = 0.4
  const archPanel = (w: number, h: number, aw: number, ah: number, x: number, y: number, z: number, rotY: number) => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, 0); shape.lineTo(-w / 2, h); shape.lineTo(w / 2, h); shape.lineTo(w / 2, 0); shape.closePath()
    const hole = new THREE.Path()
    hole.moveTo(-aw / 2, 0)
    hole.lineTo(-aw / 2, ah - aw / 2)
    hole.absarc(0, ah - aw / 2, aw / 2, Math.PI, 0, true)
    hole.lineTo(aw / 2, 0)
    hole.closePath()
    shape.holes.push(hole)
    const geo = new THREE.ExtrudeGeometry(shape, { depth: ARCH_DEPTH, bevelEnabled: false, curveSegments: 7, steps: 1 })
    const cx = x + Math.sin(rotY) * (ARCH_DEPTH / 2)
    const cz = z + Math.cos(rotY) * (ARCH_DEPTH / 2)
    const m = new THREE.Mesh(geo, stdMaterial(C.sand, { roughness: 0.8 }))
    // Extrude 局部 z∈[0, depth]：先平移 -depth/2 使挤出段以 (x,z) 为中心，再转 rotY
    m.geometry.translate(0, 0, -ARCH_DEPTH / 2)
    m.position.set(cx, y, cz)
    m.rotation.y = rotY
    m.castShadow = true
    root.add(m)
    // 券洞内暖光板（居墙厚，小于洞口，两面可见——夜景灯笼效果）
    const glowPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(aw * 0.8, ah * 0.78),
      stdMaterial(C.glow, { emissive: C.glow, emissiveIntensity: 0.55, roughness: 0.6 }),
    )
    glowPlate.position.set(cx, y + ah * 0.42, cz)
    glowPlate.rotation.y = rotY
    root.add(glowPlate)
  }

  // 栏杆段：扶手 + 踢脚 + 立柱（柱距约 1m），(x,z) 为段中心、沿局部 X 展开
  const railing = (w: number, x: number, y: number, z: number, rotY: number) => {
    const grp = new THREE.Group()
    const hand = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.22), stdMaterial(C.light))
    hand.position.y = 0.94; hand.castShadow = true; grp.add(hand)
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.12), stdMaterial(C.trim))
    skirt.position.y = 0.05; grp.add(skirt)
    const n = Math.max(3, Math.round(w))
    for (let i = 0; i <= n; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.9, 6), stdMaterial(C.trim, { roughness: 0.6 }))
      post.position.set(-w / 2 + (w * i) / n, 0.45)
      post.castShadow = true
      grp.add(post)
    }
    grp.position.set(x, y, z)
    grp.rotation.y = rotY
    root.add(grp)
  }

  // 退台石盆（小 urn：座 + 盆身 + 半球盖）
  const urn = (x: number, y: number, z: number) => {
    const g = new THREE.Group()
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.34, 10), stdMaterial(C.trim))
    base.position.y = 0.17; base.castShadow = true; g.add(base)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.42, 10), stdMaterial(C.sand))
    body.position.y = 0.52; body.castShadow = true; g.add(body)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), stdMaterial(C.trim))
    cap.position.y = 0.73; g.add(cap)
    g.position.set(x, y, z)
    root.add(g)
  }

  // ---- 台基（三层收方：±9.25 / ±8.5 / ±7.75，顶面 y=3.0）----
  box(18.5, 0.9, 18.5, 0, 0, 0, C.light)
  box(17.0, 1.0, 17.0, 0, 0.9, 0, C.light)
  box(15.5, 1.1, 15.5, 0, 1.9, 0, C.trim)

  // 南面大台阶：从三台顶缘（z 7.75）十级落地到 z≈10.1（高差 3.0）
  for (let j = 0; j < 10; j++) box(6.4, 0.3, 0.24, 0, 2.7 - 0.3 * j, 7.87 + 0.24 * j, C.light)

  // 北面开城铭碑（立于二层台基顶 y=1.9，|z|=8.1 在二台 ±8.5 内、三台 ±7.75 外）
  box(3.0, 0.3, 0.9, 0, 1.9, -8.1, C.trim)
  box(2.5, 2.0, 0.38, 0, 2.2, -8.1, C.dark)
  box(2.0, 1.3, 0.06, 0, 2.55, -8.31, '#9FB8C8', { emissive: '#9FB8C8', emissiveIntensity: 0.5 })
  box(2.8, 0.2, 0.6, 0, 4.2, -8.1, C.light)

  // ---- 塔身八层退台（每层 6.5m，自 15m 见方每层收 1.34m）----
  let width = 15
  let y = 3
  for (let f = 0; f < 8; f++) {
    const hw = width / 2
    // 实体核（缩进，被拱廊包住）
    box(width - 1.8, 6.5, width - 1.8, 0, y, 0, C.stone)
    // 四面拱券柱廊：每面 4 券（券间壁柱位由循环边沿给出）
    const panelW = hw * 2 - 0.6
    const aw = panelW / 4 - 0.55
    for (let k = 0; k < 4; k++) {
      const cx = -panelW / 2 + (panelW / 4) * (k + 0.5)
      archPanel(panelW / 4 + 0.1, 5.6, aw, 4.9, cx, y + 0.35, hw - 0.2, 0)
      archPanel(panelW / 4 + 0.1, 5.6, aw, 4.9, cx, y + 0.35, -hw + 0.2, Math.PI)
      archPanel(panelW / 4 + 0.1, 5.6, aw, 4.9, hw - 0.2, y + 0.35, cx, Math.PI / 2)
      archPanel(panelW / 4 + 0.1, 5.6, aw, 4.9, -hw + 0.2, y + 0.35, cx, -Math.PI / 2)
    }
    // 券间壁柱（每面三处间隔位）+ 四角护角柱
    for (let k = 1; k <= 3; k++) {
      const bx = -panelW / 2 + (panelW / 4) * k
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
      urn(sx * (hw + 0.05), y + 6.84, sz * (hw + 0.05))
    y += 6.5
    width -= 1.34
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

  // ---- 场地（台基外环带 y=0 与一台顶 y=0.9）----
  // 12 盏灯柱环（r=9.55，让开正南台阶轴线）
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2
    if (Math.abs(Math.cos(ang)) < 0.3 && Math.sin(ang) > 0.55) continue
    lift(B.streetLamp({ x: Math.cos(ang) * 9.55, z: Math.sin(ang) * 9.55, h: 4.0 }), 0)
  }
  // 一台顶外圈树阵（r≈8.8，介于二台 ±8.5 与一台边 ±9.25 之间）
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + Math.PI / 12
    if (Math.sin(ang) > 0.8) continue   // 让开南面
    lift(B.tree({
      x: Math.cos(ang) * (8.8 + (rng() - 0.5) * 0.2), z: Math.sin(ang) * (8.8 + (rng() - 0.5) * 0.2),
      scale: 0.85 + rng() * 0.3, seed: i + 1,
    }), 0.9)
  }
  // 四角 L 形绿篱（一台顶）
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    lift(B.hedge({ w: 3.4, d: 0.55, h: 0.75, x: sx * 8.5, z: sz * 9.0 }), 0.9)
    lift(B.hedge({ w: 0.55, d: 3.4, h: 0.75, x: sx * 9.0, z: sz * 8.5 }), 0.9)
  }
  // 南轴铺装带 + 长椅（台基外地面）
  box(2.2, 0.1, 1.3, -4.6, 0, 9.55, C.light)
  box(2.2, 0.1, 1.3, 4.6, 0, 9.55, C.light)
  lift(B.bench({ x: -4.6, z: 9.55 }), 0.1)
  lift(B.bench({ x: 4.6, z: 9.55 }), 0.1)
  lift(B.bench({ x: -6.9, z: 6.9, rotY: Math.PI / 4 }), 0)
  lift(B.bench({ x: 6.9, z: 6.9, rotY: -Math.PI / 4 }), 0)

  return root
}
