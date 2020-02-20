import { glMatrix, mat4, vec3 } from 'gl-matrix';
import Mousetrap from 'mousetrap';

import StackEngine from './Renderer';

const engine = new StackEngine('canvas', 100, 100, 100, [ -100, -100, -100 ]);

const m = mat4.create();
const minv = mat4.create();
const frustum = mat4.create();
let startTime = null;
let lastTime = null;
const movement = [ 0, 0, 0 ];
const forward = [ 0, 0, -1 ];
const right = [ 1, 0, 0 ];
const up = [ 0, 1, 0 ];
const eye = [ 0, 0, 0 ];
const look = [ 0, 0, 0 ];
const playerSpeed = 20;
const turnSpeed = 2;


glMatrix.setMatrixArrayType(Array);

const keys = {};
function listenForKey(key) {
    keys[ key ] = false;
    Mousetrap.bind(key, () => keys[ key ] = true, 'keydown');
    Mousetrap.bind(key, () => keys[ key ] = false, 'keyup');
}
[ 'left', 'right', 'space', 'w', 'a', 's', 'd' ].forEach(listenForKey);

let mouseX = null;
let mouseY = null;
function handler(e) {
    mouseX = e.pageX;
    mouseY = e.pageY;
}
document.onmousemove = handler;

window.addEventListener('resize', resizeCanvas, false);
function resizeCanvas() {
    engine.canvas.width = window.innerWidth;
    engine.canvas.height = window.innerHeight;
}
resizeCanvas();


engine.load();



function render(timestamp) {
    if (!startTime) {
        startTime = timestamp;
        lastTime = timestamp;
    }
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // update position
    vec3.zero(movement);
    if (keys.w) {
        vec3.scale(movement, forward, dt * playerSpeed);
    } else if (keys.s) {
        vec3.scale(movement, forward, -dt * playerSpeed);
    } else if (keys.d) {
        vec3.scale(movement, right, dt * playerSpeed);
    } else if (keys.a) {
        vec3.scale(movement, right, -dt * playerSpeed);
    }
    vec3.add(eye, eye, movement);
    // console.log(eye);

    if (keys.left) {
        vec3.rotateY(forward, forward, [ 0, 0, 0 ], dt * turnSpeed);
        vec3.cross(right, forward, up);
    } else if (keys.right) {
        vec3.rotateY(forward, forward, [ 0, 0, 0 ], -dt * turnSpeed);
        vec3.cross(right, forward, up);
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
    vec3.add(look, eye, forward);
    mat4.lookAt(m, eye, look, up);
    const aspect = canvas.height / canvas.width;
    mat4.frustum(frustum, -1, 1, -aspect, aspect, 2, 10);
    mat4.mul(m, frustum, m);
    mat4.invert(minv, m);

    engine.setUniforms({ distStep: 0.5, pixelSize: 16, subregion: 1, minv });
    engine.render();
    requestAnimationFrame(render);
}

requestAnimationFrame(render);