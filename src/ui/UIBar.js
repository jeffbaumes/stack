import UIElement from './UIElement';
import UIHint from './UIHint';

export default class UIBar extends UIElement {
  constructor({
    parent, text, value, hint, id, min, max, step, changeFunc,
  }) {
    super({
      parent, type: 'div', id, className: 'UIBar',
    });
    this.text = text;
    this.value = value;
    this.changeFunc = changeFunc;

    this.textEl = this._createTextElement(text, value, id);
    this.inputEl = this._createInputElement(value, min, max, step, id);

    this.hintElement = new UIHint({ parent: this.element, text: hint, id: `${id}-hint` });

    this.inputEl.element.addEventListener('input', this._onInput.bind(this));
  }

  _createTextElement(text, value, id) {
    const el = new UIElement({
      parent: this.element, type: 'div', id: `${id}-text`, className: 'UIBar-text',
    });
    el.set('innerHTML', `${text}: ${value}`);
    return el;
  }

  _createInputElement(value, min, max, step, id) {
    const el = new UIElement({
      parent: this.element, type: 'input', id: `${id}-input`, className: 'UIBar-input',
    });
    el.set('value', value)
      .set('type', 'range')
      .set('max', max)
      .set('min', min)
      .set('step', step);
    return el;
  }

  _onInput() {
    this.value = this.inputEl.get('value');
    this.textEl.set('innerHTML', `${this.text}: ${this.value}`);
    this.changeFunc(this.id, +this.value);
  }
}
