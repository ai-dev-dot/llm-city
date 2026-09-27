import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { CityData } from '../generated/city-data'

export interface SceneBundle {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  /** 渐变天穹（applyAmbience 按预设换天顶/地平线色） */
  skyDome: THREE.Mesh
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
  // 白天默认基准（ambience.ts day 预设同款）：自然日光 = 渐变天穹 + 轻微远景雾 + 草地大地。
  // [city-admin] 2026-09-27 四轮探索定稿：灰雾/晴空蓝/草地+平板蓝/纯白棚都「不自然」——
  // 自然感的关键是天空有渐变、远景有空气透视（雾从 1500 才起、雾色=地平线色，绝不进城）。
  scene.background = new THREE.Color('#DFE9F0')
  scene.fog = new THREE.Fog('#DFE9F0', 1500, 2000)

  // 渐变天穹：天顶蓝 → 地平线泛白的真实天空散射感；backside 大球 + 自定义渐变。
  // 底色与白天雾色严格一致（预设「地平线无缝律」），远处地面雾化后与天穹融为一体。
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(3000, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color('#6296CE') },
        bottomColor: { value: new THREE.Color('#DFE9F0') },
      },
      vertexShader: `varying vec3 vPos;
        void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vPos;
        void main() {
          float t = smoothstep(0.02, 0.5, normalize(vPos).y);
          gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  )
  skyDome.renderOrder = -1
  scene.add(skyDome)

  const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.5, 4000)
  camera.position.set(260, 180, 260)

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.maxPolarAngle = Math.PI / 2 - 0.02
  controls.maxDistance = 1500   // 天穹半径 3000 之内；且白天雾 1500 才起，全城观看始终清晰

  // 光照：中性日光
  const sun = new THREE.DirectionalLight('#FFF8F0', 1.35)
  sun.position.set(200, 300, 150)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const s = 420
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s; sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s
  scene.add(sun)
  scene.add(new THREE.HemisphereLight('#E8EEF6', '#B8B2A6', 0.6))

  // 环境反射（IBL）：无 envMap 时 MeshStandardMaterial 的漫反射被 (1-metalness) 压暗——
  // 高楼玻璃/金属框架（builder 常写 metalness 0.5~0.75）大面积近黑的根因。
  // RoomEnvironment 经 PMREM 预滤后挂 scene.environment 给 PBR 材质提亮；强度随氛围联动（ambience.ts）。
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.55
  pmrem.dispose()

  // 城外大地（[city-admin] 2026-09-27 终裁「自然日光」）：比街区草皮略深的郊野绿——
  // 平板纯色天+硬地平线怎么配都怪，自然感来自渐变天穹+雾化地平线+草地大地的组合。
  // 5000×5000 铺到雾外（fogFar 2000 处地面完全融入天穹底色，地平线无硬边）
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(5000, 5000),
    new THREE.MeshStandardMaterial({ color: '#7C9855', roughness: 0.95, emissive: '#3E652E', emissiveIntensity: 0.35 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // 地块默认草皮瓦（[city-admin] 2026-09-25：空地不裸灰——每格地块默认铺草皮，
  // 整个街区在俯视下读作一整块草坪；建筑在其上再做自己的园地设计。
  // 0.16 高垫层顶面高于道路层防深度吞没；emissive 补底抵消掠射角把顶面压灰。）
  // 全城 729 块瓦合并为单个 mesh（729 draw call → 1）。
  const lotGrass = new THREE.MeshStandardMaterial({ color: '#8AA662', roughness: 0.95, emissive: '#42672F', emissiveIntensity: 0.4 })
  {
    const tileGeos = city.lots.map((lot) => {
      const g = new THREE.BoxGeometry(19.6, 0.16, 19.6)
      g.translate(lot.center[0], 0.08, lot.center[1])
      return g
    })
    const tiles = new THREE.Mesh(mergeGeometries(tileGeos)!, lotGrass)
    tiles.receiveShadow = true
    scene.add(tiles)
    for (const g of tileGeos) g.dispose()
  }

  // 道路网格推导（spec §11 道路骨架=场景底色一部分）：街区边界间的 12m 道路条（合并为单 mesh）
  const { blocks, blockPitch, roadWidth } = city.grid
  const span = blocks * blockPitch   // 648
  const roadMat = new THREE.MeshStandardMaterial({ color: '#6E7276', roughness: 0.9 })
  const half = (blocks - 1) / 2
  {
    const roadGeos: THREE.BufferGeometry[] = []
    for (let i = 0; i <= blocks; i++) {
      const c = (i - half) * blockPitch - blockPitch / 2   // 街区边界中心
      const rx = new THREE.PlaneGeometry(roadWidth, span + roadWidth)
      rx.rotateX(-Math.PI / 2); rx.translate(c, 0.05, 0)
      const rz = new THREE.PlaneGeometry(span + roadWidth, roadWidth)
      rz.rotateX(-Math.PI / 2); rz.translate(0, 0.05, c)
      roadGeos.push(rx, rz)
    }
    const roads = new THREE.Mesh(mergeGeometries(roadGeos)!, roadMat)
    roads.receiveShadow = true
    scene.add(roads)
    for (const g of roadGeos) g.dispose()
  }

  const onResize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', onResize)

  return {
    renderer, scene, camera, controls, skyDome,
    dispose() { window.removeEventListener('resize', onResize); controls.dispose(); envRT.dispose(); renderer.dispose() },
  }
}
