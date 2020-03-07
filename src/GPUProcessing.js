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
    voxelsSize = {x: 0, y: 0, z: 0},
  }) {
    this.gl = this._initializeGl(canvas);

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
      }
    };

    this.renderer = new Program({
      gl: this.gl,
      uniforms: {
        ...rendererUniforms,
        ...voxelsSizeUniforms,
      },
      fragmentSource: rendererFrag,
      name: 'renderer',
    });

    this.simulator = new Program({
      gl: this.gl,
      uniforms: {
        ...simulationUniforms,
        ...voxelsSizeUniforms,
      },
      fragmentSource: simulatorFrag,
      name: 'simulator',
    });

    let textureConfig = {gl: this.gl, size: {width: voxelsSize.x, height: voxelsSize.y * voxelsSize.z}, data: voxels};

    this.texture1 = new Texture(textureConfig);
    this.texture2 = new Texture(textureConfig);
    this.framebuffer1 = new Framebuffer({gl: this.gl, texture: this.texture1});
    this.framebuffer2 = new Framebuffer({gl: this.gl, texture: this.texture2});
    this.screenFramebuffer = new DummyFramebuffer({size: {width: canvas.width, height: canvas.height}});
    this._assignTexturesAndFramebuffers();
    this.timestep = 0;
  }

  _initializeGl(canvas) {
    const gl = canvas.getContext('webgl2');
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      throw new Error('Requires EXT_color_buffer_float');
    }
    return gl;
  }

  load() {

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
    this.renderer.render();
    this._swapTexturesAndFramebuffers();
  }
}
