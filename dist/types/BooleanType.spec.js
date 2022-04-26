"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const BooleanType_1 = require("./BooleanType");
const DynamicType_1 = require("./DynamicType");
describe('BooleanType', () => {
    it('is equivalent to boolean types', () => {
        (0, chai_1.expect)(new BooleanType_1.BooleanType().isAssignableTo(new BooleanType_1.BooleanType())).to.be.true;
        (0, chai_1.expect)(new BooleanType_1.BooleanType().isAssignableTo(new DynamicType_1.DynamicType())).to.be.true;
    });
});
//# sourceMappingURL=BooleanType.spec.js.map