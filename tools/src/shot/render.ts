/** 软件光栅化渲染器——把 worker 从建筑场景里抽取的三角形汤渲染成多视角图。
 *  不依赖 three / WebGL / 浏览器：确定性、秒级、可在 CI 与无头环境运行。
 *  输入 TriSoup（世界空间三角形 + 每顶点反照率 + 自发光），输出 RGB 像素数组。 */

export interface TriSoup {
  pos: Float32Array    // 9 floats/三角形：x,y,z × 3 顶点（世界空间）
  alb: Float32Array    // 9 floats/三角形：r,g,b × 3 顶点（0-1 线性近似）
  emi: Float32Array    // 9 floats/三角形：自发光（BasicMaterial/霓虹/夜景窗灯）
  count: number
}

export interface Amb {
  skyZenith: [number, number, number]
  skyHorizon: [number, number, number]
  ground: [number, number, number]
  sunDir: [number, number, number]   // 指向太阳的方向（已归一化）
  sunColor: [number, number, number]
  sunI: number
  ambI: number
  fog: [number, number, number]
  fogK: number
}

export const AMBIANTS: Record<'day' | 'dusk' | 'night', Amb> = {
  day:   { skyZenith: [0.62, 0.78, 0.91], skyHorizon: [0.91, 0.93, 0.95], ground: [0.72, 0.71, 0.67],
           sunDir: [0.45, 0.82, 0.36], sunColor: [1.0, 0.96, 0.88], sunI: 0.95, ambI: 0.45,
           fog: [0.88, 0.91, 0.94], fogK: 0.0008 },
  dusk:  { skyZenith: [0.43, 0.53, 0.72], skyHorizon: [0.95, 0.70, 0.48], ground: [0.56, 0.50, 0.45],
           sunDir: [-0.88, 0.28, 0.18], sunColor: [1.0, 0.69, 0.38], sunI: 0.7, ambI: 0.36,
           fog: [0.90, 0.72, 0.58], fogK: 0.0009 },
  night: { skyZenith: [0.04, 0.07, 0.13], skyHorizon: [0.09, 0.14, 0.23], ground: [0.07, 0.10, 0.14],
           sunDir: [-0.30, 0.80, -0.40], sunColor: [0.66, 0.75, 0.88], sunI: 0.14, ambI: 0.20,
           fog: [0.08, 0.12, 0.20], fogK: 0.0009 },
}

export interface Camera {
  eye: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
  fovDeg: number    // 透视视场角；0 = 正交
  orthoH: number    // 正交时画面纵向覆盖的世界尺寸
}

export type ViewName = 'street' | 'corner' | 'aerial' | 'top' | 'front' | 'back' | 'left' | 'right' | 'custom'
export const DEFAULT_VIEWS: ViewName[] = ['street', 'corner', 'aerial', 'top']

const norm3 = (v: [number, number, number]): [number, number, number] => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

/** 由建筑包围盒自动推导机位——agent 无需手调相机（这是本工具相对自建渲染器的核心增值）。
 *  透视机位按「整楼装入垂直视场」反推距离：dist ≥ 目标高度差 / tan(半视场角)，超高层也完整入画。 */
