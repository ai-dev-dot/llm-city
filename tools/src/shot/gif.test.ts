import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { encodeGif } from './gif'
import { deriveOrbitCameras } from './render'
import { runOrbitShot } from './run'

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
// 假城市与渲染产物都落 gitignore 的缓存工作间（面向 LLM 的产物不进版本库）
const workRoot = resolve(repoRoot, 'node_modules/.cache/llm-city/orbit-regression')

/** 数 GIF 中 GCE（21 F9 04）扩展出现次数 = 帧数 */
function countFrames(buf: Buffer): number {
  let n = 0
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0x21 && buf[i + 1] === 0xf9 && buf[i + 2] === 0x04) n++
  }
  return n
}

/** 读 GCE 里的帧时长（单位 10ms）——首帧的 */
function firstDelayMs(buf: Buffer): number {
  const i = buf.indexOf(Buffer.from([0x21, 0xf9, 0x04]))
  return buf.readUInt16LE(i + 4) * 10
}

beforeAll(() => {
  rmSync(workRoot, { recursive: true, force: true })
  mkdirSync(workRoot, { recursive: true })
})

describe('encodeGif：GIF89a 容器与保时抽稀', () => {
  it('三帧小图：头部/尺寸/帧数/循环扩展/尾字节齐全，尺寸一致', () => {
    const w = 24, h = 16
    const frame = (r: number, g: number, b: number) => new Uint8Array(w * h * 3).fill(0).map((_, i) => [r, g, b][i % 3])
    const { buf, meta } = encodeGif([frame(255, 0, 0), frame(0, 255, 0), frame(0, 0, 255)], w, h, { frameMs: 100 })
    expect(buf.subarray(0, 6).toString('ascii')).toBe('GIF89a')
    expect(buf.readUInt16LE(6)).toBe(w)
    expect(buf.readUInt16LE(8)).toBe(h)
    // NETSCAPE 循环扩展跟在 768 字节全局色表之后，用 indexOf 定位
    expect(buf.indexOf(Buffer.from('NETSCAPE2.0', 'ascii'))).toBeGreaterThan(0)
    expect(countFrames(buf)).toBe(3)
    expect(buf[buf.length - 1]).toBe(0x3b)
    expect(meta).toMatchObject({ framesTotal: 3, framesUsed: 3, step: 1, frameMs: 100 })
    // 纯色帧无抖动空间，调色板应收敛到每帧 1 色、共 3 色（+1 地面/边缘混合余量）
    expect(meta.colors).toBeLessThanOrEqual(4)
  })

  it('超 maxBytes 保时抽稀：step 翻倍、帧数减半、每帧时长×2——播放时长守恒', () => {
    const w = 64, h = 48
    const frames = Array.from({ length: 8 }, (_, k) => {
      const f = new Uint8Array(w * h * 3)
      for (let i = 0; i < f.length; i += 3) {
        // 噪声帧：LZW 压不动，体积必然超限
        f[i] = (i * 7 + k * 13) % 256; f[i + 1] = (i * 5 + k * 29) % 256; f[i + 2] = (i * 3 + k * 11) % 256
      }
      return f
    })
    const { buf, meta } = encodeGif(frames, w, h, { frameMs: 100, maxBytes: 1024 })
    expect(countFrames(buf)).toBe(meta.framesUsed)
    expect(meta.step).toBeGreaterThanOrEqual(2)
    expect(meta.framesUsed).toBeLessThan(meta.framesTotal)
    expect(meta.frameMs).toBe(100 * meta.step)
    // 保时语义：帧数/step × 帧时长×step = 播放时长不变
    expect(meta.framesUsed * meta.frameMs).toBeCloseTo(meta.framesTotal * 100, 0)
    expect(firstDelayMs(buf)).toBe(Math.round(100 * meta.step / 10) * 10)
  })

  it('deriveOrbitCameras：首帧对齐 aerial 方位、末帧与首帧相差整圈（无缝循环）', () => {
    const bbox = { min: [-45, 0, -45] as [number, number, number], max: [45, 60, 45] as [number, number, number] }
    const cams = deriveOrbitCameras(bbox, 50)
    expect(cams).toHaveLength(50)
    expect(cams[0].fovDeg).toBe(50)
    // 末帧 θ 走到 2π×49/50，与首帧差一个等分角；同半径同高度
    const r = (c: typeof cams[0]) => Math.hypot(c.eye[0] - cams[0].target[0], c.eye[2] - cams[0].target[2])
    expect(r(cams[49])).toBeCloseTo(r(cams[0]), 6)
    expect(cams[49].eye[1]).toBeCloseTo(cams[0].eye[1], 6)
    // 目标点锁定包围盒中部偏上（y0 + H*0.40），绕飞中不漂移
    for (const c of cams) expect(c.target).toEqual([0, 24, 0])
  })
})

describe('runOrbitShot：假城市端到端（编译 → 绕飞渲染 → GIF 落盘）', () => {
  it('单楼假城市出 8 帧绕飞 GIF，结构与尺寸正确', { timeout: 120_000 }, async () => {
    const buildingDirName = 'orbit-regression-box'
    const cityDir = resolve(workRoot, 'city')
    mkdirSync(resolve(cityDir, 'buildings', buildingDirName), { recursive: true })
    writeFileSync(resolve(cityDir, 'buildings', buildingDirName, 'index.ts'), `
      import * as THREE from 'three'
      export default function build(_ctx: unknown): THREE.Object3D {
        const g = new THREE.Group()
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(8, 20, 8), new THREE.MeshStandardMaterial({ color: 0xcc4444 }))
        mesh.position.set(0, 10, 0)
        g.add(mesh)
        return g
      }
    `)
    mkdirSync(resolve(cityDir), { recursive: true })
    writeFileSync(resolve(cityDir, 'plan.json'), JSON.stringify({
      grid: { blocks: 9, blockPitch: 60, roadWidth: 10 },
      lots: Array.from({ length: 81 }, (_, i) => {
        const col = i % 9, row = Math.floor(i / 9)
        return { id: `${'ABCDEFGHI'[row]}${col + 1}-01`, center: [(col - 4) * 60, (row - 4) * 60], district: `${'ABCDEFGHI'[row]}${col + 1}` }
      }),
    }))
    mkdirSync(resolve(cityDir, 'registry'), { recursive: true })
    writeFileSync(resolve(cityDir, 'registry.jsonl'), JSON.stringify({
      id: 'b-000001', lot: 'E5-01', parcel: ['E5-01'], name: '测试楼',
      entry: `buildings/${buildingDirName}/index.ts`, builder: { model: 'test', model_id: 'test' },
      sessions: [],
    }) + '\n')
    const r = await runOrbitShot(repoRoot, cityDir, 'E5', { frames: 8, width: 320, outDir: resolve(workRoot, 'out') })
    expect(r.ok).toBe(true)
    const gif = readFileSync(r.gifPath!)
    expect(gif.subarray(0, 6).toString('ascii')).toBe('GIF89a')
    expect(gif.readUInt16LE(6)).toBe(320)
    expect(gif.readUInt16LE(8)).toBe(Math.round(320 * 0.667))
    expect(countFrames(gif)).toBe(r.framesUsed)
    expect(r.framesTotal).toBe(8)
    // 保时抽稀下帧数可能减，但播放时长守恒 = 总帧数/fps
    expect(r.durationS).toBeCloseTo(8 / 10, 5)
  })
})
