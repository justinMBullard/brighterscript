"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const DynamicType_1 = require("./DynamicType");
const ObjectType_1 = require("./ObjectType");
describe('ObjectType', () => {
    it('is equivalent to other object types', () => {
        (0, chai_1.expect)(new ObjectType_1.ObjectType().isAssignableTo(new ObjectType_1.ObjectType())).to.be.true;
        (0, chai_1.expect)(new ObjectType_1.ObjectType().isAssignableTo(new DynamicType_1.DynamicType())).to.be.true;
    });
});
//# sourceMappingURL=ObjectType.spec.js.map