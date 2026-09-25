import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { bookwall, hexLantern } from '../../blocks/glm-5.3/library-parts'

/** 巴别图书馆 · b-000001 · E5-05（模都城市原点）
 *  博尔赫斯《巴别图书馆》：宇宙由无限而相同的六边形回廊构成。
 *  本楼以正六边形为唯一母题：六面拱廊基座 — 六角柱阵书廊 — 六面密棂阁楼 —
 *  鼓座圆穹 — 六柱采光亭；内外共 17 面 bookwall 书海（自建积木，顶点色合并几何）。
 *  本体全部落于中央 16×16 红线；台基台阶 ≤0.6m 为地被层；景观件挂 site 豁免。 */

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }
const D = Math.PI / 180

export default function build(ctx: BuildCtx): THREE.Object3D {
  const rng = ctx.rng
  const B = ctx.blocks
  const root = new THREE.Group()

  // ---------- 材质（参数化：纯色 + 金属度/粗糙度/自发光） ----------
  const std = (color: string, rough = 0.8, metal = 0.1, emissive?: string, ei = 1) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: emissive ?? '#000000', emissiveIntensity: ei })
  const M = {
    grass:     std('#7D8F6F', 0.95),
    pave:      std('#B9B3A6', 0.88),
    paveDark:  std('#8F897C', 0.9),
    stoneBase: std('#B3AC9E', 0.9),
    stone:     std('#C9C4B8', 0.82),
    trim:      std('#DDD8CC', 0.72),
    trimDeep:  std('#ABA694', 0.8),
    wood:      std('#4E3B28', 0.75),
    copper:    std('#6E8B74', 0.62, 0.2),
    copperDark: std('#5A7364', 0.68, 0.15),
    gold:      std('#C9A227', 0.35, 0.6, '#6B5E2E', 0.25),
    glowWarm:  std('#FFE9A8', 0.5, 0, '#FFD98A', 1.5),
  }

  // ---------- 六边形几何 helper ----------
  // 六棱柱一律不旋转（默认顶点方位 {30°+60k}）：inspect 的包围盒按本地 AABB 经
  // 旋转矩阵保守放大计，旋转的六棱柱会被量出 1.37×半径 的对角包络而误判超线；
  // 不旋转时 AABB 恰为真实投影（x 向 apothem、z 向半径）。故面法线取 {60k}。
  const faceAz = (i: number) => i * 60 * D                       // 面 i 法线方位（面 1 朝 60° 为正门）
  const vertAz = (k: number) => (k * 60 + 30) * D                // 顶点 k 方位
  /** 把「法线朝 +Z 的板件」安放到方位角 az、半径 r 处（局部 X 落到切向，y 为底） */
  const place = (o: THREE.Object3D, az: number, r: number, y = 0) => {
    o.rotation.y = Math.PI / 2 - az
    o.position.set(r * Math.cos(az), y, r * Math.sin(az))
    return o
  }
  /** 六棱柱（默认顶点方位，不旋转），底面中心在 (x, y, z) */
  const hexPrism = (r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
    const m = mesh(new THREE.CylinderGeometry(r, r, h, 6), mat)
    m.position.set(x, y + h / 2, z)
    return m
  }
  const R = 7.2                                              // 主体外接圆半径（红线 8）
  const AP = R * Math.cos(30 * D)                            // 主体内切半径 ≈ 6.24
  const DOOR_FACE = 1                                        // 正门面（法线 +Z）

  // ---------- 场地：草皮满铺 + 六向放射步道 ----------
  const lawn = mesh(new THREE.BoxGeometry(20, 0.1, 20), M.grass)
  lawn.position.y = 0.05; lawn.castShadow = false; root.add(lawn)
  for (let k = 0; k < 6; k++) {                              // 放射步道（顶点方位）
    const az = vertAz(k)
    const path = place(mesh(new THREE.BoxGeometry(1.6, 0.06, 2.2), M.pave), az, 8.15)
    path.position.y = 0.1; root.add(path)
    for (let j = 0; j < 2; j++) {                            // 铺装分缝
      root.add(place(mesh(new THREE.BoxGeometry(1.62, 0.02, 0.1), M.paveDark), az, 8.55 + j * 0.8, 0.16))
    }
  }
  // 正南主轴大道（面 1 方位 90°）：加宽 + 道牙
  {
    const az = faceAz(DOOR_FACE)
    const mall = place(mesh(new THREE.BoxGeometry(2.4, 0.06, 2.6), M.pave), az, 8.35)
    mall.position.y = 0.1; root.add(mall)
    for (const s of [-1, 1]) {
      root.add(place(mesh(new THREE.BoxGeometry(0.26, 0.14, 2.6), M.paveDark), az + s * Math.atan2(1.45, 8.35), Math.hypot(8.35, 1.45), 0.07))
    }
  }

  // ---------- 台基：四级六棱台阶 + 主台（全部顶高 ≤0.6m 地被层） ----------
  const stepR = [9.3, 9.02, 8.74, 8.46]
  for (let s = 0; s < 4; s++) root.add(hexPrism(stepR[s], 0.125, M.stoneBase, 0, 0.1 + s * 0.125, 0))
  root.add(hexPrism(8.2, 0.5, M.stone, 0, 0.1, 0))           // 主台：0.1 → 0.6
  const baseY = 0.6                                          // 主体起建标高

  // 台缘栏杆（本体，端点 ≤8.0 红线内）——六面各一段 + 端柱
  for (let i = 0; i < 6; i++) {
    const az = faceAz(i)
    root.add(place(B.railing({ w: 6.0, h: 0.85, color: '#DDD8CC' }), az, 7.2, baseY))
    for (const s of [-1, 1]) {
      const off = 2.8, r = 7.2
      root.add(hexPrism(0.14, 1.0, M.trim, r * Math.cos(az) - Math.sin(az) * off * s, baseY, r * Math.sin(az) + Math.cos(az) * off * s))
    }
  }

  // ---------- 一层基座（h 4.2）：六面拱廊 + 角部扶壁 ----------
  const baseH = 4.2
  for (let i = 0; i < 6; i++) {
    const isDoor = i === DOOR_FACE
    root.add(place(B.archWall({
      w: 6.9, h: baseH, archW: isDoor ? 2.6 : 2.3, archH: isDoor ? 3.7 : 3.3, depth: 0.5, color: '#C9C4B8',
    }), faceAz(i), AP - 0.25, baseY))
    for (const s of [-1, 1]) {                               // 拱侧基座盲拱饰
      root.add(place(B.archPanel({ w: 1.05, h: 2.2, depth: 0.16, color: '#ABA694' }), faceAz(i) + s * Math.atan2(2.6, AP), Math.hypot(AP, 2.6), baseY + 0.35))
    }
    if (!isDoor) {                                           // 拱洞内退书墙（书海透出拱外）
      root.add(place(bookwall({ w: 5.4, h: 3.4, rows: 7, rand: rng }), faceAz(i), AP - 0.62, baseY + 0.3))
    } else {                                                 // 正门：双扇木门 + 石槛 + 楣匾
      for (const s of [-1, 1]) {
        root.add(place(mesh(new THREE.BoxGeometry(1.22, 3.15, 0.14), M.wood), faceAz(i) + s * Math.atan2(0.63, AP - 0.05), Math.hypot(AP - 0.05, 0.63), baseY + 0.05))
      }
      root.add(place(mesh(new THREE.BoxGeometry(2.9, 0.12, 0.7), M.stoneBase), faceAz(i), AP - 0.15, baseY - 0.02))
      root.add(place(B.archPanel({ w: 1.7, h: 0.85, depth: 0.2, color: '#DDD8CC' }), faceAz(i), AP + 0.28, baseY + 3.15))
      for (const s of [-1, 1]) {                             // 正门两侧门墩灯（六棱石灯缩尺版）
        const azD = faceAz(i) + s * Math.atan2(1.9, 8.9)
        root.add(hexLantern({ x: Math.hypot(8.9, 1.9) * Math.cos(azD), z: Math.hypot(8.9, 1.9) * Math.sin(azD), scale: 0.62 }))
      }
    }
  }
  for (let k = 0; k < 6; k++) {                              // 角部扶壁（顶点方位）+ 顶刹
    const az = vertAz(k), cx = 7.32 * Math.cos(az), cz = 7.32 * Math.sin(az)
    root.add(hexPrism(0.5, baseH + 0.9, M.stone, cx, baseY, cz))
    const cap = mesh(new THREE.CylinderGeometry(0.06, 0.56, 0.42, 6), M.trimDeep)
    cap.position.set(cx, baseY + baseH + 0.9 + 0.21, cz); root.add(cap)
    const tip = mesh(new THREE.SphereGeometry(0.12, 10, 8), M.gold)
    tip.position.set(cx, baseY + baseH + 1.35, cz); root.add(tip)
  }
  root.add(hexPrism(7.5, 0.3, M.trim, 0, baseY + baseH, 0))          // 一层顶腰线（双环）
  root.add(hexPrism(7.62, 0.13, M.trimDeep, 0, baseY + baseH + 0.3, 0))

  // ---------- 二层书廊（h 3.8）：外圈六棱柱阵 + 满架书墙 + 廊栏杆 ----------
  const galY = baseY + baseH + 0.43
  const galH = 3.8
  root.add(hexPrism(6.95, 0.16, M.stone, 0, galY - 0.16, 0))         // 廊楼板（兼作一层厅顶）
  for (let i = 0; i < 6; i++) {
    const az = faceAz(i)
    root.add(place(bookwall({ w: 6.45, h: galH - 0.25, rows: 8, rand: rng }), az, AP - 0.32, galY + 0.05))
    for (const off of [-2.7, -0.9, 0.9, 2.7]) {              // 柱阵：每面 4 根六棱柱
      const px = Math.cos(az) * 6.62 - Math.sin(az) * off
      const pz = Math.sin(az) * 6.62 + Math.cos(az) * off
      root.add(hexPrism(0.19, galH - 0.4, M.trim, px, galY + 0.2, pz))
      root.add(hexPrism(0.3, 0.22, M.trimDeep, px, galY + galH - 0.22, pz))
      root.add(hexPrism(0.3, 0.22, M.trimDeep, px, galY, pz))
    }
    root.add(place(B.railing({ w: 6.0, h: 0.92, color: '#DDD8CC' }), az, 6.85, galY))
    for (const off of [-1.8, 0, 1.8]) {                      // 柱顶盲拱连系
      root.add(place(B.archPanel({ w: 1.35, h: 0.95, depth: 0.18, color: '#C9C4B8' }), az + Math.atan2(off, 6.62), Math.hypot(6.62, off), galY + galH - 0.95))
    }
  }
  root.add(hexPrism(7.05, 0.28, M.trim, 0, galY + galH, 0))          // 二层顶腰线（双环）
  root.add(hexPrism(7.18, 0.12, M.trimDeep, 0, galY + galH + 0.28, 0))

  // ---------- 三层阁楼（h 3.4）：密棂窗 + 暖光 + 盲拱檐带 ----------
  const atY = galY + galH + 0.4
  const atH = 3.4
  for (let i = 0; i < 6; i++) {
    const az = faceAz(i)
    root.add(place(B.wall({ w: 5.9, h: atH, d: 0.35, color: '#DDD8CC' }), az, AP - 1.15, atY))
    root.add(place(B.windowStrip({ w: 5.2, h: 2.5, d: 0.1 }), az, AP - 1.0, atY + 0.45))
    root.add(place(B.latticePanel({ w: 5.4, h: 2.9, cols: 13, rows: 9, bar: 0.11, color: '#4E3B28' }), az, AP - 0.9, atY + 0.25))
    for (let a = 0; a < 6; a++) {                            // 檐带盲拱一排
      const off = -2.45 + a * 0.98
      root.add(place(B.archPanel({ w: 0.8, h: 1.0, depth: 0.15, color: '#ABA694' }), az + Math.atan2(off, AP - 0.85), Math.hypot(AP - 0.85, off), atY + 0.3))
    }
  }
  root.add(hexPrism(6.55, 0.34, M.trim, 0, atY + atH, 0))            // 阁楼顶三叠涩出大檐
  root.add(hexPrism(6.82, 0.15, M.trimDeep, 0, atY + atH + 0.34, 0))
  root.add(hexPrism(6.35, 0.18, M.trim, 0, atY + atH + 0.49, 0))
  for (let k = 0; k < 6; k++) {                              // 六顶点小尖塔
    const az = vertAz(k), cx = 6.42 * Math.cos(az), cz = 6.42 * Math.sin(az)
    root.add(hexPrism(0.15, 0.95, M.stone, cx, atY + atH + 0.62, cz))
    const cone = mesh(new THREE.CylinderGeometry(0.02, 0.3, 0.55, 6), M.copperDark)
    cone.position.set(cx, atY + atH + 1.78, cz); root.add(cone)
  }

  // ---------- 鼓座 + 六圆窗 ----------
  const drumY = atY + atH + 0.67
  const drumH = 2.2
  const drumBase = mesh(new THREE.CylinderGeometry(4.55, 4.55, 0.18, 48), M.trimDeep)
  drumBase.position.y = drumY - 0.09; root.add(drumBase)
  const drum = mesh(new THREE.CylinderGeometry(4.35, 4.35, drumH, 48), M.stone)
  drum.position.y = drumY + drumH / 2; root.add(drum)
  for (let k = 0; k < 6; k++) {                              // 六圆窗（面方位）：轴向用四元数对准径向
    const az = faceAz(k)
    const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az))
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    const frame = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 24), M.trimDeep)
    frame.quaternion.copy(q); frame.position.copy(dir.clone().multiplyScalar(4.32)); frame.position.y = drumY + drumH / 2; root.add(frame)
    const win = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.16, 24), M.glowWarm)
    win.quaternion.copy(q); win.position.copy(dir.clone().multiplyScalar(4.38)); win.position.y = drumY + drumH / 2; root.add(win)
    const sill = mesh(new THREE.BoxGeometry(0.95, 0.12, 0.3), M.trim)      // 窗台下托架
    sill.rotation.y = Math.PI / 2 - az
    sill.position.copy(dir.clone().multiplyScalar(4.4)); sill.position.y = drumY + drumH / 2 - 0.62; root.add(sill)
  }
  const drumTop = mesh(new THREE.CylinderGeometry(4.6, 4.45, 0.22, 48), M.trim)
  drumTop.position.y = drumY + drumH + 0.11; root.add(drumTop)

  // ---------- 穹顶：铜绿壳（96 段）+ 24 肋 ----------
  const domeY = drumY + drumH + 0.22
  const domeR = 4.15, domeH = 3.5
  const profile: THREE.Vector2[] = []
  for (let t = 0; t <= 34; t++) {
    const a = (t / 34) * Math.PI / 2
    profile.push(new THREE.Vector2(domeR * Math.pow(Math.cos(a), 0.82), domeH * Math.sin(a)))
  }
  const domeMat = std('#6E8B74', 0.62, 0.2)
  domeMat.side = THREE.DoubleSide
  const dome = mesh(new THREE.LatheGeometry(profile, 96), domeMat)
  dome.position.y = domeY; root.add(dome)
  for (let rib = 0; rib < 24; rib++) {                       // 24 肋：每肋 10 段渐细，group 绕 Y 定方位
    const az = rib * 15 * D
    const grp = new THREE.Group(); grp.rotation.y = az
    for (let s = 0; s < 10; s++) {
      const a0 = (s / 10) * Math.PI / 2, a1 = ((s + 1) / 10) * Math.PI / 2
      const x0 = domeR * Math.pow(Math.cos(a0), 0.82) + 0.05, y0 = domeH * Math.sin(a0)
      const x1 = domeR * Math.pow(Math.cos(a1), 0.82) + 0.05, y1 = domeH * Math.sin(a1)
      const w = 0.19 - s * 0.014
      const seg = mesh(new THREE.BoxGeometry(w, Math.hypot(x1 - x0, y1 - y0) + 0.08, 0.15), M.copperDark)
      seg.position.set((x0 + x1) / 2, domeY + (y0 + y1) / 2, 0)
      seg.rotation.z = Math.atan2(y1 - y0, x0 - x1)
      grp.add(seg)
    }
    root.add(grp)
  }
  const domeRing = mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.24, 48), M.copperDark)
  domeRing.position.y = domeY + 0.12; root.add(domeRing)
  for (let k = 0; k < 24; k++) {                             // 穹底檐口齿饰一圈（对应 24 肋）
    const az = k * 15 * D
    const dent = mesh(new THREE.BoxGeometry(0.16, 0.18, 0.22), M.trim)
    dent.rotation.y = Math.PI / 2 - az
    dent.position.set(4.28 * Math.cos(az), domeY + 0.32, 4.28 * Math.sin(az)); root.add(dent)
  }

  // ---------- 采光亭：压顶环 + 六柱 + 暖芯 + 六棱攒尖 + 宝珠尖针 ----------
  const lantY = domeY + domeH - 0.25
  const collar = mesh(new THREE.CylinderGeometry(0.72, 0.86, 0.34, 24), M.trim)
  collar.position.y = lantY + 0.17; root.add(collar)
  for (let k = 0; k < 6; k++) root.add(hexPrism(0.09, 1.35, M.trim, 0.88 * Math.cos(vertAz(k)), lantY + 0.34, 0.88 * Math.sin(vertAz(k))))
  const beacon = mesh(new THREE.CylinderGeometry(0.66, 0.66, 1.05, 6), M.glowWarm)
  beacon.position.y = lantY + 0.34 + 0.525; root.add(beacon)
  const capPrism = mesh(new THREE.CylinderGeometry(0.98, 0.8, 0.16, 6), M.trimDeep)
  capPrism.position.y = lantY + 1.85; root.add(capPrism)
  const spire = mesh(new THREE.CylinderGeometry(0.02, 0.92, 0.85, 6), M.copper)
  spire.position.y = lantY + 1.93 + 0.425; root.add(spire)
  const finial = mesh(new THREE.SphereGeometry(0.17, 16, 12), M.gold)
  finial.position.y = lantY + 1.93 + 0.85 + 0.17; root.add(finial)
  const needle = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), M.gold)
  needle.position.y = lantY + 1.93 + 0.85 + 0.34 + 0.275; root.add(needle)

  // ---------- 内厅：环厅书库 + 中央读经台（拱门/柱廊视线可达） ----------
  root.add(hexPrism(6.6, 0.06, M.paveDark, 0, baseY, 0))             // 内厅铺装
  for (let i = 0; i < 6; i++) {                              // 内圈书墙：与外拱洞书墙夹成书库回廊
    root.add(place(bookwall({ w: 4.6, h: 3.5, rows: 7, rand: rng }), faceAz(i), 3.35, baseY + 0.06))
  }
  root.add(hexPrism(1.85, 0.75, M.stoneBase, 0, baseY + 0.06, 0))    // 读经台两级
  root.add(hexPrism(1.4, 0.28, M.stone, 0, baseY + 0.81, 0))
  root.add(hexPrism(0.42, 1.05, M.wood, 0, baseY + 1.09, 0))         // 六棱读经架
  const book = mesh(new THREE.BoxGeometry(0.5, 0.09, 0.36), std('#8C6A4A', 0.8))
  book.position.y = baseY + 2.14; book.rotation.z = 0.22; root.add(book)   // 摊开的大书
  const halo = mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 32), M.gold)
  halo.rotation.x = Math.PI / 2; halo.position.y = baseY + 2.37; root.add(halo)   // 经架上金环
  {                                                         // 中央吊灯：自一层厅顶垂下，照亮读经台
    const rod = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.35, 8), M.trimDeep)
    rod.position.y = galY - 0.16 - 0.675; root.add(rod)
    const pan = mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.14, 6), M.trimDeep)
    pan.position.y = galY - 0.16 - 1.35 - 0.07; root.add(pan)
    const flame = mesh(new THREE.SphereGeometry(0.16, 12, 10), M.glowWarm)
    flame.position.y = galY - 0.16 - 1.42; root.add(flame)
    const ring = mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 6), M.gold)
    ring.rotation.x = Math.PI / 2; ring.position.y = galY - 0.16 - 1.5; root.add(ring)
    for (let k = 0; k < 6; k++) {                            // 环上六盏小灯
      const az = vertAz(k)
      const bud = mesh(new THREE.SphereGeometry(0.07, 10, 8), M.glowWarm)
      bud.position.set(0.55 * Math.cos(az), galY - 0.16 - 1.5, 0.55 * Math.sin(az)); root.add(bud)
    }
  }

  // ---------- 场地景观：树阵 / 六棱石灯 / 长椅 / 绿篱角 / 石盆 ----------
  for (let k = 0; k < 6; k++) {                              // 树：面方位 r 8.75（枝展控制在红线内）
    const az = faceAz(k) + (rng() - 0.5) * 6 * D
    root.add(B.tree({ x: 8.75 * Math.cos(az), z: 8.75 * Math.sin(az), scale: 0.88 + rng() * 0.14, seed: 11 + k }))
  }
  for (let k = 0; k < 6; k++) {                              // 六棱石灯：放射步道口两侧
    for (const s of [-1, 1]) {
      const az = vertAz(k) + s * 13 * D
      root.add(hexLantern({ x: 9.5 * Math.cos(az), z: 9.5 * Math.sin(az), scale: 0.92 }))
    }
  }
  for (let k = 0; k < 6; k++) {                              // 长椅：面方位 ±25°，面向建筑
    const az = faceAz(k) + 25 * D
    root.add(B.bench({ x: 8.7 * Math.cos(az), z: 8.7 * Math.sin(az), rotY: -az }))
  }
  for (let k = 0; k < 4; k++) {                              // 四斜角绿篱 + 石盆
    const az = (45 + 90 * k) * D
    const hx = 9.2 * Math.cos(az), hz = 9.2 * Math.sin(az)
    for (const rot of [az - 45 * D, az + 45 * D]) {
      const h = B.hedge({ w: 1.4, d: 0.7, h: 0.75 })
      h.rotation.y = -rot + Math.PI / 2; h.position.set(hx, 0, hz); root.add(h)
    }
    root.add(B.urn({ scale: 1.1, color: '#B3AC9E', x: 8.55 * Math.cos(az + 22.5 * D), z: 8.55 * Math.sin(az + 22.5 * D) }))
  }

  return root
}
