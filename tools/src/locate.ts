import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const exists = (p: string) => { try { readdirSync(p); return true } catch { return false } }

/** 参数给出的建筑定位到哪个城的哪个目录（inspect/shot/probe 共用）。
 *  接受完整目录名（b-000031-yuguang-yard）或裸 id（b-000031，匹配同前缀目录）——裸 id 口径
 *  与 demolish 的 idOfDirName 一致（b-000031 形态，不含裸数字 31）。
 *  [city-admin] 2026-09-30：三命令用法文案一直声称「建筑id」，但解析此前只认完整目录名，
 *  实测 b-000031 一律「找不到建筑目录」——补齐解析并抽纯函数（cli.ts 以 void main() 结尾，
 *  无法被测试安全 import），locate.test.ts 钉住各形态。 */
export function resolveBuildingHits(citiesRoot: string, name: string): [string, string][] {
  const hits: [string, string][] = []
  for (const c of readdirSync(citiesRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    if (exists(resolve(citiesRoot, c, 'buildings', name))) { hits.push([c, name]); continue }
    if (/^b-\d{6}$/.test(name)) {
      const b = resolve(citiesRoot, c, 'buildings')
      if (exists(b)) for (const d of readdirSync(b)) if (d.startsWith(`${name}-`)) hits.push([c, d])
    }
  }
  return hits
}
