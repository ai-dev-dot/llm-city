import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'
import { mulberry32 } from '../../../../lib/ctx'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material, site = false) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  if (site) o.userData.site = true
  return o
}

/**
 * 木格栅廊架（豆包私人积木）：矩形平面，柱列承顶、顶部密格栅梁，可选爬藤垂绿。
 * 纯参数化；爬藤位置由 seed 经 mulberry32 确定性产生。整体为景观件（R13 豁免）。
 * 复用：湖院风廊（二期）、邻里市集（三期）。
 */
export function pergola(o: {
  w: number
  d: number
  h?: number
  bay?: number
  seed?: number
  vines?: boolean
  color?: string
}): THREE.Object3D {
  const grp = new THREE.Group()
  const h = o.h ?? 3.4
  const bay = o.bay ?? 3
  const woodMat = stdMaterial(o.color ?? '#9A6E4A', { roughness: 0.85 })
  const postMat = stdMaterial('#7C5838', { roughness: 0.85 })

  // 角柱 + 跨中柱
  const nx = Math.max(1, Math.round(o.w / bay))
  const nz = Math.max(1, Math.round(o.d / bay))
  for (let i = 0; i <= nx; i++) {
    for (let j = 0; j <= nz; j++) {
      const post = mesh(new THREE.BoxGeometry(0.16, h, 0.16), postMat)
      post.position.set(-o.w / 2 + (o.w * i) / nx, h / 2, -o.d / 2 + (o.d * j) / nz)
      grp.add(post)
    }
  }
  // 周边主梁
  const beam1 = mesh(new THREE.BoxGeometry(o.w + 0.2, 0.18, 0.18), woodMat)
  beam1.position.set(0, h - 0.09, o.d / 2); grp.add(beam1)
  const beam2 = mesh(new THREE.BoxGeometry(o.w + 0.2, 0.18, 0.18), woodMat)
  beam2.position.set(0, h - 0.09, -o.d / 2); grp.add(beam2)
  const beam3 = mesh(new THREE.BoxGeometry(0.18, 0.18, o.d + 0.2), woodMat)
  beam3.position.set(o.w / 2, h - 0.09, 0); grp.add(beam3)
  const beam4 = mesh(new THREE.BoxGeometry(0.18, 0.18, o.d + 0.2), woodMat)
  beam4.position.set(-o.w / 2, h - 0.09, 0); grp.add(beam4)
  // 密格栅条（沿 X 方向，跨南北）
  const slats = Math.max(4, Math.round(o.d / 0.28))
  for (let j = 0; j <= slats; j++) {
    const slat = mesh(new THREE.BoxGeometry(o.w + 0.1, 0.07, 0.09), woodMat)
    slat.position.set(0, h - 0.02, -o.d / 2 + (o.d * j) / slats)
    grp.add(slat)
  }

  // 爬藤：叶球趴于格栅，少量垂挂
  if (o.vines ?? true) {
    const rng = mulberry32(o.seed ?? 3)
    const leafMat = stdMaterial('#5F7A48', { roughness: 0.95 })
    const vineMat = stdMaterial('#4E6A3C', { roughness: 0.95 })
    const count = Math.round(o.w * o.d / 2.2)
    for (let k = 0; k < count; k++) {
      const vx = (rng() - 0.5) * (o.w - 0.6)
      const vz = (rng() - 0.5) * (o.d - 0.6)
      const leaf = mesh(new THREE.IcosahedronGeometry(0.32 + rng() * 0.18, 0), leafMat, true)
      leaf.position.set(vx, h - 0.18, vz)
      grp.add(leaf)
      if (rng() < 0.3) {
        const hang = mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.7, 5), vineMat, true)
        hang.position.set(vx, h - 0.5, vz)
        grp.add(hang)
      }
    }
  }

  grp.userData.site = true
  return grp
}
