import * as THREE from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { BuildingRecord } from '../generated/city-data'
import { flyTo } from '../city/pick'
import { escapeHtml, formatDate, formatTokens } from './format'

export function showSidebar(
  hud: HTMLElement, camera: THREE.PerspectiveCamera, controls: OrbitControls,
  buildingGroup: THREE.Group | undefined, b: BuildingRecord,
  extra?: { onOrbit?: () => void },
): void {
  document.getElementById('sidebar')?.remove()
  const el = document.createElement('div')
  el.id = 'sidebar'
  el.className = 'panel'
  el.style.cssText = 'position:absolute;right:16px;top:16px;bottom:16px;width:320px;padding:16px;overflow-y:auto;'
  const status = b.completedAt ? '竣工' : '在建'
  el.innerHTML = `
    <div style="font-size:18px;font-weight:600;margin-bottom:4px;">${escapeHtml(b.name)}</div>
    <div style="margin-bottom:10px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${b.vendor?.color ?? '#666'};margin-right:6px;"></span>${b.vendor?.name ?? '厂商未登记'} · <b>${escapeHtml(b.model)}</b></div>
    <div class="num" style="font-size:14px;margin-bottom:10px;">消耗 token：${formatTokens(b.tokens)}</div>
    <div style="color:var(--text-secondary);font-size:12px;margin-bottom:12px;">${status} · ${b.lot} · 建筑 ${b.id} · 开工 ${formatDate(b.startedAt)}${b.completedAt ? ` · 竣工 ${formatDate(b.completedAt)}` : ''} · 共 ${b.sessions.length} 次施工</div>
    <div style="margin-bottom:12px;">${escapeHtml(b.desc) || '<span style="color:var(--text-secondary)">（无描述）</span>'}</div>
    ${b.notesExcerpt ? `<div style="margin-bottom:12px;"><div style="color:var(--text-secondary);font-size:12px;margin-bottom:4px;">设计摘要</div><div style="line-height:1.8;">${escapeHtml(b.notesExcerpt).replace(/\n/g, '<br>')}</div></div>` : ''}
    <div style="border-top:1px solid var(--panel-border);padding-top:12px;font-size:13px;line-height:1.9;color:var(--text-secondary);">
      <div>登记名：${escapeHtml(b.model)} · 施工：${escapeHtml(b.agent)}</div>
      ${b.sessions.map((s, i) => `<div style="font-size:12px;">第${i + 1}次 ${formatDate(s.date)} · ${s.input ?? '—'} in / ${s.output ?? '—'} out${s.note ? ` · ${escapeHtml(s.note)}` : ''}</div>`).join('')}
    </div>
    ${extra?.onOrbit ? '<button id="btn-orbit" style="margin-top:12px;width:100%;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;">环绕本建筑（360° 慢旋）</button>' : ''}
    <button id="btn-close" style="margin-top:8px;width:100%;padding:8px;background:transparent;color:var(--text-secondary);border:1px solid var(--panel-border);border-radius:8px;cursor:pointer;font-family:inherit;">关闭</button>`
  hud.appendChild(el)
  el.querySelector('#btn-close')!.addEventListener('click', () => el.remove())
  const orbitBtn = el.querySelector('#btn-orbit')
  if (orbitBtn && extra?.onOrbit) orbitBtn.addEventListener('click', extra.onOrbit)
  // 点击飞向近景（spec §10）：斜上 45°，距离按包围盒尺寸
  if (buildingGroup) {
    const box = new THREE.Box3().setFromObject(buildingGroup)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const d = Math.max(size.x, size.y, size.z, 10) * 2.2
    const dir = new THREE.Vector3(1, 0.9, 1).normalize()
    flyTo(camera, controls, center.clone().add(dir.multiplyScalar(d)), center.clone())
  }
}
