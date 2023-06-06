import { Color, IUniform, RawShaderMaterial, ShaderMaterial, Texture, Vector2, Matrix4, DoubleSide, DataTexture } from 'three'

const vertexShader = /* glsl */ `#version 300 es
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 modelMatrix;
uniform sampler2D u_positions_data_texture;
uniform sampler2D u_velocity_data_texture;
uniform sampler2D u_extra_data_texture;
uniform sampler2D u_speed_data_texture;

uniform mat4 u_projection_matrix;
uniform mat4 u_matrix_world_inverse;
out vec4 v_projcam_uv;

in vec2 a_renderTarget_uv;

out vec3 v_color;

void main() {
  
  vec3 position = texture(u_positions_data_texture, a_renderTarget_uv).xyz;
  vec3 velocity = texture(u_velocity_data_texture, a_renderTarget_uv).xyz;
  vec3 extra = texture(u_extra_data_texture, a_renderTarget_uv).xyz;
  vec3 speed = texture(u_speed_data_texture, a_renderTarget_uv).xyz;
  
  v_color = smoothstep(0.0, 0.1, speed);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  
  float size_random = mix(0.1, 0.75, extra.x);
  
  v_projcam_uv = u_projection_matrix * u_matrix_world_inverse * modelMatrix * vec4( position, 1.0 );
  
  // gl_PointSize = 5.0 * size_random;
  gl_PointSize = 20. * ( 1. / - (modelViewMatrix * vec4(position, 1.0)).z) * size_random;
}
`

const fragmentShader = /* glsl */ `#version 300 es
precision highp float;
#include <packing>

uniform float u_bias;
uniform sampler2D u_depth_map;
uniform float u_cam_near;
uniform float u_cam_far;
in vec3 v_color;

in vec4 v_projcam_uv;
out vec4 out_Color;

float readDepth( sampler2D depthSampler, vec2 coord ) {
  float fragCoordZ = texture( depthSampler, coord ).x;
  float viewZ = perspectiveDepthToViewZ( fragCoordZ, u_cam_near, u_cam_far );
  return viewZToOrthographicDepth( viewZ, u_cam_near, u_cam_far );
}

void main() {

  vec4 v_cam_uv_with_zoom = v_projcam_uv / v_projcam_uv.w;
  vec2 v_cam_uv_fianl = (v_cam_uv_with_zoom.xy * 0.5) + 0.5;

  float bias = u_bias;
  float depth = readDepth( u_depth_map, v_cam_uv_fianl );
  float shadow_value = v_cam_uv_with_zoom.z < depth - bias? 1.0 : 0.085;

  float shadow_value_simpler_ver = depth > 0.9? 1.0: 0.085; // my simple shadow

  float dist = length(gl_PointCoord - vec2(0.5));
  if(dist > 0.5) discard;
  
  out_Color = vec4(vec3(shadow_value), 1.0);
}
`

export class GPGPURenderMaterial extends RawShaderMaterial {
  declare uniforms: {
    time: IUniform<number>
    u_bias: IUniform<number>
    u_positions_data_texture: IUniform<Texture | null>
    u_velocity_data_texture: IUniform<Texture | null>
    u_extra_data_texture: IUniform<Texture | null>
    u_speed_data_texture: IUniform<Texture | null>
    u_projection_matrix: IUniform<Matrix4>
    u_matrix_world_inverse: IUniform<Matrix4>
    u_cam_near: IUniform<Number>
    u_cam_far: IUniform<Number>
    u_depth_map: IUniform<Texture | null>
  }

  constructor(_projectionMatrix: Matrix4, _matrixWorldInverse: Matrix4, _u_cam_near: number, _u_cam_far: number) {
    const uniforms: GPGPURenderMaterial['uniforms'] = {
      time: { value: 0 },
      u_bias: { value: -0.005 },
      u_positions_data_texture: { value: null },
      u_velocity_data_texture: { value: null },
      u_extra_data_texture: { value: null },
      u_speed_data_texture: { value: null },
      u_projection_matrix: { value: _projectionMatrix },
      u_matrix_world_inverse: { value: _matrixWorldInverse },
      u_cam_near: { value: _u_cam_near },
      u_cam_far: { value: _u_cam_far },
      u_depth_map: { value: null },
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