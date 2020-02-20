import regl from './regl';
import frag from './shade.frag';

export default class Renderer {
    constructor({ sx, sy, sz, min, samples, maxDist, distStep }) {
        this.sx = sx;
        this.sy = sy;
        this.sz = sz;
        this.min = min;
        this.samples = samples;
        this.maxDist = maxDist;
        this.distStep = distStep;

        this.region = new Float32Array([
            [ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ] ],
            [ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ] ],
            [ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ] ],
        ].flat(3));
    }

    load() {
        let sx = this.sx;
        let sy = this.sy;
        let sz = this.sz;

        const uniforms = [
            'viewMatrixInverse',
            'eye',
            'xKernel',
            'yKernel',
            'zKernel',
            'canvasWidth',
            'canvasHeight',
            'vox', ].reduce((obj, uniform) => {
                obj[ uniform ] = regl.prop(uniform);
                return obj;
            }, {});
        for (let i = 0; i < 27; i += 1) {
            uniforms[ `xKernel[${i}]` ] = regl.prop(`xKernel[${i}]`);
            uniforms[ `yKernel[${i}]` ] = regl.prop(`yKernel[${i}]`);
            uniforms[ `zKernel[${i}]` ] = regl.prop(`zKernel[${i}]`);
        }

        this.draw = regl({
            vert: `
                attribute vec2 a_position;
                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }`,
            frag: frag.replace(/maxDist/g, this.maxDist + ".0")
                .replace(/distStep/g, this.distStep)
                .replace(/samples/g, this.samples)
                .replace(/sx/g, sx + ".0")
                .replace(/sy/g, sy + ".0")
                .replace(/sz/g, sz + ".0")
                .replace(/SA/g, sx * sy * sz),
            attributes: {
                a_position: regl.buffer([
                    // X, Y
                    -1.0, -1.0,
                    1.0, -1.0,
                    -1.0, 1.0,
                    -1.0, 1.0,
                    1.0, -1.0,
                    1.0, 1.0
                ]),
            },

            uniforms,

            count: 6,
        })
    }

    render(uniforms) {
        this.draw(uniforms)
    }
}