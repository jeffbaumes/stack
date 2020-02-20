import { glMatrix, mat4, vec3 } from 'gl-matrix';
import SimplexNoise from 'simplex-noise';
import Mousetrap from 'mousetrap';

glMatrix.setMatrixArrayType(Array);

const keys = {};
function listenForKey(key) {
  keys[ key ] = false;
  Mousetrap.bind(key, () => keys[ key ] = true, 'keydown');
  Mousetrap.bind(key, () => keys[ key ] = false, 'keyup');
}
[ 'left', 'right', 'space', 'w', 'a', 's', 'd' ].forEach(listenForKey);

let mouseX = null;
let mouseY = null;
function handler(e) {
  mouseX = e.pageX;
  mouseY = e.pageY;
}
document.onmousemove = handler;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

window.addEventListener('resize', resizeCanvas, false);
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

const m = mat4.create();
const minv = mat4.create();
const frustum = mat4.create();

const min = [ -100, -100, -100 ];
const sx = 200;
const sy = 200;
const sz = 200;
const vox = new Uint8Array(sx * sy * sz);

function getMaterial(p) {
  const detectSize = 0.1;
  let m = 0;
  m += getVoxel([ p[ 0 ] - detectSize, p[ 1 ], p[ 2 ] ]);
  m += getVoxel([ p[ 0 ] + detectSize, p[ 1 ], p[ 2 ] ]);
  m += getVoxel([ p[ 0 ], p[ 1 ] - detectSize, p[ 2 ] ]);
  m += getVoxel([ p[ 0 ], p[ 1 ] + detectSize, p[ 2 ] ]);
  m += getVoxel([ p[ 0 ], p[ 1 ], p[ 2 ] - detectSize ]);
  m += getVoxel([ p[ 0 ], p[ 1 ], p[ 2 ] + detectSize ]);
  if (m >= 2) {
    return 1;
  }
  return 0;
}

// added to JS and GL
function getVoxel(p) {
  const xi = Math.floor(p[ 0 ] - min[ 0 ]);
  const yi = Math.floor(p[ 1 ] - min[ 1 ]);
  const zi = Math.floor(p[ 2 ] - min[ 2 ]);
  if (xi < 0 || xi >= sx || yi < 0 || yi >= sy || zi < 0 || zi >= sz) {
    return 0;
  }
  return vox[ xi * sy * sz + yi * sz + zi ];
}

// function getVoxel(p) {
//   // const xi = Math.floor(p[0] - min[0]);
//   // const yi = Math.floor(p[1] - min[1]);
//   // const zi = Math.floor(p[2] - min[2]);
//   // return simplex.noise4D(p[0] / 50, p[1] / 50, p[2] / 50, t / 10000) < 0.35 ? 0 : 1;
//   return simplex.noise3D(p[0] / 50, p[1] / 50, p[2] / 50) < 0.35 ? 0 : (simplex.noise3D(p[0] / 100, p[1] / 100, p[2] / 100) < 0.5 ? 1 : 2);
// }

// added to JS
function setVoxel(p, val) {
  const xi = p[ 0 ] - min[ 0 ];
  const yi = p[ 1 ] - min[ 1 ];
  const zi = p[ 2 ] - min[ 2 ];
  vox[ xi * sy * sz + yi * sz + zi ] = val;
}



let region = [
  [ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ] ],
  [ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ] ],
  [ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ] ],
];
let xKernel = [
  [ [ 1, 1, 1 ], [ 1, 1, 1 ], [ 1, 1, 1 ] ],
  [ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ] ],
  [ [ -1, -1, -1 ], [ -1, -1, -1 ], [ -1, -1, -1 ] ],
];
let yKernel = [
  [ [ 1, 1, 1 ], [ 0, 0, 0 ], [ -1, -1, -1 ] ],
  [ [ 1, 1, 1 ], [ 0, 0, 0 ], [ -1, -1, -1 ] ],
  [ [ 1, 1, 1 ], [ 0, 0, 0 ], [ -1, -1, -1 ] ],
];
let zKernel = [
  [ [ 1, 0, -1 ], [ 1, 0, -1 ], [ 1, 0, -1 ] ],
  [ [ 1, 0, -1 ], [ 1, 0, -1 ], [ 1, 0, -1 ] ],
  [ [ 1, 0, -1 ], [ 1, 0, -1 ], [ 1, 0, -1 ] ],
];

