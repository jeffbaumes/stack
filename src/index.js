import Engine from './Engine';

async function init() {
  window.engine = new Engine({
    chunkSize: [32, 64, 32],
    worldChunks: 8,
    chunkShiftThreshold: 6,
  });
  await window.engine.processing.initializeWorld();
  requestAnimationFrame(window.engine.boundRenderLoop);
}

init();
