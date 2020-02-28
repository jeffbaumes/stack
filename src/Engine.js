import { glMatrix, mat4, vec3 } from 'gl-matrix';
import Mousetrap from 'mousetrap';

import Renderer from './Renderer';

glMatrix.setMatrixArrayType(Array);

export default class Engine {
    constructor({ vox, worldSize, min, samples, maxDist, distStep }) {
        this.canvas = document.getElementById('canvas');
        window.addEventListener('resize', resizeCanvas, false);
        function resizeCanvas() {
            // this.canvas.width = window.innerWidth;
            // this.canvas.height = window.innerHeight;
            this.canvas.width = window.innerWidth / 2;
            this.canvas.height = window.innerHeight / 2;
            // this.canvas.width = window.innerWidth / 4;
            // this.canvas.height = window.innerHeight / 4;
        }
        resizeCanvas.bind(this)();
        this.min = min;
        this.setUpVariables();

        this.renderer = new Renderer({
            canvas: this.canvas,
            consts: {
                sx: worldSize[ 0 ],
                sy: worldSize[ 1 ],
                sz: worldSize[ 2 ],
                samples,
                maxDist,
                distStep,
            },

            uniforms: {
                canvasWidth: {
                    value: this.canvas.width,
                    type: 'Int',
                },
                canvasHeight: {
                    value: this.canvas.height,
                    type: 'Int',
                },

                viewMatrixInverse: {
                    value: this.viewMatrixInverse,
                    type: 'Mat4',
                },
                eye: {
                    value: this.eye,
                    type: 'Vec3',
                },
                minSize: {
                    value: this.min,
                    type: 'Vec3',
                },
                xKernel: {
                    value: this.xKernel,
                    type: 'IntArray'
                },
                yKernel: {
                    value: this.yKernel,
                    type: 'IntArray'
                },
                zKernel: {
                    value: this.zKernel,
                    type: 'IntArray'
                },
                timestamp: {
                    value: 0,
                    type: 'Int',
                },
            },

            vox,

        });

        this.vox = vox;
        this.worldSize = worldSize;
        this.setUpMousetrap();
        this.setUpMouseEvents();
    }

    setUpMousetrap() {
        this.keys = {};
        function listenForKey(key) {
            this.keys[ key ] = false;
            Mousetrap.bind(key, () => this.keys[ key ] = true, 'keydown');
            Mousetrap.bind(key, () => this.keys[ key ] = false, 'keyup');
            Mousetrap.bind(`shift+${key}`, () => this.keys[ key ] = true, 'keydown');
            Mousetrap.bind(`shift+${key}`, () => this.keys[ key ] = false, 'keyup');
        }
        ['space', 'shift', 'w', 'a', 's', 'd', 'b', 'v' ].forEach(listenForKey.bind(this));
    }

    setUpVariables() {
        this.viewMatrix = mat4.create();
        this.viewMatrixInverse = mat4.create();
        this.frustum = mat4.create();
        this.startTime = null;
        this.lastTime = null;
        this.movement = [ 0, 0, 0 ];
        this.forward = [ 0, 0, -1 ];
        this.right = [ 1, 0, 0 ];
        this.up = [ 0, 1, 0 ];
        this.eye = [ 0, 32, 0 ];
        this.look = [ 0, 0, 0 ];
        this.lookAt = [ 0, 0, 0 ];
        this.playerSpeed = 20;
        this.turnSpeed = 0.002;
        this.azimuth = 0;
        this.elevation = 0;
        this.brushSize = 0;

        this.xKernel = new Int32Array([
            [ [ 1, 1, 1 ], [ 1, 1, 1 ], [ 1, 1, 1 ] ],
            [ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ] ],
            [ [ -1, -1, -1 ], [ -1, -1, -1 ], [ -1, -1, -1 ] ],
        ].flat(3));

        this.yKernel = new Int32Array([
            [ [ 1, 1, 1 ], [ 0, 0, 0 ], [ -1, -1, -1 ] ],
            [ [ 1, 1, 1 ], [ 0, 0, 0 ], [ -1, -1, -1 ] ],
            [ [ 1, 1, 1 ], [ 0, 0, 0 ], [ -1, -1, -1 ] ],
        ].flat(3));

        this.zKernel = new Int32Array([
            [ [ 1, 0, -1 ], [ 1, 0, -1 ], [ 1, 0, -1 ] ],
            [ [ 1, 0, -1 ], [ 1, 0, -1 ], [ 1, 0, -1 ] ],
            [ [ 1, 0, -1 ], [ 1, 0, -1 ], [ 1, 0, -1 ] ],
        ].flat(3));

