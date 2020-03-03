import frag from './walk.frag';
import simFrag from './sim.frag';

const VERTEX_COUNT = 6;
const VERTEX_POSITIONS = [
    // X, Y
    -1.0, -1.0,
    1.0, -1.0,
    -1.0, 1.0,
    -1.0, 1.0,
    1.0, -1.0,
    1.0, 1.0
];

export default class Renderer {
    constructor({ canvas, consts, uniforms, vox }) {
        this.consts = consts;
        this.uniforms = uniforms;
        this.vox = vox;
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2');
        this.uniformKeys = Object.keys(uniforms);

    }

    load() {
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        let buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(VERTEX_POSITIONS),
            this.gl.STATIC_DRAW
        );

        const buildShader = (type, source, program) => {
            const shader = this.gl.createShader(type);
            this.gl.shaderSource(shader, source);
            this.gl.compileShader(shader);
            let compiled = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
            console.log('Shader compiled successfully: ' + compiled);
            let compilationLog = this.gl.getShaderInfoLog(shader);
            console.log('Shader compiler log: ' + compilationLog);
            this.gl.attachShader(program, shader);
        };
        const vertShader =
            `#version 300 es
            in vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }`;
        this.program = this.gl.createProgram();
        buildShader(
            this.gl.VERTEX_SHADER,
            vertShader,
            this.program,
        );
        buildShader(
            this.gl.FRAGMENT_SHADER,
            this.createFragShader(),
            this.program,
        );
        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);
        let positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        let fieldCount = VERTEX_POSITIONS.length / VERTEX_COUNT;
        this.gl.vertexAttribPointer(
            positionLocation,
            fieldCount,
            this.gl.FLOAT,
            this.gl.FALSE,
            fieldCount * Float32Array.BYTES_PER_ELEMENT,
            0
        );


        this.simProgram = this.gl.createProgram();
        buildShader(
            this.gl.VERTEX_SHADER,
            vertShader,
            this.simProgram,
        );
        buildShader(
            this.gl.FRAGMENT_SHADER,
            simFrag,
            this.simProgram,
        );
        this.gl.linkProgram(this.simProgram);
        this.gl.useProgram(this.simProgram);

        buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(VERTEX_POSITIONS),
            this.gl.STATIC_DRAW
        );

        positionLocation = this.gl.getAttribLocation(this.simProgram, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        fieldCount = VERTEX_POSITIONS.length / VERTEX_COUNT;
        this.gl.vertexAttribPointer(
            positionLocation,
            fieldCount,
            this.gl.FLOAT,
            this.gl.FALSE,
            fieldCount * Float32Array.BYTES_PER_ELEMENT,
            0
        );

        this.gl.useProgram(this.program);


        this.voxTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.voxTexture);
        this.getPositions();
        this.updateVox(this.voxTexture);
        this.set(Object.keys(this.uniforms).reduce((obj, v) => {
            obj[ v ] = this.uniforms[ v ].value;
            return obj;
        }, {}), true);
        this.framebuffer = this.createFramebuffer(this.voxTexture);

        this.voxTexture2 = this.gl.createTexture();
        this.updateVox(this.voxTexture2, null);
        this.framebuffer2 = this.createFramebuffer(this.voxTexture2);
    }

    createFragShader() {
        let newFrag = frag;
        Object.keys(this.consts).forEach(constent => {
            newFrag = newFrag.replace(new RegExp(constent, 'g'), this.consts[ constent ]);
        });
        console.log(newFrag);
        return newFrag;
    }

    createFramebuffer(texture) {
        const framebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, framebuffer);
        this.gl.framebufferTexture2D(this.gl.DRAW_FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
        return framebuffer;
    }

    getPositions() {
        this.uniformLocations = Object.keys({ ...this.uniforms, 'vox': {} }).reduce((obj, uniform) => {
            obj[ uniform ] = this.gl.getUniformLocation(this.program, uniform);
            return obj;
        }, {});
    }

    set(uniforms, bypass) {
        mainFor:
        for (let i = 0; i < this.uniformKeys.length; i++) {
            const uniform = this.uniformKeys[ i ];
            const enteredUniform = this.uniforms[ uniform ];
            const value = uniforms[ uniform ];
            if (!value) continue;
            const type = this.uniforms[ uniform ].type;
            const location = this.uniformLocations[ uniform ];
            switch (type) {
                case 'Mat4':
                    if (!bypass && !enteredUniform.changed) { continue mainFor; };
                    this.gl.uniformMatrix4fv(location, false, value);
                    enteredUniform.changed = false;
                    break;
                case 'Vec3':
                    if (!bypass && !enteredUniform.changed) { continue mainFor; };
                    this.gl.uniform3f(location, ...value);
                    enteredUniform.changed = false;
                    break;
                case 'Int':
                    if (!bypass && this.uniforms[ uniform ].value == value) { continue mainFor };
                    this.gl.uniform1i(location, value);
                    break;
                case 'Float':
                    if (!bypass && this.uniforms[ uniform ].value == value) { continue mainFor };
                    this.gl.uniform1f(location, value);
                    break;
                case 'IntArray':
                    if (!bypass && !enteredUniform.changed) {
                        continue mainFor;
                    };
                    this.gl.uniform1iv(location, value);
                    enteredUniform.changed = false;
                    break;
            }

            this.uniforms[ uniform ].value = value;

        }
    }

    updateVox(texture, data) {
        if (texture === undefined) {
            texture = this.voxTexture;
        }
        if (data === undefined) {
            data = this.vox;
        }
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGB,
            this.consts.sx,
            this.consts.sy * this.consts.sz,
            0,
            this.gl.RGB,
            this.gl.UNSIGNED_BYTE,
            data,
        );
    }

    render() {
        this.gl.useProgram(this.simProgram);
        this.gl.viewport(0, 0, this.consts.sx, this.consts.sy * this.consts.sz);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.voxTexture);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer2);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, VERTEX_COUNT);

        this.gl.useProgram(this.program);
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.voxTexture2);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, VERTEX_COUNT);

        [this.voxTexture, this.voxTexture2, this.framebuffer, this.framebuffer2] =
            [this.voxTexture2, this.voxTexture, this.framebuffer2, this.framebuffer];
    }

    retrieveVoxels() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        const voxels = new Uint8Array(this.consts.sx * this.consts.sy * this.consts.sz * 4);
        this.gl.readPixels(0, 0, this.consts.sx, this.consts.sy * this.consts.sz, this.gl.RGB, this.gl.UNSIGNED_BYTE, voxels);
        this.vox = voxels;
        return voxels;
    }

    renderStep() {
        // console.log('renderStep');
        // this.gl.useProgram(this.simProgram);
        // this.gl.viewport(0, 0, this.sx, this.sy*this.sz);
        // this.gl.bindTexture(this.gl.TEXTURE_2D, this.voxTexture);
        // this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer2);
        // this.gl.drawArrays(this.gl.TRIANGLES, 0, VERTEX_COUNT);
        // // [this.voxTexture, this.voxTexture2, this.framebuffer, this.framebuffer2] =
        // //     [this.voxTexture2, this.voxTexture, this.framebuffer2, this.framebuffer];
        // this.gl.useProgram(this.program);
    }
}
