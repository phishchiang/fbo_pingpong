import { Color, IUniform, RawShaderMaterial, ShaderMaterial, Texture, Vector2, DoubleSide, DataTexture } from 'three'

const vertexShader = /* glsl */ `#version 300 es
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform sampler2D u_positions_data_texture;

in vec2 a_renderTarget_uv;

out vec3 v_color;

void main() {
  
  vec3 position = texture(u_positions_data_texture, a_renderTarget_uv).xyz;

  v_color = position;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  gl_PointSize = 5.0;
}
`

const fragmentShader = /* glsl */ `#version 300 es
precision highp float;
out vec4 out_Color;
in vec3 v_color;

void main() {
  out_Color = vec4(vec3(v_color), 1.0);
}
`

export class GPGPURenderMaterial extends RawShaderMaterial {
  declare uniforms: {
    time: IUniform<number>
    u_positions_data_texture: IUniform<Texture | null>
    u_extra_data_texture: IUniform<Texture | null>
  }

  constructor() {
    const uniforms: GPGPURenderMaterial['uniforms'] = {
      time: { value: 0 },
      u_positions_data_texture: { value: null },
      u_extra_data_texture: { value: null },
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