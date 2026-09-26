import * as THREE from 'three'
import { stdMaterial } from '../../../../lib/blocks'
import { mulberry32 } from '../../../../lib/ctx'

const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => { const o = new THREE.Mesh(g, m); o.castShadow = true; return o }

/**
 * 飘窗（凸窗）灯幕墙（豆包私人积木）：朝 +Z 的一整片住宅飘窗墙，y 为板底、X 展开。
 * 纯参数化、无副作用；亮窗由 seed 经 mulberry32 确定性产生（无 Math.random）。
 *
 * 形制（每格一个外凸飘窗盒）：墙面窗下墙 + 过梁；窗位从墙面外挑 proj，
 *   由窗台板 / 顶板 / 两侧封板围合，外端封玻璃窗，顶板外端带滴水线；
 *   约 litRatio 的窗格以暖色温自发光点亮（万家灯火）。
 * 调用约定：楼板/墙宜内退 proj，使凸窗外缘恰好贴齐退线（不越 R13）。
 * 复用：望湖阁（一期）、临湖湖院（二期）、南门公寓（四期）。
 */
export function litgrid(o: {
  w: number
  h: number
  floors: number
  cells?: number
  seed?: number
  litRatio?: number
  sillH?: number
  proj?: number
  y0?: number
  frame?: string
  sill?: string
  glass?: string
}): THREE.Object3D {
  const grp = new THREE.Group()
  const cells = o.cells ?? Math.max(2, Math.round(o.w / 1.3))
  const floorH = o.h / o.floors
  const sillH = o.sillH ?? 0.9
  const winH = floorH - sillH - 0.3                 // 上部过梁 0.3
  const cellW = o.w / cells
  const proj = o.proj ?? 0.42
  const rng = mulberry32(o.seed ?? 7)

  const frameMat = stdMaterial(o.frame ?? '#D9D5CC', { roughness: 0.68 })
  const sillMat = stdMaterial(o.sill ?? '#C8C4BA', { roughness: 0.82 })
  const beamMat = stdMaterial(o.frame ?? '#D9D5CC', { roughness: 0.7 })
  const glassMat = stdMaterial(o.glass ?? '#22344C', { metalness: 0.55, roughness: 0.18, emissive: '#0E1A2A', emissiveIntensity: 0.4 })
  // 亮窗三档暖色温：米白 / 暖黄 / 暖橙，混色更像真实住家
  const litMats = ['#FFF0D2', '#FFD98F', '#FFBE7A'].map(c =>
    stdMaterial(c, { roughness: 0.5, emissive: c, emissiveIntensity: 1.35 }))
  const woodMat = stdMaterial('#9A6E4A', { roughness: 0.85 })

  for (let f = 0; f < o.floors; f++) {
    const yBase = (o.y0 ?? 0) + f * floorH
    const y0 = yBase + sillH            // 窗底
    const y1 = y0 + winH                // 窗顶

    // 窗下墙（墙面整条）与过梁（墙面整条）
    const sill = mesh(new THREE.BoxGeometry(o.w, sillH, 0.14), sillMat)
    sill.position.set(0, yBase + sillH / 2, -0.02); grp.add(sill)
    const beam = mesh(new THREE.BoxGeometry(o.w, 0.22, 0.14), beamMat)
    beam.position.set(0, y1 + 0.11, -0.02); grp.add(beam)

    for (let c = 0; c < cells; c++) {
      const x0 = -o.w / 2 + c * cellW
      const cx = x0 + cellW / 2

      // 飘窗盒：窗台板 / 顶板（外挑 proj）
      const slab = mesh(new THREE.BoxGeometry(cellW - 0.08, 0.08, proj), frameMat)
      slab.position.set(cx, y0 - 0.04, proj / 2); grp.add(slab)
      const top = mesh(new THREE.BoxGeometry(cellW - 0.08, 0.08, proj), frameMat)
      top.position.set(cx, y1 + 0.04, proj / 2); grp.add(top)
      // 两侧封板（格缘内侧错开，避免与邻格 z-fight）
      const sideL = mesh(new THREE.BoxGeometry(0.06, winH, proj), frameMat)
      sideL.position.set(x0 + 0.05, y0 + winH / 2, proj / 2); grp.add(sideL)
      const sideR = mesh(new THREE.BoxGeometry(0.06, winH, proj), frameMat)
      sideR.position.set(x0 + cellW - 0.05, y0 + winH / 2, proj / 2); grp.add(sideR)
      // 外端玻璃窗
      const win = mesh(new THREE.BoxGeometry(cellW - 0.2, winH - 0.12, 0.06), glassMat)
      win.position.set(cx, y0 + winH / 2, proj); grp.add(win)
      // 顶板外端滴水线
      const drip = mesh(new THREE.BoxGeometry(cellW - 0.1, 0.06, 0.1), frameMat)
      drip.position.set(cx, y1 - 0.02, proj - 0.06); grp.add(drip)
      // 亮窗（暖光，在玻璃内侧）
      if (rng() < (o.litRatio ?? 0.22)) {
        const lit = mesh(new THREE.BoxGeometry(cellW - 0.3, winH - 0.28, 0.04), litMats[Math.floor(rng() * litMats.length)])
        lit.position.set(cx, y0 + winH / 2, proj + 0.01); grp.add(lit)
      }
      // 窗台花箱（约半数住家种花，rng 确定性）：木花盒 + 叶丛，置于飘窗窗台内端
      if (rng() < 0.55) {
        const planter = mesh(new THREE.BoxGeometry(0.5, 0.22, 0.18), woodMat)
        planter.position.set(cx, y0 + 0.11, -0.08); grp.add(planter)
        const foliage = mesh(new THREE.IcosahedronGeometry(0.22, 1), stdMaterial('#6E8A54', { roughness: 0.9 }))
        foliage.scale.y = 0.75; foliage.position.set(cx, y0 + 0.3, -0.06); grp.add(foliage)
      }
    }
  }

  return grp
}
