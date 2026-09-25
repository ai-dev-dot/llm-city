import './ui/tokens.css'
import { createScene } from './city/scene'
import { city } from './generated/city-data'

const canvas = document.getElementById('city-canvas') as HTMLCanvasElement
const bundle = createScene(canvas, city)
document.getElementById('hud')!.innerHTML = '<div class="panel" style="position:absolute;left:16px;bottom:16px;padding:10px 14px;">模都 · 加载中</div>'

bundle.renderer.setAnimationLoop(() => {
  bundle.controls.update()
  bundle.renderer.render(bundle.scene, bundle.camera)
})
