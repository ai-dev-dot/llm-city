import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** 挂载期静态烘焙：把 agent 建筑代码产出的上千个独立小 mesh（每根梁柱/每扇窗一个）
 *  合并为「每规约材质 × 每几何签名」一个 mesh，draw call 从数千降到几十。
 *  规约材质只在单栋建筑内部共享——滤镜系统按建筑整体换色（filters.applyTo），
 *  跨建筑共享材质会导致滤镜串色，因此 bake 以建筑 root 为界。 */

export interface BakeStats {
  merged: boolean
  meshesBefore: number
  meshesAfter: number
  materialsBefore: number
  materialsAfter: number
}

export interface BakeResult { root: THREE.Object3D; stats: BakeStats }

/** 少于此 mesh 数的建筑不做合并（本身已高效，避免无谓拷贝） */
const MIN_MESHES = 8

const MAP_SLOTS = ['map', 'normalMap', 'alphaMap', 'aoMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'bumpMap'] as const

const num = (v: number | undefined): string => (v === undefined ? '-' : String(v))

/** 材质规约键：同键材质在本次 bake 内共享同一实例。返回 null = 不认识的光照模型，只按实例共享。 */
function canonicalKey(m: THREE.Material): string | null {
  const std = m as THREE.MeshStandardMaterial
  const isStd = (std as unknown as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial === true
  const isBasic = (std as unknown as { isMeshBasicMaterial?: boolean }).isMeshBasicMaterial === true
  if (!isStd && !isBasic) return null
  const bits = [
    m.type,
    std.color?.getHexString() ?? '-',
    num(std.roughness), num(std.metalness),
    std.emissive?.getHexString() ?? '-',
    num(std.emissiveIntensity),
    num(std.opacity), std.transparent ? 1 : 0,
    std.side, std.vertexColors ? 1 : 0, std.flatShading ? 1 : 0, std.wireframe ? 1 : 0,
    std.depthWrite === false ? 0 : 1, std.blending,
  ]
  for (const slot of MAP_SLOTS) bits.push(std[slot] ? `t:${std[slot]!.uuid}` : '')
  return bits.join('|')
}

/** mergeGeometries 要求同桶几何属性集与索引性完全一致 */
function attrSig(g: THREE.BufferGeometry): string {
  return (g.index ? 'I|' : 'N|') + Object.keys(g.attributes).sort().join('+')
}

/** 多材质 geometry.groups 切片（索引几何先转非索引，组区间即顶点区间） */
function sliceGeometry(g: THREE.BufferGeometry, start: number, count: number): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry()
  const src = g.index ? g.toNonIndexed() : g
  for (const name of Object.keys(src.attributes)) {
    const a = src.attributes[name] as THREE.BufferAttribute
    const arr = (a.array as Float32Array).slice(start * a.itemSize, (start + count) * a.itemSize)
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize))
  }
  if (src !== g) src.dispose()
  return out
}

interface Entry { geo: THREE.BufferGeometry; mat: THREE.Material; cast: boolean; receive: boolean }

