import type { BuildingRecord } from '../generated/city-data'
import { escapeHtml, formatDate, formatTokens, truncate } from './format'

export function tooltipHtml(b: BuildingRecord): string {
  const status = b.completedAt ? '竣工' : '在建'
  const vendor = b.vendor ? `${b.vendor.name}` : '厂商未登记'
  return `<div class="panel" style="position:absolute;transform:translate(12px,-100%);padding:10px 12px;max-width:300px;font-size:13px;line-height:1.7;">
  <div style="font-size:15px;font-weight:600;">${escapeHtml(b.name)} <span style="color:var(--text-secondary);font-weight:400;">${status}</span></div>
  <div>${escapeHtml(b.modelId)} <span style="color:var(--text-secondary)">（登记名：${escapeHtml(b.model)}）</span></div>
  <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${b.vendor?.color ?? '#666'};margin-right:4px;"></span>${vendor}</div>
  <div class="num">${formatTokens(b.tokens)}</div>
  <div>开工 ${formatDate(b.startedAt)}${b.completedAt ? ` · 竣工 ${formatDate(b.completedAt)}` : ''} · 施工 ${b.sessions.length} 次</div>
  ${b.desc ? `<div style="color:var(--text-secondary)">${escapeHtml(truncate(b.desc, 100))}</div>` : ''}
  <div style="color:var(--text-secondary);font-size:12px;">点击查看详情</div>
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
