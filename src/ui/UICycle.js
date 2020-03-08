import UIElement from "./UIElement";
import UIHint from "./UIHint";

export default class UICycle extends UIElement {
    constructor({ parent, text, values, value, hint, id, changeFunc }) {
        super({ parent, type: 'div', id, className: 'UICycle' });
        this.text = text;
        this.value = value;
        this.values = values;
        this.changeFunc = changeFunc;

        this.textElement = new UIElement({ parent: this.element, type: 'span', id: `${id}-text`, className: 'UICycle-text' });
        this.textElement.set('innerHTML', `${this.text}: ${this.value[ 1 ]}`);
        this.hintElement = new UIHint({ parent: this.element, text: hint, id: `${id}-hint` });

        this.element.addEventListener('click', this._onClick.bind(this));
        this.index = 0;
        parent.appendChild(this.element);
    }

    _onClick() {
        this.index += 1;
        if (this.index >= this.values.length) {
            this.index = 0;
        }

        this.value = this.values[ this.index ]
        this.textElement.set('innerHTML', `${this.text}: ${this.value[ 1 ]}`);
        this.changeFunc(this.id, this.value[ 0 ]);
    }
}