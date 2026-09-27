import './ui/tokens.css'
import * as THREE from 'three'
import { createScene } from './city/scene'
import { BuildingManager } from './city/loader'
import { FilterSystem } from './city/filters'
import { setupPicking } from './city/pick'
import { TourController, type TourArea, type TourRouteId, type TourPreset } from './city/tour'
import { collectBlocks, districtLookup, districtOfBuilding, navigateToBlock, parseBlockParam, blockCamera, blockHref } from './city/blocks'
import { mountTooltip } from './ui/tooltip'
import { showSidebar } from './ui/sidebar'
import { mountHud, type HudHandle } from './ui/hud'
import { PhotoMode } from './ui/photo'
import { city as fullCity, buildingLoaders } from './generated/city-data'
import type { BuildingRecord, CityData } from './generated/city-data'

// 街区模式（?block=<id>）：同一查看页按街区过滤建筑、相机锚定街区包围盒；
// 其余街区不动（草皮/道路是合并单 mesh，全量常驻代价为 2 次 draw call）。
const activeBlock = parseBlockParam(location.search, fullCity)
const lotDistrict = districtLookup(fullCity)
const districtOf = (b: BuildingRecord): string | null => districtOfBuilding(fullCity, b, lotDistrict)
const city: CityData = activeBlock
  ? { ...fullCity, buildings: fullCity.buildings.filter((b) => districtOf(b) === activeBlock) }
  : fullCity
const activeBlk = activeBlock
  ? collectBlocks(fullCity, fullCity.blockNames).find((x) => x.id === activeBlock) ?? null
  : null
if (activeBlock) {
  document.title = `${fullCity.name} · ${activeBlock}${activeBlk?.name ? ` ${activeBlk.name}` : ''}`
}

const canvas = document.getElementById('city-canvas') as HTMLCanvasElement
const bundle = createScene(canvas, fullCity)
if (activeBlk) {
  const cam = blockCamera(activeBlk)
  bundle.camera.position.set(...cam.pos)
  bundle.controls.target.set(...cam.target)
}
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

// 巡航导览（spec §10，Task 19）：mountAll 外构造一次——构造函数挂的 controls 'start'
// 监听（用户拖拽即停）只允许挂一次，重挂 HUD 不重建。
const tour = new TourController(bundle)
// 巡航范围个性化：街区模式=以该街区为中心，全城=以全城为中心；topY 从已挂载建筑
// 实测（mesh_stats 无高度）——每次切路线重算，高街区看得到楼顶、矮街区贴地看街景
const measureTourArea = (): TourArea => {
  let topY = 0
  for (const b of city.buildings) {
    const g = manager.groupOf(b.id)
    if (g) topY = Math.max(topY, new THREE.Box3().setFromObject(g).max.y)
  }
  if (activeBlk) return { center: activeBlk.center, radius: activeBlk.extent * 0.6 + 12, topY }
  return { center: [0, 0], radius: 210, topY }
}
const TOUR_SEQ: TourRouteId[] = ['plazaOrbit', 'boulevard', 'ascend']
const onTourCycle = (): TourRouteId => {
  const area = measureTourArea()
  if (tour.current === 'off') tour.start(TOUR_SEQ[0], { area })
  else {
    const i = TOUR_SEQ.indexOf(tour.current)
    if (i === -1 || i === TOUR_SEQ.length - 1) tour.stop()   // buildingOrbit 视作末位：T 一步归关
    else tour.start(TOUR_SEQ[i + 1], { area })
  }
  return tour.current
}
const TOUR_SPEEDS = [1, 0.5, 2] as const
let speedIdx = 0
const onTourSpeedCycle = (): number => {
  speedIdx = (speedIdx + 1) % TOUR_SPEEDS.length
  tour.setSpeed(TOUR_SPEEDS[speedIdx])
  return TOUR_SPEEDS[speedIdx]
}
// 侧栏「环绕本建筑」（Task 14 onOrbit hook 补全）：center/radius 从该建筑 group
// 包围盒算（同 Task 14 flyTo 逻辑），360° 慢旋看向建筑中心
const orbitBuilding = (id: string) => {
  const g = manager.groupOf(id)
  if (!g) return
  const box = new THREE.Box3().setFromObject(g)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  tour.start('buildingOrbit', {
    buildingCenter: center,
    buildingRadius: Math.max(size.x, size.y, size.z, 10) * 1.2,
    lookAt: center,
  })
}