export function deriveCameras(bbox: { min: [number, number, number]; max: [number, number, number] }, views: ViewName[]): Record<string, Camera> {
  const cx = (bbox.min[0] + bbox.max[0]) / 2
  const cz = (bbox.min[2] + bbox.max[2]) / 2
  const y0 = bbox.min[1]
  const W = Math.max(1e-3, bbox.max[0] - bbox.min[0])
  const H = Math.max(1e-3, bbox.max[1] - bbox.min[1])
  const D = Math.max(1e-3, bbox.max[2] - bbox.min[2])
  const span = Math.max(W, D)
  const diag = Math.hypot(W, H, D)
  const cams: Record<string, Camera> = {}
  // 画面纵横比固定 3:2（height = width*2/3）；透视距离取「垂直装得下」与「水平装得下」的较大者
  const ASPECT = 1.5
  const fitDist = (fovDeg: number, fitH: number, fitW: number) =>
    Math.max((fitH / 2) / Math.tan((fovDeg * Math.PI) / 360), (fitW / 2) / Math.tan(Math.atan(Math.tan((fovDeg * Math.PI) / 360) * ASPECT)))
  for (const v of views) {
    if (v === 'street') {
      const fov = 55
      const dist = fitDist(fov, H * 1.24, span * 1.24)
      cams[v] = { eye: [cx, y0 + 1.7, cz + D / 2 + dist], target: [cx, y0 + H * 0.38, cz], up: [0, 1, 0], fovDeg: fov, orthoH: 0 }
    } else if (v === 'corner') {
      const fov = 50
      const projW = (W + D) * Math.SQRT1_2
      const hd = fitDist(fov, H * 1.5, projW * 1.5)
      cams[v] = { eye: [cx + hd * Math.SQRT1_2, y0 + H * 0.35, cz + hd * Math.SQRT1_2], target: [cx, y0 + H * 0.4, cz], up: [0, 1, 0], fovDeg: fov, orthoH: 0 }
    } else if (v === 'aerial') {
      const dist = diag * 1.3 + 8
      const dir = norm3([0.55, 1.05, 0.75])
      cams[v] = { eye: [cx + dir[0] * dist, y0 + dir[1] * dist, cz + dir[2] * dist], target: [cx, y0 + H * 0.35, cz], up: [0, 1, 0], fovDeg: 50, orthoH: 0 }
    } else if (v === 'top') {
      cams[v] = { eye: [cx, bbox.max[1] + diag + 20, cz + 0.01], target: [cx, y0, cz], up: [0, 0, -1], fovDeg: 0, orthoH: Math.max(W, D) * 1.3 }
    } else if (v === 'front' || v === 'back' || v === 'left' || v === 'right') {
      const s: Record<string, [number, number, number]> = { front: [0, 0, 1], back: [0, 0, -1], left: [-1, 0, 0], right: [1, 0, 0] }
      const d = s[v]
      const dist = diag + 10
      cams[v] = { eye: [cx + d[0] * dist, y0 + H / 2, cz + d[2] * dist], target: [cx, y0 + H / 2, cz], up: [0, 1, 0], fovDeg: 0, orthoH: Math.max(W, H) * 1.2 }
    }
    // 其他视角名（如 worker 注入的 custom 自定义机位）不在此推导，由调用方自行填入 cams
  }
  return cams
}

interface Basis { right: [number, number, number]; up: [number, number, number]; fwd: [number, number, number]; eye: [number, number, number] }

function basisOf(cam: Camera): Basis {
  const fwd = norm3([cam.target[0] - cam.eye[0], cam.target[1] - cam.eye[1], cam.target[2] - cam.eye[2]])
  let up = cam.up
  // up 与视线近平行时（正俯视）换一个可用 up
  if (Math.abs(fwd[0] * up[0] + fwd[1] * up[1] + fwd[2] * up[2]) > 0.999) up = [0, 0, 1]
  const right = norm3([
    up[1] * fwd[2] - up[2] * fwd[1],
    up[2] * fwd[0] - up[0] * fwd[2],
    up[0] * fwd[1] - up[1] * fwd[0],
  ])
  const up2: [number, number, number] = [
    fwd[1] * right[2] - fwd[2] * right[1],
    fwd[2] * right[0] - fwd[0] * right[2],
    fwd[0] * right[1] - fwd[1] * right[0],
  ]
  return { right, up: up2, fwd, eye: cam.eye }
}

