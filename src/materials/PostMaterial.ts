import { IUniform, RawShaderMaterial, Texture, Vector2 } from 'three'


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

uniform vec2 u_size;
uniform sampler2D u_texture;

in vec2 v_uv;
out vec4 out_color;

void main() {
  vec4 res;
  res.xy = u_size * 0.15;
  res.zw = vec2(res.y * u_size.x / u_size.y, res.y);

  vec2 uv = gl_FragCoord.xy / u_size;
  uv = floor(uv * res.zw);


  out_color = texture(u_texture, v_uv);
}
`

export class PostMaterial extends RawShaderMaterial {
  declare uniforms: {
    u_size: IUniform<Vector2>
    u_texture: IUniform<Texture | null>
  }

  constructor() {
    const uniforms: PostMaterial['uniforms'] = {
      u_size: { value: new Vector2() },
      u_texture: { value: null }
    }

    super({
      vertexShader,
      fragmentShader,
      uniforms
    })
  }
}
