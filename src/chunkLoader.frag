#version 300 es

precision highp float;

uniform sampler2D u_chunk;
uniform sampler2D u_world;
uniform ivec3 u_location;
uniform ivec3 u_chunkSize;
uniform ivec3 u_worldSize;
out vec4 fragColor;

vec4 getVoxel(vec3 i) {
  return texelFetch(u_world, ivec2(i.x, i.z * float(u_worldSize.y) + i.y), 0);
}

vec4 getChunkVoxel(vec3 i) {
  return texelFetch(u_chunk, ivec2(i.x, i.z * float(u_chunkSize.y) + i.y), 0);
}

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  ivec3 p = ivec3(px.x, px.y % u_chunkSize.y, px.y / u_chunkSize.y);
  ivec3 minIndex = u_location * u_chunkSize;
  ivec3 maxIndex = (u_location + ivec3(1, 1, 1)) * u_chunkSize;
  if (all(greaterThanEqual(p, minIndex)) && all(lessThan(p, maxIndex))) {
    fragColor = getChunkVoxel(vec3(p - minIndex));
  } else {
    fragColor = getVoxel(vec3(p));
  }
}
