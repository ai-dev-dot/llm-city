import * as THREE from 'three'
export { makeBoxFloor, makeWall, makeWindowStrip, makePitchedRoof, makeFlatRoofTop, makeColumn, makeTowerCrane, makeStreetLamp, makeTree, makeNeonSign, makePlinth, makeHedge, makeBench, makeArchWall, makeArchPanel, makeRailing, makeUrn, makeLatticePanel, makeGlassCurtain } from './parts'

/** 官方调色板：中性白灰为基准，深浅与少量点缀色（白天日光下以本色为准，spec §10）。
 *  10/11 号亮色席位为 [city-admin] 2026-09-27 增补——只在尾部追加、不扰动既有索引
 *  （积木按索引取默认色），给幕墙/高塔的明亮选色一个官方出口。 */
export const PALETTE: readonly string[] = [
  '#E8E6E1', '#D9D6CF', '#C4C1BA', '#A8A5A0', '#7C7A76',
  '#5B5956', '#3E3C3A', '#8C9E8B', '#B0885E', '#4A5568',
  '#F2E9D8', '#9EC5DD',
]

export function stdMaterial(
  color: string,
  o?: { metalness?: number; roughness?: number; emissive?: string; emissiveIntensity?: number; envMapIntensity?: number; transparent?: boolean; opacity?: number; side?: THREE.Side },
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: o?.metalness ?? 0.1,
    roughness: o?.roughness ?? 0.75,
    emissive: o?.emissive ?? '#000000',
    emissiveIntensity: o?.emissiveIntensity ?? 1,
    envMapIntensity: o?.envMapIntensity ?? 1,
    transparent: o?.transparent ?? false,
    opacity: o?.opacity ?? 1,
    side: o?.side ?? THREE.FrontSide,
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
  archWall(o: { w: number; h: number; archW: number; archH: number; depth?: number; color?: string; x?: number; y?: number; z?: number }): THREE.Object3D
  archPanel(o: { w: number; h: number; depth?: number; color?: string; x?: number; y?: number; z?: number }): THREE.Object3D
  railing(o: { w: number; h?: number; color?: string; x?: number; y?: number; z?: number }): THREE.Object3D
  urn(o: { scale?: number; color?: string; x?: number; y?: number; z?: number }): THREE.Object3D
  latticePanel(o: { w: number; h: number; cols?: number; rows?: number; bar?: number; color?: string; x?: number; y?: number; z?: number }): THREE.Object3D
  glassCurtain(o: { w: number; h: number; cols?: number; rows?: number; bar?: number; glassColor?: string; frameColor?: string; x?: number; y?: number; z?: number }): THREE.Object3D
}

import { makeBoxFloor, makeWall, makeWindowStrip, makePitchedRoof, makeFlatRoofTop, makeColumn, makeTowerCrane, makeStreetLamp, makeTree, makeNeonSign, makePlinth, makeHedge, makeBench, makeArchWall, makeArchPanel, makeRailing, makeUrn, makeLatticePanel, makeGlassCurtain } from './parts'

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
  archWall: makeArchWall,
  archPanel: makeArchPanel,
  railing: makeRailing,
  urn: makeUrn,
  latticePanel: makeLatticePanel,
  glassCurtain: makeGlassCurtain,
}
