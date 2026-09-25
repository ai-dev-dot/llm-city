import { describe, expect, it } from 'vitest'
import { LruCache } from './loader'

describe('LruCache（规模分层：内存有界）', () => {
  it('容量上限与淘汰最久未用', () => {
    const lru = new LruCache<string, number>(3)
    lru.touch('a', 1); lru.touch('b', 2); lru.touch('c', 3)
    lru.get('a')            // a 变最新
    lru.touch('d', 4)       // 淘汰 b
    expect(lru.has('b')).toBe(false)
    expect(lru.has('a')).toBe(true)
    expect([...lru.keys()()].sort()).toEqual(['a', 'c', 'd'])
  })
})
