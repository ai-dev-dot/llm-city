import { describe, expect, it } from 'vitest'
import type { CityData, BuildingRecord } from '../generated/city-data'
import {
  blockCamera, blockHref, collectBlocks, districtLookup, districtOfBuilding, parseBlockParam,
} from './blocks'

const lot = (id: string, district: string, cx: number, cz: number) => ({ id, center: [cx, cz] as [number, number], size: [20, 20] as [number, number], district })

const city: CityData = {
  id: 't', name: '测试城', founded: '2026-01-01',
  grid: { blocks: 3, blockPitch: 72, roadWidth: 12 },
  lots: [
    lot('A1-01', 'A1', -308, 308), lot('A1-02', 'A1', -288, 308), lot('A1-03', 'A1', -268, 308),
    lot('F4-01', 'F4', 52, 72), lot('F4-03', 'F4', 92, 72), lot('F4-06', 'F4', 92, 52),
    lot('E5-05', 'E5', 0, 0),
  ],
  buildings: [
    { id: 'b-1', lot: 'F4-03', parcel: ['F4-03', 'F4-06'], name: '望湖阁' },
    { id: 'b-2', lot: 'A1-01', parcel: ['A1-01'], name: '甲' },
  ] as unknown as BuildingRecord[],
  blockNames: { F4: '灯花栖居街区' },
}

describe('街区归属', () => {
  it('parcel 多地块取首个命中街区', () => {
    const lookup = districtLookup(city)
    expect(districtOfBuilding(city, city.buildings[0], lookup)).toBe('F4')
    expect(districtOfBuilding(city, city.buildings[1], lookup)).toBe('A1')
  })
  it('parcel 为空回退 lot 字段', () => {
    const b = { ...city.buildings[0], parcel: [] }
    expect(districtOfBuilding(city, b)).toBe('F4')
  })
})

describe('collectBlocks 聚合', () => {
  it('按 district 聚合包围盒与建筑计数，有建筑者优先排序', () => {
    const blocks = collectBlocks(city, city.blockNames)
    const f4 = blocks.find((b) => b.id === 'F4')!
    expect(f4.buildings).toBe(1)
    expect(f4.name).toBe('灯花栖居街区')
    // 地块包络 x 42..102（跨 60）、z 42..82（跨 40）→ 中心 [72, 62]
    expect(f4.center).toEqual([72, 62])
    expect(f4.extent).toBe(60 + 12)
    // E5 空街区也列出，但 buildings = 0
    const e5 = blocks.find((b) => b.id === 'E5')!
    expect(e5.buildings).toBe(0)
    // 排序：有建筑的在前（A1、F4 在 E5 前）
    expect(blocks.findIndex((b) => b.id === 'E5')).toBeGreaterThan(blocks.findIndex((b) => b.id === 'F4'))
  })
})

describe('parseBlockParam', () => {
  it('合法参数（大小写不敏感）返回街区 id', () => {
    expect(parseBlockParam('?block=f4', city)).toBe('F4')
    expect(parseBlockParam('?block=F4', city)).toBe('F4')
  })
  it('空参/未知街区返回 null 回退全城', () => {
    expect(parseBlockParam('', city)).toBeNull()
    expect(parseBlockParam('?block=ZZ', city)).toBeNull()
    expect(parseBlockParam('?other=1', city)).toBeNull()
  })
})

describe('blockHref / blockCamera', () => {
  it('href 基于传入 pathname 拼接（不依赖 location）', () => {
    expect(blockHref('F4', '/llm-city/')).toBe('/llm-city/?block=F4')
    expect(blockHref(null, '/llm-city/')).toBe('/llm-city/')
  })
  it('街区机位在街区上空斜上方，目标为街区中心', () => {
    const cam = blockCamera({ center: [72, 62], extent: 72 })
    expect(cam.pos[0]).toBeGreaterThan(72)
    expect(cam.pos[2]).toBeGreaterThan(62)
    expect(cam.pos[1]).toBeGreaterThan(20)
    expect(cam.target).toEqual([72, 8, 62])
  })
})
