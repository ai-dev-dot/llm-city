/** 最小 GIF89a 编码器（8-bit 全局色表 + LZW）——零依赖出动画，风格同 png.ts。
 *  口径借鉴 llm_test tools/gif_maker.py 的实测教训：
 *  - 全帧统一调色板：逐帧独立量化会调色板闪烁，是暗场/渐变场景色彩劣化的元凶；
 *  - Floyd-Steinberg 抖动：改善天空渐变条带；
 *  - 微信单文件硬限 10MB / 300 帧（2026-09 实证「图片帧数超过300帧」直接拒传）：
 *    超体积上限走「保时」抽稀——帧数减半、每帧时长 ×2，播放时长不变只有流畅度降档。 */

export interface GifMeta {
  framesTotal: number
  framesUsed: number
  step: number          // 抽稀步长（1 = 未抽稀）
  frameMs: number       // 实际每帧时长（抽稀后 = 原值 × step）
  width: number
  height: number
  colors: number        // 全局调色板实际颜色数（≤256）
}

export interface GifEncodeOptions {
  frameMs?: number      // 每帧时长（毫秒），缺省 100（=10fps）
  loop?: number         // 循环次数，0 = 无限循环（缺省）
  maxBytes?: number     // 体积上限：超限按 step 翻倍保时抽稀重编，2 帧下限为止
  dither?: boolean      // FS 抖动（缺省关）：调色板缺色的过渡区更平滑，但平坦区有颗粒感——
                        // 城市全景主色（天空/草皮）调色板覆盖率高，实测无抖动更干净
}

const MAX_COLORS = 256
const CLEAR = 256
const EOI = 257

// ---------------------------------------------------------------- 调色板

interface Box { start: number; end: number; weight: number }

/** 5bit/通道直方图（32768 桶）上的中位切分——全局统一调色板（≤256 色）。
 *  返回 pal（RGB 串联）与 lut（32768 桶 → 最近调色板索引反查表，供抖动后 O(1) 找色）。 */
function buildPalette(frames: Uint8Array[]): { pal: Uint8Array; colors: number; lut: Uint8Array } {
  const hist = new Uint32Array(1 << 15)
  for (const f of frames) {
    for (let i = 0; i < f.length; i += 3) {
      hist[(f[i] >> 3) << 10 | (f[i + 1] >> 3) << 5 | (f[i + 2] >> 3)]++
    }
  }
  // 非空桶 → items[i] = 桶 key（权重另存），桶中心色 = 5bit 值 ×8+4
  const keys: number[] = []
  const counts: number[] = []
  for (let k = 0; k < hist.length; k++) {
    if (hist[k] > 0) { keys.push(k); counts.push(hist[k]) }
  }
  const boxes: Box[] = [{ start: 0, end: keys.length, weight: keys.length ? counts.reduce((a, b) => a + b, 0) : 0 }]

  // 桶在某轴上的取值（0-31）与排序键缓存——分裂时按轴排序 items 区间
  const axisOf = (k: number, a: number) => a === 0 ? (k >> 10) & 31 : a === 1 ? (k >> 5) & 31 : k & 31

  while (boxes.length < MAX_COLORS) {
    // 分裂像素权重最大的盒；无可分盒（单桶）即止
    let bi = -1, bw = 0
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]
      if (b.weight > bw && b.end - b.start > 1) { bw = b.weight; bi = i }
    }
    if (bi < 0) break
    const box = boxes[bi]
    // 盒内范围最大的通道作分裂轴
    const range = [0, 0, 0]
    for (let a = 0; a < 3; a++) {
      let lo = 31, hi = 0
      for (let i = box.start; i < box.end; i++) {
        const v = axisOf(keys[i], a)
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
      range[a] = hi - lo
    }
    const axis = range[0] >= range[1] && range[0] >= range[2] ? 0 : range[1] >= range[2] ? 1 : 2
    const idx = Array.from({ length: box.end - box.start }, (_, j) => box.start + j)
      .sort((p, q) => axisOf(keys[p], axis) - axisOf(keys[q], axis))
    // 按权重半和找切点（重排进原区间，保持 boxes 其余盒不受影响）
    let half = box.weight / 2, cut = 0, acc = 0
    for (let j = 0; j < idx.length - 1; j++) {
      acc += counts[idx[j]]
      if (acc >= half) { cut = j + 1; break }
    }
    if (cut <= 0) cut = 1
    const order = new Array(idx.length)
    for (let j = 0; j < idx.length; j++) order[j] = keys[idx[j]]
    const orderW = new Array(idx.length)
    for (let j = 0; j < idx.length; j++) orderW[j] = counts[idx[j]]
    for (let j = 0; j < idx.length; j++) { keys[box.start + j] = order[j]; counts[box.start + j] = orderW[j] }
    const leftWeight = orderW.slice(0, cut).reduce((a, b) => a + b, 0)
    boxes[bi] = { start: box.start, end: box.start + cut, weight: leftWeight }
    boxes.push({ start: box.start + cut, end: box.end, weight: box.weight - leftWeight })
  }

  const pal = new Uint8Array(MAX_COLORS * 3)
  let colors = 0
  for (const b of boxes) {
    if (b.end <= b.start) continue
    let r = 0, g = 0, bl = 0, w = 0
    for (let i = b.start; i < b.end; i++) {
      const k = keys[i], n = counts[i]
      r += (((k >> 10) & 31) * 8 + 4) * n
      g += (((k >> 5) & 31) * 8 + 4) * n
      bl += ((k & 31) * 8 + 4) * n
      w += n
    }
    pal[colors * 3] = Math.min(255, Math.round(r / w))
    pal[colors * 3 + 1] = Math.min(255, Math.round(g / w))
    pal[colors * 3 + 2] = Math.min(255, Math.round(bl / w))
    colors++
  }

  // 反查表：每个 5bit 桶找最近调色板色（欧氏）——抖动后查色 O(1)
  const lut = new Uint8Array(1 << 15)
  for (let k = 0; k < lut.length; k++) {
    const r = ((k >> 10) & 31) * 8 + 4, g = ((k >> 5) & 31) * 8 + 4, bl = (k & 31) * 8 + 4
    let best = 0, bd = Infinity
    for (let c = 0; c < colors; c++) {
      const dr = r - pal[c * 3], dg = g - pal[c * 3 + 1], db = bl - pal[c * 3 + 2]
      const d = dr * dr + dg * dg + db * db
      if (d < bd) { bd = d; best = c }
    }
    lut[k] = best
  }
  return { pal, colors, lut }
}

