import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'
import { mergeBoxMesh, type BoxPart } from './geo'

/** 拼花铺装：错缝方砖阵列合并单 mesh（薄板：厚 ≤0.5、顶 ≤3m，R13 豁免）。
 * cell 砖尺寸、gap 砖缝；pattern 可给两种色做跳色。 */
export function paving(o: {
  w: number; d: number; y?: number
  x?: number; z?: number
  cell?: number; gap?: number
  colorA?: string; colorB?: string
  /** 跳色频率（每 N 块插一色），0 = 纯色 */
  accent?: number
  /** 中央嵌条（十字/条带）色，null = 不做 */
  inset?: string | null
}): THREE.Object3D {
  const cell = o.cell ?? 1.0
  const gap = o.gap ?? 0.06
  const th = 0.14
  const cols = Math.max(1, Math.round(o.w / cell))
  const rows = Math.max(1, Math.round(o.d / cell))
  const cx = o.w / cols
  const cz = o.d / rows
  const a: BoxPart[] = []
  const b: BoxPart[] = []
  const accent = o.accent ?? 4
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const part: BoxPart = {
        w: cx - gap, h: th, d: cz - gap,
        x: -o.w / 2 + cx * (i + 0.5), y: th / 2, z: -o.d / 2 + cz * (j + 0.5),
      }
      const useB = accent > 0 && (i + j) % accent === 0
      ;(useB ? b : a).push(part)
    }
  }
  const grp = new THREE.Group()
  grp.add(mergeBoxMesh(a, stdMaterial(o.colorA ?? '#C4C1BA', { roughness: 0.85 })))
  if (b.length) grp.add(mergeBoxMesh(b, stdMaterial(o.colorB ?? '#A8A5A0', { roughness: 0.85 })))
  if (o.inset) {
    const ins: BoxPart[] = [
      { w: o.w, h: th + 0.03, d: 0.3, x: 0, y: th / 2, z: 0 },
      { w: 0.3, h: th + 0.03, d: o.d, x: 0, y: th / 2, z: 0 },
    ]
    grp.add(mergeBoxMesh(ins, stdMaterial(o.inset, { roughness: 0.7 })))
  }
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  return grp
}

/** 草皮基底（薄板，顶 ≤0.6m 属 R13 地被豁免）：满铺至宗地边缘 */
export function turf(o: { w: number; d: number; y?: number; color?: string }): THREE.Object3D {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(o.w, 0.3, o.d),
    stdMaterial(o.color ?? '#8C9E8B', { roughness: 0.95 }),
  )
  m.position.y = (o.y ?? 0) + 0.15
  m.receiveShadow = true
  return m
}
