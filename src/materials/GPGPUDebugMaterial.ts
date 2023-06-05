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
#include <packing>
uniform sampler2D u_debug_data_texture;
uniform sampler2D u_debug_depth_texture;
uniform bool u_is_depth;

in vec2 v_uv;
layout (location = 0) out vec4 oFragColor0;

float readDepth( sampler2D depthSampler, vec2 coord ) {
  float fragCoordZ = texture( depthSampler, coord ).x;
  float viewZ = perspectiveDepthToViewZ( fragCoordZ, 0.1, 100.0 );
  return viewZToOrthographicDepth( viewZ, 0.1, 100.0 );
}

void main() {
  vec3 previous_debug_data = texture(u_debug_data_texture, v_uv).xyz;

  float depth = readDepth(u_debug_depth_texture, v_uv);

  if(u_is_depth) {
    oFragColor0 = vec4(vec3(depth), 1.0);
  } else {
    oFragColor0 = vec4(previous_debug_data, 1.0);
  };
}
`

export class GPGPUDebugMaterial extends RawShaderMaterial {
  declare uniforms: {
    u_debug_data_texture: IUniform<Texture | null>
    u_debug_depth_texture: IUniform<Texture | null>
    u_is_depth: IUniform<Boolean>
  }

  constructor() {
    const uniforms: GPGPUDebugMaterial['uniforms'] = {
      u_debug_data_texture: { value: null },
      u_debug_depth_texture: { value: null },
      u_is_depth: { value: false },

    }
    super({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
    })
  }
}