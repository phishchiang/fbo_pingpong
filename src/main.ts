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
  CameraHelper,
  BoxGeometry,
  MeshBasicMaterial,
  AxesHelper,
  DepthTexture,
  DepthFormat,
  UnsignedIntType,
} from 'three'
import { randFloat } from 'three/src/math/MathUtils'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Debug } from "./Debug"
import { StartingShaderMateiral } from './/materials/StartingShaderMateiral'
import { ShadowShaderMateiral } from './/materials/ShadowShaderMateiral'
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
  private shadow_CAM: PerspectiveCamera
  private controls: OrbitControls
  private time: number
  private imageAspect: number
  private isPlaying: boolean
  private mat_plane: ShadowShaderMateiral
  private geo_plane: PlaneGeometry
  private msh_plane: Mesh
  private _debug: Debug
  private _DummyInstancedMesh: DummyInstancedMesh
  private _Basic_GEO: BasicGeo
  private _Points_GEO: PointsGeo
  private _point_PT: Points<PointsGeo, PointsShaderMateiral>
  private _GPGPUGeometry: GPGPUGeometry
  private _renderTarget?: WebGLRenderTarget
  private _quad?: Mesh<BufferGeometry, PostMaterial>
  private _points_MAT: PointsShaderMateiral
  private _quad_simulation?: Mesh<BufferGeometry, RawShaderMaterial>
  private _quad_debug: Mesh<BufferGeometry, GPGPUDebugMaterial>
  private _quad_debug_size: number
  private _particles_PT: Points<BufferGeometry, RawShaderMaterial>
  private _renderTargets: Array<WebGLMultipleRenderTargets>
  private _depth_RT: WebGLRenderTarget
  private _debug_MAT: GPGPUDebugMaterial
  private _isFirstRender = true
  private _axesHelper = new AxesHelper(5)

  constructor(options: { dom: HTMLElement }) {
    this.scene = new Scene()
    this.container = options.dom
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer = new WebGLRenderer( { antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0x111111, 1)
    this.renderer.physicallyCorrectLights = true
    this.render = this.render.bind(this)
    this.imageAspect = 1
    this._debug = new Debug()
    this._quad_debug_size = this.height * 0.2
    this.container.appendChild(this.renderer.domElement)
    this.scene.add(this._axesHelper)

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

    this.shadow_CAM = new PerspectiveCamera( 45, 1, 1, 30)
    this.shadow_CAM.position.set(4, 8, 5)
    this.shadow_CAM.lookAt(0, 0, 0)
    this.scene.add(this.shadow_CAM)

    this.shadow_CAM.updateProjectionMatrix()
    this.shadow_CAM.updateMatrixWorld()
  
    const _cameraHelper = new CameraHelper(this.shadow_CAM)
    this.scene.add(_cameraHelper)

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

    this._depth_RT = new WebGLRenderTarget(this.height, this.height, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      stencilBuffer: false,
    })
    const depth_texture = new DepthTexture(this.width, this.height, UnsignedIntType)
    depth_texture.format = DepthFormat
    this._depth_RT.depthTexture = depth_texture
  }

  initGPGPU() {

    this._GPGPUGeometry = new GPGPUGeometry()
    let { numParticles, positions_float_array, extras_float_array, positions_array_2nd_way} = this._GPGPUGeometry
    
    const positions_data_texture = new DataTexture(positions_array_2nd_way, numParticles, numParticles, RGBAFormat, FloatType)
    positions_data_texture.needsUpdate = true
    const extra_data_texture = new DataTexture(extras_float_array, numParticles, numParticles, RGBAFormat, FloatType)
    extra_data_texture.needsUpdate = true
    


    this._particles_PT = new Points(this._GPGPUGeometry, new GPGPURenderMaterial(
      this.shadow_CAM.projectionMatrix, 
      this.shadow_CAM.matrixWorldInverse,
      this.shadow_CAM.near,
      this.shadow_CAM.far,
    ))
    this._particles_PT.frustumCulled = false // Avoid disappearing when moving cam

    this._quad_simulation = new Mesh(new PlaneGeometry(2, 2), new GPGPUSimulationMaterial())

    this._debug_MAT = new GPGPUDebugMaterial()
    this._quad_debug = new Mesh(new PlaneGeometry(2, 2), this._debug_MAT)

    this._renderTargets = Array.from(Array(2)).map(() => new WebGLMultipleRenderTargets(numParticles, numParticles, 4, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: false,
      stencilBuffer: false
    }))

    this.scene.add(this._particles_PT)

    // you will get the chrome warning for Texture is immutable
    // this._renderTargets[0].texture[0] = positions_data_texture
    // this._renderTargets[0].texture[1] = extra_data_texture
    
    // Pass this way instead and handle that in the 1st frame of the Simulation shader
    this._quad_simulation!.material.uniforms.u_init_positions_data_texture.value = positions_data_texture
    this._quad_simulation!.material.uniforms.u_init_extra_data_texture.value = extra_data_texture
    // console.log(this._quad_debug)
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

    this.mat_plane = new ShadowShaderMateiral(
      this.shadow_CAM.projectionMatrix, 
      this.shadow_CAM.matrixWorldInverse,
      this.shadow_CAM.near,
      this.shadow_CAM.far,
    )
    this.geo_plane = new PlaneGeometry(1, 1, 10, 10)
    this.msh_plane = new Mesh(this.geo_plane, this.mat_plane)
    this.msh_plane.rotation.set( 90 * Math.PI/180, 0, 0 )
    this.msh_plane.position.set( 0, -5, 0 )
    this.msh_plane.scale.set( 25, 25, 25 )
    this.scene.add(this.msh_plane)

    // GLB loading
    const gltf = await gltfLoader.loadAsync(MSH_Monkey_url)
    const geometry = (gltf.scene.children[0] as Mesh).geometry
    this._Basic_GEO = new BasicGeo()

    // Instanced Mesh
    this._DummyInstancedMesh = new DummyInstancedMesh(this._Basic_GEO)
    // this.scene.add(this._DummyInstancedMesh)

    // WebGL Points
    this._Points_GEO = new PointsGeo()
    this._points_MAT = new PointsShaderMateiral()
    this._point_PT = new Points(this._Points_GEO, this._points_MAT)
    this._point_PT.material.uniforms.u_viewport.value.copy(new Vector2(this.width, this.height))
    // this.scene.add(this._point_PT)
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

    this.shadow_CAM.position.set(this._debug.settings.lightX, this._debug.settings.lightY, this._debug.settings.lightZ)
    this.shadow_CAM.near = this._debug.settings.cam_near
    this.shadow_CAM.far = this._debug.settings.cam_far
    this.shadow_CAM.updateProjectionMatrix()
    this.shadow_CAM.updateMatrixWorld()
    // this.shadow_CAM.near.set(this._debug.settings.cam_near)


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
    this._particles_PT.material.uniforms.u_bias.value = this._debug.settings.shadow_bias



    // Render depth to render target for shadow
    this.renderer.setRenderTarget(this._depth_RT)

    /*
      To avoid Feedback loop of FBO and active texture.
      The current FBO should be its depthTexture instead of out_Color,
      so free to assign whatever into u_depth_map except itself.
    */
    this._particles_PT.material.uniforms.u_depth_map.value = this._renderTargets[0].texture[0]

    this.renderer.clear(false, true, false)
    this.renderer.render(this._particles_PT, this.shadow_CAM)

    
    
    // Set up render targets 
    this._quad_simulation!.material.uniforms.u_positions_data_texture.value = this._renderTargets[0].texture[0]
    this._quad_simulation!.material.uniforms.u_velocity_data_texture.value = this._renderTargets[0].texture[1]
    this._quad_simulation!.material.uniforms.u_extra_data_texture.value = this._renderTargets[0].texture[2]
    this._quad_simulation!.material.uniforms.u_speed_data_texture.value = this._renderTargets[0].texture[3]
    this.renderer.setRenderTarget(this._renderTargets[1])
    this.renderer.render(this._quad_simulation!, this.camera)
    
    this._particles_PT.material.uniforms.u_positions_data_texture.value = this._renderTargets[1].texture[0]
    this._particles_PT.material.uniforms.u_velocity_data_texture.value = this._renderTargets[1].texture[1]
    this._particles_PT.material.uniforms.u_extra_data_texture.value = this._renderTargets[1].texture[2]
    this._particles_PT.material.uniforms.u_speed_data_texture.value = this._renderTargets[1].texture[3]
    this._particles_PT.material.uniforms.u_depth_map.value = this._depth_RT.depthTexture
    this.mat_plane.uniforms.u_depth_map.value = this._depth_RT.depthTexture
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.scene, this.camera)


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

    this.renderer.setViewport(this._quad_debug_size * 4, 0, this._quad_debug_size, this._quad_debug_size)
    this._debug_MAT.uniforms.u_is_depth.value = true
    this._debug_MAT.uniforms.u_debug_depth_texture.value = this._depth_RT.depthTexture
    this.renderer.render(this._quad_debug!, this.shadow_CAM)
    this._debug_MAT.uniforms.u_is_depth.value = false


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