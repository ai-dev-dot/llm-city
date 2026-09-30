import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * 愈光楼母题件 · 水平遮阳鳍带
 *
 * 沿局部 X 展开的一组弧形鳍片，鳍尖朝局部 +Z（`rotY` 转到任一面）。
 * 医疗建筑的遮阳不是装饰，是处方的一部分：水平鳍片把东晒、西晒挡在玻璃之外，
 * 让病房均匀地只拿到「被筛过的光」。故本件取「浅弧薄鳍 + 通长无分格」的形制。
 *
 * 纯参数化、无随机、无副作用；同规格鳍片的几何在调用方复用（本件每次生成一份）。
 */
export function louver(o: {
  /** 鳍带长度（沿展开方向，m） */
  w: number
  /** 鳍带底标高（m） */
  y: number
  x?: number
  z?: number
  rotY?: number
  /** 鳍片数 */
  fins?: number
  /** 鳍片竖向间距（m） */
  gap?: number
  /** 鳍片出挑深度（m） */
  reach?: number
  /** 鳍片厚度 */
  fin?: number
  color?: string
  /** 鳍尖圆弧分段 */
  seg?: number
}): THREE.Object3D {
  const grp = new THREE.Group()
  const fins = o.fins ?? 5
  const gap = o.gap ?? 0.62
  const reach = o.reach ?? 0.85
  const fin = o.fin ?? 0.16
  const seg = o.seg ?? 6
  const mat = stdMaterial(o.color ?? '#F1F4F2', { roughness: 0.6, metalness: 0.14 })

  // 鳍片剖面：根部厚、尖端收成圆弧的一枚「叶片」，外缘略带上扬。
  // 剖面朝 -x 生长，挤出方向 +z；整体转 ±90° 后即得「沿局部 X 展开、鳍尖朝局部 +Z」。
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(-reach * 0.7, 0)
  shape.absarc(-reach * 0.7, fin / 2, fin / 2, -Math.PI / 2, Math.PI / 2, true)
  shape.lineTo(-reach * 0.9, fin * 1.5)
  shape.lineTo(0, fin * 1.8)
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: o.w,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
    curveSegments: seg,
    steps: 1,
  })
  for (let i = 0; i < fins; i++) {
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = true
    m.receiveShadow = true
    m.rotation.y = Math.PI / 2 // 挤出方向 +Z → +X：鳍片沿展开方向延伸
    m.position.set(0, i * gap, 0)
    grp.add(m)
  }
  grp.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0)
  grp.rotation.y = o.rotY ?? 0
  return grp
}
