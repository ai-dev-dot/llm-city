import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveBuildingHits } from '../src/locate'

/**
 * inspect/shot/probe 共用的建筑定位（[city-admin] 2026-09-30 补）——三命令用法文案一直声称
 * 「建筑id」，但解析此前只认完整目录名，实测 b-000031 一律「找不到建筑目录」（只有 demolish
 * 自带 id 解析）。在此钉住各形态：完整目录名、裸 id、裸数字不认（与 demolish 口径一致）、
 * 跨城撞名多命中、未知名/未知 id、没有 buildings 目录的城不炸。
 */

let root = ''
afterEach(() => { if (root) rmSync(root, { recursive: true, force: true }); root = '' })

function makeCity(citiesRoot: string, city: string, ...dirs: string[]) {
  for (const d of dirs) mkdirSync(resolve(citiesRoot, city, 'buildings', d), { recursive: true })
}

describe('resolveBuildingHits（CLI 建筑定位）', () => {
  it('完整目录名：精确命中', () => {
    root = mkdtempSync(resolve(tmpdir(), 'llm-city-locate-'))
    makeCity(root, 't1', 'b-000001-alpha', 'b-000002-beta')
    expect(resolveBuildingHits(root, 'b-000002-beta')).toEqual([['t1', 'b-000002-beta']])
  })

  it('裸 id b-000002：命中同前缀目录（用法文案声称的「建筑id」）', () => {
    root = mkdtempSync(resolve(tmpdir(), 'llm-city-locate-'))
    makeCity(root, 't1', 'b-000001-alpha', 'b-000002-beta')
    expect(resolveBuildingHits(root, 'b-000002')).toEqual([['t1', 'b-000002-beta']])
  })

  it('裸数字不是 id：2 / b-2 都不认（与 demolish idOfDirName 口径一致）', () => {
    root = mkdtempSync(resolve(tmpdir(), 'llm-city-locate-'))
    makeCity(root, 't1', 'b-000001-alpha')
    expect(resolveBuildingHits(root, '2')).toEqual([])
    expect(resolveBuildingHits(root, 'b-2')).toEqual([])
  })

  it('同名目录跨城 → 多命中，由调用方报错退出', () => {
    root = mkdtempSync(resolve(tmpdir(), 'llm-city-locate-'))
    makeCity(root, 't1', 'b-000001-alpha')
    makeCity(root, 't2', 'b-000001-alpha')
    expect(resolveBuildingHits(root, 'b-000001-alpha')).toEqual([['t1', 'b-000001-alpha'], ['t2', 'b-000001-alpha']])
  })

  it('未知名 / 未知 id → 空结果；没有 buildings 目录的城不炸', () => {
    root = mkdtempSync(resolve(tmpdir(), 'llm-city-locate-'))
    makeCity(root, 't1', 'b-000001-alpha')
    mkdirSync(resolve(root, 't2'))
    expect(resolveBuildingHits(root, 'b-000099')).toEqual([])
    expect(resolveBuildingHits(root, 'no-such')).toEqual([])
  })
})