/** 量化一帧：LUT 反查最近色；dither 开 FS 抖动（误差扩散），关则直接最近色 */
function quantizeFrame(frame: Uint8Array, width: number, height: number, pal: Uint8Array, lut: Uint8Array, dither: boolean): Uint8Array {
  const idx = new Uint8Array(width * height)
  const errCur = new Float32Array(width * 3)
  const errNext = new Float32Array(width * 3)
  for (let y = 0; y < height; y++) {
    if (dither) errNext.fill(0)
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 3, e = x * 3
      const r = Math.max(0, Math.min(255, frame[p] + (dither ? errCur[e] : 0)))
      const g = Math.max(0, Math.min(255, frame[p + 1] + (dither ? errCur[e + 1] : 0)))
      const b = Math.max(0, Math.min(255, frame[p + 2] + (dither ? errCur[e + 2] : 0)))
      const pi = lut[(r >> 3) << 10 | (g >> 3) << 5 | (b >> 3)]
      idx[y * width + x] = pi
      if (!dither) continue
      // FS 误差分摊：右 7/16、左下 3/16、下 5/16、右下 1/16
      const dr = r - pal[pi * 3], dg = g - pal[pi * 3 + 1], db = b - pal[pi * 3 + 2]
      if (x + 1 < width) { errCur[e + 3] += dr * 7 / 16; errCur[e + 4] += dg * 7 / 16; errCur[e + 5] += db * 7 / 16 }
      const en = (y + 1 < height ? (y + 1) * width + x : -1) * 3
      if (en >= 0) {
        if (x > 0) { errNext[e - 3] += dr * 3 / 16; errNext[e - 2] += dg * 3 / 16; errNext[e - 1] += db * 3 / 16 }
        errNext[e] += dr * 5 / 16; errNext[e + 1] += dg * 5 / 16; errNext[e + 2] += db * 5 / 16
        if (x + 1 < width) { errNext[e + 3] += dr / 16; errNext[e + 4] += dg / 16; errNext[e + 5] += db / 16 }
      }
    }
    if (dither) errCur.set(errNext)
  }
  return idx
}

// ---------------------------------------------------------------- LZW

/** GIF 变体 LZW 压缩一帧索引序列（minCodeSize=8）：LSB-first 位流，码长 9→12，
 *  表满 4096 发 clear 重置。开放寻址哈希表（key = prefix<<8 | pixel）。 */
