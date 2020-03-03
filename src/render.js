function createProgram(gl, vss, fss) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vss);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(vs)); }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fss);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(fs)); }

    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(p)); }

    return p;
}

function createTexture(gl, data) {
    let t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    if (data) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data); }
    return t;
}

function createFramebuffer(gl, texture) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return fb;
}

function createQuad(gl) {
    const pos = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}

function resize(gl, width, height) {
    gl.canvas.width = width;
    gl.canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.canvas.dispatchEvent(new CustomEvent('update'));
}

function render({gl, program, uniforms, texture, framebuffer = null}) {
    gl.useProgram(program);
    Object.keys(uniforms).forEach((uniform) => {
        gl.uniform1i(gl.getUniformLocation(program, uniform), uniforms[uniform]);
    });
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

this.canvas = document.getElementById('canvas');
window.addEventListener('resize', resizeCanvas, false);
function resizeCanvas() {
    // this.canvas.width = window.innerWidth;
    // this.canvas.height = window.innerHeight;
    this.canvas.width = window.innerWidth / 2;
    this.canvas.height = window.innerHeight / 2;
    this.canvas.style.imageRendering = 'pixelated';
    // this.canvas.width = window.innerWidth / 4;
    // this.canvas.height = window.innerHeight / 4;
}


const gl = canvas.getContext('webgl2');
let computeProgram = createProgram(gl, vs, fs_compute);
createQuad(gl);

let renderProgram = createProgram(gl, vs, fs_render);
createQuad(gl);

let oldState = createTexture(gl, initialState());
let newState = createTexture(gl, new ImageData(100, 100));
let oldFb = createFramebuffer(gl, oldState);
let newFb = createFramebuffer(gl, newState);

function render(gl, computeProgram, renderProgram) {
    gl.useProgram(computeProgram);
    // gl.uniform1i(gl.getUniformLocation(computeProgram, "rules_b"), rules_b);
    // gl.uniform1i(gl.getUniformLocation(computeProgram, "rules_s"), rules_s);

    gl.bindTexture(gl.TEXTURE_2D, oldState);
    gl.bindFramebuffer(gl.FRAMEBUFFER, newFb);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.useProgram(renderProgram);
    // gl.uniform1i(gl.getUniformLocation(renderProgram, "age"), age);

    gl.bindTexture(gl.TEXTURE_2D, newState);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    [oldState, oldFb, newState, newFb] = [newState, newFb, oldState, oldFb];
}




