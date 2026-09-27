import * as THREE from 'three'

/** 合并几何工具箱（deepseek-v4.1-flash 自建积木）。
 *
 *  用途：把成百上千个密构件（座椅 / 齿饰 / 铺装 / 吊杆 / 音管）合并进单个 BufferGeometry。
 *  R11 的面数下限要花在**可感知的细节**上，而 mesh 数量本身不是目的——一批细部一次成型，
 *  烘焙端（web/src/city/bake.ts）也少一层合并开销。
 *
 *  约定：纯函数、无副作用、无随机（需要随机性时由调用方把 ctx.rng() 的结果作为参数传入）。 */

/** 我的剧院色板（在官方 PALETTE 之外补齐剧场专用的石材/金属/暖光档位；同建筑内材质共享） */
export const COLORS = {
  /** 暖白石材（主立面、拱肋柱廊） */
  stone: '#E8E6E1',
  /** 浅灰石材（勒脚、线脚、台基压顶） */
  stoneDim: '#C4C1BA',
  /** 中灰石材（缝线、雨篷底、设备基座） */
  stoneDeep: '#A8A5A0',
  /** 深青铜金属（檐口、门扇、窗框、吊杆） */
  bronze: '#7C7A76',
  /** 深色金属（舞台塔背板、设备） */
  dark: '#3E3C3A',
  /** 暖木（座椅、观众厅内墙、舞台台面） */
  wood: '#B0885E',
  /** 观众厅布面（座椅靠背、包厢帷幕） */
  velvet: '#4A5568',
  /** 官方 11 号天青玻璃（门厅幕墙） */
  glass: '#9EC5DD',
  /** 门厅内透暖光（发光面，夜间即灯） */
  glow: '#F2E9D8',
  /** 舞台工作灯（冷白） */
  workLight: '#E8E6E1',
} as const

export interface BoxSpec {
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  /** 绕 Y 轴旋转（弧度），默认 0 */
  ry?: number
}

/** 单位立方体的 6 个面：外法线 + 4 个角（从外侧看逆时针，故 (0,1,2)/(0,2,3) 三角正面朝外） */
const FACES: ReadonlyArray<{ n: readonly [number, number, number]; c: ReadonlyArray<readonly [number, number, number]> }> = [
  { n: [0, 0, 1], c: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { n: [0, 0, -1], c: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
  { n: [1, 0, 0], c: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
  { n: [-1, 0, 0], c: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  { n: [0, 1, 0], c: [[1, 1, -1], [-1, 1, -1], [-1, 1, 1], [1, 1, 1]] },
  { n: [0, -1, 0], c: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
]

/** 一批轴对齐（可选绕 Y 旋转）长方体 → 单个 Mesh（每块 12 三角） */
export function boxBatch(specs: readonly BoxSpec[], material: THREE.Material): THREE.Mesh {
  const pos: number[] = []
  const nor: number[] = []
  for (const s of specs) {
    const hw = s.w / 2, hh = s.h / 2, hd = s.d / 2
    const ry = s.ry ?? 0
    const cos = Math.cos(ry), sin = Math.sin(ry)
    // 局部 (±1,±1,±1) → 缩放 → 绕 Y 旋转 → 平移
    const put = (v: readonly [number, number, number], n: readonly [number, number, number]): void => {
      const lx = v[0] * hw, ly = v[1] * hh, lz = v[2] * hd
      pos.push(s.x + lx * cos + lz * sin, s.y + ly, s.z - lx * sin + lz * cos)
      nor.push(n[0] * cos + n[2] * sin, n[1], -n[0] * sin + n[2] * cos)
    }
    for (const f of FACES) {
      const [a, b, c, d] = f.c
      put(a, f.n); put(b, f.n); put(c, f.n)
      put(a, f.n); put(c, f.n); put(d, f.n)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  const mesh = new THREE.Mesh(g, material)
  mesh.matrixAutoUpdate = false
  return mesh
}

export interface CylSpec {
  x: number
  y: number
  z: number
  r: number
  h: number
  /** 径向分段，默认 10 */
  seg?: number
  /** 顶部半径（锥形，如排水管收口）；默认与 r 相同 */
  rTop?: number
}

/** 一批竖立圆柱（含上下盖）→ 单个 Mesh。用于柱列、音管、旗杆、水柱 */
export function cylBatch(specs: readonly CylSpec[], material: THREE.Material): THREE.Mesh {
  const pos: number[] = []
  const nor: number[] = []
  const tri = (
    a: readonly [number, number, number], b: readonly [number, number, number], c: readonly [number, number, number],
    na: readonly [number, number, number], nb: readonly [number, number, number], nc: readonly [number, number, number],
  ): void => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2])
    nor.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2])
  }
  for (const s of specs) {
    const seg = s.seg ?? 10
    const rTop = s.rTop ?? s.r
    const y0 = s.y, y1 = s.y + s.h
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1)
      const p0b: [number, number, number] = [s.x + c0 * s.r, y0, s.z + s0 * s.r]
      const p1b: [number, number, number] = [s.x + c1 * s.r, y0, s.z + s1 * s.r]
      const p0t: [number, number, number] = [s.x + c0 * rTop, y1, s.z + s0 * rTop]
      const p1t: [number, number, number] = [s.x + c1 * rTop, y1, s.z + s1 * rTop]
      // 侧面（法线取两点中点方向，锥面略斜但视觉足够）
      const nm: [number, number, number] = [(c0 + c1) / 2, 0, (s0 + s1) / 2]
      tri(p0b, p1b, p1t, nm, nm, nm)
      tri(p0b, p1t, p0t, nm, nm, nm)
      // 顶盖 / 底盖
      tri(p0t, p1t, [s.x, y1, s.z], [0, 1, 0], [0, 1, 0], [0, 1, 0])
      tri(p1b, p0b, [s.x, y0, s.z], [0, -1, 0], [0, -1, 0], [0, -1, 0])
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  const mesh = new THREE.Mesh(g, material)
  mesh.matrixAutoUpdate = false
  return mesh
}

/** 弧壳截面（拱形薄壳的挤出剖面）：弦宽 w、矢高 rise、厚 t、正弦分 n 段。
 *  与 ExtrudeGeometry 配合沿 +Z 挤出＝筒壳屋面（前端面在 z，向 +Z 长 depth）。 */
export function vaultProfile(w: number, rise: number, t: number, n = 24): THREE.Shape {
  const sh = new THREE.Shape()
  for (let i = 0; i <= n; i++) {
    const x = -w / 2 + (w * i) / n
    const y = rise * Math.sin((Math.PI * i) / n)
    if (i === 0) sh.moveTo(x, y)
    else sh.lineTo(x, y)
  }
  for (let i = n; i >= 0; i--) {
    const x = -w / 2 + (w * i) / n
    const y = rise * Math.sin((Math.PI * i) / n) - t
    sh.lineTo(x, y)
  }
  sh.closePath()
  return sh
}

/** 拱形薄壳构件：把 vaultProfile 挤出成筒壳（屋面/雨篷/连廊顶） */
export function vaultShell(o: {
  w: number
  rise: number
  t?: number
  depth: number
  x?: number
  y?: number
  z?: number
  n?: number
  material: THREE.Material
}): THREE.Mesh {
  const sh = vaultProfile(o.w, o.rise, o.t ?? 0.4, o.n ?? 24)
  const g = new THREE.ExtrudeGeometry(sh, { depth: o.depth, bevelEnabled: false, steps: 1 })
  const m = new THREE.Mesh(g, o.material)
  m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  m.matrixAutoUpdate = false
  m.updateMatrix()
  return m
}
