import { InstancedMesh, BoxGeometry, BufferGeometry, InstancedBufferAttribute } from 'three'
import { randFloat } from 'three/src/math/MathUtils'

import { StartingShaderMateiral } from '../materials/StartingShaderMateiral'
import { matrix4, vector3 } from '../glb_loader'

export class DummyInstancedMesh extends InstancedMesh<BufferGeometry, StartingShaderMateiral> {
  _instancedGeometry: BufferGeometry

  constructor(_instancedGeometry: BufferGeometry) {
    const instance_count = 100
    let instance_position = new Float32Array(instance_count * 3);
    super(_instancedGeometry, new StartingShaderMateiral(), instance_count)
    // super(new BoxGeometry(0.25, 0.25, 0.25), new StartingShaderMateiral(), instance_count)

    // for (let i = 0; i < this.count; ++i) {
    //   matrix4.makeTranslation(randFloat(-4, 4), randFloat(-4, 4), randFloat(-4, 2)).scale(vector3.setScalar(0.05))
    //   this.setMatrixAt(i, matrix4)
    // }

    for (let i = 0; i < instance_count; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * 5.0;
      const y = (Math.random() - 0.5) * 5.0;
      const z = (Math.random() - 0.5) * 5.0;
      instance_position.set([x, y, z], i3);
    }
    this.instanceMatrix.needsUpdate = true
    this.geometry.setAttribute('a_instance_position', new InstancedBufferAttribute(instance_position, 3, false));
  }
}
