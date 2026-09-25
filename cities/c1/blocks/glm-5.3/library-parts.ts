import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

/** 旧书皮色板：土黄 / 赭石 / 墨绿 / 藏蓝 / 暗红 / 灰白 …… 陈年图书馆气质 */
export const BOOK_PALETTE: readonly string[] = [
  '#8C6A4A', '#6B4A2F', '#7A5C3E', '#5B5956', '#4A5568',
  '#8C9E8B', '#B0885E', '#3E3C3A', '#9E8B6E', '#6E5B45',
  '#74604F', '#5A6B5E', '#8A7B62', '#4F4A44',
]

interface Sink { pos: number[]; nor: number[]; idx: number[]; col: number[] }

/** 把一个 box 追加进合并几何（顶点色）。rotZ 用于横躺/斜靠书。 */
function appendBox(s: Sink, w: number, h: number, d: number, x: number, y: number, z: number, rotZ: number, c: THREE.Color): void {
  const g = new THREE.BoxGeometry(w, h, d)
  if (rotZ !== 0) g.rotateZ(rotZ)
  g.translate(x, y, z)
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

/** 书墙（自建积木 · glm-5.3）：满架书脊的单 mesh 表现——全部书、层板与框料
 *  合并进一个顶点色 BufferGeometry（InstancedMesh 在本城统计口径下不乘实例数，
 *  故用顶点合并把面数花成可感知的书海细节）。
 *  与官方件同款约定：纯参数化、无副作用、无随机——随机性由调用方把
 *  ctx.rng() 的切片作为 rand 参数传入。原点在墙面中心底部，宽沿局部 X，法线 +Z。 */
export function bookwall(o: {
  w: number                 // 墙宽（沿局部 X）
  h: number                 // 墙高
  rows?: number             // 书架层数（缺省按层高 ~0.55 取整）
  depth?: number            // 书深（缺省 0.22）
  palette?: readonly string[]
  rand: () => number        // 调用方注入的确定性随机
  x?: number; y?: number; z?: number
}): THREE.Object3D {
  const rand = o.rand
  const rows = o.rows ?? Math.max(2, Math.round(o.h / 0.55))
  const depth = o.depth ?? 0.22
  const palette = o.palette ?? BOOK_PALETTE
  const rowH = o.h / rows
  const s: Sink = { pos: [], nor: [], idx: [], col: [] }
  const pickColor = () => {
    const c = new THREE.Color(palette[Math.floor(rand() * palette.length) % palette.length])
    c.offsetHSL((rand() - 0.5) * 0.015, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.09)
    return c
  }
  const wood = new THREE.Color('#4E3B28')
  const woodDark = new THREE.Color('#3E2F20')

  // 框料：背板 + 顶檐板 + 底踢脚 + 竖向分格柱（每隔 ~1.8m 一根，书架分格）
  appendBox(s, o.w, o.h, 0.05, 0, o.h / 2, -depth / 2 + 0.025, 0, woodDark)
  appendBox(s, o.w + 0.08, 0.07, depth + 0.08, 0, o.h - 0.035, 0, 0, wood)
  appendBox(s, o.w + 0.04, 0.09, depth + 0.04, 0, 0.045, 0, 0, wood)
  const bays = Math.max(1, Math.round(o.w / 1.8))
  for (let b = 1; b < bays; b++) {
    const bx = -o.w / 2 + (o.w * b) / bays
    appendBox(s, 0.055, o.h - 0.14, depth, bx, o.h / 2, 0.02, 0, wood)
  }

  // 逐层摆书：竖书为主，穿插横躺书与留空——真实书架的疏密
  for (let r = 0; r < rows; r++) {
    const shelfY = 0.09 + r * rowH                       // 层板顶面高度
    const bookTop = Math.min(o.h - 0.1, shelfY + rowH - 0.06)
    appendBox(s, o.w - 0.02, 0.045, depth + 0.05, 0, shelfY, 0.01, 0, wood)   // 层板
    let x = -o.w / 2 + 0.09
    const xEnd = o.w / 2 - 0.09
    while (x < xEnd - 0.06) {
      const t = rand()
      if (t < 0.055) { x += 0.09 + rand() * 0.16; continue }                    // 留空位
      if (t < 0.13) {                                                            // 横躺一摞（1–3 本叠放）
        const n = 1 + Math.floor(rand() * 3)
        let sy = shelfY + 0.0225
        for (let k = 0; k < n && sy < bookTop; k++) {
          const lw = 0.24 + rand() * 0.1
          if (x + lw > xEnd) break
          appendBox(s, lw, 0.05 + rand() * 0.018, depth * 0.82, x + lw / 2, sy + 0.025, -0.01, 0, pickColor())
          x += lw + 0.012
          sy += 0.062
        }
        x += 0.02
        continue
      }
      const bw = 0.085 + rand() * 0.06                                            // 竖书
      if (x + bw > xEnd) break
      const bh = (bookTop - shelfY) * (0.66 + rand() * 0.3)
      appendBox(s, bw, bh, depth * (0.82 + rand() * 0.18), x + bw / 2, shelfY + 0.0225 + bh / 2, 0, 0, pickColor())
      if (rand() < 0.045 && bh > rowH * 0.5) {                                    // 书顶斜倚一小册
        appendBox(s, bw * 0.8, 0.04, depth * 0.6, x + bw / 2, shelfY + 0.0225 + bh + 0.02, 0.03, 0.16, pickColor())
      }
      x += bw + 0.006 + rand() * 0.012
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(s.nor, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(s.col, 3))
  geo.setIndex(s.idx)
  const m = mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.04 }))
  m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  return m
}

