import { 
  WebGLMultipleRenderTargets, 
  BufferGeometry, 
} from 'three'


export class MultiRenderTargetsPingPong extends WebGLMultipleRenderTargets {
  constructor(width: number, height: number, count: number = 1) {
    const instance_count = 100
    super(width, height, count)
    console.log(this)
  }
}
