import { Color, IUniform, RawShaderMaterial, ShaderMaterial, Texture, Vector4, DoubleSide, Matrix4 } from 'three'

const vertexShader = /* glsl */ `
precision highp float;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 u_projection_matrix;
uniform mat4 u_matrix_world_inverse;

uniform float time;
// attribute vec3 a_instance_position;

varying vec2 vUv;
varying vec3 v_color;
varying vec4 v_cam_uv;
varying vec4 v_projcam_uv;

void main() {
  vUv = uv;
  // vec3 fianl_position = position;
  // fianl_position += a_instance_position;
  v_projcam_uv = u_projection_matrix * u_matrix_world_inverse * modelMatrix * vec4( position, 1.0 );
  v_cam_uv = projectionMatrix * viewMatrix * modelMatrix * vec4( position, 1.0 );

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`

const fragmentShader = /* glsl */ `
precision highp float;
#include <packing>
float PI = 3.141592653589793238;

uniform float time;
uniform float progress;
uniform sampler2D u_depth_map;
uniform float u_cam_near;
uniform float u_cam_far;

varying vec2 vUv;
varying vec3 v_color;
varying vec4 v_cam_uv;
varying vec4 v_projcam_uv;

float readDepth( sampler2D depthSampler, vec2 coord ) {
  float fragCoordZ = texture2D( depthSampler, coord ).x;
  float viewZ = perspectiveDepthToViewZ( fragCoordZ, u_cam_near, u_cam_far );
  return viewZToOrthographicDepth( viewZ, u_cam_near, u_cam_far );
}

void main()	{
  vec4 v_cam_uv_with_zoom = v_projcam_uv / v_projcam_uv.w;
  vec2 v_cam_uv_fianl = (v_cam_uv_with_zoom.xy * 0.5) + 0.5;
  // v_cam_uv_fianl = clamp(v_cam_uv_fianl, 0.0, 1.0);
  float depth = readDepth( u_depth_map, v_cam_uv_fianl );

  float bias = 0.01;
  // vec3 depth_render = texture2D(u_depth_map, v_cam_uv_fianl).xyz;
  float shadow_value = v_cam_uv_with_zoom.z < depth - bias? 1.0 : 0.0;

  float new_shadow_value = depth > 0.9? 1.0: 0.0;
	// gl_FragColor = vec4(vec3(v_projcam_uv.w), 1.0);
	// gl_FragColor = vec4(vec2(v_cam_uv_no_repeat_X, v_cam_uv_no_repeat_Y), 0.0, 1.0);
	// gl_FragColor = vec4(vec3(new_shadow_value), 1.0);
	gl_FragColor = vec4(vec3(shadow_value, 0.0, 0.0), 1.0);
}
`

export class ShadowShaderMateiral extends RawShaderMaterial {
  declare uniforms: {
    time: IUniform<number | undefined>
    progress: IUniform<number>
    resolution: IUniform<Vector4>
    u_projection_matrix: IUniform<Matrix4>
    u_matrix_world_inverse: IUniform<Matrix4>
    u_depth_map: IUniform<Texture | null>
    u_cam_near: IUniform<Number>
    u_cam_far: IUniform<Number>
  }
  // _matrixWorldInverse: Matrix4
  // _projectionMatrix: Matrix4

  constructor(_projectionMatrix: Matrix4, _matrixWorldInverse: Matrix4, _u_cam_near: number, _u_cam_far: number) {
    const uniforms: ShadowShaderMateiral['uniforms'] = {
      time: { value: 0 },
      progress: { value: 0.6 },
      resolution: { value: new Vector4() },
      u_projection_matrix: { value: _projectionMatrix },
      u_matrix_world_inverse: { value: _matrixWorldInverse },
      u_depth_map: { value: null },
      u_cam_near: { value: _u_cam_near },
      u_cam_far: { value: _u_cam_far },
    }

    super({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: DoubleSide,
      uniforms: uniforms,
    })
  }
}