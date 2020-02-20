import { glMatrix, mat4, vec3 } from 'gl-matrix';
import Mousetrap from 'mousetrap';

import Renderer from './Renderer';

glMatrix.setMatrixArrayType(Array);

export default class Engine {
    constructor({ vox, worldSize, min, samples, maxDist, distStep }) {
        this.canvas = document.getElementById('canvas');
        window.addEventListener('resize', resizeCanvas, false);
        function resizeCanvas() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
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
                }
            },

            vox,

        });

        this.vox = vox;
        this.setUpMousetrap();
        this.setUpMouseXY();
    }

    setUpMousetrap() {
        this.keys = {};
        function listenForKey(key) {
            this.keys[ key ] = false;
            Mousetrap.bind(key, () => this.keys[ key ] = true, 'keydown');
            Mousetrap.bind(key, () => this.keys[ key ] = false, 'keyup');
        }
        [ 'left', 'right', 'space', 'w', 'a', 's', 'd' ].forEach(listenForKey.bind(this));
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
        this.eye = [ 4, 30, 0 ];
        this.look = [ 0, 0, 0 ];
        this.playerSpeed = 20;
        this.turnSpeed = 2;

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

    setUpMouseXY() {
        this.mouseX = null;
        this.mouseY = null;
        function handler(e) {
            this.mouseX = e.pageX;
            this.mouseY = e.pageY;
        }
        document.onmousemove = handler;
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
        // update position
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
        }

        vec3.add(this.eye, this.eye, this.movement);
        // console.log(this.eye);

        if (this.keys.left) {
            vec3.rotateY(this.forward, this.forward, [ 0, 0, 0 ], dt * this.turnSpeed);
            vec3.cross(this.right, this.forward, this.up);
            uniforms.viewMatrixInverse.changed = true;
        } else if (this.keys.right) {
            vec3.rotateY(this.forward, this.forward, [ 0, 0, 0 ], -dt * this.turnSpeed);
            vec3.cross(this.right, this.forward, this.up);
            uniforms.viewMatrixInverse.changed = true;
        }

        // for (let xi = 0; xi < sx; xi += 1) {
        //   for (let yi = 0; yi < sy; yi += 1) {
        //     for (let zi = 0; zi < sz; zi += 1) {
        //       if (Math.random() < 0.001 && (Math.abs(min[0] + xi) > 2 || Math.abs(min[1] + yi) > 2)) {
        //         setVoxel([min[0] + xi, min[1] + yi, min[2] + zi], Math.random() < 0.2 ? 1 : 0);
        //       }
        //     }
        //   }
        // }
        vec3.add(this.look, this.eye, this.forward);
        mat4.lookAt(this.viewMatrix, this.eye, this.look, this.up);
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
        })

        this.renderer.render();

        // this.renderer.render({
        //     // console.log({
        //     vox: regl.texture([ this.vox ]),
        //     // vox: regl.texture({
        //     //     data: this.vox,
        //     //     width: 1024,
        //     //     height: 1,
        //     // }),

        //     // ...this.xKernel.reduce((obj, val, index) => { obj[ `xKernel[${index}]` ] = val; return obj; }, {}),
        //     // ...this.yKernel.reduce((obj, val, index) => { obj[ `yKernel[${index}]` ] = val; return obj; }, {}),
        //     // ...this.zKernel.reduce((obj, val, index) => { obj[ `zKernel[${index}]` ] = val; return obj; }, {}),
        // });

        requestAnimationFrame(this.boundRenderLoop);
    }

    getVoxel(p) {
        const xi = Math.floor(p[ 0 ] - this.min[ 0 ]);
        const yi = Math.floor(p[ 1 ] - this.min[ 1 ]);
        const zi = Math.floor(p[ 2 ] - this.min[ 2 ]);
        if (xi < 0 || xi >= this.sx || yi < 0 || yi >= this.sy || zi < 0 || zi >= this.sz) {
            return 0;
        }
        return vox[ xi * this.sy * this.sz + yi * this.sz + zi ];
    }

    setVoxel(p, val) {
        const xi = p[ 0 ] - this.min[ 0 ];
        const yi = p[ 1 ] - this.min[ 1 ];
        const zi = p[ 2 ] - this.min[ 2 ];
        this.vox[ xi * sy * sz + yi * sz + zi ] = val;
    }
}