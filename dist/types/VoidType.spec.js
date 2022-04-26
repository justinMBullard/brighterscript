"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const DynamicType_1 = require("./DynamicType");
const VoidType_1 = require("./VoidType");
describe('VoidType', () => {
    it('is equivalent to dynamic types', () => {
        (0, chai_1.expect)(new VoidType_1.VoidType().isAssignableTo(new VoidType_1.VoidType())).to.be.true;
        (0, chai_1.expect)(new VoidType_1.VoidType().isAssignableTo(new DynamicType_1.DynamicType())).to.be.true;
    });
});
//# sourceMappingURL=VoidType.spec.js.map