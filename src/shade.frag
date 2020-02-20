#version 300 es
// Mobiles need this
precision highp float;
precision highp sampler3D;


uniform float timestamp;

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

float getVoxel(in vec3 p) {
  vec3 i = floor(p - minSize);
  // float xi = floor(p.x - minSize.x);
  // float yi = floor(p.y - minSize.y);
  // float zi = floor(p.z - minSize.z);
  // return 1.0;
  if (i.x < 0.0 || i.x >= sx.0 || i.y < 0.0 || i.y >= sy.0 || i.z < 0.0 || i.z >= sz.0) {
    return 0.0;
  }
  // return 1.0;
  // fragColor = texture(vox, i);
  return texture(vox, i / vec3(sx, sy, sz)).r;
}


vec3 getGradient(in vec3 p) {
  int region[27];
  for (float x = -1.0; x <= 1.0; x += 1.0) {
    for (float y = -1.0; y <= 1.0; y += 1.0) {
      for (float z = -1.0; z <= 1.0; z += 1.0) {
        float vv = getVoxel(vec3(p.x + x*0.5, p.y + y*0.5, p.z + z*0.5));
        if (vv != 0.0) {
          region[ (int(x) + 1) * 9 + (int(y) + 1) * 3 + (int(z) + 1) ] = 1;
        } else {
          region[ (int(x) + 1) * 9 + (int(y) + 1) * 3 + (int(z) + 1) ] = 0;
        }
      }
    }
  }

  // int xKernel[27] = int[27](
  //   1, 1, 1,  1, 1, 1,  1, 1, 1,
  //   0, 0, 0,  0, 0, 0,  0, 0, 0,
  //   -1, -1, -1,  -1, -1, -1,  -1, -1, -1
  // );
  // int yKernel[27] = int[27](
  //   1, 1, 1,  0, 0, 0,  -1, -1, -1,
  //   1, 1, 1,  0, 0, 0,  -1, -1, -1,
  //   1, 1, 1,  0, 0, 0,  -1, -1, -1
  // );
  // int zKernel[27] = int[27](
  //   1, 0, -1,  1, 0, -1,  1, 0, -1,
  //   1, 0, -1,  1, 0, -1,  1, 0, -1,
  //   1, 0, -1,  1, 0, -1,  1, 0, -1
  // );
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

  return normalize(grad);
}



void main() {
  int w = canvasWidth;
  int h = canvasHeight;
  vec3 p = vec3(0, 0, 0);
  // vec3 world = vec3(0, 0, 0);
  vec3 delta = vec3(0, 0, 0);
  vec3 green = vec3( 76, 175, 80 );
  vec3 blue = vec3( 33, 150, 243 );
  vec3 lightDir = vec3(1, 0, 0 );
  p.x = 2.0 * gl_FragCoord.x / float(w) - 1.0;
  p.y = 2.0 * gl_FragCoord.y / float(h) - 1.0;
  // vec4 worldHomogenous = (vec4(p, 1) * viewMatrixInverse); // transformMat4(world, p);
  vec4 worldHomogenous = (viewMatrixInverse * vec4(p, 1)); // transformMat4(world, p);
  vec3 world = worldHomogenous.xyz / worldHomogenous.w;
  vec3 orig = world;
  delta = normalize(world - eye) * distStep; // vec3.sub(delta, world, eye); vec3.normalize(delta, delta); vec3.scale(delta, delta, distStep);
  vec3 color = vec3( 255, 255, 255 );
  // for (int s = 0; s < samples; s += 1) {
    world = vec3(eye); // vec3.copy(world, eye);
    vec3 c = vec3(255, 255, 255); // const start = Math.random();
    // float start = 0.0;
    // world += start * delta;
    for (float d = 0.0; d < maxDist.0; d += distStep) {
      world += delta;
      float material = getVoxel(world);
      if (material != 0.0) {
        // Material color
        // if (material == 1.0) {
          c = vec3(green);
        // } else if (material == 2.0) {
          // c = vec3(blue);
        // }

        // Normal shading
        vec3 gradient = getGradient(world);
        float shade = (dot(gradient, lightDir) + 1.0) / 2.0;
        c *= shade;

        // c *= material;

        // Fog
        float alpha = (1.0 - d / maxDist.0);
        float fog = 255.0 * (1.0 - alpha);
        c.r = floor(c.r * alpha + fog);
        c.g = floor(c.g * alpha + fog);
        c.b = floor(c.b * alpha + fog);
        break;
      }
      // c = vec3(material * 2, material * 2, material * 2);
    // }
    
    // color.r = (color.r * float(s) + c.r) / (float(s) + 1.0);
    // color.g = (color.g * float(s) + c.g) / (float(s) + 1.0);
    // color.b = (color.b * float(s) + c.b) / (float(s) + 1.0);
  }
  // c = Math.round(c / 20) * 20;
  // ctx.fillRect(minX + x * pixelSize, minY + y * pixelSize, pixelSize, pixelSize);
  fragColor = vec4(c.r / 255.0, c.g / 255.0, c.b / 255.0, 1.0);
  // fragColor = vec4(texture(vox, vec3(p.xy, 3)).rgb / 255.0, 1.0);
  // fragColor = vec4(sx.0/20.0, sy.0/20.0, sz.0/20.0, 1.0);
  // fragColor = vec4(0.0, 0.0, 1.0, 1.0);
  // fragColor = vec4(delta * 2.0, 1.0);
  // fragColor = vec4(eye / 2.0, 1);
}