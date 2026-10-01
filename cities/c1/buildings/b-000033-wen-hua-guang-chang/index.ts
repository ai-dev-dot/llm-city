import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

export default function build(ctx: BuildCtx): THREE.Object3D {
  const grp = new THREE.Group()
  const { rng } = ctx

  // 材质
  const whiteMetal = stdMaterial('#E8E6E1', { metalness: 0.4, roughness: 0.35 })
  const glassMat = stdMaterial('#9EC5DD', { metalness: 0.5, roughness: 0.15, emissive: '#C4DFF0', emissiveIntensity: 0.25 })
  const concreteMat = stdMaterial('#C4C1BA', { roughness: 0.85 })
  const darkMat = stdMaterial('#3E3C3A', { metalness: 0.3, roughness: 0.6 })
  const grassMat = stdMaterial('#7B8A6F', { roughness: 0.95 })
  const pavingMat = stdMaterial('#A8A5A0', { roughness: 0.9 })

  // 场地（宗地 60×20m，满铺至红线）
  const site = new THREE.Mesh(new THREE.BoxGeometry(60, 0.3, 20), grassMat)
  site.position.y = 0.15
  site.userData.site = true
  grp.add(site)

  // 中央下沉广场（20×10×2m 深，10 级阶梯）
  const pitW = 20
  const pitD = 10
  const pitDepth = 2
  const steps = 10
  const stepW = pitW
  const stepD = pitD / steps
  const stepH = pitDepth / steps

  // 阶梯（从地面向下）
  for (let i = 0; i < steps; i++) {
    const z = -pitD / 2 + (i + 0.5) * stepD
    const y = -i * stepH - stepH / 2
    const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), concreteMat)
    step.position.set(0, y, z)
    step.userData.site = true
    grp.add(step)
  }

  // 下沉广场底部铺装（分块）
  const paveCols = 20
  const paveRows = 10
  const paveW = pitW / paveCols
  const paveD = pitD / paveRows
  for (let i = 0; i < paveCols; i++) {
    for (let j = 0; j < paveRows; j++) {
      const pave = new THREE.Mesh(new THREE.BoxGeometry(paveW - 0.05, 0.1, paveD - 0.05), pavingMat)
      pave.position.set(-pitW / 2 + (i + 0.5) * paveW, -pitDepth - 0.05, -pitD / 2 + (j + 0.5) * paveD)
      pave.userData.site = true
      grp.add(pave)
    }
  }

  // 下沉广场周边栏杆
  const railY = 0
  const railN = 20
  const mkRail = (w: number, x: number, z: number, rotY: number) => {
    const rail = ctx.blocks.railing({ w, h: 1.0, color: '#E8E6E1', x, y: railY, z })
    rail.rotation.y = rotY
    grp.add(rail)
  }
  mkRail(pitW, 0, -pitD / 2 - 0.5, 0)
  mkRail(pitW, 0, pitD / 2 + 0.5, 0)
  mkRail(pitD, -pitW / 2 - 0.5, 0, Math.PI / 2)
  mkRail(pitD, pitW / 2 + 0.5, 0, Math.PI / 2)

  // 临时展棚基座（东侧 12×8×10m，参数化网格骨架）
  const canopyGroup = new THREE.Group()
  const canopyRx = 6   // 长轴半径
  const canopyRz = 4   // 短轴半径
  const canopyH = 10   // 高度
  const canopyBaseY = 0

  // 经线（从拱顶向两侧辐射的椭圆弧线）
  const meridians = 128
  for (let i = 0; i < meridians; i++) {
    const angle = (i / meridians) * Math.PI * 2
    const pts: THREE.Vector3[] = []
    for (let j = 0; j <= 96; j++) {
      const t = (j / 96) * Math.PI / 2
      const x = Math.cos(t) * canopyRx * Math.cos(angle)
      const y = Math.sin(t) * canopyH
      const z = Math.cos(t) * canopyRz * Math.sin(angle)
      pts.push(new THREE.Vector3(x, y, z))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const geo = new THREE.TubeGeometry(curve, 96, 0.08, 8, false)
    const tube = new THREE.Mesh(geo, whiteMetal)
    canopyGroup.add(tube)
  }

  // 纬线（环绕拱形的椭圆环）
  const parallels = 40
  for (let i = 1; i <= parallels; i++) {
    const t = (i / (parallels + 1)) * Math.PI / 2
    const rx = Math.cos(t) * canopyRx
    const rz = Math.cos(t) * canopyRz
    const y = Math.sin(t) * canopyH
    const pts: THREE.Vector3[] = []
    for (let j = 0; j <= 192; j++) {
      const a = (j / 192) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const geo = new THREE.TubeGeometry(curve, 192, 0.06, 8, false)
    const tube = new THREE.Mesh(geo, whiteMetal)
    canopyGroup.add(tube)
  }

  // 展棚中心环（顶部采光环）
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.12, 8, 24), whiteMetal)
  topRing.position.y = canopyH
  topRing.rotation.x = Math.PI / 2
  canopyGroup.add(topRing)

  // 展棚基座（混凝土台基）
  const canopyBase = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 8), concreteMat)
  canopyBase.position.y = 0.25
  canopyBase.userData.site = true
  canopyGroup.add(canopyBase)

  canopyGroup.position.set(20, 0, 0)
  grp.add(canopyGroup)

  // 周边绿化：树阵（宗地内，环绕广场）
  const treePositions: [number, number][] = [
    [-25, -1.5], [-17, -1.5], [-9, -1.5], [-1, -1.5], [7, -1.5], [15, -1.5], [23, -1.5],
    [-25, 1.5], [-17, 1.5], [-9, 1.5], [-1, 1.5], [7, 1.5], [15, 1.5], [23, 1.5],
    [-27, -0.5], [-27, 0.5], [27, -0.5], [27, 0.5],
    [-14, -1.5], [-6, -1.5], [6, -1.5], [14, -1.5],
    [-14, 1.5], [-6, 1.5], [6, 1.5], [14, 1.5],
    [-25, -8], [-17, -8], [-9, -8], [-1, -8], [7, -8], [15, -8], [23, -8],
    [-25, 8], [-17, 8], [-9, 8], [-1, 8], [7, 8], [15, 8], [23, 8],
  ]
  for (const [tx, tz] of treePositions) {
    const tree = ctx.blocks.tree({ x: tx, z: tz, scale: 1 + rng() * 0.4, seed: Math.floor(rng() * 1000) })
    grp.add(tree)
  }

  // 灯柱（宗地内，环绕广场）
  const lampPositions: [number, number][] = [
    [-14, -1.5], [0, -1.5], [14, -1.5],
    [-14, 1.5], [0, 1.5], [14, 1.5],
    [-20, -1.5], [-20, 1.5],
    [-25, -5], [-25, 5], [25, -5], [25, 5],
    [-10, -8], [0, -8], [10, -8],
    [-10, 8], [0, 8], [10, 8],
  ]
  for (const [lx, lz] of lampPositions) {
    const lamp = ctx.blocks.streetLamp({ x: lx, z: lz, h: 5 })
    grp.add(lamp)
  }

  // 周边绿篱（宗地边缘）
  const hedgePositions: [number, number, number, number][] = [
    // [x, z, w, d]
    [-27, -9.5, 6, 0.5], [-20, -9.5, 6, 0.5], [-13, -9.5, 6, 0.5], [-6, -9.5, 6, 0.5], [1, -9.5, 6, 0.5], [8, -9.5, 6, 0.5], [15, -9.5, 6, 0.5], [22, -9.5, 6, 0.5],
    [-27, 9.5, 6, 0.5], [-20, 9.5, 6, 0.5], [-13, 9.5, 6, 0.5], [-6, 9.5, 6, 0.5], [1, 9.5, 6, 0.5], [8, 9.5, 6, 0.5], [15, 9.5, 6, 0.5], [22, 9.5, 6, 0.5],
    [-29.5, -5, 0.5, 6], [-29.5, 0, 0.5, 6], [-29.5, 5, 0.5, 6],
    [29.5, -5, 0.5, 6], [29.5, 0, 0.5, 6], [29.5, 5, 0.5, 6],
  ]
  for (const [hx, hz, hw, hd] of hedgePositions) {
    const hedge = ctx.blocks.hedge({ w: hw, d: hd, h: 0.9, x: hx, z: hz })
    grp.add(hedge)
  }

  // 石盆装饰（广场入口两侧）
  for (const [ux, uz] of [[-12, -7], [12, -7], [-12, 7], [12, 7], [-18, -7], [18, -7], [-18, 7], [18, 7]] as const) {
    const urn = ctx.blocks.urn({ scale: 1.2, color: '#C4C1BA', x: ux, y: 0, z: uz })
    grp.add(urn)
  }

  // 长椅（广场两侧）
  for (const [bx, bz, br] of [[-6, 5, 0], [6, 5, 0], [-6, 1, Math.PI], [6, 1, Math.PI], [-16, 5, 0], [16, 5, 0], [-16, 1, Math.PI], [16, 1, Math.PI]] as const) {
    const bench = ctx.blocks.bench({ x: bx, z: bz, rotY: br })
    grp.add(bench)
  }

  // 场地标识牌
  const sign = ctx.blocks.neonSign({ w: 10, h: 1.5, color: '#FFC300', x: 0, y: 8, z: -1 })
  grp.add(sign)

  return grp
}
