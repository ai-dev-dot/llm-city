import { describe, expect, it } from 'vitest'
import { inflateSync } from 'node:zlib'
import { encodePng } from '../src/shot/png'
import { AMBIANTS, deriveCameras, renderView, type TriSoup } from '../src/shot/render'

/** 手工组 TriSoup：tris 每项 9 个数（3 顶点 × xyz），albedo/emissive 逐三角形给定 */
const soupFrom = (tris: number[][], albedo: Array<[number, number, number]>, emissive: Array<[number, number, number]> = []): TriSoup => {
  const pos: number[] = []
  for (const t of tris) pos.push(...t)
  return {
    pos: Float32Array.from(pos),
    alb: Float32Array.from(tris.flatMap((_, i) => [...(albedo[i] ?? [0.7, 0.7, 0.7]), ...(albedo[i] ?? [0.7, 0.7, 0.7]), ...(albedo[i] ?? [0.7, 0.7, 0.7])])),
    emi: Float32Array.from(tris.flatMap((_, i) => [...(emissive[i] ?? [0, 0, 0]), ...(emissive[i] ?? [0, 0, 0]), ...(emissive[i] ?? [0, 0, 0])])),
    count: tris.length,
  }
}

const CAM = { eye: [0, 100, 0.01] as [number, number, number], target: [0, 0, 0] as [number, number, number], up: [0, 0, -1] as [number, number, number], fovDeg: 0, orthoH: 10 }
const CENTER = (20 * 60 + 30) * 3   // 60×40 图中心像素

describe('png 编码器', () => {
  it('产出合法 PNG：签名/IHDR 尺寸/IDAT 可膨胀还原/IEND', () => {
    const w = 3, h = 2
    const rgb = new Uint8Array(w * h * 3)
    for (let i = 0; i < rgb.length; i++) rgb[i] = (i * 37) % 256
    const png = encodePng(rgb, w, h)
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    let off = 8
    let idat: Buffer | null = null
    while (off < png.length - 8) {
      const len = png.readUInt32BE(off)
      const type = png.toString('ascii', off + 4, off + 8)
      if (type === 'IHDR') {
        expect(len).toBe(13)
        expect(png.readUInt32BE(off + 8)).toBe(w)
        expect(png.readUInt32BE(off + 12)).toBe(h)
      }
      if (type === 'IDAT') idat = idat ? Buffer.concat([idat, png.subarray(off + 8, off + 8 + len)]) : png.subarray(off + 8, off + 8 + len)
      if (type === 'IEND') expect(len).toBe(0)
      off += 12 + len
    }
    expect(idat).not.toBeNull()
    const raw = inflateSync(idat!)
    expect(raw.length).toBe(h * (1 + w * 3))
    for (let y = 0; y < h; y++) {
      expect(raw[y * (1 + w * 3)]).toBe(0)   // filter: none
      for (let x = 0; x < w * 3; x++) expect(raw[y * (1 + w * 3) + 1 + x]).toBe(rgb[y * w * 3 + x])
    }
  })
})

describe('软件光栅化', () => {
  it('三角形覆盖处渲染出反照率主色', () => {
    const soup = soupFrom([[-5, 0.5, -5, 5, 0.5, -5, 0, 0.5, 5]], [[0.9, 0.1, 0.1]])
    const rgb = renderView(soup, CAM, AMBIANTS.day, 60, 40)
    expect(rgb[CENTER]).toBeGreaterThan(rgb[CENTER + 1])
    expect(rgb[CENTER]).toBeGreaterThan(rgb[CENTER + 2])
    expect(rgb[CENTER]).toBeGreaterThan(150)
  })

  it('z-buffer 遮挡：更近的三角形胜出（俯视相机下 y 越大越近）', () => {
    const rgbNearOnly = renderView(
      soupFrom([[-5, 10, -5, 5, 10, -5, 0, 10, 5]], [[0.1, 0.1, 0.9]]),   // y=10 蓝，距相机近
      CAM, AMBIANTS.day, 60, 40)
    expect(rgbNearOnly[CENTER + 2]).toBeGreaterThan(rgbNearOnly[CENTER + 1])
    const rgbBoth = renderView(
      soupFrom([
        [-5, 10, -5, 5, 10, -5, 0, 10, 5],   // 近：蓝（应胜出）
        [-5, 2, -5, 5, 2, -5, 0, 2, 5],      // 远：绿
      ], [[0.1, 0.1, 0.9], [0.1, 0.9, 0.1]]),
      CAM, AMBIANTS.day, 60, 40)
    expect(rgbBoth[CENTER + 2]).toBeGreaterThan(rgbBoth[CENTER + 1])   // 近蓝遮挡远绿
  })

  it('自发光在无光环境下仍然可见（夜景窗灯原理）', () => {
    const soup = soupFrom([[-5, 0.5, -5, 5, 0.5, -5, 0, 0.5, 5]], [[0, 0, 0]], [[1, 0.9, 0.5]])
    const rgb = renderView(soup, CAM, AMBIANTS.night, 60, 40)
    expect(rgb[CENTER]).toBeGreaterThan(150)
  })

  it('deriveCameras：8 视角齐全，top/立面为正交，人视眼高 1.7m 在包围盒外', () => {
    const bbox = { min: [-10, 0, -10] as [number, number, number], max: [10, 60, 10] as [number, number, number] }
    const views = ['street', 'corner', 'aerial', 'top', 'front', 'back', 'left', 'right'] as const
    const cams = deriveCameras(bbox, [...views])
    for (const v of views) expect(cams[v]).toBeDefined()
    expect(cams.top!.fovDeg).toBe(0)
    expect(cams.front!.fovDeg).toBe(0)
    expect(cams.street!.fovDeg).toBeGreaterThan(0)
    expect(cams.street!.eye[1]).toBeCloseTo(1.7, 5)
    expect(Math.hypot(cams.street!.eye[0], cams.street!.eye[2])).toBeGreaterThan(10)
  })
})
