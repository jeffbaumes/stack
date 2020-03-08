import { glMatrix, mat4, vec3 } from 'gl-matrix';
import Mousetrap from 'mousetrap';

import GPUProcessing from './GPUProcessing';

glMatrix.setMatrixArrayType(Array);

export default class Engine {
  constructor({ vox, worldSize, samples, maxDist, distStep }) {
    this.canvas = document.getElementById('canvas');
    window.addEventListener('resize', resizeCanvas, false);
    function resizeCanvas() {
      this.canvas.width = window.innerWidth / 2;
      this.canvas.height = window.innerHeight / 2;
    }
    resizeCanvas.bind(this)();
    this.setUpVariables();

    this.processing = new GPUProcessing({
      canvas: this.canvas,
      consts: {
        sx: worldSize[0],
        sy: worldSize[1],
        sz: worldSize[2],
        samples,
        maxDist,
        distStep,
      },

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

    this.vox = vox;
    this.worldSize = worldSize;
    this.setUpMousetrap();
    this.setUpMouseEvents();
  }

  setUpMousetrap() {
    this.keys = {};
    function listenForKey(key) {
      this.keys[key] = false;
      Mousetrap.bind(key, () => this.keys[key] = true, 'keydown');
      Mousetrap.bind(key, () => this.keys[key] = false, 'keyup');
      Mousetrap.bind(`shift+${key}`, () => this.keys[key] = true, 'keydown');
      Mousetrap.bind(`shift+${key}`, () => this.keys[key] = false, 'keyup');
    }
    ['space', 'shift', 'w', 'a', 's', 'd', 'b', 'v'].forEach(listenForKey.bind(this));
    Mousetrap.bind('1', () => this.buildBlock = 1);
    Mousetrap.bind('shift+1', () => this.buildBlock = 1);
    Mousetrap.bind('2', () => this.buildBlock = 2);
    Mousetrap.bind('shift+2', () => this.buildBlock = 2);
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

    this.boundRenderLoop = this.renderLoop.bind(this);
  }

  setUpMouseEvents() {
    const handler = (e) => {
      if (document.pointerLockElement === this.canvas) {
        // Update elevation
        this.elevation -= e.movementY * this.turnSpeed;
        this.elevation = Math.min(Math.PI / 2 - 0.01, Math.max(-Math.PI / 2 + 0.01, this.elevation));
        vec3.rotateX(this.look, [0, 0, -1], [0, 0, 0], this.elevation);

        // Update azimuth
        this.azimuth -= e.movementX * this.turnSpeed;
        vec3.rotateY(this.forward, [0, 0, -1], [0, 0, 0], this.azimuth);
        vec3.rotateY(this.look, this.look, [0, 0, 0], this.azimuth);
        vec3.cross(this.right, this.forward, this.up);
      }
    }
    document.onmousemove = (e) => handler(e);
    this.canvas.addEventListener('mouseup', (e) => {
      this.mousedown = false;
      this.processing.simulator.updateUniforms({ modify: false })
      this.mouseButton = e.button;
    })
    this.canvas.addEventListener('mousedown', (e) => {
      this.canvas.requestPointerLock();
      this.mousedown = true;
      this.processing.simulator.updateUniforms({modify: true})

      const buildValue = [this.buildBlock, 0, 0, 0];
      if (this.buildBlock === 2) {
        buildValue[1] = 255;
      }
      if (e.button === 0) {
        buildValue[0] = 0;
        buildValue[1] = 0;
      }

      this.processing.simulator.updateUniforms({ modifyValue: buildValue })
      this.mouseButton = e.button
    });

    setInterval(this.placeBlocks.bind(this), 100);
  }

  placeBlocks() {
    if (false && this.mousedown && document.pointerLockElement === this.canvas) {
      if (this.mouseButton === 2 || this.mouseButton === 0) {
        const build = this.mouseButton === 2;
        this.vox = this.processing.framebuffer2.retrieve();
        let world = this.getWorldHit({ before: build });
        if (world) {
          const s = this.brushSize * 2 + 1;
          for (let x = -this.brushSize; x <= this.brushSize; x += 1) {
            for (let y = -this.brushSize; y <= this.brushSize; y += 1) {
              for (let z = -this.brushSize; z <= this.brushSize; z += 1) {
                const worldIndex = [world[0]+ x, world[1] + y, world[2] + z];
                const worldMaterial = this.getVoxel(worldIndex);
                if (x * x + y * y + z * z < 3 * 3 && (!build || worldMaterial === 0)) {
                  if (build) {
                    this.setVoxel(worldIndex, this.buildBlock);
                  } else {
                    this.setVoxel(worldIndex, 0);
                    this.setVoxel(worldIndex + 1, 0);
                  }
                }
              }
            }
          }
          this.processing.texture1.set(this.vox);
        }
      }
    } else if (this.mousedown) {
      this.canvas.requestPointerLock();
    }
  }

  load() {
    this.processing.load();
  }

  renderLoop(timestamp) {
    if (!this.startTime) {
      this.startTime = timestamp;
      this.lastTime = timestamp;
    }
    let dt = (timestamp - this.lastTime) / 1000;
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
      xKernel: this.xKernel,
      yKernel: this.yKernel,
      zKernel: this.zKernel,
      timestamp,
    });

    this.processing.render();

    requestAnimationFrame(this.boundRenderLoop);
  }

  getVoxel(p) {
    const xi = Math.floor(p[0]);
    const yi = Math.floor(p[1]);
    const zi = Math.floor(p[2]);
    if (xi < 0 || xi >= this.worldSize[0] || yi < 0 || yi >= this.worldSize[1] || zi < 0 || zi >= this.worldSize[2]) {
      return 0;
    }
    return this.vox[(zi * this.worldSize[0] * this.worldSize[1] + yi * this.worldSize[0] + xi) * 4];
  }

  setVoxel(p, val) {
    const xi = Math.floor(p[0]);
    const yi = Math.floor(p[1]);
    const zi = Math.floor(p[2]);
    if (xi < 0 || xi >= this.worldSize[0] || yi < 0 || yi >= this.worldSize[1] || zi < 0 || zi >= this.worldSize[2]) {
      return 0;
    }
    const index = (zi * this.worldSize[0] * this.worldSize[1] + yi * this.worldSize[0] + xi) * 4;
    this.vox[index] = val;
    if (val === 2) {
      this.vox[index + 1] = 255;
    }
    if (val === 0) {
      this.vox[index + 1] = 0;
    }
  }

  getWorldHit({ distStep = 0.1, maxDist = 100, before = true } = {}) {
    const p = [0, 0, 0];
    const world = [0, 0, 0];
    const delta = [0, 0, 0];
    vec3.transformMat4(world, p, this.viewMatrixInverse);
    vec3.sub(delta, world, this.eye);
    vec3.normalize(delta, delta);
    vec3.scale(delta, delta, distStep);
    vec3.copy(world, this.eye);
    for (let d = 0; d < maxDist; d += distStep) {
      world[0] += delta[0];
      world[1] += delta[1];
      world[2] += delta[2];
      const material = this.getVoxel(world);
      if (material) {
        if (before) {
          world[0] -= delta[0];
          world[1] -= delta[1];
          world[2] -= delta[2];
        }
        return world;
      }
    }
    return null;
  }

  step(timestamp) {
    if (!this.lastStepTime) {
      this.lastStepTime = timestamp;
    }
    if (timestamp - this.lastStepTime < 250) {
      return;
    }
    this.lastStepTime = timestamp;
    this.processing.renderStep();
  }
}
