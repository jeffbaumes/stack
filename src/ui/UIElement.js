export default class UIElement {
    constructor({ parent, type, id, className }) {
        this.parent = parent;
        this.id = id;
        this.className = className;
        this.element = this._createElement(type, id, className)

        this.parent.appendChild(this.element);
    }

    _createElement(type, id, className) {
        const el = document.createElement(type);
        el.id = id;
        el.className = className;

        return el;
    }

    set(attr, value) {
        this.element[ attr ] = value;
        return this;
    }

    get(attr) {
        return this.element[ attr ];
    }
}