        this.boundRenderLoop = this.renderLoop.bind(this);
    }

    setUpMouseEvents() {
        const handler = (e) => {
            if (document.pointerLockElement === this.canvas) {
                // Update elevation
                this.elevation -= e.movementY * this.turnSpeed;
                this.renderer.uniforms.viewMatrixInverse.changed = true;
                this.elevation = Math.min(Math.PI / 2 - 0.01, Math.max(-Math.PI / 2 + 0.01, this.elevation));
                vec3.rotateX(this.look, [0, 0, -1], [0, 0, 0], this.elevation);

                // Update azimuth
                this.azimuth -= e.movementX * this.turnSpeed;
                this.renderer.uniforms.viewMatrixInverse.changed = true;
                vec3.rotateY(this.forward, [0, 0, -1], [0, 0, 0], this.azimuth);
                vec3.rotateY(this.look, this.look, [0, 0, 0], this.azimuth);
                vec3.cross(this.right, this.forward, this.up);
            }
        }
        document.onmousemove = (e) => handler(e);
        this.canvas.addEventListener('click', (e) => {
            if (document.pointerLockElement === this.canvas) {
                // Build
                if (e.button === 2) {
                    let world = this.getWorldHit({ before: true });
                    if (world) {
                        const s = this.brushSize * 2 + 1;
                        world = world.map((c) => Math.floor(c / s) * s);
                        for (let x = -this.brushSize; x <= this.brushSize; x += 1) {
                            for (let y = -this.brushSize; y <= this.brushSize; y += 1) {
                                for (let z = -this.brushSize; z <= this.brushSize; z += 1) {
                                    // if (x * x + y * y + z * z < 3 * 3) {
                                    this.setVoxel([world[0] + x, world[1] + y, world[2] + z], 1);
                                    // }
                                }
                            }
                        }
                        this.renderer.updateVox();
                    }
                }
                // Delete
                if (e.button === 0) {
                    let world = this.getWorldHit({ before: false });
                    if (world) {
                        const s = this.brushSize * 2 + 1;
                        world = world.map((c) => Math.floor(c / s) * s);
                        for (let x = -this.brushSize; x <= this.brushSize; x += 1) {
                            for (let y = -this.brushSize; y <= this.brushSize; y += 1) {
                                for (let z = -this.brushSize; z <= this.brushSize; z += 1) {
                                    // if (x * x + y * y + z * z < 5 * 5) {
                                    this.setVoxel([world[0] + x, world[1] + y, world[2] + z], 0);
                                    // }
                                }
                            }
                        }
                        this.renderer.updateVox();
                    }
                }
            } else {
                this.canvas.requestPointerLock();
            }
        });
    }

    load() {
        this.renderer.load();
    }

    renderLoop(timestamp) {
        if (!this.startTime) {
            this.startTime = timestamp;
            this.lastTime = timestamp;
        }
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        const uniforms = this.renderer.uniforms;

        // Update position
        vec3.zero(this.movement);
        if (this.keys.w) {
            vec3.scale(this.movement, this.forward, dt * this.playerSpeed);
            uniforms.eye.changed = true;
            uniforms.viewMatrixInverse.changed = true;
        } else if (this.keys.s) {
            vec3.scale(this.movement, this.forward, -dt * this.playerSpeed);
            uniforms.eye.changed = true;
            uniforms.viewMatrixInverse.changed = true;
        } else if (this.keys.d) {
            vec3.scale(this.movement, this.right, dt * this.playerSpeed);
            uniforms.eye.changed = true;
            uniforms.viewMatrixInverse.changed = true;
        } else if (this.keys.a) {
            vec3.scale(this.movement, this.right, -dt * this.playerSpeed);
            uniforms.eye.changed = true;
            uniforms.viewMatrixInverse.changed = true;
        } else if (this.keys.space) {
            vec3.scale(this.movement, this.up, dt * this.playerSpeed);
            uniforms.eye.changed = true;
            uniforms.viewMatrixInverse.changed = true;
        } else if (this.keys.shift) {
            vec3.scale(this.movement, this.up, -dt * this.playerSpeed);
            uniforms.eye.changed = true;
            uniforms.viewMatrixInverse.changed = true;
        }

        vec3.add(this.eye, this.eye, this.movement);

        vec3.add(this.lookAt, this.eye, this.look);
        mat4.lookAt(this.viewMatrix, this.eye, this.lookAt, this.up);
        const aspect = this.canvas.height / this.canvas.width;
        mat4.frustum(this.frustum, -1, 1, -aspect, aspect, 2, 10);
        mat4.mul(this.viewMatrix, this.frustum, this.viewMatrix);
        mat4.invert(this.viewMatrixInverse, this.viewMatrix);

        this.renderer.set({
            canvasWidth: this.canvas.width,
            canvasHeight: this.canvas.height,
            viewMatrixInverse: this.viewMatrixInverse,
            eye: this.eye,
            xKernel: this.xKernel,
            yKernel: this.yKernel,
            zKernel: this.zKernel,
            timestamp,
        });

        this.renderer.render();

        requestAnimationFrame(this.boundRenderLoop);
    }

    getVoxel(p) {
        const xi = Math.floor(p[ 0 ] - this.min[ 0 ]);
        const yi = Math.floor(p[ 1 ] - this.min[ 1 ]);
        const zi = Math.floor(p[ 2 ] - this.min[ 2 ]);
        if (xi < 0 || xi >= this.worldSize[0] || yi < 0 || yi >= this.worldSize[1] || zi < 0 || zi >= this.worldSize[2]) {
            return 0;
        }
        return this.vox[(zi * this.worldSize[0] * this.worldSize[1] + yi * this.worldSize[0] + xi) * 3];
    }

    setVoxel(p, val) {
        const xi = Math.floor(p[ 0 ] - this.min[ 0 ]);
        const yi = Math.floor(p[ 1 ] - this.min[ 1 ]);
        const zi = Math.floor(p[ 2 ] - this.min[ 2 ]);
        if (xi < 0 || xi >= this.worldSize[0] || yi < 0 || yi >= this.worldSize[1] || zi < 0 || zi >= this.worldSize[2]) {
            return 0;
        }
        this.vox[(zi * this.worldSize[0] * this.worldSize[1] + yi * this.worldSize[0] + xi) * 3] = val;
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
}
