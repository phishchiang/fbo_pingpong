import { Color, IUniform, RawShaderMaterial, ShaderMaterial, Texture, Vector2, DoubleSide, DataTexture } from 'three'

const vertexShader = /* glsl */ `#version 300 es
in vec3 position;
in vec2 uv;

out vec2 vUv;

void main() {
  vUv = uv;

  gl_Position = vec4(position, 1.0);
}
`

const fragmentShader = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D u_positions_data_texture;
uniform sampler2D u_extra_data_texture;
uniform sampler2D u_init_positions_data_texture;
uniform sampler2D u_init_extra_data_texture;
uniform bool u_is_after_first_render;

in vec2 vUv;
// out vec4 out_Color;
layout (location = 0) out vec4 oFragColor0;
layout (location = 1) out vec4 oFragColor1;

void main() {
  vec3 previousPosition = texture(u_positions_data_texture, vUv).xyz;
  vec3 originalPosition = texture(u_init_positions_data_texture, vUv).xyz;
  vec3 originalExtra = texture(u_init_extra_data_texture, vUv).xyz;
  vec3 previous_extra = texture(u_extra_data_texture, vUv).xyz;

  if(u_is_after_first_render) {
    
    float speed = mix(1.0, 100.0, previous_extra.x);
  
    previousPosition.x += (speed * 0.0001);
    
    if (previousPosition.x > 2.0) previousPosition.x = -2.0;
  
  } else {
    previousPosition = originalPosition;
    previous_extra = originalExtra;
  }
  
  oFragColor0 = vec4(previousPosition, 1.0);
  oFragColor1 = vec4(previous_extra, 1.0);
}
`

export class GPGPUSimulationMaterial extends RawShaderMaterial {
  declare uniforms: {
    time: IUniform<number>
    u_positions_data_texture: IUniform<Texture | null>
    u_extra_data_texture: IUniform<Texture | null>
    u_init_positions_data_texture: IUniform<Texture | null>
    u_init_extra_data_texture: IUniform<Texture | null>
    u_is_after_first_render: IUniform<Boolean>
  }

  constructor() {
    const uniforms: GPGPUSimulationMaterial['uniforms'] = {
      time: { value: 0 },
      u_positions_data_texture: { value: null },
      u_extra_data_texture: { value: null },
      u_init_positions_data_texture: { value: null },
      u_init_extra_data_texture: { value: null },
      u_is_after_first_render: { value: false },
    }

    super({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: DoubleSide,
      uniforms: uniforms,
      // wireframe: true,
      // transparent: true,
    })
  }
}