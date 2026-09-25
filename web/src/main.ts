import './ui/tokens.css'
import { createScene } from './city/scene'
import { BuildingManager } from './city/loader'
import { FilterSystem } from './city/filters'
import { setupPicking } from './city/pick'
import { mountTooltip } from './ui/tooltip'
import { showSidebar } from './ui/sidebar'
import { mountHud, type HudHandle } from './ui/hud'
import { PhotoMode } from './ui/photo'
import { city, buildingLoaders } from './generated/city-data'

const canvas = document.getElementById('city-canvas') as HTMLCanvasElement
const bundle = createScene(canvas, city)
const manager = new BuildingManager(bundle.scene, city, buildingLoaders)
manager.onStatusChange((c) => console.info(`[llm-city] ${c.ok} 栋正常 / ${c.failed} 栋烂尾`))

// 滤镜系统（spec §10）：只做临时渲染效果，不改作品本体（F 键循环在 Task 16 统一接）
const filterSystem = new FilterSystem(city.buildings)
manager.reapplyFilter((root) => {
  // 新挂载建筑在滤镜期重应用
  const id = root.userData.buildingId ?? (root.children[0]?.userData.buildingId as string | undefined)
  const b = city.buildings.find((x) => x.id === id)
  if (b && filterSystem.mode !== 'off') filterSystem.applyTo(root, b)
})

// 渲染韧性第 5 层：GL 上下文丢失恢复（Canvas 异常时 UI 层仍可见）
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault()
  document.getElementById('hud')!.innerHTML = '<div class="panel" style="position:absolute;top:16px;left:50%;transform:translateX(-50%);padding:10px 16px;">上下文丢失，正在恢复……</div>'
})
canvas.addEventListener('webglcontextrestored', () => {
  bundle.renderer.resetState()
  mountAll()   // 重挂持久 HUD（铭牌/报告条/快捷键）——原先只 innerHTML='' 会让 HUD 永久消失（Task 16 审查 carry-forward）
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

// HUD 层（spec §10/§13）：启动铭牌、错误报告条、快捷键（P 接摄影模式 Task 17，T 巡航 Task 19 填充）
let hudHandle: HudHandle
// photo 须先于 mountHud 构造（onPhoto hook 依赖它），而 hudHandle 在 mountHud 返回后才存在——
// 循环引用用 getter 式转发桩解决：桩始终转发到最新 handle（restored 重挂后也自动指向新 handle）
const photo = new PhotoMode(hud, bundle, {
  toggleHud: () => hudHandle.toggleHud(),
  setFilter: (mode) => hudHandle.setFilter(mode),
})
// mountHud 可重入：webglcontextrestored 后重调即完整重挂持久 HUD
const mountAll = () => {
  hudHandle = mountHud(hud, city, manager, filterSystem, { onPhoto: () => photo.toggle(), onTour: () => {} })
}
mountAll()

let last = performance.now()
bundle.renderer.setAnimationLoop((now: number) => {
  const dt = (now - last) / 1000; last = now
  bundle.controls.update()
  manager.update(bundle.camera, now)
  bundle.renderer.render(bundle.scene, bundle.camera)
})
