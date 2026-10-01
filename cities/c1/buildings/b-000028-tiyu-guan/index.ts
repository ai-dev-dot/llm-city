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

  // 中央铺装广场（南入口，宗地内）
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(20, 0.35, 10), pavingMat)
  plaza.position.set(0, 0.18, 3)
  plaza.userData.site = true
  grp.add(plaza)

  // 建筑本体（退线 2m 后 56×16m）
  // 基座
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(56, 1.2, 16), concreteMat)
  plinth.position.y = 0.6
  grp.add(plinth)

  // 环形立面（玻璃幕墙 + 密梃框架，缩小宽度避免竖梃超出宗地中央 56×16）
  const wallH = 10
  const mkWall = (w: number, d: number, x: number, z: number, rotY: number) => {
    const cols = Math.max(2, Math.round(w / 2))
    const m = ctx.blocks.glassCurtain({ w, h: wallH, cols, rows: 10, glassColor: '#9EC5DD', frameColor: '#E8E6E1', x, y: 1.2, z })
    m.rotation.y = rotY
    grp.add(m)
  }
  mkWall(55, 0.3, 0, -8 + 0.15, 0) // 北
  mkWall(55, 0.3, 0, 8 - 0.15, 0)  // 南
  mkWall(0.3, 15, -28 + 0.15, 0, Math.PI / 2) // 西
  mkWall(0.3, 15, 28 - 0.15, 0, Math.PI / 2)  // 东

  // 白色金属板带（幕墙上方）
  const bandH = 2
  const mkBand = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, bandH, d), whiteMetal)
    m.position.set(x, 1.2 + wallH + bandH / 2, z)
    grp.add(m)
  }
  mkBand(56, 0.5, 0, -8 + 0.25)
  mkBand(56, 0.5, 0, 8 - 0.25)
  mkBand(0.5, 16, -28 + 0.25, 0)
  mkBand(0.5, 16, 28 - 0.25, 0)

  // 穹顶骨架（参数化网格：经线 + 纬线）
  const domeGroup = new THREE.Group()
  const domeRx = 26  // 长轴半径
  const domeRz = 7.5 // 短轴半径
  const domeH = 14   // 穹顶高度
  const domeBaseY = 1.2 + wallH + bandH

  // 经线（从穹顶中心向四周辐射的椭圆弧线）
  const meridians = 64
  for (let i = 0; i < meridians; i++) {
    const angle = (i / meridians) * Math.PI * 2
    const pts: THREE.Vector3[] = []
    for (let j = 0; j <= 96; j++) {
      const t = (j / 96) * Math.PI / 2;
      const x = Math.cos(t) * domeRx * Math.cos(angle);
      const y = Math.sin(t) * domeH;
      const z = Math.cos(t) * domeRz * Math.sin(angle);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 96, 0.1, 8, false);
    const tube = new THREE.Mesh(geo, whiteMetal);
    domeGroup.add(tube);
  }

  // 纬线（环绕穹顶的椭圆环）
  const parallels = 20
  for (let i = 1; i <= parallels; i++) {
    const t = (i / (parallels + 1)) * Math.PI / 2
    const rx = Math.cos(t) * domeRx
    const rz = Math.cos(t) * domeRz
    const y = Math.sin(t) * domeH
    const pts: THREE.Vector3[] = []
    for (let j = 0; j <= 192; j++) {
      const a = (j / 192) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * rx, y, Math.sin(a) * rz))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const geo = new THREE.TubeGeometry(curve, 192, 0.08, 8, false)
    const tube = new THREE.Mesh(geo, whiteMetal)
    domeGroup.add(tube)
  }

  // 穹顶中心环（顶部采光环）
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.15, 8, 24), whiteMetal)
  topRing.position.y = domeH
  topRing.rotation.x = Math.PI / 2
  domeGroup.add(topRing)

  // 穹顶基部环形栏杆（缩小宽度避免立柱超出宗地中央 56×16）
  const domeRailing = ctx.blocks.railing({ w: 55, h: 1.2, color: '#E8E6E1', x: 0, y: domeBaseY, z: -8 + 0.5 })
  grp.add(domeRailing)
  const domeRailing2 = ctx.blocks.railing({ w: 55, h: 1.2, color: '#E8E6E1', x: 0, y: domeBaseY, z: 8 - 0.5 })
  grp.add(domeRailing2)
  const domeRailing3 = ctx.blocks.railing({ w: 15, h: 1.2, color: '#E8E6E1', x: -28 + 0.5, y: domeBaseY, z: 0 })
  domeRailing3.rotation.y = Math.PI / 2
  grp.add(domeRailing3)
  const domeRailing4 = ctx.blocks.railing({ w: 15, h: 1.2, color: '#E8E6E1', x: 28 - 0.5, y: domeBaseY, z: 0 })
  domeRailing4.rotation.y = Math.PI / 2
  grp.add(domeRailing4)

  domeGroup.position.y = domeBaseY
  grp.add(domeGroup)

  // 入口门厅（南侧中央，宗地内）
  const lobby = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 3), glassMat)
  lobby.position.set(0, 1.2 + 3, 6.5)
  grp.add(lobby)

  // 入口雨棚
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 4), whiteMetal)
  canopy.position.set(0, 7.5, 6)
  grp.add(canopy)

  // 入口台阶（宗地内，z >= -2）
  for (let i = 0; i < 4; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(10 - i * 0.5, 0.25, 0.3), concreteMat)
    step.position.set(0, 0.125 + i * 0.25, -2 + i * 0.3)
    step.userData.site = true
    grp.add(step)
  }

  // 柱廊（入口两侧，宗地内）
  for (let i = 0; i < 6; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 12), whiteMetal)
    col.position.set(-5 + i * 2, 1.2 + 3.5, -2)
    grp.add(col)
  }

  // 入口拱廊（archWall 积木）
  const arch = ctx.blocks.archWall({ w: 14, h: 5, archW: 2, archH: 3, depth: 0.4, color: '#C4C1BA', x: 0, y: 1.2, z: 4 })
  grp.add(arch)

  // 周边绿化：树阵（宗地内，z >= -1.5）
  const treePositions: [number, number][] = [
    [-25, -1.5], [-17, -1.5], [-9, -1.5], [-1, -1.5], [7, -1.5], [15, -1.5], [23, -1.5],
    [-25, 1.5], [-17, 1.5], [-9, 1.5], [-1, 1.5], [7, 1.5], [15, 1.5], [23, 1.5],
    [-27, -0.5], [-27, 0.5], [27, -0.5], [27, 0.5],
  ]
  for (const [tx, tz] of treePositions) {
    const tree = ctx.blocks.tree({ x: tx, z: tz, scale: 1 + rng() * 0.4, seed: Math.floor(rng() * 1000) })
    grp.add(tree)
  }

  // 灯柱（宗地内，z >= -1.5）
  const lampPositions: [number, number][] = [
    [-14, -1.5], [0, -1.5], [14, -1.5],
    [-14, 1.5], [0, 1.5], [14, 1.5],
  ]
  for (const [lx, lz] of lampPositions) {
    const lamp = ctx.blocks.streetLamp({ x: lx, z: lz, h: 5 })
    grp.add(lamp)
  }

  // 旗杆（入口两侧，宗地内）
  for (const fx of [-8, 8]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 12, 8), darkMat)
    pole.position.set(fx, 6, -1)
    grp.add(pole)
  }

  // 场地标识牌
  const sign = ctx.blocks.neonSign({ w: 8, h: 1.2, color: '#FFC300', x: 0, y: 8.5, z: -1 })
  grp.add(sign)

  // 石盆装饰（入口两侧）
  for (const ux of [-10, 10]) {
    const urn = ctx.blocks.urn({ scale: 1.2, color: '#C4C1BA', x: ux, y: 0, z: 2 })
    grp.add(urn)
  }

  // 长椅（广场两侧）
  for (const [bx, bz, br] of [[-6, 5, 0], [6, 5, 0], [-6, 1, Math.PI], [6, 1, Math.PI]] as const) {
    const bench = ctx.blocks.bench({ x: bx, z: bz, rotY: br })
    grp.add(bench)
  }

  return grp
}
