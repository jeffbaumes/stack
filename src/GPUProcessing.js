import { vec3 } from 'gl-matrix';
import localforage from 'localforage';
import DummyFramebuffer from './gl/DummyFramebuffer';
import Framebuffer from './gl/Framebuffer';
import Texture from './gl/Texture';
import Program from './gl/Program';
import shifterFrag from './shifter.frag';
import simulatorFrag from './simulator.frag';
import rendererFrag from './renderer.frag';

export default class GPUProcessing {
  constructor({
    canvas,
    rendererUniforms,
    simulationUniforms,
    chunkSize,
    worldChunks,
    chunkShiftThreshold,
  }) {
    this.gl = GPUProcessing._initializeGl(canvas);
    this.worldChunks = worldChunks;
    this.chunkSize = chunkSize;
    this.worldSize = [
      this.chunkSize[0] * this.worldChunks,
      this.chunkSize[1],
      this.chunkSize[2] * this.worldChunks,
    ];
    this.chunkShiftThreshold = chunkShiftThreshold;
    const startWorldChunk = -Math.floor(worldChunks / 2);
    this.worldChunkIndex = [startWorldChunk, 0, startWorldChunk];

    this.renderer = new Program({
      gl: this.gl,
      uniforms: {
        ...rendererUniforms,
        u_worldSize: { value: this.worldSize, type: 'ivec3' },
        u_chunkSize: { value: this.chunkSize, type: 'ivec3' },
        u_worldChunkIndex: { value: this.worldChunkIndex, type: 'ivec3' },
        renderVoxelIndex: { value: 0, type: 'int' },
        u_reflection: { value: 1, type: 'int' },
        u_refraction: { value: 1, type: 'int' },
        u_ambientOcclusion: { value: 1, type: 'int' },
        u_directionalLighting: { value: 1, type: 'int' },
        u_showFog: { value: 0, type: 'int' },
        u_waterAttenuationDistance: { value: 100, type: 'float' },
        u_renderDistance: { value: 400, type: 'float' },
      },
      fragmentSource: rendererFrag,
      name: 'renderer',
    });

    this.simulator = new Program({
      gl: this.gl,
      uniforms: {
        ...simulationUniforms,
        u_worldSize: { value: this.worldSize, type: 'ivec3' },
        modify: { value: 0, type: 'int' },
        brushSize: { value: 0, type: 'float' },
        brushMode: { value: 0, type: 'int' },
        u_groundGravity: { value: 1, type: 'int' },
        modifyIndex: { value: [0, 0, 0, 0], type: 'vec4' },
        modifyValue: { value: [0, 0, 0], type: 'vec3' },
      },
      fragmentSource: simulatorFrag,
      name: 'simulator',
    });

    // this.generator = new Program({
    //   gl: this.gl,
    //   uniforms: {
    //     u_chunkIndex: { value: [0, 0, 0], type: 'ivec3' },
    //     u_chunkSize: { value: this.chunkSize, type: 'ivec3' },
    //   },
    //   fragmentSource: generatorFrag,
    //   name: 'generator',
    // });

    this.shifter = new Program({
      gl: this.gl,
      uniforms: {
        u_chunkShift: { value: [0, 0, 0], type: 'ivec3' },
        u_chunkIndex: { value: [0, 0, 0], type: 'ivec3' },
        u_chunkSize: { value: this.chunkSize, type: 'ivec3' },
        u_worldSize: { value: this.worldSize, type: 'ivec3' },
      },
      fragmentSource: shifterFrag,
      name: 'shifter',
    });

    // this.chunkLoader = new Program({
    //   gl: this.gl,
    //   uniforms: {
    //     u_location: { value: [0, 0, 0], type: 'ivec3' },
    //     u_chunkSize: { value: this.chunkSize, type: 'ivec3' },
    //     u_worldSize: { value: this.worldSize, type: 'ivec3' },
    //     u_world: { value: 0, type: 'int' }, // primary texture
    //     u_chunk: { value: 1, type: 'int' }, // secondary texture
    //   },
    //   fragmentSource: chunkLoaderFrag,
    //   name: 'chunkLoader',
    // });

    // this.chunkTexture = new Texture({
    //   gl: this.gl,
    //   size: {
    //     width: this.chunkSize[0],
    //     height: this.chunkSize[1] * this.chunkSize[2],
    //   },
    //   data: new Float32Array(this.chunkSize[0] * this.chunkSize[1] * this.chunkSize[2] * 4),
    // });
    // this.chunkFramebuffer = new Framebuffer({ gl: this.gl, texture: this.chunkTexture });

    const textureConfig = {
      gl: this.gl,
      size: {
        width: this.worldSize[0],
        height: this.worldSize[1] * this.worldSize[2],
      },
      data: new Float32Array(this.worldSize[0] * this.worldSize[1] * this.worldSize[2] * 4),
    };
    this.texture1 = new Texture(textureConfig);
    this.texture2 = new Texture(textureConfig);
    const voxelIndexBuffer = new Float32Array([0, 0, 0, 0]);
    this.voxelIndexTexture = new Texture({
      gl: this.gl,
      size: { width: 1, height: 1 },
      data: voxelIndexBuffer,
    });
    this.framebuffer1 = new Framebuffer({ gl: this.gl, texture: this.texture1 });
    this.framebuffer2 = new Framebuffer({ gl: this.gl, texture: this.texture2 });
    this.voxelIndexFramebuffer = new Framebuffer({
      gl: this.gl,
      texture: this.voxelIndexTexture,
    });
    this.dummyFramebuffer = new DummyFramebuffer({
      size: { width: canvas.width, height: canvas.height },
    });
    this.screenFramebuffer = this.dummyFramebuffer;
    this._assignTexturesAndFramebuffers();
    this.timestep = 0;
    this.simulationsPerFrame = 1;
  }

