import * as THREE from 'three'
import type { BuildCtx } from '../../../../lib/ctx'
import { stdMaterial } from '../../../../lib/blocks'

/**
 * b-000023 · 镜湖倒影湖 Mirror Lake —— E4 镜湖中央公园二期（1×2 宗地 40×20m，南排正对原点塔）
 * 母题「镜·穹·光」之「镜」：CBD 正北的呼吸孔——一片把原点塔北立面收进水面的静镜。
 * 零高度地景：矩形镜面湖（东西宽展）+ 中轴南北拱步桥（串「塔视线」，唯一 ≤2m 本体）+
 * 硬质南岸「百花坛」花境 + 环湖铺装/树阵/灯柱/石盆长椅 + 睡莲芦苇。兑现 D4/F4 临湖对景。
 * 局部原点 = 宗地中心地面；宗地 40×20，本体（桥）落 ±18×±8，余皆景观（site 豁免 R13，仍受 R2 ±20.5×±10.5）。
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

  // ---- 材质：石灰岩岸 / 暖色花境 / 锻铁灯柱 ----
  const stone = stdMaterial('#D9D6CF', { metalness: 0.0, roughness: 0.9 })
  const stoneWarm = stdMaterial('#CFC7B6', { metalness: 0.0, roughness: 0.88 })
  const stoneDark = stdMaterial('#A8A5A0', { metalness: 0.0, roughness: 0.92 })
  const glow = stdMaterial('#FFE7B8', { metalness: 0.0, roughness: 0.5, emissive: '#FFCF7A', emissiveIntensity: 1.8 })

  // 本体（仅拱步桥，参与 R13）
  const body = new THREE.Group()
  root.add(body)
  // 地景（site 豁免 R13）
  const site = new THREE.Group()
  site.userData.site = true
  root.add(site)

  // ================= 地景 =================
  // 场地铺装底（细分带微起伏，铺满至宗地边缘）
  const ground = new THREE.PlaneGeometry(40, 20, 160, 80)
  ground.rotateX(-Math.PI / 2)
  const gp = ground.attributes.position as THREE.BufferAttribute
  const gcol: number[] = []
  const cA = new THREE.Color('#C6C0B3')
  const cB = new THREE.Color('#B4AE9F')
  const cG = new THREE.Color('#8CA47A')
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i)
    const z = gp.getZ(i)
    const edge = Math.max(Math.abs(x) / 20, Math.abs(z) / 10)
    gp.setY(i, edge > 0.86 ? (rng() - 0.5) * 0.4 : (rng() - 0.5) * 0.05)
    // 中央偏绿、四周偏铺装
    const c = cA.clone().lerp(cB, rng() * 0.6)
    if (Math.abs(z) > 7.4 || Math.abs(x) > 17) c.copy(cG).lerp(new THREE.Color('#7A9469'), rng())
    gcol.push(c.r, c.g, c.b)
  }
  ground.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3))
  const lawn = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 0.0, vertexColors: true }))
  lawn.position.y = 0.05
  lawn.receiveShadow = true
  site.add(lawn)

  // ---- 矩形镜面湖：石造池壁 + 微起伏水面 ----
  const lakeW = 30
  const lakeD = 12
  const copingW = 0.9 // 岸压顶宽
  const wallH = 0.7
  const mkWall = (w: number, d: number, x: number, z: number) => {
    const b = m(new THREE.BoxGeometry(w, wallH, d), stoneWarm)
    b.position.set(x, wallH / 2, z)
    site.add(b)
    const cap = m(new THREE.BoxGeometry(w + 0.2, 0.14, d + 0.2), stone)
    cap.position.set(x, wallH + 0.07, z)
    site.add(cap)
  }
  mkWall(lakeW + copingW * 2, copingW, 0, lakeD / 2 + copingW / 2)
  mkWall(lakeW + copingW * 2, copingW, 0, -(lakeD / 2 + copingW / 2))
  mkWall(copingW, lakeD, lakeW / 2 + copingW / 2, 0)
  mkWall(copingW, lakeD, -(lakeW / 2 + copingW / 2), 0)

  // 水面（细分 + 微涟漪；顶 ≤0.6 豁免）
  const wgeo = new THREE.PlaneGeometry(lakeW, lakeD, 240, 96)
  wgeo.rotateX(-Math.PI / 2)
  const wp = wgeo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i)
    const z = wp.getZ(i)
    wp.setY(i, Math.sin(x * 0.9) * 0.03 + Math.cos(z * 1.3) * 0.025 + (rng() - 0.5) * 0.015)
  }
  wgeo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(wp.count * 3).fill(0).flatMap(() => {
    const c = new THREE.Color('#3E6B7A').lerp(new THREE.Color('#5C8A9A'), rng())
    return [c.r, c.g, c.b]
  }), 3))
  const waterMesh = new THREE.Mesh(wgeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0.25, emissive: new THREE.Color('#2E5866'), emissiveIntensity: 0.32, vertexColors: true, transparent: true, opacity: 0.92 }))
  waterMesh.position.y = 0.42
  site.add(waterMesh)

  // 睡莲（水面点缀：叶盘 + 花）
  for (let i = 0; i < 40; i++) {
    const x = (rng() - 0.5) * (lakeW - 3)
    const z = (rng() - 0.5) * (lakeD - 2)
    if (Math.abs(x) < 2.2 && Math.abs(z) < 6) continue // 让开中轴桥
    const pad = m(new THREE.CylinderGeometry(0.4 + rng() * 0.25, 0.4 + rng() * 0.25, 0.05, 12), stdMaterial('#5E7F52', { roughness: 0.9 }))
    pad.position.set(x, 0.45, z)
    site.add(pad)
    if (rng() > 0.55) {
      const lotus = m(new THREE.SphereGeometry(0.16, 8, 6), stdMaterial(rng() > 0.5 ? '#F2D9E4' : '#F5F1E0', { roughness: 0.7, emissive: '#F2D9E4', emissiveIntensity: 0.15 }))
      lotus.position.set(x, 0.55, z)
      site.add(lotus)
    }
  }

  // ---- 硬质南岸「百花坛」+ 北岸花境（数百朵小花，密集面数与色彩）----
  const flowerCols = ['#E9A7C0', '#F2E9D8', '#C9A7E9', '#E9C79A', '#E98A8A', '#F5F1E0']
  const beds: Array<[number, number, number, number]> = [
    [0, -(lakeD / 2 + copingW + 1.1), 26, 1.8], // 南岸主坛
    [0, lakeD / 2 + copingW + 1.1, 26, 1.6], // 北岸副坛
  ]
  for (const [bx, bz, bw, bd] of beds) {
    const soil = m(new THREE.BoxGeometry(bw, 0.3, bd), stdMaterial('#5A4632', { roughness: 1.0 }))
    soil.position.set(bx, 0.15, bz)
    site.add(soil)
    const n = Math.floor(bw * bd * 12)
    for (let i = 0; i < n; i++) {
      const fx = bx + (rng() - 0.5) * (bw - 0.6)
      const fz = bz + (rng() - 0.5) * (bd - 0.4)
      const h = 0.28 + rng() * 0.28
      const stem = m(new THREE.CylinderGeometry(0.02, 0.025, h, 5), stdMaterial('#5E7F52', { roughness: 0.9 }))
      stem.position.set(fx, 0.3 + h / 2, fz)
      site.add(stem)
      const bloom = m(new THREE.IcosahedronGeometry(0.1 + rng() * 0.06, 0), stdMaterial(flowerCols[i % flowerCols.length], { roughness: 0.7, emissive: flowerCols[i % flowerCols.length], emissiveIntensity: 0.12 }))
      bloom.position.set(fx, 0.3 + h, fz)
      site.add(bloom)
    }
  }
  // 南岸压顶石栏 + 石盆（硬质南岸 promenade）
  for (let i = 0; i <= 13; i++) {
    const x = -19.5 + (i / 13) * 39
    site.add(ctx.blocks.urn({ x, z: -(lakeD / 2 + copingW + 2.4), scale: 1.3 }))
  }

  // ---- 芦苇丛（湖角湿地）----
  for (const [cx, cz] of [[-lakeW / 2 + 1.5, lakeD / 2 - 1.5], [lakeW / 2 - 1.5, -lakeD / 2 + 1.5], [lakeW / 2 - 1.5, lakeD / 2 - 1.5], [-lakeW / 2 + 1.5, -lakeD / 2 + 1.5]] as const) {
    for (let i = 0; i < 14; i++) {
      const rx = cx + (rng() - 0.5) * 2
      const rz = cz + (rng() - 0.5) * 2
      const rh = 1.1 + rng() * 0.9
      const reed = m(new THREE.ConeGeometry(0.05, rh, 5), stdMaterial('#8C9E8B', { roughness: 0.95 }))
      reed.position.set(rx, rh / 2, rz)
      site.add(reed)
    }
  }

  // ---- 环湖树阵 + 灯柱 + 长椅（把绿铺到宗地边）----
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const tx = Math.cos(a) * 16.4
    const tz = Math.sin(a) * 7.6
    site.add(ctx.blocks.tree({ x: tx, z: tz, scale: 1.2 + (i % 3) * 0.15, seed: i * 13 + 5 }))
  }
  for (let i = 0; i < 8; i++) {
    const x = -17 + (i / 7) * 34
    site.add(ctx.blocks.streetLamp({ x, z: -(lakeD / 2 + copingW + 2.4), h: 4.6 }))
    if (i % 2 === 0) site.add(ctx.blocks.bench({ x, z: lakeD / 2 + copingW + 1.6, rotY: Math.PI }))
  }
  // 中轴南北灯柱（引向原点塔的「塔视线」地灯）
  for (let i = 0; i < 6; i++) {
    const z = -8.4 + (i / 5) * 16.8
    const b = m(new THREE.BoxGeometry(0.3, 0.3, 0.3), glow)
    b.position.set(2.6, 0.2, z)
    site.add(b)
    const b2 = b.clone()
    b2.position.x = -2.6
    site.add(b2)
  }

  // ================= 本体：中轴拱步桥（南北向，串塔视线；≤2m）=================
  const bridge = new THREE.Group()
  body.add(bridge)
  const span = lakeD + copingW * 2 // 跨全湖南北
  const segs = 28
  const rise = 1.35
  const deckW = 2.8
  const yAt = (t: number) => rise * Math.sin(Math.PI * t) // t 0..1 拱高
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs
    const t1 = (i + 1) / segs
    const z0 = -span / 2 + t0 * span
    const z1 = -span / 2 + t1 * span
    const y0 = 0.5 + yAt(t0)
    const y1 = 0.5 + yAt(t1)
    const seg = m(new THREE.BoxGeometry(deckW, 0.18, (span / segs) * 1.08), stoneWarm)
    seg.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2)
    seg.rotation.x = Math.atan2(y1 - y0, z1 - z0)
    bridge.add(seg)
    // 两侧栏板扶手 + 望柱
    for (const sx of [-1, 1]) {
      const rail = m(new THREE.BoxGeometry(0.14, 0.1, (span / segs) * 1.08), stone)
      rail.position.set(sx * deckW * 0.5, (y0 + y1) / 2 + 0.72, (z0 + z1) / 2)
      rail.rotation.x = seg.rotation.x
      bridge.add(rail)
      if (i % 2 === 0) {
        const post = m(new THREE.BoxGeometry(0.18, 0.72, 0.18), stone)
        post.position.set(sx * deckW * 0.5, (y0 + y1) / 2 + 0.36, (z0 + z1) / 2)
        bridge.add(post)
      }
    }
  }
  // 拱券（桥下两道半圆拱肋，从侧面可见）
  for (const sx of [-deckW / 2 + 0.2, deckW / 2 - 0.2]) {
    const arch = m(new THREE.TorusGeometry(span / 2, 0.16, 8, 48, Math.PI), stone)
    arch.rotation.y = Math.PI / 2
    arch.position.set(sx, 0.5, 0)
    arch.scale.set(1, rise / (span / 2), 1) // 椭圆拱：跨度=桥跨、拱顶=桥面顶，紧贴桥底不外突
    bridge.add(arch)
  }
  // 桥两头抱鼓石 + 石狮墩
  for (const sz of [-span / 2 - 0.4, span / 2 + 0.4]) {
    const pier = m(new THREE.BoxGeometry(deckW + 1.2, 1.0, 1.0), stone)
    pier.position.set(0, 0.5, sz)
    bridge.add(pier)
    const drum = m(new THREE.CylinderGeometry(0.42, 0.42, 0.4, 16), stoneDark)
    drum.rotation.z = Math.PI / 2
    drum.position.set(0, 1.1, sz)
    bridge.add(drum)
  }

  root.updateMatrixWorld(true)
  return root
}
