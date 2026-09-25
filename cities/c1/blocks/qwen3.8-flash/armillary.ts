import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

const BRASS = '#C9A227'
const IRON = '#5B5956'

/** 浑仪天文雕塑：圆形台基 + 四斜撑 + 地平环/子午环/黄道环/极环嵌套 + 自发光中心球。
 *  参数化纯函数，无随机；rotY 为方位角（调用方以确定性 rng 传入）。
 *  返回对象 userData.site = true（景观件，参与 R13 退线豁免）。 */
export function armillary(o: { x?: number; z?: number; y?: number; scale?: number; rotY?: number }): THREE.Object3D {
  const grp = new THREE.Group()
  const brass = stdMaterial(BRASS, { metalness: 0.75, roughness: 0.35 })
  const iron = stdMaterial(IRON, { metalness: 0.6, roughness: 0.5 })
  const stone = stdMaterial('#A8A5A0', { roughness: 0.85 })
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = true
    m.position.set(x, y, z)
    grp.add(m)
    return m
  }

  add(new THREE.CylinderGeometry(0.62, 0.78, 0.34, 28), stone, 0, 0.17)
  add(new THREE.CylinderGeometry(0.46, 0.58, 0.2, 24), stdMaterial('#C4C1BA', { roughness: 0.85 }), 0, 0.44)

  const hubY = 1.85
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + Math.PI / 4
    const leg = add(new THREE.BoxGeometry(0.12, 1.1, 0.12), iron, Math.cos(a) * 0.36, 0.9, Math.sin(a) * 0.36)
    leg.rotation.z = Math.cos(a) * 0.3
    leg.rotation.x = -Math.sin(a) * 0.3
  }

  const horizon = add(new THREE.TorusGeometry(1.55, 0.08, 12, 110), brass, 0, hubY)
  horizon.rotation.x = Math.PI / 2
  add(new THREE.TorusGeometry(1.34, 0.07, 12, 96), brass, 0, hubY)
  const meridian2 = add(new THREE.TorusGeometry(1.28, 0.06, 10, 88), iron, 0, hubY)
  meridian2.rotation.y = Math.PI / 2
  const ecliptic = add(new THREE.TorusGeometry(1.05, 0.06, 10, 84), brass, 0, hubY)
  ecliptic.rotation.x = Math.PI / 2 + 0.41
  const polar = add(new THREE.TorusGeometry(0.62, 0.05, 8, 52), brass, 0, hubY + 0.86)
  polar.rotation.x = Math.PI / 2

  const axis = add(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 10), iron, 0, hubY)
  axis.rotation.z = 0.41
  add(
    new THREE.SphereGeometry(0.19, 18, 12),
    stdMaterial('#FFD97A', { emissive: '#F5B94A', emissiveIntensity: 1.4, roughness: 0.4 }),
    0,
    hubY,
  )

  const s = o.scale ?? 1
  grp.scale.set(s, s, s)
  grp.rotation.y = o.rotY ?? 0
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  grp.userData.site = true
  return grp
}
