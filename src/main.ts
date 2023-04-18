import './style.css'
import { 
  WebGLRenderer,
  WebGLRenderTarget,
  WebGLMultipleRenderTargets,
  Scene, 
  PerspectiveCamera, 
  ShaderMaterial, 
  PlaneGeometry, 
  Mesh, 
  DoubleSide, 
  BufferGeometry, 
  Vector2, 
  Points,
  DataTexture,
  RGBAFormat,
  FloatType,
  BufferAttribute,
  RawShaderMaterial,
  NearestFilter,
} from 'three'
import { randFloat } from 'three/src/math/MathUtils'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Debug } from "./Debug"
import { StartingShaderMateiral } from './/materials/StartingShaderMateiral'
import { PointsShaderMateiral } from './/materials/PointsShaderMateiral'
import { GPGPURenderMaterial } from './materials/GPGPURenderMaterial'
import { GPGPUSimulationMaterial } from './materials/GPGPUSimulationMaterial'
import { GPGPUDebugMaterial } from './materials/GPGPUDebugMaterial'
import { PostMaterial } from './/materials/PostMaterial'
import { DummyInstancedMesh } from './/objects/DummyInstancedMesh'
import { BasicGeo } from './/objects/BasicGeo'
import { GPGPUGeometry } from './/objects/GPGPUGeometry'
import { PointsGeo } from './/objects/PointsGeo'
import { gltfLoader } from "./glb_loader"
import MSH_Monkey_url from './model/MSH_Monkey.glb?url'

export class Sketch {
  private renderer: WebGLRenderer
  private renderer_rt_layer: WebGLRenderer
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
  private _GPGPUGeometry: GPGPUGeometry
  private _renderTarget?: WebGLRenderTarget
  private _quad?: Mesh<BufferGeometry, PostMaterial>
  private _pointsMat: PointsShaderMateiral
  private _quad_simulation?: Mesh<BufferGeometry, RawShaderMaterial>
  private _quad_debug: Mesh<BufferGeometry, GPGPUDebugMaterial>
  private _quad_debug_size: number
  private _particles_render?: Points<BufferGeometry, RawShaderMaterial>
  private _renderTargets: Array<WebGLMultipleRenderTargets>
  private _isFirstRender = true

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
    this._quad_debug_size = this.height * 0.2
    this.container.appendChild(this.renderer.domElement)

