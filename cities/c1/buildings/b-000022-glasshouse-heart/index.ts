import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * b-000022 · 温室之心 Glasshouse Heart —— E4 镜湖中央公园一期主景建筑（2×2 大宗地 40×40m）
 * 母题「镜·穹·光」之「穹」：一座可登临、入夜发光的植物园大穹顶，给城市绿肺一颗温暖心脏。
 * 形制（自内而外）：中央石造台基 → 环座列柱回廊 → 玻璃鼓座大厅 → 肋架玻璃穹顶 → 顶端灯笼采光塔冠；
 * 内景：中庭喷泉 + 环植棕榈 + 二层回廊；外围方格庭园（草皮满铺至宗地边缘、射路、镜池、树阵灯柱）。
 * 局部原点 = 宗地中心地面，Y 向上；本体落于 ±18（宗地 40×40 中央 (40−4)），退线环带做方格庭园。
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

  // ---- 材质层次：奶油锻铁骨架 / 亮青玻璃 / 石灰岩台座 / 黄铜收边 ----
  const iron = stdMaterial('#E7E3DA', { metalness: 0.35, roughness: 0.5 }) // 水晶宫式奶油锻铁
  const stone = stdMaterial('#D9D6CF', { metalness: 0.0, roughness: 0.9 })
  const stoneDark = stdMaterial('#A8A5A0', { metalness: 0.0, roughness: 0.92 })
  const brass = stdMaterial('#B0885E', { metalness: 0.6, roughness: 0.35 })
  const glass = stdMaterial('#BFE3EE', { metalness: 0.05, roughness: 0.16, emissive: '#B4DAE8', emissiveIntensity: 0.52, transparent: true, opacity: 0.46, side: THREE.DoubleSide })
  const glassSoft = stdMaterial('#D6EEF5', { metalness: 0.02, roughness: 0.2, emissive: '#CFEAF3', emissiveIntensity: 0.6, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  const glowCore = stdMaterial('#FFF0C8', { metalness: 0.0, roughness: 0.4, emissive: '#FFE6A0', emissiveIntensity: 2.6 })
  const lampGlow = stdMaterial('#FFE7B8', { metalness: 0.0, roughness: 0.5, emissive: '#FFCF7A', emissiveIntensity: 2.0 })
  const leafA = stdMaterial('#8C9E8B', { roughness: 0.95 })
  const leafB = stdMaterial('#7C9A6E', { roughness: 0.95 })
  const trunkMat = stdMaterial('#6B4A2F', { roughness: 0.9 })
  const water = stdMaterial('#9EC5DD', { metalness: 0.2, roughness: 0.08, emissive: '#7FB6D6', emissiveIntensity: 0.22, transparent: true, opacity: 0.62 })
  const grassMat = stdMaterial('#8CA47A', { roughness: 1.0 })
  const paving = stdMaterial('#CFC9BC', { metalness: 0.0, roughness: 0.85 })
  const pavingB = stdMaterial('#BAB4A6', { metalness: 0.0, roughness: 0.85 })

  // 本体（参与 R13 退线，落 ±18）
  const body = new THREE.Group()
  root.add(body)
  // 场地庭园（打 site 标记，R13 豁免；仍受 R2 ±20 约束）
  const site = new THREE.Group()
  site.userData.site = true
  root.add(site)

  // ---- 台基（三层圆形台阶 + 顶面铺装）----
  const plinthSteps: Array<[number, number, number]> = [
    [16.6, 0.34, 0.0], [16.0, 0.34, 0.34], [15.4, 0.34, 0.68],
  ]
  for (const [r, h, y] of plinthSteps) {
    const s = m(new THREE.CylinderGeometry(r, r + 0.12, h, 72), stone)
    s.position.y = y + h / 2
    body.add(s)
  }
  const podium = m(new THREE.CylinderGeometry(15.4, 15.4, 0.2, 72), paving)
  podium.position.y = 1.0 + 0.1
  body.add(podium)
  const BASE_Y = 1.2 // 台面标高

  // ---- 鼓座玻璃大厅：整片玻璃筒 + 密竖梃 + 三层横梁 + 底/顶线脚 ----
  const drumR = 13.2
  const wallH = 8.6
  const wallTop = BASE_Y + wallH
  const drumShell = m(new THREE.CylinderGeometry(drumR, drumR, wallH, 72, 1, true), glass)
  drumShell.position.y = BASE_Y + wallH / 2
  body.add(drumShell)
  const N = 36
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const mul = m(new THREE.BoxGeometry(0.16, wallH, 0.24), iron)
    mul.position.set(Math.cos(a) * drumR, BASE_Y + wallH / 2, Math.sin(a) * drumR)
    mul.rotation.y = -a
    body.add(mul)
    if (i % 2 === 0) { // 每两格一根装饰附柱
      const p = m(new THREE.CylinderGeometry(0.11, 0.13, wallH, 10), iron)
      p.position.set(Math.cos(a) * (drumR + 0.14), BASE_Y + wallH / 2, Math.sin(a) * (drumR + 0.14))
      body.add(p)
    }
  }
  for (const ty of [BASE_Y + wallH * 0.34, BASE_Y + wallH * 0.66, wallTop - 0.2]) {
    const ring = m(new THREE.TorusGeometry(drumR, 0.09, 6, 72), iron)
    ring.rotation.x = Math.PI / 2
    ring.position.y = ty
    body.add(ring)
  }
  const drumBaseRing = m(new THREE.TorusGeometry(drumR + 0.1, 0.24, 8, 72), stone)
  drumBaseRing.rotation.x = Math.PI / 2
  drumBaseRing.position.y = BASE_Y + 0.15
  body.add(drumBaseRing)
  const entabRing = m(new THREE.CylinderGeometry(drumR + 0.9, drumR + 0.9, 0.5, 72), stone)
  entabRing.position.y = wallTop + 0.25
  body.add(entabRing)

  // ---- 环座列柱回廊（外廊，落 ±17.6 内）：柱 + 额枋环 + 栏板 + 齿饰 ----
  const colR = 15.0
  const colH = 6.6
  const C = 24
  for (let i = 0; i < C; i++) {
    const a = (i / C) * Math.PI * 2
    const x = Math.cos(a) * colR
    const z = Math.sin(a) * colR
    const col = m(new THREE.CylinderGeometry(0.34, 0.42, colH, 16), stone)
    col.position.set(x, BASE_Y + colH / 2, z)
    body.add(col)
    const cap = m(new THREE.BoxGeometry(1.0, 0.28, 1.0), stoneDark)
    cap.position.set(x, BASE_Y + colH + 0.14, z)
    cap.rotation.y = -a
    body.add(cap)
    const base = m(new THREE.BoxGeometry(1.05, 0.22, 1.05), stoneDark)
    base.position.set(x, BASE_Y + 0.11, z)
    base.rotation.y = -a
    body.add(base)
    if (i % 3 === 0) { // 每三柱一组栏板（连拱）
      const a2 = ((i + 1) / C) * Math.PI * 2
      const mx = Math.cos((a + a2) / 2) * colR
      const mz = Math.sin((a + a2) / 2) * colR
      const rail = m(new THREE.BoxGeometry(2 * Math.PI * colR / C, 0.9, 0.22), stone)
      rail.position.set(mx, BASE_Y + 1.0, mz)
      rail.rotation.y = -(a + a2) / 2
      body.add(rail)
    }
  }
  const entabTop = m(new THREE.TorusGeometry(colR, 0.32, 8, 72), stone)
  entabTop.rotation.x = Math.PI / 2
  entabTop.position.y = BASE_Y + colH + 0.5
  body.add(entabTop)
  // 额枋顶齿饰（dentil）环：一圈小方块
  const dentN = 60
  for (let i = 0; i < dentN; i++) {
    const a = (i / dentN) * Math.PI * 2
    const d = m(new THREE.BoxGeometry(0.22, 0.24, 0.4), stoneDark)
    d.position.set(Math.cos(a) * (colR + 0.2), BASE_Y + colH + 0.72, Math.sin(a) * (colR + 0.2))
    d.rotation.y = -a
    body.add(d)
  }

  // ---- 四个凸出拱门（cardinal 门廊）：墩柱 + 半圆拱券 + 山花 + 玻璃门 ----
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    const gx = Math.cos(a), gz = Math.sin(a)
    const g = new THREE.Group()
    g.position.set(gx * drumR, BASE_Y, gz * drumR)
    g.rotation.y = -a + Math.PI / 2
    const pw = 2.2
    for (const sx of [-1, 1]) {
      const pil = m(new THREE.BoxGeometry(0.7, 7.2, 1.0), stone)
      pil.position.set(sx * (pw / 2 + 0.35), 3.6, 0)
      g.add(pil)
    }
    const arch = m(new THREE.TorusGeometry(pw / 2 + 0.35, 0.4, 8, 24, Math.PI), stone)
    arch.position.y = 6.0
    g.add(arch)
    const door = m(new THREE.BoxGeometry(pw, 6.0, 0.12), glassSoft)
    door.position.set(0, 3.0, 0.2)
    g.add(door)
    // 玻璃门扇竖梃
    for (let v = 0; v <= 3; v++) {
      const bar = m(new THREE.BoxGeometry(0.1, 6.0, 0.16), iron)
      bar.position.set(-pw / 2 + (pw * v) / 3, 3.0, 0.28)
      g.add(bar)
    }
    const ped = m(new THREE.BoxGeometry(pw + 1.4, 0.7, 1.3), stoneDark)
    ped.position.set(0, 7.5, -0.1)
    g.add(ped)
    const crest = m(new THREE.SphereGeometry(0.34, 12, 8), brass)
    crest.position.set(0, 8.1, -0.1)
    g.add(crest)
    body.add(g)
  }

  // ---- 肋架玻璃穹顶：球壳玻璃 + 密子午肋 + 多纬环（水晶宫式密肋，面数花满）----
  const domeR = 13.2
  const domeBase = wallTop + 0.5
  const domeShell = m(new THREE.SphereGeometry(domeR, 160, 96, 0, Math.PI * 2, 0, Math.PI / 2), glass)
  domeShell.position.y = domeBase
  body.add(domeShell)
  // 子午肋：torus 四分之一弧落在 XY 竖面（起于 +X 赤道、止于 +Y 顶），仅绕世界 Y 展开即成穹顶肋架
  const MR = 72
  for (let i = 0; i < MR; i++) {
    const rib = m(new THREE.TorusGeometry(domeR, 0.12, 8, 128, Math.PI / 2), iron)
    rib.rotation.y = (i / MR) * Math.PI * 2
    rib.position.y = domeBase
    body.add(rib)
  }
  // 纬环：12 道渐密纬度环（顶疏底密）
  for (let i = 1; i <= 12; i++) {
    const br = (i / 13) * (Math.PI / 2)
    const rr = domeR * Math.sin(br)
    const yy = domeR * Math.cos(br)
    const ring = m(new THREE.TorusGeometry(rr, 0.09, 8, 120), iron)
    ring.rotation.x = Math.PI / 2
    ring.position.y = domeBase + yy
    body.add(ring)
  }
  const domeBaseRing = m(new THREE.TorusGeometry(domeR, 0.3, 10, 96), stone)
  domeBaseRing.rotation.x = Math.PI / 2
  domeBaseRing.position.y = domeBase
  body.add(domeBaseRing)
  // 暖光檐环：穹顶基座 + 柱廊额枋各一道发光细环，入夜勾出穹顶轮廓（外部可见，日景仅如铜线）
  const eaveGlow = m(new THREE.TorusGeometry(domeR + 0.15, 0.1, 8, 96), lampGlow)
  eaveGlow.rotation.x = Math.PI / 2
  eaveGlow.position.y = domeBase + 0.28
  body.add(eaveGlow)
  const colonnadeGlow = m(new THREE.TorusGeometry(colR + 0.1, 0.08, 8, 96), lampGlow)
  colonnadeGlow.rotation.x = Math.PI / 2
  colonnadeGlow.position.y = BASE_Y + colH + 0.86
  body.add(colonnadeGlow)

  // ---- 顶端采光灯笼塔冠（发光心脏·「灯之三叠」之 E4 灯点）----
  const crownY = domeBase + domeR
  const crown = new THREE.Group()
  crown.position.y = crownY
  body.add(crown)
  const tholoss = m(new THREE.CylinderGeometry(2.6, 2.9, 0.5, 32), stone)
  tholoss.position.y = 0.25
  crown.add(tholoss)
  const lc = 12
  for (let i = 0; i < lc; i++) {
    const a = (i / lc) * Math.PI * 2
    const col = m(new THREE.CylinderGeometry(0.16, 0.18, 3.4, 12), iron)
    col.position.set(Math.cos(a) * 2.3, 0.5 + 1.7, Math.sin(a) * 2.3)
    crown.add(col)
  }
  const crownRing = m(new THREE.TorusGeometry(2.5, 0.16, 6, 32), stone)
  crownRing.rotation.x = Math.PI / 2
  crownRing.position.y = 0.5 + 3.4
  crown.add(crownRing)
  // 灯笼玻璃核心（发光心脏·外部可见：实体自发光筒，shot 端亦亮）
  const coreGlass = m(new THREE.CylinderGeometry(2.1, 2.1, 3.2, 24), glowCore)
  coreGlass.position.y = 0.5 + 1.7
  crown.add(coreGlass)
  const lanternLight = m(new THREE.SphereGeometry(2.0, 20, 16), lampGlow)
  lanternLight.position.y = 0.5 + 1.7
  crown.add(lanternLight)
  const crownCup = m(new THREE.ConeGeometry(2.7, 2.4, 24), iron)
  crownCup.position.y = 0.5 + 3.4 + 1.2
  crown.add(crownCup)
  const spire = m(new THREE.CylinderGeometry(0.06, 0.2, 2.4, 8), brass)
  spire.position.y = 0.5 + 3.4 + 2.4 + 1.2
  crown.add(spire)
  const orb = m(new THREE.SphereGeometry(0.42, 16, 12), brass)
  orb.position.y = 0.5 + 3.4 + 2.4 + 2.4 + 0.42
  crown.add(orb)
  const finial = m(new THREE.ConeGeometry(0.22, 0.9, 8), glowCore)
  finial.position.y = 0.5 + 3.4 + 2.4 + 2.4 + 0.9 + 0.45
  crown.add(finial)

  // ---- 内景（透过玻璃可见）：环植棕榈 + 中庭喷泉 ----
  const palmN = 14
  for (let i = 0; i < palmN; i++) {
    const a = (i / palmN) * Math.PI * 2
    const rr = 8.5 + (i % 2) * 1.6
    const palm = new THREE.Group()
    palm.position.set(Math.cos(a) * rr, BASE_Y + 0.2, Math.sin(a) * rr)
    palm.scale.setScalar(0.9 + (i % 3) * 0.12)
    const th = 3.4
    const tr = m(new THREE.CylinderGeometry(0.16, 0.28, th, 8), trunkMat)
    tr.position.y = th / 2
    palm.add(tr)
    for (let f = 0; f < 9; f++) {
      const fa = (f / 9) * Math.PI * 2
      const frond = m(new THREE.ConeGeometry(0.22, 2.8, 5), f % 2 ? leafA : leafB)
      frond.position.set(Math.cos(fa) * 1.3, th + 0.2, Math.sin(fa) * 1.3)
      frond.rotation.order = 'YXZ'
      frond.rotation.set(0, -fa, 0)
      frond.rotateZ(1.25)
      palm.add(frond)
    }
    body.add(palm)
  }
  // 中庭喷泉
  const f1 = new THREE.Group()
  f1.position.set(0, BASE_Y + 0.2, 0)
  const basin = m(new THREE.CylinderGeometry(2.6, 2.9, 0.5, 40), stone)
  basin.position.y = 0.25
  f1.add(basin)
  const basinWater = m(new THREE.CylinderGeometry(2.4, 2.4, 0.1, 40), water)
  basinWater.position.y = 0.5
  f1.add(basinWater)
  const stem = m(new THREE.CylinderGeometry(0.35, 0.5, 2.0, 16), stoneDark)
  stem.position.y = 1.4
  f1.add(stem)
  const bowl = m(new THREE.CylinderGeometry(1.3, 0.4, 0.4, 32), stone)
  bowl.position.y = 2.5
  f1.add(bowl)
  const jet = m(new THREE.CylinderGeometry(0.14, 0.5, 1.4, 12), water)
  jet.position.y = 3.3
  f1.add(jet)
  body.add(f1)

  // ---- 内部暖光（入夜「发光心脏」：光环廊 + 棕榈地灯 + 喷泉顶光球；小自发光体，日景不冲淡）----
  const galleryRing = m(new THREE.TorusGeometry(11.6, 0.22, 8, 96), lampGlow)
  galleryRing.rotation.x = Math.PI / 2
  galleryRing.position.y = domeBase - 0.4
  body.add(galleryRing)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const up = m(new THREE.SphereGeometry(0.34, 12, 10), lampGlow)
    up.position.set(Math.cos(a) * 9.4, BASE_Y + 0.7, Math.sin(a) * 9.4)
    body.add(up)
    const post = m(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6), stoneDark)
    post.position.set(Math.cos(a) * 9.4, BASE_Y + 0.35, Math.sin(a) * 9.4)
    body.add(post)
  }
  const jetGlow = m(new THREE.SphereGeometry(0.5, 14, 10), lampGlow)
  jetGlow.position.set(0, BASE_Y + 4.1, 0)
  body.add(jetGlow)

  // ================= 场地·方格庭园（site 豁免，铺满至宗地边缘）=================
  // 草皮满铺（细分带微起伏 + 随机小花，供面数与质感）
  const ground = new THREE.PlaneGeometry(40, 40, 96, 96)
  ground.rotateX(-Math.PI / 2)
  const gpos = ground.attributes.position as THREE.BufferAttribute
  const gcol: number[] = []
  const grassLight = new THREE.Color('#8CA47A')
  const grassDark = new THREE.Color('#7A9469')
  const flower = new THREE.Color('#E9D6E8')
  for (let i = 0; i < gpos.count; i++) {
    const x = gpos.getX(i)
    const z = gpos.getZ(i)
    const d = Math.hypot(x, z)
    gpos.setY(i, d > 17 ? (rng() - 0.5) * 0.5 : (rng() - 0.5) * 0.18)
    const c = grassLight.clone().lerp(grassDark, rng())
    if (rng() > 0.9 && d > 16 && d < 19.6) c.lerp(flower, 0.7)
    gcol.push(c.r, c.g, c.b)
  }
  ground.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3))
  const lawn = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 0.0, vertexColors: true }))
  lawn.receiveShadow = true
  lawn.castShadow = false
  lawn.position.y = 0.05
  site.add(lawn)

  // 射路（8 条放射步道 + 一道外环步道，均贴地，地被豁免）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const len = 20 - 15.4
    const path = m(new THREE.BoxGeometry(len, 0.06, 1.6), paving)
    path.position.set(Math.cos(a) * (15.4 + len / 2), 0.03, Math.sin(a) * (15.4 + len / 2))
    path.rotation.y = -a
    site.add(path)
  }
  // 外环步道：用一圈小方砖铺成，兼顾面数与细节
  const tileR = 18.4
  const tileN = 72
  for (let i = 0; i < tileN; i++) {
    const a = (i / tileN) * Math.PI * 2
    const t = m(new THREE.BoxGeometry(1.5, 0.06, 2.6), i % 2 ? paving : pavingB)
    t.position.set(Math.cos(a) * tileR, 0.03, Math.sin(a) * tileR)
    t.rotation.y = -a
    site.add(t)
  }

  // 四镜池（对角水景，倒映穹顶；低矮薄水，贴地豁免）
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    const px = Math.cos(a) * 17.2
    const pz = Math.sin(a) * 17.2
    const pool = new THREE.Group()
    pool.position.set(px, 0.0, pz)
    pool.rotation.y = -a
    const lip = m(new THREE.BoxGeometry(4.2, 0.24, 4.2), stone)
    lip.position.y = 0.12
    pool.add(lip)
    const pw2 = m(new THREE.BoxGeometry(3.6, 0.28, 3.6), water)
    pw2.position.y = 0.14
    pool.add(pw2)
    site.add(pool)
  }

  // 树阵 + 灯柱 + 石盆 + 长椅（沿外环，把绿铺到宗地边）
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2
    const rr = 17.6
    const sc = 1.1 + (i % 4) * 0.1
    const tree = ctx.blocks.tree({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, scale: sc, seed: hashInt(i * 7 + 3) })
    site.add(tree)
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16
    site.add(ctx.blocks.streetLamp({ x: Math.cos(a) * 18.6, z: Math.sin(a) * 18.6, h: 5 }))
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    site.add(ctx.blocks.urn({ x: Math.cos(a) * 16.4, z: Math.sin(a) * 16.4, scale: 1.4 }))
    site.add(ctx.blocks.bench({ x: Math.cos(a + 0.13) * 16.6, z: Math.sin(a + 0.13) * 16.6, rotY: -a + Math.PI / 2 }))
  }
  // 四角花坛绿篱（方格园气）
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2
    for (const side of [-1, 1]) {
      const hx = Math.cos(a) * 17.0 + Math.cos(a + Math.PI / 2) * (side * 2.6)
      const hz = Math.sin(a) * 17.0 + Math.sin(a + Math.PI / 2) * (side * 2.6)
      const hedge = ctx.blocks.hedge({ w: 3.4, d: 0.7, h: 0.9, x: hx, z: hz })
      hedge.rotation.y = -a
      site.add(hedge)
    }
  }

  root.updateMatrixWorld(true)
  return root
}

function hashInt(n: number): number {
  let h = (n | 0) * 0x9e3779b9
  h ^= h >>> 15
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  return h >>> 0
}
