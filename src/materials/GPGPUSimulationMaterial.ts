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

uniform float u_time;
uniform float randomness;
uniform float air_resistance;
uniform sampler2D u_init_positions_data_texture;
uniform sampler2D u_init_extra_data_texture;
uniform sampler2D u_positions_data_texture;
uniform sampler2D u_velocity_data_texture;
uniform sampler2D u_extra_data_texture;
uniform sampler2D u_speed_data_texture;
uniform bool u_is_after_first_render;

in vec2 vUv;
// out vec4 out_Color;
layout (location = 0) out vec4 oFragColor0;
layout (location = 1) out vec4 oFragColor1;
layout (location = 2) out vec4 oFragColor2;
layout (location = 3) out vec4 oFragColor3;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0;  }

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0;  }

// snoise.glsl
vec4 permute(vec4 x) {  return mod(((x*34.0)+1.0)*x, 289.0);    }
vec4 taylorInvSqrt(vec4 r) {    return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;
    
    i = mod(i, 289.0 );
    vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

float snoise(float x, float y, float z){
    return snoise(vec3(x, y, z));
}

vec3 snoiseVec3( vec3 x ){

	float s  = snoise(vec3( x ));
	float s1 = snoise(vec3( x.y - 19.1 , x.z + 33.4 , x.x + 47.2 ));
	float s2 = snoise(vec3( x.z + 74.2 , x.x - 124.5 , x.y + 99.4 ));
	vec3 c = vec3( s , s1 , s2 );
	return c;

}


vec3 curlNoise( vec3 p ){
	
	const float e = .1;
	vec3 dx = vec3( e   , 0.0 , 0.0 );
	vec3 dy = vec3( 0.0 , e   , 0.0 );
	vec3 dz = vec3( 0.0 , 0.0 , e   );

	vec3 p_x0 = snoiseVec3( p - dx );
	vec3 p_x1 = snoiseVec3( p + dx );
	vec3 p_y0 = snoiseVec3( p - dy );
	vec3 p_y1 = snoiseVec3( p + dy );
	vec3 p_z0 = snoiseVec3( p - dz );
	vec3 p_z1 = snoiseVec3( p + dz );

	float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
	float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
	float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

	const float divisor = 1.0 / ( 2.0 * e );
	return normalize( vec3( x , y , z ) * divisor );

}

void main() {
  vec3 originalPosition = texture(u_init_positions_data_texture, vUv).xyz;
  vec3 originalExtra = texture(u_init_extra_data_texture, vUv).xyz;

  vec3 previous_positions = texture(u_positions_data_texture, vUv).xyz;
  vec3 previous_extra = texture(u_extra_data_texture, vUv).xyz;
  vec3 previous_velocity = texture(u_velocity_data_texture, vUv).xyz;

  float previous_speed = 0.0;


  if(u_is_after_first_render) {

    vec3 saved_previous_positions = previous_positions;

    // Set acceleration
    vec3 acceleration = vec3(0.0);
    vec3 noise_val = curlNoise(
      previous_positions * 0.2 * randomness + u_time * 0.05
    );
    acceleration += noise_val;
    
    // set boundary
    float boundary_radius = 3.0;
    float dist_to_center = length(previous_positions - vec3(0.0));
    vec3 boundary_dir = -normalize(previous_positions - vec3(0.0));
    float boundary_force = smoothstep(boundary_radius * 0.5, boundary_radius, dist_to_center);
    acceleration += boundary_dir * boundary_force * 0.5;

    // Set velocity
    previous_velocity += acceleration * 0.002;
    float velocity_random = mix(1.0, 4.0, previous_extra.x);
    previous_velocity *= (1.0 - mix(0.05, 1.0, air_resistance)); // air resistance

    // Set position
    previous_positions += previous_velocity * velocity_random;
    
    // previous_positions.x += (velocity_random * 0.0001);
    // if (previous_positions.x > 2.0) previous_positions.x = -2.0;

    previous_speed = distance(previous_positions, saved_previous_positions);
  
  } else {
    previous_positions = originalPosition;
    previous_extra = originalExtra;
  }
  
  oFragColor0 = vec4(previous_positions, 1.0);
  oFragColor1 = vec4(previous_velocity, 1.0);
  oFragColor2 = vec4(previous_extra, 1.0);
  oFragColor3 = vec4(vec3(previous_speed), 1.0);
}
`

export class GPGPUSimulationMaterial extends RawShaderMaterial {
  declare uniforms: {
    u_time: IUniform<number>
    randomness: IUniform<number>
    air_resistance: IUniform<number>
    u_positions_data_texture: IUniform<Texture | null>
    u_velocity_data_texture: IUniform<Texture | null>
    u_extra_data_texture: IUniform<Texture | null>
    u_speed_data_texture: IUniform<Texture | null>
    u_init_positions_data_texture: IUniform<Texture | null>
    u_init_extra_data_texture: IUniform<Texture | null>
    u_is_after_first_render: IUniform<Boolean>
  }

  constructor() {
    const uniforms: GPGPUSimulationMaterial['uniforms'] = {
      u_time: { value: 0 },
      randomness: { value: 0.5 },
      air_resistance: { value: 0.1 },
      u_positions_data_texture: { value: null },
      u_velocity_data_texture: { value: null },
      u_extra_data_texture: { value: null },
      u_speed_data_texture: { value: null },
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