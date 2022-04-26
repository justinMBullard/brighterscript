"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrsFilePreTranspileProcessor = void 0;
const reflection_1 = require("../../astUtils/reflection");
const Cache_1 = require("../../Cache");
const util_1 = require("../../util");
class BrsFilePreTranspileProcessor {
    constructor(event) {
        this.event = event;
    }
    process() {
        this.replaceEnumValues();
    }
    replaceEnumValues() {
        var _a, _b, _c, _d;
        const membersByEnum = new Cache_1.Cache();
        const enumLookup = (_a = this.event.file.program.getFirstScopeForFile(this.event.file)) === null || _a === void 0 ? void 0 : _a.getEnumMap();
        //skip this logic if current scope has no enums
        if (((_b = enumLookup === null || enumLookup === void 0 ? void 0 : enumLookup.size) !== null && _b !== void 0 ? _b : 0) === 0) {
            return;
        }
        for (const referenceExpression of this.event.file.parser.references.expressions) {
            const actualExpressions = [];
            //binary expressions actually have two expressions (left and right), so handle them independently
            if ((0, reflection_1.isBinaryExpression)(referenceExpression)) {
                actualExpressions.push(referenceExpression.left, referenceExpression.right);
            }
            else {
                //assume all other expressions are a single chain
                actualExpressions.push(referenceExpression);
            }
            for (const expression of actualExpressions) {
                const parts = (_c = util_1.default.getAllDottedGetParts(expression)) === null || _c === void 0 ? void 0 : _c.map(x => x.toLowerCase());
                if (parts) {
                    //get the name of the enum member
                    const memberName = parts.pop();
                    //get the name of the enum (including leading namespace if applicable)
                    const enumName = parts.join('.');
                    const lowerEnumName = enumName.toLowerCase();
                    const theEnum = (_d = enumLookup.get(lowerEnumName)) === null || _d === void 0 ? void 0 : _d.item;
                    if (theEnum) {
                        const members = membersByEnum.getOrAdd(lowerEnumName, () => theEnum.getMemberValueMap());
                        const value = members === null || members === void 0 ? void 0 : members.get(memberName);
                        this.event.editor.overrideTranspileResult(expression, value);
                    }
                }
            }
        }
    }
}
exports.BrsFilePreTranspileProcessor = BrsFilePreTranspileProcessor;
//# sourceMappingURL=BrsFilePreTranspileProcessor.js.map