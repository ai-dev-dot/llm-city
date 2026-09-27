import { inflateSync } from 'node:zlib'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { runShot } from './run'

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
// 假城市与渲染图都落 gitignore 的缓存工作间（面向 LLM 的产物不进版本库）
const workRoot = resolve(repoRoot, 'node_modules/.cache/llm-city/shot-regression')

/** 解码 shot 产出的 8-bit RGB PNG（png.ts：filter 0 + zlib deflate），返回 width×height×3 像素与尺寸 */
function decodePngRgb(buf: Buffer): { rgb: Uint8Array; width: number; height: number } {
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  let off = 8
  let idat = Buffer.alloc(0)
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    if (type === 'IDAT') idat = Buffer.concat([idat, buf.subarray(off + 8, off + 8 + len)])
    off += 12 + len
  }
  const raw = inflateSync(idat)
  const stride = 1 + width * 3
  const rgb = new Uint8Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    if (raw[y * stride] !== 0) throw new Error(`PNG filter 非 0：png.ts 只写 filter none，编码器变了须同步本测试`)
    rgb.set(raw.subarray(y * stride + 1, y * stride + 1 + width * 3), y * width * 3)
  }
  return { rgb, width, height }
}

/** 明显偏红的像素数（红色 Basic 材质在 day 环境下也应大量命中；背景/灰盒不会） */
function countReddish(rgb: Uint8Array): number {
  let n = 0
  for (let i = 0; i < rgb.length; i += 3) {
    if (rgb[i] > 90 && rgb[i] - rgb[i + 1] > 40 && rgb[i] - rgb[i + 2] > 40) n++
  }
  return n
}

/** 在缓存工作间造一个单文件假城市（不登记、不进版本库），返回 runShot 所需参数 */
function makeFakeCity(caseName: string, source: string): { cityDir: string; buildingDirName: string } {
  const buildingDirName = `shot-regression-${caseName}`
  const cityDir = resolve(workRoot, caseName)
  mkdirSync(resolve(cityDir, 'buildings', buildingDirName), { recursive: true })
  writeFileSync(resolve(cityDir, 'buildings', buildingDirName, 'index.ts'), source)
  return { cityDir, buildingDirName }
}

beforeAll(() => {
  rmSync(workRoot, { recursive: true, force: true })
  mkdirSync(workRoot, { recursive: true })
})

describe('shot worker 非索引几何回归（i1/i2 漏 +1/+2 曾致退化三角形整件不可见）', () => {
  it('非索引 IcosahedronGeometry 在 top 视图渲染出可见像素', { timeout: 60_000 }, async () => {
    // 测试前提：three 的 PolyhedronGeometry 系（detail=0）是非索引几何——升级 three 后若失效须换用例载体
    expect(new THREE.IcosahedronGeometry(6, 0).index).toBeNull()
    const { cityDir, buildingDirName } = makeFakeCity('icosahedron', `
      import * as THREE from 'three'
      export default function build(_ctx: unknown): THREE.Object3D {
        const mesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(6, 0),
          new THREE.MeshBasicMaterial({ color: 0xff2200 }),
        )
        mesh.position.set(0, 8, 0)
        const g = new THREE.Group()
        g.add(mesh)
        return g
      }
    `)
    const r = await runShot(repoRoot, cityDir, buildingDirName, { id: 'T0', size: [20, 20], maxHeight: 300 }, 42, {
      views: ['top'], ambs: ['day'], width: 320,
    })
    expect(r.ok).toBe(true)
    const png = r.shots?.find((s) => s.view === 'top')
    expect(png).toBeDefined()
    const { rgb, width, height } = decodePngRgb(readFileSync(png!.path))
    expect(width).toBe(320)
    // 修复前：20 个三角形全部退化（三顶点重合、零面积），整图无红色像素
    expect(countReddish(rgb)).toBeGreaterThan(50)
  })

  it('索引几何（BoxGeometry）路径不受影响，仍正常渲染', { timeout: 60_000 }, async () => {
    expect(new THREE.BoxGeometry(8, 8, 8).index).not.toBeNull()
    const { cityDir, buildingDirName } = makeFakeCity('box', `
      import * as THREE from 'three'
      export default function build(_ctx: unknown): THREE.Object3D {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(8, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff2200 }),
        )
        mesh.position.set(0, 4, 0)
        const g = new THREE.Group()
        g.add(mesh)
        return g
      }
    `)
    const r = await runShot(repoRoot, cityDir, buildingDirName, { id: 'T0', size: [20, 20], maxHeight: 300 }, 42, {
      views: ['top'], ambs: ['day'], width: 320,
    })
    expect(r.ok).toBe(true)
    const png = r.shots?.find((s) => s.view === 'top')
    expect(png).toBeDefined()
    const { rgb } = decodePngRgb(readFileSync(png!.path))
    expect(countReddish(rgb)).toBeGreaterThan(50)
  })
})
