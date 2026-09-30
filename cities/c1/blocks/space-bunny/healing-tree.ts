import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * 愈光楼母题件 · 疗愈树
 *
 * 细干 + 三根主枝 + 多团圆润树冠。圆冠是刻意选的：方盒子城市里唯一柔软的东西，
 * 站在候诊前庭与光井里，先被看见的是「一棵树」，其次才是医院。
 *
 * 随机性一律由调用方以 `rand` 参数注入（积木内不造随机源，保证确定性可复现）。
 */
export function healingTree(o: {
  rand: () => number
  /** 树高（m），自地面起算 */
  h?: number
  x?: number
  y?: number
  z?: number
  /** 冠幅基准半径 */
  crown?: number
  /** 树冠团数 */
  blobs?: number
  /** 树冠细分级（0=20 面，1=80 面，2=320 面） */
  detail?: number
  trunkColor?: string
  leafColor?: string
  /** 冠幅散开系数 */
  spread?: number
  /** 景观件标记（R13 退线豁免） */
  site?: boolean
}): THREE.Object3D {
  const rand = o.rand
  const h = o.h ?? 7
  const crown = o.crown ?? 2.1
  const blobs = o.blobs ?? 6
  const detail = o.detail ?? 1
  const spread = o.spread ?? crown * 0.62
  const grp = new THREE.Group()
  const trunkMat = stdMaterial(o.trunkColor ?? '#8A7A66', { roughness: 0.92 })
  const leafMat = stdMaterial(o.leafColor ?? '#7FA07A', { roughness: 0.95 })

  const trunkH = h * 0.44
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, trunkH, 10), trunkMat)
  trunk.position.y = trunkH / 2
  trunk.castShadow = true
  grp.add(trunk)

  // 根盘：与铺装交接处不做悬空
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.52, 0.22, 12), trunkMat)
  flare.position.y = 0.11
  flare.castShadow = true
  grp.add(flare)

  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rand() * 0.7
    const len = h * (0.17 + rand() * 0.09)
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, len, 8), trunkMat)
    branch.position.set(Math.cos(a) * len * 0.24, trunkH + len * 0.3, Math.sin(a) * len * 0.24)
    branch.rotation.z = -Math.cos(a) * 0.58
    branch.rotation.x = Math.sin(a) * 0.58
    branch.castShadow = true
    grp.add(branch)
  }

  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + rand() * 0.9
    const first = i === 0
    const r = spread * (0.7 + rand() * 0.6)
    const rad = first ? crown : crown * (0.36 + rand() * 0.24)
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(rad, detail), leafMat)
    leaf.position.set(
      Math.cos(a) * (first ? r * 0.25 : r),
      trunkH + h * (first ? 0.32 : 0.16 + rand() * 0.36),
      Math.sin(a) * (first ? r * 0.25 : r),
    )
    leaf.castShadow = true
    leaf.receiveShadow = true
    grp.add(leaf)
  }

  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  if (o.site) grp.userData.site = true
  return grp
}
