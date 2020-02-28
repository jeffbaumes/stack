import { init } from 'glmw';

import Engine from './Engine';
import { turbulence2D } from './noise';

// for (let xi = 0; xi < sx; xi += 1) {
//   for (let yi = 0; yi < sy; yi += 1) {
//     for (let zi = 0; zi < sz; zi += 1) {
//       if (Math.random() < 0.001 && (Math.abs(min[0] + xi) > 2 || Math.abs(min[1] + yi) > 2)) {
//         setVoxel([min[0] + xi, min[1] + yi, min[2] + zi], Math.random() < 0.2 ? 1 : 0);
//       }
//     }
//   }
// }

init().then(() => {
    const worldSize = [256, 32, 256 ];

    function worldMaterial(x, y, z) {
        return y < 16 ? 1 : 0;
    }

    let vox = new Uint8Array(worldSize[ 0 ] * worldSize[ 1 ] * worldSize[ 2 ] * 3);
    for (let x = 0; x < worldSize[0]; x += 1) {
        for (let y = 0; y < worldSize[1]; y += 1) {
            for (let z = 0; z < worldSize[2]; z += 1) {
                // vox[(z * worldSize[0] * worldSize[1] + y * worldSize[0] + x) * 3] = worldMaterial(x, y, z);
                // console.log(planetNoise({ coords: [x, 0, z] })[0]);

                const val = turbulence2D(x / 100, z / 100);
                // console.log(val);
                vox[(z * worldSize[0] * worldSize[1] + y * worldSize[0] + x) * 3] = y / worldSize[1] > val ? (y > worldSize[1] / 2 ? 0 : 2) : 1;
            }
        }
    }
    // for (let x = 0; x < vox.length / 3; x += 1) {
    //     vox[ x * 3 ] = (x % 1 === 0 ? 1 : 0);
    // }

    console.log('Array created')

    const engine = new Engine({
        vox,
        worldSize,
        min: [ -5, -5, -5 ],
        samples: 1,
        maxDist: 200,
        distStep: 0.25,
    })

    engine.load();

    requestAnimationFrame(engine.boundRenderLoop);
})
