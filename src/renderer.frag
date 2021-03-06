#version 300 es

precision highp float;
precision highp sampler3D;

uniform bool renderVoxelIndex;
uniform ivec3 u_worldSize;
uniform ivec2 u_canvasSize;
uniform ivec3 u_worldChunkIndex;
uniform ivec3 u_chunkSize;
uniform bool u_reflection;
uniform bool u_refraction;
uniform bool u_ambientOcclusion;
uniform bool u_directionalLighting;
uniform bool u_showFog;
uniform float u_waterAttenuationDistance;
uniform float u_renderDistance;
uniform int timestamp;
uniform mat4 viewMatrixInverse;
uniform vec3 u_eye;
uniform sampler2D vox;
out vec4 fragColor;

const float PI = 3.1415926535897932384626433832795;
const float N_AIR = 1.;
const float N_WATER = 1.333;
const float CRITICAL_ANGLE = 0.848345669;
const float DIST_STEP = 0.25;

const float WAVE_AMPLITUDE = 0.01;
const float WAVE_FREQUENCY = 1.;
const float WAVE_VELOCITY = 0.002;

const int MAX_BOUNCES = 1;

vec4 getVoxel(vec3 p) {
  ivec3 i = ivec3(p);
  if (i.x < 0 || i.x >= u_worldSize.x || i.y < 0 || i.y >= u_worldSize.y || i.z < 0 || i.z >= u_worldSize.z) {
    return vec4(0);
  }
  return texelFetch(vox, ivec2(i.x, i.z * u_worldSize.y + i.y), 0);
}

int getMaterial(vec3 p) {
  return int(getVoxel(p).x);
}

float pointOcclusion(int side1, int side2, int corner) {
  if (side1 + side2 == 2) {
    return 0.;
  }
  return 3. - float(side1 + side2 + corner);
}

