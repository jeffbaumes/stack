import './style.sass';
import UIBar from "./UIBar";
import UIButton from "./UIButton";
import UICycle from './UICycle';

/** Outline format
    {
        type: String,
        name: String,
        niceName: String,
        description: String,
        value: Boolean || Number,
    }
 */


export default class UI {
    constructor({ outline, uniformsModifier }) {
        this.element = this._createElement(outline);
        document.body.appendChild(this.element);
        this.outline = outline;
        this.uniformsModifier = uniformsModifier;
    }

    _createElement(outline) {
        const root = document.createElement('div');
        root.className = 'UIRoot';
        outline.forEach(piece => {
            switch (piece.type) {
                case 'Bar':
                    new UIBar({
                        parent: root,
                        text: piece.niceName,
                        value: piece.value,
                        id: piece.name,
                        hint: piece.description,
                        min: piece.min,
                        max: piece.max,
                        step: piece.step,
                        changeFunc: this._onChange.bind(this)
                    });
                    break;
                case 'Cycle':
                    new UICycle({
                        parent: root,
                        text: piece.niceName,
                        value: piece.value,
                        values: piece.values,
                        id: piece.name,
                        hint: piece.description,
                        changeFunc: this._onChange.bind(this)
                    });
                    break;
                case 'Button':
                    new UIButton({
                        parent: root,
                        text: piece.niceName,
                        id: piece.name,
                        value: piece.value,
                        hint: piece.description,
                        changeFunc: this._onChange.bind(this)
                    });
                    break;
                default:
                    throw new Error('Unknown element type: ' + piece.type)
            }
        })

        return root;
    }

    _onChange(name, value) {
        const obj = {};
        obj[ name ] = value;
        this.uniformsModifier(obj);
    }
}