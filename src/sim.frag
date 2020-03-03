#version 300 es

precision mediump float;
uniform sampler2D vox;
// uniform int rules_b;
// uniform int rules_s;
out vec4 fragColor;

int getVoxel(vec3 p) {
  ivec3 i = ivec3(p);
  if (i.x < 0 || i.x >= 256 || i.y < 0 || i.y >= 32 || i.z < 0 || i.z >= 256) {
    return -1;
  }
  return int(texelFetch(vox, ivec2(i.x, i.z * 32 + i.y), 0).x * 255.);
}

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec3 p = vec3(px.x, px.y % 32, px.y / 32);
  int here = getVoxel(p);
  int above = getVoxel(p + vec3(0., 1., 0.));
  int below = getVoxel(p - vec3(0., 1., 0.));
  int md0 = getVoxel(p + vec3(1., 0., 0.));
  int md1 = getVoxel(p - vec3(1., 0., 0.));
  int md2 = getVoxel(p + vec3(0., 0., 1.));
  int md3 = getVoxel(p - vec3(0., 0., 1.));
  if ((above != 0 && here == 0) || (above == 1 && here == 2)) {
    fragColor = vec4(float(above) / 255., 0, 0, 0);
  } else if ((here != 0 && below == 0) || (here == 1 && below == 2)) {
    fragColor = vec4(float(below) / 255., 0, 0, 0);
  } else {
    if (here == 2 && md0 == 0) {
      fragColor = vec4(float(md0) / 255., 0, 0, 0);
    } else if (here == 0 && md1 == 2) {
      fragColor = vec4(float(md1) / 255., 0, 0, 0);
    } else {
      fragColor = vec4(float(here) / 255., 0, 0, 0);
    }
  }
}
