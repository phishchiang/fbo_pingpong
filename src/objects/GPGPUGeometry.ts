import { BufferGeometry, BufferAttribute } from 'three'
import { randFloat } from 'three/src/math/MathUtils'

export class GPGPUGeometry extends BufferGeometry{
  public numParticles: number
  public positions_float_array: Float32Array
  public extras_float_array: Float32Array
  public uvs_float_array: Float32Array
  public indices_float_array: Float32Array
  public positions_array_2nd_way: Float32Array

  constructor() {
    super()
    this.numParticles = 100
    const positions_array = []
    const extras_array = []
    const uvs_array = []
    const indices_array = []
    let count = 0
    const r = 1

    // 2nd way to generate the Float32Array
    this.positions_array_2nd_way = new Float32Array(this.numParticles * this.numParticles * 4) 

    for (let j = 0; j < this.numParticles; j++) {
      for (let i = 0; i < this.numParticles; i++) {
        
        // particle position by basic array
        positions_array.push(...[randFloat(-r, r), randFloat(-r, r), randFloat(-r, r), 0])
        
        // 2nd way to generate the Float32Array
        const index = i * this.numParticles + j
        this.positions_array_2nd_way[4 * index + 0] = randFloat(-r, r)
        this.positions_array_2nd_way[4 * index + 1] = randFloat(-r, r)
        this.positions_array_2nd_way[4 * index + 2] = randFloat(-r, r)
        this.positions_array_2nd_way[4 * index + 3] = 1

        // random data
        extras_array.push(...[Math.random(), Math.random(), Math.random(), 0])

        // mesh point
        uvs_array.push(...[(i / this.numParticles) * 2 - 1, (j / this.numParticles) * 2 - 1])

        indices_array.push(count)
        count++
      }
    }

    this.positions_float_array = new Float32Array(positions_array)
    this.extras_float_array = new Float32Array(extras_array)
    this.uvs_float_array = new Float32Array(uvs_array)
    this.indices_float_array = new Float32Array(indices_array)
    

    this.setAttribute('a_renderTarget_uv', new BufferAttribute(this.uvs_float_array, 2))
    // our geomnetry does not have a position attribute since we will use our texture to retrieve them. Threejs uses it to determine the draw range, we thus have to manually set it
    this.setDrawRange(0, this.numParticles * this.numParticles)
  }
}
