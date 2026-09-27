import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'
import { gardenTree } from '../../blocks/doubao-seed-2.1-pro/garden-tree'
import { pergola } from '../../blocks/doubao-seed-2.1-pro/pergola'

const M = (g: THREE.BufferGeometry, m: THREE.Material, site = true) => {
  const o = new THREE.Mesh(g, m)
  o.castShadow = true
  if (site) o.userData.site = true
  return o
}
// 杆件（圆柱）/ 板件快捷
const rod = (r: number, h: number, mat: THREE.Material, seg = 12) => M(new THREE.CylinderGeometry(r, r, h, seg), mat)
const bx = (w: number, h: number, d: number, mat: THREE.Material) => M(new THREE.BoxGeometry(w, h, d), mat)

// ===================================================================
// 游乐设施
// ===================================================================

/** 组合游乐塔：平台 + 双滑梯 + 爬梯 + 护栏 + 四坡小顶。 */
function playTower(mat: { pri: string; sec: string }): THREE.Group {
  const g = new THREE.Group()
  const mPri = stdMaterial(mat.pri, { roughness: 0.6 })
  const mSec = stdMaterial(mat.sec, { roughness: 0.6 })
  const mMetal = stdMaterial('#B8B4AA', { metalness: 0.5, roughness: 0.4 })

  // 平台 + 四柱
  g.add(bx(1.7, 0.12, 1.7, mSec)).children[0].position.y = 1.6
  for (const [x, z] of [[-0.75, -0.75], [0.75, -0.75], [0.75, 0.75], [-0.75, 0.75]]) {
    const p = rod(0.07, 1.6, mPri); p.position.set(x, 0.8, z); g.add(p)
  }
  // 双滑梯（朝 -Z，斜槽：槽底 + 两侧帮）
  for (const sx of [-0.42, 0.42]) {
    const slide = bx(0.34, 0.06, 2.6, mPri)
    slide.position.set(sx, 0.8, -2.05); slide.rotation.x = -0.62; g.add(slide)
    const side = bx(0.05, 0.16, 2.6, mSec)
    side.position.set(sx - 0.17, 0.86, -2.05); side.rotation.x = -0.62; g.add(side)
    const side2 = bx(0.05, 0.16, 2.6, mSec)
    side2.position.set(sx + 0.17, 0.86, -2.05); side2.rotation.x = -0.62; g.add(side2)
  }
  // 爬梯（+Z 侧，斜板带横杠）
  const ladder = bx(0.7, 0.05, 1.5, mMetal)
  ladder.position.set(0, 0.8, 1.25); ladder.rotation.x = 0.7; g.add(ladder)
  for (let i = 0; i < 5; i++) {
    const rung = bx(0.72, 0.05, 0.05, mMetal)
    rung.position.set(0, 0.35 + i * 0.26, 0.55 + i * 0.2); rung.rotation.x = 0.7; g.add(rung)
  }
  // 平台护栏（南/北/东三面矮栏）
  for (const [w, x, z, ry] of [[1.5, 0, 0.82, 0], [1.5, 0, -0.82, 0], [1.5, 0.82, 0, Math.PI / 2]]) {
    const rail = bx(w, 0.06, 0.05, mPri)
    rail.position.set(x, 2.05, z); rail.rotation.y = ry; g.add(rail)
    for (const px of [-w / 2, 0, w / 2]) {
      const post = bx(0.05, 0.45, 0.05, mPri)
      const ox = Math.abs(ry) > 0 ? z : px
      const oz = Math.abs(ry) > 0 ? px : z
      post.position.set(ox, 1.83, oz); post.rotation.y = ry; g.add(post)
    }
  }
  // 四坡小顶（黛色塑料）+ 四根撑杆
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) {
    const p = rod(0.05, 0.9, mMetal); p.position.set(x, 2.65, z); g.add(p)
  }
  const roof = M(new THREE.ConeGeometry(1.45, 0.8, 4), stdMaterial('#4A4642', { roughness: 0.7 }))
  roof.position.y = 3.3; roof.rotation.y = Math.PI / 4; g.add(roof)
  return g
}

