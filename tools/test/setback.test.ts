import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { computeSetback } from '../src/headless/setback'

/**
 * R13 退线判定的回归网（[city-admin] 2026-09-30 判定抽到 headless/setback.ts 时补）。
 *
 * 为什么必须有：这段判定此前只内嵌在 worker.ts 里，豁免建筑（官方）拿不到数字，各模型在缓存
 * 目录里各抄一份副本自查——清点下来 5 个模型身份 11 份副本，**没有一份带测试**。副本判定一改
 * 就与 inspect 脱节，而它仍然会输出数字，看起来一切正常。这里直接钉住判定本身。
 *
 * 覆盖：核心矩形口径、界内/界外、userData.site 祖先链豁免、地被层/小件/薄板三类尺寸豁免及其
 * 边界、0.05m 容差边界、旋转构件（precise 而非本地 AABB）、世界坐标定位、明细上限、空场景。
 */

const SIZE: [number, number] = [20, 20]   // 单地块 → 核心 16×16，即 x/z ∈ [-8, 8]

/** 轴对齐柱子：外缘 = 中心 ± 半宽。y 为底面高度（默认落地） */
function post(parent: THREE.Object3D, x: number, z: number, w: number, d: number, h: number, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d))
  m.position.set(x, y + h / 2, z)
  parent.add(m)
  return m
}

/** 造一根「外缘正好落在 edgeX」的柱子。w 取 0.25（1/4，二进制可精确表示），
 *  免得 0.1/2 这类除法把边界值推出精确表示范围 */
function postWithEdge(parent: THREE.Object3D, edgeX: number, w = 0.25, h = 8): THREE.Mesh {
  return post(parent, edgeX - w / 2, 0, w, w, h)
}