export function bakeBuild(root: THREE.Object3D): BakeResult {
  const empty: BakeStats = { merged: false, meshesBefore: 0, meshesAfter: 0, materialsBefore: 0, materialsAfter: 0 }
  try {
    const meshesAll: THREE.Mesh[] = []
    root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshesAll.push(o as THREE.Mesh) })
    if (meshesAll.length < MIN_MESHES) {
      return { root, stats: { merged: false, meshesBefore: meshesAll.length, meshesAfter: meshesAll.length, materialsBefore: 0, materialsAfter: 0 } }
    }
    root.updateMatrixWorld(true)
    const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert()
    const stats: BakeStats = { merged: false, meshesBefore: meshesAll.length, meshesAfter: meshesAll.length, materialsBefore: 0, materialsAfter: 0 }

    // 几何使用计数：独占几何可原地变换；还被告不可合并 mesh 引用的几何不可处置
    const geoUse = new Map<string, { total: number; kept: number }>()
    const matsBefore = new Set<string>()
    for (const m of meshesAll) {
      const u = geoUse.get(m.geometry.uuid) ?? { total: 0, kept: 0 }
      u.total++
      geoUse.set(m.geometry.uuid, u)
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mm of mats) if (mm) matsBefore.add(mm.uuid)
    }
    stats.materialsBefore = matsBefore.size

    // 不可合并 mesh（蒙皮/形变/不可见/无材质）与无网格对象（Sprite/Line）整体保留
    const unmergeable = new Set<THREE.Mesh>()
    for (const m of meshesAll) {
      const skinned = (m as THREE.SkinnedMesh).isSkinnedMesh === true
      const morph = Object.keys(m.geometry.morphAttributes ?? {}).length > 0
      const noMat = Array.isArray(m.material) ? m.material.length === 0 : !m.material
      if (skinned || morph || noMat || m.visible === false) unmergeable.add(m)
    }
    for (const m of unmergeable) geoUse.get(m.geometry.uuid)!.kept++
    const keepers = new Set<THREE.Object3D>()
    root.traverse((o) => {
      if (o === root) return
      const m = o as THREE.Mesh
      if (m.isMesh) { if (unmergeable.has(m)) keepers.add(m); return }
      let hasMesh = false
      o.traverse((c) => { if ((c as THREE.Mesh).isMesh) hasMesh = true })
      if (!hasMesh) keepers.add(o)
    })
    // 嵌套去重：祖先已是保留对象的候选不再单独保留（否则同粒子重复渲染两次）
    const keeperList = [...keepers].filter((o) => {
      for (let p = o.parent; p && p !== root; p = p.parent) if (keepers.has(p)) return false
      return true
    })

    // 收集合并条目（世界→root 局部空间已烘入几何）
    const buckets = new Map<string, Entry[]>()
    const matByKey = new Map<string, THREE.Material>()
    const leftover = new Set<THREE.BufferGeometry>()   // 已被拷贝/切片替代的原几何（是否可处置最后统一判定）
    for (const m of meshesAll) {
      if (unmergeable.has(m)) continue
      const geo = m.geometry
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      const use = geoUse.get(geo.uuid)!
      const multi = Array.isArray(m.material) && geo.groups.length > 1
      const push = (g: THREE.BufferGeometry, mat: THREE.Material) => {
        const key0 = canonicalKey(mat)
        const matKey = key0 ?? `uuid:${mat.uuid}`
        if (!matByKey.has(matKey)) matByKey.set(matKey, key0 === null ? mat : mat.clone())
        const key = `${matKey}##${attrSig(g)}`
        const list = buckets.get(key) ?? []
        list.push({ geo: g, mat: matByKey.get(matKey)!, cast: m.castShadow, receive: m.receiveShadow })
        buckets.set(key, list)
      }
      if (multi) {
        for (const grp of geo.groups) {
          const mat = mats[grp.materialIndex ?? 0]
          if (mat) push(sliceGeometry(geo, grp.start, grp.count), mat)
        }
        if (use.kept === 0) leftover.add(geo)
      } else {
        const sole = use.kept === 0 && use.total === 1
        const g = sole ? geo : geo.clone()
        if (!sole && use.kept === 0) leftover.add(geo)
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rootInv, m.matrixWorld))
        push(g, mats[0])
      }
    }

    // 组装新 root：合并 mesh 落在 root 局部空间（恒等变换），保留对象拍平挂顶层
    const newRoot = new THREE.Group()
    newRoot.name = root.name
    newRoot.position.copy(root.position)
    newRoot.quaternion.copy(root.quaternion)
    newRoot.scale.copy(root.scale)
    const finalGeoms = new Set<THREE.BufferGeometry>()
    const flatten = (o: THREE.Object3D) => {
      new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld).decompose(o.position, o.quaternion, o.scale)
      newRoot.add(o)
    }
    let meshesAfter = 0
    for (const list of buckets.values()) {
      if (list.length === 0) continue
      let geo: THREE.BufferGeometry | null = null
      if (list.length === 1) {
        geo = list[0].geo
      } else {
        geo = mergeGeometries(list.map((e) => e.geo), false)
        if (geo) for (const e of list) e.geo.dispose()
      }
      if (!geo) {
        // 合并失败兜底：逐个拍平保留（属性不齐等罕见情形）
        for (const e of list) {
          const mesh = new THREE.Mesh(e.geo, e.mat)
          mesh.castShadow = e.cast; mesh.receiveShadow = e.receive
          newRoot.add(mesh); meshesAfter++
          finalGeoms.add(e.geo)
        }
        continue
      }
      const mesh = new THREE.Mesh(geo, list[0].mat)
      mesh.castShadow = list.some((e) => e.cast)
      mesh.receiveShadow = list.some((e) => e.receive)
      newRoot.add(mesh)
      finalGeoms.add(geo)
      meshesAfter++
    }
    for (const o of keeperList) { flatten(o); o.traverse((c) => { if ((c as THREE.Mesh).isMesh) meshesAfter++ }) }
    for (const g of leftover) if (!finalGeoms.has(g)) g.dispose()

    stats.merged = true
    stats.meshesAfter = meshesAfter
    stats.materialsAfter = matByKey.size
    return { root: newRoot, stats }
  } catch (e) {
    // 烘焙失败不影响正确性：回退原对象（但打出原因，防静默退化）
    console.warn('[llm-city] bakeBuild 烘焙失败，回退未合并对象：', e)
    return { root, stats: { ...empty, merged: false } }
  }
}
