import { BufferGeometry, BufferAttribute } from 'three'

function remap(value: number, toLow: number, toHigh: number): number {
  return value * (toHigh - toLow) + toLow;
}


export class PointsGeo extends BufferGeometry{
  constructor() {
    super()
    let num = 1000
    const r = 0.75
    
    const position_array = []
    const indices_array = []

    while(num--){
      position_array.push(remap(Math.random(), -r, r), remap(Math.random(), -r, r), remap(Math.random(), -r, r))
      indices_array.push(num)
    }


    const points = new Float32Array(position_array)
    const indices = new Float32Array(indices_array)

    this.setAttribute( 'position', new BufferAttribute( points, 3 ))
    this.setAttribute( 'a_indices', new BufferAttribute( indices, 1 ))
  }
}