/** 秋千组：A 形架 ×2 + 横梁 + 两秋千。 */
function swingSet(col: string): THREE.Group {
  const g = new THREE.Group()
  const mPri = stdMaterial(col, { roughness: 0.62 })
  const mChain = stdMaterial('#6E6B64', { metalness: 0.55, roughness: 0.4 })
  // 两侧 A 架
  for (const sx of [-1.1, 1.1]) {
    for (const dz of [-0.5, 0.5]) {
      const leg = rod(0.06, 2.4, mPri)
      leg.position.set(sx, 1.2, dz); leg.rotation.x = dz * 0.42; g.add(leg)
    }
    const foot = rod(0.05, 1.1, mPri); foot.position.set(sx, 0.06, 0); foot.rotation.z = Math.PI / 2; g.add(foot)
  }
  const beam = rod(0.07, 2.6, mPri); beam.position.y = 2.35; beam.rotation.z = Math.PI / 2; g.add(beam)
  // 两个秋千：吊链 + 座板
  for (const sx of [-0.45, 0.45]) {
    const seat = bx(0.5, 0.06, 0.22, mPri); seat.position.set(sx, 0.65, 0); g.add(seat)
    for (const dx of [-0.2, 0.2]) {
      const chain = rod(0.015, 1.6, mChain, 6); chain.position.set(sx + dx, 1.5, 0); g.add(chain)
    }
  }
  return g
}

/** 弹簧摇马：底座 + 弹簧 + 马身 + 头 + 把手。 */
function springRider(col: string): THREE.Group {
  const g = new THREE.Group()
  const mPri = stdMaterial(col, { roughness: 0.6 })
  const mMetal = stdMaterial('#8E8B84', { metalness: 0.6, roughness: 0.4 })
  const base = rod(0.22, 0.08, mMetal); base.position.y = 0.04; g.add(base)
  const spring = rod(0.05, 0.5, mMetal); spring.position.y = 0.33; g.add(spring)
  const body = bx(0.75, 0.28, 0.24, mPri); body.position.set(0, 0.72, 0); g.add(body)
  const head = bx(0.22, 0.34, 0.22, mPri); head.position.set(0.4, 0.92, 0); g.add(head)
  const tail = bx(0.08, 0.26, 0.08, mPri); tail.position.set(-0.42, 0.9, 0); g.add(tail)
  const handle = rod(0.02, 0.28, mMetal, 6); handle.position.set(0.28, 1.05, 0); g.add(handle)
  const seat = bx(0.3, 0.05, 0.2, mPri); seat.position.set(-0.05, 0.88, 0); g.add(seat)
  return g
}

/** 攀爬架：四柱 + 三层横杆 + 顶部竖杆网。 */
function jungleGym(col: string): THREE.Group {
  const g = new THREE.Group()
  const mPri = stdMaterial(col, { roughness: 0.6 })
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) {
    const p = rod(0.06, 2.0, mPri); p.position.set(x, 1.0, z); g.add(p)
  }
  for (let lvl = 0; lvl < 3; lvl++) {
    const y = 0.55 + lvl * 0.6
    for (const z of [-0.7, 0.7]) {
      const bar = rod(0.04, 1.5, mPri); bar.position.set(0, y, z); bar.rotation.z = Math.PI / 2; g.add(bar)
    }
    for (const x of [-0.7, 0.7]) {
      const bar = rod(0.04, 1.5, mPri); bar.position.set(x, y, 0); bar.rotation.x = Math.PI / 2; g.add(bar)
    }
  }
  return g
}

// ===================================================================
// 健身器材
// ===================================================================

