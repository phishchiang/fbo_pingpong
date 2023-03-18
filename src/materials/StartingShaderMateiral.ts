import { Color, IUniform, RawShaderMaterial, ShaderMaterial, Texture, Vector4, DoubleSide } from 'three'

const vertexShader = /* glsl */ `#version 300 es

precision highp float;
float PI = 3.141592653589793238;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
in vec3 position;
in vec3 normal;
in vec2 uv;

uniform vec2 pixels;
uniform float time;
in vec3 a_instance_position;
in vec3 a_vertex_color;

out vec2 vUv;
out vec3 vPosition;
out vec3 v_color;
out vec3 v_normal;


void main() {
  vUv = uv;
  v_normal = normal;
  v_color = a_vertex_color;
  vec3 fianl_position = position;
  fianl_position += a_instance_position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( fianl_position, 1.0 );
}
`

const fragmentShader = /* glsl */ `#version 300 es
precision highp float;
float PI = 3.141592653589793238;

uniform float time;
uniform float progress;
uniform sampler2D texture1;
uniform vec4 resolution;

in vec2 vUv;
in vec3 vPosition;
in vec3 v_color;
in vec3 v_normal;

// out vec4 out_color;
layout (location = 0) out vec4 out_color_00;
layout (location = 1) out vec4 out_color_01;

void main()	{
	// vec2 newUV = (vUv - vec2(0.5))*resolution.zw + vec2(0.5);
	out_color_00 = vec4(v_color,1.);
	out_color_01 = vec4(vec3(1.0, 0.0, 0.0),1.);
}
`

export class StartingShaderMateiral extends RawShaderMaterial {
  declare uniforms: {
    time: IUniform<number>
    progress: IUniform<number>
    resolution: IUniform<Vector4>
  }

  constructor() {
    const uniforms: StartingShaderMateiral['uniforms'] = {
      time: { value: 0 },
      progress: { value: 0.6 },
      resolution: { value: new Vector4() },
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