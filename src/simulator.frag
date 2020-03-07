#version 300 es

precision highp float;

uniform int sx;
uniform int sy;
uniform int sz;
uniform int timestep;
uniform sampler2D vox;
out vec4 fragColor;

const float WATER_THRESHOLD = 0.001;
const float MIN_WATER = -1.;
const float alpha = 0.5;

float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 getVoxel(vec3 i) {
  if (i.x < 0. || i.x >= float(sx) || i.y < 0. || i.y >= float(sy) || i.z < 0. || i.z >= float(sz)) {
    return vec4(-1, 0, 0, 0);
  }
  return texelFetch(vox, ivec2(i.x, i.z * float(sy) + i.y), 0);
  // return texelFetch(vox, ivec2(i.x, i.z * 32. + i.y), 0) * 255.;
}

vec4 airWaterMaterial(float waterContent) {
  // waterContent = round(waterContent);
  if (waterContent >= WATER_THRESHOLD) {
    return vec4(2, waterContent, 0, 0);
  }
  return vec4(0, waterContent, 0, 0);
}

vec4 materialConv(vec3 p) {
  vec4 here = getVoxel(p);
  // Rain
  // // if (p.y == 63. && rand(p.xz / float(timestep % 1000)) > 0.9995 && here.x == 0.) {
  // if (p.y == float(sy - 1) && rand(p.xz / float(timestep % 1000)) > 0.995 && here.x == 0.) {
  //   return vec4(2, 255, 0, 0);
  // }

  int mode = timestep % 3;
  if (mode == 0 && (here.x == 0. || here.x == 2.)) {
    vec4 md0 = getVoxel(p + vec3(0, 1, 0));
    vec4 md1 = getVoxel(p - vec3(0, 1, 0));
    float waterContent = here.y;
    if (md0.x == 0. || md0.x == 2.) {
      waterContent += min(255. - here.y, md0.y);
    }
    if (md1.x == 0. || md1.x == 2.) {
      waterContent -= min(here.y, 255. - md1.y);
    }
    vec4 voxel = airWaterMaterial(waterContent);
    voxel += vec4(0, 0, here.zw);
    return voxel;
  } else if (here.x == 0. || here.x == 2.) {
    // vec4 below = getVoxel(p - vec3(0, 1, 0));
    // if (below.x == 0. && below.y == 0.) {
    //   return here;
    // }
    vec3 pd0;
    vec3 pd1;
    float velocity;
    float dir;
    if (mode == 1) {
      pd0 = p + vec3(1, 0, 0);
      pd1 = p - vec3(1, 0, 0);
      velocity = here.z;
      dir = 0.5;
    } else {
      pd0 = p + vec3(0, 0, 1);
      pd1 = p - vec3(0, 0, 1);
      velocity = here.w;
      dir = 0.5;
    }
    vec4 md0 = getVoxel(pd0);
    vec4 md1 = getVoxel(pd1);
    float a0 = md0.y;
    float a1 = md1.y;
    float h = here.y;
    float waterContent = h;
    if ((md0.x == 0. || md0.x == 2.) && a0 > MIN_WATER && (md1.x == 0. || md1.x == 2.) && a1 > MIN_WATER) {
      waterContent = dir * a0 + (1. - dir) * a1;
    } else if ((md0.x == 0. || md0.x == 2.) && a0 > MIN_WATER) {
      // waterContent = dir * a0 + (1. - dir) * h;
      waterContent = dir * a0 + dir * h;
    } else if ((md1.x == 0. || md1.x == 2.) && a1 > MIN_WATER) {
      // waterContent = (1. - dir) * a1 + dir * h;
      // This could get bigger than max (compression).
      waterContent = (1. - dir) * a1 + (1. - dir) * h;
    }
    vec4 voxel = airWaterMaterial(waterContent);
    if (mode == 1) {
      voxel += vec4(0, 0, velocity, here.w);
    } else {
      voxel += vec4(0, 0, here.z, velocity);
    }
    return voxel;
  }
  return here;
}

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec3 p = vec3(px.x, px.y % sy, px.y / sy);
  fragColor = materialConv(p);
}
