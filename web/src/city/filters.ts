import * as THREE from 'three'
import type { BuildingRecord } from '../generated/city-data'

export type FilterMode = 'off' | 'model' | 'vendor'

export function modelFilterColor(modelId: string, allModelIds: string[]): string {
  const sorted = [...allModelIds].sort()
  const i = sorted.indexOf(modelId)
  const hue = ((i < 0 ? 0 : i) * 137.508) % 360
  const c = new THREE.Color().setHSL(hue / 360, 0.65, 0.52)
  return `#${c.getHexString()}`
}

export function vendorShade(vendorColor: string, modelIndex: number): string {
  const c = new THREE.Color(vendorColor)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.min(0.72, Math.max(0.3, 0.45 + modelIndex * 0.12)))
  return `#${c.getHexString()}`
}

interface Saved { color: number; emissive: number; emissiveIntensity: number }
const EDGE_KEY = '__filterEdge'

export class FilterSystem {
  mode: FilterMode = 'off'
  private saved = new WeakMap<THREE.Mesh, Saved>()
  private allModelIds: string[] = []

  constructor(private buildings: BuildingRecord[]) {}

  setMode(mode: FilterMode, buildings: BuildingRecord[], roots: Iterable<{ id: string; root: THREE.Object3D }>) {
    // 先全面恢复
    for (const { root } of roots) this.restore(root)
    this.mode = mode
    if (mode === 'off') return
    this.allModelIds = [...new Set(buildings.map((b) => b.modelId))]
    for (const { id, root } of roots) {
      const b = buildings.find((x) => x.id === id)
      if (b) this.applyTo(root, b)
    }
  }

  colorFor(b: BuildingRecord): string | null {
    if (this.mode === 'model') return modelFilterColor(b.modelId, this.allModelIds)
    if (this.mode === 'vendor' && b.vendor) return vendorShade(b.vendor.color, this.vendorModelIndex(b))
    return null
  }

  /** 同厂商模型按全城 modelId 排序取序号（色阶深浅区分） */
  private vendorModelIndex(b: BuildingRecord): number {
    const same = [...new Set(this.buildings.filter((x) => x.vendor?.id === b.vendor!.id).map((x) => x.modelId))].sort()
    return Math.max(0, same.indexOf(b.modelId))
  }

  applyTo(root: THREE.Object3D, b: BuildingRecord) {
    const color = this.colorFor(b)
    if (!color) return
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mat = m.material as THREE.MeshStandardMaterial
      if (!mat || Array.isArray(mat)) return
      if (!this.saved.has(m)) this.saved.set(m, { color: mat.color.getHex(), emissive: mat.emissive.getHex(), emissiveIntensity: mat.emissiveIntensity })
      mat.color.set(color)
      mat.emissive.set(color)
      mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 0.25)
      if (!(m as any)[EDGE_KEY]) {
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }))
        edge.userData.isFilterEdge = true
        m.add(edge)
        ;(m as any)[EDGE_KEY] = true
      }
    })
  }

  restore(root: THREE.Object3D) {
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const s = this.saved.get(m)
      const mat = m.material as THREE.MeshStandardMaterial
      if (s && mat && !Array.isArray(mat)) { mat.color.setHex(s.color); mat.emissive.setHex(s.emissive); mat.emissiveIntensity = s.emissiveIntensity }
      if ((m as any)[EDGE_KEY]) {
        for (const ch of [...m.children]) if (ch.userData?.isFilterEdge) { (ch as THREE.LineSegments).geometry?.dispose(); ((ch as THREE.LineSegments).material as THREE.Material)?.dispose(); m.remove(ch) }
        ;(m as any)[EDGE_KEY] = false
      }
    })
  }
}
