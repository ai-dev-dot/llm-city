import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * 愈光楼母题件 · 垂直绿墙
 *
 * 背板 + 错落叶簇。立面绿墙在本城不稀罕，但这里的做法不同：叶片不是贴图，
 * 是一枚枚有厚度的立体叶簇，间距按「远看成面、近看有叶」定——为光井西壁与
 * 东翼西立面提供不透风但透光的界面。随机性由调用方注入 `rand`。
 */
export function greenWall(o: {
  w: number
  h: number
  rand: () => number
  x?: number
  y?: number
  z?: number
  rotY?: number
  /** 叶簇列数 / 行数 */
  cols?: number
  rows?: number
  /** 单枚叶簇半径 */
  leaf?: number
  /** 叶簇细分级（0=20 面，1=80 面） */
  detail?: number
  panelColor?: string
  leafColor?: string
  leafColor2?: string
  /** 出挑厚度 */
  proud?: number
}): THREE.Object3D {
  const grp = new THREE.Group()
  const cols = o.cols ?? 26
  const rows = o.rows ?? 9
  const leaf = o.leaf ?? 0.26
  const detail = o.detail ?? 0
  const proud = o.proud ?? 0.1

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(o.w, o.h, 0.12),
    stdMaterial(o.panelColor ?? '#6E7F5C', { roughness: 0.95 }),
  )
  back.position.y = o.h / 2
  back.receiveShadow = true
  grp.add(back)

  const m1 = stdMaterial(o.leafColor ?? '#6F9166', { roughness: 0.95 })
  const m2 = stdMaterial(o.leafColor2 ?? '#89A87C', { roughness: 0.95 })
  const gw = o.w / cols
  const gh = o.h / rows
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const jx = (o.rand() - 0.5) * gw * 0.7
      const jy = (o.rand() - 0.5) * gh * 0.7
      const s = 0.72 + o.rand() * 0.62
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(leaf * s, detail), o.rand() > 0.62 ? m2 : m1)
      mesh.position.set(
        -o.w / 2 + gw * (c + 0.5) + jx,
        gh * (r + 0.5) + jy,
        proud * (0.5 + o.rand() * 0.9),
      )
      mesh.rotation.set(o.rand() * Math.PI, o.rand() * Math.PI, o.rand() * Math.PI)
      mesh.castShadow = true
      grp.add(mesh)
    }
  }

  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  grp.rotation.y = o.rotY ?? 0
  return grp
}
