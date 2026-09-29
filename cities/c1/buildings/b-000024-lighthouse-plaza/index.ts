import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * b-000024 · 灯塔坪·环园步道 Beacon Plaza —— E4 镜湖中央公园三期（1×3 宗地 20×60m，东列正对 F4）
 * 母题「镜·穹·光」之「光」：东北角一座入夜发光的灯塔，正对 F4 西列万家窗灯，
 * 补全 F4 总图早已写死的「工作（E5 冠环）—自然（E4 灯塔）—归家（F4 窗灯）·灯之三叠」。
 * 一条林荫环园步道纵贯南北，把一期穹顶、二期镜湖绕东岸串成环，收口整个街区。
 * 局部原点 = 宗地中心地面；宗地 20×60，本体（灯塔）落 ±8×±28，余皆景观（site 豁免 R13，受 R2 ±10.5×±30.5）。
 */
const m = (g: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh => {
  const o = new THREE.Mesh(g, mat)
  o.castShadow = true
  o.receiveShadow = true
  return o
}

export default function build(ctx: BuildCtx): THREE.Object3D {
  const root = new THREE.Group()
  const rng = ctx.rng

  // ---- 材质 ----
  const stone = stdMaterial('#D9D6CF', { metalness: 0.0, roughness: 0.9 })
  const stoneWarm = stdMaterial('#CFC7B6', { metalness: 0.0, roughness: 0.88 })
  const stoneDark = stdMaterial('#8A8478', { metalness: 0.0, roughness: 0.92 })
  const bandRed = stdMaterial('#B5563F', { metalness: 0.0, roughness: 0.72 })
  const iron = stdMaterial('#4A5568', { metalness: 0.5, roughness: 0.45 })
  const brass = stdMaterial('#B0885E', { metalness: 0.6, roughness: 0.35 })
  const glass = stdMaterial('#CFEAF3', { metalness: 0.05, roughness: 0.18, emissive: '#BFE3EE', emissiveIntensity: 0.5, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  const glowCore = stdMaterial('#FFF0C8', { metalness: 0.0, roughness: 0.4, emissive: '#FFE0A0', emissiveIntensity: 2.4 })
  const lampGlow = stdMaterial('#FFE7B8', { metalness: 0.0, roughness: 0.5, emissive: '#FFCF7A', emissiveIntensity: 1.9 })
  const leafA = stdMaterial('#8C9E8B', { roughness: 0.95 })
  const leafB = stdMaterial('#7C9A6E', { roughness: 0.95 })
  const woodMat = stdMaterial('#8C6A4A', { roughness: 0.85 })

  const body = new THREE.Group()
  root.add(body)
  const site = new THREE.Group()
  site.userData.site = true
  root.add(site)

  // ================= 场地底（细分带微起伏 + 顶色，铺满至宗地边缘）=================
  const ground = new THREE.PlaneGeometry(20, 60, 120, 360)
  ground.rotateX(-Math.PI / 2)
  const gp = ground.attributes.position as THREE.BufferAttribute
  const gcol: number[] = []
  const cGrass = new THREE.Color('#8CA47A')
  const cGrassD = new THREE.Color('#7A9469')
  const cPath = new THREE.Color('#C6C0B3')
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i)
    const z = gp.getZ(i)
    const edge = Math.max(Math.abs(x) / 10, Math.abs(z) / 30)
    gp.setY(i, edge > 0.9 ? (rng() - 0.5) * 0.4 : (rng() - 0.5) * 0.06)
    // 中央步道带偏铺装色
    const onPath = Math.abs(x) < 2.4 && z < 15
    const c = onPath ? cPath.clone().lerp(new THREE.Color('#B4AE9F'), rng() * 0.5) : cGrass.clone().lerp(cGrassD, rng())
    gcol.push(c.r, c.g, c.b)
  }
  ground.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3))
  const lawn = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 0.0, vertexColors: true }))
  lawn.position.y = 0.05
  lawn.receiveShadow = true
  site.add(lawn)

  // ================= 本体：发光灯塔（东北角，≤18m）=================
  const LX = 1.0
  const LZ = 21
  const lh = new THREE.Group()
  lh.position.set(LX, 0, LZ)
  body.add(lh)
  // 基座三层 + 入口门廊
  for (const [r, h, y] of [[4.6, 0.5, 0], [4.0, 0.5, 0.5], [3.4, 0.6, 1.0]] as const) {
    const s = m(new THREE.CylinderGeometry(r, r + 0.15, h, 24), stone)
    s.position.y = y + h / 2
    lh.add(s)
  }
  let ty = 2.1
  const towerH = 10.5
  // 塔身：收分 + 红白相间环带
  const tower = m(new THREE.CylinderGeometry(1.7, 2.9, towerH, 24), stoneWarm)
  tower.position.y = ty + towerH / 2
  lh.add(tower)
  const bands = 6
  for (let i = 0; i < bands; i++) {
    const bt = (i + 0.5) / bands
    const by = ty + bt * towerH
    const br = 2.9 - (2.9 - 1.7) * bt + 0.05
    const band = m(new THREE.CylinderGeometry(br, br, towerH / bands * 0.5, 24), i % 2 ? bandRed : stoneWarm)
    band.position.y = by
    lh.add(band)
  }
  // 塔身竖向壁柱（扶壁）
  const pilN = 8
  for (let i = 0; i < pilN; i++) {
    const a = (i / pilN) * Math.PI * 2
    const p = m(new THREE.BoxGeometry(0.35, towerH, 0.5), stone)
    p.position.set(Math.cos(a) * 2.35, ty + towerH / 2, Math.sin(a) * 2.35)
    p.rotation.y = -a
    lh.add(p)
  }
  // 灯室平台（瞭望廊）+ 栏杆
  const galleryY = ty + towerH
  const gallery = m(new THREE.CylinderGeometry(2.6, 2.2, 0.4, 24), stoneDark)
  gallery.position.y = galleryY + 0.2
  lh.add(gallery)
  const galN = 16
  for (let i = 0; i < galN; i++) {
    const a = (i / galN) * Math.PI * 2
    const bal = m(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), iron)
    bal.position.set(Math.cos(a) * 2.4, galleryY + 0.85, Math.sin(a) * 2.4)
    lh.add(bal)
  }
  const galRail = m(new THREE.TorusGeometry(2.4, 0.09, 6, 32), iron)
  galRail.rotation.x = Math.PI / 2
  galRail.position.y = galleryY + 1.3
  lh.add(galRail)
  // 发光灯室（玻璃筒 + 竖梃 + 发光核心）——「E4 灯点」
  const lampY = galleryY + 0.4
  const lampH = 2.6
  const lampGlass = m(new THREE.CylinderGeometry(1.7, 1.7, lampH, 24), glass)
  lampGlass.position.y = lampY + lampH / 2
  lh.add(lampGlass)
  const lampCore = m(new THREE.CylinderGeometry(1.2, 1.2, lampH * 0.9, 20), glowCore)
  lampCore.position.y = lampY + lampH / 2
  lh.add(lampCore)
  const lmN = 12
  for (let i = 0; i < lmN; i++) {
    const a = (i / lmN) * Math.PI * 2
    const mul = m(new THREE.BoxGeometry(0.12, lampH, 0.16), iron)
    mul.position.set(Math.cos(a) * 1.72, lampY + lampH / 2, Math.sin(a) * 1.72)
    mul.rotation.y = -a
    lh.add(mul)
  }
  // 灯室顶：圆锥 + 尖塔 + 宝球 + 发光刹尖
  const roofY = lampY + lampH
  const roof = m(new THREE.ConeGeometry(2.0, 1.8, 24), bandRed)
  roof.position.y = roofY + 0.9
  lh.add(roof)
  const spire = m(new THREE.CylinderGeometry(0.06, 0.22, 1.6, 8), brass)
  spire.position.y = roofY + 1.8 + 0.8
  lh.add(spire)
  const orb = m(new THREE.SphereGeometry(0.36, 14, 10), brass)
  orb.position.y = roofY + 1.8 + 1.6 + 0.36
  lh.add(orb)
  const finial = m(new THREE.ConeGeometry(0.2, 0.8, 8), glowCore)
  finial.position.y = roofY + 1.8 + 1.6 + 0.72 + 0.4
  lh.add(finial)
  // 入口门（南向）+ 台阶
  const door = m(new THREE.BoxGeometry(1.4, 2.4, 0.3), woodMat)
  door.position.set(0, 1.2 + 2.1, -3.0)
  lh.add(door)
  for (let i = 0; i < 3; i++) {
    const st = m(new THREE.BoxGeometry(2.4, 0.2, 0.6), stone)
    st.position.set(0, 0.1 + i * 0.2, -3.6 - i * 0.6)
    lh.add(st)
  }

  // ================= 灯塔坪广场（环灯塔）=================
  const plaza = m(new THREE.CircleGeometry(7.8, 64), stdMaterial('#C6C0B3', { roughness: 0.85 }))
  plaza.rotation.x = -Math.PI / 2
  plaza.position.set(LX, 0.12, LZ)
  site.add(plaza)
  // 广场放射铺装 + 环柱
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const tile = m(new THREE.BoxGeometry(7.0, 0.06, 0.7), i % 2 ? stoneWarm : stoneDark)
    tile.position.set(LX + Math.cos(a) * 3.8, 0.14, LZ + Math.sin(a) * 3.8)
    tile.rotation.y = -a
    site.add(tile)
  }
  const colN = 12
  for (let i = 0; i < colN; i++) {
    const a = (i / colN) * Math.PI * 2
    const px = LX + Math.cos(a) * 7.2
    const pz = LZ + Math.sin(a) * 7.2
    const col = m(new THREE.CylinderGeometry(0.24, 0.3, 2.6, 12), stone)
    col.position.set(px, 1.3, pz)
    site.add(col)
    const cap = m(new THREE.BoxGeometry(0.7, 0.22, 0.7), stoneDark)
    cap.position.set(px, 2.7, pz)
    site.add(cap)
    const lamp = m(new THREE.SphereGeometry(0.24, 10, 8), lampGlow)
    lamp.position.set(px, 2.95, pz)
    site.add(lamp)
  }
  // 广场中心罗盘铺装嵌饰
  const compass = m(new THREE.TorusGeometry(3.0, 0.12, 6, 48), brass)
  compass.rotation.x = Math.PI / 2
  compass.position.set(LX, 0.18, LZ)
  site.add(compass)

  // ================= 林荫环园步道（纵贯南北，接镜湖）=================
  // 中央步道砖（x≈0，从广场南缘到宗地南端）
  for (let z = 12; z >= -28; z -= 1.6) {
    for (let k = -1; k <= 1; k++) {
      const t = m(new THREE.BoxGeometry(1.5, 0.06, 1.4), (k + Math.round(z)) % 2 ? stoneWarm : stoneDark)
      t.position.set(k * 1.5, 0.12, z)
      site.add(t)
    }
  }
  // 双排林荫树阵 + 灯柱 + 花境
  const flowerCols = ['#E9A7C0', '#F2E9D8', '#C9A7E9', '#E9C79A', '#E98A8A', '#F5F1E0']
  let fSeed = 0
  const flowerBed = (bx: number, bz: number, bw: number, bd: number) => {
    const soil = m(new THREE.BoxGeometry(bw, 0.28, bd), stdMaterial('#5A4632', { roughness: 1.0 }))
    soil.position.set(bx, 0.14, bz)
    site.add(soil)
    const n = Math.floor(bw * bd * 14)
    for (let i = 0; i < n; i++) {
      const fx = bx + (rng() - 0.5) * (bw - 0.4)
      const fz = bz + (rng() - 0.5) * (bd - 0.4)
      const h = 0.26 + rng() * 0.3
      const stem = m(new THREE.CylinderGeometry(0.02, 0.025, h, 5), stdMaterial('#5E7F52', { roughness: 0.9 }))
      stem.position.set(fx, 0.28 + h / 2, fz)
      site.add(stem)
      const bloom = m(new THREE.IcosahedronGeometry(0.1 + rng() * 0.06, 0), stdMaterial(flowerCols[(i + fSeed++) % flowerCols.length], { roughness: 0.7, emissive: flowerCols[i % flowerCols.length], emissiveIntensity: 0.12 }))
      bloom.position.set(fx, 0.28 + h, fz)
      site.add(bloom)
    }
  }
  for (let i = 0; i < 10; i++) {
    const z = 12 - i * 4.0
    for (const sx of [-1, 1]) {
      site.add(ctx.blocks.tree({ x: sx * 7.4, z, scale: 1.2 + (i % 3) * 0.12, seed: i * 17 + (sx + 1) * 5 + 3 }))
      site.add(ctx.blocks.streetLamp({ x: sx * 4.2, z: z - 1.8, h: 4.4 }))
      flowerBed(sx * 7.0, z - 1.8, 2.4, 2.6)
      if (i % 2 === 0) site.add(ctx.blocks.bench({ x: sx * 3.0, z, rotY: sx > 0 ? -Math.PI / 2 : Math.PI / 2 }))
    }
  }

  // ================= 东向临 F4 花架绿篱（把「归家」一侧铺成发光绿墙）=================
  const pergX = 8.4
  for (let z = 14; z >= -23; z -= 5) {
    for (const pz of [z, z - 5]) {
      if (pz < -29) continue
      const post = m(new THREE.BoxGeometry(0.28, 2.8, 0.28), woodMat)
      post.position.set(pergX, 1.4, pz)
      site.add(post)
    }
    const beam = m(new THREE.BoxGeometry(0.2, 0.24, 5), woodMat)
    beam.position.set(pergX, 2.7, z - 2.5)
    site.add(beam)
    for (let r = 0; r < 5; r++) {
      const rib = m(new THREE.BoxGeometry(1.6, 0.12, 0.12), woodMat)
      rib.position.set(pergX - 0.7, 2.85, z - r)
      site.add(rib)
    }
    // 花架下绿篱 + 灯
    const hedge = ctx.blocks.hedge({ w: 4.4, d: 0.8, h: 0.9, x: pergX - 1.6, z: z - 2.5 })
    site.add(hedge)
    site.add(ctx.blocks.streetLamp({ x: pergX - 0.2, z: z - 2.5, h: 4.0 }))
  }

  // ================= 南向门廊（接二期镜湖，收口环园）=================
  const gZ = -28.5
  for (const px of [-3, 3]) {
    const pier = m(new THREE.BoxGeometry(1.1, 4.2, 1.1), stone)
    pier.position.set(px, 2.1, gZ)
    site.add(pier)
    const cap = m(new THREE.BoxGeometry(1.4, 0.35, 1.4), stoneDark)
    cap.position.set(px, 4.3, gZ)
    site.add(cap)
    const urn = ctx.blocks.urn({ x: px, y: 4.5, z: gZ, scale: 1.2 })
    site.add(urn)
  }
  const lintel = m(new THREE.BoxGeometry(7.6, 0.7, 0.9), stone)
  lintel.position.set(0, 4.0, gZ)
  site.add(lintel)
  const garland = m(new THREE.TorusGeometry(2.4, 0.14, 6, 24, Math.PI), brass)
  garland.position.set(0, 4.0, gZ + 0.5)
  site.add(garland)
  for (let i = 0; i < 8; i++) {
    site.add(ctx.blocks.urn({ x: -7 + i * 2, z: gZ + 1.2, scale: 1.0 }))
  }

  root.updateMatrixWorld(true)
  return root
}
