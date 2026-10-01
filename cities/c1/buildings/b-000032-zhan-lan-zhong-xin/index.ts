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

  // 西入口广场（宗地内，西侧）
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 12), pavingMat)
  plaza.position.set(-20, 0.18, 0)
  plaza.userData.site = true
  grp.add(plaza)

  // 建筑本体（退线 2m 后 56×16m）
  // 基座
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(56, 1.5, 16), concreteMat)
  plinth.position.y = 0.75
  grp.add(plinth)

  // 裙房（56×16×15m，玻璃幕墙 + 密梃框架）
  const skirtH = 15
  const mkSkirt = (w: number, d: number, x: number, z: number, rotY: number) => {
    const cols = Math.max(2, Math.round(w * 32))
    const rows = Math.max(2, Math.round(skirtH * 32))
    const m = ctx.blocks.glassCurtain({ w, h: skirtH, cols, rows, glassColor: '#9EC5DD', frameColor: '#E8E6E1', x, y: 1.5, z })
    m.rotation.y = rotY
    grp.add(m)
  }
  mkSkirt(55, 0.3, 0, -8 + 0.15, 0) // 北
  mkSkirt(55, 0.3, 0, 8 - 0.15, 0)  // 南
  mkSkirt(0.3, 15, -28 + 0.15, 0, Math.PI / 2) // 西
  mkSkirt(0.3, 15, 28 - 0.15, 0, Math.PI / 2)  // 东

  // 裙房屋顶（白色金属板）
  const skirtRoof = new THREE.Mesh(new THREE.BoxGeometry(56, 0.3, 16), whiteMetal)
  skirtRoof.position.y = 1.5 + skirtH + 0.15
  grp.add(skirtRoof)

  // 中央主楼（30×12×40m，玻璃幕墙 + 密梃框架）
  const towerH = 40
  const towerBaseY = 1.5 + skirtH + 0.3
  const mkTower = (w: number, d: number, x: number, z: number, rotY: number) => {
    const cols = Math.max(2, Math.round(w * 32))
    const rows = Math.max(2, Math.round(towerH * 32))
    const m = ctx.blocks.glassCurtain({ w, h: towerH, cols, rows, glassColor: '#9EC5DD', frameColor: '#E8E6E1', x, y: towerBaseY, z })
    m.rotation.y = rotY
    grp.add(m)
  }
  mkTower(29, 0.3, 0, -6 + 0.15, 0) // 北
  mkTower(29, 0.3, 0, 6 - 0.15, 0)  // 南
  mkTower(0.3, 11, -15 + 0.15, 0, Math.PI / 2) // 西
  mkTower(0.3, 11, 15 - 0.15, 0, Math.PI / 2)  // 东

  // 流动屋面（参数化波浪板）
  const roofGroup = new THREE.Group()
  const waveAmp = 2.5
  const waveFreq = 0.35
  const wavePhase = 0
  const plateCount = 2000
  const plateW = 30 / plateCount
  for (let i = 0; i < plateCount; i++) {
    const x = -15 + (i + 0.5) * plateW
    const y = Math.sin(x * waveFreq + wavePhase) * waveAmp
    const plate = new THREE.Mesh(new THREE.BoxGeometry(plateW + 0.02, 0.25, 12), whiteMetal)
    plate.position.set(x, y, 0)
    roofGroup.add(plate)
  }
  roofGroup.position.y = towerBaseY + towerH + 0.125
  grp.add(roofGroup)

  // 屋顶采光带（环形天窗）
  const skylight = new THREE.Mesh(new THREE.TorusGeometry(3, 0.2, 8, 32), glassMat)
  skylight.position.y = towerBaseY + towerH + 0.5
  skylight.rotation.x = Math.PI / 2
  grp.add(skylight)

  // 西入口柱廊（8 根）
  for (let i = 0; i < 8; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 12, 12), whiteMetal)
    col.position.set(-26, 1.5 + 6, -7 + i * 2)
    grp.add(col)
  }

  // 西入口台阶（宗地内）
  for (let i = 0; i < 6; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 10 - i * 0.5), concreteMat)
    step.position.set(-27 + i * 0.4, 0.125 + i * 0.25, 0)
    step.userData.site = true
    grp.add(step)
  }

  // 西入口雨棚
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 16), whiteMetal)
  canopy.position.set(-24, 13.5, 0)
  grp.add(canopy)

  // 周边绿化：树阵（宗地内）
  const treePositions: [number, number][] = [
    [-25, -1.5], [-17, -1.5], [-9, -1.5], [-1, -1.5], [7, -1.5], [15, -1.5], [23, -1.5],
    [-25, 1.5], [-17, 1.5], [-9, 1.5], [-1, 1.5], [7, 1.5], [15, 1.5], [23, 1.5],
    [-27, -0.5], [-27, 0.5], [27, -0.5], [27, 0.5],
    [-14, -1.5], [-6, -1.5], [6, -1.5], [14, -1.5],
    [-14, 1.5], [-6, 1.5], [6, 1.5], [14, 1.5],
  ]
  for (const [tx, tz] of treePositions) {
    const tree = ctx.blocks.tree({ x: tx, z: tz, scale: 1 + rng() * 0.4, seed: Math.floor(rng() * 1000) })
    grp.add(tree)
  }

  // 灯柱（宗地内）
  const lampPositions: [number, number][] = [
    [-14, -1.5], [0, -1.5], [14, -1.5],
    [-14, 1.5], [0, 1.5], [14, 1.5],
    [-20, -1.5], [-20, 1.5],
  ]
  for (const [lx, lz] of lampPositions) {
    const lamp = ctx.blocks.streetLamp({ x: lx, z: lz, h: 5 })
    grp.add(lamp)
  }

  // 旗杆（西入口两侧，内移避免超出边界）
  for (const fz of [-7.5, 7.5]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 14, 8), darkMat)
    pole.position.set(-26, 7, fz)
    grp.add(pole)
  }

  // 长椅（广场两侧）
  for (const [bx, bz, br] of [[-24, 5, 0], [-24, -5, 0], [-18, 5, Math.PI], [-18, -5, Math.PI], [18, 5, 0], [18, -5, 0]] as const) {
    const bench = ctx.blocks.bench({ x: bx, z: bz, rotY: br })
    grp.add(bench)
  }

  // 场地标识牌
  const sign = ctx.blocks.neonSign({ w: 10, h: 1.5, color: '#FFC300', x: -20, y: 10, z: -1 })
  grp.add(sign)

  return grp
}
