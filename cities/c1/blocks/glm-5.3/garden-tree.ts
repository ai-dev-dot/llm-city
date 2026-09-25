import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'
import { mulberry32 } from '../../../../lib/ctx'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

/** 精修庭院树（自建积木 · glm-5.3，2026-09-25 续建第二轮质感深化）：
 *  古典园林的修剪造型树（topiary）——微锥树干 + 三斜枝 + 多层修剪球冠
 *  （主球 + 卫星球 + 顶球，深浅两绿交叠），配六边形母题的六棱石树池。
 *  与官方件同款约定：确定性 mulberry32(seed) 内生随机（seed 固定则形态固定），
 *  纯参数化、无副作用；挂 userData.site 参与 R13 退线豁免。 */
export function gardenTree(o: { x?: number; z?: number; scale?: number; seed?: number; foliage?: string } = {}): THREE.Object3D {
  const rng = mulberry32(o.seed ?? 7)
  const s = o.scale ?? 1
  const grp = new THREE.Group()
  const bark = stdMaterial('#5E4A35', { roughness: 0.95 })
  const barkDark = stdMaterial('#4A3A29', { roughness: 0.95 })
  const leafDark = stdMaterial('#5A6B4F', { roughness: 0.92 })
  const leaf = stdMaterial(o.foliage ?? '#77875E', { roughness: 0.9 })
  const stoneRim = stdMaterial('#A8A294', { roughness: 0.88 })
  const soil = stdMaterial('#4E4237', { roughness: 0.98 })

  // 六棱树池：石圈 + 内填土
  const rim = mesh(new THREE.CylinderGeometry(0.54, 0.6, 0.3, 6), stoneRim)
  rim.position.y = 0.15; grp.add(rim)
  const earth = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 6), soil)
  earth.position.y = 0.3; grp.add(earth)

  // 树干（微锥）+ 三斜枝：枝轴 = Ry(az)·Rz(tilt)·Y，枝梢伸入冠球
  const trunk = mesh(new THREE.CylinderGeometry(0.085, 0.15, 1.55, 8), bark)
  trunk.position.y = 0.3 + 0.775; grp.add(trunk)
  const branchTop: THREE.Vector3[] = []
  for (let i = 0; i < 3; i++) {
    const az = (i / 3) * Math.PI * 2 + rng() * 0.9
    const tilt = 0.45 + rng() * 0.35
    const len = 0.55 + rng() * 0.35
    const br = mesh(new THREE.CylinderGeometry(0.028, 0.052, len, 6), barkDark)
    br.rotation.y = az; br.rotation.z = tilt
    const dir = new THREE.Vector3(-Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az))
    br.position.set(0, 1.85, 0).addScaledVector(dir, len / 2)
    grp.add(br)
    branchTop.push(new THREE.Vector3(0, 1.85, 0).addScaledVector(dir, len * 0.92))
  }

  // 修剪球冠：主球（亮绿）+ 三卫星球（深绿，托在枝梢方向）+ 顶球
  const main = mesh(new THREE.SphereGeometry(0.88 + rng() * 0.22, 14, 10), leaf)
  main.position.y = 2.5; grp.add(main)
  for (let i = 0; i < 3; i++) {
    const sat = mesh(new THREE.SphereGeometry(0.4 + rng() * 0.16, 10, 8), leafDark)
    sat.position.set(branchTop[i].x * 0.72, 2.18 + rng() * 0.12, branchTop[i].z * 0.72)
    grp.add(sat)
  }
  const top = mesh(new THREE.SphereGeometry(0.3 + rng() * 0.1, 10, 8), leaf)
  top.position.y = 3.32; grp.add(top)

  grp.scale.set(s, s, s)
  grp.position.set(o.x ?? 0, 0, o.z ?? 0)
  grp.userData.site = true   // 景观件：R13 退线豁免
  return grp
}
