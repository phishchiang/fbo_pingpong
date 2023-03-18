import './style.css'
import { 
  WebGLRenderer,
  WebGLRenderTarget, 
  Scene, 
  PerspectiveCamera, 
  ShaderMaterial, 
  PlaneGeometry, 
  Mesh, 
  DoubleSide, 
  BufferGeometry, 
  Vector2, 
  Points, 
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Debug } from "./Debug"
import { StartingShaderMateiral } from './/materials/StartingShaderMateiral'
import { PointsShaderMateiral } from './/materials/PointsShaderMateiral'
import { PostMaterial } from './/materials/PostMaterial'
import { DummyInstancedMesh } from './/objects/DummyInstancedMesh'
import { BasicGeo } from './/objects/BasicGeo'
import { PointsGeo } from './/objects/PointsGeo'
import { gltfLoader } from "./glb_loader"
import MSH_Monkey_url from './model/MSH_Monkey.glb?url'

export class Sketch {
  private renderer: WebGLRenderer
  private scene: Scene
  private container: HTMLElement
  private width: number
  private height: number
  private camera: PerspectiveCamera
  private controls: OrbitControls
  private time: number
  private imageAspect: number
  private isPlaying: boolean
  private mat_plane: ShaderMaterial
  private geo_plane: PlaneGeometry
  private msh_plane: Mesh
  private _debug: Debug
  private _DummyInstancedMesh: DummyInstancedMesh
  private _BasicGeo: BasicGeo
  private _PointsGeo: PointsGeo
  private _point_msh: Points<PointsGeo, PointsShaderMateiral>
  private _renderTarget?: WebGLRenderTarget
  private _quad?: Mesh<BufferGeometry, PostMaterial>
  private _pointsMat: PointsShaderMateiral

  constructor(options: { dom: HTMLElement }) {
    this.scene = new Scene()
    this.container = options.dom
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer = new WebGLRenderer( { antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0x000000, 1)
    this.renderer.physicallyCorrectLights = true
    this.render = this.render.bind(this)
    this.imageAspect = 1
    this._debug = new Debug()

    this.container.appendChild(this.renderer.domElement)
    this.camera = new PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    )

    this.camera.position.set(0, 0, 3)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.time = 0
    this.isPlaying = true

    this.addObjects()
    this.initpost()
    this.resize()
    this.render()
    this.setupResize()
  }

  initpost() {
    this._renderTarget = new WebGLRenderTarget(this.width, this.height)
    this._quad = new Mesh(new PlaneGeometry(2, 2), new PostMaterial())
    this._quad?.material.uniforms.u_size.value.copy(new Vector2(this.width, this.height))
  }

  setupResize() {
    window.addEventListener('resize', this.resize.bind(this))
  }

  resize() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.camera.aspect = this.width / this.height

    this._renderTarget?.setSize(this.width, this.height)
    this._quad?.material.uniforms.u_size.value.copy(new Vector2(this.width, this.height))

    this.camera.updateProjectionMatrix()
  }

  async addObjects() {
    let that = this

    // this.mat_plane = new StartingShaderMateiral()
    // this.geo_plane = new PlaneGeometry(1, 1, 10, 10)
    // this.msh_plane = new Mesh(this.geo_plane, this.mat_plane)
    // this.scene.add(this.msh_plane)

    // GLB loading
    const gltf = await gltfLoader.loadAsync(MSH_Monkey_url)
    const geometry = (gltf.scene.children[0] as Mesh).geometry
    this._BasicGeo = new BasicGeo()

    // Instanced Mesh
    this._DummyInstancedMesh = new DummyInstancedMesh(this._BasicGeo)
    this.scene.add(this._DummyInstancedMesh)

    // WebGL Points
    this._PointsGeo = new PointsGeo()
    this._pointsMat = new PointsShaderMateiral()
    this._point_msh = new Points(this._PointsGeo, this._pointsMat)
    this._point_msh.material.uniforms.u_viewport.value.copy(new Vector2(this.width, this.height))
    this.scene.add(this._point_msh)
  }

  stop() {
    this.isPlaying = false
  }

  play() {
    if(!this.isPlaying){
      this.render()
      this.isPlaying = true
    }
  }

  update(){
    
  }

  render() {
    this.update()

    if (!this.isPlaying) return
    this.time += 0.05
    if(this._DummyInstancedMesh){
      this._DummyInstancedMesh.material.uniforms.time.value = this.time
      this._DummyInstancedMesh.material.uniforms.progress.value = this._debug.settings.progress
    }
    requestAnimationFrame(this.render)
    // this.renderer.render(this.scene, this.camera)

    this.renderer.setRenderTarget(this._renderTarget!)
    this.renderer.clear(false, true, false)
    this.renderer.render(this.scene, this.camera)

    this._quad!.material.uniforms.u_texture.value = this._renderTarget!.texture
    this.renderer.setRenderTarget(null)
    this.renderer.render(this._quad!, this.camera)
  }
}

new Sketch({
  dom: document.getElementById('app')!
})