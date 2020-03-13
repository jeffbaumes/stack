import DummyFramebuffer from './gl/DummyFramebuffer';
import Framebuffer from './gl/Framebuffer';
import Texture from './gl/Texture';
import Program from './gl/Program';
import generatorFrag from './generator.frag';
import simulatorFrag from './simulator.frag';
import rendererFrag from './renderer.frag';


export default class GPUProcessing {
  constructor({
    canvas,
    rendererUniforms,
    simulationUniforms,
    voxels = [],
    voxelsSize = { x: 0, y: 0, z: 0 },
  }) {
    this.gl = GPUProcessing._initializeGl(canvas);

    const voxelsSizeUniforms = {
      u_worldSize: {
        value: [voxelsSize.x, voxelsSize.y, voxelsSize.z],
        type: 'ivec3',
      },
    };

    this.renderer = new Program({
      gl: this.gl,
      uniforms: {
        ...rendererUniforms,
        ...voxelsSizeUniforms,
        renderVoxelIndex: { value: 0, type: 'int' },
        u_reflection: { value: 1, type: 'int' },
        u_refraction: { value: 1, type: 'int' },
        u_ambientOcclusion: { value: 1, type: 'int' },
        u_directionalLighting: { value: 1, type: 'int' },
        u_showFog: { value: 0, type: 'int' },
        u_waterAttenuationDistance: { value: 100, type: 'float' },
        u_renderDistance: { value: 200, type: 'float' },
      },
      fragmentSource: rendererFrag,
      name: 'renderer',
    });

    this.simulator = new Program({
      gl: this.gl,
      uniforms: {
        ...simulationUniforms,
        ...voxelsSizeUniforms,
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

    this.generator = new Program({
      gl: this.gl,
      uniforms: {
        u_chunkIndex: { value: [0, 0, 0], type: 'ivec3' },
        u_chunkSize: { value: [voxelsSize.x, voxelsSize.y, voxelsSize.z], type: 'ivec3' },
      },
      fragmentSource: generatorFrag,
      name: 'generator',
    });

    const textureConfig = {
      gl: this.gl,
      size: { width: voxelsSize.x, height: voxelsSize.y * voxelsSize.z },
      data: voxels,
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
    this.voxelIndexFramebuffer = new Framebuffer({ gl: this.gl, texture: this.voxelIndexTexture });
    this.dummyFramebuffer = new DummyFramebuffer({
      size: { width: canvas.width, height: canvas.height },
    });
    this.screenFramebuffer = this.dummyFramebuffer;
    this._assignTexturesAndFramebuffers();
    this.timestep = 0;
    this.simulationsPerFrame = 1;
    this._generateWorld();
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
    this.generator.setFramebuffer(this.framebuffer1);
    this.simulator.setTexture(this.texture1);
    this.simulator.setFramebuffer(this.framebuffer2);
    this.renderer.setTexture(this.texture2);
    this.renderer.setFramebuffer(this.screenFramebuffer);
  }

  _swapTexturesAndFramebuffers() {
    [this.texture1, this.texture2] = [this.texture2, this.texture1];
    [this.framebuffer1, this.framebuffer2] = [this.framebuffer2, this.framebuffer1];
    this._assignTexturesAndFramebuffers();
  }

  _generateWorld() {
    this.generator.render();
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
