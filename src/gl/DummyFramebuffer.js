export default class DummyFramebuffer {
  constructor({size}) {
    this.size = size;
    this.id = null;
  }

  getSize() {
    return this.size;
  }
}