    this.renderer.autoClear = false // turn off auto clear for debug multi layers
    
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
    this.initGPGPU()
    this.resize()
    this.render()
    this.setupResize()
  }

  initpost() {
    this._renderTarget = new WebGLRenderTarget(this.width, this.height)
    this._quad = new Mesh(new PlaneGeometry(2, 2), new PostMaterial())
    this._quad?.material.uniforms.u_size.value.copy(new Vector2(this.width, this.height))
  }

  initGPGPU() {

    this._GPGPUGeometry = new GPGPUGeometry()
    let { numParticles, positions_float_array, extras_float_array} = this._GPGPUGeometry
    
    const positions_data_texture = new DataTexture(positions_float_array, numParticles, numParticles, RGBAFormat, FloatType)
    positions_data_texture.needsUpdate = true
    const extra_data_texture = new DataTexture(extras_float_array, numParticles, numParticles, RGBAFormat, FloatType)
    extra_data_texture.needsUpdate = true
    


    this._particles_render = new Points(this._GPGPUGeometry, new GPGPURenderMaterial())
    this._particles_render.frustumCulled = false // Avoid disappearing when moving cam

    this._quad_simulation = new Mesh(new PlaneGeometry(2, 2), new GPGPUSimulationMaterial())
    this._quad_debug = new Mesh(new PlaneGeometry(2, 2), new GPGPUDebugMaterial())

    this._renderTargets = Array.from(Array(2)).map(() => new WebGLMultipleRenderTargets(numParticles, numParticles, 4, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: false,
      stencilBuffer: false
    }))

    // you will get the chrome warning for Texture is immutable
    // this._renderTargets[0].texture[0] = positions_data_texture
    // this._renderTargets[0].texture[1] = extra_data_texture
    
    // Pass this way instead and handle that in the 1st frame of the Simulation shader
    this._quad_simulation!.material.uniforms.u_init_positions_data_texture.value = positions_data_texture
    this._quad_simulation!.material.uniforms.u_init_extra_data_texture.value = extra_data_texture
    console.log(this._quad_debug)
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
    // this.scene.add(this._point_msh)
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

  render() {

    if (!this.isPlaying) return
    this.time += 0.05
    if(this._DummyInstancedMesh){
      this._DummyInstancedMesh.material.uniforms.time.value = this.time
      // this._DummyInstancedMesh.material.uniforms.progress.value = this._debug.settings.progress
    }
    requestAnimationFrame(this.render)
    
    this.renderer.clear() // manually clear renderer for debug multi layers
    this.renderer.setViewport(0, 0, this.width, this.height)

    this._quad_simulation!.material.uniforms.u_time.value = this.time
    this._quad_simulation!.material.uniforms.randomness.value = this._debug.settings.randomness
    this._quad_simulation!.material.uniforms.air_resistance.value = this._debug.settings.air_resistance
    this._quad_simulation!.material.uniforms.u_is_after_first_render.value = !this._isFirstRender


    // Set up render targets 
    this._quad_simulation!.material.uniforms.u_positions_data_texture.value = this._renderTargets[0].texture[0]
    this._quad_simulation!.material.uniforms.u_velocity_data_texture.value = this._renderTargets[0].texture[1]
    this._quad_simulation!.material.uniforms.u_extra_data_texture.value = this._renderTargets[0].texture[2]
    this._quad_simulation!.material.uniforms.u_speed_data_texture.value = this._renderTargets[0].texture[3]
    this.renderer.setRenderTarget(this._renderTargets[1])
    this.renderer.render(this._quad_simulation!, this.camera)

    this._particles_render!.material.uniforms.u_positions_data_texture.value = this._renderTargets[1].texture[0]
    this._particles_render!.material.uniforms.u_velocity_data_texture.value = this._renderTargets[1].texture[1]
    this._particles_render!.material.uniforms.u_extra_data_texture.value = this._renderTargets[1].texture[2]
    this._particles_render!.material.uniforms.u_speed_data_texture.value = this._renderTargets[1].texture[3]
    this.renderer.setRenderTarget(null)
    this.renderer.render(this._particles_render!, this.camera)


    // render multi debug layers
    this.renderer.setViewport(0, 0, this._quad_debug_size, this._quad_debug_size)
    this._quad_debug!.material.uniforms.u_debug_data_texture.value = this._renderTargets[0].texture[0]
    this.renderer.render(this._quad_debug!, this.camera)
    
    this.renderer.setViewport(this._quad_debug_size, 0, this._quad_debug_size, this._quad_debug_size)
    this._quad_debug!.material.uniforms.u_debug_data_texture.value = this._renderTargets[0].texture[1]
    this.renderer.render(this._quad_debug!, this.camera)
    
    this.renderer.setViewport(this._quad_debug_size * 2, 0, this._quad_debug_size, this._quad_debug_size)
    this._quad_debug!.material.uniforms.u_debug_data_texture.value = this._renderTargets[0].texture[2]
    this.renderer.render(this._quad_debug!, this.camera)

    this.renderer.setViewport(this._quad_debug_size * 3, 0, this._quad_debug_size, this._quad_debug_size)
    this._quad_debug!.material.uniforms.u_debug_data_texture.value = this._renderTargets[0].texture[3]
    this.renderer.render(this._quad_debug!, this.camera)


    // swap our fbos, there are dozen of ways to do this, this is just one of them
    const temp = this._renderTargets[1]
    this._renderTargets[1] = this._renderTargets[0]
    this._renderTargets[0] = temp

    this._isFirstRender = false
  }
}

new Sketch({
  dom: document.getElementById('app')!
})