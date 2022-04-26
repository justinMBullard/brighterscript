"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const DynamicType_1 = require("./DynamicType");
const InvalidType_1 = require("./InvalidType");
describe('InvalidType', () => {
    it('is equivalent to invalid types', () => {
        (0, chai_1.expect)(new InvalidType_1.InvalidType().isAssignableTo(new InvalidType_1.InvalidType())).to.be.true;
        (0, chai_1.expect)(new InvalidType_1.InvalidType().isAssignableTo(new DynamicType_1.DynamicType())).to.be.true;
    });
});
//# sourceMappingURL=InvalidType.spec.js.map