"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const DynamicType_1 = require("./DynamicType");
const StringType_1 = require("./StringType");
describe('DynamicType', () => {
    it('is equivalent to dynamic types', () => {
        (0, chai_1.expect)(new DynamicType_1.DynamicType().isAssignableTo(new StringType_1.StringType())).to.be.true;
        (0, chai_1.expect)(new DynamicType_1.DynamicType().isAssignableTo(new DynamicType_1.DynamicType())).to.be.true;
    });
});
//# sourceMappingURL=DynamicType.spec.js.map