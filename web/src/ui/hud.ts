import type { BuildingRecord, CityData } from '../generated/city-data'
import type { BuildingManager } from '../city/loader'
import type { FilterSystem, FilterMode } from '../city/filters'
import { formatTokens } from './format'

export function plaqueStats(buildings: BuildingRecord[]) {
  let tokensIn = 0, tokensOut = 0, unknownIn = false, unknownOut = false
  for (const b of buildings) {
    if (b.tokens.input === null) unknownIn = true; else tokensIn += b.tokens.input
    if (b.tokens.output === null) unknownOut = true; else tokensOut += b.tokens.output
  }
  return {
    buildings: buildings.length,
    models: new Set(buildings.map((b) => b.modelId)).size,
    vendors: new Set(buildings.filter((b) => b.vendor).map((b) => b.vendor!.id)).size,
    tokensIn, tokensOut, unknownIn, unknownOut,
  }
}

export interface HudHandle { toggleHud(): void; setFilter(mode: FilterMode): void }

export function mountHud(
  hud: HTMLElement, city: CityData, manager: BuildingManager, filterSystem: FilterSystem,
  hooks: { onPhoto: () => void; onTour: () => void },
): HudHandle {
  hud.innerHTML = ''
  const s = plaqueStats(city.buildings)

  // 启动铭牌（左下）
  const plaque = document.createElement('div')
  plaque.className = 'panel'
  plaque.style.cssText = 'position:absolute;left:16px;bottom:16px;padding:14px 18px;font-size:13px;line-height:1.9;'
  plaque.innerHTML = `
    <div style="font-size:18px;font-weight:700;letter-spacing:2px;">${city.name} <span style="font-size:12px;color:var(--text-secondary);font-weight:400;">llm-city</span></div>
    <div style="color:var(--text-secondary);">开城 ${city.founded}</div>
    <div class="num" style="margin-top:6px;">${s.buildings} 栋建筑 · ${s.models} 个模型 · ${s.vendors} 家厂商</div>
    <div class="num" style="color:var(--text-secondary);">累计 token ${s.unknownIn || s.unknownOut ? '≈ ' : ''}${formatTokens({ input: s.tokensIn, output: s.tokensOut })}</div>`
  hud.appendChild(plaque)

  // 快捷键提示（铭牌上方小字）
  const hint = document.createElement('div')
  hint.className = 'panel'
  hint.style.cssText = 'position:absolute;left:16px;bottom:132px;padding:6px 10px;font-size:12px;color:var(--text-secondary);'
  hint.textContent = 'H HUD · P 摄影 · F 滤镜 · T 巡航'
  hud.appendChild(hint)

  // 错误报告条（右下，常驻；Canvas 异常时 UI 层仍可见——与 Canvas 分层）
  const report = document.createElement('div')
  report.className = 'panel'
  report.style.cssText = 'position:absolute;right:16px;bottom:16px;padding:8px 12px;font-size:13px;'
  hud.appendChild(report)
  const renderReport = () => {
    const c = manager.getCounts()
    report.innerHTML = c.failed > 0
      ? `<span style="color:var(--danger);cursor:pointer;" id="failed-list-toggle">${c.ok} 栋正常 / <b>${c.failed} 栋烂尾</b> ▾</span>`
      : `<span>${c.ok} 栋正常 / ${c.failed} 栋烂尾</span>`
    const t = report.querySelector('#failed-list-toggle')
    if (t) t.addEventListener('click', () => {
      const failed = city.buildings.filter((b) => manager.getStatus(b.id).state === 'failed')
      const list = document.createElement('div')
      list.style.cssText = 'margin-top:6px;color:var(--danger);font-size:12px;max-height:180px;overflow-y:auto;'
      list.innerHTML = failed.map((b) => `<div>${b.id} ${b.name}（${b.lot}）</div>`).join('') || '<div>无</div>'
      report.appendChild(list)
    })
  }
  renderReport()
  manager.onStatusChange(renderReport)

  // 滤镜档位指示
  const filterBadge = document.createElement('div')
  filterBadge.className = 'panel'
  filterBadge.style.cssText = 'position:absolute;right:16px;bottom:60px;padding:6px 10px;font-size:12px;display:none;'
  hud.appendChild(filterBadge)

  const FILTER_LABEL: Record<FilterMode, string> = { off: '', model: '滤镜：按模型', vendor: '滤镜：按厂商' }

  // 快捷键
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return
    if (e.key === 'h' || e.key === 'H') handle.toggleHud()
    if (e.key === 'f' || e.key === 'F') {
      const next: FilterMode = filterSystem.mode === 'off' ? 'model' : filterSystem.mode === 'model' ? 'vendor' : 'off'
      handle.setFilter(next)
    }
    if (e.key === 'p' || e.key === 'P') hooks.onPhoto()
    if (e.key === 't' || e.key === 'T') hooks.onTour()
  }
  window.addEventListener('keydown', onKey)

  const handle: HudHandle = {
    toggleHud() { hud.style.display = hud.style.display === 'none' ? '' : 'none' },
    setFilter(mode) {
      const roots = city.buildings.map((b) => ({ id: b.id, root: manager.getStatus(b.id).root })).filter((r) => r.root) as Array<{ id: string; root: import('three').Object3D }>
      filterSystem.setMode(mode, city.buildings, roots)
      filterBadge.style.display = mode === 'off' ? 'none' : ''
      filterBadge.textContent = FILTER_LABEL[mode]
    },
  }
  return handle
}