/** 渲染一帧：返回 width×height×3 的 RGB 字节数组（SS=2 超采样抗锯齿后降采样） */
export function renderView(soup: TriSoup, cam: Camera, amb: Amb, width: number, height: number): Uint8Array {
  const SS = 2
  const w = width * SS, h = height * SS
  const { right, up, fwd, eye } = basisOf(cam)
  const ortho = cam.fovDeg === 0
  const focal = ortho ? 0 : 1 / Math.tan((cam.fovDeg * Math.PI) / 360)
  const scaleO = ortho ? 2 / cam.orthoH : 0   // 正交：世界→裁剪 [-1,1]

  // 场景半径用于近远面与地面尺寸
  let sceneR = 1
  for (let i = 0; i < soup.count * 9; i += 9) {
    for (let v = 0; v < 3; v++) {
      const dx = soup.pos[i + v * 3] - eye[0], dy = soup.pos[i + v * 3 + 1] - eye[1], dz = soup.pos[i + v * 3 + 2] - eye[2]
      const d = dx * dx + dy * dy + dz * dz
      if (d > sceneR) sceneR = d
    }
  }
  sceneR = Math.sqrt(sceneR)
  const near = 0.1
  const far = sceneR * 3 + 100

  // 地面（大平面两三角形）并入渲染；下沉 0.02 防与建筑地被层共面 z-fighting
  const gR = sceneR * 2.5
  const groundSoup: TriSoup = {
    pos: Float32Array.of(
      eye[0] - gR, -0.02, eye[2] - gR, eye[0] - gR, -0.02, eye[2] + gR, eye[0] + gR, -0.02, eye[2] + gR,
      eye[0] - gR, -0.02, eye[2] - gR, eye[0] + gR, -0.02, eye[2] + gR, eye[0] + gR, -0.02, eye[2] - gR),
    alb: Float32Array.of(...Array(18).fill(0).flatMap(() => amb.ground)),
    emi: new Float32Array(18),
    count: 2,
  }

  const depth = new Float32Array(w * h).fill(Infinity)
  const color = new Float32Array(w * h * 3)

  const sunL = norm3(amb.sunDir)
  const project = (x: number, y: number, z: number): [number, number, number, number] => {
    const dx = x - eye[0], dy = y - eye[1], dz = z - eye[2]
    const cxp = right[0] * dx + right[1] * dy + right[2] * dz
    const cyp = up[0] * dx + up[1] * dy + up[2] * dz
    const czp = fwd[0] * dx + fwd[1] * dy + fwd[2] * dz   // 相机空间 z（朝前为正）
    if (ortho) return [(cxp * scaleO + 1) / 2, (cyp * scaleO + 1) / 2, czp, 1]
    const w = Math.max(czp, 1e-6)
    return [(focal * cxp / w + 1) / 2, (focal * cyp / w + 1) / 2, czp, w]
  }

  const drawTri = (x1: number, y1: number, z1: number, w1: number, x2: number, y2: number, z2: number, w2: number,
                   x3: number, y3: number, z3: number, w3: number,
                   ar: number, ag: number, ab: number, nx: number, ny: number, nz: number, er: number, eg: number, eb: number, fogd: number) => {
    // 屏幕空间（像素）
    const sx1 = x1 * w, sy1 = (1 - y1) * h, sx2 = x2 * w, sy2 = (1 - y2) * h, sx3 = x3 * w, sy3 = (1 - y3) * h
    const minX = Math.max(0, Math.floor(Math.min(sx1, sx2, sx3)))
    const maxX = Math.min(w - 1, Math.ceil(Math.max(sx1, sx2, sx3)))
    const minY = Math.max(0, Math.floor(Math.min(sy1, sy2, sy3)))
    const maxY = Math.min(h - 1, Math.ceil(Math.max(sy1, sy2, sy3)))
    if (minX > maxX || minY > maxY) return
    const area = (sx2 - sx1) * (sy3 - sy1) - (sy2 - sy1) * (sx3 - sx1)
    if (Math.abs(area) < 1e-9) return
    const iw1 = 1 / w1, iw2 = 1 / w2, iw3 = 1 / w3
    // 光照（flat：面法线 × 太阳 + 环境 + 自发光）
    const nl = Math.max(0, nx * sunL[0] + ny * sunL[1] + nz * sunL[2])
    const fogf = 1 - Math.exp(-fogd * amb.fogK)
    const lr = Math.min(1.6, ar * amb.ambI + ar * amb.sunColor[0] * amb.sunI * nl + er)
    const lg = Math.min(1.6, ag * amb.ambI + ag * amb.sunColor[1] * amb.sunI * nl + eg)
    const lb = Math.min(1.6, ab * amb.ambI + ab * amb.sunColor[2] * amb.sunI * nl + eb)
    const fr = lr + (amb.fog[0] - lr) * fogf
    const fg = lg + (amb.fog[1] - lg) * fogf
    const fb = lb + (amb.fog[2] - lb) * fogf

    for (let py = minY; py <= maxY; py++) {
      const dy2 = py + 0.5 - sy2, dy3 = py + 0.5 - sy3, dy1 = py + 0.5 - sy1
      for (let px = minX; px <= maxX; px++) {
        const dx2 = px + 0.5 - sx2, dx3 = px + 0.5 - sx3, dx1 = px + 0.5 - sx1
        const b1 = (dx2 * dy3 - dy2 * dx3) / area
        const b2 = (dx3 * dy1 - dy3 * dx1) / area
        const b3 = 1 - b1 - b2
        if (b1 < 0 || b2 < 0 || b3 < 0) continue
        // 透视校正深度：先线性插值 1/w 与 z/w，再相除
        const iw = b1 * iw1 + b2 * iw2 + b3 * iw3
        if (iw <= 1e-9) continue
        const zov = (b1 * z1 * iw1 + b2 * z2 * iw2 + b3 * z3 * iw3) / iw
        if (zov < near || zov > far) continue
        const idx = py * w + px
        if (zov >= depth[idx]) continue
        depth[idx] = zov
        color[idx * 3] = fr; color[idx * 3 + 1] = fg; color[idx * 3 + 2] = fb
      }
    }
  }

  const renderSoup = (s: TriSoup) => {
    for (let i = 0; i < s.count * 9; i += 9) {
      const p1 = project(s.pos[i], s.pos[i + 1], s.pos[i + 2])
      const p2 = project(s.pos[i + 3], s.pos[i + 4], s.pos[i + 5])
      const p3 = project(s.pos[i + 6], s.pos[i + 7], s.pos[i + 8])
      if (p1[3] <= near || p2[3] <= near || p3[3] <= near) continue
      // 面法线（世界空间）
      const ax = s.pos[i + 3] - s.pos[i], ay = s.pos[i + 4] - s.pos[i + 1], az = s.pos[i + 5] - s.pos[i + 2]
      const bx = s.pos[i + 6] - s.pos[i], by = s.pos[i + 7] - s.pos[i + 1], bz = s.pos[i + 8] - s.pos[i + 2]
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
      const nl = Math.hypot(nx, ny, nz)
      if (nl < 1e-9) continue
      nx /= nl; ny /= nl; nz /= nl
      // 双面光照：不剔背面（防薄板/栏杆类单面几何出现镂空），可见面法线翻向相机侧，受光与缠绕方向无关
      if (nx * fwd[0] + ny * fwd[1] + nz * fwd[2] > 0) { nx = -nx; ny = -ny; nz = -nz }
      // 反照率取三顶点均值（顶点色/贴图类构件近似）；雾距取面心
      const ar = (s.alb[i] + s.alb[i + 3] + s.alb[i + 6]) / 3
      const ag = (s.alb[i + 1] + s.alb[i + 4] + s.alb[i + 7]) / 3
      const ab = (s.alb[i + 2] + s.alb[i + 5] + s.alb[i + 8]) / 3
      const er = (s.emi[i] + s.emi[i + 3] + s.emi[i + 6]) / 3
      const eg = (s.emi[i + 1] + s.emi[i + 4] + s.emi[i + 7]) / 3
      const eb = (s.emi[i + 2] + s.emi[i + 5] + s.emi[i + 8]) / 3
      const fogd = 0.5 * (p1[2] + p2[2] + p3[2])
      drawTri(p1[0], p1[1], p1[2], p1[3], p2[0], p2[1], p2[2], p2[3], p3[0], p3[1], p3[2], p3[3],
              ar, ag, ab, nx, ny, nz, er, eg, eb, fogd)
    }
  }
  renderSoup(groundSoup)
  renderSoup(soup)

  // 天空背景（只在 depth=Infinity 处）+ 降采样输出
  const out = new Uint8Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const iw = (y * SS + sy) * w + (x * SS + sx)
          if (depth[iw] !== Infinity) {
            r += color[iw * 3]; g += color[iw * 3 + 1]; b += color[iw * 3 + 2]
          } else {
            const t = Math.min(1, Math.max(0, ((y * SS + sy) / h - 0.18) / 0.64))
            const e = t * t * (3 - 2 * t)
            r += amb.skyHorizon[0] + (amb.skyZenith[0] - amb.skyHorizon[0]) * e
            g += amb.skyHorizon[1] + (amb.skyZenith[1] - amb.skyHorizon[1]) * e
            b += amb.skyHorizon[2] + (amb.skyZenith[2] - amb.skyHorizon[2]) * e
          }
        }
      }
      const n = SS * SS
      const o = (y * width + x) * 3
      out[o] = Math.round(255 * Math.min(1, r / n))
      out[o + 1] = Math.round(255 * Math.min(1, g / n))
      out[o + 2] = Math.round(255 * Math.min(1, b / n))
    }
  }
  return out
}
