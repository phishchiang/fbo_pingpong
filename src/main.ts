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
  private _quad_pingpong?: Mesh<BufferGeometry, RawShaderMaterial>
  private _particles_pingpong?: Points<BufferGeometry, RawShaderMaterial>
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
    const vertexCount = 1000
    const indices = new Float32Array(vertexCount * 2)
    const textureSize = Math.round(Math.sqrt(vertexCount) + 0.5)

    for (let i = 0, j = 0; i < vertexCount; ++i, j = i * 2) {
      indices[j] = (2 * (1 / textureSize) * ((i % textureSize) + 0.5) - 1 + 1) / 2
      indices[j + 1] = (2 * (1 / textureSize) * (Math.floor(i * (1 / textureSize)) + 0.5) - 1 + 1) / 2
    }

    const positions = new Float32Array(textureSize * textureSize * 4)
    for (let i = 0, j = 0; i < vertexCount; ++i, j = i * 4) {
      positions[j] = randFloat(-2, 2)
      positions[j + 1] = randFloat(-2, 2)
      positions[j + 2] = randFloat(-2, 2)
    }

    const positionsTexture = new DataTexture(positions, textureSize, textureSize, RGBAFormat, FloatType)
    positionsTexture.needsUpdate = true
    const particlesGeometry = new BufferGeometry()
    particlesGeometry.setAttribute('index', new BufferAttribute(indices, 2))
    // our geomnetry does not have a position attribute since we will use our texture to retrieve them. Threejs uses it to determine the draw range, we thus have to manually set it
    particlesGeometry.setDrawRange(0, vertexCount)

    // we do a simple lookup into the texture to get the position
    this._particles_pingpong = new Points(particlesGeometry, new RawShaderMaterial({
      vertexShader: `
      uniform mat4 projectionMatrix;
      uniform mat4 modelViewMatrix;
      uniform sampler2D u_positionsTexture;
    
      attribute vec2 index;
    
      void main() {
        vec3 position = texture2D(u_positionsTexture, index).xyz;
    
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    
        gl_PointSize = 5.0;
      }
      `,
      fragmentShader: `
      precision highp float;
    
      void main() {
        gl_FragColor = vec4(1.0);
      }
      `,
      uniforms: {
        u_positionsTexture: { value: null }
      }
    }))

    // fullscreen quad, where we use the previous position
    this._quad_pingpong = new Mesh(new PlaneGeometry(2, 2), new RawShaderMaterial({
      vertexShader: `
      attribute vec3 position;
      attribute vec2 uv;

      varying vec2 vUv;

      void main() {
        vUv = uv;

        gl_Position = vec4(position, 1.0);
      }
      `,
      fragmentShader: `
      precision highp float;

      uniform sampler2D u_previousPositionsTexture;

      varying vec2 vUv;

      void main() {
        vec3 previousPosition = texture2D(u_previousPositionsTexture, vUv).xyz;

        previousPosition.x += 0.01;
        
        if (previousPosition.x > 2.0) previousPosition.x = -2.0;

        gl_FragColor = vec4(previousPosition, 1.0);
      }
      `,
      uniforms: {
        u_previousPositionsTexture: { value: null }
      }
    }))

    this._renderTargets = Array.from(Array(2)).map(() => new WebGLRenderTarget(textureSize, textureSize, {
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
    this.renderer.render(this.scene, this.camera)

    // this.renderer.setRenderTarget(this._renderTarget!)
    // this.renderer.clear(false, true, false)
    // this.renderer.render(this.scene, this.camera)

    // this._quad!.material.uniforms.u_texture.value = this._renderTarget!.texture
    // this.renderer.setRenderTarget(null)
    // this.renderer.render(this._quad!, this.camera)

    // if(this._quad_pingpong && this._particles_pingpong){
    //   console.log('test')
    // }
    // simulation first, then render
    this._quad_pingpong!.material.uniforms.u_previousPositionsTexture.value = this._renderTargets[0]!.texture
    this.renderer.setRenderTarget(this._renderTargets[1])
    this.renderer.render(this._quad_pingpong!, this.camera)

    this._particles_pingpong!.material.uniforms.u_positionsTexture.value = this._renderTargets[1]!.texture
    this.renderer.setRenderTarget(null)
    this.renderer.render(this._particles_pingpong!, this.camera)

    // swap our fbos, there are dozen of ways to do this, this is just one of them
    const temp = this._renderTargets[1]
    this._renderTargets[1] = this._renderTargets[0]
    this._renderTargets[0] = temp
  }
}

new Sketch({
  dom: document.getElementById('app')!
})