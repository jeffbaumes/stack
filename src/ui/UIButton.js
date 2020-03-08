import UIElement from "./UIElement";
import UIHint from "./UIHint";

export default class UIButton extends UIElement {
    constructor({ parent, text, value, hint, id, changeFunc }) {
        super({ parent, type: 'div', id, className: 'UIButton' });
        this.text = text;
        this.value = value;
        this.changeFunc = changeFunc;

        this.textElement = new UIElement({ parent: this.element, type: 'div', id: `${id}-text`, className: 'UIButton-text' });
        this.textElement.set('innerHTML', `${this.text}: ${this.value}`);
        this.hintElement = new UIHint({ parent: this.element, text: hint, id: `${id}-hint` });

        this.element.addEventListener('click', this._onClick.bind(this));
        parent.appendChild(this.element);
    }

    _onClick() {
        this.value = !this.value;
        this.textElement.set('innerHTML', `${this.text}: ${this.value}`);
        this.changeFunc(this.id, this.value);
    }
}