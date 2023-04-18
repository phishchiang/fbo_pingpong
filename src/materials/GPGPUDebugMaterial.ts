import { IUniform, RawShaderMaterial, Texture } from 'three'

const vertexShader = /* glsl */ `#version 300 es
in vec3 position;
in vec2 uv;
out vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_debug_data_texture;

in vec2 v_uv;
layout (location = 0) out vec4 oFragColor0;

void main() {
  vec3 previous_debug_data = texture(u_debug_data_texture, v_uv).xyz;

  oFragColor0 = vec4(previous_debug_data, 1.0);
}
`

export class GPGPUDebugMaterial extends RawShaderMaterial {
  declare uniforms: {
    u_debug_data_texture: IUniform<Texture | null>
  }

  constructor() {
    const uniforms: GPGPUDebugMaterial['uniforms'] = {
      u_debug_data_texture: { value: null },
    }
    super({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
    })
  }
}