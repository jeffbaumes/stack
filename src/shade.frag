#version 300 es
// Mobiles need this
precision lowp float;
precision lowp sampler3D;


uniform int timestamp;

// Main
uniform mat4 viewMatrixInverse;
uniform vec3 eye;
uniform vec3 minSize;

// Gradient
uniform int xKernel[27];
uniform int yKernel[27];
uniform int zKernel[27];


uniform int canvasWidth;
uniform int canvasHeight;
uniform sampler3D vox;

out vec4 fragColor;

const float PI = 3.1415926535897932384626433832795;

const float N_AIR = 1.;
const float N_WATER = 1.333;
const float CRITICAL_ANGLE = 0.848345669;
// float CRITICAL_ANGLE = 48.6066264; // asin(N_AIR/N_WATER)

const float WAVE_AMPLITUDE = 0.01;
// const float WAVE_AMPLITUDE = 0.;
const float WAVE_FREQUENCY = 1.;
const float WAVE_VELOCITY = 0.002;

const int MAX_BOUNCES = 1;

int getVoxel(in vec3 p) {
  ivec3 i = ivec3(p - minSize);
  if (i.x < 0 || i.x >= sx || i.y < 0 || i.y >= sy || i.z < 0 || i.z >= sz) {
    return 0;
  }

  // Boxes
  return int(texelFetch(vox, i, 0).x * 255.);

  // // Spheres
  // int material = int(texelFetch(vox, i, 0).x * 255.);
  // if (material != 0) {
  //   if (length((p - floor(p)) - 0.5) > 0.5) {
  //     return 0;
  //   }
  //   return material;
  // }
  // return 0;
}


vec3 getNormal(in vec3 p, in  vec3 delta) {
  vec3 n = (p - delta * 0.5) - floor(p) - 0.5;

  // // Spheres
  // return normalize(n);

  // Boxes
  vec3 a = abs(n);
  if (a.x > a.y && a.x > a.z) {
    return vec3(sign(n.x), 0., 0.);
  }
  if (a.y > a.z) {
    return vec3(0., sign(n.y), 0.);
  }
  return vec3(0., 0., sign(n.z));
}

vec3 getGradient(in vec3 p, in int material) {
  float dist = 0.25;
  int region[27];
  for (float x = -1.0; x <= 1.0; x += 1.0) {
    for (float y = -1.0; y <= 1.0; y += 1.0) {
      for (float z = -1.0; z <= 1.0; z += 1.0) {
        int vv = getVoxel(p + dist*vec3(x, y, z));
        if (vv == material) {
          region[ (int(x) + 1) * 9 + (int(y) + 1) * 3 + (int(z) + 1) ] = 1;
        } else {
          region[ (int(x) + 1) * 9 + (int(y) + 1) * 3 + (int(z) + 1) ] = 0;
        }
      }
    }
  }

  vec3 grad = vec3(0, 0, 0);
  for (int x = 0; x < 3; x += 1) {
    for (int y = 0; y < 3; y += 1) {
      for (int z = 0; z < 3; z += 1) {
        grad.x += float(region[ x * 9 + y * 3 + z ] * xKernel[ x * 9 + y * 3 + z ]);
        grad.y += float(region[ x * 9 + y * 3 + z ] * yKernel[ x * 9 + y * 3 + z ]);
        grad.z += float(region[ x * 9 + y * 3 + z ] * zKernel[ x * 9 + y * 3 + z ]);
      }
    }
  }
  // Make sure it's not equal to the zero vector.
  grad.x += 0.001;

  return normalize(grad);
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}