// 留痕交互（spec §10/§13）：hover 出 tooltip、点击飞向近景并展开侧栏登记详情
// Task 19 carry-forward 修 1（Task 17 审查）：tooltip/拾取随 mountAll 重挂重建——
// contextlost 的 hud.innerHTML='' 会摘掉 tooltip 单例节点，restored 后旧闭包写 detached
// 节点导致 hover 静默失效；重挂时先摘旧 picking 监听（防重复）再挂全新闭包。
const hud = document.getElementById('hud')!
let unmountPicking: (() => void) | null = null
const mountPicking = () => {
  unmountPicking?.()
  const tooltip = mountTooltip(hud, canvas, {
    activeBlock,
    hrefOf: (id) => blockHref(id, location.pathname),
  })
  unmountPicking = setupPicking(canvas, bundle.camera, bundle.controls, bundle.scene, (id, ev) => {
    const b = id ? city.buildings.find((x) => x.id === id) ?? null : null
    tooltip(b, ev as PointerEvent, b ? districtOf(b) : null)
  }, (id) => {
    const b = city.buildings.find((x) => x.id === id)!
    showSidebar(hud, bundle.camera, bundle.controls, manager.groupOf(id), b, { onOrbit: () => orbitBuilding(id) })
  })
}

// HUD 层（spec §10/§13）：启动铭牌、错误报告条、快捷键（P 接摄影模式，T 巡航）
let hudHandle: HudHandle
// photo 须先于 mountHud 构造（onPhoto hook 依赖它），而 hudHandle 在 mountHud 返回后才存在——
// 循环引用用 getter 式转发桩解决：桩始终转发到最新 handle（restored 重挂后也自动指向新 handle）
const photo = new PhotoMode(hud, bundle, {
  toggleHud: () => hudHandle.toggleHud(),
  setFilter: (mode) => hudHandle.setFilter(mode),
})
// mountHud 可重入：webglcontextrestored 后重调即完整重挂持久 HUD
const mountAll = () => {
  mountPicking()
  hudHandle = mountHud(hud, city, manager, filterSystem, bundle, {
    onPhoto: () => photo.toggle(),
    onTour: onTourCycle,
    onTourSpeed: onTourSpeedCycle,
    onPreset: (p: TourPreset) => tour.flyToPreset(p),
  }, {
    activeBlock,
    blocks: collectBlocks(fullCity, fullCity.blockNames).filter((b) => b.buildings > 0),
  })
  // 拖拽即停/预设飞点/环绕建筑不经过 T 键：靠状态回调同步按钮文本（单槽重挂不累积）
  tour.onStateChange = (route) => hudHandle.syncTour(route)
}
mountAll()

// 浏览器自动化验证句柄（只读引用+巡航重算，不进任何渲染路径）：shot/QA 脚本经
// window.__city 摆巡航机位截图，核对「街区为中心、楼顶入画」无需改产品代码
;(window as unknown as { __city: Record<string, unknown> }).__city = {
  camera: bundle.camera,
  controls: bundle.controls,
  tour,
  manager,
  measureTourArea,
}

let last = performance.now()
bundle.renderer.setAnimationLoop((now: number) => {
  const dt = (now - last) / 1000; last = now
  bundle.controls.update()
  manager.update(bundle.camera, now)
  bundle.renderer.render(bundle.scene, bundle.camera)
})