/** 太空漫步机：两立柱 + 转轴 + 踏板 + 扶手。 */
function walker(): THREE.Group {
  const g = new THREE.Group()
  const mMetal = stdMaterial('#5A5854', { metalness: 0.6, roughness: 0.4 })
  const mRub = stdMaterial('#3E3C3A', { roughness: 0.85 })
  for (const sx of [-0.25, 0.25]) {
    const post = rod(0.06, 1.3, mMetal); post.position.set(sx, 0.65, 0); g.add(post)
    const pedal = bx(0.16, 0.05, 0.4, mRub); pedal.position.set(sx, 0.28, 0.18); pedal.rotation.x = 0.15; g.add(pedal)
    const arm = rod(0.025, 0.85, mMetal, 8); arm.position.set(sx, 0.95, 0.12); arm.rotation.x = 0.2; g.add(arm)
  }
  const axle = rod(0.04, 0.6, mMetal); axle.position.y = 1.25; axle.rotation.z = Math.PI / 2; g.add(axle)
  return g
}

/** 扭腰器：立柱 + 转盘。 */
function twister(): THREE.Group {
  const g = new THREE.Group()
  const mMetal = stdMaterial('#5A5854', { metalness: 0.6, roughness: 0.4 })
  const post = rod(0.06, 1.1, mMetal); post.position.y = 0.55; g.add(post)
  const disc = rod(0.18, 0.06, stdMaterial('#4A4844', { metalness: 0.5, roughness: 0.5 })); disc.position.y = 0.06; g.add(disc)
  const plate = rod(0.15, 0.04, stdMaterial('#6E6B64', { metalness: 0.6, roughness: 0.35 })); plate.position.y = 1.05; g.add(plate)
  return g
}

/** 单杠/双杠合一。 */
function bars(double = false): THREE.Group {
  const g = new THREE.Group()
  const mMetal = stdMaterial('#D8D4CA', { metalness: 0.55, roughness: 0.35 })
  if (double) {
    for (const sx of [-0.3, 0.3]) {
      for (const x of [sx]) {
        for (const z of [-0.7, 0.7]) {
          const p = rod(0.06, 1.4, mMetal); p.position.set(x, 0.7, z); g.add(p)
        }
        const b = rod(0.05, 1.5, mMetal); b.position.set(x, 1.4, 0); b.rotation.x = Math.PI / 2; g.add(b)
      }
    }
  } else {
    for (const z of [-0.9, 0.9]) {
      const p = rod(0.06, 2.2, mMetal); p.position.set(0, 1.1, z); g.add(p)
    }
    const b = rod(0.06, 1.9, mMetal); b.position.y = 2.2; b.rotation.x = Math.PI / 2; g.add(b)
  }
  return g
}

/** 太极揉推器：立柱 + 两斜转盘。 */
function taijiWheels(): THREE.Group {
  const g = new THREE.Group()
  const mMetal = stdMaterial('#5A5854', { metalness: 0.6, roughness: 0.4 })
  const post = rod(0.07, 1.5, mMetal); post.position.y = 0.75; g.add(post)
  for (const sx of [-0.22, 0.22]) {
    const wheel = rod(0.2, 0.05, stdMaterial('#8E8B84', { metalness: 0.55, roughness: 0.4 }))
    wheel.position.set(sx, 1.35, 0); wheel.rotation.x = 0.5; wheel.rotation.z = sx > 0 ? -0.3 : 0.3; g.add(wheel)
    // 转盘把手
    const knob = rod(0.03, 0.12, mMetal, 8); knob.position.set(sx * 1.4, 1.45, 0.12); g.add(knob)
  }
  return g
}

