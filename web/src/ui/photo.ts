import * as THREE from 'three'
import type { SceneBundle } from '../city/scene'
import type { HudHandle } from './hud'

export type AspectRatio = '16:9' | '9:16' | '1:1' | 'off'

export function frameBox(aspect: AspectRatio, vw: number, vh: number) {
  if (aspect === 'off' || aspect === `16:9` && Math.abs(vw / vh - 16 / 9) < 1e-6) return { left: 0, top: 0, width: vw, height: vh }
  const ratio = aspect === '9:16' ? 9 / 16 : aspect === '1:1' ? 1 : 16 / 9
  let w = vw, h = w / ratio
  if (h > vh) { h = vh; w = h * ratio }
  return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h }
}

export class PhotoMode {
  private active = false
  private aspect: AspectRatio = 'off'
  private watermark = true
  private bar: HTMLElement | null = null
  private frame: HTMLElement | null = null

  constructor(private hud: HTMLElement, private bundle: SceneBundle, private hudHandle: Pick<HudHandle, 'toggleHud' | 'setFilter'>) {}

  get isActive() { return this.active }

  toggle() { this.active ? this.exit() : this.enter() }

  private enter() {
    this.active = true
    if (this.hud.style.display !== 'none') this.hudHandle.toggleHud()   // 隐藏 HUD（若已隐藏则不重复——brief 注释语义）
    this.bar = document.createElement('div')
    this.bar.className = 'panel'
    this.bar.style.cssText = 'position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:8px;padding:8px 12px;font-size:13px;align-items:center;'
    this.bar.innerHTML = `
      <span>摄影模式</span>
      <button data-a="2">导出 2x</button><button data-a="4">导出 4x</button>
      <button data-a="aspect">构图 ${this.aspectLabel()}</button>
      <button data-a="wm">水印 ${this.watermark ? '开' : '关'}</button>
      <button data-a="exit">退出(P)</button>`
    for (const b of this.bar.querySelectorAll('button')) {
      b.style.cssText = 'padding:6px 10px;background:transparent;color:var(--text-primary);border:1px solid var(--panel-border);border-radius:6px;cursor:pointer;font-family:inherit;'
      b.addEventListener('click', () => {
        const a = (b as HTMLElement).dataset.a
        if (a === '2') this.export(2, this.watermark)
        if (a === '4') this.export(4, this.watermark)
        if (a === 'aspect') { this.aspect = this.aspect === 'off' ? '16:9' : this.aspect === '16:9' ? '9:16' : this.aspect === '9:16' ? '1:1' : 'off'; this.renderFrame(); this.bar!.querySelector('[data-a=aspect]')!.textContent = `构图 ${this.aspectLabel()}` }
        if (a === 'wm') { this.watermark = !this.watermark; this.bar!.querySelector('[data-a=wm]')!.textContent = `水印 ${this.watermark ? '开' : '关'}` }
        if (a === 'exit') this.exit()
      })
    }
    // 工具条/取景框挂在 body：HUD 容器会被 toggleHud 整层隐藏，摄影 UI 必须独立于该开关才能在纯净画面下可见（挂 hud 内会被连带隐藏）
    document.body.appendChild(this.bar)
    this.renderFrame()
  }

  private aspectLabel() { return this.aspect === 'off' ? '关' : this.aspect }

  private renderFrame() {   // 蒙版挖洞 = 四块黑边（上/下/左/右）+ 白色取景框线
    this.frame?.remove(); this.frame = null
    if (this.aspect === 'off') return
    const vw = innerWidth, vh = innerHeight
    const b = frameBox(this.aspect, vw, vh)
    this.frame = document.createElement('div')
    this.frame.style.cssText = 'position:absolute;left:0;top:0;width:100vw;height:100vh;pointer-events:none;'
    const mask = (l: number, t: number, w: number, h: number) => `position:absolute;left:${l}px;top:${t}px;width:${w}px;height:${h}px;background:rgba(0,0,0,0.55);`
    this.frame.innerHTML = `
      <div style="${mask(0, 0, vw, b.top)}"></div>
      <div style="${mask(0, b.top + b.height, vw, vh - b.top - b.height)}"></div>
      <div style="${mask(0, b.top, b.left, b.height)}"></div>
      <div style="${mask(b.left + b.width, b.top, vw - b.left - b.width, b.height)}"></div>
      <div style="position:absolute;left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;border:1px solid rgba(255,255,255,0.85);"></div>`
    document.body.appendChild(this.frame)
  }

  /** 高清导出：离屏重渲染 → 2D 合成（水印）→ 下载 → 还原 */
  export(scale: 2 | 4, watermark: boolean) {
    const { renderer, scene, camera } = this.bundle
    const canvas = renderer.domElement
    const w = canvas.clientWidth, h = canvas.clientHeight
    const prevRatio = renderer.getPixelRatio()
    renderer.setPixelRatio(1)
    renderer.setSize(w * scale, h * scale, false)
    camera.aspect = (w * scale) / (h * scale); camera.updateProjectionMatrix()
    renderer.render(scene, camera)
    const out = document.createElement('canvas')
    out.width = w * scale; out.height = h * scale
    const ctx = out.getContext('2d')!
    ctx.drawImage(renderer.domElement, 0, 0)
    if (watermark) {
      const fs = 22 * scale
      ctx.font = `${fs}px 'Noto Sans SC','Microsoft YaHei',sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4
      ctx.fillText('模都 · llm-city', out.width - 18 * scale, out.height - 14 * scale)
    }
    renderer.setPixelRatio(prevRatio)
    renderer.setSize(w, h, false)
    camera.aspect = w / h; camera.updateProjectionMatrix()
    out.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `llm-city-${scale}x-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/png')
  }

  private exit() {
    this.active = false
    this.bar?.remove(); this.bar = null
    this.frame?.remove(); this.frame = null
    if (this.hud.style.display === 'none') this.hudHandle.toggleHud()   // 恢复 HUD（仅当仍处于隐藏态；摄影期间被 H 显式恢复则不动）
  }
}
