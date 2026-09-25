import './ui/tokens.css'
import { createScene } from './city/scene'
import { BuildingManager } from './city/loader'
import { setupPicking } from './city/pick'
import { mountTooltip } from './ui/tooltip'
import { showSidebar } from './ui/sidebar'
import { city, buildingLoaders } from './generated/city-data'

const canvas = document.getElementById('city-canvas') as HTMLCanvasElement
const bundle = createScene(canvas, city)
const manager = new BuildingManager(bundle.scene, city, buildingLoaders)
manager.onStatusChange((c) => console.info(`[llm-city] ${c.ok} 栋正常 / ${c.failed} 栋烂尾`))

// 渲染韧性第 5 层：GL 上下文丢失恢复（Canvas 异常时 UI 层仍可见）
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault()
  document.getElementById('hud')!.innerHTML = '<div class="panel" style="position:absolute;top:16px;left:50%;transform:translateX(-50%);padding:10px 16px;">上下文丢失，正在恢复……</div>'
})
canvas.addEventListener('webglcontextrestored', () => {
  bundle.renderer.resetState()
  document.getElementById('hud')!.innerHTML = ''
})

// 留痕交互（spec §10/§13）：hover 出 tooltip、点击飞向近景并展开侧栏登记详情
const hud = document.getElementById('hud')!
const tooltip = mountTooltip(hud, canvas)
setupPicking(canvas, bundle.camera, bundle.controls, bundle.scene, (id, ev) => {
  const b = id ? city.buildings.find((x) => x.id === id) ?? null : null
  tooltip(b, ev as PointerEvent)
}, (id) => {
  const b = city.buildings.find((x) => x.id === id)!
  showSidebar(hud, bundle.camera, bundle.controls, manager.groupOf(id), b)
})

let last = performance.now()
bundle.renderer.setAnimationLoop((now: number) => {
  const dt = (now - last) / 1000; last = now
  bundle.controls.update()
  manager.update(bundle.camera, now)
  bundle.renderer.render(bundle.scene, bundle.camera)
})
