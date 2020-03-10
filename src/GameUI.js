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
    min: 0,
    step: 0.5,
    type: 'Bar',
  },
  {
    name: 'streamBrush',
    niceName: 'Rapid Brush',
    value: false,
    type: 'Button',
  },
  {
    name: 'r_u_renderDistance',
    niceName: 'Render Distance',
    value: 200,
    max: 400,
    min: 50,
    step: 1,
    type: 'Bar',
  },
  {
    name: 'r_u_reflection',
    niceName: 'Reflection',
    value: true,
    type: 'Button',
  },
  {
    name: 'r_u_refraction',
    niceName: 'Refraction',
    value: true,
    type: 'Button',
  },
  {
    name: 'r_u_ambientOcclusion',
    niceName: 'Ambient Occlusion',
    value: true,
    type: 'Button',
  },
  {
    name: 'r_u_directionalLighting',
    niceName: 'Directional Lighting',
    value: true,
    type: 'Button',
  },
  {
    name: 'r_u_showFog',
    niceName: 'Fog',
    value: false,
    type: 'Button',
  },
  {
    name: 'r_u_waterAttenuationDistance',
    niceName: 'Water Attenuation Distance',
    value: 100,
    max: 200,
    min: 1,
    step: 1,
    type: 'Bar',
  },
  {
    name: 's_u_groundGravity',
    niceName: 'Ground Gravity',
    value: true,
    type: 'Button',
  },
  {
    name: 'simulationsPerFrame',
    niceName: 'Simulation Steps Per Frame',
    value: 5,
    max: 20,
    min: 1,
    step: 1,
    type: 'Bar',
  },
];


export default class GameUI {
  constructor(engine) {
    this.engine = engine;
    document.addEventListener('pointerlockchange', () => this._onPointerLockChange());
    this.ui = new UI({ outline: OUTLINE, uniformsModifier: this._onModify.bind(this) });
  }

  _onPointerLockChange() {
    if (document.pointerLockElement === this.engine.canvas) {
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
      this.engine.processing.simulator.updateUniforms(obj);
    } else if (name.slice(0, 2) === 'r_') {
      obj[name.slice(2)] = value;
      this.engine.processing.renderer.updateUniforms(obj);
    } else if (name === 'streamBrush') {
      this.engine.streamBrush = value;
    } else if (name === 'simulationsPerFrame') {
      this.engine.processing.simulationsPerFrame = value;
    }
  }

  show() {
    this.ui.element.style.display = 'block';
  }

  hide() {
    this.ui.element.style.display = 'none';
  }
}
