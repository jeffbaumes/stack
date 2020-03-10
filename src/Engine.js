import { glMatrix, mat4, vec3 } from 'gl-matrix';
import Mousetrap from 'mousetrap';
import GameUI from './GameUI';
import GPUProcessing from './GPUProcessing';

glMatrix.setMatrixArrayType(Array);

export default class Engine {
  constructor({ vox, worldSize }) {
    function resizeCanvas() {
      this.canvas.width = window.innerWidth / 2;
      this.canvas.height = window.innerHeight / 2;
    }
    this.canvas = document.getElementById('canvas');
    window.addEventListener('resize', resizeCanvas, false);
    resizeCanvas.bind(this)();
    this.setUpVariables();

    this.processing = new GPUProcessing({
      canvas: this.canvas,
      rendererUniforms: {
        canvasWidth: {
          value: this.canvas.width,
          type: 'int',
        },
        canvasHeight: {
          value: this.canvas.height,
          type: 'int',
        },
        viewMatrixInverse: {
          value: this.viewMatrixInverse,
          type: 'mat4',
        },
        eye: {
          value: this.eye,
          type: 'vec3',
        },
        timestamp: {
          value: 0,
          type: 'int',
        },
      },
      simulationUniforms: {
        timestep: {
          value: 0,
          type: 'int',
        },
      },
      voxels: vox,
      voxelsSize: { x: worldSize[0], y: worldSize[1], z: worldSize[2] },
    });

    this.ui = new GameUI(this);

    this.vox = vox;
    this.worldSize = worldSize;
    this.setUpMousetrap();
    this.setUpMouseEvents();
  }

  setUpMousetrap() {
    this.keys = {};
    function listenForKey(key) {
      this.keys[key] = false;
      Mousetrap.bind(key, () => { this.keys[key] = true; }, 'keydown');
      Mousetrap.bind(key, () => { this.keys[key] = false; }, 'keyup');
      Mousetrap.bind(`shift+${key}`, () => { this.keys[key] = true; }, 'keydown');
      Mousetrap.bind(`shift+${key}`, () => { this.keys[key] = false; }, 'keyup');
    }
    ['space', 'shift', 'w', 'a', 's', 'd', 'b', 'v'].forEach(listenForKey.bind(this));
    Mousetrap.bind('1', () => { this.buildBlock = 1; });
    Mousetrap.bind('shift+1', () => { this.buildBlock = 1; });
    Mousetrap.bind('2', () => { this.buildBlock = 2; });
    Mousetrap.bind('shift+2', () => { this.buildBlock = 2; });
  }

  setUpVariables() {
    this.viewMatrix = mat4.create();
    this.viewMatrixInverse = mat4.create();
    this.frustum = mat4.create();
    this.startTime = null;
    this.lastTime = null;
    this.movement = [0, 0, 0];
    this.forward = [0, 0, -1];
    this.right = [1, 0, 0];
    this.up = [0, 1, 0];
    this.eye = [0, 32, 0];
    this.look = [0, 0, 0];
    this.lookAt = [0, 0, 0];
    this.playerSpeed = 20;
    this.turnSpeed = 0.002;
    this.azimuth = 0;
    this.elevation = 0;
    this.brushSize = 5;
    this.buildBlock = 1;
    this.streamBrush = false;

    this.boundRenderLoop = this.renderLoop.bind(this);
  }

  updateBuildValueForEvent(e) {
    const buildValue = [this.buildBlock, 0, 0, 0];
    if (this.buildBlock === 2) {
      buildValue[1] = 255;
    }
    if (e.button === 0) {
      buildValue[0] = 0;
      buildValue[1] = 0;
    }
    this.processing.simulator.updateUniforms({ modifyValue: buildValue });
  }

  setUpMouseEvents() {
    const handler = (e) => {
      if (document.pointerLockElement === this.canvas) {
        // Update elevation
        this.elevation -= e.movementY * this.turnSpeed;
        this.elevation = Math.min(
          Math.PI / 2 - 0.01,
          Math.max(-Math.PI / 2 + 0.01, this.elevation),
        );
        vec3.rotateX(this.look, [0, 0, -1], [0, 0, 0], this.elevation);

        // Update azimuth
        this.azimuth -= e.movementX * this.turnSpeed;
        vec3.rotateY(this.forward, [0, 0, -1], [0, 0, 0], this.azimuth);
        vec3.rotateY(this.look, this.look, [0, 0, 0], this.azimuth);
        vec3.cross(this.right, this.forward, this.up);
      }
    };
    document.onmousemove = (e) => handler(e);
    this.canvas.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock();
        return;
      }
      this.updateBuildValueForEvent(e);
      if (this.streamBrush) {
        this.processing.simulator.updateUniforms({ modify: true });
      } else {
        this.processing.modifyOnce = true;
      }
    });
    this.canvas.addEventListener('mouseup', () => {
      if (!this.streamBrush) {
        return;
      }
      this.processing.simulator.updateUniforms({ modify: false });
    });
  }

  renderLoop(timestamp) {
    if (!this.startTime) {
      this.startTime = timestamp;
      this.lastTime = timestamp;
    }
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Update position
    vec3.zero(this.movement);
    if (this.keys.w) {
      vec3.scale(this.movement, this.forward, dt * this.playerSpeed);
    } if (this.keys.s) {
      vec3.scale(this.movement, this.forward, -dt * this.playerSpeed);
    } if (this.keys.d) {
      vec3.scale(this.movement, this.right, dt * this.playerSpeed);
    } if (this.keys.a) {
      vec3.scale(this.movement, this.right, -dt * this.playerSpeed);
    } if (this.keys.space) {
      vec3.scale(this.movement, this.up, dt * this.playerSpeed);
    } if (this.keys.shift) {
      vec3.scale(this.movement, this.up, -dt * this.playerSpeed);
    }

    vec3.add(this.eye, this.eye, this.movement);

    vec3.add(this.lookAt, this.eye, this.look);
    mat4.lookAt(this.viewMatrix, this.eye, this.lookAt, this.up);
    const aspect = this.canvas.height / this.canvas.width;
    mat4.frustum(this.frustum, -1, 1, -aspect, aspect, 2, 10);
    mat4.mul(this.viewMatrix, this.frustum, this.viewMatrix);
    mat4.invert(this.viewMatrixInverse, this.viewMatrix);

    this.processing.renderer.updateUniforms({
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      viewMatrixInverse: this.viewMatrixInverse,
      eye: this.eye,
      timestamp,
    });

    this.processing.render();

    requestAnimationFrame(this.boundRenderLoop);
  }

  getVox() {
    return this.processing.framebuffer2.retrieve();
  }
}
