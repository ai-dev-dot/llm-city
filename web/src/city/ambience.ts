import * as THREE from 'three'
import type { SceneBundle } from './scene'

export interface AmbiencePreset {
  label: string; background: string; fogColor: string; fogNear: number; fogFar: number
  sunColor: string; sunIntensity: number; sunPos: [number, number, number]
  hemiSky: string; hemiGround: string; hemiIntensity: number
}

export const AMBIENCE_PRESETS: Record<'day' | 'night' | 'dusk', AmbiencePreset> = {
  day:  { label: '白天', background: '#DFE3E8', fogColor: '#E5E7EB', fogNear: 500, fogFar: 1400, sunColor: '#FFF8F0', sunIntensity: 1.35, sunPos: [200, 300, 150], hemiSky: '#E8EEF6', hemiGround: '#B8B2A6', hemiIntensity: 0.6 },
  night: { label: '夜景', background: '#0B1220', fogColor: '#0E1626', fogNear: 300, fogFar: 1100, sunColor: '#8FA6C9', sunIntensity: 0.25, sunPos: [-150, 260, -100], hemiSky: '#1B2A44', hemiGround: '#0A0F1A', hemiIntensity: 0.25 },
  dusk:  { label: '黄昏', background: '#E8B27D', fogColor: '#E3A878', fogNear: 350, fogFar: 1200, sunColor: '#FFB870', sunIntensity: 1.1, sunPos: [320, 60, -80], hemiSky: '#F2C9A0', hemiGround: '#6B4A3A', hemiIntensity: 0.45 },
}

export function applyAmbience(bundle: SceneBundle, p: AmbiencePreset): void {
  bundle.scene.background = new THREE.Color(p.background)
  bundle.scene.fog = new THREE.Fog(p.fogColor, p.fogNear, p.fogFar)
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
