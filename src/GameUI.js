import UI from './ui/UI';

const OUTLINE = [
  {
    name: 's_brushMode',
    niceName: 'Brush Mode',
    value: [0, 'Box'],
    values: [[0, 'Box'], [1, 'Sphere'], [2, 'Diamond']],
    type: 'Cycle',
  },
  {
    name: 's_brushSize',
    niceName: 'Brush Size',
    value: 1,
    max: 100,
    min: 1,
    step: 0.5,
    type: 'Bar',
  },
];


export default class GameUI {
  constructor(simulator, renderer, canvas) {
    this.simulator = simulator;
    this.renderer = renderer;
    this.canvas = canvas;
    document.addEventListener('pointerlockchange', () => this._onPointerLockChange());
    this.ui = new UI({ outline: OUTLINE, uniformsModifier: this._onModify.bind(this) });
  }

  _onPointerLockChange() {
    if (document.pointerLockElement === this.canvas) {
      console.log('Change hide');
      this.hide();
    } else {
      console.log('Change show');
      this.show();
    }
  }

  _onModify(name, value) {
    const obj = {};
    if (name.slice(0, 2) === 's_') {
      obj[name.slice(2)] = value;
      this.simulator.updateUniforms(obj);
    } else if (name.slice(0, 2) === 'r_') {
      obj[name.slice(2)] = value;
      this.renderer.updateUniforms(obj);
    }
  }

  show() {
    this.ui.element.style.display = 'block';
  }

  hide() {
    this.ui.element.style.display = 'none';
  }
}
