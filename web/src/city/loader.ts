import * as THREE from 'three'
import { mulberry32, hashSeed, type BuildCtx } from '../../../lib/ctx'
import { blocks } from '../../../lib/blocks'
import type { CityData, BuildingRecord } from '../generated/city-data'

export class LruCache<K, V> {
  private map = new Map<K, V>()
  constructor(private capacity: number) {}
  touch(k: K, v: V) { this.map.delete(k); this.map.set(k, v); this.evict() }
  get(k: K): V | undefined { const v = this.map.get(k); if (v !== undefined) { this.map.delete(k); this.map.set(k, v) } return v }
  has(k: K) { return this.map.has(k) }
  delete(k: K) { this.map.delete(k) }
  keys(): () => IterableIterator<K> { return () => this.map.keys() }   // 测试契约：keys()() 两次调用取迭代器
  size() { return this.map.size }
  private evict() { while (this.map.size > this.capacity) { const oldest = this.map.keys().next().value as K; const v = this.map.get(oldest)!; this.map.delete(oldest); this.onEvict?.(oldest, v) } }
  onEvict?: (k: K, v: V) => void
}

export interface MountStatus { state: 'idle' | 'loading' | 'ok' | 'failed'; root?: THREE.Object3D }

/** 入场检查（spec §10 渲染韧性第 3 层）：坏对象不上车 */
function validateObject3D(root: unknown): THREE.Object3D {
  if (!(root instanceof THREE.Object3D)) throw new Error('build() 未返回 THREE.Object3D')
  let meshCount = 0
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    meshCount++
    const g = m.geometry
    if (!g || !g.attributes?.position) throw new Error('Mesh 缺少 position attribute')
    const pos = g.attributes.position as THREE.BufferAttribute
    // 注：position.buffer 恒为 TypedArray（Float32Array 等），不能 Array.isArray 判——会误杀全部正常 Mesh
    if (!pos.array || pos.array.length < pos.count * pos.itemSize) throw new Error('position buffer 长度非法')
    if (m.material === undefined || m.material === null) throw new Error('Mesh 材质缺失')
  })
  if (meshCount === 0) throw new Error('对象中没有任何 Mesh')
  return root
}

function makeLabelSprite(text: string): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = 'rgba(17,20,28,0.85)'
  ctx.fillRect(0, 0, 512, 128)
  ctx.font = '56px "Noto Sans SC", "Microsoft YaHei", sans-serif'
  ctx.fillStyle = '#F3F4F6'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(text.slice(0, 10), 256, 68)
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }))
  sp.scale.set(24, 6, 1)
  sp.position.y = 10
  return sp
}

export class BuildingManager {
  private groups = new Map<string, THREE.Group>()
  private status = new Map<string, MountStatus>()
  private roots = new LruCache<string, THREE.Object3D>(150)
  private lastUpdate = 0
  private cb: ((c: { ok: number; failed: number }) => void) | null = null
  private filterFn: ((root: THREE.Object3D) => void) | null = null

  constructor(private scene: THREE.Scene, private city: CityData, private loaders: Record<string, () => Promise<{ default: (ctx: BuildCtx) => THREE.Object3D }>>, private opts: { visibleRadius?: number } = {}) {
    this.roots.onEvict = (id, root) => this.disposeRoot(id, root)
    for (const b of city.buildings) {
      const lot = city.lots.find((l) => l.id === b.lot)!
      const g = new THREE.Group()
      g.position.set(lot.center[0], 0, lot.center[1])
      g.userData.buildingId = b.id
      this.scene.add(g)
      this.groups.set(b.id, g)
      this.status.set(b.id, { state: 'idle' })
    }
  }

  onStatusChange(cb: (c: { ok: number; failed: number }) => void) { this.cb = cb }
  reapplyFilter(fn: (root: THREE.Object3D) => void) { this.filterFn = fn; for (const [, st] of this.status) if (st.state === 'ok' && st.root) fn(st.root) }

  getStatus(id: string): MountStatus { return this.status.get(id) ?? { state: 'idle' } }
  groupOf(id: string): THREE.Group | undefined { return this.groups.get(id) }
  getCounts() {
    let ok = 0, failed = 0
    for (const s of this.status.values()) { if (s.state === 'ok') ok++; else if (s.state === 'failed') failed++ }
    return { ok, failed }
  }

  update(camera: THREE.PerspectiveCamera, now = performance.now()) {
    if (now - this.lastUpdate < 300) return
    this.lastUpdate = now
    const r = this.opts.visibleRadius ?? 800
    const cam = camera.position
    for (const b of this.city.buildings) {
      const st = this.status.get(b.id)!
      const g = this.groups.get(b.id)!
      const dist = Math.hypot(cam.x - g.position.x, cam.z - g.position.z)
      if (dist <= r && st.state === 'idle') void this.mount(b)
      else if (dist > r + 100 && st.state === 'ok') this.unmount(b.id)
    }
  }

  private async mount(b: BuildingRecord) {
    const cached = this.roots.get(b.id)   // LRU 命中：几何仍在前端缓存，直接挂回场景
    if (cached) {
      this.groups.get(b.id)!.add(cached)
      this.status.set(b.id, { state: 'ok', root: cached })
      return
    }
    this.status.set(b.id, { state: 'loading' })
    try {
      const mod = await this.loaders[b.id]()                      // 韧性层 1：chunk 加载失败 → 灰盒
      const lot = this.city.lots.find((l) => l.id === b.lot)!
      const ctx: BuildCtx = { lot: { id: b.lot, size: lot.size, maxHeight: 300 }, rng: mulberry32(hashSeed(b.id)), blocks }
      const root = validateObject3D(mod.default(ctx))             // 韧性层 2/3：build 异常或坏对象 → 灰盒
      root.traverse((o) => { o.userData.buildingId = b.id })
      if (this.filterFn) this.filterFn(root)
      this.groups.get(b.id)!.add(root)
      this.roots.touch(b.id, root)
      this.status.set(b.id, { state: 'ok', root })
    } catch (e) {
      console.warn(`[llm-city] 建筑 ${b.id}（${b.name}）加载失败，显示灰盒：`, e)
      this.showGrayBox(b)
      this.status.set(b.id, { state: 'failed' })
    }
    this.cb?.(this.getCounts())
  }

  private showGrayBox(b: BuildingRecord) {
    const g = this.groups.get(b.id)!
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(18, 8, 18),
      new THREE.MeshStandardMaterial({ color: '#9CA3AF', roughness: 0.9, transparent: true, opacity: 0.9 }),
    )
    box.position.y = 4
    box.userData.buildingId = b.id
    g.add(box, makeLabelSprite(b.name))
  }

  private unmount(id: string) {
    const st = this.status.get(id)!
    if (st.root) this.groups.get(id)!.remove(st.root)   // 几何留在 LRU 缓存，只下场景
    this.status.set(id, { state: 'idle' })
  }

  private disposeRoot(id: string, root: THREE.Object3D) {   // LRU 淘汰：几何与材质真正释放（内存有界）
    this.groups.get(id)?.remove(root)
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.geometry?.dispose()
        ;(Array.isArray(m.material) ? m.material : [m.material]).forEach((mm) => mm?.dispose())
      }
    })
    if (this.status.get(id)?.root === root) this.status.set(id, { state: 'idle' })
  }
}
