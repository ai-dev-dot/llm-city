import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

// 模都开城纪念塔 —— b-000001，正式开城第一栋，落址全城正中心 E5-05。
// 三层收分台基 → 三段收分方塔（竖向窗带 + 角壁柱）→ 八柱观景亭 → 四棱攒尖顶，
// 塔尖悬一枚常亮的「开城之芯」，寓意城市的模型之心昼夜不灭。总高约 56m。

const C = {
  plinth: '#D9D6CF', // 台基石
  shaft: '#E8E6E1',  // 塔身暖白
  trim: '#A8A5A0',   // 檐口/壁柱
  dark: '#3E3C3A',   // 深炭（门/碑）
  bronze: '#4A5568', // 青铜蓝灰（攒尖顶/门楣）
  wood: '#B0885E',   // 暖木门框
  core: '#FFD98A',   // 开城之芯暖金
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const B = ctx.blocks
  const rng = ctx.rng

  // y 一律为底部高度；box 返回的 mesh 已加进 root
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

  // ---- 台基（三层收分，顶面 y=1.8）----
  box(19, 0.5, 19, 0, 0, 0, C.plinth)
  box(16, 0.6, 16, 0, 0.5, 0, C.plinth)
  box(13, 0.7, 13, 0, 1.1, 0, C.trim)

  // ---- 入口台阶（南面，六级）----
  for (let j = 1; j <= 6; j++) box(5.2, 0.3, 0.5, 0, 0.3 * (j - 1), 6.75 + 0.5 * (6 - j), C.plinth)

  // ---- 门廊 + 大门（南立面）----
  lift(B.column({ r: 0.28, h: 4.15, x: -1.7, z: 5.7, y: 1.8, color: C.shaft }), 0)
  lift(B.column({ r: 0.28, h: 4.15, x: 1.7, z: 5.7, y: 1.8, color: C.shaft }), 0)
  box(4.8, 0.45, 2.4, 0, 5.95, 5.7, C.trim)
  lift(B.pitchedRoof({ w: 4.6, d: 2.4, h: 1.2, color: C.bronze, y: 6.4 }), 0)
  box(2.4, 3.6, 0.22, 0, 1.8, 4.24, C.dark)
  box(0.28, 3.8, 0.3, -1.3, 1.8, 4.24, C.wood)
  box(0.28, 3.8, 0.3, 1.3, 1.8, 4.24, C.wood)
  box(2.9, 0.3, 0.3, 0, 5.6, 4.24, C.wood)
  box(0.14, 1.6, 0.1, -0.55, 2.6, 4.4, C.core, { emissive: C.core, emissiveIntensity: 0.7 })

  // ---- 塔身三段（角壁柱略凸）----
  const seg = (w: number, h: number, yb: number) => {
    box(w, h, w, 0, yb, 0, C.shaft)
    const hw = w / 2
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box(0.8, h, 0.8, sx * (hw - 0.38), yb, sz * (hw - 0.38), C.trim)
    return yb + h
  }
  const cornice = (w: number, yb: number) => {
    box(w + 0.5, 0.28, w + 0.5, 0, yb - 0.28, 0, C.plinth) // 下线脚
    box(w + 0.9, 0.9, w + 0.9, 0, yb, 0, C.trim)           // 主檐板
    return yb + 0.9
  }
  let y = seg(8.4, 16, 1.8)
  y = cornice(8.4, y)
  y = seg(7.2, 13, y)
  y = cornice(7.2, y)
  y = seg(6.0, 11, y)
  y = cornice(6.0, y)

  // ---- 竖向窗带（四面）----
  const strip = (w: number, h: number, x: number, yb: number, z: number, rotY = 0) => {
    const s = B.windowStrip({ w, h })
    s.position.set(x, yb + h / 2, z)
    s.rotation.y = rotY
    root.add(s)
  }
  const strips = (hw: number, yb: number, h: number, w: number, xs: number[]) => {
    for (const xo of xs) {
      strip(w, h, xo, yb, hw + 0.08)
      strip(w, h, xo, yb, -hw - 0.08)
      strip(w, h, hw + 0.08, yb, xo, Math.PI / 2)
      strip(w, h, -hw - 0.08, yb, xo, Math.PI / 2)
    }
  }
  strips(4.2, 3.2, 13.5, 1.1, [-2.6, 0, 2.6])
  strips(3.6, 19.9, 11, 1.25, [-1.85, 1.85])
  strips(3.0, 33.8, 9, 1.5, [0])

  // ---- 观景亭（八柱 + 栏杆 + 顶板）----
  box(5.8, 0.4, 5.8, 0, y, 0, C.trim) // 亭底板，y=44.5
  for (const px of [-2.5, 0, 2.5]) for (const pz of [-2.5, 0, 2.5]) {
    if (px === 0 && pz === 0) continue
    lift(B.column({ r: 0.2, h: 3.4, x: px, z: pz, y: y + 0.4, color: C.shaft }), 0)
  }
  for (const s of [-1, 1]) {
    box(5.0, 0.95, 0.12, 0, y + 0.4, s * 2.5, C.trim)          // 栏板
    box(5.0, 0.12, 0.34, 0, y + 1.35, s * 2.5, C.plinth)       // 扶手
    box(0.12, 0.95, 5.0, s * 2.5, y + 0.4, 0, C.trim)
    box(0.34, 0.12, 5.0, s * 2.5, y + 1.35, 0, C.plinth)
  }
  box(6.3, 0.5, 6.3, 0, y + 3.8, 0, C.trim) // 亭顶板 → 48.8

  // ---- 攒尖顶 + 天线 + 开城之芯 ----
  lift(B.pitchedRoof({ w: 5.8, d: 5.8, h: 3.0, color: C.bronze, y: y + 4.3 }), 0)
  box(1.4, 0.5, 1.4, 0, y + 7.3, 0, C.trim) // 顶座 → 52.3
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 3.4, 8),
    stdMaterial(C.dark, { metalness: 0.6, roughness: 0.4 }),
  )
  mast.position.y = y + 7.8 + 1.7 // 52.3 → 55.7
  mast.castShadow = true
  root.add(mast)
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 18, 12),
    stdMaterial(C.core, { emissive: C.core, emissiveIntensity: 1.8, roughness: 0.3 }),
  )
  core.position.y = y + 9.1 // 53.6，悬于杆上
  root.add(core)
  for (const [r, tilt] of [[1.35, Math.PI / 2], [1.5, Math.PI / 2 - 0.5]] as const) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.045, 8, 40),
      stdMaterial(C.core, { emissive: C.core, emissiveIntensity: 1.1, metalness: 0.4, roughness: 0.35 }),
    )
    ring.position.y = core.position.y
    ring.rotation.x = tilt
    root.add(ring)
  }
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 8),
    stdMaterial('#FF5A4E', { emissive: '#FF5A4E', emissiveIntensity: 2 }),
  )
  beacon.position.y = y + 11.3 // 55.8 航空障碍灯
  root.add(beacon)

  // ---- 开城铭碑（北面，立于二层台基顶）----
  box(2.8, 0.3, 0.8, 0, 1.1, -7.0, C.trim)
  box(2.4, 1.8, 0.35, 0, 1.4, -7.0, C.dark)
  box(1.9, 1.2, 0.06, 0, 1.7, -7.21, '#9FB8C8', { emissive: '#9FB8C8', emissiveIntensity: 0.5 })
  box(2.7, 0.18, 0.55, 0, 3.2, -7.0, C.plinth)

  // ---- 地面景观：四角绿篱 + 树，L2 顶面环廊长椅，L1 顶面路灯 ----
  const corners = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const
  corners.forEach(([sx, sz], i) => {
    lift(B.hedge({ w: 3.4, d: 0.55, h: 0.7, x: sx * 8.5, z: sz * 9.15 }), 0.5)
    lift(B.hedge({ w: 0.55, d: 3.4, h: 0.7, x: sx * 9.15, z: sz * 8.5 }), 0.5)
    lift(B.tree({
      x: sx * (8.6 + (rng() - 0.5) * 0.4), z: sz * (8.6 + (rng() - 0.5) * 0.4),
      scale: 1 + rng() * 0.3, seed: i + 1,
    }), 0.5)
  })
  lift(B.bench({ x: 0, z: 7.2 }), 1.1)
  lift(B.bench({ x: 0, z: -7.2 }), 1.1)
  lift(B.bench({ x: 7.2, z: 0, rotY: Math.PI / 2 }), 1.1)
  lift(B.bench({ x: -7.2, z: 0, rotY: Math.PI / 2 }), 1.1)
  for (const s of [-1, 1]) {
    lift(B.streetLamp({ x: s * 8.8, z: 0, h: 4.2 }), 0.5)
    lift(B.streetLamp({ x: 0, z: s * 8.8, h: 4.2 }), 0.5)
    lift(B.streetLamp({ x: s * 3.5, z: 9.3, h: 3.8 }), 0) // 台阶两侧
  }

  return root
}