float ambientOcclusion(vec3 world, vec3 normal) {
  float f1, f2;
  vec3 d1, d2;
  if (normal.x != 0.) {
    f1 = fract(world.y);
    f2 = fract(world.z);
    d1 = vec3(0., 1., 0.);
    d2 = vec3(0., 0., 1.);
  }
  if (normal.y != 0.) {
    f1 = fract(world.x);
    f2 = fract(world.z);
    d1 = vec3(1., 0., 0.);
    d2 = vec3(0., 0., 1.);
  }
  if (normal.z != 0.) {
    f1 = fract(world.x);
    f2 = fract(world.y);
    d1 = vec3(1., 0., 0.);
    d2 = vec3(0., 1., 0.);
  }
  vec3 front = world + normal;
  int m00 = int(getMaterial(front - d1 - d2) == 1);
  int m01 = int(getMaterial(front - d1) == 1);
  int m02 = int(getMaterial(front - d1 + d2) == 1);
  int m10 = int(getMaterial(front - d2) == 1);
  int m12 = int(getMaterial(front + d2) == 1);
  int m20 = int(getMaterial(front + d1 - d2) == 1);
  int m21 = int(getMaterial(front + d1) == 1);
  int m22 = int(getMaterial(front + d1 + d2) == 1);
  float c00 = pointOcclusion(m01, m10, m00);
  float c10 = pointOcclusion(m10, m21, m20);
  float c11 = pointOcclusion(m21, m12, m22);
  float c01 = pointOcclusion(m12, m01, m02);
  return 0.5 + mix(mix(c00, c01, f2), mix(c10, c11, f2), f1) / 6.;
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float advance(in vec3 delta, inout vec3 world, inout vec3 normal) {
  float advanceDist = 0.25;
  vec3 t = ((sign(delta) + 1.)/2. - fract(world))/delta;
  if (t.x < t.y && t.x < t.z) {
    advanceDist = t.x;
    normal = vec3(-sign(delta.x), 0., 0.);
    world += advanceDist * delta;
    world.x = round(world.x) + 0.01*sign(delta.x);
  } else if (t.y < t.z) {
    advanceDist = t.y;
    normal = vec3(0., -sign(delta.y), 0.);
    world += advanceDist * delta;
    world.y = round(world.y) + 0.01*sign(delta.y);
  } else {
    advanceDist = t.z;
    normal = vec3(0., 0., -sign(delta.z));
    world += advanceDist * delta;
    world.z = round(world.z) + 0.01*sign(delta.z);
  }
  return advanceDist;
}

float packNormal(vec3 normal) {
  if (normal.x != 0.) {
    return sign(normal.x);
  }
  if (normal.y != 0.) {
    return sign(normal.y) * 2.;
  }
  return sign(normal.z) * 3.;
}

void main() {
  vec3 delta = vec3(0, 0, 0);
  vec3 sand = vec3( 76, 70, 50 );
  vec3 green = vec3( 76, 175, 80 );
  vec3 blue = vec3( 33, 150, 243 );
  vec3 white = vec3( 255, 255, 255 );
  vec3 lightDir = normalize(vec3( 0.5, 1, 0 ));
  vec2 coord = gl_FragCoord.xy;
  if (renderVoxelIndex) {
    coord = vec2(u_canvasSize) / 2.;
  }
  vec3 p = vec3(2. * coord.xy / vec2(u_canvasSize) - 1., 0);
  vec4 pixelHomogenous = (viewMatrixInverse * vec4(p, 1));
  vec3 pixel = pixelHomogenous.xyz / pixelHomogenous.w;
  vec3 color = vec3(0);
  vec3 world;
  vec3 normal;
  bool hit = false;
  int maxSamples = 2;
  if (!u_reflection || !u_refraction) {
    maxSamples = 1;
  }
  for (int s = 0; s < maxSamples; s += 1) {
    // vec3 eye = u_eye + vec3(u_worldChunkIndex * u_chunkSize);
    vec3 eye = u_eye;
    vec3 delta = normalize(pixel - eye);
    world = eye;
    vec3 c = blue;
    float water = 0.;
    float maxWater = 20.;
    float fog = 0.;
    float rayFraction = 1.;
    int lastMaterial = getMaterial(world);
    int material = lastMaterial;
    int bounces = 0;
    normal = vec3(0., 1., 0.);
    float dist = 0.;
    bool inWorld = false;
    while (dist < u_renderDistance) {
      float advanceDist = advance(delta, world, normal);
      dist += advanceDist;
      if (world.x > float(u_worldSize.x) || world.x < 0. || world.y > float(u_worldSize.y) || world.y < 0. || world.z > float(u_worldSize.z) || world.z < 0.) {
        if (inWorld) {
          break;
        }
      } else {
        inWorld = true;
      }
      lastMaterial = material;
      vec4 voxel = getVoxel(world);
      material = int(voxel.x);
      float level = voxel.y;
      if (material == 0) {
        if (bounces < MAX_BOUNCES && lastMaterial == 2) {
          bounces += 1;
          vec3 waterNormal = normal;
          if (waterNormal.y < -0.9) {
            waterNormal = normalize(vec3(WAVE_AMPLITUDE*sin(world.x*WAVE_FREQUENCY + float(timestamp)*WAVE_VELOCITY), -1., WAVE_AMPLITUDE*cos(world.z*WAVE_FREQUENCY + float(timestamp)*WAVE_VELOCITY)));
          }
          float incidenceAngle = PI - acos(dot(waterNormal, normalize(delta)));
          vec3 deltaRefract = refract(normalize(delta), waterNormal, N_WATER/N_AIR) * DIST_STEP;
          float refractionAngle = PI - acos(dot(waterNormal, normalize(deltaRefract)));
          vec3 deltaReflect = reflect(normalize(delta), waterNormal) * DIST_STEP;
          float reflectionPercentage = 1.;
          if (incidenceAngle < CRITICAL_ANGLE) {
            float fresnelA = N_AIR * cos(incidenceAngle);
            float fresnelB = N_WATER * cos(refractionAngle);
            float fresnelParallel = pow((fresnelA - fresnelB)/(fresnelA + fresnelB), 2.);
            float fresnelPerpendicular = pow((fresnelB - fresnelA)/(fresnelB + fresnelA), 2.);
            reflectionPercentage = 0.5*(fresnelParallel + fresnelPerpendicular);
          }
          if (u_reflection && (s == 0 || !u_refraction)) {
            delta = deltaReflect;
            if (u_refraction) {
              rayFraction *= reflectionPercentage;
            }
          }
          if (u_refraction && (s == 1 || !u_reflection)) {
            delta = deltaRefract;
            if (u_reflection) {
              rayFraction *= (1. - reflectionPercentage);
            }
          }
        }
        fog += advanceDist;
      } else if (material == 2) {
        if (renderVoxelIndex) {
          hit = true;
          break;
        } else if (bounces < MAX_BOUNCES && lastMaterial == 0) {
          bounces += 1;
          vec3 waterNormal = normal;
          if (waterNormal.y > 0.9) {
            waterNormal = normalize(vec3(WAVE_AMPLITUDE*sin(world.x*WAVE_FREQUENCY + float(timestamp)*WAVE_VELOCITY), 1., WAVE_AMPLITUDE*cos(world.z*WAVE_FREQUENCY + float(timestamp)*WAVE_VELOCITY)));
          }
          float incidenceAngle = acos(dot(waterNormal, normalize(delta)));
          vec3 deltaRefract = refract(normalize(delta), waterNormal, N_AIR/N_WATER) * DIST_STEP;
          float refractionAngle = acos(dot(waterNormal, normalize(deltaRefract)));
          vec3 deltaReflect = reflect(normalize(delta), waterNormal) * DIST_STEP;
          float fresnelA = N_WATER * cos(incidenceAngle);
          float fresnelB = N_AIR * cos(refractionAngle);
          float fresnelParallel = pow((fresnelA - fresnelB)/(fresnelA + fresnelB), 2.);
          float fresnelPerpendicular = pow((fresnelB - fresnelA)/(fresnelB + fresnelA), 2.);
          float reflectionPercentage = max(0., min(1., 0.5*(fresnelParallel + fresnelPerpendicular)));
          if (u_reflection && (s == 0 || !u_refraction)) {
            delta = deltaReflect;
            if (u_refraction) {
              rayFraction *= reflectionPercentage;
            }
          }
          if (u_refraction && (s == 1 || !u_reflection)) {
            delta = deltaRefract;
            if (u_reflection) {
              rayFraction *= (1. - reflectionPercentage);
            }
          }
        }
        water += advanceDist*level / 255.;

        // // No reflections
        // c = vec3(blue * level / 1024.);
        // break;
      } else {
        c = vec3(green);
        if (u_directionalLighting) {
          float shade = (dot(normal, lightDir) + 1.0) / 3.0 + 0.33;
          c *= shade;
        }
        hit = true;
        break;
      }
    }

    if (material == 1 && u_ambientOcclusion) {
      float occlusion = ambientOcclusion(world, normal);
      c *= occlusion;
    }

    c *= rayFraction;
    // Light gets cut in half for roughly every 10m of water.
    // https://www.researchgate.net/figure/Penetration-of-Light-of-Various-Wavelengths-through-Water-Blue-Light-is-the-Strongest_fig3_220785640
    if (water > 0.) {
      float waterVisibility = pow(2., -water / u_waterAttenuationDistance);
      c = (c * waterVisibility + blue * (1. - waterVisibility)) * waterVisibility;
      // c = vec3(water * 255.);
    }

    // Fog
    if (fog > 0. && u_showFog) {
      fog = fog / u_renderDistance;
      c = fog * blue + (1. - fog) * c;
    }

    color += c;
    if (rayFraction == 1.) {
      break;
    }
  }

  if (renderVoxelIndex) {
    if (hit) {
      fragColor = vec4(floor(world), packNormal(normal));
    } else {
      fragColor = vec4(vec3(-1), 1.);
    }
  } else {
    if (length(gl_FragCoord.xy - vec2(u_canvasSize) / 2.) < 20.0 && (
      int(gl_FragCoord.x) == u_canvasSize.x / 2
      || int(gl_FragCoord.y) == u_canvasSize.y / 2
    )) {
      fragColor = vec4(1.0 - color / 255.0, 1.0);
    } else {
      fragColor = vec4(color / 255.0, 1.0);
    }
  }
}
