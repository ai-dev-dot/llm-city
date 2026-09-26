import type { BuildingRecord } from '../generated/city-data'
import { blockHref } from '../city/blocks'
import { escapeHtml, formatDate } from './format'

/** 悬浮信息卡：只保留城主指定的四项——建筑名、厂商、模型名、竣工日期。
 *  block 传入时附街区行：他街区建筑给「进入街区页」链接，本街区（街区模式中）只读展示。 */
export function tooltipHtml(
  b: BuildingRecord,
  block?: { district: string | null; active: string | null; hrefOf?: (id: string | null) => string },
): string {
  const status = b.completedAt ? '竣工' : '在建'
  const vendor = b.vendor ? b.vendor.name : '厂商未登记'
  const hrefOf = block?.hrefOf ?? ((id: string | null) => blockHref(id, typeof location !== 'undefined' ? location.pathname : '/'))
  const blockLine = !block?.district ? '' : block.district === block.active
    ? `<div class="num">街区 ${escapeHtml(block.district)} · 当前街区模式</div>`
    : `<div class="num">街区 <a href="${hrefOf(block.district)}" style="color:var(--accent);pointer-events:auto;text-decoration:none;cursor:pointer;">${escapeHtml(block.district)} ▸ 进入街区页</a></div>`
  return `<div class="panel" style="position:absolute;transform:translate(12px,-100%);padding:10px 14px;width:max-content;max-width:300px;font-size:13px;line-height:1.7;">
  <div style="font-size:15px;font-weight:600;">${escapeHtml(b.name)} <span style="color:var(--text-secondary);font-weight:400;">${status}</span></div>
  <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${b.vendor?.color ?? '#666'};margin-right:5px;"></span>${escapeHtml(vendor)} · ${escapeHtml(b.modelId)}</div>
  ${b.completedAt ? `<div class="num">竣工 ${formatDate(b.completedAt)}</div>` : ''}${blockLine ? blockLine : ''}
</div>`
}

export function mountTooltip(
  hud: HTMLElement, canvas: HTMLElement,
  opts?: { activeBlock?: string | null; hrefOf?: (id: string | null) => string },
): (b: BuildingRecord | null, ev: PointerEvent | null, district?: string | null) => void {
  let el: HTMLElement | null = null
  return (b, ev, district = null) => {
    if (el) { el.remove(); el = null }
    if (!b || !ev) return
    el = document.createElement('div')
    el.style.cssText = `position:absolute;left:${ev.clientX}px;top:${ev.clientY - 8}px;pointer-events:none;`
    el.innerHTML = tooltipHtml(b, { district, active: opts?.activeBlock ?? null, hrefOf: opts?.hrefOf })
    hud.appendChild(el)
  }
}
