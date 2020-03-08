export default class Texture {
  constructor({ gl, size = { width: 0, height: 0 }, data }) {
    this.gl = gl;
    this.id = this.gl.createTexture();
    this.size = size;
    this.set(data);
  }

  set(data) {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA32F,
      this.size.width,
      this.size.height,
      0,
      this.gl.RGBA,
      this.gl.FLOAT,
      data,
    );
  }
}
