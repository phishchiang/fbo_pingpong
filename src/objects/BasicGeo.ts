import { BufferGeometry, BufferAttribute } from 'three'

export class BasicGeo extends BufferGeometry{
  constructor() {
    super()
    const r = 0.75
    const points_array = [
      -r, -r, 0,
      r, -r,  0,
      0,  r,  0,
    ]

    const vertex_color_array = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ]
    const points = new Float32Array(points_array)
    const vertex_color = new Float32Array(vertex_color_array)


    this.setAttribute( 'position', new BufferAttribute( points, 3 ))
    this.setAttribute( 'a_vertex_color', new BufferAttribute( vertex_color, 3 ))
    // console.log(this)
  }
}
