#version 300 es

precision highp float;

uniform vec4 modifyIndex;
uniform vec3 modifyValue;
uniform bool modify;

uniform int brushMode;
uniform float brushSize;
uniform bool u_groundGravity;

uniform ivec3 u_worldSize;
uniform int timestep;
uniform sampler2D vox;
out vec4 fragColor;

const int BRUSH_BOX = 0;
const int BRUSH_SPHERE = 1;
const int BRUSH_DIAMOND = 2;

const float WATER_THRESHOLD = 128.;
const float MIN_WATER = -1.;
const float alpha = 0.5;

float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 getVoxel(vec3 i) {
  if (i.x < 0. || i.x >= float(u_worldSize.x)
    || i.y < 0. || i.y >= float(u_worldSize.y)
    || i.z < 0. || i.z >= float(u_worldSize.z)
  ) {
    return vec4(-1, 0, 0, 0);
  }
  return texelFetch(vox, ivec2(i.x, i.z * float(u_worldSize.y) + i.y), 0);
}

vec4 airWaterMaterial(float waterContent) {
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
  if (mode == 0) {
    if (u_groundGravity) {
      vec4 md0 = getVoxel(p + vec3(0, 1, 0));
      vec4 md1 = getVoxel(p - vec3(0, 1, 0));
      if (here.x == 0. || here.x == 2.) {
        float waterContent = here.y;
        if (md0.x == 0. || md0.x == 2.) {
          waterContent += min(255. - here.y, md0.y);
        } else if (md0.x == 1.) {
          return md0;
        }
        if (md1.x == 0. || md1.x == 2.) {
          waterContent -= min(here.y, 255. - md1.y);
        }
        vec4 voxel = airWaterMaterial(waterContent);
        voxel += vec4(0, 0, here.zw);
        return voxel;
      } else if (here.x == 1.) {
        if (md1.x == 0. || md1.x == 2.) {
          return md1;
        }
      }
    } else if (here.x == 0. || here.x == 2.) {
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
    }
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
      waterContent = dir * a0 + dir * h;
    } else if ((md1.x == 0. || md1.x == 2.) && a1 > MIN_WATER) {
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

vec3 unpackNormal(float n) {
  if (abs(n) == 1.) {
    return vec3(sign(n), 0, 0);
  }
  if (abs(n) == 2.) {
    return vec3(0, sign(n), 0);
  }
  return vec3(0, 0, sign(n));
}

bool brushHit(vec3 p, vec4 voxel) {
  if (modifyIndex.x < 0.) {
    return false;
  }
  if (modifyValue.x != 0.) {
    p = p - unpackNormal(modifyIndex.w);
  }
  vec3 diff = abs(modifyIndex.xyz - p);
  switch (brushMode) {
    case BRUSH_SPHERE:
      return length(diff) <= brushSize;
    case BRUSH_BOX:
      return max(diff.x, max(diff.y, diff.z)) <= brushSize;
    case BRUSH_DIAMOND:
      return dot(diff, vec3(1)) <= brushSize;
  }
  return false;
}

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec3 p = vec3(px.x, px.y % u_worldSize.y, px.y / u_worldSize.y);
  vec4 voxel = getVoxel(p);
  if (modify && brushHit(p, voxel) && (modifyValue.x == 0. || voxel.x == 0.)) {
    fragColor = vec4(modifyValue, 0);
  } else {
    fragColor = materialConv(p);
  }
}
