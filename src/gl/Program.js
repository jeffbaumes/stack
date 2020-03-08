const DEFAULT_VERTEX_SIZE = 2;
const DEFAULT_VERTEX_POSITIONS = [
  -1.0, -1.0,
  1.0, -1.0,
  -1.0, 1.0,
  -1.0, 1.0,
  1.0, -1.0,
  1.0, 1.0,
];
const DEFAULT_VERTEX_NAME = 'a_position';
const DEFAULT_VERTEX_SHADER = `#version 300 es
  in vec2 a_position;
  void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

export default class Program {
  constructor({
    gl,
    uniforms,
    fragmentSource,
    vertexSource = DEFAULT_VERTEX_SHADER,
    vertexConfig = {
      positions: DEFAULT_VERTEX_POSITIONS,
      size: DEFAULT_VERTEX_SIZE,
      name: DEFAULT_VERTEX_NAME,
    },
    name = 'Program',
  }) {
    this.gl = gl;
    this.uniforms = uniforms;
    this.name = name;
    this.id = this._createProgram(vertexSource, fragmentSource);
    this.uniformLocations = this._getUniformLocations(this.id, this.uniforms);
    this._setUniformsToDefaults(this.uniforms);
    this._loadTrianglePositions(vertexConfig.positions, vertexConfig.size, vertexConfig.name);
    this.vertexCount = vertexConfig.positions.length / vertexConfig.size;
  }

  _createProgram(vertexSource, fragmentSource) {
    const program = this.gl.createProgram();
    const vertShader = this._buildShader(
      this.gl.VERTEX_SHADER,
      vertexSource,
    );
    const fragShader = this._buildShader(
      this.gl.FRAGMENT_SHADER,
      fragmentSource,
    );
    this.gl.attachShader(program, vertShader);
    this.gl.attachShader(program, fragShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(this.gl.getProgramInfoLog(program));
    }
    return program;
  }

  _buildShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(`Shader compile Error: \n${this.gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  _loadTrianglePositions(positions, fieldCount, name) {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(positions),
      this.gl.STATIC_DRAW,
    );

    const positionLocation = this.gl.getAttribLocation(this.id, name);
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(
      positionLocation,
      fieldCount,
      this.gl.FLOAT,
      this.gl.FALSE,
      fieldCount * Float32Array.BYTES_PER_ELEMENT,
      0,
    );
  }

  _getUniformLocations(program, uniforms) {
    return Object.keys({ ...uniforms }).reduce((obj, uniform) => {
      obj[uniform] = this.gl.getUniformLocation(program, uniform);
      return obj;
    }, {});
  }

  _setUniformsToDefaults(uniforms) {
    this.updateUniforms(Object.keys(uniforms).reduce((obj, v) => {
      obj[v] = uniforms[v].value;
      return obj;
    }, {}), true);
  }

  updateUniforms(newUniforms) {
    this.gl.useProgram(this.id);
    const uniformKeys = Object.keys(this.uniforms);
    for (let i = 0; i < uniformKeys.length; i += 1) {
      const uniformName = uniformKeys[i];
      const uniformConfig = this.uniforms[uniformName];
      const value = newUniforms[uniformName];
      if (value === undefined) {
        continue;
      }
      const { type } = uniformConfig;
      const location = this.uniformLocations[uniformName];
      switch (type) {
        case 'mat4':
          this.gl.uniformMatrix4fv(location, false, value);
          break;
        case 'vec3':
          this.gl.uniform3f(location, ...value);
          break;
        case 'vec4':
          this.gl.uniform4f(location, ...value);
          break;
        case 'int':
          this.gl.uniform1i(location, value);
          break;
        case 'float':
          this.gl.uniform1f(location, value);
          break;
        default:
          break;
      }
      uniformConfig.value = value;
    }
  }

  setTexture(texture) {
    this.texture = texture;
  }

  setFramebuffer(framebuffer) {
    this.framebuffer = framebuffer;
  }

  render() {
    this.gl.useProgram(this.id);
    const drawingSize = this.framebuffer.getSize();
    this.gl.viewport(
      0,
      0,
      drawingSize.width,
      drawingSize.height,
    );
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture.id);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer.id);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertexCount);
  }
}
