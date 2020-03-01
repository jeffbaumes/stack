import frag from './walk.frag';
// import frag from './shade.frag';

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
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(VERTEX_POSITIONS),
            this.gl.STATIC_DRAW
        );

        this.program = this.gl.createProgram();
        const buildShader = (type, source) => {
            const shader = this.gl.createShader(type);
            this.gl.shaderSource(shader, source);
            this.gl.compileShader(shader);
            let compiled = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
            console.log('Shader compiled successfully: ' + compiled);
            let compilationLog = this.gl.getShaderInfoLog(shader);
            console.log('Shader compiler log: ' + compilationLog);
            this.gl.attachShader(this.program, shader);
        };
        buildShader(
            this.gl.VERTEX_SHADER,
            `#version 300 es
            in vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }`,
        );

        buildShader(
            this.gl.FRAGMENT_SHADER,
            this.createFragShader(),
        );
        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);
        const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.gl.enableVertexAttribArray(positionLocation);
        const fieldCount = VERTEX_POSITIONS.length / VERTEX_COUNT;
        this.gl.vertexAttribPointer(
            positionLocation,
            fieldCount,
            this.gl.FLOAT,
            this.gl.FALSE,
            fieldCount * Float32Array.BYTES_PER_ELEMENT,
            0
        );

        this.voxTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_3D, this.voxTexture);
        this.getPositions();
        this.updateVox();
        this.set(Object.keys(this.uniforms).reduce((obj, v) => {
            obj[ v ] = this.uniforms[ v ].value;
            return obj;
        }, {}), true);

    }

    createFragShader() {
        let newFrag = frag;
        Object.keys(this.consts).forEach(constent => {
            newFrag = newFrag.replace(new RegExp(constent, 'g'), this.consts[ constent ]);
        });
        console.log(newFrag);
        return newFrag;
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

    updateVox() {
        this.gl.bindTexture(this.gl.TEXTURE_3D, this.voxTexture);
        this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_3D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texImage3D(
            this.gl.TEXTURE_3D,
            0,
            this.gl.RGB,
            this.consts.sx,
            this.consts.sy,
            this.consts.sz,
            0,
            this.gl.RGB,
            this.gl.UNSIGNED_BYTE,
            this.vox,
            this.uniformLocations.vox
        );
    }

    render() {
        this.gl.drawArrays(this.gl.TRIANGLES, 0, VERTEX_COUNT);
    }
}
