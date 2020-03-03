/* BREAKING CHANGES
Sampler 2d is now an Object in the form of {name, data, sizeX, sizeY}
Shader construtor accepts an Object not normal args
*/


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

const VERTEX_SHADER =
    `#version 300 es
            in vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }`;

export default class Shader {
    constructor({ glContext, frag, consts, uniforms, sampler2d, drawingToScreen }) {
        this.gl = glContext;
        this.frag = frag;
        this.consts = consts;
        this.uniforms = uniforms;
        this.uniformKeys = Object.keys(uniforms);
        this.sampler2d = sampler2d;
        this.drawingToScreen = drawingToScreen;

        this.frag = this.replaceFragWithConsts(this.frag);
        this.compileShader();
        this.loadTrianglePositions();
        this.uniformLocations = this.getUniformLocations();
        this.setUpSampler2d();
        this.setUniformsToDefaults();
    }

    replaceFragWithConsts(frag) {
        let newFrag = frag;
        Object.keys(this.consts).forEach(constant => {
            newFrag = newFrag.replace(new RegExp(constant, 'g'), this.consts[ constant ]);
        });
        return newFrag;
    }

    compileShader() {
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

        this.program = this.gl.createProgram();
        this.buildShader(
            this.gl.VERTEX_SHADER,
            VERTEX_SHADER,
            this.program,
        );
        this.buildShader(
            this.gl.FRAGMENT_SHADER,
            this.frag,
            this.program,
        );
        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);
    }

    buildShader(type, source, program) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        let compiled = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
        console.log('Shader compiled successfully: ' + compiled);
        let compilationLog = this.gl.getShaderInfoLog(shader);
        console.log('Shader compiler log: ' + compilationLog);
        this.gl.attachShader(program, shader);
    };

    loadTrianglePositions() {
        let buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array(VERTEX_POSITIONS),
            this.gl.STATIC_DRAW
        );

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
    }

    getUniformLocations() {
        return Object.keys({ ...this.uniforms }).reduce((obj, uniform) => {
            obj[ uniform ] = this.gl.getUniformLocation(this.program, uniform);
            return obj;
        }, {});
    }

    setUpSampler2d() {
        this.sampler2dPosition = this.gl.getUniformLocation(this.program, this.sampler2d.name);

        this.sampler2dTexture = this.gl.createTexture();

        this.updateSampler2d();

        this.framebuffer = this.createFramebuffer(this.sampler2dTexture);
    }

    createFramebuffer(texture) {
        const framebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, framebuffer);
        this.gl.framebufferTexture2D(this.gl.DRAW_FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
        return framebuffer;
    }

    setUniformsToDefaults() {
        this.set(Object.keys(this.uniforms).reduce((obj, v) => {
            obj[ v ] = this.uniforms[ v ].value;
            return obj;
        }, {}), true);
    }

    updateSampler2d(data = this.sampler2d.data) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.sampler2dTexture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGB,
            this.sampler2d.sizeX,
            this.sampler2d.sizeY,
            0,
            this.gl.RGB,
            this.gl.UNSIGNED_BYTE,
            data,
        );
    }

    set(uniforms, bypass) {
        this.gl.useProgram(this.program);
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
                    // console.log('1I:', this.uniformLocations, this.uniforms[ uniform ], uniform, location, value)
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

    render() {
        this.gl.useProgram(this.program);
        this.gl.viewport(
            0,
            0,
            this.drawingToScreen
                ? this.gl.drawingBufferWidth
                : this.sampler2d.sizeX,
            this.drawingToScreen
                ? this.gl.drawingBufferHeight
                : this.sampler2d.sizeY);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.sampler2dTexture);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.drawingToScreen ? null : this.framebuffer);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, VERTEX_COUNT);
    }

    retrieveFramebuffer() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
        const data = new Uint8Array(this.sampler2d.sizeX * this.sampler2d.sizeY * 4);
        this.gl.readPixels(0, 0, this.sampler2d.sizeX, this.sampler2d.sizeY, this.gl.RGB, this.gl.UNSIGNED_BYTE, data);
        this.sampler2d.data = data;
        return data;
    }
}