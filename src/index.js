import Engine from './Engine';
import { init } from 'glmw';

init().then(() => {
    const worldSize = [ 700, 700, 700 ];

    // let vox = new Int32Array(1024 * 4);
    // for (let x = 0; x < 1000; x += 1) {
    //     vox[ 4 * x + 0 ] = 255;
    //     vox[ 4 * x + 1 ] = 0;
    //     vox[ 4 * x + 2 ] = 0;
    //     vox[ 4 * x + 3 ] = 0;
    // }

    let vox = new Uint8Array(worldSize[ 0 ] * worldSize[ 1 ] * worldSize[ 2 ] * 4);
    for (let x = 0; x < vox.length; x += 1) {
        vox[ x ] = (Math.random() > 0.5 ? 1 : 0);
    }

    console.log('Array created')

    const engine = new Engine({
        vox,
        worldSize,
        min: [ -5, -5, -5 ],
        samples: 1,
        maxDist: 40,
        distStep: 0.25,
    })

    engine.load();

    requestAnimationFrame(engine.boundRenderLoop);
})