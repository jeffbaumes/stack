import DummyFramebuffer from './gl/DummyFramebuffer';
import Framebuffer from './gl/Framebuffer';
import Texture from './gl/Texture';
import Program from './gl/Program';
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
      sx: {
        value: voxelsSize.x,
        type: 'int',
      },
      sy: {
        value: voxelsSize.y,
        type: 'int',
      },
      sz: {
        value: voxelsSize.z,
        type: 'int',
      },
    };

    this.renderer = new Program({
      gl: this.gl,
      uniforms: {
        ...rendererUniforms,
        ...voxelsSizeUniforms,
        renderVoxelIndex: { value: 0, type: 'int' },
      },
      fragmentSource: rendererFrag,
      name: 'renderer',
    });

    this.simulator = new Program({
      gl: this.gl,
      uniforms: {
        ...simulationUniforms,
        ...voxelsSizeUniforms,
        modify: { value: 1, type: 'int' },
        brushSize: { value: 1, type: 'float' },
        brushMode: { value: 0, type: 'int' },
        modifyIndex: { value: [0, 0, 0, 0], type: 'vec4' },
        modifyValue: { value: [0, 0, 0], type: 'vec3' },
      },
      fragmentSource: simulatorFrag,
      name: 'simulator',
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

  render() {
    for (let i = 0; i < 5; i += 1) {
      this.simulator.updateUniforms({ timestep: this.timestep });
      this.simulator.render();
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

    this._swapTexturesAndFramebuffers();
  }
}
