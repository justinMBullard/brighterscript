"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstEditor = void 0;
class AstEditor {
    constructor() {
        this.changes = [];
    }
    /**
     * Indicates whether the editor have changes that were applied
     */
    get hasChanges() {
        return this.changes.length > 0;
    }
    /**
     * Change the value of an object's property
     */
    setProperty(obj, key, newValue) {
        const change = new EditPropertyChange(obj, key, newValue);
        this.changes.push(change);
        change.apply();
    }
    /**
     * Set custom text that will be emitted during transpile instead of the original text.
     */
    overrideTranspileResult(node, value) {
        this.setProperty(node, 'transpile', (state) => {
            return [
                state.sourceNode(node, value)
            ];
        });
    }
    /**
     * Insert an element into an array at the specified index
     */
    addToArray(array, index, newValue) {
        const change = new AddToArrayChange(array, index, newValue);
        this.changes.push(change);
        change.apply();
    }
    /**
     * Change the value of an item in an array at the specified index
     */
    setArrayValue(array, index, newValue) {
        this.setProperty(array, index, newValue);
    }
    /**
     * Remove an element from an array at the specified index
     */
    removeFromArray(array, index) {
        const change = new RemoveFromArrayChange(array, index);
        this.changes.push(change);
        change.apply();
    }
    /**
     * Unto all changes.
     */
    undoAll() {
        for (let i = this.changes.length - 1; i >= 0; i--) {
            this.changes[i].undo();
        }
        this.changes = [];
    }
}
exports.AstEditor = AstEditor;
class EditPropertyChange {
    constructor(obj, propertyName, newValue) {
        this.obj = obj;
        this.propertyName = propertyName;
        this.newValue = newValue;
    }
    apply() {
        this.originalValue = this.obj[this.propertyName];
        this.obj[this.propertyName] = this.newValue;
    }
    undo() {
        this.obj[this.propertyName] = this.originalValue;
    }
}
class AddToArrayChange {
    constructor(array, index, newValue) {
        this.array = array;
        this.index = index;
        this.newValue = newValue;
    }
    apply() {
        this.array.splice(this.index, 0, this.newValue);
    }
    undo() {
        this.array.splice(this.index, 1);
    }
}
/**
 * Remove an item from an array
 */
class RemoveFromArrayChange {
    constructor(array, index) {
        this.array = array;
        this.index = index;
    }
    apply() {
        [this.originalValue] = this.array.splice(this.index, 1);
    }
    undo() {
        this.array.splice(this.index, 0, this.originalValue);
    }
}
//# sourceMappingURL=AstEditor.js.map