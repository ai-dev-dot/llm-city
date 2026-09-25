import type { BuildingRecord } from '../generated/city-data'
import { escapeHtml, formatDate } from './format'

/** 悬浮信息卡：只保留城主指定的四项——建筑名、厂商、模型名、竣工日期。 */
export function tooltipHtml(b: BuildingRecord): string {
  const status = b.completedAt ? '竣工' : '在建'
  const vendor = b.vendor ? b.vendor.name : '厂商未登记'
  return `<div class="panel" style="position:absolute;transform:translate(12px,-100%);padding:10px 14px;width:max-content;max-width:300px;font-size:13px;line-height:1.7;">
  <div style="font-size:15px;font-weight:600;">${escapeHtml(b.name)} <span style="color:var(--text-secondary);font-weight:400;">${status}</span></div>
  <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${b.vendor?.color ?? '#666'};margin-right:5px;"></span>${escapeHtml(vendor)} · ${escapeHtml(b.modelId)}</div>
  ${b.completedAt ? `<div class="num">竣工 ${formatDate(b.completedAt)}</div>` : ''}
</div>`
}

export function mountTooltip(hud: HTMLElement, canvas: HTMLElement): (b: BuildingRecord | null, ev: PointerEvent | null) => void {
  let el: HTMLElement | null = null
  return (b, ev) => {
    if (el) { el.remove(); el = null }
    if (!b || !ev) return
    el = document.createElement('div')
    el.style.cssText = `position:absolute;left:${ev.clientX}px;top:${ev.clientY - 8}px;pointer-events:none;`
    el.innerHTML = tooltipHtml(b)
    hud.appendChild(el)
  }
}
