import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface PlanData {
  version: number
  id: string
  name: string
  founded: string
  grid: { origin: [number, number]; blocks: number; blockPitch: number; roadWidth: number }
  districts: Array<{ id: string; center: [number, number] }>
  lots: Array<{ id: string; center: [number, number]; size: [number, number]; district: string }>
  /** 施工资格白名单（[city-admin] 修宪 2026-09-25）：非白名单模型 inspect R10 红灯；
   * sharedBlocks 街区主权豁免清单（[city-admin] 立法 R15 2026-09-25）：城主显式放行的混居街区 */
  policy?: { allowedModelIds: string[]; sharedBlocks?: string[] }
}

const COLS = 'ABCDEFGHI'

export function generatePlanData(): PlanData {
  const districts: PlanData['districts'] = []
  const lots: PlanData['lots'] = []
  for (let cz = 0; cz < 9; cz++) {
    for (let cx = 0; cx < 9; cx++) {
      const id = `${COLS[cx]}${cz + 1}`
      const center: [number, number] = [(cx - 4) * 72, (4 - cz) * 72]
      districts.push({ id, center })
      for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3)  // 0=北(+z)
        const col = i % 3              // 0=西(-x)
        lots.push({
          id: `${id}-${String(i + 1).padStart(2, '0')}`,
          center: [center[0] + (col - 1) * 20, center[1] + (1 - row) * 20],
          size: [20, 20],
          district: id,
        })
      }
    }
  }
  return {
    version: 1,
    id: 'c1',
    name: '模都',
    founded: '2026-09-24',
    grid: { origin: [0, 0], blocks: 9, blockPitch: 72, roadWidth: 12 },
    districts,
    lots,
    policy: { allowedModelIds: ['official', 'glm-5.3', 'mimo-v2.6-flash', 'qwen3.8-flash', 'qwen3.8-max', 'doubao-seed-2.1-pro'], sharedBlocks: [] },
  }
}

const target = resolve(import.meta.dirname, '../../cities/c1/plan.json')
const plan = generatePlanData()

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href
if (isMain) {
  if (process.argv.includes('--check')) {
    if (!existsSync(target)) { console.error('plan.json 不存在，请先运行 gen-plan'); process.exit(1) }
    const curr = readFileSync(target, 'utf8')
    const expectJson = JSON.stringify(plan, null, 2) + '\n'
    if (curr !== expectJson) {
      console.error('plan.json 与生成结果不一致（规划图被手改或生成器变更）——请运行 npm run gen:plan 重新生成')
      process.exit(1)
    }
    console.log('plan.json 一致 ✓')
  } else {
    writeFileSync(target, JSON.stringify(plan, null, 2) + '\n')
    console.log(`已生成 ${target}：${plan.districts.length} 街区 / ${plan.lots.length} 地块`)
  }
}
