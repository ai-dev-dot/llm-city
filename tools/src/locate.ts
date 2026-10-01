import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const exists = (p: string) => { try { readdirSync(p); return true } catch { return false } }

/** 路径形态归一：取末段非空目录名。cities/c1/buildings/b-000031-yuguang-yard、
 *  正/反斜杠、尾分隔符都认；纯名字原样通过（无分隔符时 split 结果即自身）。 */
function lastSegment(name: string): string {
  const segs = name.split(/[\\/]+/).filter(Boolean)
  return segs.length > 0 ? segs[segs.length - 1] : name
}

/** 参数给出的建筑定位到哪个城的哪个目录（inspect/shot/probe 共用）。
 *  接受完整目录名（b-000031-yuguang-yard）、裸 id（b-000031，匹配同前缀目录）或路径
 *  （归一取末段目录名再走前两种）——裸 id 口径与 demolish 的 idOfDirName 一致
 *  （b-000031 形态，不含裸数字 31）。
 *  [city-admin] 2026-09-30：三命令用法文案一直声称「建筑id」，但解析此前只认完整目录名，
 *  实测 b-000031 一律「找不到建筑目录」——补齐解析并抽纯函数（cli.ts 以 void main() 结尾，
 *  无法被测试安全 import），locate.test.ts 钉住各形态。
 *  [city-admin] 2026-10-01：路径形态实测同样落空（cities/c1/buildings/b-000032-… 被原样
 *  拼进各城 buildings/ 目录下找）——补末段归一。 */
export function resolveBuildingHits(citiesRoot: string, name: string): [string, string][] {
  const dir = lastSegment(name)
  const hits: [string, string][] = []
  for (const c of readdirSync(citiesRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    if (exists(resolve(citiesRoot, c, 'buildings', dir))) { hits.push([c, dir]); continue }
    if (/^b-\d{6}$/.test(dir)) {
      const b = resolve(citiesRoot, c, 'buildings')
      if (exists(b)) for (const d of readdirSync(b)) if (d.startsWith(`${dir}-`)) hits.push([c, d])
    }
  }
  return hits
}