// added to JS and GL
function getGradient(p) {
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) {
        region[ x + 1 ][ y + 1 ][ z + 1 ] = getVoxel([ p[ 0 ] + x, p[ 1 ] + y, p[ 2 ] + z ]) > 0 ? 1 : 0;
      }
    }
  }

  const grad = [ 0, 0, 0 ];
  for (let x = 0; x < 3; x += 1) {
    for (let y = 0; y < 3; y += 1) {
      for (let z = 0; z < 3; z += 1) {
        grad[ 0 ] += region[ x ][ y ][ z ] * xKernel[ x ][ y ][ z ];
        grad[ 1 ] += region[ x ][ y ][ z ] * yKernel[ x ][ y ][ z ];
        grad[ 2 ] += region[ x ][ y ][ z ] * zKernel[ x ][ y ][ z ];
      }
    }
  }
  vec3.normalize(grad, grad);
  return grad;
}

var simplex = new SimplexNoise();

for (let xi = 0; xi < sx; xi += 1) {
  for (let yi = 0; yi < sy; yi += 1) {
    for (let zi = 0; zi < sz; zi += 1) {
      setVoxel([ min[ 0 ] + xi, min[ 1 ] + yi, min[ 2 ] + zi ], simplex.noise3D(xi / 50, yi / 50, zi / 50) < 0.5 ? 0 : 1);
      // if (Math.abs(min[0] + xi) > 2 || Math.abs(min[1] + yi) > 2) {
      //   setVoxel([min[0] + xi, min[1] + yi, min[2] + zi], Math.random() < 0.1 ? 1 : 0);
      // }
    }
  }
}

// setVoxel([1, 0, -3], 1);
// setVoxel([1, 1, -5], 1);
// setVoxel([1, 2, -5], 1);
// setVoxel([2, 2, -5], 1);
// setVoxel([0, 2, -5], 1);
// setVoxel([1, 2, -4], 1);
// setVoxel([0, 0, -5], 1);
// console.log(getVoxel([0, 0, -3]));
let startTime = null;
let lastTime = null;
const movement = [ 0, 0, 0 ];
const forward = [ 0, 0, -1 ];
const right = [ 1, 0, 0 ];
const up = [ 0, 1, 0 ];
const eye = [ 0, 0, 0 ];
const look = [ 0, 0, 0 ];
const playerSpeed = 20;
const turnSpeed = 2;

