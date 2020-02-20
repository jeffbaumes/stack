const canvas = document.getElementById('canvas');
const height = canvas.height;
const width = canvas.width;
// Get 2d drawing context
const gl = canvas.getContext('webgl');
gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
const vertexCount = 6;
const vertexLocations = [
    // X, Y
    -1.0, -1.0,
    1.0, -1.0,
    -1.0, 1.0,
    -1.0, 1.0,
    1.0, -1.0,
    1.0, 1.0
];

gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(vertexLocations),
    gl.STATIC_DRAW
);

const program = gl.createProgram();
const buildShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    return shader;
};

const vertexShader = buildShader(
    gl.VERTEX_SHADER,
    `
attribute vec2 a_position;
void main() {
gl_Position = vec4(a_position, 0.0, 1.0);
}`
);

const fragmentShader = buildShader(
    gl.FRAGMENT_SHADER,
    `
#define M_RAD ${Math.PI * 2}
#define CYCLE_WIDTH 100.0
#define BLADES 3.0
#define BLADES_T_CYCLE_WIDTH 300.0
// Mobiles need this
precision highp float;
uniform float timestamp;
void main() {
  float fadeB = 255.0 / 255.0;
  float fadeR = 2.0 / 255.0;
  float fadeG = 120.0 / 255.0;
  gl_FragColor = vec4(fadeR, fadeG, fadeB, 1.0);
}`
);

gl.linkProgram(program);
gl.useProgram(program);
// Detach and delete shaders as they're no longer needed
gl.detachShader(program, vertexShader);
gl.detachShader(program, fragmentShader);
gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);
// Add attribute pointer to our vertex locations
const positionLocation = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(positionLocation);
const fieldCount = vertexLocations.length / vertexCount;
gl.vertexAttribPointer(
    positionLocation,
    fieldCount,
    gl.FLOAT,
    gl.FALSE,
    fieldCount * Float32Array.BYTES_PER_ELEMENT,
    0
);

const timestampId = gl.getUniformLocation(program, 'timestamp');

const render = (timestamp) => {
    // Update timestamp
    gl.uniform1f(timestampId, timestamp);
    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    window.requestAnimationFrame(render);
};

window.requestAnimationFrame(render);