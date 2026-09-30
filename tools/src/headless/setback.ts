import * as THREE from 'three'

/**
 * R13 退线判定（[city-admin] 立法 2026-09-26 宗地化宪法第 14 条 + 2026-09-25 precise 修复）。
 *
 * **判定逻辑的单一来源**：`inspect` 的 R2–R15 无头执行（`headless/worker.ts`）与
 * `npm run probe` 都调这里。两边共用一份，才谈得上"数字可信"。
 *
 * 此前这段逻辑只内嵌在 worker.ts 里，豁免建筑（官方）拿不到数字，只能各模型自己在缓存目录里
 * 抄一份副本自查——2026-09-30 清点已有 5 个模型身份 11 份副本（space-bunny probe29/30/31、
 * glm-5.3 probe-r13a/b/c、glm-5.3-flash r13-diag、deepseek-v4-pro debug-r13、qwen3.8-max r13-report）。
 * 副本的致命处不在重复而在**静默失真**：worker 判定一改（容差、豁免类别、precise 开关），
 * 副本照跑照出数，只是那个数已不是 inspect 用的那个——比没有探针更坏。故抽到此文件。
 */

/** 单个越界构件的定位信息（position 为世界坐标，box 为世界包围盒的水平投影） */
export interface SetbackItem {
  /** 超出核心矩形的米数（取 x/z 两轴中较严重者） */
  over: number
  geometry: string
  position: [number, number, number]
  box: { minX: number; maxX: number; minZ: number; maxZ: number }
  /** 包围盒顶高、水平两向尺寸——判断它本该归入哪一类豁免时要读这三个数 */
  topY: number
  extX: number
  extZ: number
}

export interface SetbackResult {
  /** 越界构件总数（不受 maxItems 影响，始终统计全部） */
  violations: number
  /** 最严重的一处超出米数 */
  worst: number
  coreHalfX: number
  coreHalfZ: number
  /** 越界构件明细，最多 maxItems 条 */
  items: SetbackItem[]
}

/** 祖先链任一层标了 userData.site 即为景观件，豁免退线 */
function isSite(o: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = o
  while (p) {
    if (p.userData?.site === true) return true
    p = p.parent
  }
  return false
}

/**
 * 退线豁免三类（几何自身够矮或够薄，与 userData.site 无关）：
 * 地被层顶 ≤0.6m、小件顶 ≤1.5m 且 ≤1.6×1.6、薄板厚 ≤0.5m 且顶 ≤3m（如台阶）。
 */
function exemptBySize(topY: number, extX: number, extZ: number): boolean {
  return topY <= 0.6 || (topY <= 1.5 && extX <= 1.6 && extZ <= 1.6) || (Math.min(extX, extZ) <= 0.5 && topY <= 3.0)
}

/**
 * 逐 mesh 量测建筑本体是否落在宗地中央 (w−4)×(d−4)。
 *
 * 调用方**不必**先 updateMatrixWorld——本函数自己调（幂等）。单地块 20×20 时核心为 16×16，
 * 与旧口径 min*0.4 数值一致。
 */
export function computeSetback(root: THREE.Object3D, size: [number, number], maxItems = 20): SetbackResult {
  const coreHalfX = size[0] / 2 - 2
  const coreHalfZ = size[1] / 2 - 2
  let violations = 0
  let worst = 0
  const items: SetbackItem[] = []
  const wp = new THREE.Vector3()

  root.updateMatrixWorld(true)
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    if (isSite(m)) return
    // [city-admin] 修复 2026-09-25：Box3.setFromObject 非精确模式按本地 AABB 经旋转矩阵保守放大计
    // （旋转 30° 的六棱柱被量出 1.3 倍半径），曾致 R13 误判红灯；precise=true 逐三角形算世界空间
    // 包围盒，旋转几何按真实投影判定。改动此行前请先看 headless/run.ts 的 workerFingerprint——
    // 判定与缓存指纹必须同步，否则改了不生效。
    const b = new THREE.Box3().setFromObject(m, true)
    if (!Number.isFinite(b.min.x) || b.isEmpty()) return
    const topY = b.max.y
    const extX = b.max.x - b.min.x
    const extZ = b.max.z - b.min.z
    if (exemptBySize(topY, extX, extZ)) return
    const exceed = Math.max(
      Math.max(Math.abs(b.min.x), Math.abs(b.max.x)) - coreHalfX,
      Math.max(Math.abs(b.min.z), Math.abs(b.max.z)) - coreHalfZ,
    )
    if (exceed <= 0.05) return   // 0.05m 容差，与 inspect 判定同值
    violations++
    if (exceed > worst) worst = exceed
    if (items.length < maxItems) {
      m.getWorldPosition(wp)
      items.push({
        over: exceed,
        geometry: m.geometry.type,
        position: [wp.x, wp.y, wp.z],
        box: { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z },
        topY,
        extX,
        extZ,
      })
    }
  })
  return { violations, worst, coreHalfX, coreHalfZ, items }
}
