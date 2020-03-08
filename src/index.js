import Engine from './Engine';
import { turbulence2D } from './noise';

const worldSize = [ 256, 64, 256 ];

let vox = new Float32Array(worldSize[ 0 ] * worldSize[ 1 ] * worldSize[ 2 ] * 4);
for (let x = 0; x < worldSize[ 0 ]; x += 1) {
  for (let y = 0; y < worldSize[ 1 ]; y += 1) {
    for (let z = 0; z < worldSize[ 2 ]; z += 1) {
      // vox[(z * worldSize[0] * worldSize[1] + y * worldSize[0] + x) * 3] = worldMaterial(x, y, z);

      const val = turbulence2D(x / 100, z / 100);

      // vox[(z * worldSize[0] * worldSize[1] + y * worldSize[0] + x) * 3] = y / worldSize[1] > val ? (y > worldSize[1] / 2 ? 0 : 2) : 1;
      const index = (z * worldSize[ 0 ] * worldSize[ 1 ] + y * worldSize[ 0 ] + x) * 4;
      vox[ index ] = y / worldSize[ 1 ] > val ? (y > worldSize[ 1 ] / 2 && x < worldSize[ 0 ] / 2 ? 0 : 2) : 1;
      // vox[index] = (y + x / 10) / worldSize[1] > val ? (y > worldSize[1] - 4 ? 2 : 0) : 1;
      // vox[index] = x < worldSize[0] / 2 ? 2 : (x === worldSize[0] / 2 ? 1 : (y / worldSize[1] > val ? 0 : 1));
      // vox[index] = y / worldSize[1] > 0.5 ? 0 : 1;
      if (vox[ index ] === 2) {
        vox[ index + 1 ] = 255;
      }
      // vox[(z * worldSize[0] * worldSize[1] + y * worldSize[0] + x) * 3] = y / worldSize[1] > val ? (y > worldSize[1] / 2 && x < worldSize[0] / 2 ? 0 : 0) : 1;
    }
  }
}

const engine = new Engine({
  vox,
  worldSize,
  samples: 1,
  maxDist: 200,
  distStep: 0.25,
})

engine.load();

requestAnimationFrame(engine.boundRenderLoop);