void main() {
  int w = canvasWidth;
  int h = canvasHeight;
  vec3 p = vec3(0, 0, 0);
  // vec3 world = vec3(0, 0, 0);
  vec3 delta = vec3(0, 0, 0);
  // vec3 green = vec3( 76, 175, 80 );
  vec3 green = vec3( 76, 70, 50 );
  // vec3 green = vec3( 255, 255, 255 );
  vec3 blue = vec3( 33, 150, 243 );
  vec3 white = vec3( 255, 255, 255 );
  vec3 lightDir = normalize(vec3( 0.5, 1, 0 ));
  // vec3 lightDir = normalize(vec3( sin(float(timestamp)/1000.), 0., cos(float(timestamp)/1000.)));
  p.x = 2.0 * gl_FragCoord.x / float(w) - 1.0;
  p.y = 2.0 * gl_FragCoord.y / float(h) - 1.0;
  vec4 pixelHomogenous = (viewMatrixInverse * vec4(p, 1));
  vec3 pixel = pixelHomogenous.xyz / pixelHomogenous.w;
  vec3 color = vec3(0);
  for (int s = 0; s < 2; s += 1) {
    vec3 delta = normalize(pixel - eye) * distStep;
    vec3 world = eye;
    // vec3 c = vec3(255, 255, 255);
    vec3 c = blue;
    float start = rand(delta.xy * eye.xy);
    world += start * delta;
    float water = 0.;
    float maxWater = 20.;
    float fog = 0.;
    float rayFraction = 1.;
    int lastMaterial = getVoxel(world);
    int material = lastMaterial;
    int bounces = 0;
    for (float d = 0.; d < maxDist.0; d += distStep) {
    // for (float d = 0.; d < 20.; d += distStep) {
      world += delta;
      lastMaterial = material;
      material = getVoxel(world);
      if (material == 0) {
        if (bounces < MAX_BOUNCES && lastMaterial == 2) {
          bounces += 1;
          vec3 waterNormal = getGradient(world, 0);

          // // Back up back into the water.
          // world -= delta;

          if (waterNormal.y < -0.9) {
            waterNormal = normalize(vec3(WAVE_AMPLITUDE*sin(world.x*WAVE_FREQUENCY + float(timestamp)*WAVE_VELOCITY), -1., WAVE_AMPLITUDE*cos(world.z*WAVE_FREQUENCY + float(timestamp)*WAVE_VELOCITY)));
          }
          float incidenceAngle = PI - acos(dot(waterNormal, normalize(delta)));
          vec3 deltaRefract = refract(normalize(delta), waterNormal, N_WATER/N_AIR) * distStep;
          float refractionAngle = PI - acos(dot(waterNormal, normalize(deltaRefract)));
          vec3 deltaReflect = reflect(normalize(delta), waterNormal) * distStep;
          float reflectionPercentage = 1.;
          if (incidenceAngle < CRITICAL_ANGLE) {
            // reflectionPercentage = 0.5;
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
        fog += distStep;
      } else if (material == 2) {
        if (bounces < MAX_BOUNCES && lastMaterial == 0) {
          bounces += 1;
          vec3 waterNormal = getGradient(world, 2);
          // vec3 waterNormal = getNormal(world, delta);
          if (waterNormal.y > 0.9) {
            waterNormal = normalize(vec3(WAVE_AMPLITUDE*sin(world.x*WAVE_FREQUENCY + float(timestamp)*WAVE_VELOCITY), 1., WAVE_AMPLITUDE*cos(world.z*WAVE_FREQUENCY + float(timestamp)*WAVE_VELOCITY)));
          }
          // vec3 waterNormal = vec3(0., 1., 0.);
          float incidenceAngle = acos(dot(waterNormal, normalize(delta)));
          vec3 deltaRefract = refract(normalize(delta), waterNormal, N_AIR/N_WATER) * distStep;
          float refractionAngle = acos(dot(waterNormal, normalize(deltaRefract)));
          vec3 deltaReflect = reflect(normalize(delta), waterNormal) * distStep;
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
          world += delta;
        }
        water += distStep;
      } else {
        c = vec3(green);

        // Gradient shading
        // vec3 normal = getNormal(world, delta);
        vec3 normal = getGradient(world, 1);
        float shade = (dot(normal, lightDir) + 1.0) / 3.0 + 0.33;
        c *= shade;
        break;
      }
    }

    // Water
    // if (water > 0.) {
    //   // water = min(water, maxWater) / maxWater;
    //   // c = water * blue + (1. - water) * c;
    //   c = 0.5 * blue + 0.5 * c;
    // }

    // Fog
    // if (fog > 0.) {
    //   fog = fog / maxDist.0;
    //   c = fog * blue + (1. - fog) * c;
    // }

    // Multiply by the fraction of the ray
    c *= rayFraction;

    // Light gets cut in half for roughly every 10m of water.
    // https://www.researchgate.net/figure/Penetration-of-Light-of-Various-Wavelengths-through-Water-Blue-Light-is-the-Strongest_fig3_220785640
    if (water > 0.) {
      float waterVisibility = pow(2., -0.01 * water);
      // c = c * waterVisibility + blue * (1. - waterVisibility);
      c = (c * waterVisibility + blue * (1. - waterVisibility)) * waterVisibility;
    }

    // color = c;
    // color = (color * float(s) + c) / (float(s) + 1.0);
    // color = vec3(255.*rayFraction);

    // if (getVoxel(eye) == 2) {
    //   if (s == 0) {
    //     color.x = rayFraction * 128. + 64.;
    //   } else if (s == 1) {
    //     color.y = rayFraction * 128. + 64.;
    //   }
    //   // break;
    // } else {
    //   color += c;
    // }

    color += c;

    // break;
    // color = vec3(float(bounces) * 128.);
    if (rayFraction == 1.) {
      break;
    }
    // if (s == 1) {
    //   color = normalize(delta) * 255.;
    // }

    // color.r = (color.r * float(s) + c.r) / (float(s) + 1.0);
    // color.g = (color.g * float(s) + c.g) / (float(s) + 1.0);
    // color.b = (color.b * float(s) + c.b) / (float(s) + 1.0);
  }
  // c = Math.round(c / 20) * 20;
  // ctx.fillRect(minX + x * pixelSize, minY + y * pixelSize, pixelSize, pixelSize);
  if (length(gl_FragCoord.xy - vec2(w / 2, h / 2)) < 20.0 && (int(gl_FragCoord.x) == int(w / 2) || int(gl_FragCoord.y) == int(h / 2))) {
    fragColor = vec4(1.0 - color / 255.0, 1.0);
  } else {
    fragColor = vec4(color / 255.0, 1.0);
  }
  // fragColor = vec4(texture(vox, vec3(p.xy, 3)).rgb / 255.0, 1.0);
  // fragColor = vec4(sx.0/20.0, sy.0/20.0, sz.0/20.0, 1.0);
  // fragColor = vec4(0.0, 0.0, 1.0, 1.0);
  // fragColor = vec4(delta * 2.0, 1.0);
  // fragColor = vec4(eye / 2.0, 1);
}
