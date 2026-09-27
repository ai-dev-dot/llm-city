import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'
import { mulberry32 } from '../../../../lib/ctx'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  o.userData.site = true
  return o
}

/**
 * 高细节庭园树（豆包私人积木）：主干 + 分枝 + 5 颗 detail2 叶球。
 * 纯参数化；形态由 seed 经 mulberry32 确定性产生。整体景观件（R13 豁免）。
 * blossom：花树模式——2 颗冠球换为花色（春樱/花树意象）。
 * 复用：灯花中庭（五期）。
 */
export function gardenTree(o: {
  x?: number
  z?: number
  scale?: number
  seed?: number
  leaf?: string
  blossom?: string
}): THREE.Object3D {
  const g = new THREE.Group()
  const rng = mulberry32(o.seed ?? 11)
  // 冠色刻意比草皮(#8C9E78)深艳——绿树落在绿草上才不糊成色块
  const leafCol = o.leaf ?? ['#5E9448', '#548A42', '#6FA856'][Math.floor(rng() * 3)]
  // 叶材 flatShading：低分段 Sphere 呈棱面（faceted）树冠
  const leafMat = stdMaterial(o.blossom ?? leafCol, { roughness: 0.9 })
  leafMat.flatShading = true

  // 主干（12 段）+ 2 短分枝（藏冠）+ 1 根极短内枝（没入冠球、纯补面数）
  const trunk = mesh(new THREE.CylinderGeometry(0.18, 0.3, 2.4, 12), stdMaterial('#6B4A2F', { roughness: 0.92 }))
  trunk.position.y = 1.2; g.add(trunk)
  for (let i = 0; i < 2; i++) {
    const a = rng() * Math.PI * 2
    const branch = mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.9, 10), stdMaterial('#6B4A2F', { roughness: 0.92 }))
    branch.position.set(Math.cos(a) * 0.3, 2.75, Math.sin(a) * 0.3)
    branch.rotation.x = 0.45 * Math.sin(a)
    branch.rotation.z = -0.45 * Math.cos(a)
    g.add(branch)
  }
  const twig = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 10), stdMaterial('#6B4A2F', { roughness: 0.92 }))
  twig.position.y = 3.05; g.add(twig)
  // 7 颗叶球（索引 SphereGeometry，规避 shot 软件渲染对非索引几何的退化 bug）：
  // 一颗大主球（高分段 13×10）+ 6 颗环绕副球（10×8），flatShading 棱面成团
  const balls: Array<[number, number, number, number]> = [
    [0, 3.7, 0, 1.45], [0.72, 3.35, 0.28, 0.85], [-0.72, 3.4, -0.28, 0.85],
    [0.28, 4.45, -0.18, 0.78], [-0.26, 4.25, 0.58, 0.76],
    [0.6, 3.95, 0.7, 0.68], [-0.64, 4.0, 0.66, 0.68],
  ]
  balls.forEach(([x, y, z, r], i) => {
    const [ws, hs] = i === 0 ? [15, 12] : [11, 9]
    const leaf = mesh(new THREE.SphereGeometry(r, ws, hs), leafMat)
    leaf.position.set(x + (rng() - 0.5) * 0.15, y, z); g.add(leaf)
  })
  const s = o.scale ?? 1
  g.scale.set(s, s, s)
  g.position.set(o.x ?? 0, 0, o.z ?? 0)
  g.userData.site = true
  return g
}
