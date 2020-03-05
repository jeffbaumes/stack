#version 300 es

precision mediump float;

uniform int timestep;
uniform sampler2D vox;
out vec4 fragColor;

int getVoxel(vec3 p) {
  ivec3 i = ivec3(p);
  if (i.x < 0 || i.x >= 256 || i.y < 0 || i.y >= 32 || i.z < 0 || i.z >= 256) {
    return -1;
  }
  return int(texelFetch(vox, ivec2(i.x, i.z * 32 + i.y), 0).x * 255.);
}

float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

int hash(vec3 p) {
  return int(rand(vec2(rand(p.xy), rand(vec2(p.z, float(timestep % 374872397)))))*10000.);
}

int hash2(vec3 p) {
  ivec3 i = ivec3(p);
  if ((i.x + i.z) % 2 == 0) {
    return 0 + timestep + i.y;
  }
  return 2 + timestep + i.y;
}

int material(vec3 p) {
  int here = getVoxel(p);
  // if (p.y == 31. && rand(p.xz / float(timestep % 1000)) > 0.9995 && here == 0) {
  //   return 2;
  // }
  int mode = timestep % 2;
  if (mode == 0) {
    int above = getVoxel(p + vec3(0., 1., 0.));
    int below = getVoxel(p - vec3(0., 1., 0.));
    // if ((above != 0 && here == 0) || (above == 1 && here == 2)) {
    if (above == 2 && here == 0) {
      return above;
    }
    // if ((here != 0 && below == 0) || (here == 1 && below == 2)) {
    if (here == 2 && below == 0) {
      return below;
    }
  } else {
    vec3 pd0 = p + vec3(1., 0., 0.);
    vec3 pd1 = p - vec3(1., 0., 0.);
    vec3 pd2 = p + vec3(0., 0., 1.);
    vec3 pd3 = p - vec3(0., 0., 1.);
    // int s = hash(vec3(timestep)) % 4;
    // int wd = s;
    // if (s == 1) {
    //   wd = 3;
    // } else if (s == 3) {
    //   wd = 1;
    // }
    // int wd0 = wd;
    // int wd1 = wd;
    // int wd2 = wd;
    // int wd3 = wd;

    // int wd = hash(p) % 4;
    // int wd0 = hash(pd0) % 4;
    // int wd1 = hash(pd1) % 4;
    // int wd2 = hash(pd2) % 4;
    // int wd3 = hash(pd3) % 4;

    int wd = hash2(p) % 4;
    int wd0 = hash2(pd0) % 4;
    int wd1 = hash2(pd1) % 4;
    int wd2 = hash2(pd2) % 4;
    int wd3 = hash2(pd3) % 4;

    int md0 = getVoxel(pd0);
    int md1 = getVoxel(pd1);
    int md2 = getVoxel(pd2);
    int md3 = getVoxel(pd3);
    // if (mode == 1) {
      if (wd == 0 && here == 2 && md0 == 0) {
        return 0;
      }
      if (wd1 == 0 && here == 0 && md1 == 2) {
        return 2;
      }
    // }
    // if (mode == 2) {
      if (wd == 1 && here == 2 && md1 == 0) {
        return 0;
      }
      if (wd0 == 1 && here == 0 && md0 == 2) {
        return 2;
      }
    // }
    // if (mode == 3) {
      if (wd == 2 && here == 2 && md2 == 0) {
        return 0;
      }
      if (wd3 == 2 && here == 0 && md3 == 2) {
        return 2;
      }
    // }
    // if (mode == 4) {
      if (wd == 3 && here == 2 && md3 == 0) {
        return 0;
      }
      if (wd2 == 3 && here == 0 && md2 == 2) {
        return 2;
      }
    // }
  }
  return here;
}

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec3 p = vec3(px.x, px.y % 32, px.y / 32);
  fragColor = vec4(float(material(p)) / 255., 0, 0, 0);
}
