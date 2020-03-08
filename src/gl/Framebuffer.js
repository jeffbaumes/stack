export default class Framebuffer {
  constructor({ gl, texture }) {
    this.gl = gl;
    this.texture = texture;
    this.id = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.DRAW_FRAMEBUFFER, this.id);
    this.gl.framebufferTexture2D(
      this.gl.DRAW_FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      texture.id,
      0,
    );
  }

  getSize() {
    return this.texture.size;
  }

  retrieve() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.id);
    const data = new Float32Array(this.texture.size.width * this.texture.size.height * 4);
    this.gl.readPixels(
      0, 0,
      this.texture.size.width, this.texture.size.height,
      this.gl.RGBA, this.gl.FLOAT, data,
    );
    return data;
  }
}