function lzwEncode(indices: Uint8Array): Buffer {
  const HSIZE = 1 << 13
  const hKey = new Int32Array(HSIZE).fill(-1)
  const hVal = new Int32Array(HSIZE)
  const out: number[] = []
  let bitBuf = 0, bitCnt = 0, codeSize = 9, next = 258

  const emit = (code: number) => {
    bitBuf |= code << bitCnt
    bitCnt += codeSize
    while (bitCnt >= 8) {
      out.push(bitBuf & 0xff)
      bitBuf >>>= 8
      bitCnt -= 8
    }
  }
  const reset = () => { hKey.fill(-1); codeSize = 9; next = 258 }

  if (indices.length === 0) {
    emit(CLEAR); emit(EOI)
    if (bitCnt > 0) out.push(bitBuf & 0xff)
    return Buffer.from(out)
  }
  emit(CLEAR)
  let prefix = indices[0]
  for (let i = 1; i < indices.length; i++) {
    const c = indices[i]
    const key = (prefix << 8) | c
    // 查表
    let h = (key * 501) & (HSIZE - 1)
    while (hKey[h] !== -1 && hKey[h] !== key) h = (h + 1) & (HSIZE - 1)
    if (hKey[h] === key) { prefix = hVal[h]; continue }
    emit(prefix)
    // 码长增长检查在输出后、插入前（giflib 语义）：本码用旧位宽写出，写完才切；
    // 解码器在「读本码、插入条目」后基于同一水位切位，双方下一个码起同宽。
    // （若把检查放在插入之后，编码器会比解码器早一个码切换—— Pillow 实测 broken data stream 的根因）
    if (codeSize < 12 && next >= (1 << codeSize)) codeSize++
    if (next < 4096) {
      hKey[h] = key; hVal[h] = next
      next++
    } else {
      emit(CLEAR)
      reset()
    }
    prefix = c
  }
  emit(prefix)
  emit(EOI)
  if (bitCnt > 0) out.push(bitBuf & 0xff)
  return Buffer.from(out)
}

// ---------------------------------------------------------------- GIF 容器

/** 帧序列（RGB）→ 循环 GIF。全局统一调色板 + FS 抖动；maxBytes 超限保时抽稀。 */
export function encodeGif(
  frames: Uint8Array[],
  width: number,
  height: number,
  opts: GifEncodeOptions = {},
): { buf: Buffer; meta: GifMeta } {
  if (frames.length === 0) throw new Error('encodeGif：帧序列为空')
  const frameMs0 = opts.frameMs ?? 100
  const loop = opts.loop ?? 0

  let step = 1
  let pal: Uint8Array, colors: number, lut: Uint8Array, buf: Buffer
  for (;;) {
    const sel = frames.filter((_, i) => i % step === 0)
    ;({ pal, colors, lut } = buildPalette(sel))
    const parts: Buffer[] = []
    // header + 逻辑屏幕描述符（全局色表 256 项）+ 背景色/长宽比
    const lsd = Buffer.alloc(7)
    lsd.writeUInt16LE(width, 0)
    lsd.writeUInt16LE(height, 2)
    lsd[4] = 0xf7   // 全局色表 1、色分辨率 7、色表尺寸 7（256 项）
    lsd[5] = 0      // 背景色索引
    lsd[6] = 0
    parts.push(Buffer.from('GIF89a', 'ascii'), lsd, Buffer.from(pal))
    // NETSCAPE2.0 循环扩展
    const ext = Buffer.from([0x21, 0xff, 0x0b])
    parts.push(ext, Buffer.from('NETSCAPE2.0', 'ascii'), Buffer.from([3, 1, loop & 0xff, (loop >> 8) & 0xff, 0]))
    // 逐帧：图形控制扩展 + 图像描述符 + LZW 数据子块
    const frameMs = frameMs0 * step
    const delay = Math.max(2, Math.round(frameMs / 10))   // 单位 10ms
    const dither = opts.dither ?? false
    for (const f of sel) {
      const idx = quantizeFrame(f, width, height, pal, lut, dither)
      const gce = Buffer.from([0x21, 0xf9, 0x04, 0x04, delay & 0xff, (delay >> 8) & 0xff, 0, 0])
      const id = Buffer.alloc(10)
      id[0] = 0x2c
      id.writeUInt16LE(width, 5)
      id.writeUInt16LE(height, 7)
      parts.push(gce, id, Buffer.from([8]))
      const lzw = lzwEncode(idx)
      for (let o = 0; o < lzw.length; o += 255) {
        const chunk = lzw.subarray(o, Math.min(o + 255, lzw.length))
        parts.push(Buffer.from([chunk.length]), chunk)
      }
      parts.push(Buffer.from([0]))
    }
    parts.push(Buffer.from([0x3b]))
    buf = Buffer.concat(parts)
    if (opts.maxBytes == null || buf.length <= opts.maxBytes || sel.length <= 2) break
    step *= 2   // 保时抽稀：帧数减半、每帧时长 ×2，播放时长不变
  }

  return {
    buf,
    meta: {
      framesTotal: frames.length,
      framesUsed: Math.ceil(frames.length / step),
      step,
      frameMs: frameMs0 * step,
      width,
      height,
      colors,
    },
  }
}
