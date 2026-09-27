import * as THREE from 'three'
import { escapeHtml } from './format'

/** 锚定标签层：把「街区模型名 / 建筑名」用 DOM 投影钉在 3D 锚点上方。
 *  走 DOM（同 tooltip）而非 Sprite/CSS2DRenderer：复用 panel 样式、零渲染管线侵入、
 *  每帧仅几十次 transform 写入。容器挂 hud 内、插在最前（z 序低于面板/tooltip）——
 *  H 键/摄影模式隐藏 hud 即连带隐藏（航拍纯净画面），contextlost 重挂由 main.ts 重建。 */

export interface LabelItem {
  key: string
  html: string
  /** 每帧取锚点（世界坐标）——闭包读 main.ts 的楼顶实测缓存，挂载完成后高度动态抬升 */
  anchor: () => readonly [number, number, number]
}

export interface LabelLayerHandle {
  setItems(items: LabelItem[]): void
  sync(): void
  setEnabled(on: boolean): void
  readonly enabled: boolean
}

/** 近/远距淡出（不影响航拍）：穿街低飞 40m 内消失、极限拉远 1450m 消失（controls.maxDistance=1500） */
export const LABEL_FADE = { nearEnd: 40, nearStart: 72, farStart: 1100, farEnd: 1450 }

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)

/** 世界锚点 → 屏幕位置；返回 null = 不画（相机背后/far 外/屏幕外留边距 48px 之外）。
 *  opacity = 近距 × 远距双线性淡出系数（1 = 全显）。 */
export function projectLabel(
  anchor: readonly [number, number, number],
  camera: THREE.PerspectiveCamera, width: number, height: number,
): { left: number; top: number; opacity: number } | null {
  const p = new THREE.Vector3(anchor[0], anchor[1], anchor[2])
  const dist = camera.position.distanceTo(p)
  p.project(camera)
  if (p.z < -1 || p.z > 1) return null   // 相机背后 / far 之外（CSS2DRenderer 同款判定）
  const left = ((p.x + 1) / 2) * width
  const top = ((1 - p.y) / 2) * height
  const m = 48
  if (left < -m || left > width + m || top < -m || top > height + m) return null
  const fadeNear = clamp01((dist - LABEL_FADE.nearEnd) / (LABEL_FADE.nearStart - LABEL_FADE.nearEnd))
  const fadeFar = clamp01((LABEL_FADE.farEnd - dist) / (LABEL_FADE.farEnd - LABEL_FADE.farStart))
  return { left, top, opacity: Math.min(fadeNear, fadeFar) }
}

/** 全城页街区标签：厂商色点 + 模型名（主）· 街区ID/主题名（次） */
export function blockLabelHtml(
  modelId: string, vendorColor: string | null, blockId: string, blockName: string | null,
): string {
  const dot = vendorColor
    ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${vendorColor};margin-right:5px;vertical-align:1px;"></span>`
    : ''
  const name = blockName ? ` ${escapeHtml(blockName)}` : ''
  return `${dot}<b>${escapeHtml(modelId)}</b><span style="color:var(--text-secondary);"> · ${escapeHtml(blockId)}${name}</span>`
}

/** 街区页建筑名标签：只放名字（详情在 hover tooltip，常驻标签保持极简） */
export function buildingLabelHtml(name: string): string {
  return escapeHtml(name)
}

export function mountLabelLayer(hud: HTMLElement, camera: THREE.PerspectiveCamera): LabelLayerHandle {
  const root = document.createElement('div')
  root.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;'
  hud.insertBefore(root, hud.firstChild)   // hud 面板/tooltip 都在其后 append → 标签 z 序最低
  const els = new Map<string, HTMLElement>()
  let items: LabelItem[] = []
  let on = true

  const setItems = (next: LabelItem[]) => {
    items = next
    const keep = new Set(items.map((i) => i.key))
    for (const [k, el] of els) if (!keep.has(k)) { el.remove(); els.delete(k) }
    for (const it of items) {
      let el = els.get(it.key)
      if (!el) {
        el = document.createElement('div')
        el.className = 'panel'
        el.style.cssText = 'position:absolute;left:0;top:0;padding:3px 9px;font-size:12px;line-height:1.6;white-space:nowrap;will-change:transform,opacity;'
        root.appendChild(el)
        els.set(it.key, el)
      }
      el.innerHTML = it.html
    }
  }

  const sync = () => {
    if (!on) return
    const w = hud.clientWidth, h = hud.clientHeight
    if (!w || !h) return   // H 键/摄影模式把 hud 整层藏起（display:none → 尺寸 0），跳过无效投影
    for (const it of items) {
      const el = els.get(it.key)
      if (!el) continue
      const pos = projectLabel(it.anchor(), camera, w, h)
      if (!pos || pos.opacity <= 0) { el.style.display = 'none'; continue }
      el.style.display = ''
      el.style.opacity = pos.opacity.toFixed(3)
      // 先平移到锚点像素、再以自身底部中心对齐锚点并上抬 8px → 标签悬浮在锚点上方
      el.style.transform = `translate3d(${pos.left.toFixed(1)}px,${pos.top.toFixed(1)}px,0) translate(-50%,-100%) translateY(-8px)`
    }
  }

  const setEnabled = (v: boolean) => { on = v; root.style.display = v ? '' : 'none' }
  return { setItems, sync, setEnabled, get enabled() { return on } }
}