/** 乒乓球台：台面 + 腿 + 球网。 */
function pingpong(): THREE.Group {
  const g = new THREE.Group()
  const mBlue = stdMaterial('#3A5A8C', { roughness: 0.5 })
  const mLeg = stdMaterial('#5A5854', { metalness: 0.5, roughness: 0.45 })
  const top = bx(2.7, 0.08, 1.5, mBlue); top.position.y = 0.76; g.add(top)
  for (const [x, z] of [[-1.1, -0.6], [1.1, -0.6], [1.1, 0.6], [-1.1, 0.6]]) {
    const leg = rod(0.05, 0.74, mLeg); leg.position.set(x, 0.37, z); g.add(leg)
  }
  const net = bx(2.7, 0.16, 0.04, stdMaterial('#E8E6E1', { roughness: 0.8 })); net.position.y = 0.88; g.add(net)
  for (const sx of [-1.2, 1.2]) {
    const post = rod(0.03, 0.2, mLeg, 8); post.position.set(sx, 0.86, 0); g.add(post)
  }
  return g
}

// ===================================================================
// 旱喷广场
// ===================================================================

function dryFountain(): THREE.Group {
  const g = new THREE.Group()
  const mStone = stdMaterial('#C9C6BD', { roughness: 0.9 })
  const mDark = stdMaterial('#A8A59D', { roughness: 0.92 })
  // 圆形石板：3 环 × 16 分（错缝），用窄长板沿环摆放
  for (let ring = 0; ring < 3; ring++) {
    const r = 1.0 + ring * 0.85
    const n = 16
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (ring % 2) * (Math.PI / n)
      const tile = bx(0.62, 0.05, 0.34, ring === 1 ? mDark : mStone)
      tile.position.set(Math.cos(a) * r, 0.07, Math.sin(a) * r)
      tile.rotation.y = -a; g.add(tile)
    }
  }
  // 12 条水柱（细蓝色半感圆柱）+ 中心球灯
  const mJet = stdMaterial('#7FA8C8', { metalness: 0.3, roughness: 0.2, emissive: '#4A7A9C', emissiveIntensity: 0.25 })
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const h = 0.5 + (i % 3) * 0.18
    const jet = rod(0.03, h, mJet, 8)
    jet.position.set(Math.cos(a) * 2.3, h / 2 + 0.05, Math.sin(a) * 2.3); g.add(jet)
  }
  const lamp = M(new THREE.SphereGeometry(0.16, 12, 10),
    stdMaterial('#FFE4B0', { emissive: '#FFC870', emissiveIntensity: 1.5 }))
  lamp.position.y = 0.5; g.add(lamp)
  return g
}

/** 草坪灯：短杆 + 暖光球。 */
function lawnLamp(x: number, z: number): THREE.Object3D {
  const g = new THREE.Group()
  const pole = rod(0.04, 0.7, stdMaterial('#3E3C3A', { metalness: 0.5, roughness: 0.45 }), 8)
  pole.position.y = 0.35; g.add(pole)
  const bulb = M(new THREE.SphereGeometry(0.1, 10, 8),
    stdMaterial('#FFDCA0', { emissive: '#FFC870', emissiveIntensity: 1.5 }))
  bulb.position.y = 0.78; g.add(bulb)
  g.position.set(x, 0, z)
  g.userData.site = true
  return g
}