function renderPass({ distStep, maxDist, pixelSize, subregion, samples }) {
  const w = canvas.width * subregion / pixelSize;
  const h = canvas.height * subregion / pixelSize;
  const p = vec3.create();
  const world = vec3.create();
  const delta = vec3.create();
  const minX = canvas.width * (1 - subregion) / 2;
  const minY = canvas.height * (1 - subregion) / 2;
  const green = [ 76, 175, 80 ];
  const blue = [ 33, 150, 243 ];
  const lightDir = [ 1, 0, 0 ];
  for (let x = 0; x < w; x += 1) {
    for (let y = 0; y < h; y += 1) {
      p[ 0 ] = subregion * (x - w / 2) / (w / 2);
      p[ 1 ] = subregion * (y - h / 2) / (h / 2);
      vec3.transformMat4(world, p, minv);
      vec3.sub(delta, world, eye);
      vec3.normalize(delta, delta);
      vec3.scale(delta, delta, distStep);
      let color = [ 255, 255, 255 ];
      for (let s = 0; s < samples; s += 1) {
        vec3.copy(world, eye);
        let c = [ 255, 255, 255 ];
        // const start = Math.random();
        const start = 0;
        world[ 0 ] += start * delta[ 0 ];
        world[ 1 ] += start * delta[ 1 ];
        world[ 2 ] += start * delta[ 2 ];
        for (let d = start * distStep; d < maxDist; d += distStep) {
          world[ 0 ] += delta[ 0 ];
          world[ 1 ] += delta[ 1 ];
          world[ 2 ] += delta[ 2 ];
          const material = getVoxel(world);
          if (material) {
            // Material color
            if (material === 1) {
              c[ 0 ] = green[ 0 ];
              c[ 1 ] = green[ 1 ];
              c[ 2 ] = green[ 2 ];
            } else if (material === 2) {
              c[ 0 ] = blue[ 0 ];
              c[ 1 ] = blue[ 1 ];
              c[ 2 ] = blue[ 2 ];
            }

            // Normal shading
            const gradient = getGradient(world);
            const shade = (vec3.dot(gradient, lightDir) + 1) / 2;
            c[ 0 ] *= shade;
            c[ 1 ] *= shade;
            c[ 2 ] *= shade;

            // Fog
            const alpha = (1 - d / maxDist);
            const fog = 255 * (1 - alpha);
            c[ 0 ] = Math.floor(c[ 0 ] * alpha + fog);
            c[ 1 ] = Math.floor(c[ 1 ] * alpha + fog);
            c[ 2 ] = Math.floor(c[ 2 ] * alpha + fog);
            break;
          }
        }
        color[ 0 ] = (color[ 0 ] * s + c[ 0 ]) / (s + 1);
        color[ 1 ] = (color[ 1 ] * s + c[ 1 ]) / (s + 1);
        color[ 2 ] = (color[ 2 ] * s + c[ 2 ]) / (s + 1);
      }
      // c = Math.round(c / 20) * 20;
      ctx.fillStyle = `rgb(${color[ 0 ]},${color[ 1 ]},${color[ 2 ]})`;
      ctx.fillRect(minX + x * pixelSize, minY + y * pixelSize, pixelSize, pixelSize);
    }
  }
}

function step(timestamp) {
  if (!startTime) {
    startTime = timestamp;
    lastTime = timestamp;
  }
  let dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // update position
  vec3.zero(movement);
  if (keys.w) {
    vec3.scale(movement, forward, dt * playerSpeed);
  } else if (keys.s) {
    vec3.scale(movement, forward, -dt * playerSpeed);
  } else if (keys.d) {
    vec3.scale(movement, right, dt * playerSpeed);
  } else if (keys.a) {
    vec3.scale(movement, right, -dt * playerSpeed);
  }
  vec3.add(eye, eye, movement);
  // console.log(eye);

  if (keys.left) {
    vec3.rotateY(forward, forward, [ 0, 0, 0 ], dt * turnSpeed);
    vec3.cross(right, forward, up);
  } else if (keys.right) {
    vec3.rotateY(forward, forward, [ 0, 0, 0 ], -dt * turnSpeed);
    vec3.cross(right, forward, up);
  }

  // for (let xi = 0; xi < sx; xi += 1) {
  //   for (let yi = 0; yi < sy; yi += 1) {
  //     for (let zi = 0; zi < sz; zi += 1) {
  //       if (Math.random() < 0.001 && (Math.abs(min[0] + xi) > 2 || Math.abs(min[1] + yi) > 2)) {
  //         setVoxel([min[0] + xi, min[1] + yi, min[2] + zi], Math.random() < 0.2 ? 1 : 0);
  //       }
  //     }
  //   }
  // }
  vec3.add(look, eye, forward);
  mat4.lookAt(m, eye, look, up);
  const aspect = canvas.height / canvas.width;
  mat4.frustum(frustum, -1, 1, -aspect, aspect, 2, 10);
  mat4.mul(m, frustum, m);
  mat4.invert(minv, m);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  renderPass({ maxDist: 100, pixelSize: 16, samples: 1, subregion: 1 });
  // renderPass({ distStep: 0.15, maxDist: 200, pixelSize: 4, subregion: 0.5 });
  // renderPass({ distStep: 0.10, maxDist: 200, pixelSize: 2, subregion: 0.25 });
  // renderPass({ distStep: 0.05, maxDist: 200, pixelSize: 1, subregion: 0.1 });
  window.requestAnimationFrame(step);
}
window.requestAnimationFrame(step);
