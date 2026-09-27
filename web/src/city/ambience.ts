import * as THREE from 'three'
import type { SceneBundle } from './scene'

export interface AmbiencePreset {
  label: string
  /** 渐变天穹：天顶色 + 地平线色（真实天空的散射感，平板纯色天是「不自然」的根源） */
  skyTop: string; skyBottom: string
  /** 雾色需与 skyBottom 严格一致（「地平线无缝律」：远处地面雾化后融入天穹）；null = 关雾 */
  fogColor: string | null; fogNear: number; fogFar: number
  sunColor: string; sunIntensity: number; sunPos: [number, number, number]
  hemiSky: string; hemiGround: string; hemiIntensity: number
  /** scene.environment 强度（IBL 反射亮度）：白天提亮金属/玻璃，夜景压低防白亮室内反射穿帮 */
  envIntensity: number
}

export const AMBIENCE_PRESETS: Record<'day' | 'night' | 'dusk', AmbiencePreset> = {
  // [city-admin] 2026-09-27 终裁「自然日光」（四轮探索：灰雾→晴空蓝→白棚→自然光定稿）：
  // 白天 = 渐变天穹 + 草地大地 + 轻微远景雾。雾从 1500 才起（全城对角线 458、观看距离
  // <1500，建筑绝不进城起雾），2000 处地面完全融入天穹底色=自然的空气透视地平线。
  day:  { label: '白天', skyTop: '#6296CE', skyBottom: '#DFE9F0', fogColor: '#DFE9F0', fogNear: 1500, fogFar: 2000, sunColor: '#FFF8F0', sunIntensity: 1.35, sunPos: [200, 300, 150], hemiSky: '#E8EEF6', hemiGround: '#B8B2A6', hemiIntensity: 0.6, envIntensity: 0.55 },
  night: { label: '夜景', skyTop: '#04070E', skyBottom: '#16233B', fogColor: '#16233B', fogNear: 300, fogFar: 1100, sunColor: '#8FA6C9', sunIntensity: 0.25, sunPos: [-150, 260, -100], hemiSky: '#1B2A44', hemiGround: '#0A0F1A', hemiIntensity: 0.25, envIntensity: 0.12 },
  dusk:  { label: '黄昏', skyTop: '#4E5E8C', skyBottom: '#E3A878', fogColor: '#E3A878', fogNear: 350, fogFar: 1200, sunColor: '#FFB870', sunIntensity: 1.1, sunPos: [320, 60, -80], hemiSky: '#F2C9A0', hemiGround: '#6B4A3A', hemiIntensity: 0.45, envIntensity: 0.3 },
}

export function applyAmbience(bundle: SceneBundle, p: AmbiencePreset): void {
  bundle.scene.background = new THREE.Color(p.skyBottom)
  bundle.scene.fog = p.fogColor ? new THREE.Fog(p.fogColor, p.fogNear, p.fogFar) : null
  const domeMat = bundle.skyDome.material as THREE.ShaderMaterial
  ;(domeMat.uniforms.topColor.value as THREE.Color).set(p.skyTop)
  ;(domeMat.uniforms.bottomColor.value as THREE.Color).set(p.skyBottom)
  bundle.scene.environmentIntensity = p.envIntensity
  // brief 原文为 `let sun: THREE.DirectionalLight | null = null`——TS 会把闭包赋值后的外层
  // narrow 成 never 致 typecheck 失败；断言式初始化类型不变、运行时行为不变
  let sun = null as THREE.DirectionalLight | null, hemi = null as THREE.HemisphereLight | null
  bundle.scene.traverse((o) => {
    if ((o as THREE.DirectionalLight).isDirectionalLight && !sun) sun = o as THREE.DirectionalLight
    if ((o as THREE.HemisphereLight).isHemisphereLight && !hemi) hemi = o as THREE.HemisphereLight
  })
  if (sun) { sun.color.set(p.sunColor); sun.intensity = p.sunIntensity; sun.position.set(...p.sunPos) }
  if (hemi) { hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemiIntensity }
}