/** 六棱石灯（自建积木 · glm-5.3）：巴别图书馆的场地灯，六边形母题的室外延伸。
 *  形制：六棱基座 — 六棱柱身 — 六棱承台 — 六棱灯室（六面发光窗）— 六坡攒尖 — 铜宝珠。 */
export function hexLantern(o: { x?: number; z?: number; scale?: number; glow?: string } = {}): THREE.Object3D {
  const s = o.scale ?? 1
  const stone = stdMaterial('#8A8478', { roughness: 0.9 })
  const stoneDark = stdMaterial('#6E6A5E', { roughness: 0.9 })
  const grp = new THREE.Group()
  const base = mesh(new THREE.CylinderGeometry(0.4, 0.48, 0.24, 6), stoneDark)
  base.position.y = 0.12; grp.add(base)
  const shaft = mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.78, 6), stone)
  shaft.position.y = 0.24 + 0.39; grp.add(shaft)
  const collar = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 6), stoneDark)
  collar.position.y = 0.56; grp.add(collar)
  const slab = mesh(new THREE.CylinderGeometry(0.46, 0.38, 0.13, 6), stone)
  slab.position.y = 1.02 + 0.065; grp.add(slab)
  const house = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 6), stdMaterial('#E8E0CC', { roughness: 0.7 }))
  house.position.y = 1.15 + 0.21; grp.add(house)
  const glow = mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.22, 6), stdMaterial(o.glow ?? '#FFE9A8', { emissive: o.glow ?? '#FFE9A8', emissiveIntensity: 1.6 }))
  glow.position.y = 1.15 + 0.21; grp.add(glow)
  const cap = mesh(new THREE.CylinderGeometry(0.03, 0.36, 0.26, 6), stoneDark)
  cap.position.y = 1.57 + 0.13; grp.add(cap)
  const pearl = mesh(new THREE.SphereGeometry(0.075, 12, 8), stdMaterial('#C9A227', { metalness: 0.5, roughness: 0.35, emissive: '#6B5E2E', emissiveIntensity: 0.25 }))
  pearl.position.y = 1.83 + 0.075; grp.add(pearl)
  grp.scale.set(s, s, s)
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true   // 景观件：R13 退线豁免
  return grp
}
