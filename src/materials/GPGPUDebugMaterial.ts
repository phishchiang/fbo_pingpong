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
uniform sampler2D u_velocity_data_texture;
uniform sampler2D u_extra_data_texture;
uniform sampler2D u_speed_data_texture;

in vec2 vUv;
layout (location = 0) out vec4 oFragColor0;
layout (location = 1) out vec4 oFragColor1;
layout (location = 2) out vec4 oFragColor2;
layout (location = 3) out vec4 oFragColor3;


void main() {

  vec3 previous_positions = texture(u_positions_data_texture, vUv).xyz;
  vec3 previous_extra = texture(u_extra_data_texture, vUv).xyz;
  vec3 previous_velocity = texture(u_velocity_data_texture, vUv).xyz;
  vec3 previous_speed = texture(u_speed_data_texture, vUv).xyz;

  
  oFragColor0 = vec4(previous_positions, 1.0);
  oFragColor2 = vec4(previous_extra, 1.0);
  oFragColor1 = vec4(previous_velocity, 1.0);
  oFragColor3 = vec4(vec3(previous_speed), 1.0);
}
`

export class GPGPUDebugMaterial extends RawShaderMaterial {
  declare uniforms: {
    u_positions_data_texture: IUniform<Texture | null>
    u_velocity_data_texture: IUniform<Texture | null>
    u_extra_data_texture: IUniform<Texture | null>
    u_speed_data_texture: IUniform<Texture | null>
  }

  constructor() {
    const uniforms: GPGPUDebugMaterial['uniforms'] = {
      u_positions_data_texture: { value: null },
      u_velocity_data_texture: { value: null },
      u_extra_data_texture: { value: null },
      u_speed_data_texture: { value: null },
    }

    super({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
    })
  }
}