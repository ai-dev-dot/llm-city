import type { CityData, BuildingRecord } from '../generated/city-data'

/** 街区（district）模式辅助：plan 网格 9×9 街区（A1–I9），每街区 3×3 地块。
 *  街区模式 = 同一查看页以 ?block=<id> 只挂载该街区建筑、相机锚定街区包围盒。 */

export interface BlockInfo {
  id: string
  name: string | null          // 街区总图（blockplans/*.md）标题里的中文主题名
  center: [number, number]
  extent: number               // 街区边长（含邻路半幅）
  buildings: number
}

/** lotId → district 查找表（parcel 地块可能分属同街区，取首个命中） */
export function districtLookup(city: CityData): Map<string, string> {
  const m = new Map<string, string>()
  for (const l of city.lots) m.set(l.id, l.district)
  return m
}

export function districtOfBuilding(city: CityData, b: BuildingRecord, lookup = districtLookup(city)): string | null {
  const ids = b.parcel.length ? b.parcel : [b.lot]
  for (const lotId of ids) {
    const d = lookup.get(lotId)
    if (d) return d
  }
  return null
}

/** 聚合全部街区（含空街区；buildings 计数供选择器过滤） */
export function collectBlocks(city: CityData, names: Record<string, string> = {}): BlockInfo[] {
  const acc = new Map<string, { minX: number; maxX: number; minZ: number; maxZ: number }>()
  for (const l of city.lots) {
    let a = acc.get(l.district)
    if (!a) { a = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }; acc.set(l.district, a) }
    a.minX = Math.min(a.minX, l.center[0] - l.size[0] / 2)
    a.maxX = Math.max(a.maxX, l.center[0] + l.size[0] / 2)
    a.minZ = Math.min(a.minZ, l.center[1] - l.size[1] / 2)
    a.maxZ = Math.max(a.maxZ, l.center[1] + l.size[1] / 2)
  }
  const counts = new Map<string, number>()
  const lookup = districtLookup(city)
  for (const b of city.buildings) {
    const d = districtOfBuilding(city, b, lookup)
    if (d) counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  return [...acc.entries()]
    .sort((x, y) => (counts.get(y[0]) ?? 0) - (counts.get(x[0]) ?? 0) || x[0].localeCompare(y[0]))
    .map(([id, a]) => ({
      id,
      name: names[id] ?? null,
      center: [(a.minX + a.maxX) / 2, (a.minZ + a.maxZ) / 2] as [number, number],
      extent: Math.max(a.maxX - a.minX, a.maxZ - a.minZ) + city.grid.roadWidth,
      buildings: counts.get(id) ?? 0,
    }))
}

/** 解析 ?block= 参数：空白返回 null；未知街区返回 null（回退全城） */
export function parseBlockParam(search: string, city: CityData): string | null {
  const v = new URLSearchParams(search).get('block')?.trim().toUpperCase() || null
  if (!v) return null
  return city.lots.some((l) => l.district === v) ? v : null
}

export function blockHref(id: string | null, pathname: string): string {
  return id ? `${pathname}?block=${id}` : pathname
}

export function navigateToBlock(id: string | null): void {
  location.href = blockHref(id, location.pathname)
}

/** 街区机位：从街区包围盒反推（斜上 45° 环视位，超高层也能完整入画） */
export function blockCamera(b: { center: [number, number]; extent: number }): {
  pos: [number, number, number]; target: [number, number, number]
} {
  const dist = b.extent * 1.35 + 40
  return {
    pos: [b.center[0] + dist * 0.45, dist * 0.62, b.center[1] + dist * 0.75],
    target: [b.center[0], 8, b.center[1]],
  }
}
