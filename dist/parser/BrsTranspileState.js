"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrsTranspileState = void 0;
const TranspileState_1 = require("./TranspileState");
class BrsTranspileState extends TranspileState_1.TranspileState {
    constructor(file) {
        super(file.pathAbsolute, file.program.options);
        this.file = file;
        /**
         * the tree of parents, with the first index being direct parent, and the last index being the furthest removed ancestor.
         * Used to assist blocks in knowing when to add a comment statement to the same line as the first line of the parent
         */
        this.lineage = [];
        this.bslibPrefix = this.file.program.bslibPrefix;
    }
}
exports.BrsTranspileState = BrsTranspileState;
//# sourceMappingURL=BrsTranspileState.js.map