/** 花灌木球（多色花；索引 SphereGeometry，规避 shot 非索引退化）。 */
function flowerBush(x: number, z: number, col: string, r = 0.4): THREE.Object3D {
  const g = new THREE.Group()
  const fm = stdMaterial(col, { roughness: 0.85 }); fm.flatShading = true
  const b = M(new THREE.SphereGeometry(r, 9, 7), fm)
  b.position.y = r; g.add(b)
  g.position.set(x, 0, z)
  g.userData.site = true
  return g
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  void ctx
  const root = new THREE.Group()
  const B = ctx.blocks
  const add = (o: THREE.Object3D) => { root.add(o); return o }

  // ---- 材质 ----
  const matGround = stdMaterial('#A8A59C', { roughness: 0.95 })
  const matLawn = stdMaterial('#8C9E78', { roughness: 0.95 })
  const matPave = stdMaterial('#D2CEC4', { roughness: 0.88 })
  const EPDM = ['#D96A4A', '#E8B44A', '#5A8FB8', '#6E9A5C', '#C86BA0'].map(c => stdMaterial(c, { roughness: 0.9 }))
  const RUBBER = ['#B86A5A', '#9A968E'].map(c => stdMaterial(c, { roughness: 0.92 }))

  // ===================================================================
  // 场地基底：全域草皮（非步道即绿化）
  // ===================================================================
  add(M(new THREE.BoxGeometry(20, 0.04, 40), matGround)).position.set(0, 0.02, 0)
  add(M(new THREE.BoxGeometry(20, 0.04, 40), matLawn)).position.set(0, 0.045, 0)

  // 石板共享几何：矩形区域网格化铺装
  const paveGeo = new THREE.BoxGeometry(0.72, 0.04, 0.72)
  const paveRect = (x0: number, x1: number, z0: number, z1: number) => {
    for (let x = x0 + 0.38; x <= x1 - 0.2; x += 0.78) {
      for (let z = z0 + 0.38; z <= z1 - 0.2; z += 0.78) {
        const t = M(paveGeo, matPave); t.position.set(x, 0.075, z); add(t)
      }
    }
  }
  // 东西环带 + 南环带 + 中轴主道（贯穿南北 2m）+ 草坪东西侧道
  paveRect(8.2, 9.8, -18, 18)
  paveRect(-9.8, -8.2, -18, 18)
  paveRect(-9.8, 9.8, -19.8, -18.2)
  paveRect(-1, 1, -18, 18)
  paveRect(-8, -5.6, 2.5, 10.5)
  paveRect(5.6, 8, 2.5, 10.5)
  // 北段树阵间十字铺装
  paveRect(-8, 8, 11.5, 13)
  paveRect(-7.5, -6, 13, 17.5)
  paveRect(6, 7.5, 13, 17.5)
  // 北出口
  paveRect(-1, 1, 18, 19.9)

  // ---- 儿童场 EPDM 彩色地面：x[-9,-0.5] z[-17.5,-9] ----
  const epdmGeo = new THREE.BoxGeometry(0.82, 0.04, 0.82)
  let cc = 0
  for (let x = -8.6; x <= -1; x += 0.86) {
    for (let z = -17.1; z <= -9.4; z += 0.86) {
      const t = M(epdmGeo, EPDM[(cc + Math.floor((z + 17.1) * 2)) % EPDM.length])
      t.position.set(x, 0.072, z); add(t); cc++
    }
  }
  // ---- 健身区橡胶地面：x[0.5,9] z[-17.5,-9] ----
  const rubGeo = new THREE.BoxGeometry(1.34, 0.04, 1.34)
  for (let x = 1.2; x <= 8.4; x += 1.4) {
    for (let z = -16.8; z <= -9.7; z += 1.4) {
      const t = M(rubGeo, RUBBER[(Math.round(x + z) % 2 + 2) % 2])
      t.position.set(x, 0.07, z); add(t)
    }
  }

  // ===================================================================
  // 游乐设施落位
  // ===================================================================
  const tower = playTower({ pri: '#E8A52C', sec: '#4A7AB0' })
  tower.position.set(-5.5, 0, -11); add(tower)
  const swings = swingSet('#D96A4A')
  swings.position.set(-2, 0, -16.5); add(swings)
  const rider1 = springRider('#6E9A5C'); rider1.position.set(-8.2, 0, -16.8); add(rider1)
  const rider2 = springRider('#C86BA0'); rider2.position.set(-8.2, 0, -10); add(rider2)
  const jungle = jungleGym('#5A8FB8'); jungle.position.set(-2, 0, -10); add(jungle)

  // ===================================================================
  // 健身器材落位（东带）
  // ===================================================================
  const pp = pingpong(); pp.position.set(5, 0, -16.5); add(pp)
  const w1 = walker(); w1.position.set(2, 0, -14); add(w1)
  const w2 = walker(); w2.position.set(4.2, 0, -14); add(w2)
  const t1 = twister(); t1.position.set(6.5, 0, -14); add(t1)
  const t2 = twister(); t2.position.set(8.3, 0, -14); add(t2)
  const sg = bars(false); sg.position.set(2.4, 0, -10.5); add(sg)
  const dg = bars(true); dg.position.set(6.2, 0, -10.2); add(dg)
  const tj = taijiWheels(); tj.position.set(8.4, 0, -10.5); add(tj)

  // ===================================================================
  // 中段：旱喷广场 + 阳光草坪 + 廊架
  // ===================================================================
  const fountain = dryFountain(); fountain.position.set(0, 0, -1); add(fountain)
  // 阳光草坪（中央略凸大草皮，带步石）
  add(M(new THREE.BoxGeometry(11, 0.04, 7), stdMaterial('#84986E', { roughness: 0.95 }))).position.set(0, 0.06, 6.3)
  for (let k = 0; k < 5; k++) {
    const step = M(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), matPave)
    step.position.set(-3.5 + k * 1.75, 0.09, 6.3); add(step)
  }
  // 爬藤廊架（草坪北端，跨中轴）
  const perg = pergola({ w: 7, d: 3, h: 3.2, bay: 2.3, seed: 91, vines: true, color: '#9A6E4A' })
  perg.position.set(0, 0, 11); add(perg)
  // 广场/草坪坐凳
  for (const [x, z, ry] of [[-4.5, -1, Math.PI / 2], [4.5, -1, -Math.PI / 2], [-7, 8, Math.PI / 2], [7, 8, -Math.PI / 2]]) {
    add(B.bench({ x, z, rotY: ry }))
  }
  // 广场两侧石盆
  for (const x of [-3.4, 3.4]) add(M(new THREE.CylinderGeometry(0.34, 0.26, 0.4, 12), stdMaterial('#B5B2A8', { roughness: 0.9 }))).position.set(x, 0.2, -1)

  // ===================================================================
  // 北段：树阵休憩园
  // ===================================================================
  // 树阵 2 行 ×4（树池圆环 + 庭园树）
  for (const z of [14.5, 17]) {
    for (const x of [-6, -2, 2, 6]) {
      const ring = M(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 16), stdMaterial('#C9C6BD', { roughness: 0.9 }))
      ring.position.set(x, 0.06, z); add(ring)
      add(gardenTree({ x, z, scale: 0.85, seed: Math.round((x + 10) * 13 + z * 7), blossom: z > 16 ? '#F2B4C8' : undefined }))
    }
  }
  // 花境带（廊架北侧一排彩色花灌木）
  const flowers = ['#D4568E', '#E8A52C', '#9C5FB0', '#D96A4A', '#F2D98F']
  for (let k = 0; k < 16; k++) {
    add(flowerBush(-7.5 + k, 12.6, flowers[k % flowers.length], 0.32 + (k % 3) * 0.05))
  }
  // 阅读长椅 + 草坪灯
  for (const [x, ry] of [[-4, Math.PI / 2], [0, 0], [4, -Math.PI / 2]]) {
    add(B.bench({ x, z: 15.5, rotY: ry }))
  }
  for (const [x, z] of [[-8.8, 11.5], [8.8, 11.5], [-8.8, 18.5], [8.8, 18.5], [0, 18.5], [0, 12]]) add(lawnLamp(x, z))

  // ===================================================================
  // 乔木与灌木补全（环带 + 活动区周边）
  // ===================================================================
  const treeSpots: Array<[number, number, number, string?, number?]> = [
    // 东西环带（x 内移 8.5：树池嵌人行道，冠球不越宗地）
    [-8.5, -14, 21], [8.5, -14, 22], [-8.5, -6, 23], [8.5, -6, 24],
    [-8.5, 3, 25], [8.5, 3, 26], [-8.5, 10, 27], [8.5, 10, 28],
    [-8.5, 15, 29], [8.5, 15, 30],
    // 南环带
    [-3.5, -19, 31], [3.5, -19, 32],
    // 儿童场/健身区边角
    [-0.8, -17, 33], [0.8, -17, 34],
    // 中段草坪角
    [-5.2, 3.2, 35], [5.2, 3.2, 36], [-5.2, 9.4, 37], [5.2, 9.4, 38],
    // 广场两侧
    [-2.8, 2.2, 39, '#F2B4C8'], [2.8, 2.2, 40, '#F2D98F'],
    // 北段补树
    [-8.5, 13.5, 41], [8.5, 13.5, 42], [-4, 18.5, 43], [4, 18.5, 44],
    // 北出口两侧
    [-2.2, 19, 45], [2.2, 19, 46],
    // ---- 密植补全（小树 scale 0.65）----
    // 北环带
    [-7, 19, 60], [-4, 19, 61], [4, 19, 62], [7, 19, 63],
    // 南环带
    [-7, -19, 64], [7, -19, 65],
    // 东西环带加密
    [-8.5, -17.5, 66], [8.5, -17.5, 67], [-8.5, -1, 68], [8.5, -1, 69],
    // 廊架外侧
    [-4.5, 11.5, 70], [4.5, 11.5, 71],
    // 旱喷广场南两侧
    [-5.2, -4.5, 72], [5.2, -4.5, 73],
  ]
  const mTreeWell = stdMaterial('#B0ADA4', { roughness: 0.92 })
  for (const [x, z, seed, blossom, sc] of treeSpots) {
    // 石板上的树（环带）：嵌地圆形树池
    if (Math.abs(x) === 8.5 || Math.abs(z) === 19) {
      const well = M(new THREE.CylinderGeometry(0.62, 0.62, 0.07, 16), mTreeWell)
      well.position.set(x, 0.07, z); add(well)
    }
    add(gardenTree({ x, z, scale: sc ?? 0.92, seed, blossom }))
  }
  // 灌木球组团（detail1，沿路绿点）
  const bushSpots: Array<[number, number, string]> = [
    [-8.2, -10, '#6E8A54'], [8.2, -10, '#6E8A54'], [-8.2, 0, '#7A9460'], [8.2, 0, '#7A9460'],
    [-8.2, 7, '#6E8A54'], [8.2, 7, '#6E8A54'], [-3, -18.2, '#7A9460'], [3, -18.2, '#7A9460'],
    [-1.8, 2.5, '#8A9A64'], [1.8, 2.5, '#8A9A64'], [-1.8, 10, '#6E8A54'], [1.8, 10, '#6E8A54'],
    [-3.5, 13.5, '#7A9460'], [3.5, 13.5, '#7A9460'], [-3.5, 17.5, '#8A9A64'], [3.5, 17.5, '#8A9A64'],
  ]
  // 每点三球组团（主球 + 两小球错落地栽）
  for (const [x, z, c] of bushSpots) {
    add(flowerBush(x, z, c, 0.42))
    add(flowerBush(x + 0.38, z + 0.18, c, 0.3))
    add(flowerBush(x - 0.3, z - 0.3, c, 0.3))
  }
  // 草坪外侧道边花（4）+ 北段花境第二排（8）
  for (const [x, z] of [[-4.9, 5], [4.9, 5], [-4.9, 7.6], [4.9, 7.6]]) add(flowerBush(x, z, flowers[Math.round(x + z) % flowers.length], 0.3))
  for (let k = 0; k < 8; k++) add(flowerBush(-4.4 + k * 1.25, 13.3, flowers[(k + 2) % flowers.length], 0.28))
  for (let k = 0; k < 6; k++) add(flowerBush(-3.75 + k * 1.5, 13.65, flowers[(k + 4) % flowers.length], 0.26))
  for (let k = 0; k < 4; k++) add(flowerBush(-2.25 + k * 1.5, 13.95, flowers[(k + 1) % flowers.length], 0.22))

  return root
}