  async initializeWorld() {
    this.worldChunkIndex[0] -= this.worldChunks;
    this.worldChunkIndex[2] -= this.worldChunks;
    await this._shiftWorldChunkPosition(0, this.worldChunks, false);
    await this._shiftWorldChunkPosition(2, this.worldChunks, false);
  }

  static _initializeGl(canvas) {
    const gl = canvas.getContext('webgl2');
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      throw new Error('Requires EXT_color_buffer_float');
    }
    return gl;
  }

  _assignTexturesAndFramebuffers() {
    // this.generator.setFramebuffer(this.chunkFramebuffer);
    // this.chunkLoader.setTexture(this.texture1);
    // this.chunkLoader.setSecondaryTexture(this.chunkTexture);
    // this.chunkLoader.setFramebuffer(this.framebuffer2);
    this.shifter.setTexture(this.texture1);
    this.shifter.setFramebuffer(this.framebuffer2);
    this.simulator.setTexture(this.texture1);
    this.simulator.setFramebuffer(this.framebuffer2);
    this.renderer.setTexture(this.texture1);
    this.renderer.setFramebuffer(this.screenFramebuffer);
  }

  _swapTexturesAndFramebuffers() {
    [this.texture1, this.texture2] = [this.texture2, this.texture1];
    [this.framebuffer1, this.framebuffer2] = [this.framebuffer2, this.framebuffer1];
    this._assignTexturesAndFramebuffers();
  }

  // _generateWorld() {
  //   this.renderer.updateUniforms({ u_worldChunkIndex: this.worldChunkIndex });
  //   for (let x = 0; x < this.worldChunks; x += 1) {
  //     for (let z = 0; z < this.worldChunks; z += 1) {
  //       const chunkIndex = [
  //         this.worldChunkIndex[0] + x,
  //         this.worldChunkIndex[1],
  //         this.worldChunkIndex[2] + z,
  //       ];
  //       this.generator.updateUniforms({ u_chunkIndex: chunkIndex });
  //       this.generator.render();
  //       this.chunkLoader.updateUniforms({ u_location: [x, 0, z] });
  //       this.chunkLoader.render();
  //       this._swapTexturesAndFramebuffers();
  //     }
  //   }
  // }

  worldPositionToWorldChunkPosition(pos) {
    const chunkOffset = [0, 0, 0];
    vec3.mul(chunkOffset, this.worldChunkIndex, this.chunkSize);
    const chunkPos = [0, 0, 0];
    vec3.sub(chunkPos, pos, chunkOffset);
    return chunkPos;
  }

  async _saveChunk(worldBuffer, chunkX, chunkZ) {
    const { chunkSize, worldSize } = this;
    const chunkBuffer = new Float32Array(
      chunkSize[0] * chunkSize[1] * chunkSize[2] * 4,
    );
    for (let cx = 0; cx < chunkSize[0]; cx += 1) {
      for (let cz = 0; cz < chunkSize[2]; cz += 1) {
        for (let cy = 0; cy < chunkSize[1]; cy += 1) {
          const wx = cx + chunkX * chunkSize[0];
          const wy = cy;
          const wz = cz + chunkZ * chunkSize[2];
          const chunkIndex = 4 * (cz * chunkSize[0] * chunkSize[1] + cy * chunkSize[0] + cx);
          const worldIndex = 4 * (wz * worldSize[0] * worldSize[1] + wy * worldSize[0] + wx);
          chunkBuffer[chunkIndex + 0] = worldBuffer[worldIndex + 0];
          chunkBuffer[chunkIndex + 1] = worldBuffer[worldIndex + 1];
          chunkBuffer[chunkIndex + 2] = worldBuffer[worldIndex + 2];
          chunkBuffer[chunkIndex + 3] = worldBuffer[worldIndex + 3];
        }
      }
    }
    const chunk = [
      this.worldChunkIndex[0] + chunkX,
      this.worldChunkIndex[2] + chunkZ,
    ];
    await localforage.setItem(`${chunk[0]}#${chunk[1]}`, chunkBuffer);
  }

  async _loadChunk(worldBuffer, chunkX, chunkZ) {
    const { chunkSize, worldSize, worldChunkIndex } = this;
    const chunk = [
      worldChunkIndex[0] + chunkX,
      worldChunkIndex[2] + chunkZ,
    ];
    const chunkBuffer = await localforage.getItem(`${chunk[0]}#${chunk[1]}`);
    if (!chunkBuffer) {
      return;
    }
    for (let cx = 0; cx < chunkSize[0]; cx += 1) {
      for (let cz = 0; cz < chunkSize[2]; cz += 1) {
        for (let cy = 0; cy < chunkSize[1]; cy += 1) {
          const wx = cx + chunkX * chunkSize[0];
          const wy = cy;
          const wz = cz + chunkZ * chunkSize[2];
          // const chunkIndex = 4 * (cx * chunkSize[1] * chunkSize[2] + cz * chunkSize[1] + cy);
          // const worldIndex = 4 * (wx * worldSize[1] * worldSize[2] + wz * worldSize[1] + cy);
          const chunkIndex = 4 * (cz * chunkSize[0] * chunkSize[1] + cy * chunkSize[0] + cx);
          const worldIndex = 4 * (wz * worldSize[0] * worldSize[1] + wy * worldSize[0] + wx);
          worldBuffer[worldIndex + 0] = chunkBuffer[chunkIndex + 0];
          worldBuffer[worldIndex + 1] = chunkBuffer[chunkIndex + 1];
          worldBuffer[worldIndex + 2] = chunkBuffer[chunkIndex + 2];
          worldBuffer[worldIndex + 3] = chunkBuffer[chunkIndex + 3];
        }
      }
    }
  }

  async _shiftWorldChunkPosition(dimension, amount, save) {
    if (amount === 0) {
      return;
    }

    // Get the world
    let worldBuffer = this.framebuffer2.retrieve();

    // Save all chunks moving off world
    if (save) {
      let startChunkX = 0;
      let endChunkX = this.worldChunks;
      let startChunkZ = 0;
      let endChunkZ = this.worldChunks;
      if (dimension === 0) {
        startChunkX = amount > 0 ? 0 : this.worldChunks + amount;
        endChunkX = startChunkX + Math.abs(amount);
      } else {
        startChunkZ = amount > 0 ? 0 : this.worldChunks + amount;
        endChunkZ = startChunkZ + Math.abs(amount);
      }
      const promises = [];
      for (let chunkX = startChunkX; chunkX < endChunkX; chunkX += 1) {
        for (let chunkZ = startChunkZ; chunkZ < endChunkZ; chunkZ += 1) {
          promises.push(this._saveChunk(worldBuffer, chunkX, chunkZ));
        }
      }
      await Promise.all(promises);
    }

    // Shift world
    if (dimension === 0) {
      this.worldChunkIndex[0] += amount;
    } else {
      this.worldChunkIndex[2] += amount;
    }
    this.renderer.updateUniforms({ u_worldChunkIndex: this.worldChunkIndex });
    this.shifter.updateUniforms({
      u_chunkShift: [dimension === 0 ? amount : 0, 0, dimension === 2 ? amount : 0],
      u_chunkIndex: this.worldChunkIndex,
    });
    this.shifter.render();
    worldBuffer = this.framebuffer2.retrieve();
    this._swapTexturesAndFramebuffers();

    // Load all chunks moving onto world
    amount = -amount;
    let startChunkX = 0;
    let endChunkX = this.worldChunks;
    let startChunkZ = 0;
    let endChunkZ = this.worldChunks;
    if (dimension === 0) {
      startChunkX = amount > 0 ? 0 : this.worldChunks + amount;
      endChunkX = startChunkX + Math.abs(amount);
    } else {
      startChunkZ = amount > 0 ? 0 : this.worldChunks + amount;
      endChunkZ = startChunkZ + Math.abs(amount);
    }
    const promises = [];
    for (let chunkX = startChunkX; chunkX < endChunkX; chunkX += 1) {
      for (let chunkZ = startChunkZ; chunkZ < endChunkZ; chunkZ += 1) {
        promises.push(this._loadChunk(worldBuffer, chunkX, chunkZ));
      }
    }
    await Promise.all(promises);

    // Set the world
    this.texture1.set(worldBuffer);
  }

  async updateWorldChunkPosition(eye) {
    const chunkEye = this.worldPositionToWorldChunkPosition(eye);
    const chunkPlace = [0, 0, 0];
    vec3.div(chunkPlace, chunkEye, this.chunkSize);
    const maxThreshold = this.chunkShiftThreshold;
    const minThreshold = this.worldChunks - maxThreshold;
    document.getElementById('message').innerText = eye.map(Math.floor);
    // const shiftAmount = Math.floor(this.worldChunks / 2);
    const shiftAmount = 1;
    if (chunkPlace[0] < minThreshold) {
      await this._shiftWorldChunkPosition(0, -shiftAmount, true);
    } else if (chunkPlace[0] > maxThreshold) {
      await this._shiftWorldChunkPosition(0, shiftAmount, true);
    } else if (chunkPlace[2] < minThreshold) {
      await this._shiftWorldChunkPosition(2, -shiftAmount, true);
    } else if (chunkPlace[2] > maxThreshold) {
      await this._shiftWorldChunkPosition(2, shiftAmount, true);
    }
  }

  render() {
    for (let i = 0; i < this.simulationsPerFrame; i += 1) {
      if (this.modifyOnce) {
        this.simulator.updateUniforms({ modify: true });
      }
      this.simulator.updateUniforms({ timestep: this.timestep });
      this.simulator.render();
      if (this.modifyOnce) {
        this.simulator.updateUniforms({ modify: false });
        this.modifyOnce = false;
      }
      this.timestep += 1;
      this._swapTexturesAndFramebuffers();
    }

    this.renderer.updateUniforms({ renderVoxelIndex: 1 });
    this.screenFramebuffer = this.voxelIndexFramebuffer;
    this._assignTexturesAndFramebuffers();
    this.renderer.render();
    const voxelIndex = this.voxelIndexFramebuffer.retrieve();
    this.simulator.updateUniforms({ modifyIndex: voxelIndex });

    this.renderer.updateUniforms({ renderVoxelIndex: 0 });
    this.screenFramebuffer = this.dummyFramebuffer;
    this._assignTexturesAndFramebuffers();
    this.renderer.render();
  }
}
