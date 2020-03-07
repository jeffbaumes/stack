#version 300 es

precision highp float;
precision highp sampler3D;

uniform int sx;
uniform int sy;
uniform int sz;
uniform int timestamp;
uniform mat4 viewMatrixInverse;
uniform vec3 eye;
uniform vec3 minSize;
uniform int canvasWidth;
uniform int canvasHeight;
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

int getVoxel(in vec3 p) {
  ivec3 i = ivec3(p - minSize);
  if (i.x < 0 || i.x >= sx || i.y < 0 || i.y >= sy || i.z < 0 || i.z >= sz) {
    return 0;
  }
  // return int(texelFetch(vox, ivec2(i.x, i.z * sy + i.y), 0).x * 255.);
  return int(texelFetch(vox, ivec2(i.x, i.z * sy + i.y), 0).x);
}

float getVoxelLevel(in vec3 p) {
  ivec3 i = ivec3(p - minSize);
  if (i.x < 0 || i.x >= sx || i.y < 0 || i.y >= sy || i.z < 0 || i.z >= sz) {
    return 0.;
  }
  return texelFetch(vox, ivec2(i.x, i.z * sy + i.y), 0).y;
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
  int m00 = int(getVoxel(front - d1 - d2) == 1);
  int m01 = int(getVoxel(front - d1) == 1);
  int m02 = int(getVoxel(front - d1 + d2) == 1);
  int m10 = int(getVoxel(front - d2) == 1);
  int m12 = int(getVoxel(front + d2) == 1);
  int m20 = int(getVoxel(front + d1 - d2) == 1);
  int m21 = int(getVoxel(front + d1) == 1);
  int m22 = int(getVoxel(front + d1 + d2) == 1);
  float c00 = pointOcclusion(m01, m10, m00);
  float c10 = pointOcclusion(m10, m21, m20);
  float c11 = pointOcclusion(m21, m12, m22);
  float c01 = pointOcclusion(m12, m01, m02);
  return 0.5 + mix(mix(c00, c01, f2), mix(c10, c11, f2), f1) / 6.;

  // if (getVoxel(world + normal + d1) == 1) {
  //   // occlusion = min(occlusion, 1. - f1);
  //   occlusion += f1;
  // }
  // if (getVoxel(world + normal - d1) == 1) {
  //   // occlusion = min(occlusion, f1);
  //   occlusion += 1. - f1;
  // }
  // if (getVoxel(world + normal + d2) == 1) {
  //   // occlusion = min(occlusion, 1. - f2);
  //   occlusion += f2;
  // }
  // if (getVoxel(world + normal - d2) == 1) {
  //   // occlusion = min(occlusion, f2);
  //   occlusion += 1. - f2;
  // }
  // if (getVoxel(world + normal + d1 + d2) == 1) {
  //   // occlusion = min(occlusion, length(vec2(1. - f1, 1. - f2)));
  //   occlusion += max(0., 1. - length(vec2(1. - f1, 1. - f2)));
  //   // occlusion += max(0., 1. - dot(vec2(1. - f1, 1. - f2), vec2(1)));
  // }
  // if (getVoxel(world + normal + d1 - d2) == 1) {
  //   // occlusion = min(occlusion, length(vec2(1. - f1, f2)));
  //   occlusion += max(0., 1. - length(vec2(1. - f1, f2)));
  //   // occlusion += max(0., 1. - dot(vec2(1. - f1, f2), vec2(1)));
  // }
  // if (getVoxel(world + normal - d1 + d2) == 1) {
  //   // occlusion = min(occlusion, length(vec2(f1, 1. - f2)));
  //   occlusion += max(0., 1. - length(vec2(f1, 1. - f2)));
  //   // occlusion += max(0., 1. - dot(vec2(f1, 1. - f2), vec2(1)));
  // }
  // if (getVoxel(world + normal - d1 - d2) == 1) {
  //   // occlusion = min(occlusion, length(vec2(f1, f2)));
  //   occlusion += max(0., 1. - length(vec2(f1, f2)));
  //   // occlusion += max(0., 1. - dot(vec2(f1, f2), vec2(1)));
  // }
  // // return 0.5 * min(1., occlusion) + 0.5;
  // return 0.5 * (1. - occlusion / 2.) + 0.5;
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
  int w = canvasWidth;
  int h = canvasHeight;
  vec3 p = vec3(0, 0, 0);
  vec3 delta = vec3(0, 0, 0);
  vec3 sand = vec3( 76, 70, 50 );
  vec3 green = vec3( 76, 175, 80 );
  vec3 blue = vec3( 33, 150, 243 );
  vec3 white = vec3( 255, 255, 255 );
  vec3 lightDir = normalize(vec3( 0.5, 1, 0 ));
  p.x = 2.0 * gl_FragCoord.x / float(w) - 1.0;
  p.y = 2.0 * gl_FragCoord.y / float(h) - 1.0;
  vec4 pixelHomogenous = (viewMatrixInverse * vec4(p, 1));
  vec3 pixel = pixelHomogenous.xyz / pixelHomogenous.w;
  vec3 color = vec3(0);
  for (int s = 0; s < 2; s += 1) {
    vec3 delta = normalize(pixel - eye);
    vec3 world = eye;
    vec3 c = blue;
    float water = 0.;
    float maxWater = 20.;
    float fog = 0.;
    float rayFraction = 1.;
    int lastMaterial = getVoxel(world);
    int material = lastMaterial;
    int bounces = 0;
    vec3 normal = vec3(0., 1., 0.);
    float d = 0.;
    int iter = 0;
    int maxIter = 400;
    while (iter < maxIter) {
      iter += 1;

      float advanceDist = 0.25;
      // vec3 t = clamp(((sign(delta) + 1.)/2. - fract(world))/delta, vec3(0.), vec3(1.));
      // vec3 t = max(vec3(0), ((sign(delta) + 1.)/2. - fract(world))/delta);
      vec3 t = ((sign(delta) + 1.)/2. - fract(world))/delta;
      // if (t.x == 0.) {
      //   t.x = 1.;
      // }
      // if (t.y == 0.) {
      //   t.y = 1.;
      // }
      // if (t.z == 0.) {
      //   t.z = 1.;
      // }
      // vec3 t = min(vec3(5., 5., 5.), ((sign(delta) + 1.)/2. - fract(world))/delta);
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
      d += advanceDist;

      lastMaterial = material;
      material = getVoxel(world);
      float level = getVoxelLevel(world);

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
          if (s == 0) {
            rayFraction *= reflectionPercentage;
            delta = deltaReflect;
          } else {
            rayFraction *= (1. - reflectionPercentage);
            delta = deltaRefract;
          }
        }
        fog += advanceDist;
      } else if (material == 2) {
        if (bounces < MAX_BOUNCES && lastMaterial == 0) {
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
          if (s == 0) {
            rayFraction *= reflectionPercentage;
            delta = deltaReflect;
          } else {
            rayFraction *= (1. - reflectionPercentage);
            delta = deltaRefract;
          }
        }
        water += advanceDist*level / 255.;
        // c = vec3(blue * level / 1024.);
        // break;
      } else {
        c = vec3(green);
        // float shade = (dot(normal, lightDir) + 1.0) / 3.0 + 0.33;
        // c *= shade;
        break;
      }
    }
    // // Fog
    // if (fog > 0.) {
    //   fog = fog / maxDist.0;
    //   c = fog * blue + (1. - fog) * c;
    // }
    if (material == 1) {
      float occlusion = ambientOcclusion(world, normal);
      c *= occlusion;
    }

    c *= rayFraction;
    // Light gets cut in half for roughly every 10m of water.
    // https://www.researchgate.net/figure/Penetration-of-Light-of-Various-Wavelengths-through-Water-Blue-Light-is-the-Strongest_fig3_220785640
    if (water > 0.) {
      float waterVisibility = pow(2., -0.01 * water);
      c = (c * waterVisibility + blue * (1. - waterVisibility)) * waterVisibility;
      // c = vec3(water * 255.);
    }
    color += c;
    if (rayFraction == 1.) {
      break;
    }
  }
  // color = vec3(gl_FragCoord.xy, 0.);
  // color = vec3(w, h, 0);
  if (length(gl_FragCoord.xy - vec2(w / 2, h / 2)) < 20.0 && (int(gl_FragCoord.x) == int(w / 2) || int(gl_FragCoord.y) == int(h / 2))) {
    fragColor = vec4(1.0 - color / 255.0, 1.0);
  } else {
    fragColor = vec4(color / 255.0, 1.0);
  }
}
