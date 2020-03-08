import UIElement from './UIElement';

export default class UIHint extends UIElement {
  constructor({ parent, text, id }) {
    super({
      parent, type: 'div', id, className: 'UIHint',
    });
    this.element.innerHTML = text;
  }
}
