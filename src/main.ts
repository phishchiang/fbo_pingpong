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
import { PostMaterial } from './/materials/PostMaterial'
import { DummyInstancedMesh } from './/objects/DummyInstancedMesh'
import { BasicGeo } from './/objects/BasicGeo'
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
  private _renderTarget?: WebGLRenderTarget
  private _quad?: Mesh<BufferGeometry, PostMaterial>
  private _pointsMat: PointsShaderMateiral
  private _quad_simulation?: Mesh<BufferGeometry, RawShaderMaterial>
  private _particles_render?: Points<BufferGeometry, RawShaderMaterial>
  private _renderTargets: Array<WebGLRenderTarget>

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

    this.renderer_rt_layer = new WebGLRenderer( { antialias: true })
    this.renderer_rt_layer.setPixelRatio(window.devicePixelRatio)
    this.renderer_rt_layer.setSize(this.width * 0.2, this.height * 0.2)
    this.renderer_rt_layer.setClearColor(0x000000, 1)

    this.container.appendChild(this.renderer.domElement)
    this.container.appendChild(this.renderer_rt_layer.domElement) // renderer_rt_layer
    
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
    this.fbo_pingpong()
    this.resize()
    this.render()
    this.setupResize()
  }

  initpost() {
    this._renderTarget = new WebGLRenderTarget(this.width, this.height)
    this._quad = new Mesh(new PlaneGeometry(2, 2), new PostMaterial())
    this._quad?.material.uniforms.u_size.value.copy(new Vector2(this.width, this.height))
  }

  fbo_pingpong() {

    const numParticles = 64
    const positions_array = []
    const extras_array = []
    const uvs_array = []
    const indices_array = []
    let count = 0
    const r = 2
    for (let j = 0; j < numParticles; j++) {
      for (let i = 0; i < numParticles; i++) {
        // particle position
        positions_array.push(...[randFloat(-r, r), randFloat(-r, r), randFloat(-r, r), 0])

        // random data
        extras_array.push(...[Math.random(), Math.random(), Math.random(), 0])

        // mesh point
        uvs_array.push(...[(i / numParticles) * 2 - 1, (j / numParticles) * 2 - 1])

        indices_array.push(count)
        count++
      }
    }

    const positions_float_array = new Float32Array(positions_array)
    const extras_float_array = new Float32Array(extras_array)
    const uvs_float_array = new Float32Array(uvs_array)
    const indices_float_array = new Float32Array(indices_array)

    
    const positionsTexture = new DataTexture(positions_float_array, numParticles, numParticles, RGBAFormat, FloatType)
    positionsTexture.needsUpdate = true
    const particlesGeometry = new BufferGeometry()
    particlesGeometry.setAttribute('index', new BufferAttribute(uvs_float_array, 2))
    // our geomnetry does not have a position attribute since we will use our texture to retrieve them. Threejs uses it to determine the draw range, we thus have to manually set it
    particlesGeometry.setDrawRange(0, numParticles * numParticles)


    // we do a simple lookup into the texture to get the position
    this._particles_render = new Points(particlesGeometry, new RawShaderMaterial({
      vertexShader: `#version 300 es
      uniform mat4 projectionMatrix;
      uniform mat4 modelViewMatrix;
      uniform sampler2D u_positionsTexture;
    
      in vec2 index;
    
      void main() {
        vec3 position = texture(u_positionsTexture, index).xyz;
    
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    
        gl_PointSize = 5.0;
      }
      `,
      fragmentShader: `#version 300 es
      precision highp float;
      out vec4 out_Color;
    
      void main() {
        out_Color = vec4(1.0);
      }
      `,
      uniforms: {
        u_positionsTexture: { value: null }
      }
    }))

    // fullscreen quad, where we use the previous position
    this._quad_simulation = new Mesh(new PlaneGeometry(2, 2), new RawShaderMaterial({
      vertexShader: `#version 300 es
      in vec3 position;
      in vec2 uv;

      out vec2 vUv;

      void main() {
        vUv = uv;

        gl_Position = vec4(position, 1.0);
      }
      `,
      fragmentShader: `#version 300 es
      precision highp float;

      uniform sampler2D u_previousPositionsTexture;

      in vec2 vUv;
      out vec4 out_Color;

      void main() {
        vec3 previousPosition = texture(u_previousPositionsTexture, vUv).xyz;

        previousPosition.x += 0.01;
        
        if (previousPosition.x > 2.0) previousPosition.x = -2.0;

        out_Color = vec4(previousPosition, 1.0);
      }
      `,
      uniforms: {
        u_previousPositionsTexture: { value: null }
      }
    }))

    this._renderTargets = Array.from(Array(2)).map(() => new WebGLRenderTarget(numParticles, numParticles, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: FloatType,
      depthBuffer: false,
      stencilBuffer: false
    }))

    this._renderTargets[0].texture = positionsTexture
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
  
    this._quad_simulation!.material.uniforms.u_previousPositionsTexture.value = this._renderTargets[0].texture
    this.renderer.setRenderTarget(null)
    this.renderer.render(this._quad_simulation!, this.camera)
    this.renderer.setRenderTarget(this._renderTargets[1])
    this.renderer.render(this._quad_simulation!, this.camera)

    this._particles_render!.material.uniforms.u_positionsTexture.value = this._renderTargets[1]!.texture
    this.renderer.setRenderTarget(null)
    this.renderer.render(this._particles_render!, this.camera)

    // renderer_rt_layer
    this._quad_simulation!.material.uniforms.u_previousPositionsTexture.value = this._renderTargets[0].texture
    this.renderer_rt_layer.setRenderTarget(this._renderTargets[1])
    this.renderer_rt_layer.render(this._quad_simulation!, this.camera)
    this.renderer_rt_layer.setRenderTarget(null)
    this.renderer_rt_layer.render(this._quad_simulation!, this.camera)

    // swap our fbos, there are dozen of ways to do this, this is just one of them
    const temp = this._renderTargets[1]
    this._renderTargets[1] = this._renderTargets[0]
    this._renderTargets[0] = temp

    
  
  }
}

new Sketch({
  dom: document.getElementById('app')!
})