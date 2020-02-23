import Engine from './Engine';
import { init } from 'glmw';

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
    const worldSize = [ 32, 32, 32 ];

    let vox = new Uint8Array(worldSize[ 0 ] * worldSize[ 1 ] * worldSize[ 2 ] * 3);
    for (let x = 0; x < vox.length / 3; x += 1) {
        vox[ x * 3 ] = (x % 1 === 0 ? 1 : 0);
    }

    console.log('Array created')

    const engine = new Engine({
        vox,
        worldSize,
        min: [ -5, -5, -5 ],
        samples: 1,
        maxDist: 100,
        distStep: 0.25,
    })

    engine.load();

    requestAnimationFrame(engine.boundRenderLoop);
})
