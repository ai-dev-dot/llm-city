import * as THREE from 'three'
export { makeBoxFloor, makeWall, makeWindowStrip, makePitchedRoof, makeFlatRoofTop, makeColumn, makeTowerCrane, makeStreetLamp, makeTree, makeNeonSign, makePlinth, makeHedge, makeBench } from './parts'

/** 官方调色板：中性白灰为基准，深浅与少量点缀色（白天日光下以本色为准，spec §10） */
export const PALETTE: readonly string[] = [
  '#E8E6E1', '#D9D6CF', '#C4C1BA', '#A8A5A0', '#7C7A76',
  '#5B5956', '#3E3C3A', '#8C9E8B', '#B0885E', '#4A5568',
]

export function stdMaterial(
  color: string,
  o?: { metalness?: number; roughness?: number; emissive?: string; emissiveIntensity?: number },
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: o?.metalness ?? 0.1,
    roughness: o?.roughness ?? 0.75,
    emissive: o?.emissive ?? '#000000',
    emissiveIntensity: o?.emissiveIntensity ?? 1,
  })
}

export interface Blocks {
  boxFloor(o: { w: number; d: number; h: number; color?: string; y?: number }): THREE.Object3D
  wall(o: { w: number; h: number; d?: number; color?: string; x?: number; z?: number; y?: number }): THREE.Object3D
  windowStrip(o: { w: number; h: number; d?: number; y?: number }): THREE.Object3D
  pitchedRoof(o: { w: number; d: number; h: number; color?: string; y?: number }): THREE.Object3D
  flatRoofTop(o: { w: number; d: number; y?: number; color?: string }): THREE.Object3D
  column(o: { r: number; h: number; x?: number; z?: number; y?: number; color?: string }): THREE.Object3D
  towerCrane(o: { h: number; x?: number; z?: number }): THREE.Object3D
  streetLamp(o: { x?: number; z?: number; h?: number }): THREE.Object3D
  tree(o: { x?: number; z?: number; scale?: number; seed?: number }): THREE.Object3D
  neonSign(o: { w: number; h: number; color: string; x?: number; y?: number; z?: number }): THREE.Object3D
  plinth(o: { w: number; d: number; h: number; color?: string }): THREE.Object3D
  hedge(o: { w: number; d?: number; h?: number; x?: number; z?: number }): THREE.Object3D
  bench(o: { x?: number; z?: number; rotY?: number }): THREE.Object3D
}

import { makeBoxFloor, makeWall, makeWindowStrip, makePitchedRoof, makeFlatRoofTop, makeColumn, makeTowerCrane, makeStreetLamp, makeTree, makeNeonSign, makePlinth, makeHedge, makeBench } from './parts'

export const blocks: Blocks = {
  boxFloor: makeBoxFloor,
  wall: makeWall,
  windowStrip: makeWindowStrip,
  pitchedRoof: makePitchedRoof,
  flatRoofTop: makeFlatRoofTop,
  column: makeColumn,
  towerCrane: makeTowerCrane,
  streetLamp: makeStreetLamp,
  tree: makeTree,
  neonSign: makeNeonSign,
  plinth: makePlinth,
  hedge: makeHedge,
  bench: makeBench,
}
