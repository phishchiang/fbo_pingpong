import { BufferGeometry, BufferAttribute } from 'three'
import { randFloat } from 'three/src/math/MathUtils'

export class GPGPUGeometry extends BufferGeometry{
  public _numParticles: number
  public _positions_float_array: Float32Array
  public _extras_float_array: Float32Array
  public _uvs_float_array: Float32Array
  public _indices_float_array: Float32Array

  constructor() {
    super()
    this._numParticles = 64
    const positions_array = []
    const extras_array = []
    const uvs_array = []
    const indices_array = []
    let count = 0
    const r = 2
    for (let j = 0; j < this._numParticles; j++) {
      for (let i = 0; i < this._numParticles; i++) {
        // particle position
        positions_array.push(...[randFloat(-r, r), randFloat(-r, r), randFloat(-r, r), 0])

        // random data
        extras_array.push(...[Math.random(), Math.random(), Math.random(), 0])

        // mesh point
        uvs_array.push(...[(i / this._numParticles) * 2 - 1, (j / this._numParticles) * 2 - 1])

        indices_array.push(count)
        count++
      }
    }

    this._positions_float_array = new Float32Array(positions_array)
    this._extras_float_array = new Float32Array(extras_array)
    this._uvs_float_array = new Float32Array(uvs_array)
    this._indices_float_array = new Float32Array(indices_array)
    

    this.setAttribute('a_renderTarget_uv', new BufferAttribute(this._uvs_float_array, 2))
    // our geomnetry does not have a position attribute since we will use our texture to retrieve them. Threejs uses it to determine the draw range, we thus have to manually set it
    this.setDrawRange(0, this._numParticles * this._numParticles)
  }
}
