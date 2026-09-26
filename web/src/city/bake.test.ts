import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { bakeBuild } from './bake'

/** 造 n 个同材质小盒，各自独立 geometry（agent 代码的真实形态） */
function manyBoxes(n: number, color = '#A00000'): THREE.Object3D {
  const root = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color })
  for (let i = 0; i < n; i++) {
    const g = new THREE.BoxGeometry(1, 1, 1)
    g.translate(i * 2, 0, 0)
    const m = new THREE.Mesh(g, i % 2 ? mat : mat.clone())   // 一半共享一半重复实例，规约键应归并
    m.castShadow = true
    root.add(m)
  }
  return root
}

describe('bakeBuild 静态烘焙', () => {
  it('同规约材质的独立 mesh 合并为一个 draw 对象', () => {
    const { root, stats } = bakeBuild(manyBoxes(50))
    expect(stats.merged).toBe(true)
    expect(stats.meshesBefore).toBe(50)
    expect(stats.meshesAfter).toBeLessThanOrEqual(2)   // 同键材质归一后应并成 1
    let meshes = 0
    root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++ })
    expect(meshes).toBe(stats.meshesAfter)
  })

  it('烘入世界变换：合并几何包围盒与原场景一致', () => {
    const src = manyBoxes(30)
    src.updateMatrixWorld(true)
    const srcBox = new THREE.Box3().setFromObject(src)
    const { root } = bakeBuild(src)
    root.updateMatrixWorld(true)
    const dstBox = new THREE.Box3().setFromObject(root)
    expect(dstBox.min.x).toBeCloseTo(srcBox.min.x, 4)
    expect(dstBox.max.x).toBeCloseTo(srcBox.max.x, 4)
  })

  it('少 mesh 建筑不合并（免无谓拷贝）', () => {
    const src = manyBoxes(3)
    const { root, stats } = bakeBuild(src)
    expect(stats.merged).toBe(false)
    expect(stats.meshesAfter).toBe(3)
    expect(root).toBe(src)   // 原对象原样返回
  })

  it('Sprite 等非网格对象保留', () => {
    const root = manyBoxes(20)
    const sp = new THREE.Sprite(new THREE.SpriteMaterial())
    sp.position.set(5, 3, 0)
    root.add(sp)
    const { root: baked } = bakeBuild(root)
    const sprites: THREE.Object3D[] = []
    baked.traverse((o) => { if ((o as THREE.Sprite).isSprite) sprites.push(o) })
    expect(sprites).toHaveLength(1)
    expect(sprites[0].position.x).toBeCloseTo(5, 4)
    expect(sprites[0].position.y).toBeCloseTo(3, 4)
  })

  it('多材质 groups 网格按组切片归并，不丢材质', () => {
    const root = new THREE.Group()
    const matA = new THREE.MeshStandardMaterial({ color: '#111111' })
    const matB = new THREE.MeshStandardMaterial({ color: '#222222' })
    // 10 个双材质盒（每盒 2 组），加一批同材质填充触发合并阈值
    for (let i = 0; i < 10; i++) {
      const g = new THREE.BoxGeometry(1, 1, 1)
      g.translate(i * 2, 5, 0)
      const m = new THREE.Mesh(g, [matA.clone(), matB.clone()])
      root.add(m)
    }
    for (let i = 0; i < 20; i++) {
      const g = new THREE.BoxGeometry(1, 1, 1)
      g.translate(i * 2, -5, 0)
      root.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#333333' })))
    }
    const { stats, root: baked } = bakeBuild(root)
    expect(stats.merged).toBe(true)
    const colors = new Set<string>()
    baked.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mm of mats) colors.add((mm as THREE.MeshStandardMaterial).color.getHexString())
    })
    expect(colors).toEqual(new Set(['111111', '222222', '333333']))
  })

  it('不可见 mesh 不参与合并也不丢失', () => {
    const root = manyBoxes(20)
    const hidden = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#444444' }))
    hidden.visible = false
    root.add(hidden)
    const { stats, root: baked } = bakeBuild(root)
    expect(stats.merged).toBe(true)
    let hiddenFound = false
    baked.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible === false) hiddenFound = true })
    expect(hiddenFound).toBe(true)
  })
})
