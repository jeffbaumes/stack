import UI from './UI';

function tempModifier(obj) {
  console.log('MODIFY: ', obj);
}

const outline = [
  {
    type: 'Button',
    name: 'reflections2',
    niceName: 'Reflections2',
    value: false,
    description: 'Turn on and off reflections2!',
  },
  {
    type: 'Bar',
    name: 'dist',
    niceName: 'render dist',
    value: 20,
    min: 1,
    max: 50,
    step: 0.5,
    description: 'Change render dist',
  },
  {
    type: 'Cycle',
    name: 'brush',
    niceName: 'brush Type',
    value: [0, 'Square'],
    values: [[0, 'Square'], [1, 'Circle'], [2, 'Triangle']],
    description: 'Change render dist',
  },
];

new UI({ outline, uniformsModifier: tempModifier });