describe('computeSetback（R13 退线 · 宪法第 14 条）', () => {
  it('核心矩形 = 宗地四边各退 2m（20×20 → 16×16）', () => {
    const r = computeSetback(new THREE.Group(), SIZE)
    expect(r.coreHalfX).toBe(8)
    expect(r.coreHalfZ).toBe(8)
  })

  it('宗地化：按合并后宗地的矩形算，不是按单地块（1×2 = 20×40 → 16×36）', () => {
    const r = computeSetback(new THREE.Group(), [20, 40])
    expect(r.coreHalfX).toBe(8)
    expect(r.coreHalfZ).toBe(18)
  })

  it('界内合规件不记违规（含贴边）', () => {
    const root = new THREE.Group()
    post(root, 0, 0, 4, 4, 8)
    postWithEdge(root, 8)                  // 外缘正好 8.00
    const r = computeSetback(root, SIZE)
    expect(r.violations).toBe(0)
    expect(r.worst).toBe(0)
  })

  it('界外违规件逐个记数，最严重值取 x/z 两轴中较重者', () => {
    const root = new THREE.Group()
    post(root, 9, 0, 2, 2, 8)              // 最外缘 10 → 超出 2m
    post(root, 0, 10, 2, 2, 8)             // 最外缘 11 → 超出 3m
    const r = computeSetback(root, SIZE)
    expect(r.violations).toBe(2)
    expect(r.worst).toBeCloseTo(3, 6)
    expect(r.items.map((i) => i.over).sort((a, b) => a - b)).toEqual([2, 3])
  })

  it('userData.site 景观件豁免——含祖先链标记（组上打标则其下 mesh 全部豁免）', () => {
    const root = new THREE.Group()
    post(root, 9, 9, 2, 2, 8)                                   // 无标记，作对照：外缘 10 → 超出 2m
    const taggedGroup = new THREE.Group()
    taggedGroup.userData.site = true
    root.add(taggedGroup)
    post(taggedGroup, 9, 9, 2, 2, 8)                           // 同样越界，组上打了 site
    const plainGroup = new THREE.Group()
    root.add(plainGroup)
    post(plainGroup, 9, 9, 2, 2, 8).userData.site = true       // mesh 自己打标
    const r = computeSetback(root, SIZE)
    expect(r.violations).toBe(1)                                // 只剩那个没打标的
    expect(r.worst).toBeCloseTo(2, 6)
  })

  it('地被层豁免：顶 ≤0.6m', () => {
    const root = new THREE.Group()
    post(root, 20, 20, 40, 40, 0.5)                            // 顶 0.5，留足余量
    expect(computeSetback(root, SIZE).violations).toBe(0)
  })

  it('地被层的边界：顶 0.7m 起不再豁免（40×40 太大，小件与薄板都兜不住）', () => {
    const root = new THREE.Group()
    post(root, 20, 20, 40, 40, 0.7)
    expect(computeSetback(root, SIZE).violations).toBe(1)
  })

  it('小件豁免：顶 ≤1.5m 且 ≤1.6×1.6', () => {
    const root = new THREE.Group()
    post(root, 20, 20, 1.5, 1.5, 1.4)                          // 留余量：1.6 与 1.5 都是浮点刀刃
    expect(computeSetback(root, SIZE).violations).toBe(0)
  })

  it('小件豁免的边界：1.7m 见方即不再豁免（哪怕很矮）', () => {
    const root = new THREE.Group()
    post(root, 20, 20, 1.7, 1.7, 1.4)
    expect(computeSetback(root, SIZE).violations).toBe(1)
  })

  it('薄板豁免：厚 ≤0.5m 且顶 ≤3m（如台阶）', () => {
    const root = new THREE.Group()
    post(root, 20, 20, 10, 10, 0.5)
    expect(computeSetback(root, SIZE).violations).toBe(0)
  })

  it('薄板豁免的边界：厚 0.6m 即不再豁免（哪怕顶只有 0.6m——但那已被地被层兜住，故取顶 3m）', () => {
    const root = new THREE.Group()
    post(root, 20, 20, 10, 10, 3, 0)          // 厚 3m，不薄
    expect(computeSetback(root, SIZE).violations).toBe(1)
    const slab = new THREE.Group()
    post(slab, 20, 20, 10, 10, 0.4, 2.9)      // 厚 0.4 顶 3.3m：薄但太高
    expect(computeSetback(slab, SIZE).violations).toBe(1)
  })

  // 下面这条例刻意**避开** 0.05 这个刀刃值：判据 `exceed > 0.05` 里的 exceed 是两个浮点数相减，
  // 落在 0.05 上时结果可能是 0.05000000000000071（本仓库首版测试即栽在这上面）。
  // 生产判定同样如此——所以测试值一律取二进制可精确表示的 1/32 步长，边界语义交给人读注释。
  it('0.05m 容差：外缘超出 0 与 0.03125 不记、0.0625 记', () => {
    const inside = new THREE.Group(); postWithEdge(inside, 8);         // 超出 0
    const near = new THREE.Group(); postWithEdge(near, 8.03125);       // 超出 0.03125
    const over = new THREE.Group(); postWithEdge(over, 8.0625);        // 超出 0.0625
    expect(computeSetback(inside, SIZE).violations).toBe(0)
    expect(computeSetback(near, SIZE).violations).toBe(0)
    expect(computeSetback(over, SIZE).violations).toBe(1)
  })

  it('旋转构件按真实投影判定（precise），不按本地 AABB 保守放大', () => {
    // [city-admin] 修复 2026-09-25 的由来：非精确模式把旋转 30° 的六棱柱量出 1.3 倍半径，红灯误判。
    // 六棱柱 circumradius 1，绕 Y 转 30° 后有一对顶点正落在 x 轴上 → 精确最外缘 = 中心 + 1.0。
    // 若有人把 precise 改回 false，本地 AABB 经旋转会被放大到 1.25，此断言即失败。
    const root = new THREE.Group()
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 8, 6))
    hex.position.set(7.6, 4, 0)
    hex.rotation.y = Math.PI / 6
    root.add(hex)
    const r = computeSetback(root, SIZE)
    expect(r.violations).toBe(1)
    expect(r.worst).toBeCloseTo(0.6, 6)
  })

  it('明细给的是世界坐标而非局部坐标（否则拿到手也没法找）', () => {
    const root = new THREE.Group()
    const grp = new THREE.Group()
    grp.position.set(-100, 0, -100)
    root.add(grp)
    post(grp, 9, 0, 2, 2, 8)                  // 局部 (9, 4, 0) → 世界 (-91, 4, -100)
    const r = computeSetback(root, SIZE)
    expect(r.violations).toBe(1)
    expect(r.items[0].position[0]).toBeCloseTo(-91, 6)
    expect(r.items[0].position[1]).toBeCloseTo(4, 6)
    expect(r.items[0].position[2]).toBeCloseTo(-100, 6)
  })

  it('明细受 maxItems 限制，但 violations/worst 始终统计全部', () => {
    const root = new THREE.Group()
    for (let i = 0; i < 12; i++) post(root, 9 + i * 0.5, 0, 0.6, 0.6, 8)
    const r = computeSetback(root, SIZE, 5)
    expect(r.violations).toBe(12)
    expect(r.items).toHaveLength(5)
    expect(r.worst).toBeCloseTo(9 + 11 * 0.5 + 0.3 - 8, 6)
  })

  it('空场景 / 非 mesh / 无顶点几何都不炸', () => {
    const root = new THREE.Group()
    root.add(new THREE.Object3D())
    const empty = new THREE.Mesh()
    empty.geometry = new THREE.BufferGeometry()
    root.add(empty)
    const r = computeSetback(root, SIZE)
    expect(r.violations).toBe(0)
    expect(r.items).toEqual([])
  })
})
