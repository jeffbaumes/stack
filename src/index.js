import localforage from 'localforage';
import Engine from './Engine';

const worldSize = [256, 64, 256];

const vox = new Float32Array(worldSize[0] * worldSize[1] * worldSize[2] * 4);

async function loadVoxels() {
  const voxels = await localforage.getItem('vox');
  return voxels;
}

loadVoxels().then((voxels) => {
  window.engine = new Engine({
    vox: voxels || vox,
    worldSize,
  });
  requestAnimationFrame(window.engine.boundRenderLoop);
});

window.save = async () => {
  await localforage.setItem('vox', window.engine.getVox());
};
