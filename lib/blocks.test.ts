import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { blocks, PALETTE, stdMaterial } from './blocks'

describe('官方积木库（spec §6.4 十三件）', () => {
  it('十三件齐全且返回 Object3D', () => {
    const names = ['boxFloor', 'wall', 'windowStrip', 'pitchedRoof', 'flatRoofTop', 'column', 'towerCrane', 'streetLamp', 'tree', 'neonSign', 'plinth', 'hedge', 'bench'] as const
    const samples: Array<() => THREE.Object3D> = [
      () => blocks.boxFloor({ w: 16, d: 16, h: 3 }),
      () => blocks.wall({ w: 10, h: 3 }),
      () => blocks.windowStrip({ w: 10, h: 1.2 }),
      () => blocks.pitchedRoof({ w: 12, d: 12, h: 4 }),
      () => blocks.flatRoofTop({ w: 12, d: 12 }),
      () => blocks.column({ r: 0.4, h: 6 }),
      () => blocks.towerCrane({ h: 40 }),
      () => blocks.streetLamp({}),
      () => blocks.tree({}),
      () => blocks.neonSign({ w: 4, h: 1.5, color: '#22D3EE' }),
      () => blocks.plinth({ w: 18, d: 18, h: 0.6 }),
      () => blocks.hedge({ w: 8 }),
      () => blocks.bench({}),
    ]
    for (let i = 0; i < names.length; i++) {
      const obj = samples[i]()
      expect(obj, names[i]).toBeInstanceOf(THREE.Object3D)
      expect(countTris(obj), `${names[i]} 应有几何`).toBeGreaterThan(0)
    }
  })
  it('高表现力五件（增补 2026-09-25）齐全且有几何', () => {
    const objs = [
      blocks.archWall({ w: 4, h: 5, archW: 2.2, archH: 4 }),
      blocks.archPanel({ w: 2, h: 3 }),
      blocks.railing({ w: 8 }),
      blocks.urn({}),
      blocks.latticePanel({ w: 3, h: 2.4 }),
    ]
    for (const o of objs) {
      expect(o).toBeInstanceOf(THREE.Object3D)
      expect(countTris(o)).toBeGreaterThan(0)
    }
  })
  it('同种子 tree 两次构建一致（确定性，锁叶形随机量）', () => {
    const a = blocks.tree({ seed: 7 }), b = blocks.tree({ seed: 7 })
    const leaves = (root: THREE.Object3D) => {
      const out: string[] = []
      root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry?.type === 'IcosahedronGeometry') out.push(`${m.position.x.toFixed(6)},${m.position.y.toFixed(6)},${m.position.z.toFixed(6)},${(m.geometry as THREE.IcosahedronGeometry).parameters.radius}`) })
      return out
    }
    expect(leaves(a).length).toBe(3)
    expect(leaves(a)).toEqual(leaves(b))
  })
  it('stdMaterial 只产参数化材质（无贴图）', () => {
    const m = stdMaterial('#E8E6E1', { metalness: 0.2, roughness: 0.6 })
    expect(m).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(m.map).toBeNull()
    expect([...PALETTE, '#22D3EE']).toContain(m.color.getHexString().toUpperCase() === '22D3EE' ? '#22D3EE' : `#${m.color.getHexString().toUpperCase()}`)
  })
})

function countTris(root: THREE.Object3D): number {
  let n = 0
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.geometry) n += Math.floor((m.geometry.index ? m.geometry.index.count : (m.geometry.attributes.position?.count ?? 0)) / 3)
  })
  return n
}
