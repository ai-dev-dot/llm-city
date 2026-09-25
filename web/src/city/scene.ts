import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CityData } from '../generated/city-data'

export interface SceneBundle {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  dispose(): void
}

/** 白天中性日光 = 默认基准（spec §10）：画布是中性展示台，建筑才是主角 */
export function createScene(canvas: HTMLCanvasElement, city: CityData): SceneBundle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#DFE3E8')
  scene.fog = new THREE.Fog('#E5E7EB', 500, 1400)

  const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.5, 4000)
  camera.position.set(260, 180, 260)

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.maxPolarAngle = Math.PI / 2 - 0.02

  // 光照：中性日光
  const sun = new THREE.DirectionalLight('#FFF8F0', 1.35)
  sun.position.set(200, 300, 150)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const s = 420
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s; sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s
  scene.add(sun)
  scene.add(new THREE.HemisphereLight('#E8EEF6', '#B8B2A6', 0.6))

  // 地面（中性色，不替作品做主）
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    new THREE.MeshStandardMaterial({ color: '#C9C5BD', roughness: 0.95 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // 道路网格推导（spec §11 道路骨架=场景底色一部分）：街区边界间的 12m 道路条
  const { blocks, blockPitch, roadWidth } = city.grid
  const span = blocks * blockPitch   // 648
  const roadMat = new THREE.MeshStandardMaterial({ color: '#6E7276', roughness: 0.9 })
  const half = (blocks - 1) / 2
  for (let i = 0; i <= blocks; i++) {
    const c = (i - half) * blockPitch - blockPitch / 2   // 街区边界中心
    const rx = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, span + roadWidth), roadMat)
    rx.rotation.x = -Math.PI / 2; rx.position.set(c, 0.05, 0); rx.receiveShadow = true
    scene.add(rx)
    const rz = new THREE.Mesh(new THREE.PlaneGeometry(span + roadWidth, roadWidth), roadMat)
    rz.rotation.x = -Math.PI / 2; rz.position.set(0, 0.05, c); rz.receiveShadow = true
    scene.add(rz)
  }

  const onResize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', onResize)

  return {
    renderer, scene, camera, controls,
    dispose() { window.removeEventListener('resize', onResize); controls.dispose(); renderer.dispose() },
  }
}
